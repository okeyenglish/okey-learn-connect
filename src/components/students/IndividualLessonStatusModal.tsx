import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addMinutes, parse, eachDayOfInterval, isAfter, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Check, 
  DollarSign, 
  Gift, 
  UserX, 
  Calendar, 
  User, 
  MapPin,
  XCircle,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { RescheduleIndividualLessonModal } from "./RescheduleIndividualLessonModal";
import { ChangeLessonDurationModal } from "./ChangeLessonDurationModal";

interface IndividualLessonStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  scheduleTime?: string;
  lessonId?: string;
  onStatusUpdated?: () => void;
}

const lessonStatusOptions = [
  {
    value: 'change_duration',
    label: 'Изменить продолжительность',
    description: 'Изменить длительность только этого занятия',
    icon: Clock,
    color: 'text-purple-600',
  },
  {
    value: 'scheduled',
    label: 'Обычное занятие',
    description: 'Вернуть к запланированному статусу',
    icon: Calendar,
    color: 'text-gray-600',
  },
  {
    value: 'free',
    label: 'Бесплатное занятие',
    description: 'Занятие без оплаты',
    icon: Gift,
    color: 'text-yellow-600',
  },
  {
    value: 'cancelled',
    label: 'Отменено',
    description: 'Занятие отменено',
    icon: XCircle,
    color: 'text-gray-900',
  },
  {
    value: 'reschedule',
    label: 'Перенести на другой день',
    description: 'Перенос занятия на другую дату',
    icon: Calendar,
    color: 'text-indigo-600',
  },
  {
    value: 'substitute_teacher',
    label: 'Подменить преподавателя на день',
    description: 'Замена преподавателя для этого урока',
    icon: User,
    color: 'text-teal-600',
  },
  {
    value: 'substitute_classroom',
    label: 'Подменить аудиторию на день',
    description: 'Замена аудитории для этого урока',
    icon: MapPin,
    color: 'text-cyan-600',
  },
];

