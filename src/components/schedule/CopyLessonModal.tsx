import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Copy } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useCreateLessonSession } from "@/hooks/useLessonSessions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CopyLessonModalProps {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CopyLessonModal = ({ session, open, onOpenChange }: CopyLessonModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const createSession = useCreateLessonSession();
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!selectedDate || !session) return;

    try {
      // Create a copy of the session with new date
      const newSession = {
        ...session,
        lesson_date: format(selectedDate, 'yyyy-MM-dd'),
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
      };

      await createSession.mutateAsync(newSession);

      toast({
        title: "Занятие скопировано",
        description: `Занятие успешно скопировано на ${format(selectedDate, 'd MMMM yyyy', { locale: ru })}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error copying session:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать занятие",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-surface">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <Copy className="h-5 w-5 text-brand" />
            Копировать занятие
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {session && (
            <div className="bg-bg-soft p-3 rounded-lg border border-border/50 space-y-1">
              <div className="font-medium text-text-primary">{session.learning_groups?.name || 'Группа'}</div>
              <div className="text-sm text-text-secondary">
                {session.teacher_name} • {session.classroom}
              </div>
              <div className="text-sm text-text-secondary">
                {session.start_time} - {session.end_time}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-text-secondary">Выберите новую дату</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className={cn(
                    "w-full justify-start text-left font-normal btn-secondary",
                    !selectedDate && "text-text-muted"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-surface border-border/50" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="btn-secondary">
            Отмена
          </Button>
          <Button 
            onClick={handleCopy}
            disabled={!selectedDate || createSession.isPending}
            className="btn-primary"
          >
            {createSession.isPending ? "Копирование..." : "Скопировать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};