import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import { AttendanceIndicator } from './AttendanceIndicator';
import { MarkAttendanceModal } from './MarkAttendanceModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

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
      ? 'bg-gray-400 text-white border-gray-400'
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

  const handleStatusChange = async (newStatus: 'scheduled' | 'completed' | 'cancelled' | 'free' | 'free_skip' | 'paid_skip' | 'rescheduled') => {
    if (!selectedSessionId) return;

    try {
      const { error } = await supabase
        .from('lesson_sessions')
        .update({ status: newStatus })
        .eq('id', selectedSessionId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Статус занятия обновлен",
      });

      setStatusModalOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус занятия",
        variant: "destructive",
      });
    }
  };

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

      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить статус занятия</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'dd MMMM yyyy', { locale: ru })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Статус занятия</label>
              <Select onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Запланировано</SelectItem>
                  <SelectItem value="completed">Проведено</SelectItem>
                  <SelectItem value="cancelled">Отменено</SelectItem>
                  <SelectItem value="free">Бесплатное занятие</SelectItem>
                  <SelectItem value="rescheduled">Перенесено</SelectItem>
                  <SelectItem value="free_skip">Свободный пропуск</SelectItem>
                  <SelectItem value="paid_skip">Оплаченный пропуск</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
