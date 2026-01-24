import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/typedClient";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, History, Calendar, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LessonHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string | null;
}

interface HistoryRecord {
  id: string;
  changed_at: string;
  changed_by: string;
  change_type: string;
  changes: any; // Json from Supabase
  applied_from_date?: string;
  applied_to_date?: string;
  notes?: string;
  user_name?: string;
}

export function LessonHistoryModal({ open, onOpenChange, lessonId }: LessonHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    if (open && lessonId) {
      loadHistory();
    }
  }, [open, lessonId]);

  const loadHistory = async () => {
    if (!lessonId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('individual_lesson_history')
        .select(`
          id,
          changed_at,
          changed_by,
          change_type,
          changes,
          applied_from_date,
          applied_to_date,
          notes
        `)
        .eq('lesson_id', lessonId)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      // Получаем имена пользователей
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(h => h.changed_by).filter(Boolean))];
        const { data: users } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        const usersMap = new Map(users?.map(u => [u.id, `${u.first_name || ''} ${u.last_name || ''}`.trim()]) || []);

        setHistory(data.map(h => ({
          ...h,
          user_name: h.changed_by ? usersMap.get(h.changed_by) || 'Неизвестно' : 'Система'
        })));
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Error loading lesson history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getChangeLabel = (change: any) => {
    return change.label || change.field;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            История изменений расписания
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Нет истории изменений</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  {/* Заголовок записи */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(record.changed_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{record.user_name}</span>
                    </div>
                  </div>

                  {/* Период применения изменений */}
                  {record.applied_from_date && (
                    <div className="mb-3 text-sm text-primary font-medium">
                      Применено к занятиям:{' '}
                      {format(new Date(record.applied_from_date), 'dd.MM.yyyy', { locale: ru })}
                      {record.applied_to_date && (
                        <> - {format(new Date(record.applied_to_date), 'dd.MM.yyyy', { locale: ru })}</>
                      )}
                    </div>
                  )}

                  {/* Список изменений */}
                  <div className="space-y-2">
                    {Array.isArray(record.changes) && record.changes.map((change: any, idx: number) => (
                      <div key={idx} className="flex flex-col gap-1 text-sm">
                        <div className="font-medium">{getChangeLabel(change)}:</div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-muted-foreground line-through">
                            {change.old_value || '—'}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-green-600 font-medium">
                            {change.new_value || '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Примечание */}
                  {record.notes && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      {record.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}