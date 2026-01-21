import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface PushNotificationToggleProps {
  variant?: 'button' | 'switch' | 'card';
  className?: string;
}

export function PushNotificationToggle({ 
  variant = 'switch',
  className 
}: PushNotificationToggleProps) {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    toggle 
  } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  if (variant === 'button') {
    return (
      <Button
        variant={isSubscribed ? 'default' : 'outline'}
        size="sm"
        onClick={toggle}
        disabled={isLoading}
        className={cn('gap-2', className)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        {isSubscribed ? 'Уведомления вкл.' : 'Включить уведомления'}
      </Button>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push-уведомления
          </CardTitle>
          <CardDescription>
            Получайте уведомления о занятиях, сообщениях и важных событиях даже когда браузер закрыт
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isSubscribed ? 'Уведомления включены' : 'Уведомления отключены'}
              </p>
              <p className="text-xs text-muted-foreground">
                {permission === 'denied' 
                  ? 'Разрешение заблокировано в настройках браузера' 
                  : isSubscribed 
                    ? 'Вы будете получать push-уведомления'
                    : 'Включите, чтобы не пропустить важное'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Switch
                checked={isSubscribed}
                onCheckedChange={toggle}
                disabled={isLoading || permission === 'denied'}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default: switch variant
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-2">
        {isSubscribed ? (
          <Bell className="h-4 w-4 text-primary" />
        ) : (
          <BellOff className="h-4 w-4 text-muted-foreground" />
        )}
        <Label htmlFor="push-toggle" className="cursor-pointer">
          Push-уведомления
        </Label>
      </div>
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Switch
          id="push-toggle"
          checked={isSubscribed}
          onCheckedChange={toggle}
          disabled={isLoading || permission === 'denied'}
        />
      </div>
    </div>
  );
}
