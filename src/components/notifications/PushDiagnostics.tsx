import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Send,
  Bell,
  Smartphone,
  Server,
  Wifi,
  Key,
  Cloud,
  Trash2,
  Info,
  MessageSquare,
  Code,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePWAUpdate, BUILD_VERSION, SW_VERSION } from '@/hooks/usePWAUpdate';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { pushApiWithFallback, getLastPushApiSource, type PushApiSource } from '@/lib/pushApiWithFallback';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface RawPayloadEntry {
  payload: string;
  receivedAt: string;
}

interface DiagnosticResult {
  status: 'pending' | 'checking' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface DiagnosticState {
  browser: DiagnosticResult;
  serviceWorker: DiagnosticResult;
  permission: DiagnosticResult;
  subscription: DiagnosticResult;
  server: DiagnosticResult;
  vapidMatch: DiagnosticResult;
  apiSource: DiagnosticResult;
  webhookPush: DiagnosticResult;
}

interface WebhookPushLog {
  id: string;
  created_at: string;
  event_type: string;
  processed: boolean;
  webhook_data: {
    organizationId?: string;
    userIds?: string[];
    userCount?: number;
    pushResult?: { sent?: number; failed?: number; error?: string };
    clientName?: string;
    callTime?: string;
    senderName?: string;
  };
}

const initialState: DiagnosticState = {
  browser: { status: 'pending', message: 'Поддержка браузера' },
  serviceWorker: { status: 'pending', message: 'Service Worker' },
  permission: { status: 'pending', message: 'Разрешение на уведомления' },
  subscription: { status: 'pending', message: 'Push подписка' },
  server: { status: 'pending', message: 'Связь с сервером' },
  vapidMatch: { status: 'pending', message: 'VAPID ключи' },
  apiSource: { status: 'pending', message: 'Источник API' },
  webhookPush: { status: 'pending', message: 'Push от клиентов' },
};

export function PushDiagnostics({ className }: { className?: string }) {
  const { user } = useAuth();
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();
  const { resetPWACache, isUpdating: isResetting, updateAvailable, swScope } = usePWAUpdate();
  const [diagnostics, setDiagnostics] = useState<DiagnosticState>(initialState);
  const [isRunning, setIsRunning] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [showRawPayloads, setShowRawPayloads] = useState(false);
  const [rawPayloads, setRawPayloads] = useState<RawPayloadEntry[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Listen for raw payloads from Service Worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_RAW_PAYLOAD') {
        const newEntry: RawPayloadEntry = {
          payload: event.data.payload || '',
          receivedAt: event.data.receivedAt || new Date().toISOString(),
        };
        setRawPayloads(prev => [newEntry, ...prev].slice(0, 10)); // Keep last 10
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const copyPayload = (payload: string, index: number) => {
    navigator.clipboard.writeText(payload);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearPayloads = () => {
    setRawPayloads([]);
  };

  const updateDiagnostic = useCallback((key: keyof DiagnosticState, result: Partial<DiagnosticResult>) => {
    setDiagnostics(prev => ({
      ...prev,
      [key]: { ...prev[key], ...result }
    }));
  }, []);

  const runDiagnostics = useCallback(async () => {
    if (!user) {
      toast.error('Необходимо войти в систему');
      return;
    }

    setIsRunning(true);
    setDiagnostics(initialState);

    // 1. Check browser support
    updateDiagnostic('browser', { status: 'checking' });
    await new Promise(r => setTimeout(r, 300));
    
    if (!('serviceWorker' in navigator)) {
      updateDiagnostic('browser', { 
        status: 'error', 
        message: 'Браузер не поддерживает Service Worker',
        details: 'Попробуйте другой браузер'
      });
      setIsRunning(false);
      return;
    }
    
    if (!('PushManager' in window)) {
      updateDiagnostic('browser', { 
        status: 'error', 
        message: 'Браузер не поддерживает Push API',
        details: 'Обновите браузер или используйте Chrome/Safari'
      });
      setIsRunning(false);
      return;
    }

    if (!window.isSecureContext) {
      updateDiagnostic('browser', { 
        status: 'error', 
        message: 'Требуется HTTPS',
        details: 'Push работает только на защищённых соединениях'
      });
      setIsRunning(false);
      return;
    }

    updateDiagnostic('browser', { 
      status: 'success', 
      message: 'Браузер поддерживает Push',
      details: navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') 
        ? 'Safari — добавьте сайт на главный экран для лучшей работы' 
        : undefined
    });

    // 2. Check Service Worker
    updateDiagnostic('serviceWorker', { status: 'checking' });
    await new Promise(r => setTimeout(r, 300));

    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      
      if (!registration) {
        updateDiagnostic('serviceWorker', { 
          status: 'warning', 
          message: 'Service Worker не зарегистрирован',
          details: 'Перезагрузите страницу'
        });
      } else if (!registration.active) {
        updateDiagnostic('serviceWorker', { 
          status: 'warning', 
          message: 'Service Worker не активен',
          details: 'Подождите активации или перезагрузите'
        });
      } else {
        updateDiagnostic('serviceWorker', { 
          status: 'success', 
          message: 'Service Worker активен',
          details: `Scope: ${registration.scope}`
        });
      }
    } catch (err) {
      updateDiagnostic('serviceWorker', { 
        status: 'error', 
        message: 'Ошибка Service Worker',
        details: err instanceof Error ? err.message : 'Неизвестная ошибка'
      });
    }

    // 3. Check permission
    updateDiagnostic('permission', { status: 'checking' });
    await new Promise(r => setTimeout(r, 300));

    const currentPermission = Notification.permission;
    if (currentPermission === 'granted') {
      updateDiagnostic('permission', { 
        status: 'success', 
        message: 'Разрешение получено'
      });
    } else if (currentPermission === 'denied') {
      updateDiagnostic('permission', { 
        status: 'error', 
        message: 'Разрешение заблокировано',
        details: 'Разблокируйте в настройках браузера'
      });
    } else {
      updateDiagnostic('permission', { 
        status: 'warning', 
        message: 'Разрешение не запрошено',
        details: 'Включите уведомления для запроса'
      });
    }

    // 4. Check subscription
    updateDiagnostic('subscription', { status: 'checking' });
    await new Promise(r => setTimeout(r, 300));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const endpoint = subscription.endpoint;
        const shortEndpoint = endpoint.length > 60 
          ? `${endpoint.slice(0, 30)}...${endpoint.slice(-20)}`
          : endpoint;
        
        updateDiagnostic('subscription', { 
          status: 'success', 
          message: 'Подписка активна',
          details: shortEndpoint
        });
      } else {
        updateDiagnostic('subscription', { 
          status: 'warning', 
          message: 'Нет активной подписки',
          details: 'Включите уведомления для создания подписки'
        });
      }
    } catch (err) {
      updateDiagnostic('subscription', { 
        status: 'error', 
        message: 'Ошибка проверки подписки',
        details: err instanceof Error ? err.message : 'Неизвестная ошибка'
      });
    }

    // 5. Check server connection with fallback
    updateDiagnostic('server', { status: 'checking' });
    updateDiagnostic('apiSource', { status: 'checking' });
    
    let serverVapidKey: string | undefined;
    let currentApiSource: PushApiSource = 'self-hosted';
    
    try {
      const response = await pushApiWithFallback<{ vapidPublicKey?: string }>(
        'portal-push-config',
        undefined,
        { requireAuth: false }
      );
      
      currentApiSource = response.source;
      
      if (response.success && response.data?.vapidPublicKey) {
        serverVapidKey = response.data.vapidPublicKey;
        
        updateDiagnostic('server', { 
          status: 'success', 
          message: 'Сервер доступен',
          details: `VAPID ключ получен от ${response.source === 'self-hosted' ? 'Self-hosted' : 'Lovable Cloud'}`
        });
        
        updateDiagnostic('apiSource', {
          status: response.source === 'self-hosted' ? 'success' : 'warning',
          message: response.source === 'self-hosted' ? 'Self-hosted (основной)' : 'Lovable Cloud (fallback)',
          details: response.source === 'self-hosted' 
            ? 'api.academyos.ru' 
            : 'Резервный сервер активен'
        });
      } else {
        updateDiagnostic('server', { 
          status: 'warning', 
          message: 'Сервер отвечает, но конфиг неполный',
          details: response.error || 'Проверьте настройки сервера'
        });
        
        updateDiagnostic('apiSource', {
          status: 'warning',
          message: `${response.source === 'self-hosted' ? 'Self-hosted' : 'Lovable Cloud'}`,
          details: 'Конфигурация неполная'
        });
      }
    } catch (err) {
      updateDiagnostic('server', { 
        status: 'error', 
        message: 'Оба сервера недоступны',
        details: err instanceof Error ? err.message : 'Проверьте соединение'
      });
      
      updateDiagnostic('apiSource', {
        status: 'error',
        message: 'Нет доступных серверов',
        details: 'Self-hosted и Lovable Cloud недоступны'
      });
    }

    // 6. Check VAPID key match (using already fetched server key)
    updateDiagnostic('vapidMatch', { status: 'checking' });
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        updateDiagnostic('vapidMatch', {
          status: 'warning',
          message: 'Нет подписки для проверки',
        });
      } else if (!serverVapidKey) {
        updateDiagnostic('vapidMatch', {
          status: 'warning',
          message: 'Сервер не вернул VAPID ключ',
        });
      } else {
        // Compare subscription's applicationServerKey with server key
        const subKey = subscription.options?.applicationServerKey;
        if (subKey) {
          const subKeyArray = new Uint8Array(subKey as ArrayBuffer);
          const subKeyB64 = btoa(String.fromCharCode(...subKeyArray))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          
          const keyMatch = subKeyB64 === serverVapidKey;
          
          updateDiagnostic('vapidMatch', {
            status: keyMatch ? 'success' : 'error',
            message: keyMatch ? 'Ключи совпадают' : 'Ключи НЕ совпадают!',
            details: keyMatch 
              ? `Сервер (${currentApiSource}): ${serverVapidKey.substring(0, 15)}...`
              : `Сервер: ${serverVapidKey.substring(0, 15)}... ≠ Подписка: ${subKeyB64.substring(0, 15)}...`,
          });
        } else {
          updateDiagnostic('vapidMatch', {
            status: 'warning',
            message: 'Ключ подписки недоступен',
          });
        }
      }
    } catch (err) {
      updateDiagnostic('vapidMatch', {
        status: 'error',
        message: 'Ошибка проверки VAPID',
        details: err instanceof Error ? err.message : 'Unknown',
      });
    }

