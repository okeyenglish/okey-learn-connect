import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface HistoryEvent {
  id: string;
  event_type: string;
  old_value?: any;
  new_value?: any;
  changed_at: string;
  changed_by_name?: string;
  description?: string;
}

interface ScheduleHistoryModalProps {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScheduleHistoryModal = ({ session, open, onOpenChange }: ScheduleHistoryModalProps) => {
  // В реальном приложении здесь был бы запрос к базе данных
  // для получения истории изменений занятия
  const mockHistory: HistoryEvent[] = [
    {
      id: '1',
      event_type: 'created',
      new_value: { date: session?.lesson_date, time: session?.start_time },
      changed_at: session?.created_at || new Date().toISOString(),
      changed_by_name: 'Администратор',
      description: 'Занятие создано'
    },
    // Добавьте реальные данные истории здесь
  ];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return <Calendar className="h-4 w-4" />;
      case 'rescheduled':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <History className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'bg-info-100 text-info-600 border-info-600/20';
      case 'rescheduled':
        return 'bg-warning-100 text-warning-600 border-warning-600/20';
      case 'cancelled':
        return 'bg-danger-100 text-danger-600 border-danger-600/20';
      case 'completed':
        return 'bg-success-100 text-success-600 border-success-600/20';
      default:
        return 'bg-neutral-100 text-neutral-500 border-neutral-500/20';
    }
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      'created': 'Создано',
      'rescheduled': 'Перенесено',
      'cancelled': 'Отменено',
      'completed': 'Проведено',
      'updated': 'Обновлено'
    };
    return labels[eventType] || eventType;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-surface">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <History className="h-5 w-5 text-brand" />
            История изменений занятия
          </DialogTitle>
        </DialogHeader>

        {session && (
          <div className="bg-bg-soft p-3 rounded-lg border border-border/50 space-y-1 mb-4">
            <div className="font-medium text-text-primary">{session.learning_groups?.name || 'Группа'}</div>
            <div className="text-sm text-text-secondary">
              {format(new Date(session.lesson_date), 'd MMMM yyyy', { locale: ru })} в {session.start_time}
            </div>
          </div>
        )}

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {mockHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto mb-2 text-text-muted opacity-50" />
                <p className="text-text-secondary">История изменений пуста</p>
              </div>
            ) : (
              mockHistory.map((event, index) => (
                <div
                  key={event.id}
                  className="relative border-l-2 border-border/50 pl-4 pb-4 last:pb-0"
                >
                  <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-surface border-2 border-border/50 flex items-center justify-center">
                    {getEventIcon(event.event_type)}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={getEventColor(event.event_type)}
                      >
                        {getEventLabel(event.event_type)}
                      </Badge>
                      <div className="text-xs text-text-secondary">
                        {format(new Date(event.changed_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-sm text-text-primary">{event.description}</p>
                    )}

                    {event.changed_by_name && (
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <User className="h-3 w-3" />
                        {event.changed_by_name}
                      </div>
                    )}

                    {event.old_value && event.new_value && (
                      <div className="text-xs space-y-1 bg-bg-soft p-2 rounded border border-border/50">
                        <div className="flex gap-2">
                          <span className="text-text-secondary">Было:</span>
                          <span className="font-mono text-text-primary">
                            {JSON.stringify(event.old_value, null, 2)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-text-secondary">Стало:</span>
                          <span className="font-mono text-text-primary">
                            {JSON.stringify(event.new_value, null, 2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
