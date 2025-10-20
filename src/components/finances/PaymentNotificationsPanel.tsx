import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCircle, AlertCircle, Send, RefreshCw } from 'lucide-react';
import { usePaymentNotifications, useMarkNotificationSent, useCreatePaymentNotifications } from '@/hooks/useStudentBalances';
import { Skeleton } from '@/components/ui/skeleton';

export const PaymentNotificationsPanel = () => {
  const { data: notifications, isLoading } = usePaymentNotifications();
  const markSent = useMarkNotificationSent();
  const createNotifications = useCreatePaymentNotifications();

  const getNotificationVariant = (type: string) => {
    switch (type) {
      case 'overdue':
        return 'destructive';
      case 'payment_due':
        return 'default';
      case 'low_balance':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getNotificationLabel = (type: string) => {
    const labels: Record<string, string> = {
      overdue: 'Просрочено',
      payment_due: 'Требуется оплата',
      low_balance: 'Низкий баланс',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Уведомления о платежах
            </CardTitle>
            <CardDescription>
              {notifications?.length || 0} активных уведомлений
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => createNotifications.mutate()}
            disabled={createNotifications.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${createNotifications.isPending ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!notifications || notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-600" />
            <p>Нет активных уведомлений</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {notifications.map((notification: any) => (
                <Card key={notification.id} className={notification.is_sent ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getNotificationVariant(notification.notification_type)}>
                            {getNotificationLabel(notification.notification_type)}
                          </Badge>
                          {notification.is_sent && (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Отправлено
                            </Badge>
                          )}
                        </div>
                        
                        <div>
                          <p className="font-medium">
                            {notification.students?.first_name} {notification.students?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Баланс: {notification.balance_hours} ак. часов
                          </p>
                          {notification.estimated_days_left !== null && (
                            <p className="text-sm text-muted-foreground">
                              Примерно на {notification.estimated_days_left} дней
                            </p>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.notification_date).toLocaleDateString('ru-RU')}
                        </p>
                      </div>

                      {!notification.is_sent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markSent.mutate(notification.id)}
                          disabled={markSent.isPending}
                          className="gap-2 shrink-0"
                        >
                          <Send className="h-4 w-4" />
                          Отправить
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
