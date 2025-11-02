import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, Settings, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const WhatsAppSettings: React.FC = () => {
  const { 
    loading, 
    getMessengerSettings, 
    updateMessengerSettings, 
    testConnection, 
    getWebhookLogs 
  } = useWhatsApp();

  const [settings, setSettings] = useState({
    provider: 'greenapi' as 'greenapi' | 'wpp',
    instanceId: '',
    apiToken: '',
    apiUrl: 'https://api.green-api.com',
    webhookUrl: '',
    isEnabled: false,
    wppSession: 'default'
  });

  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadSettings();
    loadWebhookLogs();
  }, []);

  const loadSettings = async () => {
    const data = await getMessengerSettings();
    if (data) {
      setSettings({
        provider: data.provider,
        instanceId: data.instanceId,
        apiToken: data.apiToken,
        apiUrl: data.apiUrl,
        webhookUrl: data.webhookUrl,
        isEnabled: data.isEnabled,
        wppSession: data.wppSession || 'default'
      });
    }
    
    // Генерируем webhook URL если его нет
    if (!data?.webhookUrl) {
      const provider = data?.provider || 'greenapi';
      const webhookFn = provider === 'wpp' ? 'wpp-webhook' : 'whatsapp-webhook';
      const webhookUrl = `https://api.academyos.ru/functions/v1/${webhookFn}`;
      setSettings(prev => ({ ...prev, webhookUrl }));
    }
  };

  const loadWebhookLogs = async () => {
    const logs = await getWebhookLogs(20);
    setWebhookLogs(logs);
  };

  const handleSave = async () => {
    const result = await updateMessengerSettings(settings);
    if (result.success) {
      await loadSettings();
    }
  };

  const handleTest = async () => {
    const result = await testConnection(settings.provider as 'greenapi' | 'wpp');
    setConnectionStatus(result ? 'connected' : 'error');
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setSettings(prev => {
      const updated = { ...prev, [field]: value } as typeof settings;
      
      // Автоматически обновляем webhook URL при смене провайдера
      if (field === 'provider') {
        const webhookFn = value === 'wpp' ? 'wpp-webhook' : 'whatsapp-webhook';
        updated.webhookUrl = `https://api.academyos.ru/functions/v1/${webhookFn}`;
      }
      
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-green-600" />
        <h2 className="text-2xl font-bold">WhatsApp интеграция</h2>
        {settings.isEnabled && (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Активна
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки WhatsApp провайдера
          </CardTitle>
          <CardDescription>
            Выберите провайдера и настройте подключение для отправки и получения WhatsApp сообщений
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Провайдер</Label>
            <div className="flex gap-2" role="group" aria-label="Выбор провайдера WhatsApp">
              <Button
                type="button"
                variant={settings.provider === 'greenapi' ? 'default' : 'outline'}
                onClick={() => handleInputChange('provider', 'greenapi')}
              >
                Green-API
              </Button>
              <Button
                type="button"
                variant={settings.provider === 'wpp' ? 'default' : 'outline'}
                onClick={() => handleInputChange('provider', 'wpp')}
              >
                WPP (msg.academyos.ru)
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {settings.provider === 'greenapi' 
                ? 'Green-API - официальный провайдер WhatsApp Business API' 
                : 'WPP - собственный сервер WhatsApp Web Protocol'}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.provider === 'greenapi' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="instanceId">ID Инстанса</Label>
                  <Input
                    id="instanceId"
                    value={settings.instanceId}
                    onChange={(e) => handleInputChange('instanceId', e.target.value)}
                    placeholder="1101234567"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiToken">API Token</Label>
                  <Input
                    id="apiToken"
                    type="password"
                    value={settings.apiToken}
                    onChange={(e) => handleInputChange('apiToken', e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wppSession">Сессия WPP</Label>
                  <Input
                    id="wppSession"
                    value={settings.wppSession}
                    onChange={(e) => handleInputChange('wppSession', e.target.value)}
                    placeholder="default"
                  />
                  <p className="text-sm text-muted-foreground">
                    Имя сессии для подключения WhatsApp
                  </p>
                </div>
              </>
            )}
          </div>

          {settings.provider === 'greenapi' && (
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL</Label>
              <Input
                id="apiUrl"
                value={settings.apiUrl}
                onChange={(e) => handleInputChange('apiUrl', e.target.value)}
                placeholder="https://api.green-api.com"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={settings.webhookUrl}
              onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
              placeholder="https://your-project.supabase.co/functions/v1/whatsapp-webhook"
            />
            <p className="text-sm text-muted-foreground">
              {settings.provider === 'greenapi' 
                ? 'Скопируйте этот URL в настройки вашего инстанса Green‑API'
                : 'Скопируйте этот URL в настройки вашего сервера WPP'}
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enabled">Включить интеграцию</Label>
              <p className="text-sm text-muted-foreground">
                Активировать отправку и получение WhatsApp сообщений
              </p>
            </div>
            <Switch
              id="enabled"
              checked={settings.isEnabled}
              onCheckedChange={(checked) => handleInputChange('isEnabled', checked)}
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Сохранить настройки
            </Button>
            
            <Button variant="outline" onClick={handleTest} disabled={loading}>
              <Zap className="h-4 w-4 mr-2" />
              Проверить подключение
            </Button>
          </div>

          {connectionStatus !== 'unknown' && (
            <Alert variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {connectionStatus === 'connected' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {connectionStatus === 'connected' 
                  ? 'Подключение к WhatsApp API успешно установлено'
                  : 'Ошибка подключения к WhatsApp API. Проверьте настройки.'
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Инструкция по настройке</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.provider === 'greenapi' ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Получите учетные данные Green-API</h4>
                  <p className="text-sm text-muted-foreground">
                    Зарегистрируйтесь на green-api.com и получите ID инстанса и API токен
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Настройте webhook</h4>
                  <p className="text-sm text-muted-foreground">
                    В панели Green-API укажите webhook URL из поля выше и включите нужные типы уведомлений
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Авторизуйте WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">
                    Отсканируйте QR-код в панели Green-API для подключения WhatsApp аккаунта
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Настройте секреты</h4>
                  <p className="text-sm text-muted-foreground">
                    Добавьте секреты WPP_BASE_URL, WPP_API_KEY и WPP_WEBHOOK_SECRET в настройках проекта
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Настройте webhook в WPP</h4>
                  <p className="text-sm text-muted-foreground">
                    В панели WPP укажите webhook URL из поля выше
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Авторизуйте сессию</h4>
                  <p className="text-sm text-muted-foreground">
                    Отсканируйте QR-код в панели WPP для подключения WhatsApp аккаунта
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {webhookLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Журнал webhook событий
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? 'Скрыть' : 'Показать'} ({webhookLogs.length})
              </Button>
            </CardTitle>
          </CardHeader>
          {showLogs && (
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {webhookLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-lg border ${
                      log.processed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{log.event_type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    {log.error_message && (
                      <p className="text-sm text-red-600 mb-2">{log.error_message}</p>
                    )}
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">Данные webhook</summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.webhook_data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};