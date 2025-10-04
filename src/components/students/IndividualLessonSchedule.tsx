import { cn } from '@/lib/utils';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { IndividualLessonStatusModal } from './IndividualLessonStatusModal';
import { MarkAttendanceModal } from './MarkAttendanceModal';
import { AttendanceIndicator } from './AttendanceIndicator';
import { supabase } from '@/integrations/supabase/client';
import { AdditionalLessonsList } from './AdditionalLessonsList';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  id?: string;
  lesson_date: string;
  status: string;
  payment_id?: string;
  is_additional?: boolean;
  notes?: string;
  duration?: number;
  paid_minutes?: number;
  payment_date?: string;
  payment_amount?: number;
  lessons_count?: number;
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
  const [showAdditionalLessons, setShowAdditionalLessons] = useState(false);
  const [additionalLessons, setAdditionalLessons] = useState<LessonSession[]>([]);

  useEffect(() => {
    if (lessonId) {
      loadLessonSessions();
      loadAdditionalLessons();
    }
  }, [lessonId, refreshTrigger]);

  const loadLessonSessions = async () => {
    if (!lessonId) return;
    
    try {
      const { data, error } = await supabase
        .from('individual_lesson_sessions')
        .select(`
          id, 
          lesson_date, 
          status, 
          payment_id, 
          is_additional, 
          notes, 
          duration, 
          paid_minutes, 
          updated_at,
          payments:payment_id (
            payment_date,
            amount,
            lessons_count
          )
        `)
        .eq('individual_lesson_id', lessonId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const sessionsMap: Record<string, LessonSession> = {};
      data?.forEach(session => {
        if (!sessionsMap[session.lesson_date]) {
          const payment = Array.isArray(session.payments) ? session.payments[0] : session.payments;
          sessionsMap[session.lesson_date] = { 
            id: session.id,
            lesson_date: session.lesson_date, 
            status: session.status,
            payment_id: session.payment_id,
            is_additional: session.is_additional,
            notes: session.notes,
            duration: session.duration,
            paid_minutes: session.paid_minutes || 0,
            payment_date: payment?.payment_date,
            payment_amount: payment?.amount,
            lessons_count: payment?.lessons_count
          };
        }
      });
      setLessonSessions(sessionsMap);
    } catch (error) {
      console.error('Error loading lesson sessions:', error);
    }
  };

  const loadAdditionalLessons = async () => {
    if (!lessonId) return;
    
    try {
      const { data, error } = await supabase
        .from('individual_lesson_sessions')
        .select('id, lesson_date, status, notes')
        .eq('individual_lesson_id', lessonId)
        .eq('is_additional', true)
        .order('lesson_date', { ascending: true });

      if (error) throw error;

      setAdditionalLessons(data || []);
    } catch (error) {
      console.error('Error loading additional lessons:', error);
    }
  };

  const handleStatusUpdated = () => {
    loadLessonSessions();
    loadAdditionalLessons();
  };

  const handleAdditionalLessonAdded = () => {
    loadLessonSessions();
    loadAdditionalLessons();
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

    // Сначала учитываем специальные статусы, они важнее оплаты
    if (session?.status) {
      switch (session.status) {
        case 'cancelled':
          return 'bg-black text-white border-black'; // Черный - отменено
        case 'rescheduled':
          return 'bg-orange-500 text-white border-orange-500'; // Оранжевый - перенесено
        case 'free':
          return 'bg-yellow-500 text-white border-yellow-500'; // Желтый - бесплатное
      }
    }

    // Проверяем частичную оплату
    const duration = session?.duration || 60;
    const paidMinutes = session?.paid_minutes || 0;
    
    if (paidMinutes > 0 && paidMinutes < duration) {
      // Частичная оплата - используем градиент
      const percentage = (paidMinutes / duration) * 100;
      return `partial-payment-${Math.round(percentage)}`;
    }

    // Полная оплата
    if (paidMinutes >= duration || session?.payment_id) {
      return 'bg-green-600 text-white border-green-600'; // Зеленый - оплачено
    }

    // По умолчанию — не оплачено
    return 'bg-white text-gray-500 border-gray-300'; // Белый фон, серые цифры
  };

  const getPaymentTooltip = (session?: LessonSession, lessonNumber?: number) => {
    if (!session) return null;
    
    const duration = session.duration || 60;
    const paidMinutes = session.paid_minutes || 0;
    const unpaidMinutes = duration - paidMinutes;

    let paymentInfo = '';
    if (session.payment_date && session.payment_amount && session.lessons_count) {
      const paymentDate = format(new Date(session.payment_date), 'dd.MM.yyyy', { locale: ru });
      const pricePerLesson = Math.round(session.payment_amount / session.lessons_count);
      paymentInfo = `\nОплата от ${paymentDate} (${session.payment_amount.toLocaleString('ru-RU')} ₽ за ${session.lessons_count} ${session.lessons_count === 1 ? 'занятие' : 'занятия'})`;
    }

    if (paidMinutes === 0) {
      return `Не оплачено: ${duration} мин`;
    } else if (paidMinutes >= duration) {
      return `Оплачено: ${duration} мин${paymentInfo}`;
    } else {
      return `Оплачено: ${paidMinutes} мин\nНе оплачено: ${unpaidMinutes} мин${paymentInfo}`;
    }
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
      <TooltipProvider>
        <div className={cn("space-y-3", className)}>
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1 flex-wrap">
            {displayedDates.map((date, index) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const session = lessonSessions[dateStr];
              const colorClass = getLessonColor(date, session?.status);
              const duration = session?.duration || 60;
              const paidMinutes = session?.paid_minutes || 0;
              const isPartialPayment = paidMinutes > 0 && paidMinutes < duration;
              const paymentPercentage = isPartialPayment ? (paidMinutes / duration) * 100 : 0;
              const lessonNumber = index + 1;
              
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => handleDateClick(date, e)}
                      className={cn(
                        "h-8 px-2 rounded border flex items-center justify-center hover:opacity-80 transition-all cursor-pointer relative overflow-hidden",
                        !isPartialPayment && colorClass
                      )}
                      style={isPartialPayment ? {
                        background: `linear-gradient(to right, rgb(22 163 74) ${paymentPercentage}%, rgb(243 244 246) ${paymentPercentage}%)`,
                        borderColor: 'rgb(209 213 219)',
                        color: paymentPercentage > 50 ? 'white' : 'rgb(107 114 128)'
                      } : undefined}
                    >
                      <span className="text-xs font-medium whitespace-nowrap relative z-10">
                        {format(date, 'dd.MM', { locale: ru })}
                      </span>
                      <AttendanceIndicator
                        lessonDate={date}
                        lessonId={lessonId || ''}
                        sessionType="individual"
                        onClick={(e) => handleAttendanceClick(date, e)}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <div className="font-semibold">Занятие №{lessonNumber} ({duration} мин.)</div>
                      <div className="text-muted-foreground">{format(date, 'dd MMMM yyyy', { locale: ru })}</div>
                      {session && (
                        <div className="whitespace-pre-line pt-1 border-t">
                          {getPaymentTooltip(session, lessonNumber)}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
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

        {additionalLessons.length > 0 && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdditionalLessons(!showAdditionalLessons)}
              className="w-full justify-between h-8 text-xs"
            >
              <span>Показать дополнительные занятия ({additionalLessons.length})</span>
              {showAdditionalLessons ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            {showAdditionalLessons && (
              <AdditionalLessonsList
                lessons={additionalLessons}
                onDelete={handleAdditionalLessonAdded}
                onEdit={(lesson) => {
                  setSelectedDate(new Date(lesson.lesson_date));
                  setIsModalOpen(true);
                }}
              />
            )}
          </div>
        )}
        </div>
      </TooltipProvider>

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
