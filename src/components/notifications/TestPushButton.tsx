import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { selfHostedPost } from '@/lib/selfHostedApi';

interface TestPushButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function TestPushButton({ variant = 'outline', size = 'sm', className }: TestPushButtonProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleTestPush = async () => {
    if (!user) {
      toast.error('Необходимо войти в систему');
      return;
    }

    setIsLoading(true);
    try {
      // Enable short-lived debug window: if SW receives push, app will show a toast.
      try {
        localStorage.setItem('push:debug_until', String(Date.now() + 2 * 60 * 1000));
      } catch {
        // ignore
      }

      const response = await selfHostedPost<{ sent?: number; failed?: number; details?: unknown }>('send-push-notification', {
        userId: user.id,
        payload: {
          title: 'Тестовое уведомление 🔔',
          body: `Push работает! Время: ${new Date().toLocaleTimeString('ru-RU')}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `test-push-${Date.now()}`, // Unique tag to prevent iOS from collapsing notifications
          url: '/crm',
        },
      });

      if (!response.success) throw new Error(response.error);

      console.log('Test push response:', response.data);
      
      if (response.data?.sent && response.data.sent > 0) {
        toast.success(`Push отправлен (${response.data.sent} подписок)`);
        toast.message('Ожидаю получение push на устройстве…');
      } else if (response.data?.failed && response.data.failed > 0) {
        toast.warning(`Все подписки истекли (${response.data.failed})`);
      } else if (response.data?.sent === 0) {
        toast.warning('Нет активных подписок. Включите уведомления.');
      } else {
        toast.info('Запрос отправлен');
      }
    } catch (error) {
      console.error('Test push error:', error);
      toast.error('Ошибка отправки push');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleTestPush}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      <span className="ml-2">Тест push</span>
    </Button>
  );
}
