import { useState, useMemo } from 'react';
import { ClipboardList, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { ViewTaskModal } from './ViewTaskModal';

interface TaskNotificationMetadata {
  type?: string;
  action?: 'created' | 'completed' | 'cancelled';
  task_id?: string;
  task_title?: string;
  due_date?: string;
  responsible?: string;
}

interface TaskNotificationMessageProps {
  message: string;
  time: string;
  metadata?: TaskNotificationMetadata | null;
  clientId?: string;
}

export const TaskNotificationMessage = ({ 
  message, 
  time, 
  metadata,
  clientId 
}: TaskNotificationMessageProps) => {
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Parse task info from message text as fallback
  const taskInfo = useMemo(() => {
    if (metadata?.type === 'task_notification') {
      return {
        action: metadata.action || 'created',
        taskId: metadata.task_id,
        title: metadata.task_title || '',
        dueDate: metadata.due_date,
        responsible: metadata.responsible
      };
    }

    // Fallback: parse from message text
    let action: 'created' | 'completed' | 'cancelled' = 'created';
    if (message.includes('успешно завершена')) {
      action = 'completed';
    } else if (message.includes('отменена')) {
      action = 'cancelled';
    }

    // Extract task title from quotes
    const titleMatch = message.match(/"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : '';

    // Extract date
    const dateMatch = message.match(/на (\d{2}\.\d{2}\.\d{4})/);
    const dueDate = dateMatch ? dateMatch[1] : undefined;

    return {
      action,
      taskId: undefined,
      title,
      dueDate,
      responsible: undefined
    };
  }, [message, metadata]);

  const getActionConfig = () => {
    switch (taskInfo.action) {
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Задача выполнена',
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Задача отменена',
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      default:
        return {
          icon: ClipboardList,
          label: 'Задача создана',
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  const handleClick = () => {
    if (taskInfo.taskId) {
      setViewModalOpen(true);
    }
  };

  return (
    <>
      <div className="flex justify-center my-1.5">
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button
              onClick={handleClick}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                taskInfo.taskId 
                  ? 'cursor-pointer hover:bg-muted/60' 
                  : 'cursor-default'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
              <span className="text-muted-foreground/80 font-medium">{config.label}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground/50">{time}</span>
            </button>
          </HoverCardTrigger>
          <HoverCardContent 
            className="w-64 p-3" 
            side="top"
            align="center"
          >
            <div className="space-y-2">
              {taskInfo.title && (
                <div className="font-medium text-sm truncate">
                  {taskInfo.title}
                </div>
              )}
              
              {taskInfo.responsible && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{taskInfo.responsible}</span>
                </div>
              )}
              
              {taskInfo.dueDate && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{taskInfo.dueDate}</span>
                </div>
              )}
              
              {taskInfo.taskId && (
                <div className="text-xs text-primary mt-2">
                  Нажмите для подробностей
                </div>
              )}
              
              {!taskInfo.taskId && !taskInfo.title && (
                <div className="text-xs text-muted-foreground">
                  {message}
                </div>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      {taskInfo.taskId && (
        <ViewTaskModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          taskId={taskInfo.taskId}
        />
      )}
    </>
  );
};
