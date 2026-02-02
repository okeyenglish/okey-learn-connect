import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  MessageSquare,
  PhoneOutgoing,
  PhoneIncoming,
  PhoneMissed,
  ListPlus,
  CheckCircle,
  Receipt,
  ArrowRightLeft,
  UserPlus,
  Users,
  Activity,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { StaffActivityLog, ACTIVITY_TYPE_CONFIG, ActivityType } from '@/hooks/useStaffActivityLog';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  PhoneOutgoing,
  PhoneIncoming,
  PhoneMissed,
  ListPlus,
  CheckCircle,
  Receipt,
  ArrowRightLeft,
  UserPlus,
  Users,
};

interface StaffActivityItemProps {
  activity: StaffActivityLog;
  onClick?: () => void;
}

export function StaffActivityItem({ activity, onClick }: StaffActivityItemProps) {
  const config = ACTIVITY_TYPE_CONFIG[activity.action_type as ActivityType];
  const IconComponent = config ? iconMap[config.icon] || Activity : Activity;
  
  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDetails = () => {
    const details = activity.details as Record<string, unknown>;
    
    if (activity.action_type === 'lead_status_changed' && details) {
      return `${details.old_status || '?'} → ${details.new_status || '?'}`;
    }
    
    if (activity.action_type === 'call_made' || activity.action_type === 'call_received') {
      if (details?.duration) {
        const duration = Number(details.duration);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `(${minutes}:${seconds.toString().padStart(2, '0')})`;
      }
    }
    
    return null;
  };

  const detailsText = formatDetails();

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors',
        'hover:bg-muted/50',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Аватар сотрудника */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(activity.user_name)}
        </AvatarFallback>
      </Avatar>

      {/* Контент */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {activity.user_name || 'Сотрудник'}
          </span>
          {activity.user_branch && (
            <span className="text-xs text-muted-foreground">
              • {activity.user_branch}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 mt-0.5">
          <IconComponent className={cn('h-4 w-4', config?.color || 'text-muted-foreground')} />
          <span className="text-sm text-muted-foreground">
            {activity.action_label}
          </span>
          {activity.target_name && (
            <span className="text-sm font-medium truncate">
              {activity.target_name}
            </span>
          )}
          {detailsText && (
            <span className="text-xs text-muted-foreground">
              {detailsText}
            </span>
          )}
        </div>
      </div>

      {/* Время */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(activity.created_at), {
          addSuffix: false,
          locale: ru,
        })}
      </span>
    </div>
  );
}
