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
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            История изменений занятия
          </DialogTitle>
        </DialogHeader>

        {session && (
          <div className="bg-muted p-3 rounded-lg space-y-1 mb-4">
            <div className="font-medium">{session.learning_groups?.name || 'Группа'}</div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(session.lesson_date), 'd MMMM yyyy', { locale: ru })} в {session.start_time}
            </div>
          </div>
        )}

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {mockHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>История изменений пуста</p>
              </div>
            ) : (
              mockHistory.map((event, index) => (
                <div
                  key={event.id}
                  className="relative border-l-2 border-border pl-4 pb-4 last:pb-0"
                >
                  <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-background border-2 border-border flex items-center justify-center">
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
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(event.changed_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-sm">{event.description}</p>
                    )}

                    {event.changed_by_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {event.changed_by_name}
                      </div>
                    )}

                    {event.old_value && event.new_value && (
                      <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Было:</span>
                          <span className="font-mono">
                            {JSON.stringify(event.old_value, null, 2)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Стало:</span>
                          <span className="font-mono">
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
