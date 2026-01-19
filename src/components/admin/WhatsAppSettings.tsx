import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  MessageSquare, 
  Settings, 
  Zap, 
  AlertCircle, 
  CheckCircle,
  Cloud,
  Server,
  RefreshCw,
  Copy,
  ExternalLink,
  Wifi,
  WifiOff,
  Phone
} from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ConnectionInfo {
  status: 'online' | 'offline' | 'connecting' | 'error' | 'unknown';
  phone?: string;
  name?: string;
  lastCheck?: Date;
}

export const WhatsAppSettings: React.FC = () => {
  const { 
    loading, 
    getMessengerSettings, 
    updateMessengerSettings, 
    testConnection, 
    getWebhookLogs,
    getConnectionStatus
  } = useWhatsApp();
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    provider: 'greenapi' as 'greenapi' | 'wpp' | 'wappi',
    instanceId: '',
    apiToken: '',
    apiUrl: 'https://api.green-api.com',
    webhookUrl: '',
    isEnabled: false,
    wppSession: 'default',
    wppBaseUrl: '',
    wppApiKey: '',
    wppWebhookSecret: '',
    wappiProfileId: '',
    wappiApiToken: ''
  });

  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({ status: 'unknown' });
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadSettings();
    loadWebhookLogs();
  }, []);

  // Auto-check connection status on provider change
  useEffect(() => {
    if (settings.isEnabled) {
      checkConnectionStatus();
      const interval = setInterval(checkConnectionStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [settings.provider, settings.isEnabled]);

  const loadSettings = async () => {
    const data = await getMessengerSettings();
    if (data) {
      setSettings({
        provider: data.provider || 'greenapi',
        instanceId: data.instanceId || '',
        apiToken: data.apiToken || '',
        apiUrl: data.apiUrl || 'https://api.green-api.com',
        webhookUrl: data.webhookUrl || '',
        isEnabled: data.isEnabled || false,
        wppSession: data.wppSession || 'default',
        wppBaseUrl: data.wppBaseUrl || '',
        wppApiKey: data.wppApiKey || '',
        wppWebhookSecret: data.wppWebhookSecret || '',
        wappiProfileId: data.wappiProfileId || '',
        wappiApiToken: data.wappiApiToken || ''
      });
    }
    
    if (!data?.webhookUrl) {
      const provider = data?.provider || 'greenapi';
      const webhookFn = provider === 'wpp' ? 'wpp-webhook' : provider === 'wappi' ? 'wappi-whatsapp-webhook' : 'whatsapp-webhook';
      const webhookUrl = `https://kbojujfwtvmsgudumown.supabase.co/functions/v1/${webhookFn}`;
      setSettings(prev => ({ ...prev, webhookUrl }));
    }
  };

  const loadWebhookLogs = async () => {
    const logs = await getWebhookLogs(20);
    setWebhookLogs(logs);
  };

  const checkConnectionStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      const status = await getConnectionStatus(settings.provider);
      setConnectionInfo({
        ...status,
        lastCheck: new Date()
      });
    } catch (error) {
      setConnectionInfo({ status: 'error', lastCheck: new Date() });
    } finally {
      setIsCheckingStatus(false);
    }
  }, [getConnectionStatus, settings.provider]);

  const handleSave = async () => {
    const result = await updateMessengerSettings(settings);
    if (result.success) {
      await loadSettings();
    }
  };

  const handleTest = async () => {
    const result = await testConnection(settings.provider);
    setConnectionStatus(result ? 'connected' : 'error');
    if (result) {
      checkConnectionStatus();
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setSettings(prev => {
      const updated = { ...prev, [field]: value } as typeof settings;
      
      if (field === 'provider') {
        const webhookFn = value === 'wpp' ? 'wpp-webhook' : value === 'wappi' ? 'wappi-whatsapp-webhook' : 'whatsapp-webhook';
        updated.webhookUrl = `https://kbojujfwtvmsgudumown.supabase.co/functions/v1/${webhookFn}`;
      }
      
      return updated;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: "URL скопирован в буфер обмена",
    });
  };

  const getStatusColor = (status: ConnectionInfo['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-400';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusText = (status: ConnectionInfo['status']) => {
    switch (status) {
      case 'online': return 'Подключено';
      case 'offline': return 'Отключено';
      case 'connecting': return 'Подключение...';
      case 'error': return 'Ошибка подключения';
      default: return 'Неизвестно';
    }
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

      {/* Connection Status Banner */}
      {settings.isEnabled && (
        <div className={cn(
          "flex items-center gap-4 p-4 rounded-lg border",
          connectionInfo.status === 'online' && "bg-green-50 border-green-200",
          connectionInfo.status === 'offline' && "bg-gray-50 border-gray-200",
          connectionInfo.status === 'error' && "bg-red-50 border-red-200",
          connectionInfo.status === 'connecting' && "bg-yellow-50 border-yellow-200",
          connectionInfo.status === 'unknown' && "bg-muted border-border"
        )}>
          <div className={cn(
            "h-3 w-3 rounded-full",
            getStatusColor(connectionInfo.status),
            (connectionInfo.status === 'online' || connectionInfo.status === 'connecting') && "animate-pulse"
          )} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {connectionInfo.status === 'online' ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="font-medium">{getStatusText(connectionInfo.status)}</p>
            </div>
            {connectionInfo.phone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Phone className="h-3 w-3" />
                <span>{connectionInfo.name ? `${connectionInfo.name} (${connectionInfo.phone})` : connectionInfo.phone}</span>
              </div>
            )}
            {connectionInfo.lastCheck && (
              <p className="text-xs text-muted-foreground mt-1">
                Проверено: {connectionInfo.lastCheck.toLocaleTimeString('ru-RU')}
              </p>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={checkConnectionStatus}
            disabled={isCheckingStatus}
          >
            <RefreshCw className={cn("h-4 w-4", isCheckingStatus && "animate-spin")} />
          </Button>
        </div>
      )}

      {/* Provider Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            settings.provider === 'greenapi' && "ring-2 ring-primary shadow-md"
          )}
          onClick={() => handleInputChange('provider', 'greenapi')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Cloud className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  Green API
                  {settings.provider === 'greenapi' && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </CardTitle>
                <Badge variant="secondary" className="mt-1">Облачный</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Официальный WhatsApp API
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Не требует своего сервера
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                Платная подписка
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            settings.provider === 'wappi' && "ring-2 ring-primary shadow-md"
          )}
          onClick={() => handleInputChange('provider', 'wappi')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Cloud className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  Wappi.pro
                  {settings.provider === 'wappi' && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </CardTitle>
                <Badge variant="secondary" className="mt-1">Облачный</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Простой API
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Все типы медиа
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                От 700₽/мес
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            settings.provider === 'wpp' && "ring-2 ring-primary shadow-md"
          )}
          onClick={() => handleInputChange('provider', 'wpp')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Server className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  WPP Connect
                  {settings.provider === 'wpp' && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </CardTitle>
                <Badge variant="secondary" className="mt-1">Self-hosted</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Полный контроль
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Бесплатный (open source)
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                Требует свой сервер
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки {settings.provider === 'greenapi' ? 'Green API' : settings.provider === 'wappi' ? 'Wappi.pro' : 'WPP Connect'}
          </CardTitle>
          <CardDescription>
            Введите учетные данные для подключения к {settings.provider === 'greenapi' ? 'Green API' : settings.provider === 'wappi' ? 'Wappi.pro' : 'WPP серверу'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="apiUrl">API URL</Label>
                  <Input
                    id="apiUrl"
                    value={settings.apiUrl}
                    onChange={(e) => handleInputChange('apiUrl', e.target.value)}
                    placeholder="https://api.green-api.com"
                  />
                </div>
              </>
            ) : settings.provider === 'wappi' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wappiProfileId">Profile ID</Label>
                  <Input
                    id="wappiProfileId"
                    value={settings.wappiProfileId}
                    onChange={(e) => handleInputChange('wappiProfileId', e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground">
                    ID профиля из личного кабинета Wappi.pro
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="wappiApiToken">API Token</Label>
                  <Input
                    id="wappiApiToken"
                    type="password"
                    value={settings.wappiApiToken}
                    onChange={(e) => handleInputChange('wappiApiToken', e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                  <p className="text-xs text-muted-foreground">
                    Токен авторизации из настроек Wappi.pro
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Имя сессии для подключения WhatsApp
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wppBaseUrl">WPP Base URL</Label>
                  <Input
                    id="wppBaseUrl"
                    value={settings.wppBaseUrl}
                    onChange={(e) => handleInputChange('wppBaseUrl', e.target.value)}
                    placeholder="https://msg.academyos.ru"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wppApiKey">WPP API Key</Label>
                  <Input
                    id="wppApiKey"
                    type="password"
                    value={settings.wppApiKey}
                    onChange={(e) => handleInputChange('wppApiKey', e.target.value)}
                    placeholder="Ваш API ключ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wppWebhookSecret">WPP Webhook Secret</Label>
                  <Input
                    id="wppWebhookSecret"
                    type="password"
                    value={settings.wppWebhookSecret}
                    onChange={(e) => handleInputChange('wppWebhookSecret', e.target.value)}
                    placeholder="Секретный ключ для webhook"
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhookUrl"
                value={settings.webhookUrl}
                onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                placeholder="https://your-project.supabase.co/functions/v1/whatsapp-webhook"
                className="flex-1"
                readOnly
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(settings.webhookUrl)}
                title="Скопировать URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Скопируйте этот URL в настройки {settings.provider === 'greenapi' ? 'Green API' : 'WPP сервера'}
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

      {/* Instructions Accordion */}
      <Card>
        <CardHeader>
          <CardTitle>Инструкция по настройке {settings.provider === 'greenapi' ? 'Green API' : settings.provider === 'wappi' ? 'Wappi.pro' : 'WPP Connect'}</CardTitle>
          <CardDescription>
            Пошаговое руководство для подключения WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings.provider === 'greenapi' ? (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground">Шаг 1</Badge>
                    <span>Регистрация в Green API</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-3 text-sm ml-4">
                    <li className="flex items-start gap-2">
                      <span className="font-medium">1.</span>
                      <span>
                        Перейдите на{' '}
                        <a 
                          href="https://green-api.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline inline-flex items-center gap-1"
                        >
                          green-api.com
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium">2.</span>
                      <span>Нажмите "Регистрация" и создайте аккаунт</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium">3.</span>
                      <span>Подтвердите email</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium">4.</span>
                      <span>Создайте новый инстанс в личном кабинете</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium">5.</span>
                      <span>Скопируйте ID инстанса и API токен в поля выше</span>
                    </li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground">Шаг 2</Badge>
                    <span>Настройка Webhook</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-sm">
                    <p>В панели Green API откройте настройки инстанса и укажите webhook URL:</p>
                    <div className="flex gap-2">
                      <Input value={settings.webhookUrl} readOnly className="flex-1 text-xs" />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(settings.webhookUrl)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Копировать
                      </Button>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="font-medium mb-2">Включите следующие уведомления:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>✓ incomingMessageReceived</li>
                        <li>✓ outgoingMessageStatus</li>
                        <li>✓ stateInstanceChanged</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground">Шаг 3</Badge>
                    <span>Авторизация WhatsApp</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <p>Отсканируйте QR-код в личном кабинете Green API:</p>
                    <ol className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="font-medium">1.</span>
                        <span>Откройте WhatsApp на телефоне</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">2.</span>
                        <span>Перейдите: Меню → Связанные устройства → Привязка устройства</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">3.</span>
                        <span>Отсканируйте QR-код из панели Green API</span>
                      </li>
                    </ol>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        После сканирования QR-кода статус изменится на "Подключено"
                      </AlertDescription>
                    </Alert>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : settings.provider === 'wappi' ? (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground">Шаг 1</Badge>
                    <span>Регистрация в Wappi.pro</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-3 text-sm ml-4">
                    <li className="flex items-start gap-2">
                      <span className="font-medium">1.</span>
                      <span>
                        Перейдите на{' '}
                        <a 
                          href="https://wappi.pro" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline inline-flex items-center gap-1"
                        >
                          wappi.pro
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium">2.</span>
                      <span>Зарегистрируйтесь и создайте профиль</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium">3.</span>
                      <span>Скопируйте Profile ID и API Token в поля выше</span>
                    </li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground">Шаг 2</Badge>
                    <span>Настройка Webhook</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-sm">
                    <p>В личном кабинете Wappi.pro укажите webhook URL:</p>
                    <div className="flex gap-2">
                      <Input value={settings.webhookUrl} readOnly className="flex-1 text-xs" />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(settings.webhookUrl)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Копировать
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground">Шаг 3</Badge>
                    <span>Авторизация WhatsApp</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <p>Отсканируйте QR-код в личном кабинете Wappi.pro:</p>
                    <ol className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="font-medium">1.</span>
                        <span>Откройте WhatsApp на телефоне</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">2.</span>
                        <span>Перейдите: Меню → Связанные устройства → Привязка устройства</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">3.</span>
                        <span>Отсканируйте QR-код из панели Wappi.pro</span>
                      </li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground">Шаг 1</Badge>
                    <span>Настройка WPP сервера</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <p>Убедитесь, что WPP сервер развернут и работает:</p>
                    <ol className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="font-medium">1.</span>
                        <span>Проверьте доступность сервера по URL</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">2.</span>
                        <span>Получите API ключ из конфигурации сервера</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">3.</span>
                        <span>Заполните поля выше: Base URL, Session, API Key</span>
                      </li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground">Шаг 2</Badge>
                    <span>Настройка Webhook</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-sm">
                    <p>В настройках WPP сервера укажите webhook URL:</p>
                    <div className="flex gap-2">
                      <Input value={settings.webhookUrl} readOnly className="flex-1 text-xs" />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(settings.webhookUrl)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Копировать
                      </Button>
                    </div>
                    <p className="text-muted-foreground">
                      Также укажите Webhook Secret для верификации запросов
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground">Шаг 3</Badge>
                    <span>Авторизация сессии</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <p>Авторизуйте WhatsApp сессию в панели WPP:</p>
                    <ol className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="font-medium">1.</span>
                        <span>Откройте панель управления WPP сервера</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">2.</span>
                        <span>Создайте или выберите сессию</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">3.</span>
                        <span>Отсканируйте QR-код с телефона</span>
                      </li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Webhook Logs */}
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
                    className={cn(
                      "p-3 rounded-lg border",
                      log.processed ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
                    )}
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
