import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAutoRetrySettings } from '@/hooks/useAutoRetrySettings';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Timer, Hash } from 'lucide-react';

export const AutoRetrySettings = () => {
  const { settings, isLoading, updateSettings, isUpdating } = useAutoRetrySettings();
  
  const [localSettings, setLocalSettings] = useState({
    enabled: true,
    retryDelaySeconds: 30 as 15 | 30 | 60,
    maxRetryAttempts: 3,
  });
  
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with fetched settings
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        enabled: settings.enabled,
        retryDelaySeconds: settings.retryDelaySeconds,
        maxRetryAttempts: settings.maxRetryAttempts,
      });
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings) {
      const changed = 
        localSettings.enabled !== settings.enabled ||
        localSettings.retryDelaySeconds !== settings.retryDelaySeconds ||
        localSettings.maxRetryAttempts !== settings.maxRetryAttempts;
      setHasChanges(changed);
    }
  }, [localSettings, settings]);

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      toast.success('Настройки автоповтора сохранены');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving auto-retry settings:', error);
      toast.error('Ошибка сохранения настроек');
    }
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings({
        enabled: settings.enabled,
        retryDelaySeconds: settings.retryDelaySeconds,
        maxRetryAttempts: settings.maxRetryAttempts,
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground">Загрузка настроек...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Автоповтор сообщений
        </CardTitle>
        <CardDescription>
          Настройки автоматического повтора неотправленных сообщений в мессенджерах
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-retry-enabled">Автоповтор включён</Label>
            <p className="text-sm text-muted-foreground">
              Автоматически повторять неотправленные сообщения
            </p>
          </div>
          <Switch
            id="auto-retry-enabled"
            checked={localSettings.enabled}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, enabled: checked }))
            }
          />
        </div>

        {/* Retry Delay */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="retry-delay">Интервал автоповтора</Label>
          </div>
          <Select
            value={String(localSettings.retryDelaySeconds)}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ 
                ...prev, 
                retryDelaySeconds: Number(value) as 15 | 30 | 60 
              }))
            }
            disabled={!localSettings.enabled}
          >
            <SelectTrigger id="retry-delay" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 секунд</SelectItem>
              <SelectItem value="30">30 секунд</SelectItem>
              <SelectItem value="60">60 секунд</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Время ожидания перед повторной отправкой
          </p>
        </div>

        {/* Max Attempts */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="max-attempts">Максимум попыток</Label>
          </div>
          <Select
            value={String(localSettings.maxRetryAttempts)}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ 
                ...prev, 
                maxRetryAttempts: Number(value) 
              }))
            }
            disabled={!localSettings.enabled}
          >
            <SelectTrigger id="max-attempts" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 попытка</SelectItem>
              <SelectItem value="2">2 попытки</SelectItem>
              <SelectItem value="3">3 попытки</SelectItem>
              <SelectItem value="5">5 попыток</SelectItem>
              <SelectItem value="10">10 попыток</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            После исчерпания попыток сообщение остаётся в статусе «Ошибка»
          </p>
        </div>

        {/* Save/Reset Buttons */}
        {hasChanges && (
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={isUpdating}>
              Отменить
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
