import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Book, DollarSign } from 'lucide-react';
import { useTeacherSalaryStats } from '@/hooks/useTeacherSalary';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface SalaryDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  periodStart: string;
  periodEnd: string;
}

export const SalaryDetailsModal = ({
  open,
  onOpenChange,
  teacherId,
  periodStart,
  periodEnd,
}: SalaryDetailsModalProps) => {
  // Получаем детальную информацию о начислениях через RPC
  const { data: accruals, isLoading: accrualsLoading } = useQuery({
    queryKey: ['teacher-accruals-details', teacherId, periodStart, periodEnd],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('teacher_salary_accruals')
        .select(`
          *,
          lesson_sessions (
            session_date,
            duration_minutes,
            group_courses (
              subject,
              groups (
                name
              )
            )
          ),
          individual_lesson_sessions (
            session_date,
            duration_minutes,
            individual_lessons (
              subject
            )
          )
        `)
        .eq('teacher_id', teacherId)
        .gte('earning_date', periodStart)
        .lte('earning_date', periodEnd)
        .eq('status', 'unpaid')
        .order('earning_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open && !!teacherId,
  });

  const { data: stats } = useTeacherSalaryStats(
    teacherId,
    periodStart,
    periodEnd
  );

  const unpaidAccruals = accruals || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Детали начислений</DialogTitle>
        </DialogHeader>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 border rounded-lg bg-surface">
            <p className="text-xs text-muted-foreground mb-1">Всего занятий</p>
            <p className="text-2xl font-bold">{stats?.total_lessons || 0}</p>
          </div>
          <div className="p-4 border rounded-lg bg-surface">
            <p className="text-xs text-muted-foreground mb-1">Часов</p>
            <p className="text-2xl font-bold">{stats?.total_hours?.toFixed(1) || 0}</p>
          </div>
          <div className="p-4 border rounded-lg bg-surface">
            <p className="text-xs text-muted-foreground mb-1">Начислено</p>
            <p className="text-2xl font-bold text-green-600">
              {stats?.total_amount?.toLocaleString('ru-RU') || 0} ₽
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-surface">
            <p className="text-xs text-muted-foreground mb-1">К выплате</p>
            <p className="text-2xl font-bold text-primary">
              {stats?.unpaid_amount?.toLocaleString('ru-RU') || 0} ₽
            </p>
          </div>
        </div>

        {/* Список начислений */}
        <div>
          <h3 className="font-semibold mb-3">Невыплаченные начисления</h3>
          <ScrollArea className="h-[300px] pr-4">
            {accrualsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
            ) : unpaidAccruals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Нет невыплаченных начислений
              </div>
            ) : (
              <div className="space-y-3">
                {unpaidAccruals.map((accrual: any) => {
                  const isGroup = !!accrual.lesson_session_id;
                  const sessionData = isGroup 
                    ? accrual.lesson_sessions 
                    : accrual.individual_lesson_sessions;
                  
                  const date = sessionData?.session_date || accrual.earning_date;
                  const duration = sessionData?.duration_minutes || (accrual.academic_hours * 40);
                  const subject = isGroup 
                    ? sessionData?.group_courses?.subject 
                    : sessionData?.individual_lessons?.subject;
                  const groupName = isGroup ? sessionData?.group_courses?.groups?.name : null;

                  return (
                    <div
                      key={accrual.id}
                      className="p-4 border rounded-lg bg-surface hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(date), 'dd MMMM yyyy', { locale: ru })}
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {isGroup ? 'Группа' : 'Индивидуальное'}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{accrual.amount} ₽</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{duration} мин ({accrual.academic_hours} ак.ч.)</span>
                        </div>
                        {subject && (
                          <div className="flex items-center gap-1">
                            <Book className="h-3 w-3" />
                            <span>{subject}</span>
                          </div>
                        )}
                        {groupName && (
                          <div className="flex items-center gap-1">
                            <span>Группа: {groupName}</span>
                          </div>
                        )}
                      </div>

                      {accrual.notes && (
                        <div className="mt-2 text-sm text-muted-foreground italic">
                          {accrual.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p>💡 Начисления за проведенные занятия. Администратор может выплатить зарплату в разделе "Финансы".</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
