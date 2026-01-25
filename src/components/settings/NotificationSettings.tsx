import { Volume2, VolumeX, Vibrate, Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotificationSettings, invalidateSettingsCache } from '@/hooks/useNotificationSettings';
import { playNotificationSound } from '@/hooks/useNotificationSound';
import { toast } from 'sonner';

export const NotificationSettings = () => {
  const { settings, isLoaded, saveSettings, toggleSound, toggleVibration } = useNotificationSettings();

  const handleVolumeChange = (value: number[]) => {
    saveSettings({ soundVolume: value[0] });
    invalidateSettingsCache();
  };

  const handleToggleSound = () => {
    toggleSound();
    invalidateSettingsCache();
  };

  const handleToggleVibration = () => {
    toggleVibration();
    invalidateSettingsCache();
  };

  const testSound = () => {
    if (settings.soundEnabled) {
      playNotificationSound(settings.soundVolume);
      toast.success('Тестовый звук воспроизведён');
    } else {
      toast.info('Звуковые уведомления отключены');
    }
  };

  const testVibration = () => {
    if (settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
      toast.success('Тестовая вибрация');
    } else if (!navigator.vibrate) {
      toast.info('Вибрация не поддерживается на этом устройстве');
    } else {
      toast.info('Вибрация отключена');
    }
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Уведомления
        </CardTitle>
        <CardDescription>
          Настройки звуковых и тактильных уведомлений
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-primary" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="sound-toggle" className="font-medium">
                Звуковые уведомления
              </Label>
              <p className="text-sm text-muted-foreground">
                Воспроизводить звук при новых сообщениях
              </p>
            </div>
          </div>
          <Switch
            id="sound-toggle"
            checked={settings.soundEnabled}
            onCheckedChange={handleToggleSound}
          />
        </div>

        {/* Volume slider */}
        {settings.soundEnabled && (
          <div className="space-y-3 pl-8">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Громкость</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.soundVolume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.1}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={testSound}
              >
                Тест
              </Button>
            </div>
          </div>
        )}

        {/* Vibration toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vibrate className={`h-5 w-5 ${settings.vibrationEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <Label htmlFor="vibration-toggle" className="font-medium">
                Вибрация
              </Label>
              <p className="text-sm text-muted-foreground">
                Вибрация при обновлении и уведомлениях (мобильные)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={testVibration}
              className="text-xs"
            >
              Тест
            </Button>
            <Switch
              id="vibration-toggle"
              checked={settings.vibrationEnabled}
              onCheckedChange={handleToggleVibration}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
