import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Bell, Volume2, Vibrate, PhoneMissed } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';

export const NotificationSettingsCard = () => {
  const { 
    settings, 
    isLoaded, 
    toggleSound, 
    setVolume, 
    toggleVibration,
    toggleMissedCallNotifications 
  } = useNotificationSettings();

  if (!isLoaded) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Настройки уведомлений
        </CardTitle>
        <CardDescription>
          Управление звуковыми и визуальными уведомлениями
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="sound-enabled">Звуковые уведомления</Label>
              <p className="text-sm text-muted-foreground">
                Воспроизводить звук при новых сообщениях
              </p>
            </div>
          </div>
          <Switch
            id="sound-enabled"
            checked={settings.soundEnabled}
            onCheckedChange={toggleSound}
          />
        </div>

        {/* Volume slider */}
        {settings.soundEnabled && (
          <div className="pl-7 space-y-2">
            <Label>Громкость: {Math.round(settings.soundVolume * 100)}%</Label>
            <Slider
              value={[settings.soundVolume]}
              onValueChange={([value]) => setVolume(value)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
        )}

        {/* Vibration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vibrate className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="vibration-enabled">Вибрация</Label>
              <p className="text-sm text-muted-foreground">
                Вибрация на мобильных устройствах
              </p>
            </div>
          </div>
          <Switch
            id="vibration-enabled"
            checked={settings.vibrationEnabled}
            onCheckedChange={toggleVibration}
          />
        </div>

        {/* Missed call notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PhoneMissed className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="missed-call-enabled">Пропущенные звонки</Label>
              <p className="text-sm text-muted-foreground">
                Уведомления о новых пропущенных звонках
              </p>
            </div>
          </div>
          <Switch
            id="missed-call-enabled"
            checked={settings.missedCallNotificationsEnabled}
            onCheckedChange={toggleMissedCallNotifications}
          />
        </div>
      </CardContent>
    </Card>
  );
};
