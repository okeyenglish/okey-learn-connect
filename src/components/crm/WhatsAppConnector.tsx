import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { selfHostedPost } from '@/lib/selfHostedApi';

type WppStatus = 'connected' | 'disconnected' | 'qr_issued' | 'qr_pending' | 'pairing' | 'syncing';

export function WhatsAppConnector() {
  const [status, setStatus] = useState<WppStatus>('disconnected');
  const [qr, setQr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Backoff для обработки ошибок
  const backoffRef = useRef(2000);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchStatus() {
    try {
      // Refresh session to ensure valid token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.log('No valid session, skipping status fetch');
        return;
      }

      const response = await selfHostedPost<{ status?: WppStatus; qrcode?: string }>('wpp-status', {});

      if (!response.success) {
        console.error('Error fetching WPP status:', response.error);
        setError(response.error || 'Unknown error');
        // Exponential backoff on error
        backoffRef.current = Math.min(backoffRef.current * 1.5, 10000);
        return;
      }

      if (response.data) {
        setStatus(response.data.status || 'disconnected');
        setQr(response.data.qrcode || null);
        setError(null);
        // Reset backoff on success
        backoffRef.current = 2000;
      }
    } catch (error) {
      console.error('Error in fetchStatus:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      backoffRef.current = Math.min(backoffRef.current * 1.5, 10000);
    } finally {
      setIsLoading(false);
    }
  }

  async function startPairing() {
    setIsStarting(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return;
      }

      const response = await selfHostedPost<{ ok?: boolean; status?: WppStatus; qrcode?: string; error?: string }>('wpp-start', {});

      if (!response.success || !response.data?.ok) {
        console.error('WPP start failed:', response);
        toast({
          title: "Ошибка",
          description: response.data?.error || response.error || "Не удалось запустить сессию WhatsApp",
          variant: "destructive",
        });
        return;
      }

      setStatus(response.data.status || 'disconnected');
      let qrCode = response.data.qrcode || null;

      // Fallback: check DB for recent QR if not in response
      if (!qrCode && response.data.status !== 'connected') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          if (profile?.organization_id) {
            const { data: sessionData } = await supabase
              .from('whatsapp_sessions')
              .select('last_qr_b64, last_qr_at')
              .eq('organization_id', profile.organization_id)
              .single();

            if (sessionData?.last_qr_b64 && sessionData?.last_qr_at) {
              const qrAge = (Date.now() - new Date(sessionData.last_qr_at).getTime()) / 1000;
              if (qrAge < 45) {
                qrCode = sessionData.last_qr_b64;
                console.log('Using QR from DB (age: ' + qrAge.toFixed(1) + 's)');
              }
            }
          }
        }
      }

      setQr(qrCode);

      if (qrCode) {
        toast({
          title: "Успешно",
          description: "QR-код для подключения сгенерирован",
        });
      } else if (response.data.status === 'connected') {
        toast({
          title: "Подключено",
          description: "WhatsApp уже подключен",
        });
      }
    } catch (error: unknown) {
      console.error('Error in startPairing:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Stop polling if connected or syncing
    if (status === 'connected' || status === 'syncing') {
      console.log('Status is connected/syncing, stopping poll');
      return;
    }
    
    // Poll with current backoff interval
    intervalRef.current = setInterval(() => {
      fetchStatus();
    }, backoffRef.current);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return;
      }

      const response = await selfHostedPost<{ ok?: boolean; error?: string }>('wpp-disconnect', {});

      if (!response.success || !response.data?.ok) {
        toast({
          title: "Ошибка",
          description: response.data?.error || response.error || "Не удалось отключить WhatsApp",
          variant: "destructive",
        });
        return;
      }

      setStatus('disconnected');
      toast({
        title: "Отключено",
        description: "WhatsApp успешно отключен",
      });
    } catch (error: unknown) {
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return;
      }

      const response = await selfHostedPost<{ ok?: boolean; error?: string; summary?: { total?: number; successful?: number; okButEmpty?: number } }>('wpp-diagnostics', {});

      if (!response.success || !response.data?.ok) {
        toast({
          title: "Ошибка диагностики",
          description: response.data?.error || response.error || "Не удалось выполнить диагностику",
          variant: "destructive",
        });
        return;
      }

      setDiagnostics(response.data);
      toast({
        title: "Диагностика завершена",
        description: `Выполнено ${response.data.summary?.total || 0} тестов. Успешных: ${response.data.summary?.successful || 0}, пустых: ${response.data.summary?.okButEmpty || 0}`,
      });
    } catch (error: unknown) {
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
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

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <span className="font-medium">Ошибка:</span> {error}
          </div>
        )}

        {qr && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-center">
              <div className="relative">
                <img 
                  src={qr} 
                  key={qr.slice(-24)}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64 border-2 border-border rounded-lg"
                  style={{ imageRendering: 'pixelated' }}
                />
                {(status === 'qr_issued' || status === 'qr_pending' || status === 'pairing') && (
                  <div className="absolute -top-2 -right-2 flex items-center gap-2 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-full border shadow-sm">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Обновляется</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Инструкция:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Откройте WhatsApp на телефоне</li>
                <li>Перейдите в Настройки → Связанные устройства</li>
                <li>Нажмите "Привязать устройство"</li>
                <li>Отсканируйте QR-код выше</li>
              </ol>
              <p className="text-xs italic pt-2 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                QR-код автоматически обновляется каждые 30-60 секунд
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
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-muted rounded">
                <div className="font-medium">Всего</div>
                <div className="text-lg">{diagnostics.summary?.total || 0}</div>
              </div>
              <div className="p-2 bg-green-500/10 rounded">
                <div className="font-medium">Успешных</div>
                <div className="text-lg text-green-600 dark:text-green-400">{diagnostics.summary?.successful || 0}</div>
              </div>
              <div className="p-2 bg-red-500/10 rounded">
                <div className="font-medium">Ошибок</div>
                <div className="text-lg text-red-600 dark:text-red-400">{diagnostics.summary?.errors || 0}</div>
              </div>
              <div className="p-2 bg-orange-500/10 rounded">
                <div className="font-medium">200 пустых</div>
                <div className="text-lg text-orange-600 dark:text-orange-400">{diagnostics.summary?.okButEmpty || 0}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs p-2 bg-muted/50 rounded">
              <div><span className="font-medium">QR:</span> {diagnostics.summary?.withQR || 0}</div>
              <div><span className="font-medium">Token:</span> {diagnostics.summary?.withToken || 0}</div>
              <div><span className="font-medium">Status:</span> {diagnostics.summary?.withStatus || 0}</div>
            </div>

            {diagnostics.tokenFound && (
              <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-xs">
                <p className="font-medium text-green-700 dark:text-green-300">✓ Токен найден</p>
                <p className="text-muted-foreground">API токен успешно сгенерирован и используется в тестах</p>
              </div>
            )}

            {diagnostics.summary?.okButEmpty > (diagnostics.summary?.total || 0) * 0.5 && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded text-xs space-y-2">
                <p className="font-medium text-orange-700 dark:text-orange-300">⚠️ Проблема конфигурации сервера</p>
                <p className="text-muted-foreground">
                  Большинство запросов возвращают 200 OK с пустым телом. Это обычно указывает на проблему reverse proxy (Nginx/Cloudflare) или конфигурации WPP сервера.
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium hover:text-orange-600">Что проверить?</summary>
                  <ul className="mt-2 ml-4 list-disc space-y-1 text-[10px]">
                    <li>Nginx: proxy_buffering, chunked_transfer_encoding, gzip</li>
                    <li>Проверить endpoints локально (curl на сервере)</li>
                    <li>Логи WPP сервера — генерируется ли QR?</li>
                    <li>Content-Type: application/json установлен?</li>
                    <li>Обновить WPPConnect Server до последней версии</li>
                  </ul>
                </details>
              </div>
            )}

            {diagnostics.summary?.contentTypes && diagnostics.summary.contentTypes.length > 0 && (
              <div className="text-xs p-2 bg-muted/30 rounded">
                <span className="font-medium">Content-Types: </span>
                {diagnostics.summary.contentTypes.join(', ') || 'нет'}
              </div>
            )}

            {diagnostics.summary?.servers && diagnostics.summary.servers.length > 0 && (
              <div className="text-xs p-2 bg-muted/30 rounded">
                <span className="font-medium">Server: </span>
                {diagnostics.summary.servers.join(', ')}
              </div>
            )}

            <details className="text-xs">
              <summary className="cursor-pointer font-medium hover:text-primary">Детальные результаты ({diagnostics.results?.length || 0} тестов)</summary>
              <div className="mt-2 max-h-96 overflow-y-auto space-y-1.5">
                {diagnostics.results?.map((test: any, idx: number) => (
                  <div 
                    key={idx} 
                    className={`p-2 rounded border ${
                      test.error ? 'bg-red-500/5 border-red-500/20' : 
                      test.ok && test.bodyLength > 0 ? 'bg-green-500/5 border-green-500/20' :
                      test.ok ? 'bg-orange-500/5 border-orange-500/20' :
                      'bg-yellow-500/5 border-yellow-500/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-[11px]">{test.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap ${
                        test.ok ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 
                        'bg-red-500/20 text-red-700 dark:text-red-300'
                      }`}>
                        {test.error ? 'Error' : test.status}
                      </span>
                    </div>
                    {test.error && (
                      <div className="mt-1 text-[10px] text-red-600 dark:text-red-400">{test.error}</div>
                    )}
                    {!test.error && (
                      <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                        <div>
                          Body: {test.bodyLength} bytes
                          {test.bodyLength === 0 && <span className="text-orange-600 dark:text-orange-400"> (EMPTY!)</span>}
                          {test.contentType && <span className="ml-2">| {test.contentType}</span>}
                        </div>
                        <div className="flex gap-3">
                          {test.hasQR && <span className="text-green-600 dark:text-green-400">✓ QR</span>}
                          {test.hasToken && <span className="text-green-600 dark:text-green-400">✓ Token</span>}
                          {test.hasStatus && <span className="text-green-600 dark:text-green-400">✓ Status</span>}
                        </div>
                        {test.bodyPreview && test.bodyLength > 0 && (
                          <div className="mt-1 font-mono text-[9px] opacity-60 break-all">
                            {test.bodyPreview}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </Card>
  );
}
