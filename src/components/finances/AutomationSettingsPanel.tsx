import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bell, Play, Clock, CheckCircle, XCircle, RefreshCw, Mail, MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/typedClient';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getErrorMessage } from '@/lib/errorUtils';

interface CronJobLog {
  id: string;
  job_name: string;
  executed_at: string;
  status: string;
  response_data?: any;
  error_message?: string;
  execution_time_ms?: number;
}

export const AutomationSettingsPanel = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<CronJobLog[]>([]);
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);

  useEffect(() => {
    loadCronLogs();
  }, []);

  const loadCronLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading cron logs:', error);
    }
  };

  const handleRunNotificationGeneration = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-payment-notifications', {
        body: { manual: true },
      });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: `Создано ${data.notifications_created} уведомлений для ${data.students_notified.length} студентов`,
      });

      loadCronLogs();
    } catch (error: unknown) {
      toast({
        title: 'Ошибка',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSendNotifications = async (notificationId?: string) => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-notifications', {
        body: {
          notification_id: notificationId,
          send_all: !notificationId,
          delivery_method: 'all',
        },
      });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: `Отправлено ${data.sent_count} уведомлений`,
      });

      loadCronLogs();
    } catch (error: unknown) {
      toast({
        title: 'Ошибка',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Автоматизация уведомлений
              </CardTitle>
              <CardDescription>
                Управление автоматическими уведомлениями о низком балансе
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Активно
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Расписание */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Расписание автоматического запуска</h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Ежедневная проверка</p>
                  <p className="text-xs text-muted-foreground">Каждый день в 10:00 UTC (13:00 МСК)</p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Включено
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Еженедельное напоминание</p>
                  <p className="text-xs text-muted-foreground">Каждую пятницу в 16:00 UTC (19:00 МСК)</p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Включено
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Настройки отправки */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Настройки отправки</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="auto-send">Автоматическая отправка уведомлений</Label>
                  <p className="text-xs text-muted-foreground">
                    Отправлять уведомления сразу после создания
                  </p>
                </div>
                <Switch
                  id="auto-send"
                  checked={autoSendEnabled}
                  onCheckedChange={setAutoSendEnabled}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">Email</p>
                    <p className="text-xs text-muted-foreground">Скоро</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">SMS</p>
                    <p className="text-xs text-muted-foreground">Скоро</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">Telegram</p>
                    <p className="text-xs text-muted-foreground">Скоро</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ручной запуск */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Ручное управление</h3>
            <div className="flex gap-2">
              <Button
                onClick={handleRunNotificationGeneration}
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Создать уведомления
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleSendNotifications()}
                disabled={isSending}
                variant="secondary"
                className="gap-2"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Отправить все
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* История выполнения */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">История выполнения</CardTitle>
          <CardDescription>Последние 20 запусков автоматизации</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  История пока пуста
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <p className="text-sm font-medium">{log.job_name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.executed_at), 'dd MMM yyyy, HH:mm:ss', { locale: ru })}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-600">{log.error_message}</p>
                      )}
                    </div>
                    {log.execution_time_ms && (
                      <Badge variant="secondary" className="text-xs">
                        {log.execution_time_ms}ms
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
