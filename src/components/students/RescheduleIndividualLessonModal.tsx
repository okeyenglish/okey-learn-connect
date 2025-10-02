import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTeachers, getTeacherFullName } from "@/hooks/useTeachers";
import { useClassrooms } from "@/hooks/useReferences";
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
  const [newTime, setNewTime] = useState(currentTime || "");
  const [startHour, setStartHour] = useState(currentTime?.split('-')[0]?.split(':')[0] || "09");
  const [startMinute, setStartMinute] = useState(currentTime?.split('-')[0]?.split(':')[1] || "00");
  const [endHour, setEndHour] = useState(currentTime?.split('-')[1]?.split(':')[0]?.trim() || "10");
  const [endMinute, setEndMinute] = useState(currentTime?.split('-')[1]?.split(':')[1]?.trim() || "00");
  const [newTeacher, setNewTeacher] = useState(currentTeacher || "");
  const [newClassroom, setNewClassroom] = useState(currentClassroom || "");
  const [loading, setLoading] = useState(false);
  const [branch, setBranch] = useState("");
  
  const { toast } = useToast();
  const { teachers = [] } = useTeachers();
  const { data: classrooms = [] } = useClassrooms();

  useEffect(() => {
    const loadLesson = async () => {
      const { data } = await supabase
        .from('individual_lessons')
        .select('branch, teacher_name, schedule_time, lesson_location')
        .eq('id', lessonId)
        .single();
      
      if (data) {
        setBranch(data.branch);
        if (!currentTeacher) setNewTeacher(data.teacher_name || "");
        if (!currentTime && data.schedule_time) {
          const [start, end] = data.schedule_time.split('-');
          if (start) {
            const [h, m] = start.trim().split(':');
            setStartHour(h || "09");
            setStartMinute(m || "00");
          }
          if (end) {
            const [h, m] = end.trim().split(':');
            setEndHour(h || "10");
            setEndMinute(m || "00");
          }
        }
        if (!currentClassroom) setNewClassroom(data.lesson_location || "");
      }
    };
    
    if (open) {
      loadLesson();
    }
  }, [open, lessonId, currentTeacher, currentTime, currentClassroom]);

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

      const newTimeStr = `${startHour}:${startMinute} - ${endHour}:${endMinute}`;

      // Determine original session status to decide if it should become cancelled
      const originalDateStr = format(originalDate, 'yyyy-MM-dd');
      const { data: originalSession } = await supabase
        .from('individual_lesson_sessions')
        .select('status')
        .eq('individual_lesson_id', lessonId)
        .eq('lesson_date', originalDateStr)
        .maybeSingle();

      const paidStatuses = ['attended','paid_absence','partially_paid','partially_paid_absence'];
      const makeOriginalCancelled = originalSession && paidStatuses.includes(originalSession.status);

      // Create/Update the new session on the chosen date (orange)
      const { error } = await supabase
        .from('individual_lesson_sessions')
        .upsert({
          individual_lesson_id: lessonId,
          lesson_date: format(newDate, 'yyyy-MM-dd'),
          status: 'rescheduled',
          notes: `Перенесено с ${format(originalDate, 'dd.MM.yyyy', { locale: ru })}${currentTime ? ` ${currentTime}` : ''} на ${newTimeStr}${newTeacher ? ` (${newTeacher})` : ''}${newClassroom ? ` - ${newClassroom}` : ''}`,
          created_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'individual_lesson_id,lesson_date'
        });

      if (error) throw error;

      // Mark original date
      const { error: originalError } = await supabase
        .from('individual_lesson_sessions')
        .upsert({
          individual_lesson_id: lessonId,
          lesson_date: originalDateStr,
          status: makeOriginalCancelled ? 'cancelled' : 'rescheduled_out',
          notes: `Перенесено на ${format(newDate, 'dd.MM.yyyy', { locale: ru })} ${newTimeStr}`,
          created_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'individual_lesson_id,lesson_date'
        });

      if (originalError) throw originalError;

      toast({
        title: "Успешно",
        description: `Урок перенесен на ${format(newDate, 'dd MMMM yyyy', { locale: ru })} ${newTimeStr}`
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


  const availableClassrooms = classrooms.filter(c => 
    c.is_active && (!branch || c.branch === branch)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Перенос урока</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Оригинальная дата: {format(originalDate, 'dd MMMM yyyy', { locale: ru })}
            {currentTime && ` • ${currentTime}`}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                  onClick={(e) => e.stopPropagation()}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDate ? format(newDate, 'dd MMMM yyyy', { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0" 
                align="start"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Время начала</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={startHour} onValueChange={setStartHour}>
                  <SelectTrigger onClick={(e) => e.stopPropagation()}>
                    <SelectValue placeholder="Час" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startMinute} onValueChange={setStartMinute}>
                  <SelectTrigger onClick={(e) => e.stopPropagation()}>
                    <SelectValue placeholder="Мин" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((minute) => (
                      <SelectItem key={minute} value={minute}>
                        {minute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Время окончания</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={endHour} onValueChange={setEndHour}>
                  <SelectTrigger onClick={(e) => e.stopPropagation()}>
                    <SelectValue placeholder="Час" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={endMinute} onValueChange={setEndMinute}>
                  <SelectTrigger onClick={(e) => e.stopPropagation()}>
                    <SelectValue placeholder="Мин" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((minute) => (
                      <SelectItem key={minute} value={minute}>
                        {minute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Преподаватель</Label>
            <Select value={newTeacher} onValueChange={setNewTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите преподавателя" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={getTeacherFullName(teacher)}>
                    {getTeacherFullName(teacher)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Аудитория</Label>
            <Select value={newClassroom} onValueChange={setNewClassroom}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите аудиторию" />
              </SelectTrigger>
              <SelectContent>
                {availableClassrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.name}>
                    {classroom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
