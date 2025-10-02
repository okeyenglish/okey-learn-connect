import { cn } from '@/lib/utils';
import { format, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

interface IndividualLessonScheduleProps {
  scheduleDays?: string[];
  scheduleTime?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  className?: string;
}

const DAY_MAP: Record<string, number> = {
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
  'sunday': 0,
};

export function IndividualLessonSchedule({ 
  scheduleDays, 
  scheduleTime, 
  periodStart,
  periodEnd,
  className 
}: IndividualLessonScheduleProps) {
  if (!scheduleDays || scheduleDays.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Расписание не указано
      </div>
    );
  }

  // Generate lesson dates based on schedule days
  const generateLessonDates = () => {
    if (!periodStart || !periodEnd) return [];
    
    const dates: Date[] = [];
    const start = startOfDay(new Date(periodStart));
    const end = startOfDay(new Date(periodEnd));
    const scheduleDayNumbers = scheduleDays.map(day => DAY_MAP[day.toLowerCase()]).filter(d => d !== undefined);
    
    let currentDate = start;
    while (isBefore(currentDate, end) || currentDate.getTime() === end.getTime()) {
      const dayOfWeek = currentDate.getDay();
      if (scheduleDayNumbers.includes(dayOfWeek)) {
        dates.push(new Date(currentDate));
      }
      currentDate = addDays(currentDate, 1);
    }
    
    return dates.slice(0, 20); // Limit to first 20 lessons
  };

  const lessonDates = generateLessonDates();

  if (lessonDates.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Нет запланированных занятий
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1 flex-wrap">
        {lessonDates.map((date, index) => (
          <div
            key={index}
            className="h-8 px-2 rounded bg-primary/20 border border-primary/30 flex items-center justify-center"
          >
            <span className="text-xs font-medium text-primary whitespace-nowrap">
              {format(date, 'dd.MM', { locale: ru })}
            </span>
          </div>
        ))}
      </div>
      {scheduleTime && (
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {scheduleTime}
        </div>
      )}
    </div>
  );
}
