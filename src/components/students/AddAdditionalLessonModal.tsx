import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getErrorMessage } from '@/lib/errorUtils';

interface AddAdditionalLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  onAdded?: () => void;
}

export function AddAdditionalLessonModal({
  open,
  onOpenChange,
  lessonId,
  onAdded,
}: AddAdditionalLessonModalProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast({
        title: "Ошибка",
        description: "Выберите дату занятия",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      const lessonDate = format(selectedDate, 'yyyy-MM-dd');

      // Check if session already exists
      const { data: existing } = await supabase
        .from('individual_lesson_sessions')
        .select('id')
        .eq('individual_lesson_id', lessonId)
        .eq('lesson_date', lessonDate)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Ошибка",
          description: "На эту дату уже есть занятие",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data: insertedRows, error } = await supabase
        .from('individual_lesson_sessions')
        .insert({
          individual_lesson_id: lessonId,
          lesson_date: lessonDate,
          status: 'scheduled',
          notes: notes || (time ? `Занятие, время: ${time}` : 'Занятие'),
          is_additional: false,
          created_by: user.id,
        })
        .select('id, lesson_date, status, payment_id')
        .single();

      if (error) throw error;

      // Rebalance payments: ensure the earliest N scheduled lessons are paid (window model)
      const { data: allSessions } = await supabase
        .from('individual_lesson_sessions')
        .select('id, lesson_date, status, payment_id')
        .eq('individual_lesson_id', lessonId)
        .order('lesson_date', { ascending: true });

      const sessions = (allSessions || []) as { id: string; lesson_date: string; status?: string | null; payment_id?: string | null }[];
      const scheduledSorted = sessions.filter(s => !s.status || s.status === 'scheduled');
      const paidScheduled = scheduledSorted
        .map((s, idx) => ({ ...s, idx }))
        .filter(s => !!s.payment_id);

      const windowSize = paidScheduled.length; // сколько занятий сейчас оплачено среди scheduled
      const insertedIdx = scheduledSorted.findIndex(s => s.id === insertedRows.id);

      if (windowSize > 0 && insertedIdx > -1 && insertedIdx < windowSize && !insertedRows.payment_id) {
        // Сдвигаем окно оплаты влево: переносим оплату с самого "правого" оплаченного scheduled на новое более раннее
        const donor = paidScheduled.sort((a, b) => b.idx - a.idx)[0];
        if (donor && donor.id !== insertedRows.id && donor.payment_id) {
          // Назначаем оплату новому занятию
          await supabase
            .from('individual_lesson_sessions')
            .update({ payment_id: donor.payment_id })
            .eq('id', insertedRows.id);

          // Снимаем оплату с донора
          await supabase
            .from('individual_lesson_sessions')
            .update({ payment_id: null })
            .eq('id', donor.id);
        }
      }

      toast({
        title: "Успешно",
        description: "Дополнительное занятие добавлено",
      });

      onAdded?.();
      onOpenChange(false);
      
      // Reset form
      setSelectedDate(undefined);
      setTime("");
      setNotes("");
    } catch (error: unknown) {
      console.error('Error adding additional lesson:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить дополнительное занятие</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Дата занятия</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className={cn("rounded-md border pointer-events-auto")}
              locale={ru}
            />
          </div>

          <div>
            <Label htmlFor="time">Время (необязательно)</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="14:00"
            />
          </div>

          <div>
            <Label htmlFor="notes">Примечание (необязательно)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Описание занятия"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Добавление..." : "Добавить"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
