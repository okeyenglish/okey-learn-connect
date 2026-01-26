import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellOff, Check, AlertTriangle, TrendingDown, Phone } from "lucide-react";
import { useKpiNotifications, useMarkAllKpiNotificationsRead, useMarkKpiNotificationRead } from "@/hooks/useKpiNotifications";
import { KPI_NOTIFICATION_LABELS } from "@/types/kpi";

export const KpiNotificationsList = () => {
  const { data: notifications = [], isLoading } = useKpiNotifications();
  const markRead = useMarkKpiNotificationRead();
  const markAllRead = useMarkAllKpiNotificationsRead();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_score':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'low_calls':
        return <Phone className="h-4 w-4 text-orange-500" />;
      case 'low_answered_rate':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'low_score':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'low_calls':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low_answered_rate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-muted-foreground">Загрузка уведомлений...</div>
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
              Уведомления KPI
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Оповещения о нарушениях целевых показателей
            </CardDescription>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Прочитать все
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Уведомлений пока нет</p>
            <p className="text-sm">Здесь будут появляться оповещения о KPI</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`border rounded-lg p-4 transition-colors ${
                    !notification.is_read ? 'bg-muted/50 border-primary/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getNotificationBadgeColor(notification.notification_type)}`}
                          >
                            {KPI_NOTIFICATION_LABELS[notification.notification_type] || notification.notification_type}
                          </Badge>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm">{notification.message}</p>
                        {notification.current_value !== null && notification.threshold_value !== null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Текущее: {notification.current_value} / Порог: {notification.threshold_value}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), "dd MMM yyyy, HH:mm", { locale: ru })}
                        </p>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markRead.mutate(notification.id)}
                        disabled={markRead.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
