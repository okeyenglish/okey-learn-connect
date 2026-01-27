import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Key
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
}

const initialState: DiagnosticState = {
  browser: { status: 'pending', message: 'Поддержка браузера' },
  serviceWorker: { status: 'pending', message: 'Service Worker' },
  permission: { status: 'pending', message: 'Разрешение на уведомления' },
  subscription: { status: 'pending', message: 'Push подписка' },
  server: { status: 'pending', message: 'Связь с сервером' },
  vapidMatch: { status: 'pending', message: 'VAPID ключи' },
};

export function PushDiagnostics({ className }: { className?: string }) {
  const { user } = useAuth();
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();
  const [diagnostics, setDiagnostics] = useState<DiagnosticState>(initialState);
  const [isRunning, setIsRunning] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);

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

    // 5. Check server connection
    updateDiagnostic('server', { status: 'checking' });
    
    try {
      const response = await selfHostedPost<{ vapidPublicKey?: string }>('portal-push-config');
      
      if (response.success && response.data?.vapidPublicKey) {
        updateDiagnostic('server', { 
          status: 'success', 
          message: 'Сервер доступен',
          details: 'VAPID ключ получен'
        });
      } else {
        updateDiagnostic('server', { 
          status: 'warning', 
          message: 'Сервер отвечает, но конфиг неполный',
          details: response.error || 'Проверьте настройки сервера'
        });
      }
    } catch (err) {
      updateDiagnostic('server', { 
        status: 'error', 
        message: 'Сервер недоступен',
        details: err instanceof Error ? err.message : 'Проверьте соединение'
      });
    }

    // 6. Check VAPID key match
    updateDiagnostic('vapidMatch', { status: 'checking' });
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        updateDiagnostic('vapidMatch', {
          status: 'warning',
          message: 'Нет подписки для проверки',
        });
      } else {
        // Get server VAPID key
        const serverResponse = await selfHostedPost<{ vapidPublicKey?: string }>('portal-push-config');
        const serverVapidKey = serverResponse.data?.vapidPublicKey;
        
        if (!serverVapidKey) {
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
                ? `Сервер: ${serverVapidKey.substring(0, 15)}...`
                : `Сервер: ${serverVapidKey.substring(0, 15)}... ≠ Подписка: ${subKeyB64.substring(0, 15)}...`,
            });
          } else {
            updateDiagnostic('vapidMatch', {
              status: 'warning',
              message: 'Ключ подписки недоступен',
            });
          }
        }
      }
    } catch (err) {
      updateDiagnostic('vapidMatch', {
        status: 'error',
        message: 'Ошибка проверки VAPID',
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
    }
  };

  const allSuccess = Object.values(diagnostics).every(d => d.status === 'success');
  const hasErrors = Object.values(diagnostics).some(d => d.status === 'error');

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4" />
          Диагностика Push
        </CardTitle>
        <CardDescription>
          Проверка всех компонентов push-уведомлений
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
