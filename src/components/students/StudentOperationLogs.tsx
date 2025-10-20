import { useStudentOperationLogs } from '@/hooks/useStudentOperationLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Clock, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface StudentOperationLogsProps {
  studentId: string;
}

const operationTypeLabels: Record<string, string> = {
  created: 'Создан',
  updated: 'Обновлён',
  status_changed: 'Смена статуса',
  enrolled_to_group: 'Зачислен в группу',
  expelled_from_group: 'Отчислен из группы',
  transferred: 'Переведён',
  archived: 'Архивирован',
  restored: 'Восстановлен',
  payment_added: 'Добавлена оплата',
  lk_access_granted: 'ЛК активирован',
  lk_access_revoked: 'ЛК деактивирован',
};

const operationTypeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  created: 'default',
  updated: 'secondary',
  status_changed: 'outline',
  enrolled_to_group: 'default',
  expelled_from_group: 'destructive',
  transferred: 'secondary',
  archived: 'destructive',
  restored: 'default',
  payment_added: 'default',
  lk_access_granted: 'default',
  lk_access_revoked: 'destructive',
};

export function StudentOperationLogs({ studentId }: StudentOperationLogsProps) {
  const { data: logs, isLoading } = useStudentOperationLogs(studentId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Журнал операций</CardTitle>
          <CardDescription>Детальный лог всех операций</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Журнал операций пуст
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Журнал операций</CardTitle>
        <CardDescription>Детальный лог всех операций (последние 100)</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={operationTypeColors[log.operation_type] || 'default'}>
                        {operationTypeLabels[log.operation_type] || log.operation_type}
                      </Badge>
                    </div>
                    
                    {log.notes && (
                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-muted-foreground">{log.notes}</p>
                      </div>
                    )}
                    
                    {(log.old_value || log.new_value) && (
                      <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
                        {log.old_value && Object.keys(log.old_value).length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Предыдущие значения: </span>
                            <code className="text-xs bg-background px-1 rounded">
                              {JSON.stringify(log.old_value, null, 2)}
                            </code>
                          </div>
                        )}
                        {log.new_value && Object.keys(log.new_value).length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Новые значения: </span>
                            <code className="text-xs bg-background px-1 rounded">
                              {JSON.stringify(log.new_value, null, 2)}
                            </code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(log.performed_at), 'dd MMMM yyyy, HH:mm:ss', { locale: ru })}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {log.performer 
                      ? `${log.performer.first_name || ''} ${log.performer.last_name || ''}`.trim() || log.performer.email
                      : 'Система'}
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
