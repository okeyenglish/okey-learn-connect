import { useStudentHistory } from '@/hooks/useStudentHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface StudentHistoryTimelineProps {
  studentId: string;
}

const eventCategoryIcons: Record<string, string> = {
  personal: '👤',
  academic: '📚',
  financial: '💰',
  enrollment: '🎓',
  communication: '💬',
  system: '⚙️',
};

const eventTypeLabels: Record<string, string> = {
  created: 'Создание',
  updated: 'Обновление',
  status_changed: 'Смена статуса',
  enrolled: 'Зачисление',
  expelled: 'Отчисление',
  payment: 'Оплата',
  note_added: 'Добавлена заметка',
  parent_added: 'Добавлен родитель',
  payer_added: 'Добавлен плательщик',
};

export function StudentHistoryTimeline({ studentId }: StudentHistoryTimelineProps) {
  const { data: history, isLoading } = useStudentHistory(studentId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>История изменений</CardTitle>
          <CardDescription>Хронология всех изменений</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            История изменений пуста
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>История изменений</CardTitle>
        <CardDescription>Хронология всех изменений</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {history.map((event) => (
              <div
                key={event.id}
                className="relative pl-8 pb-4 border-l-2 border-border last:border-l-0"
              >
                <div className="absolute left-0 top-0 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-primary">
                  <span className="text-xs">
                    {eventCategoryIcons[event.event_category] || '📝'}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">
                      {event.title}
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {eventTypeLabels[event.event_type] || event.event_type}
                    </span>
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                  
                  {(event.old_value || event.new_value) && (
                    <div className="text-xs space-y-1 mt-2">
                      {event.old_value && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Было:</span>
                          <span className="text-destructive line-through">
                            {typeof event.old_value === 'object' 
                              ? JSON.stringify(event.old_value) 
                              : String(event.old_value)}
                          </span>
                        </div>
                      )}
                      {event.new_value && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Стало:</span>
                          <span className="text-primary font-medium">
                            {typeof event.new_value === 'object' 
                              ? JSON.stringify(event.new_value) 
                              : String(event.new_value)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(event.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {event.user_name || 'Система'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
