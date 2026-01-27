import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  Eye,
  MessageCircle,
  Mail,
  Smartphone,
  Filter,
  RefreshCw
} from 'lucide-react';
import { 
  useNotificationHistory, 
  useNotificationStats,
  type NotificationHistoryItem,
  type NotificationStatus,
  type NotificationChannel,
  type NotificationType,
  type RecipientType
} from '@/hooks/useNotificationHistory';

interface NotificationHistoryCardProps {
  recipientType?: RecipientType;
  recipientId?: string;
  studentId?: string;
  title?: string;
  description?: string;
  compact?: boolean;
}

const statusColors: Record<NotificationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  read: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<NotificationStatus, string> = {
  pending: 'Ожидает',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Ошибка',
  cancelled: 'Отменено',
};

const statusIcons: Record<NotificationStatus, typeof CheckCircle2> = {
  pending: Clock,
  sent: Send,
  delivered: CheckCircle2,
  read: Eye,
  failed: XCircle,
  cancelled: XCircle,
};

const channelIcons: Record<NotificationChannel, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  telegram: Send,
  max: MessageCircle,
  chatos: MessageCircle,
  email: Mail,
  push: Bell,
  sms: Smartphone,
};

const channelColors: Record<NotificationChannel, string> = {
  whatsapp: 'text-green-600',
  telegram: 'text-blue-500',
  max: 'text-purple-600',
  chatos: 'text-teal-600',
  email: 'text-orange-600',
  push: 'text-rose-600',
  sms: 'text-gray-600',
};

const typeLabels: Record<NotificationType, string> = {
  lesson_reminder: 'Напоминание о занятии',
  schedule_change: 'Изменение расписания',
  payment_reminder: 'Напоминание об оплате',
  homework: 'Домашнее задание',
  attendance: 'Посещаемость',
  custom: 'Сообщение',
  system: 'Системное',
};

export const NotificationHistoryCard = ({
  recipientType,
  recipientId,
  studentId,
  title = 'История уведомлений',
  description = 'Отправленные уведомления с статусами доставки',
  compact = false,
}: NotificationHistoryCardProps) => {
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | 'all'>('all');

  const { data: notifications, isLoading, refetch, isFetching } = useNotificationHistory({
    recipientType,
    recipientId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    channel: channelFilter === 'all' ? undefined : channelFilter,
    limit: compact ? 20 : 100,
  });

  const { data: stats } = useNotificationStats({
    recipientType,
    recipientId,
  });

  const renderNotificationItem = (notification: NotificationHistoryItem) => {
    const StatusIcon = statusIcons[notification.status];
    const ChannelIcon = channelIcons[notification.channel];

    return (
      <div 
        key={notification.id}
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-b-0"
      >
        <div className={`mt-0.5 ${channelColors[notification.channel]}`}>
          <ChannelIcon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{notification.recipient_name}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {typeLabels[notification.notification_type]}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {notification.message_text}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${statusColors[notification.status]}`}>
              <StatusIcon className="h-3 w-3" />
              {statusLabels[notification.status]}
            </span>
            
            {notification.sent_at && (
              <span>
                {format(new Date(notification.sent_at), 'dd MMM HH:mm', { locale: ru })}
              </span>
            )}
            
            {notification.status === 'failed' && notification.status_details && (
              <span className="text-red-600 truncate max-w-[150px]" title={notification.status_details}>
                {notification.status_details}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Stats */}
        {stats && !compact && (
          <div className="flex gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Всего:</span>
              <span className="font-medium">{stats.total}</span>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{stats.delivered}</span>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3.5 w-3.5" />
              <span>{stats.failed}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        {!compact && (
          <div className="flex gap-2 mt-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as NotificationStatus | 'all')}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="sent">Отправлено</SelectItem>
                <SelectItem value="delivered">Доставлено</SelectItem>
                <SelectItem value="read">Прочитано</SelectItem>
                <SelectItem value="failed">Ошибка</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as NotificationChannel | 'all')}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Канал" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все каналы</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="chatos">ChatOS</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {notifications && notifications.length > 0 ? (
          <ScrollArea className={compact ? 'h-[300px]' : 'h-[400px]'}>
            <div className="space-y-1">
              {notifications.map(renderNotificationItem)}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="h-10 w-10 opacity-50 mb-2" />
            <p className="text-sm">Нет уведомлений</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationHistoryCard;
