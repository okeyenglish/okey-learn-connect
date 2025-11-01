import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useTeacherSalaryStats } from '@/hooks/useTeacherSalary';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SalaryDetailsModal } from './SalaryDetailsModal';

interface TeacherSalaryWidgetProps {
  teacherId: string;
}

export const TeacherSalaryWidget = ({ teacherId }: TeacherSalaryWidgetProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  
  // Получаем данные за текущий месяц
  const now = new Date();
  const periodStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const periodEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  
  const { data: stats, isLoading } = useTeacherSalaryStats(teacherId, periodStart, periodEnd);
  
  const unpaidAmount = stats?.unpaid_amount || 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground hidden sm:inline">К выплате</span>
          <span className="text-sm font-semibold">
            {isLoading ? '...' : `${unpaidAmount.toLocaleString('ru-RU')} ₽`}
          </span>
        </div>
      </Button>

      <SalaryDetailsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        teacherId={teacherId}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
    </>
  );
};
