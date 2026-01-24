import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { History, Search } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  old_value: any;
  new_value: any;
  changed_by: string | null;
  created_at: string;
}

export const AuditLogViewer = () => {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-log', entityTypeFilter, eventTypeFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (entityTypeFilter !== 'all') {
        query = query.eq('aggregate_type', entityTypeFilter);
      }

      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }

      if (searchQuery) {
        query = query.or(`aggregate_id.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getEventBadgeVariant = (eventType: string) => {
    if (eventType.includes('create')) return 'default';
    if (eventType.includes('update') || eventType.includes('status_change')) return 'secondary';
    if (eventType.includes('delete') || eventType.includes('cancel')) return 'destructive';
    if (eventType.includes('compensate') || eventType.includes('revert')) return 'outline';
    return 'default';
  };

  const formatValue = (value: any) => {
    if (!value) return '-';
    if (typeof value === 'object') {
      return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
    }
    return String(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Журнал аудита
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по ID сущности..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Тип сущности" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="payment">Платежи</SelectItem>
              <SelectItem value="lesson_session">Занятия</SelectItem>
              <SelectItem value="enrollment">Зачисления</SelectItem>
              <SelectItem value="lead">Лиды</SelectItem>
              <SelectItem value="invoice">Счета</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Тип события" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все события</SelectItem>
              <SelectItem value="status_change">Смена статуса</SelectItem>
              <SelectItem value="create">Создание</SelectItem>
              <SelectItem value="update">Обновление</SelectItem>
              <SelectItem value="delete">Удаление</SelectItem>
              <SelectItem value="sessions_reverted">Откат занятий</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[600px]">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Время</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Событие</TableHead>
                  <TableHead>ID сущности</TableHead>
                  <TableHead>Старые значения</TableHead>
                  <TableHead>Новые значения</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.aggregate_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEventBadgeVariant(log.event_type)}>
                        {log.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.aggregate_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-xs overflow-auto">
                      {formatValue(log.old_value)}
                    </TableCell>
                    <TableCell className="max-w-xs overflow-auto">
                      {formatValue(log.new_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
