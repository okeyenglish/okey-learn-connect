import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  RefreshCw, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  Trash2
} from 'lucide-react';
import { useTelegramWappi } from '@/hooks/useTelegramWappi';
import { useToast } from '@/hooks/use-toast';

export const TelegramWappiSettings: React.FC = () => {
  const { 
    isLoading, 
    settings, 
    instanceState, 
    fetchSettings, 
    saveSettings, 
    deleteSettings,
    getWebhookUrl 
  } = useTelegramWappi();
  
  const { toast } = useToast();
  const [profileId, setProfileId] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (settings) {
      setProfileId(settings.profileId || '');
      setIsEnabled(settings.isEnabled || false);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!profileId.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите Profile ID",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    await saveSettings(profileId.trim(), isEnabled);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (confirm('Вы уверены, что хотите удалить настройки Telegram?')) {
      await deleteSettings();
      setProfileId('');
      setIsEnabled(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(getWebhookUrl());
    setCopied(true);
    toast({
      title: "Скопировано",
      description: "Webhook URL скопирован в буфер обмена"
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    if (!instanceState) {
      return <Badge variant="outline">Не настроено</Badge>;
    }

    switch (instanceState.status) {
      case 'authorized':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Подключено</Badge>;
      case 'not_authorized':
        return <Badge variant="destructive">Не авторизован</Badge>;
      case 'loading':
        return <Badge variant="secondary">Проверка...</Badge>;
      case 'error':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Send className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Telegram (Wappi.pro)
                {getStatusBadge()}
              </CardTitle>
              <CardDescription>
                Интеграция с Telegram через Wappi.pro User API
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchSettings()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Alert */}
        {instanceState?.status === 'authorized' && (
          <Alert className="border-green-500/20 bg-green-500/5">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Telegram подключен{instanceState.username && ` (@${instanceState.username})`}
              {instanceState.phone && ` - ${instanceState.phone}`}
            </AlertDescription>
          </Alert>
        )}

        {instanceState?.status === 'not_authorized' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Telegram не авторизован. Пожалуйста, авторизуйте профиль в{' '}
              <a 
                href="https://wappi.pro/cabinet" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline"
              >
                личном кабинете Wappi.pro
              </a>
            </AlertDescription>
          </Alert>
        )}

        {instanceState?.status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ошибка проверки статуса: {instanceState.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Включить интеграцию</Label>
            <p className="text-sm text-muted-foreground">
              Активировать приём и отправку сообщений через Telegram
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        {/* Profile ID */}
        <div className="space-y-2">
          <Label htmlFor="profileId">Profile ID</Label>
          <Input
            id="profileId"
            type="text"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            placeholder="Введите Profile ID из Wappi.pro"
          />
          <p className="text-xs text-muted-foreground">
            Profile ID можно найти в личном кабинете Wappi.pro в разделе Telegram
          </p>
        </div>

        {/* Webhook URL */}
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              value={getWebhookUrl()}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyWebhookUrl}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Webhook URL устанавливается автоматически при сохранении настроек
          </p>
        </div>

        {/* Setup Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">Инструкция по настройке:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>
                Зарегистрируйтесь на{' '}
                <a 
                  href="https://wappi.pro" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  wappi.pro
                </a>
              </li>
              <li>Создайте Telegram профиль в личном кабинете</li>
              <li>Авторизуйте свой Telegram аккаунт по QR-коду</li>
              <li>Скопируйте Profile ID и вставьте выше</li>
              <li>Убедитесь, что WAPPI_API_TOKEN добавлен в секреты Supabase</li>
              <li>Нажмите "Сохранить" для активации</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
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
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving || isLoading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* External Link */}
        <div className="pt-2 border-t">
          <a
            href="https://wappi.pro/cabinet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Открыть личный кабинет Wappi.pro
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
