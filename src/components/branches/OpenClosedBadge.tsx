import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { WorkingHours, DaySchedule } from '@/components/settings/WorkingHoursEditor';

interface OpenClosedBadgeProps {
  workingHours: WorkingHours | null;
  className?: string;
  showTime?: boolean;
}

const DAYS_MAP: Record<number, keyof WorkingHours> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export const getOpenStatus = (workingHours: WorkingHours | null): { 
  isOpen: boolean; 
  closesAt?: string; 
  opensAt?: string;
  nextOpenDay?: string;
} => {
  if (!workingHours) {
    return { isOpen: false };
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentDayKey = DAYS_MAP[currentDay];
  const todaySchedule: DaySchedule | undefined = workingHours[currentDayKey];
  
  // Формируем текущее время в формате HH:mm
  const currentTime = now.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  // Если сегодня открыто
  if (todaySchedule?.isOpen) {
    const openTime = todaySchedule.open;
    const closeTime = todaySchedule.close;

    // Проверяем, находимся ли мы в рабочем диапазоне
    if (currentTime >= openTime && currentTime < closeTime) {
      return { isOpen: true, closesAt: closeTime };
    }

    // Ещё не открылись сегодня
    if (currentTime < openTime) {
      return { isOpen: false, opensAt: openTime };
    }
  }

  // Уже закрыто сегодня или выходной - ищем следующий рабочий день
  const daysOfWeek: (keyof WorkingHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayLabels: Record<keyof WorkingHours, string> = {
    monday: 'Пн',
    tuesday: 'Вт',
    wednesday: 'Ср',
    thursday: 'Чт',
    friday: 'Пт',
    saturday: 'Сб',
    sunday: 'Вс',
  };

  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDay + i) % 7;
    const nextDayKey = DAYS_MAP[nextDayIndex];
    const nextDaySchedule = workingHours[nextDayKey];
    
    if (nextDaySchedule?.isOpen) {
      if (i === 1) {
        return { isOpen: false, opensAt: nextDaySchedule.open, nextOpenDay: 'завтра' };
      }
      return { 
        isOpen: false, 
        opensAt: nextDaySchedule.open, 
        nextOpenDay: dayLabels[nextDayKey]
      };
    }
  }

  return { isOpen: false };
};

export const OpenClosedBadge = ({ workingHours, className = '', showTime = true }: OpenClosedBadgeProps) => {
  const status = useMemo(() => getOpenStatus(workingHours), [workingHours]);

  if (!workingHours) {
    return null;
  }

  if (status.isOpen) {
    return (
      <Badge 
        variant="default" 
        className={`bg-green-500 hover:bg-green-600 text-white ${className}`}
      >
        Открыто{showTime && status.closesAt && ` до ${status.closesAt}`}
      </Badge>
    );
  }

  const closedText = showTime && status.opensAt 
    ? status.nextOpenDay 
      ? `Откроется ${status.nextOpenDay} в ${status.opensAt}`
      : `Откроется в ${status.opensAt}`
    : 'Закрыто';

  return (
    <Badge 
      variant="secondary" 
      className={`bg-muted text-muted-foreground ${className}`}
    >
      {closedText}
    </Badge>
  );
};

export default OpenClosedBadge;
