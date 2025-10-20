import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useCreateLessonSession, LessonSession } from "@/hooks/useLessonSessions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreateMakeupLessonModalProps {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateMakeupLessonModal = ({ session, open, onOpenChange }: CreateMakeupLessonModalProps) => {
  const [makeupDate, setMakeupDate] = useState<Date>();
  const [startTime, setStartTime] = useState(session?.start_time || "");
  const [endTime, setEndTime] = useState(session?.end_time || "");
  const [classroom, setClassroom] = useState(session?.classroom || "");
  const [notes, setNotes] = useState("");
  
  const createSession = useCreateLessonSession();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!makeupDate || !startTime || !endTime || !session) return;

    try {
      await createSession.mutateAsync({
        group_id: session.group_id,
        teacher_name: session.teacher_name,
        branch: session.branch,
        classroom: classroom,
        lesson_date: format(makeupDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        day_of_week: format(makeupDate, 'EEEE').toLowerCase() as LessonSession['day_of_week'],
        status: 'scheduled',
        notes: `Замещающее занятие. ${notes}`.trim(),
      });

      toast({
        title: "Замещающее занятие создано",
        description: `Дата: ${format(makeupDate, 'd MMMM yyyy', { locale: ru })} в ${startTime}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating makeup session:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать замещающее занятие",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Создать замещающее занятие
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {session && (
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <div className="font-medium">{session.learning_groups?.name || 'Группа'}</div>
              <div className="text-sm text-muted-foreground">
                Преподаватель: {session.teacher_name}
              </div>
              <div className="text-sm text-muted-foreground">
                Филиал: {session.branch}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Дата замещающего занятия</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !makeupDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {makeupDate ? format(makeupDate, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={makeupDate}
                  onSelect={setMakeupDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Время начала</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Время окончания</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Аудитория</Label>
            <Input
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              placeholder="Введите номер аудитории"
            />
          </div>

          <div className="space-y-2">
            <Label>Примечания</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!makeupDate || !startTime || !endTime || createSession.isPending}
          >
            {createSession.isPending ? "Создается..." : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
