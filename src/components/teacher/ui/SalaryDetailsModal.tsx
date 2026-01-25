import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Book, DollarSign, TrendingUp } from 'lucide-react';
import { useTeacherSalaryStats, useTeacherRates } from '@/hooks/useTeacherSalary';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
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
      const { data, error } = await supabase
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

  const { data: rates, isLoading: ratesLoading } = useTeacherRates(teacherId);

  const unpaidAccruals = accruals || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Зарплата и начисления</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="accruals" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="accruals">Начисления</TabsTrigger>
            <TabsTrigger value="rates">Ставки</TabsTrigger>
          </TabsList>

          <TabsContent value="accruals" className="space-y-4">

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

            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>💡 Начисления за проведенные занятия. Администратор может выплатить зарплату в разделе "Финансы".</p>
            </div>
          </TabsContent>

          <TabsContent value="rates" className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              {ratesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
              ) : !rates || rates.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    Ставки не настроены. Обратитесь к администратору.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rates.map((rate: any) => (
                    <div
                      key={rate.id}
                      className="p-4 border rounded-lg bg-surface space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={rate.rate_type === 'personal' ? 'secondary' : 'default'}>
                            {rate.rate_type === 'personal' ? 'Индивидуальные' : 
                             rate.rate_type === 'branch' ? 'Групповые' : 
                             rate.rate_type === 'subject' ? 'По предмету' : 'Общая'}
                          </Badge>
                          {rate.is_active && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                              Активна
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {rate.rate_per_academic_hour.toLocaleString('ru-RU')} ₽
                          </div>
                          <div className="text-xs text-muted-foreground">за академический час</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {rate.branch && (
                          <div className="flex items-start gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-muted-foreground">Филиал</p>
                              <p className="font-medium">{rate.branch}</p>
                            </div>
                          </div>
                        )}
                        {rate.subject && (
                          <div className="flex items-start gap-2">
                            <Book className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-muted-foreground">Предмет</p>
                              <p className="font-medium">{rate.subject}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {rate.notes && (
                        <div className="text-sm text-muted-foreground pt-2 border-t">
                          <p>{rate.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Расчет зарплаты
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Зарплата рассчитывается автоматически по проведённым занятиям. 
                          Итоговая сумма зависит от количества академических часов и установленных ставок.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
