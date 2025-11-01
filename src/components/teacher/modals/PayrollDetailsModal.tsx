import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, TrendingUp, Clock, DollarSign, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PayrollDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
}

export const PayrollDetailsModal = ({ open, onOpenChange, teacherId }: PayrollDetailsModalProps) => {
  // Получаем данные по текущему месяцу
  const currentMonth = format(new Date(), 'yyyy-MM-01');
  
  const { data: currentMonthData } = useQuery({
    queryKey: ['payroll-current', teacherId, currentMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from('payroll_monthly')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('month', currentMonth)
        .maybeSingle();

      return data || { lessons: 0, hours: 0, amount: 0 };
    },
    enabled: open,
  });

  // Получаем историю (последние 12 месяцев)
  const { data: history = [] } = useQuery({
    queryKey: ['payroll-history', teacherId],
    queryFn: async () => {
      const { data } = await supabase
        .from('payroll_monthly')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('month', { ascending: false })
        .limit(12);

      return data || [];
    },
    enabled: open,
  });

  const handleExportCSV = () => {
    const csv = [
      ['Месяц', 'Уроков', 'Часов', 'Сумма'].join(','),
      ...history.map((row: any) => [
        format(new Date(row.month), 'LLLL yyyy', { locale: ru }),
        row.lessons,
        row.hours,
        row.amount,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payroll_${teacherId}_${format(new Date(), 'yyyy-MM')}.csv`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Детализация зарплаты
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Текущий месяц */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {format(new Date(), 'LLLL yyyy', { locale: ru })}
              </h3>
              <span className="text-xs text-muted-foreground">Текущий период</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Уроков</span>
                </div>
                <div className="text-2xl font-bold">{currentMonthData?.lessons || 0}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Часов</span>
                </div>
                <div className="text-2xl font-bold">{currentMonthData?.hours || 0}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Сумма</span>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {(currentMonthData?.amount || 0).toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>
          </div>

          {/* История */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">История расчётов</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Экспорт CSV
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="divide-y">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Нет данных за предыдущие периоды
                  </div>
                ) : (
                  history.map((row: any) => (
                    <div key={row.month} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {format(new Date(row.month), 'LLLL yyyy', { locale: ru })}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {row.lessons} уроков • {row.hours} часов
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {row.amount.toLocaleString('ru-RU')} ₽
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Информация */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Примечание:</strong> Данные обновляются автоматически после проведения уроков. 
              Итоговая сумма рассчитывается на основе ваших ставок и фактически проведённых академических часов.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};