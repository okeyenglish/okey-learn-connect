import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot, 
  Copy, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock,
  ExternalLink,
  TestTube
} from 'lucide-react';

interface WebhookLogEntry {
  id: string;
  created_at: string;
  event_type: string;
  processed: boolean;
  webhook_data: any;
}

export const SalebotSettings: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastLog, setLastLog] = useState<WebhookLogEntry | null>(null);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Webhook URL for Salebot - always points to api.academyos.ru
  const webhookUrl = 'https://api.academyos.ru/functions/v1/salebot-webhook';

  const fetchLastLog = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('id, created_at, event_type, processed, webhook_data')
        .eq('messenger_type', 'salebot')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLastLog(data);
    } catch (error) {
      console.error('Error fetching last log:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLastLog();
  }, []);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'Скопировано',
      description: 'Webhook URL скопирован в буфер обмена',
    });
  };

  const testWebhook = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      // Send a test POST to our webhook endpoint
      const testPayload = {
        id: Date.now(),
        client: {
          id: 999999,
          recepient: 'test_user',
          client_type: 1,
          name: 'Тест из CRM',
          avatar: '',
          created_at: new Date().toISOString(),
          tag: 'test',
          group: 'test'
        },
        message: `Тестовое сообщение из CRM: ${new Date().toLocaleString('ru-RU')}`,
        attachments: [],
        message_id: 1,
        project_id: 1,
        is_input: 1,
        delivered: 1,
        error_message: null
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setTestResult('success');
        toast({
          title: 'Тест успешен',
          description: 'Webhook ответил корректно, запись должна появиться в логах',
        });
        // Refresh logs after test
        setTimeout(fetchLastLog, 1000);
      } else {
        setTestResult('error');
        toast({
          title: 'Ошибка теста',
          description: data.error || 'Webhook вернул ошибку',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setTestResult('error');
      toast({
        title: 'Ошибка подключения',
        description: error.message || 'Не удалось связаться с webhook',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            Salebot Integration
          </CardTitle>
          <CardDescription>
            Настройка вебхука для получения сообщений из Salebot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Скопируйте этот URL и вставьте в настройках Salebot → API/Webhooks
            </p>
          </div>

          {/* Salebot cabinet link */}
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a 
                href="https://chatter.salebot.pro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Открыть Salebot
              </a>
            </Button>
            <Button 
              variant="outline" 
              onClick={testWebhook}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Тест (локальный)
            </Button>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              testResult === 'success' 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {testResult === 'success' ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Webhook работает корректно</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  <span>Ошибка подключения к webhook</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last webhook log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Последнее событие</CardTitle>
            <CardDescription>
              Последний полученный вебхук от Salebot
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchLastLog}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {lastLog ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(lastLog.created_at)}</span>
                <Badge variant={lastLog.processed ? 'default' : 'secondary'}>
                  {lastLog.processed ? 'Обработан' : 'В очереди'}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <span className="text-sm font-medium">Тип события:</span>
                <Badge variant="outline">{lastLog.event_type}</Badge>
              </div>

              {lastLog.webhook_data && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Данные:</span>
                  <div className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto max-h-48">
                    <pre>{JSON.stringify(lastLog.webhook_data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Нет данных о полученных вебхуках</p>
              <p className="text-sm">Отправьте сообщение боту для проверки</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Инструкция по настройке</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Войдите в кабинет <a href="https://chatter.salebot.pro" target="_blank" rel="noopener noreferrer" className="text-primary underline">Salebot</a></li>
            <li>Перейдите в <strong>Настройки бота</strong> → <strong>API</strong> или <strong>Webhooks</strong></li>
            <li>Найдите поле <strong>Webhook URL</strong></li>
            <li>Вставьте URL: <code className="bg-muted px-1 rounded">{webhookUrl}</code></li>
            <li>Сохраните настройки</li>
            <li>Отправьте тестовое сообщение боту</li>
            <li>Проверьте появление события в секции "Последнее событие" выше</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
