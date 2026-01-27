import { Bell, BellOff, Loader2, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { FocusModeWarning } from './FocusModeWarning';
import { PushDiagnostics } from './PushDiagnostics';
import { cn } from '@/lib/utils';

interface PushNotificationToggleProps {
  variant?: 'button' | 'switch' | 'card';
  className?: string;
  /** Show Focus/DND warning if detected */
  showFocusWarning?: boolean;
  /** Show diagnostics button */
  showDiagnostics?: boolean;
}

export function PushNotificationToggle({ 
  variant = 'switch',
  className,
  showFocusWarning = false,
  showDiagnostics = false,
}: PushNotificationToggleProps) {
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push-уведомления
            </CardTitle>
            {showDiagnostics && isSubscribed && (
              <Dialog open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Диагностика Push</DialogTitle>
                  </DialogHeader>
                  <PushDiagnostics />
                </DialogContent>
              </Dialog>
            )}
          </div>
          <CardDescription>
            Получайте уведомления о занятиях, сообщениях и важных событиях даже когда браузер закрыт
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          
          {/* Focus/DND warning */}
          {showFocusWarning && isSubscribed && (
            <FocusModeWarning compact />
          )}
        </CardContent>
      </Card>
    );
  }

  // Default: switch variant
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-4">
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
      
      {/* Focus/DND warning - compact inline */}
      {showFocusWarning && isSubscribed && (
        <FocusModeWarning compact />
      )}
    </div>
  );
}
