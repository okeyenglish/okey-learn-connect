import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AttendanceIndicator } from './AttendanceIndicator';
import { MarkAttendanceModal } from './MarkAttendanceModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface LessonSession {
  id: string;
  lessonDate: string;
  status: string;
  lessonNumber?: number;
  duration?: number;
  paid_minutes?: number;
  payment_id?: string;
  payment_date?: string;
  payment_amount?: number;
  lessons_count?: number;
  lesson_time?: string;
}

interface LessonScheduleStripProps {
  sessions: LessonSession[];
  className?: string;
  groupId?: string;
}

export function LessonScheduleStrip({ sessions, className, groupId }: LessonScheduleStripProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const visibleCount = 50;
  
  // Normalize incoming sessions to a consistent shape (camelCase),
  // accepting both camelCase and snake_case sources
  const calculateDurationFromTimes = (start?: string, end?: string): number | undefined => {
    if (!start || !end) return undefined;
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return eh * 60 + em - (sh * 60 + sm);
    } catch {
      return undefined;
    }
  };

  const normalizedSessions: LessonSession[] = sessions
    .map((s: any) => {
      const lessonDate = s.lessonDate || s.lesson_date || s.date;
      const startTime = s.start_time as string | undefined;
      const endTime = s.end_time as string | undefined;
      const duration = s.duration ?? calculateDurationFromTimes(startTime, endTime);
      const lesson_time = s.lesson_time ?? (startTime && endTime ? `${startTime}-${endTime}` : undefined);
      return lessonDate
        ? {
            id: s.id,
            lessonDate,
            status: s.status || s.session_status || 'scheduled',
            lessonNumber: s.lessonNumber ?? s.lesson_number,
            duration,
            paid_minutes: s.paid_minutes,
            payment_id: s.payment_id,
            payment_date: s.payment_date,
            payment_amount: s.payment_amount,
            lessons_count: s.lessons_count,
            lesson_time,
          }
        : null;
    })
    .filter(Boolean) as LessonSession[];
  
  const sortedSessions = [...normalizedSessions].sort((a, b) =>
    new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime()
  );

  const visibleSessions = sortedSessions.slice(startIndex, startIndex + visibleCount);
  const canGoBack = startIndex > 0;
  const canGoForward = startIndex + visibleCount < sortedSessions.length;
  
  const getLessonColor = (session: LessonSession) => {
    // Сначала учитываем специальные статусы, они важнее оплаты
    if (session.status) {
      switch (session.status.toLowerCase()) {
        case 'cancelled':
          return 'bg-black text-white border-black';
        case 'rescheduled':
          return 'bg-orange-500 text-white border-orange-500';
        case 'free':
          return 'bg-yellow-500 text-white border-yellow-500';
      }
    }

    // Проверяем частичную оплату
    const duration = session.duration || 60;
    const paidMinutes = session.paid_minutes || 0;
    
    if (paidMinutes > 0 && paidMinutes < duration) {
      // Частичная оплата - вернем специальный маркер
      const percentage = (paidMinutes / duration) * 100;
      return `partial-payment-${Math.round(percentage)}`;
    }

    // Полная оплата
    if (paidMinutes >= duration || session.payment_id) {
      return 'bg-green-600 text-white border-green-600';
    }

    // По умолчанию — не оплачено
    return 'bg-white text-gray-500 border-gray-300';
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Проведено';
      case 'scheduled':
        return 'Запланировано';
      case 'cancelled':
        return 'Отменено';
      case 'rescheduled':
        return 'Перенесено';
      case 'in_progress':
        return 'В процессе';
      case 'free':
        return 'Бесплатное';
      default:
        return 'Не определено';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getPaymentTooltip = (session: LessonSession) => {
    const duration = session.duration || 60;
    const paidMinutes = session.paid_minutes || 0;
    const unpaidMinutes = duration - paidMinutes;

    let paymentInfo = '';
    if (session.payment_date && session.payment_amount && session.lessons_count) {
      const paymentDate = format(new Date(session.payment_date), 'dd.MM.yyyy', { locale: ru });
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

  const handleAttendanceClick = (dateString: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedDate(new Date(dateString));
    setAttendanceModalOpen(true);
  };

  if (sortedSessions.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground text-center py-2", className)}>
        Нет запланированных занятий
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setStartIndex(Math.max(0, startIndex - visibleCount))}
        disabled={!canGoBack}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex-1 overflow-hidden">
        <div className="flex gap-1">
          <TooltipProvider>
            {visibleSessions.map((session, index) => {
              const colorClass = getLessonColor(session);
              const isPartialPayment = colorClass.startsWith('partial-payment-');
              const paymentPercentage = isPartialPayment ? parseInt(colorClass.split('-')[2]) : 0;

              return (
                <Tooltip key={session.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "h-8 w-14 rounded shrink-0 transition-colors relative flex items-center justify-center border",
                        !isPartialPayment && colorClass
                      )}
                      style={isPartialPayment ? {
                        background: `linear-gradient(to right, rgb(22 163 74) ${paymentPercentage}%, rgb(243 244 246) ${paymentPercentage}%)`,
                        borderColor: 'rgb(209 213 219)',
                        color: paymentPercentage > 50 ? 'white' : 'rgb(107 114 128)'
                      } : undefined}
                      aria-label={`Занятие ${formatDate(session.lessonDate)}`}
                    >
                      <span className="text-[10px] font-medium leading-none relative z-10">
                        {formatShortDate(session.lessonDate)}
                      </span>
                      {groupId && (
                        <AttendanceIndicator
                          lessonDate={new Date(session.lessonDate)}
                          lessonId={groupId}
                          sessionType="group"
                          onClick={(e) => handleAttendanceClick(session.lessonDate, e)}
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <div className="font-semibold">Занятие №{session.lessonNumber || startIndex + index + 1} ({session.duration || 60} мин.)</div>
                      <div className="text-muted-foreground">{format(new Date(session.lessonDate), 'dd MMMM yyyy', { locale: ru })}</div>
                      {session.lesson_time && (
                        <div className="text-muted-foreground">{session.lesson_time}</div>
                      )}
                      <div className="text-muted-foreground">{getStatusLabel(session.status)}</div>
                      {(session.paid_minutes !== undefined || session.payment_id) && (
                        <div className="whitespace-pre-line pt-1 border-t">
                          {getPaymentTooltip(session)}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setStartIndex(startIndex + visibleCount)}
        disabled={!canGoForward}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="text-xs text-muted-foreground shrink-0 ml-2">
        {sortedSessions.length} занятий
      </div>

      {selectedDate && groupId && (
        <MarkAttendanceModal
          open={attendanceModalOpen}
          onOpenChange={setAttendanceModalOpen}
          lessonDate={selectedDate}
          lessonId={groupId}
          sessionType="group"
        />
      )}
    </div>
  );
}
