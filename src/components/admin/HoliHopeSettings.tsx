import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Eye, EyeOff, CheckCircle, XCircle, ExternalLink, RefreshCw, Trash2, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { selfHostedGet, selfHostedPost, selfHostedDelete } from '@/lib/selfHostedApi';

interface HoliHopeSettings {
  apiKey: string;
  isEnabled: boolean;
}

interface HoliHopeSettingsResponse {
  settings: HoliHopeSettings | null;
}

export const HoliHopeSettings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [settings, setSettings] = useState<HoliHopeSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await selfHostedGet<HoliHopeSettingsResponse>('holihope-settings');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch settings');
      }

      if (response.data?.settings) {
        setSettings(response.data.settings);
        setIsEnabled(response.data.settings.isEnabled || false);
      }
    } catch (error: unknown) {
      console.error('Error fetching HoliHope settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings && !apiKey.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите HoliHope API Key",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await selfHostedPost<{ error?: string }>('holihope-settings', { 
        apiKey: apiKey.trim() || undefined, 
        isEnabled 
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save settings');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Успешно",
        description: "Настройки HoliHope сохранены"
      });

      setApiKey('');
      await fetchSettings();
    } catch (error: unknown) {
      console.error('Error saving HoliHope settings:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await selfHostedPost<{ success: boolean; error?: string }>('holihope-settings', { action: 'test' });

      if (response.data?.success) {
        setTestResult('success');
        toast({
          title: "Подключение успешно",
          description: "HoliHope API работает корректно"
        });
      } else {
        setTestResult('error');
        toast({
          title: "Ошибка подключения",
          description: response.data?.error || response.error || "Не удалось подключиться к HoliHope",
          variant: "destructive"
        });
      }
    } catch (error: unknown) {
      setTestResult('error');
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить настройки HoliHope? Это отключит импорт данных из HoliHope.')) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await selfHostedDelete('holihope-settings');

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete settings');
      }

      toast({
        title: "Успешно",
        description: "Настройки HoliHope удалены"
      });

      setSettings(null);
      setApiKey('');
      setIsEnabled(true);
      setTestResult(null);
    } catch (error: unknown) {
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Database className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                HoliHope API
                {settings?.isEnabled ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Активно
                  </Badge>
                ) : settings ? (
                  <Badge variant="secondary">Отключено</Badge>
                ) : (
                  <Badge variant="outline">Не настроено</Badge>
                )}
              </CardTitle>
              <CardDescription>
                API ключ для импорта данных из CRM HoliHope (студенты, группы, платежи)
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchSettings}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {testResult === 'success' && (
          <Alert className="border-green-500/20 bg-green-500/5">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              HoliHope API подключен и работает корректно
            </AlertDescription>
          </Alert>
        )}

        {testResult === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Ошибка подключения к HoliHope API. Проверьте API ключ.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Включить импорт из HoliHope</Label>
            <p className="text-sm text-muted-foreground">
              Активировать синхронизацию данных с CRM HoliHope
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="holihopeApiKey">HoliHope API Key</Label>
          <div className="relative">
            <Input
              id="holihopeApiKey"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.apiKey ? 'Оставьте пустым чтобы сохранить текущий' : 'Введите API ключ...'}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {settings?.apiKey && (
            <p className="text-xs text-muted-foreground">
              Текущий ключ: {settings.apiKey}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Получите API ключ в настройках вашего аккаунта HoliHope
          </p>
        </div>

        <Alert>
          <AlertDescription className="space-y-2">
            <p className="font-medium">HoliHope импорт используется для:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Импорт студентов и их данных</li>
              <li>Импорт групп и расписания</li>
              <li>Синхронизация платежей и балансов</li>
              <li>Импорт преподавателей</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>

          {settings && (
            <>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || isLoading}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Тест'
                )}
              </Button>

              <Button
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={isSaving || isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="pt-2 border-t">
          <a
            href="https://okeyenglish.t8s.ru"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Открыть HoliHope
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
