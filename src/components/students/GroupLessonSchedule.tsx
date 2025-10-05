import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import { AttendanceIndicator } from './AttendanceIndicator';
import { MarkAttendanceModal } from './MarkAttendanceModal';
import { StudentLessonStatusModal } from '@/components/learning-groups/StudentLessonStatusModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useStudentGroupLessonSessions } from '@/hooks/useStudentGroupLessonSessions';
import { Loader2 } from 'lucide-react';

interface GroupLessonScheduleProps {
  studentId: string;
  groupId: string;
  className?: string;
  onRefresh?: () => void;
}

export function GroupLessonSchedule({ 
  studentId,
  groupId,
  className,
  onRefresh
}: GroupLessonScheduleProps) {
  // Используем централизованный хук для получения занятий
  const { data: sessions = [], isLoading } = useStudentGroupLessonSessions(studentId, groupId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Sort sessions by date
  const sortedSessions = [...sessions].sort((a, b) =>
    new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime()
  );

  const displayedSessions = showAll ? sortedSessions : sortedSessions.slice(0, 30);
  const hasMoreLessons = sortedSessions.length > 30;

  const handleDateClick = (session: typeof sessions[0], e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDate(new Date(session.lesson_date));
    setSelectedSessionId(session.lesson_session_id);
    setStatusModalOpen(true);
  };

  const handleAttendanceClick = (date: Date, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDate(date);
    setAttendanceModalOpen(true);
  };

  const getLessonColor = (session: typeof sessions[0]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lessonDate = new Date(session.lesson_date);
    lessonDate.setHours(0, 0, 0, 0);
    
    const isPast = lessonDate < today;

    // Отменено для студента
    if (session.is_cancelled_for_student) {
      return 'bg-black text-white border-black';
    }

    // Бесплатное или бонусное
    if (session.payment_status === 'free' || session.payment_status === 'bonus') {
      return 'bg-orange-500 text-white border-orange-500';
    }

    // Проверяем оплату
    if (session.payment_status === 'paid') {
      return isPast
        ? 'bg-gray-500 text-white border-gray-500'
        : 'bg-green-600 text-white border-green-600';
    }
    
    // Не оплачено
    return isPast
      ? 'bg-red-500 text-white border-red-500' // Красный для прошедших неоплаченных (задолженность)
      : 'bg-white text-gray-900 border-gray-300';
  };

  const getTooltipText = (session: typeof sessions[0]) => {
    const duration = session.duration || 80;

    let tooltipParts = [
      `${format(new Date(session.lesson_date), 'd MMMM', { locale: ru })}`
    ];

    if (session.is_cancelled_for_student) {
      const reason = session.cancellation_reason || 'Отменено';
      return tooltipParts.join('\n') + '\n' + reason;
    }

    if (session.payment_status === 'free') {
      return tooltipParts.join('\n') + '\nБесплатное занятие';
    }

    if (session.payment_status === 'bonus') {
      return tooltipParts.join('\n') + '\nБонусное занятие';
    }

    // Информация об оплате
    if (session.payment_status === 'paid') {
      return `${tooltipParts.join('\n')}\nОплачено: ${duration} мин`;
    } else {
      return `${tooltipParts.join('\n')}\nНе оплачено: ${duration} мин`;
    }
  };

  // Removed handleStatusChange - now using StudentLessonStatusModal

  if (sortedSessions.length === 0) {
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
              {displayedSessions.map((session, index) => {
                const colorClass = getLessonColor(session);
                const duration = session.duration || 80;
                const lessonNumber = session.lesson_number || (index + 1);
                
                return (
                  <Tooltip key={session.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleDateClick(session, e)}
                        disabled={session.is_cancelled_for_student}
                        className={cn(
                          "h-8 px-2 rounded border flex items-center justify-center hover:opacity-80 transition-all relative overflow-hidden",
                          colorClass,
                          session.is_cancelled_for_student ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                        )}
                      >
                        <span className="text-xs font-medium whitespace-nowrap relative z-10">
                          {format(new Date(session.lesson_date), 'dd.MM', { locale: ru })}
                        </span>
                        {!session.is_cancelled_for_student && (
                          <AttendanceIndicator
                            lessonDate={new Date(session.lesson_date)}
                            lessonId={groupId}
                            sessionType="group"
                            onClick={(e) => handleAttendanceClick(new Date(session.lesson_date), e)}
                          />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <div className="font-semibold">Занятие №{lessonNumber} ({duration} мин.)</div>
                        <div className="text-muted-foreground">{format(new Date(session.lesson_date), 'dd MMMM yyyy', { locale: ru })}</div>
                        {session.start_time && session.end_time && (
                          <div className="text-muted-foreground">{session.start_time}-{session.end_time}</div>
                        )}
                        <div className="whitespace-pre-line pt-1 border-t">
                          {getTooltipText(session)}
                        </div>
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
                    +{sortedSessions.length - 30} еще
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
        </div>
      </TooltipProvider>

      {/* Student-specific status modal */}
      <StudentLessonStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        studentId={studentId}
        sessionId={selectedSessionId}
        lessonDate={selectedDate}
        onStatusUpdated={onRefresh}
      />

      {/* Attendance modal */}
      {selectedDate && (
        <MarkAttendanceModal
          open={attendanceModalOpen}
          onOpenChange={setAttendanceModalOpen}
          lessonDate={selectedDate}
          lessonId={groupId}
          sessionType="group"
          onMarked={onRefresh}
        />
      )}
    </>
  );
}
