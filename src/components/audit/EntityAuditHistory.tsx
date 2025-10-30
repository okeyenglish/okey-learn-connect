import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { History, ArrowRight } from 'lucide-react';

interface EntityAuditHistoryProps {
  entityType: string;
  entityId: string;
  title?: string;
}

interface AuditEntry {
  id: string;
  event_type: string;
  old_value: any;
  new_value: any;
  created_at: string;
  changed_by: string | null;
}

export const EntityAuditHistory = ({ 
  entityType, 
  entityId, 
  title 
}: EntityAuditHistoryProps) => {
  const { data: auditHistory, isLoading } = useQuery({
    queryKey: ['audit-history', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('aggregate_type', entityType)
        .eq('aggregate_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AuditEntry[];
    },
    enabled: !!entityId,
  });

  const getEventBadgeVariant = (eventType: string) => {
    if (eventType === 'status_change') return 'default';
    if (eventType === 'create') return 'secondary';
    if (eventType === 'update') return 'outline';
    if (eventType === 'delete') return 'destructive';
    return 'default';
  };

  const renderStatusChange = (oldValue: any, newValue: any) => {
    if (!oldValue || !newValue) return null;
    
    const oldStatus = oldValue.status;
    const newStatus = newValue.status;
    
    if (!oldStatus || !newStatus) return null;

    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">{oldStatus}</Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant="default">{newStatus}</Badge>
      </div>
    );
  };

  const renderValueChange = (entry: AuditEntry) => {
    if (entry.event_type === 'status_change') {
      return renderStatusChange(entry.old_value, entry.new_value);
    }

    return (
      <div className="space-y-2 text-sm">
        {entry.old_value && (
          <div>
            <span className="font-medium text-muted-foreground">Было:</span>
            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
              {JSON.stringify(entry.old_value, null, 2)}
            </pre>
          </div>
        )}
        {entry.new_value && (
          <div>
            <span className="font-medium text-muted-foreground">Стало:</span>
            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
              {JSON.stringify(entry.new_value, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {title || 'История изменений'}
        </CardTitle>
        <CardDescription>
          История всех изменений для {entityType} ({entityId.slice(0, 8)}...)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : auditHistory && auditHistory.length > 0 ? (
            <div className="space-y-4">
              {auditHistory.map((entry) => (
                <div 
                  key={entry.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Badge variant={getEventBadgeVariant(entry.event_type)}>
                        {entry.event_type}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}
                      </p>
                    </div>
                  </div>
                  {renderValueChange(entry)}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>История изменений пуста</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
