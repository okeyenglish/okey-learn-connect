import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Copy, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw, 
  Webhook,
  MessageSquare,
  Phone,
  CreditCard,
  Bot,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WebhookConfig {
  name: string;
  description: string;
  url: string;
  method: 'GET' | 'POST';
  category: 'messenger' | 'telephony' | 'payment' | 'bot' | 'system';
  icon: React.ElementType;
  requiresAuth: boolean;
  testable: boolean;
}

const BASE_URL = 'https://api.academyos.ru/functions/v1';

const WEBHOOKS: WebhookConfig[] = [
  // Messengers
  {
    name: 'WhatsApp Webhook (Wappi)',
    description: 'Входящие сообщения WhatsApp через Wappi.pro',
    url: `${BASE_URL}/wappi-whatsapp-webhook`,
    method: 'POST',
    category: 'messenger',
    icon: MessageSquare,
    requiresAuth: false,
    testable: true,
  },
  {
    name: 'WhatsApp Webhook (WPP)',
    description: 'Входящие сообщения WhatsApp через WPPConnect',
    url: `${BASE_URL}/wpp-webhook`,
    method: 'POST',
    category: 'messenger',
    icon: MessageSquare,
    requiresAuth: false,
    testable: true,
  },
  {
    name: 'WhatsApp Webhook (GreenAPI)',
    description: 'Входящие сообщения WhatsApp через GreenAPI (MAX)',
    url: `${BASE_URL}/max-webhook`,
    method: 'POST',
    category: 'messenger',
    icon: MessageSquare,
    requiresAuth: false,
    testable: true,
  },
  {
    name: 'Telegram Webhook',
    description: 'Входящие сообщения Telegram Bot',
    url: `${BASE_URL}/telegram-webhook`,
    method: 'POST',
    category: 'messenger',
    icon: Send,
    requiresAuth: false,
    testable: true,
  },
  {
    name: 'Salebot Webhook',
    description: 'События от Salebot CRM',
    url: `${BASE_URL}/salebot-webhook`,
    method: 'POST',
    category: 'bot',
    icon: Bot,
    requiresAuth: false,
    testable: true,
  },
  
  // Telephony
  {
    name: 'OnlinePBX Webhook',
    description: 'События звонков от виртуальной АТС',
    url: `${BASE_URL}/onlinepbx-webhook`,
    method: 'POST',
    category: 'telephony',
    icon: Phone,
    requiresAuth: false,
    testable: true,
  },
  
  // Payments
  {
    name: 'T-Bank Webhook',
    description: 'Уведомления о статусе платежей',
    url: `${BASE_URL}/tbank-webhook`,
    method: 'POST',
    category: 'payment',
    icon: CreditCard,
    requiresAuth: false,
    testable: true,
  },
  
  // System
  {
    name: 'Edge Health Monitor',
    description: 'Проверка здоровья Edge Functions',
    url: `${BASE_URL}/edge-health-monitor`,
    method: 'POST',
    category: 'system',
    icon: Webhook,
    requiresAuth: false,
    testable: true,
  },
  {
    name: 'Lesson Reminders',
    description: 'Push-уведомления о занятиях',
    url: `${BASE_URL}/lesson-reminders`,
    method: 'POST',
    category: 'system',
    icon: Webhook,
    requiresAuth: false,
    testable: true,
  },
  {
    name: 'SLA Monitor',
    description: 'Мониторинг SLA метрик',
    url: `${BASE_URL}/sla-monitor`,
    method: 'POST',
    category: 'system',
    icon: Webhook,
    requiresAuth: false,
    testable: true,
  },
  {
    name: 'Process Events',
    description: 'Обработка системных событий',
    url: `${BASE_URL}/process-events`,
    method: 'POST',
    category: 'system',
    icon: Webhook,
    requiresAuth: false,
    testable: true,
  },
  {
    name: 'Sitemap',
    description: 'Генерация sitemap.xml',
    url: `${BASE_URL}/sitemap`,
    method: 'GET',
    category: 'system',
    icon: Webhook,
    requiresAuth: false,
    testable: true,
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  messenger: { label: 'Мессенджеры', color: 'bg-green-100 text-green-700' },
  telephony: { label: 'Телефония', color: 'bg-blue-100 text-blue-700' },
  payment: { label: 'Платежи', color: 'bg-purple-100 text-purple-700' },
  bot: { label: 'Боты', color: 'bg-orange-100 text-orange-700' },
  system: { label: 'Система', color: 'bg-gray-100 text-gray-700' },
};

export function WebhooksDirectory() {
  const { toast } = useToast();
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: number; time: number }>>({});
  const [activeTab, setActiveTab] = useState('all');

  const copyToClipboard = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Скопировано",
      description: `URL ${name} скопирован в буфер обмена`,
    });
  };

  const testWebhook = async (webhook: WebhookConfig) => {
    setTestingWebhook(webhook.name);
    const startTime = Date.now();
    
    try {
      const response = await fetch(webhook.url, {
        method: webhook.method === 'GET' ? 'GET' : 'OPTIONS',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const time = Date.now() - startTime;
      setTestResults(prev => ({
        ...prev,
        [webhook.name]: { status: response.status, time }
      }));
      
      toast({
        title: response.ok || response.status === 405 ? "✅ Доступен" : "⚠️ Ответ получен",
        description: `${webhook.name}: HTTP ${response.status} за ${time}ms`,
      });
    } catch (error) {
      const time = Date.now() - startTime;
      setTestResults(prev => ({
        ...prev,
        [webhook.name]: { status: 0, time }
      }));
      
      toast({
        title: "❌ Ошибка",
        description: `${webhook.name}: не удалось подключиться`,
        variant: "destructive",
      });
    } finally {
      setTestingWebhook(null);
    }
  };

  const testAllWebhooks = async () => {
    const webhooksToTest = activeTab === 'all' 
      ? WEBHOOKS 
      : WEBHOOKS.filter(w => w.category === activeTab);
    
    for (const webhook of webhooksToTest) {
      await testWebhook(webhook);
      await new Promise(r => setTimeout(r, 200)); // Small delay between requests
    }
  };

  const filteredWebhooks = activeTab === 'all' 
    ? WEBHOOKS 
    : WEBHOOKS.filter(w => w.category === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Справочник Webhooks</h1>
          <p className="text-muted-foreground">
            Все URL для интеграций с внешними сервисами
          </p>
        </div>
        <Button onClick={testAllWebhooks} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Проверить все
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Все ({WEBHOOKS.length})</TabsTrigger>
          <TabsTrigger value="messenger">
            Мессенджеры ({WEBHOOKS.filter(w => w.category === 'messenger').length})
          </TabsTrigger>
          <TabsTrigger value="telephony">
            Телефония ({WEBHOOKS.filter(w => w.category === 'telephony').length})
          </TabsTrigger>
          <TabsTrigger value="payment">
            Платежи ({WEBHOOKS.filter(w => w.category === 'payment').length})
          </TabsTrigger>
          <TabsTrigger value="system">
            Система ({WEBHOOKS.filter(w => w.category === 'system').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="grid gap-4">
              {filteredWebhooks.map((webhook) => {
                const result = testResults[webhook.name];
                const Icon = webhook.icon;
                const categoryInfo = CATEGORY_LABELS[webhook.category];
                
                return (
                  <Card key={webhook.name} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{webhook.name}</CardTitle>
                            <CardDescription>{webhook.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{webhook.method}</Badge>
                          {result && (
                            <Badge 
                              variant={result.status >= 200 && result.status < 400 || result.status === 405 
                                ? "default" 
                                : result.status === 0 
                                  ? "destructive" 
                                  : "secondary"
                              }
                            >
                              {result.status === 0 ? 'Ошибка' : `${result.status}`} • {result.time}ms
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={webhook.url} 
                          readOnly 
                          className="font-mono text-sm bg-muted"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => copyToClipboard(webhook.url, webhook.name)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => window.open(webhook.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {webhook.testable && (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => testWebhook(webhook)}
                            disabled={testingWebhook === webhook.name}
                          >
                            {testingWebhook === webhook.name ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            <span className="ml-2">Тест</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Quick Reference Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Быстрая справка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Базовый URL:</strong> <code className="bg-background px-2 py-1 rounded">{BASE_URL}</code></p>
          <p><strong>Всего эндпоинтов:</strong> {WEBHOOKS.length}</p>
          <p><strong>Документация:</strong> Все вебхуки принимают POST-запросы с JSON-телом (кроме sitemap)</p>
        </CardContent>
      </Card>
    </div>
  );
}
