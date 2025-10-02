import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateIndividualLesson } from "@/hooks/useIndividualLessons";
import { getBranchesForSelect } from "@/lib/branches";
import { supabase } from "@/integrations/supabase/client";
import { useClassrooms } from "@/hooks/useReferences";
import { useTeachers, getTeacherFullName } from "@/hooks/useTeachers";

interface EditIndividualLessonModalProps {
  lessonId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLessonUpdated?: () => void;
}

export const EditIndividualLessonModal = ({ 
  lessonId, 
  open, 
  onOpenChange, 
  onLessonUpdated 
}: EditIndividualLessonModalProps) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    student_name: "",
    branch: "",
    subject: "Английский",
    level: "",
    teacher_name: "",
    schedule_days: [] as string[],
    schedule_time: "",
    lesson_location: "office",
    period_start: "",
    period_end: "",
    academic_hours: "",
    academic_hours_per_day: "1",
    break_minutes: "0",
    audit_location: "",
    color: "#ffffff",
  });
  
  const { toast } = useToast();
  const updateLesson = useUpdateIndividualLesson();
  const { teachers } = useTeachers();
  const { data: classrooms } = useClassrooms();

  // Генерация часов и минут для выбора времени
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  // Парсинг времени из строки формата "HH:mm-HH:mm"
  const parseTimeRange = (timeRange: string) => {
    if (!timeRange || !timeRange.includes('-')) return { startHour: '', startMinute: '', endHour: '', endMinute: '' };
    const [start, end] = timeRange.split('-');
    const [startHour, startMinute] = start.split(':');
    const [endHour, endMinute] = end.split(':');
    return { startHour, startMinute, endHour, endMinute };
  };

  const [timeSelection, setTimeSelection] = useState(parseTimeRange(formData.schedule_time));

  useEffect(() => {
    if (lessonId && open) {
      loadLessonData();
    }
  }, [lessonId, open]);

  useEffect(() => {
    // Обновляем timeSelection когда загружаются данные
    if (formData.schedule_time) {
      setTimeSelection(parseTimeRange(formData.schedule_time));
    }
  }, [formData.schedule_time]);

  useEffect(() => {
    // Формируем строку времени из выбранных значений
    const { startHour, startMinute, endHour, endMinute } = timeSelection;
    if (startHour && startMinute && endHour && endMinute) {
      const timeRange = `${startHour}:${startMinute}-${endHour}:${endMinute}`;
      if (timeRange !== formData.schedule_time) {
        setFormData(prev => ({ ...prev, schedule_time: timeRange }));
      }
    }
  }, [timeSelection]);

  const loadLessonData = async () => {
    if (!lessonId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          student_name: data.student_name || "",
          branch: data.branch || "",
          subject: data.subject || "Английский",
          level: data.level || "",
          teacher_name: data.teacher_name || "",
          schedule_days: data.schedule_days || [],
          schedule_time: data.schedule_time || "",
          lesson_location: data.lesson_location || "office",
          period_start: data.period_start || "",
          period_end: data.period_end || "",
          academic_hours: data.academic_hours?.toString() || "",
          academic_hours_per_day: (data as any).academic_hours_per_day?.toString() || "1",
          break_minutes: (data as any).break_minutes?.toString() || "0",
          audit_location: data.audit_location || "",
          color: (data as any).color || "#ffffff",
        });
      }
    } catch (error) {
      console.error('Error loading lesson:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные занятия",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonId) return;
    
    try {
      await updateLesson.mutateAsync({
        id: lessonId,
        branch: formData.branch,
        teacher_name: formData.teacher_name || undefined,
        schedule_days: formData.schedule_days.length > 0 ? formData.schedule_days : undefined,
        schedule_time: formData.schedule_time || undefined,
        lesson_location: formData.lesson_location || undefined,
        period_start: formData.period_start || undefined,
        period_end: formData.period_end || undefined,
        academic_hours: formData.academic_hours ? parseFloat(formData.academic_hours) : undefined,
        audit_location: formData.audit_location || undefined,
      });

      toast({
        title: "Успешно",
        description: "Данные занятия обновлены"
      });

      onOpenChange(false);
      onLessonUpdated?.();
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные занятия",
        variant: "destructive"
      });
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  const branches = getBranchesForSelect();
  const weekDays = [
    { value: "monday", label: "Пн" },
    { value: "tuesday", label: "Вт" },
    { value: "wednesday", label: "Ср" },
    { value: "thursday", label: "Чт" },
    { value: "friday", label: "Пт" },
    { value: "saturday", label: "Сб" },
    { value: "sunday", label: "Вс" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Редактирование расписания для {formData.student_name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Филиал и Аудитория */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Филиал</Label>
                <Select 
                  value={formData.branch} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, branch: value });
                    // Сбрасываем аудиторию при смене филиала
                    if (formData.lesson_location !== 'skype') {
                      setFormData(prev => ({ ...prev, audit_location: '' }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-[100]">
                    {branches.map((branch) => (
                      <SelectItem key={branch.value} value={branch.value}>
                        {branch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.lesson_location !== 'skype' && (
                <div className="space-y-2">
                  <Label htmlFor="audit_location">Аудитория:</Label>
                  <Select 
                    value={formData.audit_location} 
                    onValueChange={(value) => setFormData({ ...formData, audit_location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите аудиторию" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-[100]">
                      {classrooms
                        ?.filter(c => c.is_active && c.branch === formData.branch && !c.is_online)
                        .map((classroom) => (
                          <SelectItem key={classroom.id} value={classroom.name}>
                            {classroom.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Период */}
            <div className="space-y-2">
              <Label>Период:</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  className="flex-1"
                />
                <span className="text-muted-foreground px-2">до</span>
                <Input
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Дни недели */}
            <div className="space-y-2">
              <Label>Дни недели:</Label>
              <div className="flex gap-4">
                {weekDays.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.value}
                      checked={formData.schedule_days.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value)}
                    />
                    <Label htmlFor={day.value} className="cursor-pointer font-normal">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Ак. часов */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="academic_hours">Ак. часов (всего):</Label>
                <Input
                  id="academic_hours"
                  type="number"
                  step="0.5"
                  value={formData.academic_hours}
                  onChange={(e) => setFormData({ ...formData, academic_hours: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="academic_hours_per_day">Ак. часов в день:</Label>
                <Input
                  id="academic_hours_per_day"
                  type="number"
                  step="0.5"
                  value={formData.academic_hours_per_day}
                  onChange={(e) => setFormData({ ...formData, academic_hours_per_day: e.target.value })}
                />
              </div>
            </div>

            {/* Время занятия */}
            <div className="space-y-2">
              <Label>Время занятия:</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Select 
                    value={timeSelection.startHour} 
                    onValueChange={(value) => setTimeSelection(prev => ({ ...prev, startHour: value }))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="ЧЧ" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-[100]">
                      {hours.map((hour) => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>:</span>
                  <Select 
                    value={timeSelection.startMinute} 
                    onValueChange={(value) => setTimeSelection(prev => ({ ...prev, startMinute: value }))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="ММ" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-[100]">
                      {minutes.map((minute) => (
                        <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <span className="text-muted-foreground px-2">до</span>

                <div className="flex items-center gap-1">
                  <Select 
                    value={timeSelection.endHour} 
                    onValueChange={(value) => setTimeSelection(prev => ({ ...prev, endHour: value }))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="ЧЧ" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-[100]">
                      {hours.map((hour) => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>:</span>
                  <Select 
                    value={timeSelection.endMinute} 
                    onValueChange={(value) => setTimeSelection(prev => ({ ...prev, endMinute: value }))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="ММ" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-[100]">
                      {minutes.map((minute) => (
                        <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Перерыв */}
            <div className="space-y-2">
              <Label htmlFor="break_minutes">Перерыв (мин):</Label>
              <Select 
                value={formData.break_minutes} 
                onValueChange={(value) => setFormData({ ...formData, break_minutes: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-[100]">
                  {[0, 5, 10, 15, 20, 30].map((min) => (
                    <SelectItem key={min} value={min.toString()}>{min}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Преподаватель */}
            <div className="space-y-2">
              <Label htmlFor="teacher_name">Преподаватель:</Label>
              <Select 
                value={formData.teacher_name} 
                onValueChange={(value) => setFormData({ ...formData, teacher_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите преподавателя" />
                </SelectTrigger>
                <SelectContent className="bg-background z-[100]">
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={getTeacherFullName(teacher)}>
                      {getTeacherFullName(teacher)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Цвет */}
            <div className="space-y-2">
              <Label htmlFor="color">Цвет:</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                />
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Отменить
              </Button>
              <Button type="submit" disabled={updateLesson.isPending}>
                {updateLesson.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
