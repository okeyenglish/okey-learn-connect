import { cn } from '@/lib/utils';
import { format, addDays, isBefore, isAfter, startOfDay, isPast, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { IndividualLessonStatusModal } from './IndividualLessonStatusModal';
import { MarkAttendanceModal } from './MarkAttendanceModal';
import { AttendanceIndicator } from './AttendanceIndicator';
import { supabase } from '@/integrations/supabase/client';

interface IndividualLessonScheduleProps {
  lessonId?: string;
  scheduleDays?: string[];
  scheduleTime?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  className?: string;
  onRefresh?: () => void;
  refreshTrigger?: number;
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
  className,
  refreshTrigger
}: IndividualLessonScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lessonSessions, setLessonSessions] = useState<Record<string, LessonSession>>({});
  const [showAll, setShowAll] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState<Date | null>(null);

  useEffect(() => {
    if (lessonId) {
      loadLessonSessions();
    }
  }, [lessonId, refreshTrigger]);

  const loadLessonSessions = async () => {
    if (!lessonId) return;
    
    try {
      const { data, error } = await supabase
        .from('individual_lesson_sessions')
        .select('lesson_date, status, updated_at')
        .eq('individual_lesson_id', lessonId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const sessionsMap: Record<string, LessonSession> = {};
      data?.forEach(session => {
        if (!sessionsMap[session.lesson_date]) {
          sessionsMap[session.lesson_date] = { lesson_date: session.lesson_date, status: session.status };
        }
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
          return 'bg-black text-white border-black'; // Черный - отменено
        case 'rescheduled':
          return 'bg-orange-500 text-white border-orange-500'; // Оранжевый - перенесено
        case 'free':
          return 'bg-yellow-500 text-white border-yellow-500'; // Желтый - бесплатное
        case 'attended': // Оплаченное занятие (через payments)
        case 'partially_paid':
        case 'paid_absence':
        case 'partially_paid_absence':
          return 'bg-green-600 text-white border-green-600'; // Зеленый - оплачено
        case 'scheduled':
        case 'rescheduled_out':
        default:
          return 'bg-white text-gray-500 border-gray-300'; // Белый фон, серые цифры - не оплачено
      }
    }
    
    // Если статуса нет - не оплачено
    return 'bg-white text-gray-500 border-gray-300'; // Белый фон, серые цифры
  };

  // Generate lesson dates based on schedule days and include all sessions with custom statuses
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
    
    // Добавляем ВСЕ даты с сессиями (включая перенесенные, отмененные и т.д.)
    Object.keys(lessonSessions).forEach(dateStr => {
      const sessionDate = startOfDay(new Date(dateStr));
      // Добавляем только если даты еще нет в списке
      if (!dates.some(d => d.getTime() === sessionDate.getTime())) {
        dates.push(sessionDate);
      }
    });
    
    // Сортируем по дате
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    return dates; // Возвращаем все даты, лимит применим при рендере
  };

  const lessonDates = generateLessonDates();
  const displayedDates = showAll ? lessonDates : lessonDates.slice(0, 30);
  const hasMoreLessons = lessonDates.length > 30;

  const handleAttendanceClick = (date: Date, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAttendanceDate(date);
    setAttendanceModalOpen(true);
  };

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
          {displayedDates.map((date, index) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const colorClass = getLessonColor(date, lessonSessions[dateStr]?.status);
            
            return (
              <button
                key={index}
                onClick={(e) => handleDateClick(date, e)}
                className={cn(
                  "h-8 px-2 rounded border flex items-center justify-center hover:opacity-80 transition-all cursor-pointer relative",
                  colorClass
                )}
              >
                <span className="text-xs font-medium whitespace-nowrap">
                  {format(date, 'dd.MM', { locale: ru })}
                </span>
                <AttendanceIndicator
                  lessonDate={date}
                  lessonId={lessonId || ''}
                  sessionType="individual"
                  onClick={(e) => handleAttendanceClick(date, e)}
                />
              </button>
            );
          })}
          {!showAll && hasMoreLessons && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAll(true);
              }}
              className="h-8 px-3 rounded border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            >
              <span className="text-xs font-medium whitespace-nowrap">
                +{lessonDates.length - 30} еще
              </span>
            </button>
          )}
          {showAll && hasMoreLessons && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAll(false);
              }}
              className="h-8 px-3 rounded border border-muted-foreground bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
            >
              <span className="text-xs font-medium whitespace-nowrap">
                Скрыть
              </span>
            </button>
          )}
        </div>
      </div>

      <IndividualLessonStatusModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={selectedDate}
        scheduleTime={scheduleTime}
        lessonId={lessonId}
        onStatusUpdated={handleStatusUpdated}
      />

      {attendanceDate && lessonId && (
        <MarkAttendanceModal
          open={attendanceModalOpen}
          onOpenChange={setAttendanceModalOpen}
          lessonDate={attendanceDate}
          lessonId={lessonId}
          sessionType="individual"
          onMarked={loadLessonSessions}
        />
      )}
    </>
  );
}
