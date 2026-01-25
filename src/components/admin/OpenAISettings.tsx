import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Eye, EyeOff, CheckCircle, XCircle, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';

interface AISettings {
  openaiApiKey: string;
  isEnabled: boolean;
}

export const OpenAISettings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [settings, setSettings] = useState<AISettings | null>(null);
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
      const { data, error } = await supabase.functions.invoke('ai-settings', {
        method: 'GET'
      });

      if (error) throw error;

      if (data.settings) {
        setSettings(data.settings);
        setIsEnabled(data.settings.isEnabled || false);
      }
    } catch (error: unknown) {
      console.error('Error fetching AI settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings && !apiKey.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите OpenAI API Key",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-settings', {
        method: 'POST',
        body: { 
          openaiApiKey: apiKey.trim() || undefined, 
          isEnabled 
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Успешно",
        description: "Настройки OpenAI сохранены"
      });

      setApiKey('');
      await fetchSettings();
    } catch (error: unknown) {
      console.error('Error saving AI settings:', error);
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
      const { data, error } = await supabase.functions.invoke('ai-settings', {
        method: 'POST',
        body: { action: 'test' }
      });

      if (error) throw error;

      if (data.success) {
        setTestResult('success');
        toast({
          title: "Подключение успешно",
          description: "OpenAI API работает корректно"
        });
      } else {
        setTestResult('error');
        toast({
          title: "Ошибка подключения",
          description: data.error || "Не удалось подключиться к OpenAI",
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
    if (!confirm('Удалить настройки OpenAI? Это отключит AI функции для вашей организации.')) {
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-settings', {
        method: 'DELETE'
      });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Настройки OpenAI удалены"
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
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Key className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                OpenAI API
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
                API ключ для AI функций (генерация текста, транскрипция)
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
              OpenAI API подключен и работает корректно
            </AlertDescription>
          </Alert>
        )}

        {testResult === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Ошибка подключения к OpenAI API. Проверьте API ключ.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Включить AI функции</Label>
            <p className="text-sm text-muted-foreground">
              Активировать генерацию текста и транскрипцию
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
          <div className="relative">
            <Input
              id="openaiApiKey"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.openaiApiKey ? 'Оставьте пустым чтобы сохранить текущий' : 'sk-...'}
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
          {settings?.openaiApiKey && (
            <p className="text-xs text-muted-foreground">
              Текущий ключ: {settings.openaiApiKey}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Получите API ключ на{' '}
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              platform.openai.com
            </a>
          </p>
        </div>

        <Alert>
          <AlertDescription className="space-y-2">
            <p className="font-medium">AI функции используются для:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Генерация ответов в чате</li>
              <li>Транскрипция голосовых сообщений</li>
              <li>SEO анализ и генерация контента</li>
              <li>Индексация базы знаний</li>
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
            href="https://platform.openai.com/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Открыть панель OpenAI
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
