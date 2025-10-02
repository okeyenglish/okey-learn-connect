import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RescheduleIndividualLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  originalDate: Date;
  currentTime?: string;
  currentTeacher?: string;
  currentClassroom?: string;
  onRescheduled?: () => void;
}

export function RescheduleIndividualLessonModal({
  open,
  onOpenChange,
  lessonId,
  originalDate,
  currentTime,
  currentTeacher,
  currentClassroom,
  onRescheduled,
}: RescheduleIndividualLessonModalProps) {
  const [newDate, setNewDate] = useState<Date | undefined>(originalDate);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();

  const handleReschedule = async () => {
    if (!newDate) {
      toast({
        title: "Ошибка",
        description: "Выберите новую дату",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      // Create/Update the new session on the chosen date
      const { error } = await supabase
        .from('individual_lesson_sessions')
        .upsert({
          individual_lesson_id: lessonId,
          lesson_date: format(newDate, 'yyyy-MM-dd'),
          status: 'rescheduled',
          notes: `Перенесено с ${format(originalDate, 'dd.MM.yyyy', { locale: ru })}`,
          created_by: user.id
        }, {
          onConflict: 'individual_lesson_id,lesson_date'
        });

      if (error) throw error;

      const { error: originalError } = await supabase
        .from('individual_lesson_sessions')
        .upsert({
          individual_lesson_id: lessonId,
          lesson_date: format(originalDate, 'yyyy-MM-dd'),
          status: 'rescheduled_out',
          notes: `Перенесено на ${format(newDate, 'dd.MM.yyyy', { locale: ru })}`,
          created_by: user.id
        }, {
          onConflict: 'individual_lesson_id,lesson_date'
        });

      if (originalError) throw originalError;

      toast({
        title: "Успешно",
        description: `Урок перенесен на ${format(newDate, 'dd MMMM yyyy', { locale: ru })}`
      });

      onRescheduled?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error rescheduling lesson:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось перенести урок",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Перенос урока</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Оригинальная дата: {format(originalDate, 'dd MMMM yyyy', { locale: ru })}
            {currentTime && ` • ${currentTime}`}
          </div>
        </DialogHeader>

        <div className="py-2">
          <Calendar
            mode="single"
            selected={newDate}
            onSelect={setNewDate}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={loading || !newDate}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Перенести урок
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