    // 7. Check webhook push status (recent push-diagnostic logs)
    updateDiagnostic('webhookPush', { status: 'checking' });
    
    try {
      // Fetch recent push-diagnostic logs from webhook_logs
      const { data: pushLogs, error: logsError } = await supabase
        .from('webhook_logs')
        .select('id, created_at, event_type, processed, webhook_data')
        .eq('messenger_type', 'push-diagnostic')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (logsError) {
        console.error('Error fetching webhook push logs:', logsError);
        updateDiagnostic('webhookPush', {
          status: 'warning',
          message: 'Не удалось загрузить логи',
          details: logsError.message,
        });
      } else if (!pushLogs || pushLogs.length === 0) {
        updateDiagnostic('webhookPush', {
          status: 'warning',
          message: 'Нет данных',
          details: 'Пока не было входящих сообщений с push',
        });
      } else {
        // Analyze recent push logs
        const recentLog = pushLogs[0] as unknown as WebhookPushLog;
        const webhookData = recentLog.webhook_data || {};
        const pushResult = webhookData.pushResult;
        const logTime = new Date(recentLog.created_at).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        
        if (pushResult?.sent && pushResult.sent > 0) {
          updateDiagnostic('webhookPush', {
            status: 'success',
            message: `Последний push доставлен`,
            details: `${logTime}: отправлено ${pushResult.sent}, ошибок ${pushResult.failed || 0}`,
          });
        } else if (pushResult?.error) {
          updateDiagnostic('webhookPush', {
            status: 'error',
            message: 'Push не доставлен',
            details: `${logTime}: ${pushResult.error.slice(0, 50)}`,
          });
        } else if (webhookData.userCount === 0) {
          updateDiagnostic('webhookPush', {
            status: 'error',
            message: 'Нет получателей',
            details: `${logTime}: admin/manager не найдены`,
          });
        } else {
          updateDiagnostic('webhookPush', {
            status: 'warning',
            message: 'Статус неизвестен',
            details: `${logTime}: ${recentLog.event_type}`,
          });
        }
      }
    } catch (err) {
      updateDiagnostic('webhookPush', {
        status: 'warning',
        message: 'Ошибка проверки',
        details: err instanceof Error ? err.message : 'Unknown',
      });
    }

