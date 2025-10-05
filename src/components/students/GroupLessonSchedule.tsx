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

interface GroupLessonScheduleProps {
  sessions: LessonSession[];
  groupId: string;
  className?: string;
  onRefresh?: () => void;
}

export function GroupLessonSchedule({ 
  sessions,
  groupId,
  className,
  onRefresh
}: GroupLessonScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();

  // Sort sessions by date
  const sortedSessions = [...sessions].sort((a, b) =>
    new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime()
  );

  const displayedSessions = showAll ? sortedSessions : sortedSessions.slice(0, 30);
  const hasMoreLessons = sortedSessions.length > 30;

  const handleDateClick = (session: LessonSession, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDate(new Date(session.lessonDate));
    setSelectedSessionId(session.id);
    setStatusModalOpen(true);
  };

  const handleAttendanceClick = (date: Date, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDate(date);
    setAttendanceModalOpen(true);
  };

  const getLessonColor = (session: LessonSession) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lessonDate = new Date(session.lessonDate);
    lessonDate.setHours(0, 0, 0, 0);
    
    const isPast = lessonDate < today;

    // Специальные статусы
    if (session.status === 'cancelled' || session.status === 'rescheduled') {
      return 'bg-black text-white border-black';
    }
    if (session.status === 'free') {
      return 'bg-orange-500 text-white border-orange-500';
    }

    // Проверяем частичную оплату
    const duration = session.duration || 80;
    const paidMinutes = session.paid_minutes || 0;
    
    if (paidMinutes > 0 && paidMinutes < duration) {
      const percentage = (paidMinutes / duration) * 100;
      return `partial-payment-${Math.round(percentage)}`;
    }

    // Полная оплата
    if (paidMinutes >= duration || session.payment_id) {
      if (isPast) {
        return 'bg-gray-500 text-white border-gray-500';
      }
      return 'bg-green-600 text-white border-green-600';
    }

    // Не оплачено
    if (isPast) {
      return 'bg-red-500 text-white border-red-500';
    } else {
      return 'bg-white text-gray-900 border-gray-300';
    }
  };

  const getPaymentTooltip = (session: LessonSession) => {
    const duration = session.duration || 80;
    const paidMinutes = session.paid_minutes || 0;
    const unpaidMinutes = duration - paidMinutes;

    let paymentInfo = '';
    if (session.payment_date && session.payment_amount && session.lessons_count) {
      const paymentDate = format(new Date(session.payment_date), 'dd.MM.yyyy', { locale: ru });
      paymentInfo = `\nОплата от ${paymentDate} (${session.payment_amount.toLocaleString('ru-RU')} ₽)`;
    }

    if (paidMinutes === 0) {
      return `Не оплачено: ${duration} мин`;
    } else if (paidMinutes >= duration) {
      return `Оплачено: ${duration} мин${paymentInfo}`;
    } else {
      return `Оплачено: ${paidMinutes} мин\nНе оплачено: ${unpaidMinutes} мин${paymentInfo}`;
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
                const paidMinutes = session.paid_minutes || 0;
                const isPartialPayment = paidMinutes > 0 && paidMinutes < duration;
                const paymentPercentage = isPartialPayment ? (paidMinutes / duration) * 100 : 0;
                const lessonNumber = index + 1;
                
                return (
                  <Tooltip key={session.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleDateClick(session, e)}
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
                          {format(new Date(session.lessonDate), 'dd.MM', { locale: ru })}
                        </span>
                        <AttendanceIndicator
                          lessonDate={new Date(session.lessonDate)}
                          lessonId={groupId}
                          sessionType="group"
                          onClick={(e) => handleAttendanceClick(new Date(session.lessonDate), e)}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <div className="font-semibold">Занятие №{session.lessonNumber || lessonNumber} ({duration} мин.)</div>
                        <div className="text-muted-foreground">{format(new Date(session.lessonDate), 'dd MMMM yyyy', { locale: ru })}</div>
                        {session.lesson_time && (
                          <div className="text-muted-foreground">{session.lesson_time}</div>
                        )}
                        {session.status && (
                          <div className="text-muted-foreground">
                            {session.status === 'cancelled' ? 'Отменено' : 
                             session.status === 'free' ? 'Бесплатное занятие' : 
                             session.status === 'rescheduled' ? 'Перенесено' :
                             session.status === 'completed' ? 'Проведено' : 
                             'Запланировано'}
                          </div>
                        )}
                        <div className="whitespace-pre-line pt-1 border-t">
                          {getPaymentTooltip(session)}
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