export function IndividualLessonStatusModal({
  open,
  onOpenChange,
  selectedDate,
  scheduleTime,
  lessonId,
  onStatusUpdated,
}: IndividualLessonStatusModalProps) {
  const { toast } = useToast();
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [lessonData, setLessonData] = useState<{teacher?: string, classroom?: string}>({});
  const [sessionData, setSessionData] = useState<{id?: string, duration?: number}>({});
  const [futureDates, setFutureDates] = useState<Date[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [showDateSelection, setShowDateSelection] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  
  useEffect(() => {
    if (open && lessonId && selectedDate) {
      loadSessionData();
      loadFutureDates();
      // Автоматически выбираем текущую дату
      setSelectedDates(new Set([format(selectedDate, 'yyyy-MM-dd')]));
    }
  }, [open, lessonId, selectedDate]);

  const loadSessionData = async () => {
    if (!lessonId || !selectedDate) return;
    
    const lessonDate = format(selectedDate, 'yyyy-MM-dd');
    const { data: session } = await supabase
      .from('individual_lesson_sessions')
      .select('id, duration')
      .eq('individual_lesson_id', lessonId)
      .eq('lesson_date', lessonDate)
      .maybeSingle();
    
    if (session) {
      setSessionData({ id: session.id, duration: session.duration || undefined });
    } else {
      // If no session exists, get default duration from lesson
      const { data: lesson } = await supabase
        .from('individual_lessons')
        .select('duration')
        .eq('id', lessonId)
        .single();
      
      setSessionData({ duration: lesson?.duration || 60 });
    }
  };

  const loadFutureDates = async () => {
    if (!lessonId || !selectedDate) return;

    const { data: lesson } = await supabase
      .from('individual_lessons')
      .select('schedule_days, period_end')
      .eq('id', lessonId)
      .single();

    if (!lesson || !lesson.schedule_days || !lesson.period_end) return;

    const dayMapping: Record<string, number> = {
      'Пн': 1, 'Monday': 1, 'monday': 1,
      'Вт': 2, 'Tuesday': 2, 'tuesday': 2,
      'Ср': 3, 'Wednesday': 3, 'wednesday': 3,
      'Чт': 4, 'Thursday': 4, 'thursday': 4,
      'Пт': 5, 'Friday': 5, 'friday': 5,
      'Сб': 6, 'Saturday': 6, 'saturday': 6,
      'Вс': 0, 'Sunday': 0, 'sunday': 0,
    };

    const scheduledDays = lesson.schedule_days.map(day => dayMapping[day]).filter(d => d !== undefined);
    const endDate = new Date(lesson.period_end);
    const dates = eachDayOfInterval({ start: selectedDate, end: endDate })
      .filter(date => scheduledDays.includes(date.getDay()));

    setFutureDates(dates);
  };
  
  if (!selectedDate) return null;

  const toggleDateSelection = (dateStr: string) => {
    const newSelection = new Set(selectedDates);
    if (newSelection.has(dateStr)) {
      newSelection.delete(dateStr);
    } else {
      newSelection.add(dateStr);
    }
    setSelectedDates(newSelection);
  };

  const selectAllDates = () => {
    setSelectedDates(new Set(futureDates.map(d => format(d, 'yyyy-MM-dd'))));
  };

  const clearAllDates = () => {
    setSelectedDates(new Set());
  };

  const handleStatusSelect = async (statusValue: string) => {
    if (!lessonId) {
      toast({
        title: "Ошибка",
        description: "ID занятия не найден",
        variant: "destructive"
      });
      return;
    }

    // Для действий, которые применяются к нескольким датам
    if (['scheduled', 'free', 'cancelled'].includes(statusValue)) {
      setSelectedAction(statusValue);
      setShowDateSelection(true);
      return;
    }

    // Special handling for change duration
    if (statusValue === 'change_duration') {
      // Ensure we have session data
      if (!sessionData.id) {
        // Create session if it doesn't exist
        const lessonDate = format(selectedDate!, 'yyyy-MM-dd');
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: newSession, error } = await supabase
          .from('individual_lesson_sessions')
          .insert({
            individual_lesson_id: lessonId,
            lesson_date: lessonDate,
            status: 'scheduled',
            duration: sessionData.duration || 60,
            created_by: user?.id,
          })
          .select('id')
          .single();
        
        if (error || !newSession) {
          toast({
            title: "Ошибка",
            description: "Не удалось создать занятие",
            variant: "destructive"
          });
          return;
        }
        
        setSessionData({ ...sessionData, id: newSession.id });
      }
      
      setDurationModalOpen(true);
      onOpenChange(false);
      return;
    }

    // Special handling for reschedule
    if (statusValue === 'reschedule') {
      // Load lesson data
      const { data } = await supabase
        .from('individual_lessons')
        .select('teacher_name, lesson_location')
        .eq('id', lessonId)
        .single();
      
      if (data) {
        setLessonData({
          teacher: data.teacher_name || undefined,
          classroom: data.lesson_location || undefined
        });
      }
      
      setRescheduleModalOpen(true);
      onOpenChange(false);
      return;
    }

    // Special handling for substitute teacher
    if (statusValue === 'substitute_teacher') {
      // TODO: Open substitute teacher modal
      toast({
        title: "В разработке",
        description: "Функция замены преподавателя находится в разработке"
      });
      return;
    }

    // Special handling for substitute classroom
    if (statusValue === 'substitute_classroom') {
      // TODO: Open substitute classroom modal
      toast({
        title: "В разработке",
        description: "Функция замены аудитории находится в разработке"
      });
      return;
    }

    try {
      const lessonDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Пользователь не авторизован');
      }

      const { data: currentSession } = await supabase
        .from('individual_lesson_sessions')
        .select('status, payment_id, is_additional')
        .eq('individual_lesson_id', lessonId)
        .eq('lesson_date', lessonDate)
        .maybeSingle();

      const wasPaid = currentSession?.payment_id != null;
      const hasPaidMinutes = (currentSession as any)?.paid_minutes > 0;
      
      let paymentToAssign: string | null = null;
      
      // If reverting to scheduled and current has no paid minutes, pull minutes back from future sessions
      if (statusValue === 'scheduled') {
        const currentPaidMinutes = (currentSession as any)?.paid_minutes || 0;
        
        // Get the duration for this session
        const { data: sessionWithDuration } = await supabase
          .from('individual_lesson_sessions')
          .select('duration')
          .eq('individual_lesson_id', lessonId)
          .eq('lesson_date', lessonDate)
          .maybeSingle();
        
        const sessionDuration = sessionWithDuration?.duration || 60;
        const neededMinutes = sessionDuration - currentPaidMinutes;
        
        if (neededMinutes > 0) {
          // Get all future sessions ordered by date
          const { data: futureSessions } = await supabase
            .from('individual_lesson_sessions')
            .select('id, lesson_date, duration, paid_minutes, payment_id, status')
            .eq('individual_lesson_id', lessonId)
            .gt('lesson_date', lessonDate)
            .order('lesson_date', { ascending: true });

          let collectedMinutes = 0;
          let foundPaymentId: string | null = null;
          const updatedSessions: string[] = [];

          if (futureSessions) {
            for (const futureSession of futureSessions) {
              if (collectedMinutes >= neededMinutes) break;
              
              // Skip cancelled, free, or rescheduled sessions
              if (futureSession.status === 'cancelled' || futureSession.status === 'free' || futureSession.status === 'rescheduled') {
                continue;
              }

              const futurePaidMinutes = futureSession.paid_minutes || 0;
              
              // Запоминаем первый найденный payment_id
              if (!foundPaymentId && futureSession.payment_id) {
                foundPaymentId = futureSession.payment_id;
              }
              
              if (futurePaidMinutes > 0) {
                const minutesToTake = Math.min(futurePaidMinutes, neededMinutes - collectedMinutes);
                const newFuturePaidMinutes = futurePaidMinutes - minutesToTake;

                await supabase
                  .from('individual_lesson_sessions')
                  .update({ 
                    paid_minutes: newFuturePaidMinutes,
                    updated_at: new Date().toISOString() 
                  })
                  .eq('id', futureSession.id);

                collectedMinutes += minutesToTake;
                updatedSessions.push(format(new Date(futureSession.lesson_date), 'dd.MM', { locale: ru }));
              }
            }
          }

          // Update current session with collected minutes and payment
          if (collectedMinutes > 0) {
            const updateData: any = {
              paid_minutes: currentPaidMinutes + collectedMinutes,
              status: 'scheduled',
              updated_at: new Date().toISOString()
            };
            
            // Привязываем payment_id, если нашли
            if (foundPaymentId) {
              updateData.payment_id = foundPaymentId;
            }
            
            await supabase
              .from('individual_lesson_sessions')
              .update(updateData)
              .eq('individual_lesson_id', lessonId)
              .eq('lesson_date', lessonDate);

            toast({
              title: 'Оплата восстановлена',
              description: `${collectedMinutes} минут и оплата возвращены с занятий: ${updatedSessions.join(', ')}`,
            });
            
            onStatusUpdated?.();
            onOpenChange(false);
            return;
          }
        }
      }
      
      // Special handling for cancelling or making free a paid lesson - transfer payment minutes to next unpaid lessons
      if (statusValue === 'cancelled' || statusValue === 'free') {
        // Get paid_minutes from current session
        const { data: currentSessionFull } = await supabase
          .from('individual_lesson_sessions')
          .select('paid_minutes, payment_id')
          .eq('individual_lesson_id', lessonId)
          .eq('lesson_date', lessonDate)
          .single();

        const freedMinutes = currentSessionFull?.paid_minutes || 0;

        if (freedMinutes > 0) {
          // Get all future sessions ordered by date
          const { data: futureSessions } = await supabase
            .from('individual_lesson_sessions')
            .select('id, lesson_date, duration, paid_minutes, status')
            .eq('individual_lesson_id', lessonId)
            .gt('lesson_date', lessonDate)
            .order('lesson_date', { ascending: true });

          let remainingMinutes = freedMinutes;
          const updatedSessions: string[] = [];

          if (futureSessions) {
            for (const futureSession of futureSessions) {
              if (remainingMinutes <= 0) break;
              
              // Skip cancelled, free, or rescheduled sessions
              if (futureSession.status === 'cancelled' || futureSession.status === 'free' || futureSession.status === 'rescheduled') {
                continue;
              }

              const sessionDuration = futureSession.duration || 60;
              const currentPaid = futureSession.paid_minutes || 0;
              const unpaidMinutes = sessionDuration - currentPaid;

              if (unpaidMinutes > 0) {
                const minutesToAdd = Math.min(remainingMinutes, unpaidMinutes);
                const newPaidMinutes = currentPaid + minutesToAdd;

                await supabase
                  .from('individual_lesson_sessions')
                  .update({ 
                    paid_minutes: newPaidMinutes,
                    updated_at: new Date().toISOString() 
                  })
                  .eq('id', futureSession.id);

                remainingMinutes -= minutesToAdd;
                updatedSessions.push(format(new Date(futureSession.lesson_date), 'dd.MM', { locale: ru }));
              }
            }
          }

          // Update current session - remove paid_minutes and payment_id
          await supabase
            .from('individual_lesson_sessions')
            .update({ 
              paid_minutes: 0, 
              payment_id: null,
              updated_at: new Date().toISOString() 
            })
            .eq('individual_lesson_id', lessonId)
            .eq('lesson_date', lessonDate);

          if (updatedSessions.length > 0) {
            toast({
              title: 'Минуты перенесены',
              description: `${freedMinutes} минут перенесено на занятия: ${updatedSessions.join(', ')}`,
            });
          } else {
            toast({
              title: 'Внимание',
              description: `${freedMinutes} минут освобождено, но нет подходящих занятий для переноса`,
              variant: 'destructive',
            });
          }
        } else {
          // Just remove payment_id if no paid minutes
          await supabase
            .from('individual_lesson_sessions')
            .update({ 
              payment_id: null,
              updated_at: new Date().toISOString() 
            })
            .eq('individual_lesson_id', lessonId)
            .eq('lesson_date', lessonDate);
        }
      }
      
      // Try update first to avoid duplicate rows
      const updateData: any = { status: statusValue, created_by: user.id, updated_at: new Date().toISOString() };
      if (paymentToAssign) updateData.payment_id = paymentToAssign;
      
      // Когда дополнительное занятие становится обычным, убираем флаг is_additional
      if (statusValue === 'scheduled' && currentSession?.is_additional) {
        updateData.is_additional = false;
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('individual_lesson_sessions')
        .update(updateData)
        .eq('individual_lesson_id', lessonId)
        .eq('lesson_date', lessonDate)
        .select('id');

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      if (!updatedRows || updatedRows.length === 0) {
        // No row existed - insert new
        const insertData: any = {
          individual_lesson_id: lessonId,
          lesson_date: lessonDate,
          status: statusValue,
          created_by: user.id,
          is_additional: false, // Новое обычное занятие
        };
        if (paymentToAssign) insertData.payment_id = paymentToAssign;

        const { error: insertError } = await supabase
          .from('individual_lesson_sessions')
          .insert(insertData);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
      }

      // Не закрываем модал, если показываем выбор дат
      if (!showDateSelection) {
        toast({
          title: "Успешно",
          description: "Статус занятия обновлен"
        });

        onStatusUpdated?.();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error updating lesson status:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить статус занятия",
        variant: "destructive"
      });
    }
  };

  const applyToSelectedDates = async () => {
    if (!selectedAction || selectedDates.size === 0 || !lessonId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      let successCount = 0;
      let totalMinutesFreed = 0;
      const dateArray = Array.from(selectedDates).sort();

      // Сначала собираем все минуты, которые нужно освободить
      const sessionsToFree: Array<{ date: string; minutes: number }> = [];
      
      if (selectedAction === 'free' || selectedAction === 'cancelled') {
        for (const dateStr of dateArray) {
          const { data: existingSession } = await supabase
            .from('individual_lesson_sessions')
            .select('paid_minutes')
            .eq('individual_lesson_id', lessonId)
            .eq('lesson_date', dateStr)
            .maybeSingle();
          
          if (existingSession && existingSession.paid_minutes > 0) {
            sessionsToFree.push({
              date: dateStr,
              minutes: existingSession.paid_minutes
            });
            totalMinutesFreed += existingSession.paid_minutes;
          }
        }
      }

      // Обновляем статусы всех выбранных занятий
      for (const dateStr of dateArray) {
        try {
          const { data: existingSession } = await supabase
            .from('individual_lesson_sessions')
            .select('id, is_additional')
            .eq('individual_lesson_id', lessonId)
            .eq('lesson_date', dateStr)
            .maybeSingle();

          const updateData: any = {
            status: selectedAction,
            created_by: user.id,
            updated_at: new Date().toISOString()
          };

          // Для бесплатных и отмененных - обнуляем оплату
          if (selectedAction === 'free' || selectedAction === 'cancelled') {
            updateData.paid_minutes = 0;
            updateData.payment_id = null;
          }

          // Если статус меняется на scheduled и это было доп. занятие, убираем флаг
          if (selectedAction === 'scheduled' && existingSession?.is_additional) {
            updateData.is_additional = false;
          }

          if (existingSession) {
            // Обновляем существующую сессию
            await supabase
              .from('individual_lesson_sessions')
              .update(updateData)
              .eq('id', existingSession.id);
          } else {
            // Создаём новую сессию
            await supabase
              .from('individual_lesson_sessions')
              .insert({
                individual_lesson_id: lessonId,
                lesson_date: dateStr,
                status: selectedAction,
                created_by: user.id,
                is_additional: false,
              });
          }

          successCount++;
        } catch (error) {
          console.error(`Error updating ${dateStr}:`, error);
        }
      }

      // Теперь переносим освобожденные минуты на будущие уроки
      if (totalMinutesFreed > 0 && (selectedAction === 'free' || selectedAction === 'cancelled')) {
        const lastCancelledDate = dateArray[dateArray.length - 1];
        
        const { data: futureSessions } = await supabase
          .from('individual_lesson_sessions')
          .select('id, lesson_date, duration, paid_minutes, status')
          .eq('individual_lesson_id', lessonId)
          .gt('lesson_date', lastCancelledDate)
          .order('lesson_date', { ascending: true });

        let remainingMinutes = totalMinutesFreed;

        if (futureSessions) {
          for (const futureSession of futureSessions) {
            if (remainingMinutes <= 0) break;
            
            // Пропускаем отмененные, бесплатные или перенесенные
            if (futureSession.status === 'cancelled' || 
                futureSession.status === 'free' || 
                futureSession.status === 'rescheduled') {
              continue;
            }

            const sessionDuration = futureSession.duration || 60;
            const currentPaid = futureSession.paid_minutes || 0;
            const unpaidMinutes = sessionDuration - currentPaid;

            if (unpaidMinutes > 0) {
              const minutesToAdd = Math.min(remainingMinutes, unpaidMinutes);
              const newPaidMinutes = currentPaid + minutesToAdd;

              await supabase
                .from('individual_lesson_sessions')
                .update({ 
                  paid_minutes: newPaidMinutes,
                  updated_at: new Date().toISOString() 
                })
                .eq('id', futureSession.id);

              remainingMinutes -= minutesToAdd;
            }
          }
        }
      }

      let description = `Статус обновлен для ${successCount} из ${dateArray.length} занятий`;
      if (totalMinutesFreed > 0) {
        description += `\n${totalMinutesFreed} минут перенесено на будущие уроки`;
      }

      toast({
        title: "Успешно",
        description
      });

      onStatusUpdated?.();
      setShowDateSelection(false);
      setSelectedAction(null);
      setSelectedDates(new Set());
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить статусы",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-md"
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
          }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-lg">
              {showDateSelection ? 'Выберите занятия' : 'Управление уроком'}
            </DialogTitle>
            <div className="text-sm text-muted-foreground space-y-1">
              {!showDateSelection && (
                <>
                  <div>{format(selectedDate, 'dd MMMM yyyy', { locale: ru })}</div>
                  {scheduleTime && sessionData.duration && (
                    <div>
                      {(() => {
                        try {
                          const startTime = parse(scheduleTime, 'HH:mm', new Date());
                          const endTime = addMinutes(startTime, sessionData.duration);
                          return `${scheduleTime}-${format(endTime, 'HH:mm')} (исходя из продолжительности)`;
                        } catch {
                          return scheduleTime;
                        }
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogHeader>

          {!showDateSelection ? (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {lessonStatusOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4 hover:bg-accent"
                    onClick={(e) => { e.stopPropagation(); handleStatusSelect(option.value); }}
                  >
                    <div className="flex items-start gap-3 text-left w-full">
                      <Icon className={`h-5 w-5 mt-0.5 ${option.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">
                  Выбрано: {selectedDates.size} из {futureDates.length}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllDates}>
                    Выбрать все
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAllDates}>
                    Очистить
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 mb-4">
                {futureDates.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isSelected = selectedDates.has(dateStr);
                  return (
                    <div
                      key={dateStr}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleDateSelection(dateStr)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDateSelection(dateStr)}
                      />
                      <label className="text-sm cursor-pointer flex-1">
                        {format(date, 'dd MMMM yyyy (EEEE)', { locale: ru })}
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDateSelection(false);
                    setSelectedAction(null);
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  onClick={applyToSelectedDates}
                  disabled={selectedDates.size === 0}
                  className="flex-1"
                >
                  Применить
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {lessonId && (
        <>
          <RescheduleIndividualLessonModal
            open={rescheduleModalOpen}
            onOpenChange={setRescheduleModalOpen}
            lessonId={lessonId}
            originalDate={selectedDate}
            currentTime={scheduleTime}
            currentTeacher={lessonData.teacher}
            currentClassroom={lessonData.classroom}
            onRescheduled={onStatusUpdated}
          />
          
          {sessionData.id && (
            <ChangeLessonDurationModal
              open={durationModalOpen}
              onOpenChange={setDurationModalOpen}
              sessionId={sessionData.id}
              currentDuration={sessionData.duration || 60}
              lessonDate={format(selectedDate, 'yyyy-MM-dd')}
              onDurationChanged={() => {
                onStatusUpdated?.();
                loadSessionData();
              }}
            />
          )}
        </>
      )}
    </>
  );
}
