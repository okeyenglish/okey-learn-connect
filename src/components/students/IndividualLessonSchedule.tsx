import { cn } from '@/lib/utils';
import { format, addDays, isBefore, isAfter, startOfDay, isPast, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { IndividualLessonStatusModal } from './IndividualLessonStatusModal';
import { supabase } from '@/integrations/supabase/client';

interface IndividualLessonScheduleProps {
  lessonId?: string;
  scheduleDays?: string[];
  scheduleTime?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  className?: string;
}

interface LessonSession {
  lesson_date: string;
  status: string;
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
  lessonId,
  scheduleDays, 
  scheduleTime, 
  periodStart,
  periodEnd,
  className 
}: IndividualLessonScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lessonSessions, setLessonSessions] = useState<Record<string, LessonSession>>({});

  useEffect(() => {
    if (lessonId) {
      loadLessonSessions();
    }
  }, [lessonId]);

  const loadLessonSessions = async () => {
    if (!lessonId) return;
    
    try {
      const { data, error } = await supabase
        .from('individual_lesson_sessions')
        .select('lesson_date, status')
        .eq('individual_lesson_id', lessonId);

      if (error) throw error;

      const sessionsMap: Record<string, LessonSession> = {};
      data?.forEach(session => {
        sessionsMap[session.lesson_date] = session;
      });
      setLessonSessions(sessionsMap);
    } catch (error) {
      console.error('Error loading lesson sessions:', error);
    }
  };

  const handleStatusUpdated = () => {
    loadLessonSessions();
  };

  if (!scheduleDays || scheduleDays.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Расписание не указано
      </div>
    );
  }

  const handleDateClick = (date: Date, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const getLessonColor = (date: Date, status?: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const session = lessonSessions[dateStr];
    
    // Если есть статус занятия
    if (session?.status) {
      switch (session.status) {
        case 'cancelled':
          return 'bg-gray-900 text-white border-gray-900'; // Черный - отменено
        case 'free':
          return 'bg-yellow-500 text-white border-yellow-500'; // Желтый - бесплатное
        case 'attended':
        case 'partially_paid':
        case 'paid_absence':
        case 'partially_paid_absence':
          return 'bg-green-600 text-white border-green-600'; // Зеленый - состоялось/оплачено
        default:
          break;
      }
    }
    
    // Если статуса нет, смотрим на дату
    const now = new Date();
    if (isPast(date) || isToday(date)) {
      return 'bg-green-600 text-white border-green-600'; // Зеленый - дата прошла
    }
    
    return 'bg-gray-400 text-white border-gray-400'; // Серый - запланировано
  };

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
    <>
      <div
        className={cn("flex items-center gap-2", className)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1 flex-wrap">
          {lessonDates.map((date, index) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const colorClass = getLessonColor(date, lessonSessions[dateStr]?.status);
            
            return (
              <button
                key={index}
                onClick={(e) => handleDateClick(date, e)}
                className={cn(
                  "h-8 px-2 rounded border flex items-center justify-center hover:opacity-80 transition-all cursor-pointer",
                  colorClass
                )}
              >
                <span className="text-xs font-medium whitespace-nowrap">
                  {format(date, 'dd.MM', { locale: ru })}
                </span>
              </button>
            );
          })}
        </div>
        {scheduleTime && (
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {scheduleTime}
          </div>
        )}
      </div>

      <IndividualLessonStatusModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={selectedDate}
        scheduleTime={scheduleTime}
        lessonId={lessonId}
        onStatusUpdated={handleStatusUpdated}
      />
    </>
  );
}
