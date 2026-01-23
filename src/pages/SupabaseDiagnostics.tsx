import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const SUPABASE_URL = "https://api.academyos.ru";

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: Record<string, string>;
  error?: string;
}

export default function SupabaseDiagnostics() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'GET /auth/v1/health', status: 'pending', message: 'Ожидание...' },
    { name: 'OPTIONS /auth/v1/signup (Preflight)', status: 'pending', message: 'Ожидание...' },
    { name: 'POST /auth/v1/signup (CORS Test)', status: 'pending', message: 'Ожидание...' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedTest, setExpandedTest] = useState<number | null>(null);

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...update } : test));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setExpandedTest(null);

    // Test 1: GET /auth/v1/health
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
        method: 'GET',
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      if (response.ok) {
        const hasCORS = !!headers['access-control-allow-origin'];
        updateTest(0, {
          status: hasCORS ? 'success' : 'warning',
          message: hasCORS 
            ? `✅ Статус ${response.status}, CORS заголовки присутствуют`
            : `⚠️ Статус ${response.status}, но отсутствует Access-Control-Allow-Origin`,
          details: headers,
        });
      } else {
        updateTest(0, {
          status: 'error',
          message: `❌ Статус ${response.status}`,
          details: headers,
        });
      }
    } catch (error) {
      updateTest(0, {
        status: 'error',
        message: '❌ Ошибка сети или CORS блокировка',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 2: OPTIONS /auth/v1/signup (Preflight)
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,apikey',
        },
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const hasCORS = !!headers['access-control-allow-origin'];
      const hasMethods = !!headers['access-control-allow-methods'];

      updateTest(1, {
        status: hasCORS && hasMethods ? 'success' : 'warning',
        message: hasCORS && hasMethods
          ? `✅ Preflight успешен (${response.status}), CORS заголовки OK`
          : `⚠️ Preflight ${response.status}, но CORS заголовки неполные`,
        details: headers,
      });
    } catch (error) {
      updateTest(1, {
        status: 'error',
        message: '❌ Ошибка preflight запроса',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 3: POST /auth/v1/signup with abort (CORS on actual response)
    try {
      const controller = new AbortController();
      
      // Abort after 200ms to avoid creating a real user
      const timeout = setTimeout(() => controller.abort(), 200);

      try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg',
          },
          body: JSON.stringify({
            email: `test-diagnostic-${Date.now()}@example.com`,
            password: 'TestPassword123!',
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        const hasCORS = !!headers['access-control-allow-origin'];

        updateTest(2, {
          status: hasCORS ? 'success' : 'error',
          message: hasCORS
            ? `✅ POST запрос дошёл до ответа, CORS заголовки присутствуют (${response.status})`
            : `❌ POST запрос дошёл, но отсутствует Access-Control-Allow-Origin в ответе (${response.status})`,
          details: headers,
        });
      } catch (abortError) {
        clearTimeout(timeout);
        
        if (abortError instanceof Error && abortError.name === 'AbortError') {
          // Expected abort - request was sent successfully
          updateTest(2, {
            status: 'success',
            message: '✅ POST запрос успешно отправлен (прерван для предотвращения создания пользователя)',
          });
        } else {
          throw abortError;
        }
      }
    } catch (error) {
      updateTest(2, {
        status: 'error',
        message: error instanceof TypeError && error.message.includes('Failed to fetch')
          ? '❌ TypeError: Failed to fetch - CORS блокировка на фактическом POST ответе'
          : '❌ Ошибка POST запроса',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Диагностика Supabase</h1>
          <p className="text-muted-foreground">
            Проверка подключения и CORS конфигурации для {SUPABASE_URL}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Результаты тестов</CardTitle>
            <CardDescription>
              Проверяем доступность API и наличие CORS заголовков на реальных ответах
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tests.map((test, index) => (
              <Collapsible
                key={index}
                open={expandedTest === index}
                onOpenChange={(open) => setExpandedTest(open ? index : null)}
              >
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(test.status)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1">{test.name}</h3>
                        <p className="text-sm text-muted-foreground">{test.message}</p>
                        {test.error && (
                          <p className="text-xs text-destructive mt-1 font-mono">{test.error}</p>
                        )}
                      </div>
                    </div>
                    {(test.details || test.error) && (
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {expandedTest === index ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>

                  <CollapsibleContent className="mt-4">
                    {test.details && (
                      <div className="bg-muted rounded p-3 space-y-1">
                        <p className="text-xs font-semibold mb-2">Заголовки ответа:</p>
                        {Object.entries(test.details).map(([key, value]) => (
                          <div key={key} className="text-xs font-mono">
                            <span className="text-primary">{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}

            <div className="flex gap-2 pt-4">
              <Button onClick={runDiagnostics} disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  'Запустить заново'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Что проверяет диагностика:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>
                <strong>Test 1:</strong> GET запрос к /auth/v1/health - проверяет базовую доступность и CORS на GET
              </li>
              <li>
                <strong>Test 2:</strong> OPTIONS запрос (preflight) - проверяет CORS заголовки перед POST
              </li>
              <li>
                <strong>Test 3:</strong> POST запрос к /auth/v1/signup - проверяет CORS на фактическом POST ответе (запрос прерывается, пользователь не создаётся)
              </li>
            </ul>
            <div className="mt-4 p-3 bg-muted rounded text-xs space-y-2">
              <p><strong>Если видите "Failed to fetch":</strong></p>
              <p>
                • Nginx должен отдавать <code>add_header Access-Control-Allow-Origin ... always;</code> (с флагом <code>always</code>)
              </p>
              <p>
                • Kong CORS plugin должен иметь <code>config.always: true</code>
              </p>
              <p>
                • Заголовки должны присутствовать на всех ответах (200, 400, 500), не только на preflight
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
