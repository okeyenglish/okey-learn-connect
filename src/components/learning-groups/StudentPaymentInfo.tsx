import { useStudentGroupPaymentStats } from "@/hooks/useStudentGroupPaymentStats";
import { Loader2 } from "lucide-react";

interface StudentPaymentInfoProps {
  studentId: string;
  groupId: string;
}

export const StudentPaymentInfo = ({ studentId, groupId }: StudentPaymentInfoProps) => {
  const { data: stats, isLoading } = useStudentGroupPaymentStats(studentId, groupId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Загрузка...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-sm text-muted-foreground">
        Данные недоступны
      </div>
    );
  }

  // 1 academic hour = 40 minutes
  const formatMinutesToAcademicHours = (minutes: number) => {
    const hours = minutes / 40;
    return hours.toFixed(1);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-1 text-sm">
      {/* Остаток */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-700">Остаток:</span>
        <span className="text-gray-900">
          {formatMinutesToAcademicHours(stats.remainingMinutes)} а.ч. / {formatMoney(stats.remainingAmount)}
        </span>
      </div>
      
      {/* Оплачено */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs font-medium">
          Оплачено:
        </span>
        <span className="text-gray-900">
          {formatMinutesToAcademicHours(stats.paidMinutes)} а.ч. / {formatMoney(stats.paidAmount)}
        </span>
      </div>
      
      {/* Задолженность (если есть) */}
      {stats.debtMinutes > 0 && (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">
            Задолженность:
          </span>
          <span className="text-red-900 font-semibold">
            {formatMinutesToAcademicHours(stats.debtMinutes)} а.ч. / {formatMoney(stats.debtAmount)}
          </span>
        </div>
      )}
      
      {/* Осталось оплатить (если нет долга) */}
      {stats.unpaidMinutes > 0 && stats.debtMinutes === 0 && (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium">
            Осталось оплатить:
          </span>
          <span className="text-gray-900">
            {formatMinutesToAcademicHours(stats.unpaidMinutes)} а.ч.
          </span>
        </div>
      )}
      
      {/* Курс (общая информация) */}
      <div className="text-xs text-muted-foreground">
        Курс: {formatMinutesToAcademicHours(stats.totalCourseMinutes)} а.ч.
      </div>
    </div>
  );
};
