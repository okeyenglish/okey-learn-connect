import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Check, 
  DollarSign, 
  Gift, 
  UserX, 
  Calendar, 
  User, 
  MapPin,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { RescheduleIndividualLessonModal } from "./RescheduleIndividualLessonModal";

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
  const [lessonData, setLessonData] = useState<{teacher?: string, classroom?: string}>({});
  
  if (!selectedDate) return null;

  const handleStatusSelect = async (statusValue: string) => {
    if (!lessonId) {
      toast({
        title: "Ошибка",
        description: "ID занятия не найден",
        variant: "destructive"
      });
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
        .select('status, payment_id')
        .eq('individual_lesson_id', lessonId)
        .eq('lesson_date', lessonDate)
        .maybeSingle();

      const wasPaid = currentSession?.payment_id != null;
      
      let paymentToAssign: string | null = null;
      
      // If reverting to scheduled and current is unpaid, pull payment back from the nearest future scheduled paid session
      if (statusValue === 'scheduled' && !currentSession?.payment_id) {
        const { data: futureSessions } = await supabase
          .from('individual_lesson_sessions')
          .select('id, lesson_date, payment_id, status')
          .eq('individual_lesson_id', lessonId)
          .gt('lesson_date', lessonDate)
          .order('lesson_date', { ascending: true });

        const donor = (futureSessions || []).find((s) => s.payment_id && (s.status === 'scheduled' || !s.status));
        if (donor && donor.payment_id) {
          paymentToAssign = donor.payment_id as string;
          // remove payment from donor now, we'll assign to current in update/insert below
          await supabase
            .from('individual_lesson_sessions')
            .update({ payment_id: null, updated_at: new Date().toISOString() })
            .eq('id', donor.id);
        }
      }
      
      // Special handling for cancelling or making free a paid lesson - transfer payment to next unpaid lesson
      if ((statusValue === 'cancelled' || statusValue === 'free') && wasPaid) {
        // Load all existing sessions and the lesson schedule
        const [{ data: allSessions }, { data: lessonRow }] = await Promise.all([
          supabase
            .from('individual_lesson_sessions')
            .select('id, lesson_date, status, payment_id')
            .eq('individual_lesson_id', lessonId)
            .order('lesson_date', { ascending: true }),
          supabase
            .from('individual_lessons')
            .select('schedule_days, period_start, period_end')
            .eq('id', lessonId)
            .maybeSingle()
        ]);

        const sessionByDate = new Map<string, { id?: string; status?: string; payment_id?: string }>();
        (allSessions || []).forEach((s) => sessionByDate.set(s.lesson_date, { id: s.id, status: s.status, payment_id: s.payment_id }));

        const isUnpaid = (session?: { payment_id?: string; status?: string }) => !session?.payment_id && (!session?.status || session?.status === 'scheduled');

        // Build future scheduled dates after current lessonDate
        let targetDate: string | null = null;
        if (lessonRow?.schedule_days && lessonRow?.period_start && lessonRow?.period_end) {
          const DAY_MAP: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
          const dayNums = (lessonRow.schedule_days as string[]).map((d) => DAY_MAP[d?.toLowerCase?.() || '']).filter((n) => n !== undefined);
          const start = new Date(lessonRow.period_start as string);
          const end = new Date(lessonRow.period_end as string);
          const startFrom = new Date(lessonDate);
          startFrom.setDate(startFrom.getDate() + 1);

          // Prefer existing future unpaid session rows first
          if (!targetDate && (allSessions || []).length) {
            for (const sess of (allSessions as { lesson_date: string; payment_id?: string; status?: string }[])) {
              if (sess.lesson_date > lessonDate && isUnpaid(sess)) {
                targetDate = sess.lesson_date;
                break;
              }
            }
          }

          // If none, fallback to generating next scheduled date
          for (let d = new Date(startFrom); d <= end; d.setDate(d.getDate() + 1)) {
            if (d >= start) {
              const ds = format(d, 'yyyy-MM-dd');
              const s = sessionByDate.get(ds);
              const isScheduledDay = dayNums.includes(d.getDay());

              if (s) {
                if (isUnpaid(s)) {
                  targetDate = ds;
                  break;
                }
              } else if (isScheduledDay) {
                targetDate = ds;
                break;
              }
            }
          }
        }

        if (targetDate) {
          const targetSession = sessionByDate.get(targetDate);
          if (targetSession?.id) {
            // Update existing session - transfer payment_id
            await supabase
              .from('individual_lesson_sessions')
              .update({ payment_id: currentSession.payment_id, updated_at: new Date().toISOString() })
              .eq('id', targetSession.id);
          } else {
            // Insert a new session with payment_id
            await supabase
              .from('individual_lesson_sessions')
              .insert({
                individual_lesson_id: lessonId,
                lesson_date: targetDate,
                status: 'scheduled',
                payment_id: currentSession.payment_id,
                created_by: user.id,
                updated_at: new Date().toISOString(),
              });
          }

          // Remove payment from current session
          await supabase
            .from('individual_lesson_sessions')
            .update({ payment_id: null, updated_at: new Date().toISOString() })
            .eq('individual_lesson_id', lessonId)
            .eq('lesson_date', lessonDate);

          toast({
            title: 'Оплата перенесена',
            description: `Оплата перенесена на занятие ${format(new Date(targetDate), 'dd.MM.yyyy', { locale: ru })}`,
          });
        } else {
          // Just remove payment if no future lessons
          await supabase
            .from('individual_lesson_sessions')
            .update({ payment_id: null, updated_at: new Date().toISOString() })
            .eq('individual_lesson_id', lessonId)
            .eq('lesson_date', lessonDate);

          toast({
            title: 'Оплата удалена',
            description: 'Нет будущих занятий для переноса оплаты',
            variant: 'destructive',
          });
        }
      }
      
      // Try update first to avoid duplicate rows
      const updateData: any = { status: statusValue, created_by: user.id, updated_at: new Date().toISOString() };
      if (paymentToAssign) updateData.payment_id = paymentToAssign;

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

      toast({
        title: "Успешно",
        description: "Статус занятия обновлен"
      });

      onStatusUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating lesson status:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить статус занятия",
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
              Управление уроком
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}
              {scheduleTime && ` • ${scheduleTime}`}
            </div>
          </DialogHeader>

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
        </DialogContent>
      </Dialog>

      {lessonId && (
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
      )}
    </>
  );
}
