import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface GroupLessonStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onStatusUpdated?: () => void;
}

export function GroupLessonStatusModal({
  open,
  onOpenChange,
  sessionId,
  onStatusUpdated,
}: GroupLessonStatusModalProps) {
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (sessionId && open) {
      loadSessionData();
    }
  }, [sessionId, open]);

  const loadSessionData = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          *,
          learning_groups(name, subject),
          lessons(title, lesson_number)
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setSessionData(data);
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные занятия",
        variant: "destructive",
      });
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('lesson_sessions')
        .update({ status: newStatus as any })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: `Статус занятия изменён на "${getStatusLabel(newStatus)}"`,
      });

      onStatusUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус занятия",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Запланировано';
      case 'completed': return 'Проведено';
      case 'cancelled': return 'Отменено';
      case 'rescheduled': return 'Перенесено';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  if (!sessionData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Управление занятием
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
                {format(new Date(sessionData.lesson_date), 'dd MMMM yyyy (EEEE)', { locale: ru })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Время:</span>
              <span>{sessionData.start_time} - {sessionData.end_time}</span>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Преподаватель:</span>
              <span>{sessionData.teacher_name}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Аудитория:</span>
              <span>{sessionData.classroom}</span>
            </div>

            {sessionData.lessons && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Урок:</span>
                <span>
                  №{sessionData.lessons.lesson_number} - {sessionData.lessons.title}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-semibold">Текущий статус:</span>
              <Badge className={getStatusColor(sessionData.status)}>
                {getStatusLabel(sessionData.status)}
              </Badge>
            </div>
          </div>

          {/* Действия со статусом */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Изменить статус:</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => updateStatus('completed')}
                disabled={loading || sessionData.status === 'completed'}
                className="justify-start gap-2"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
                Проведено
              </Button>

              <Button
                variant="outline"
                onClick={() => updateStatus('cancelled')}
                disabled={loading || sessionData.status === 'cancelled'}
                className="justify-start gap-2"
              >
                <XCircle className="h-4 w-4 text-red-600" />
                Отменено
              </Button>

              <Button
                variant="outline"
                onClick={() => updateStatus('rescheduled')}
                disabled={loading || sessionData.status === 'rescheduled'}
                className="justify-start gap-2"
              >
                <RotateCcw className="h-4 w-4 text-yellow-600" />
                Перенесено
              </Button>

              <Button
                variant="outline"
                onClick={() => updateStatus('scheduled')}
                disabled={loading || sessionData.status === 'scheduled'}
                className="justify-start gap-2"
              >
                <Calendar className="h-4 w-4 text-blue-600" />
                Запланировано
              </Button>
            </div>
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
