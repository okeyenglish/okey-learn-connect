import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  User,
  XCircle,
  Gift,
  DollarSign,
  UserX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

interface StudentLessonStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  sessionId: string | null;
  lessonDate: Date | null;
  onStatusUpdated?: () => void;
}

export function StudentLessonStatusModal({
  open,
  onOpenChange,
  studentId,
  sessionId,
  lessonDate,
  onStatusUpdated,
}: StudentLessonStatusModalProps) {
  const [sessionData, setSessionData] = useState<any>(null);
  const [studentSessionData, setStudentSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (sessionId && studentId && open) {
      loadSessionData();
    }
  }, [sessionId, studentId, open]);

  const loadSessionData = async () => {
    if (!sessionId || !studentId) return;

    try {
      // Load lesson session data
      const { data: sessionInfo, error: sessionError } = await supabase
        .from('lesson_sessions')
        .select(`
          *,
          learning_groups(name, subject)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSessionData(sessionInfo);

      // Load student's personal session data
      const { data: studentSession, error: studentError } = await supabase
        .from('student_lesson_sessions')
        .select('*')
        .eq('lesson_session_id', sessionId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (studentError && studentError.code !== 'PGRST116') throw studentError;
      setStudentSessionData(studentSession);
      
      if (studentSession?.cancellation_reason) {
        setCancellationReason(studentSession.cancellation_reason);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные занятия",
        variant: "destructive",
      });
    }
  };

  const updateStudentStatus = async (action: 'cancel' | 'restore' | 'free' | 'paid' | 'bonus') => {
    if (!sessionId || !studentId) return;

    setLoading(true);
    try {
      // Prepare update data based on action
      const updateData: any = {};
      
      switch (action) {
        case 'cancel':
          updateData.is_cancelled_for_student = true;
          updateData.cancellation_reason = cancellationReason || 'Персональная отмена';
          updateData.attendance_status = 'cancelled';
          break;
          
        case 'restore':
          updateData.is_cancelled_for_student = false;
          updateData.cancellation_reason = null;
          updateData.attendance_status = 'not_marked';
          break;
          
        case 'free':
          updateData.payment_status = 'free';
          break;
          
        case 'paid':
          updateData.payment_status = 'paid';
          break;
          
        case 'bonus':
          updateData.payment_status = 'bonus';
          break;
      }

      // Check if student session record exists
      if (studentSessionData?.id) {
        // Update existing record
        const { error } = await supabase
          .from('student_lesson_sessions')
          .update(updateData)
          .eq('id', studentSessionData.id);

        if (error) throw error;
      } else {
        // Create new record if it doesn't exist
        const { error } = await supabase
          .from('student_lesson_sessions')
          .insert({
            lesson_session_id: sessionId,
            student_id: studentId,
            attendance_status: 'not_marked',
            ...updateData
          });

        if (error) throw error;
      }

      const actionLabels = {
        cancel: 'отменено для ученика',
        restore: 'восстановлено для ученика',
        free: 'отмечено как бесплатное',
        paid: 'отмечено как оплаченное',
        bonus: 'отмечено как бонусное'
      };

      toast({
        title: "Успешно",
        description: `Занятие ${actionLabels[action]}`,
      });

      // Invalidate caches for immediate UI update
      queryClient.invalidateQueries({ queryKey: ['student-group-lesson-sessions', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-group-payment-stats', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-details', studentId] });
      // Force refetch
      queryClient.refetchQueries({ queryKey: ['student-group-lesson-sessions', studentId] });
      queryClient.refetchQueries({ queryKey: ['student-group-payment-stats', studentId] });

      onStatusUpdated?.();
      onOpenChange(false);
      setCancellationReason("");
    } catch (error) {
      console.error('Error updating student status:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус занятия",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusLabel = (status: string | null) => {
    switch (status) {
      case 'paid': return 'Оплачено';
      case 'not_paid': return 'Не оплачено';
      case 'free': return 'Бесплатное';
      case 'bonus': return 'Бонусное';
      default: return 'Не указано';
    }
  };

  const getPaymentStatusColor = (status: string | null) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-300';
      case 'not_paid': return 'bg-red-100 text-red-800 border-red-300';
      case 'free': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'bonus': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!sessionData) return null;

  const isCancelled = studentSessionData?.is_cancelled_for_student || sessionData.status === 'cancelled';
  const paymentStatus = studentSessionData?.payment_status || 'not_paid';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Управление занятием для ученика
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информация о занятии */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Группа:</span>
              <span>{sessionData.learning_groups?.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Дата:</span>
              <span>
                {lessonDate && format(lessonDate, 'dd MMMM yyyy (EEEE)', { locale: ru })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Время:</span>
              <span>{sessionData.start_time} - {sessionData.end_time}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold">Статус группы:</span>
              <Badge variant="outline">
                {sessionData.status === 'scheduled' ? 'Запланировано' :
                 sessionData.status === 'completed' ? 'Проведено' :
                 sessionData.status === 'cancelled' ? 'Отменено' :
                 sessionData.status === 'free' ? 'Бесплатное' :
                 sessionData.status}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold">Статус для ученика:</span>
              <Badge variant={isCancelled ? "destructive" : "default"}>
                {isCancelled ? 'Отменено' : 'Активно'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold">Оплата для ученика:</span>
              <Badge className={getPaymentStatusColor(paymentStatus)}>
                {getPaymentStatusLabel(paymentStatus)}
              </Badge>
            </div>
          </div>

          {/* Персональные действия для ученика */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-orange-600">
              ⚠️ Эти действия влияют только на данного ученика, не на группу
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              {!isCancelled ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => updateStudentStatus('cancel')}
                    disabled={loading}
                    className="justify-start gap-2"
                  >
                    <UserX className="h-4 w-4 text-red-600" />
                    Отменить для ученика
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => updateStudentStatus('free')}
                    disabled={loading || paymentStatus === 'free'}
                    className="justify-start gap-2"
                  >
                    <Gift className="h-4 w-4 text-blue-600" />
                    Бесплатное
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => updateStudentStatus('bonus')}
                    disabled={loading || paymentStatus === 'bonus'}
                    className="justify-start gap-2"
                  >
                    <Gift className="h-4 w-4 text-purple-600" />
                    Бонусное
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => updateStudentStatus('paid')}
                    disabled={loading || paymentStatus === 'paid'}
                    className="justify-start gap-2"
                  >
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Оплачено
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => updateStudentStatus('restore')}
                  disabled={loading || sessionData.status === 'cancelled'}
                  className="justify-start gap-2 col-span-2"
                >
                  <XCircle className="h-4 w-4 text-green-600" />
                  Восстановить занятие
                </Button>
              )}
            </div>

            {!isCancelled && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Причина отмены (опционально):
                </label>
                <Textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Укажите причину отмены для ученика..."
                  rows={2}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
