import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useUpdateLessonSession, useLessonSessions } from "@/hooks/useLessonSessions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RescheduleLessonModalProps {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RescheduleLessonModal = ({ session, open, onOpenChange }: RescheduleLessonModalProps) => {
  const [newDate, setNewDate] = useState<Date>();
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [rescheduleType, setRescheduleType] = useState<'single' | 'all'>('single');
  
  const updateSession = useUpdateLessonSession();
  const { data: allSessions } = useLessonSessions({
    date_from: format(new Date(), 'yyyy-MM-dd')
  });
  const { toast } = useToast();

  const handleReschedule = async () => {
    if (!newDate || !session) return;

    try {
      const updates: any = {
        lesson_date: format(newDate, 'yyyy-MM-dd'),
      };

      if (newStartTime) updates.start_time = newStartTime;
      if (newEndTime) updates.end_time = newEndTime;
      if (reason) updates.notes = `${session.notes || ''}\nПеренесено: ${reason}`.trim();

      if (rescheduleType === 'single') {
        await updateSession.mutateAsync({
          id: session.id,
          data: updates,
        });

        toast({
          title: "Занятие перенесено",
          description: `Новая дата: ${format(newDate, 'd MMMM yyyy', { locale: ru })}`,
        });
      } else {
        // Перенос всех будущих занятий группы
        const futureSessions = allSessions?.filter(s => 
          s.group_id === session.group_id &&
          new Date(s.lesson_date) >= new Date(session.lesson_date) &&
          s.status === 'scheduled'
        ) || [];

        const daysDiff = Math.floor((newDate.getTime() - new Date(session.lesson_date).getTime()) / (1000 * 60 * 60 * 24));

        await Promise.all(
          futureSessions.map(s => {
            const newSessionDate = new Date(s.lesson_date);
            newSessionDate.setDate(newSessionDate.getDate() + daysDiff);
            
            return updateSession.mutateAsync({
              id: s.id,
              data: {
                ...updates,
                lesson_date: format(newSessionDate, 'yyyy-MM-dd'),
              },
            });
          })
        );

        toast({
          title: "Серия занятий перенесена",
          description: `Перенесено занятий: ${futureSessions.length}`,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error rescheduling session:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось перенести занятие",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Перенести занятие
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {session && (
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <div className="font-medium">{session.learning_groups?.name || 'Группа'}</div>
              <div className="text-sm text-muted-foreground">
                Текущая дата: {format(new Date(session.lesson_date), 'd MMMM yyyy', { locale: ru })}
              </div>
              <div className="text-sm text-muted-foreground">
                {session.start_time} - {session.end_time}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Новая дата</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDate ? format(newDate, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Новое время начала (опционально)</Label>
              <Input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                placeholder={session?.start_time}
              />
            </div>
            <div className="space-y-2">
              <Label>Новое время окончания (опционально)</Label>
              <Input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                placeholder={session?.end_time}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Тип переноса</Label>
            <RadioGroup value={rescheduleType} onValueChange={(value) => setRescheduleType(value as 'single' | 'all')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="font-normal cursor-pointer">
                  Только это занятие
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  Все будущие занятия этой группы
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Причина переноса</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину переноса занятия..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleReschedule}
            disabled={!newDate || updateSession.isPending}
          >
            {updateSession.isPending ? "Переносится..." : "Перенести"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};