    setIsRunning(false);
  }, [user, updateDiagnostic]);

  const handleTestPush = async () => {
    if (!user) return;
    
    setTestPushLoading(true);
    try {
      localStorage.setItem('push:debug_until', String(Date.now() + 2 * 60 * 1000));
      
      const response = await selfHostedPost<{ sent?: number; failed?: number }>('send-push-notification', {
        userId: user.id,
        payload: {
          title: 'Тестовое уведомление 🔔',
          body: `Диагностика: ${new Date().toLocaleTimeString('ru-RU')}`,
          icon: '/pwa-192x192.png',
          tag: `test-diag-${Date.now()}`,
          url: '/crm',
        },
      });

      if (response.data?.sent && response.data.sent > 0) {
        toast.success(`Push отправлен (${response.data.sent})`);
      } else if (response.data?.failed) {
        toast.warning(`Подписки истекли (${response.data.failed})`);
      } else {
        toast.warning('Нет активных подписок');
      }
    } catch (err) {
      toast.error('Ошибка отправки');
    } finally {
      setTestPushLoading(false);
    }
  };

  const handleResubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('Подписка обновлена');
      runDiagnostics();
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getDiagnosticIcon = (key: keyof DiagnosticState) => {
    switch (key) {
      case 'browser':
        return <Smartphone className="h-4 w-4" />;
      case 'serviceWorker':
        return <Wifi className="h-4 w-4" />;
      case 'permission':
        return <Bell className="h-4 w-4" />;
      case 'subscription':
        return <RefreshCw className="h-4 w-4" />;
      case 'server':
        return <Server className="h-4 w-4" />;
      case 'vapidMatch':
        return <Key className="h-4 w-4" />;
      case 'apiSource':
        return <Cloud className="h-4 w-4" />;
      case 'webhookPush':
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const allSuccess = Object.values(diagnostics).every(d => d.status === 'success');
  const hasErrors = Object.values(diagnostics).some(d => d.status === 'error');

  const lastApiSource = getLastPushApiSource();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4" />
            Диагностика Push
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVersionInfo(!showVersionInfo)}
            className="h-7 px-2"
          >
            <Info className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardDescription>
          Проверка всех компонентов push-уведомлений
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Version info (collapsible) */}
        {showVersionInfo && (
          <div className="p-3 bg-muted/50 rounded-md text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Версия сборки:</span>
              <code className="font-mono">{BUILD_VERSION}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Версия SW:</span>
              <code className="font-mono">{SW_VERSION}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scope SW:</span>
              <code className="font-mono">{swScope || 'н/д'}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Последний API:</span>
              <code className="font-mono">{lastApiSource || 'н/д'}</code>
            </div>
            {updateAvailable && (
              <div className="flex justify-between text-amber-600">
                <span>⚠️ Доступно обновление</span>
              </div>
            )}
            <div className="pt-2 border-t mt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={async () => {
                  try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const reg of regs) {
                      await reg.unregister();
                    }
                    // Clear caches
                    const cacheKeys = await caches.keys();
                    await Promise.all(cacheKeys.map(k => caches.delete(k)));
                    toast.success('SW и кэш сброшены. Перезагрузка...');
                    setTimeout(() => window.location.reload(), 500);
                  } catch (e) {
                    toast.error('Ошибка сброса: ' + String(e));
                  }
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Сбросить SW и кэш
              </Button>
            </div>
          </div>
        )}

        {/* Diagnostic items */}
        <div className="space-y-2">
          {(Object.keys(diagnostics) as Array<keyof DiagnosticState>).map((key) => {
            const item = diagnostics[key];
            return (
              <div 
                key={key}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-md transition-colors",
                  item.status === 'error' && "bg-red-50 dark:bg-red-950/20",
                  item.status === 'warning' && "bg-amber-50 dark:bg-amber-950/20",
                  item.status === 'success' && "bg-green-50 dark:bg-green-950/20",
                )}
              >
                <div className="flex items-center gap-2 min-w-[24px]">
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getDiagnosticIcon(key)}
                    <span className="text-sm font-medium">{item.message}</span>
                  </div>
                  {item.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {item.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status badge */}
        {!isRunning && diagnostics.browser.status !== 'pending' && (
          <div className="flex items-center justify-center">
            {allSuccess ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Всё работает
              </Badge>
            ) : hasErrors ? (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Есть проблемы
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Требует внимания
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runDiagnostics}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isRunning ? 'Проверка...' : 'Проверить'}
          </Button>

          {isSubscribed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestPush}
              disabled={testPushLoading}
            >
              {testPushLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Тест
            </Button>
          )}

          {diagnostics.subscription.status === 'warning' && permission === 'granted' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleResubscribe}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Переподписаться
            </Button>
          )}
        </div>

        {/* Raw Payloads Section */}
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRawPayloads(!showRawPayloads)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Raw Payloads
            </span>
            <Badge variant="secondary" className="ml-2">
              {rawPayloads.length}
            </Badge>
          </Button>
          
          {showRawPayloads && (
            <div className="mt-2 space-y-2">
              {rawPayloads.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Нет данных. Отправьте тестовый push.
                </p>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearPayloads} className="h-6 text-xs">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Очистить
                    </Button>
                  </div>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {rawPayloads.map((entry, index) => (
                        <div key={entry.receivedAt + index} className="p-2 bg-muted/50 rounded-md text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground">
                              {new Date(entry.receivedAt).toLocaleTimeString('ru-RU')}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1"
                              onClick={() => copyPayload(entry.payload, index)}
                            >
                              {copiedIndex === index ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <pre className="font-mono text-[10px] whitespace-pre-wrap break-all max-h-24 overflow-auto">
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(entry.payload), null, 2);
                              } catch {
                                return entry.payload;
                              }
                            })()}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          )}
        </div>

        {/* Reset PWA Cache button */}
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={resetPWACache}
            disabled={isResetting}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isResetting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Сбросить кеш PWA
          </Button>
          <p className="text-xs text-muted-foreground mt-1.5 text-center">
            Очистит все кеши и перезагрузит приложение
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
