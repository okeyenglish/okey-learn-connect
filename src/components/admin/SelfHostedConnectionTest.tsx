import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Wifi, RefreshCw, Database, Zap, HardDrive } from 'lucide-react';
import { SELF_HOSTED_URL, SELF_HOSTED_ANON_KEY, selfHostedGet } from '@/lib/selfHostedApi';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  latency?: number;
  error?: string;
}

export const SelfHostedConnectionTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    const newResults: TestResult[] = [];

    // Test 1: REST API (health endpoint)
    try {
      const start = performance.now();
      const response = await fetch(`${SELF_HOSTED_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': SELF_HOSTED_ANON_KEY,
        },
      });
      const latency = Math.round(performance.now() - start);
      
      newResults.push({
        name: 'REST API',
        status: response.ok ? 'success' : 'error',
        latency,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });
    } catch (err) {
      newResults.push({
        name: 'REST API',
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
    setResults([...newResults]);

    // Test 2: Edge Functions API
    try {
      const start = performance.now();
      const response = await selfHostedGet<{ status: string }>('health');
      const latency = Math.round(performance.now() - start);
      
      newResults.push({
        name: 'Edge Functions',
        status: response.success ? 'success' : 'error',
        latency,
        error: response.success ? undefined : response.error,
      });
    } catch (err) {
      newResults.push({
        name: 'Edge Functions',
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
    setResults([...newResults]);

    // Test 3: Database connection (via RPC or simple table)
    try {
      const start = performance.now();
      const response = await fetch(`${SELF_HOSTED_URL}/rest/v1/organizations?select=id&limit=1`, {
        headers: {
          'apikey': SELF_HOSTED_ANON_KEY,
          'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}`,
        },
      });
      const latency = Math.round(performance.now() - start);
      
      newResults.push({
        name: 'Database',
        status: response.ok ? 'success' : 'error',
        latency,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });
    } catch (err) {
      newResults.push({
        name: 'Database',
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
    setResults([...newResults]);

    // Test 4: Storage API
    try {
      const start = performance.now();
      const response = await fetch(`${SELF_HOSTED_URL}/storage/v1/bucket`, {
        headers: {
          'apikey': SELF_HOSTED_ANON_KEY,
          'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}`,
        },
      });
      const latency = Math.round(performance.now() - start);
      
      newResults.push({
        name: 'Storage',
        status: response.ok || response.status === 400 ? 'success' : 'error', // 400 means API is reachable
        latency,
        error: response.ok || response.status === 400 ? undefined : `HTTP ${response.status}`,
      });
    } catch (err) {
      newResults.push({
        name: 'Storage',
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
    setResults([...newResults]);

    setLastRun(new Date());
    setIsRunning(false);
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'REST API': return <Wifi className="h-4 w-4" />;
      case 'Edge Functions': return <Zap className="h-4 w-4" />;
      case 'Database': return <Database className="h-4 w-4" />;
      case 'Storage': return <HardDrive className="h-4 w-4" />;
      default: return <Wifi className="h-4 w-4" />;
    }
  };

  const allSuccess = results.length === 4 && results.every(r => r.status === 'success');
  const hasErrors = results.some(r => r.status === 'error');

  return (
    <Card className={hasErrors ? 'border-destructive/50' : allSuccess ? 'border-green-500/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${allSuccess ? 'bg-green-100 text-green-700' : hasErrors ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Self-Hosted API</CardTitle>
              <CardDescription className="text-xs font-mono mt-0.5">
                {SELF_HOSTED_URL}
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            size="sm"
            variant={results.length === 0 ? 'default' : 'outline'}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {results.length === 0 ? 'Проверить' : 'Повторить'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 && !isRunning ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Нажмите "Проверить" для тестирования подключения
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['REST API', 'Edge Functions', 'Database', 'Storage'].map((name, idx) => {
              const result = results.find(r => r.name === name);
              const isPending = isRunning && !result;
              
              return (
                <div 
                  key={name}
                  className={`p-3 rounded-lg border ${
                    isPending ? 'bg-muted/50 animate-pulse' :
                    result?.status === 'success' ? 'bg-green-50 border-green-200' :
                    result?.status === 'error' ? 'bg-destructive/5 border-destructive/30' :
                    'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isPending ? (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                    ) : result?.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : result?.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      getIcon(name)
                    )}
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  {result && (
                    <div className="pl-6">
                      {result.status === 'success' ? (
                        <span className="text-xs text-green-700">{result.latency}ms</span>
                      ) : (
                        <span className="text-xs text-destructive truncate block" title={result.error}>
                          {result.error}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {lastRun && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
            <span>
              Последняя проверка: {lastRun.toLocaleTimeString('ru-RU')}
            </span>
            {allSuccess && (
              <Badge variant="outline" className="text-green-700 border-green-300">
                Все сервисы доступны
              </Badge>
            )}
            {hasErrors && (
              <Badge variant="destructive">
                {results.filter(r => r.status === 'error').length} ошибок
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
