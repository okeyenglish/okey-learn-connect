import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageCircle, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  ExternalLink,
  Loader2,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useMaxGreenApi } from '@/hooks/useMaxGreenApi';
import { useToast } from '@/hooks/use-toast';

export const MaxGreenApiSettings: React.FC = () => {
  const { 
    loading, 
    settings, 
    instanceState, 
    fetchSettings, 
    saveSettings, 
    deleteSettings,
    getWebhookUrl 
  } = useMaxGreenApi();
  const { toast } = useToast();

  const [instanceId, setInstanceId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings?.settings) {
      setInstanceId(settings.settings.instanceId || '');
      setApiToken(settings.settings.apiToken || '');
      setIsEnabled(settings.is_enabled);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!instanceId.trim() || !apiToken.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Заполните Instance ID и API Token',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    await saveSettings(instanceId.trim(), apiToken.trim(), isEnabled);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (confirm('Вы уверены, что хотите удалить интеграцию MAX?')) {
      await deleteSettings();
      setInstanceId('');
      setApiToken('');
      setIsEnabled(true);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(getWebhookUrl());
    toast({
      title: 'Скопировано',
      description: 'URL вебхука скопирован в буфер обмена'
    });
  };

  const getStatusBadge = () => {
    if (!settings) {
      return <Badge variant="outline">Не настроено</Badge>;
    }

    if (!instanceState?.success) {
      return <Badge variant="destructive">Ошибка подключения</Badge>;
    }

    const state = instanceState.stateInstance;
    
    if (state === 'authorized') {
      return <Badge className="bg-green-500">Подключено</Badge>;
    } else if (state === 'notAuthorized') {
      return <Badge variant="destructive">Не авторизован</Badge>;
    } else if (state === 'sleepMode') {
      return <Badge variant="secondary">Спящий режим</Badge>;
    } else {
      return <Badge variant="outline">{state || 'Неизвестно'}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MessageCircle className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                MAX Messenger
                {getStatusBadge()}
              </CardTitle>
              <CardDescription>
                Интеграция с мессенджером MAX через Green API
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchSettings}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Alert */}
        {instanceState?.success && instanceState.stateInstance === 'authorized' && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              MAX подключен и готов к работе
            </AlertDescription>
          </Alert>
        )}

        {instanceState && !instanceState.success && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {instanceState.error || 'Ошибка подключения к MAX'}
            </AlertDescription>
          </Alert>
        )}

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="max-enabled">Включить интеграцию</Label>
            <p className="text-sm text-muted-foreground">
              Активировать отправку и прием сообщений через MAX
            </p>
          </div>
          <Switch
            id="max-enabled"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        {/* Credentials */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instance-id">Instance ID</Label>
            <Input
              id="instance-id"
              placeholder="Например: 3100000000"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ID инстанса из консоли Green API
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-token">API Token</Label>
            <Input
              id="api-token"
              type="password"
              placeholder="Токен доступа"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              API токен из консоли Green API
            </p>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="space-y-2">
          <Label>URL вебхука</Label>
          <div className="flex gap-2">
            <Input
              value={getWebhookUrl()}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Укажите этот URL в настройках вебхука в консоли Green API
          </p>
        </div>

        {/* Instructions */}
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">Инструкция по настройке:</p>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>Зарегистрируйтесь в <a href="https://console.green-api.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Green API Console</a></li>
              <li>Создайте MAX инстанс (v3)</li>
              <li>Скопируйте Instance ID и API Token</li>
              <li>Укажите URL вебхука (см. выше) в настройках инстанса</li>
              <li>Авторизуйте MAX на вашем устройстве через QR-код</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || loading}
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
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Green API Console Link */}
        <div className="pt-4 border-t">
          <a 
            href="https://console.green-api.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Открыть консоль Green API
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
