import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          payload: {
            title: 'Тестовое уведомление 🔔',
            body: `Push работает! Время: ${new Date().toLocaleTimeString('ru-RU')}`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: 'test-push',
            url: '/crm',
          },
        },
      });

      if (error) throw error;

      console.log('Test push response:', data);
      
      if (data?.sent > 0) {
        toast.success(`Push отправлен (${data.sent} подписок)`);
      } else if (data?.sent === 0) {
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
