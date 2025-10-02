import { cn } from '@/lib/utils';

interface IndividualLessonScheduleProps {
  scheduleDays?: string[];
  scheduleTime?: string;
  className?: string;
}

const DAY_LABELS: Record<string, string> = {
  'monday': 'Пн',
  'tuesday': 'Вт',
  'wednesday': 'Ср',
  'thursday': 'Чт',
  'friday': 'Пт',
  'saturday': 'Сб',
  'sunday': 'Вс',
};

export function IndividualLessonSchedule({ 
  scheduleDays, 
  scheduleTime, 
  className 
}: IndividualLessonScheduleProps) {
  if (!scheduleDays || scheduleDays.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Расписание не указано
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1">
        {scheduleDays.map((day, index) => (
          <div
            key={index}
            className="h-8 w-8 rounded bg-primary/20 border border-primary/30 flex items-center justify-center"
          >
            <span className="text-xs font-medium text-primary">
              {DAY_LABELS[day.toLowerCase()] || day.substring(0, 2).toUpperCase()}
            </span>
          </div>
        ))}
      </div>
      {scheduleTime && (
        <div className="text-sm text-muted-foreground">
          {scheduleTime}
        </div>
      )}
    </div>
  );
}
