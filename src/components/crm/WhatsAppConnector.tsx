import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type WppStatus = 'connected' | 'disconnected' | 'qr_issued' | 'qr_pending' | 'pairing';

export function WhatsAppConnector() {
  const [status, setStatus] = useState<WppStatus>('disconnected');
  const [qr, setQr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const { toast } = useToast();

  async function fetchStatus() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase.functions.invoke('wpp-status', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching WPP status:', error);
        return;
      }

      if (data?.ok) {
        setStatus(data.status);
        setQr(data.qrcode || null);
      }
    } catch (error) {
      console.error('Error in fetchStatus:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function startPairing() {
    setIsStarting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('wpp-status', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('Error starting WPP session:', error);
        toast({
          title: "Ошибка",
          description: `Не удалось запустить сессию: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!data?.ok) {
        console.error('WPP start failed:', data);
        toast({
          title: "Ошибка",
          description: data?.error || "Не удалось запустить сессию WhatsApp",
          variant: "destructive",
        });
        return;
      }

      setStatus(data.status);
      setQr(data.qrcode || null);

      if (data.qrcode) {
        toast({
          title: "Успешно",
          description: "QR-код для подключения сгенерирован",
        });
      } else if (data.status === 'connected') {
        toast({
          title: "Подключено",
          description: "WhatsApp уже подключен",
        });
      }
    } catch (error: any) {
      console.error('Error in startPairing:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Внутренняя ошибка",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    
    // Poll status every 3 seconds if not connected
    const interval = setInterval(() => {
      if (status !== 'connected') {
        fetchStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  async function disconnectWhatsApp() {
    setIsStarting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('wpp-disconnect', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error || !data?.ok) {
        toast({
          title: "Ошибка",
          description: data?.error || "Не удалось отключить WhatsApp",
          variant: "destructive",
        });
        return;
      }

      setStatus('disconnected');
      toast({
        title: "Отключено",
        description: "WhatsApp успешно отключен",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Внутренняя ошибка",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  }

  async function runDiagnostics() {
    setIsDiagnosing(true);
    setDiagnostics(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('wpp-diagnostics', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error || !data?.ok) {
        toast({
          title: "Ошибка диагностики",
          description: data?.error || error?.message || "Не удалось выполнить диагностику",
          variant: "destructive",
        });
        return;
      }

      setDiagnostics(data);
      toast({
        title: "Диагностика завершена",
        description: `Выполнено ${data.summary.totalTests} тестов. Успешных: ${data.summary.successful}`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Внутренняя ошибка диагностики",
        variant: "destructive",
      });
    } finally {
      setIsDiagnosing(false);
    }
  }

  if (status === 'connected') {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <div className="flex-1">
              <h3 className="font-semibold">WhatsApp подключен</h3>
              <p className="text-sm text-muted-foreground">
                Интеграция активна и готова к работе
              </p>
            </div>
          </div>
          <Button 
            onClick={disconnectWhatsApp} 
            disabled={isStarting}
            variant="destructive"
            className="w-full"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отключение...
              </>
            ) : (
              'Отключить WhatsApp'
            )}
          </Button>
        </div>
      </Card>
    );
  }

  const isPending = status === 'qr_pending' || status === 'pairing';

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${isPending ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'}`} />
          <div className="flex-1">
            <h3 className="font-semibold">
              {isPending ? 'WhatsApp: ожидание QR-кода' : 'WhatsApp не подключен'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isPending 
                ? 'Генерация QR-кода (до 60 сек). Пожалуйста, подождите...'
                : 'Для отправки сообщений необходимо настроить интеграцию с WhatsApp'
              }
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={startPairing} 
            disabled={isStarting || isPending}
            className="flex-1"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Получение QR-кода...
              </>
            ) : isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ожидание QR...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Показать QR для подключения
              </>
            )}
          </Button>
          
          <Button 
            onClick={runDiagnostics} 
            disabled={isDiagnosing}
            variant="outline"
          >
            {isDiagnosing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Диагностика'
            )}
          </Button>
        </div>

        {qr && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-center">
              <img 
                src={qr} 
                alt="WhatsApp QR Code"
                className="w-64 h-64 border-2 border-border rounded-lg"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Инструкция:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Откройте WhatsApp на телефоне</li>
                <li>Перейдите в Настройки → Связанные устройства</li>
                <li>Нажмите "Привязать устройство"</li>
                <li>Отсканируйте QR-код выше</li>
              </ol>
              <p className="text-xs italic pt-2">
                QR-код действителен 45 секунд. Если не успели - нажмите кнопку "Обновить QR" выше.
              </p>
            </div>
          </div>
        )}

        {diagnostics && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Результаты диагностики</h4>
              <Button size="sm" variant="ghost" onClick={() => setDiagnostics(null)}>Закрыть</Button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-muted rounded">
                <div className="font-medium">Всего тестов</div>
                <div className="text-lg">{diagnostics.summary.totalTests}</div>
              </div>
              <div className="p-2 bg-green-500/10 rounded">
                <div className="font-medium">Успешных</div>
                <div className="text-lg">{diagnostics.summary.successful}</div>
              </div>
              <div className="p-2 bg-red-500/10 rounded">
                <div className="font-medium">Ошибок</div>
                <div className="text-lg">{diagnostics.summary.errors}</div>
              </div>
            </div>

            {diagnostics.summary.emptyResponses === diagnostics.summary.totalTests && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                <p className="font-medium text-yellow-700 dark:text-yellow-300">⚠️ Проблема с сервером</p>
                <p className="mt-1 text-muted-foreground">
                  Сервер отвечает 200 OK, но возвращает пустое тело во всех запросах. 
                  Это обычно проблема конфигурации прокси (Nginx/Cloudflare) или версии WPPConnect сервера.
                </p>
              </div>
            )}

            <div className="max-h-96 overflow-y-auto space-y-2">
              {diagnostics.tests.map((test: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`p-2 rounded text-xs border ${
                    test.error ? 'bg-red-500/5 border-red-500/20' : 
                    test.ok ? 'bg-green-500/5 border-green-500/20' : 
                    'bg-yellow-500/5 border-yellow-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{test.label}</span>
                    <span className={`px-2 py-0.5 rounded ${test.ok ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                      {test.error ? 'Error' : test.status}
                    </span>
                  </div>
                  {test.error && <div className="mt-1 text-muted-foreground">{test.error}</div>}
                  {!test.error && (
                    <div className="mt-1 space-y-1 text-muted-foreground">
                      <div>Body: {test.bodyLength} bytes{test.bodyLength === 0 && ' (EMPTY!)'}</div>
                      {test.hasQR && <div className="text-green-600 dark:text-green-400">✓ Has QR code</div>}
                      {test.hasToken && <div className="text-green-600 dark:text-green-400">✓ Has token</div>}
                      {test.hasStatus && <div className="text-green-600 dark:text-green-400">✓ Has status</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
