import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Phone, MessageSquare, Send, RefreshCw, CheckCircle, XCircle, 
  Clock, AlertTriangle, Copy, ExternalLink, Loader2
} from 'lucide-react';
import { selfHostedPost, selfHostedGet } from '@/lib/selfHostedApi';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WebhookConfig {
  name: string;
  type: string;
  endpoint: string;
  description: string;
  isEnabled?: boolean;
  webhookKey?: string;
  testPayload: Record<string, unknown>;
}

const WEBHOOK_CONFIGS: WebhookConfig[] = [
  {
    name: 'OnlinePBX',
    type: 'onlinepbx',
    endpoint: 'onlinepbx-webhook',
    description: 'IP-телефония, входящие и исходящие звонки',
    testPayload: {
      event_type: 'call_end',
      call_id: 'test-' + Date.now(),
      call_type: 'incoming',
      phone: '+79001234567',
      caller: '+79001234567',
      called: '101',
      start_time: new Date().toISOString(),
      hangup_cause: 'NORMAL_CLEARING'
    }
  },
  {
    name: 'Telegram Bot',
    type: 'telegram',
    endpoint: 'telegram-webhook',
    description: 'Telegram бот для коммуникаций',
    testPayload: {
      update_id: Date.now(),
      message: {
        message_id: 1,
        from: { id: 123456789, first_name: 'Test', username: 'testuser' },
        chat: { id: 123456789, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Тестовое сообщение'
      }
    }
  },
  {
    name: 'WhatsApp (Green API)',
    type: 'whatsapp',
    endpoint: 'whatsapp-webhook',
    description: 'WhatsApp через Green API',
    testPayload: {
      typeWebhook: 'incomingMessageReceived',
      instanceData: { idInstance: 123456789 },
      timestamp: Math.floor(Date.now() / 1000),
      senderData: { chatId: '79001234567@c.us', sender: '79001234567@c.us' },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Тест' } }
    }
  },
  {
    name: 'WhatsApp (Wappi)',
    type: 'wappi',
    endpoint: 'wappi-whatsapp-webhook',
    description: 'WhatsApp через Wappi.pro',
    testPayload: {
      messages: [{
        id: 'test-msg-' + Date.now(),
        body: 'Тестовое сообщение Wappi',
        type: 'chat',
        from: '79001234567@c.us',
        timestamp: Math.floor(Date.now() / 1000)
      }]
    }
  },
  {
    name: 'Salebot',
    type: 'salebot',
    endpoint: 'salebot-webhook',
    description: 'Интеграция с Salebot CRM',
    testPayload: {
      messageId: Date.now(),
      salebotClientId: 123456,
      isInput: 1,
      message: 'Тестовое сообщение от Salebot'
    }
  },
  {
    name: 'T-Bank (Tinkoff)',
    type: 'tbank',
    endpoint: 'tbank-webhook',
    description: 'Уведомления об оплатах T-Bank',
    testPayload: {
      TerminalKey: 'TestTerminal',
      OrderId: 'test-order-' + Date.now(),
      Success: true,
      Status: 'CONFIRMED',
      PaymentId: 123456789,
      Amount: 100000
    }
  },
  {
    name: 'MAX (VK Teams)',
    type: 'max',
    endpoint: 'max-webhook',
    description: 'MAX мессенджер (VK Teams)',
    testPayload: {
      type: 'message_created',
      payload: {
        message_id: 'test-' + Date.now(),
        text: 'Тестовое сообщение MAX',
        from: { user_id: 'test-user', name: 'Test User' }
      }
    }
  }
];

interface TestResult {
  type: string;
  success: boolean;
  status?: number;
  message: string;
  responseTime: number;
  timestamp: Date;
  response?: unknown;
}

export default function WebhookTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testingType, setTestingType] = useState<string | null>(null);
  const [customPayload, setCustomPayload] = useState<string>('{}');
  const [customEndpoint, setCustomEndpoint] = useState<string>('');
  const [customKey, setCustomKey] = useState<string>('');

  // Fetch messenger settings to get webhook keys
  const { data: messengerSettings, isLoading: loadingSettings, refetch } = useQuery({
    queryKey: ['webhook-test-settings'],
    queryFn: async () => {
      try {
        const response = await selfHostedGet<{ data: Array<{
          messenger_type: string;
          is_enabled: boolean;
          settings: Record<string, unknown>;
        }> }>('/messenger-settings-list');
        return response?.data || [];
      } catch (e) {
        console.error('Failed to fetch messenger settings:', e);
        return [];
      }
    },
    select: (data) => Array.isArray(data) ? data : []
  });

  const getWebhookUrl = useCallback((config: WebhookConfig) => {
    const setting = messengerSettings?.find(s => s.messenger_type === config.type);
    const webhookKey = setting?.settings?.webhook_key || setting?.settings?.webhookKey || '';
    const baseUrl = 'https://api.academyos.ru/functions/v1';
    
    if (webhookKey && config.type === 'onlinepbx') {
      return `${baseUrl}/${config.endpoint}?key=${webhookKey}`;
    }
    return `${baseUrl}/${config.endpoint}`;
  }, [messengerSettings]);

  const getSettingStatus = useCallback((type: string) => {
    const setting = messengerSettings?.find(s => s.messenger_type === type);
    return {
      isEnabled: setting?.is_enabled || false,
      hasKey: !!(setting?.settings?.webhook_key || setting?.settings?.webhookKey || 
                 setting?.settings?.botToken || setting?.settings?.apiToken)
    };
  }, [messengerSettings]);

  const testWebhook = async (config: WebhookConfig) => {
    setTestingType(config.type);
    const startTime = Date.now();
    
    try {
      const url = getWebhookUrl(config);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.testPayload)
      });
      
      const responseTime = Date.now() - startTime;
      let responseData: unknown;
      
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }
      
      const result: TestResult = {
        type: config.type,
        success: response.ok,
        status: response.status,
        message: response.ok ? 'Webhook отвечает корректно' : `Ошибка: ${response.statusText}`,
        responseTime,
        timestamp: new Date(),
        response: responseData
      };
      
      setTestResults(prev => [result, ...prev.slice(0, 19)]);
      
      toast({
        title: response.ok ? 'Тест успешен' : 'Тест провален',
        description: `${config.name}: ${responseTime}ms`,
        variant: response.ok ? 'default' : 'destructive'
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: TestResult = {
        type: config.type,
        success: false,
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        responseTime,
        timestamp: new Date()
      };
      
      setTestResults(prev => [result, ...prev.slice(0, 19)]);
      
      toast({
        title: 'Ошибка теста',
        description: `${config.name}: ${result.message}`,
        variant: 'destructive'
      });
    } finally {
      setTestingType(null);
    }
  };

  const testCustomWebhook = async () => {
    if (!customEndpoint) {
      toast({ title: 'Укажите endpoint', variant: 'destructive' });
      return;
    }
    
    setTestingType('custom');
    const startTime = Date.now();
    
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(customPayload);
      } catch {
        toast({ title: 'Невалидный JSON', variant: 'destructive' });
        setTestingType(null);
        return;
      }
      
      const baseUrl = 'https://api.academyos.ru/functions/v1';
      const url = customKey 
        ? `${baseUrl}/${customEndpoint}?key=${customKey}`
        : `${baseUrl}/${customEndpoint}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const responseTime = Date.now() - startTime;
      let responseData: unknown;
      
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }
      
      const result: TestResult = {
        type: 'custom',
        success: response.ok,
        status: response.status,
        message: response.ok ? 'OK' : `Ошибка: ${response.statusText}`,
        responseTime,
        timestamp: new Date(),
        response: responseData
      };
      
      setTestResults(prev => [result, ...prev.slice(0, 19)]);
      
      toast({
        title: response.ok ? 'Запрос успешен' : 'Ошибка',
        description: `${responseTime}ms - ${response.status}`,
        variant: response.ok ? 'default' : 'destructive'
      });
    } catch (error) {
      const result: TestResult = {
        type: 'custom',
        success: false,
        message: error instanceof Error ? error.message : 'Ошибка',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
      
      setTestResults(prev => [result, ...prev.slice(0, 19)]);
    } finally {
      setTestingType(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Скопировано в буфер обмена' });
  };

  const testAllWebhooks = async () => {
    for (const config of WEBHOOK_CONFIGS) {
      await testWebhook(config);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Диагностика Webhook</h1>
          <p className="text-muted-foreground">
            Тестирование всех webhook-интеграций
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button onClick={testAllWebhooks} disabled={testingType !== null}>
            <Send className="h-4 w-4 mr-2" />
            Тестировать все
          </Button>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Интеграции</TabsTrigger>
          <TabsTrigger value="custom">Кастомный запрос</TabsTrigger>
          <TabsTrigger value="results">Результаты ({testResults.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {WEBHOOK_CONFIGS.map(config => {
              const status = getSettingStatus(config.type);
              const lastResult = testResults.find(r => r.type === config.type);
              const webhookUrl = getWebhookUrl(config);
              
              return (
                <Card key={config.type} className={cn(
                  "transition-all",
                  !status.isEnabled && "opacity-60"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {config.type === 'onlinepbx' ? (
                          <Phone className="h-5 w-5" />
                        ) : (
                          <MessageSquare className="h-5 w-5" />
                        )}
                        {config.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        {status.isEnabled ? (
                          <Badge variant="default" className="bg-green-500">Вкл</Badge>
                        ) : (
                          <Badge variant="secondary">Выкл</Badge>
                        )}
                        {status.hasKey && (
                          <Badge variant="outline">🔑</Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>{config.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <code className="flex-1 bg-muted p-2 rounded truncate">
                        {webhookUrl}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(webhookUrl)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {lastResult && (
                      <div className={cn(
                        "flex items-center gap-2 text-sm p-2 rounded",
                        lastResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      )}>
                        {lastResult.success ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span>{lastResult.responseTime}ms</span>
                        <span className="text-xs opacity-70">
                          {lastResult.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => testWebhook(config)}
                      disabled={testingType !== null}
                    >
                      {testingType === config.type ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Тестирование...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Тестировать
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Кастомный запрос</CardTitle>
              <CardDescription>
                Отправьте произвольный запрос на любой webhook endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Endpoint (без базового URL)</Label>
                  <Input 
                    placeholder="onlinepbx-webhook"
                    value={customEndpoint}
                    onChange={e => setCustomEndpoint(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Webhook Key (опционально)</Label>
                  <Input 
                    placeholder="Ключ для ?key=..."
                    value={customKey}
                    onChange={e => setCustomKey(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>JSON Payload</Label>
                <Textarea 
                  className="font-mono text-sm min-h-[200px]"
                  placeholder='{"event_type": "test"}'
                  value={customPayload}
                  onChange={e => setCustomPayload(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={testCustomWebhook}
                disabled={testingType === 'custom'}
              >
                {testingType === 'custom' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Отправить запрос
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>История тестов</CardTitle>
              <CardDescription>
                Последние {testResults.length} результатов тестирования
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Пока нет результатов тестирования</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {testResults.map((result, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "p-4 rounded-lg border",
                          result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <span className="font-medium">{result.type}</span>
                            {result.status && (
                              <Badge variant="outline">{result.status}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{result.responseTime}ms</span>
                            <span>{result.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <p className="text-sm mb-2">{result.message}</p>
                        {result.response && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Показать ответ
                            </summary>
                            <pre className="mt-2 p-2 bg-background rounded overflow-x-auto">
                              {JSON.stringify(result.response, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
