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
  
  const [applyFromDate, setApplyFromDate] = useState<string>("");
  const [applyToDate, setApplyToDate] = useState<string>("");
  const [hasCompletedSessions, setHasCompletedSessions] = useState(false);
  
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

  const [timeSelection, setTimeSelection] = useState({
    startHour: '',
    startMinute: '',
    duration: '60' // по умолчанию 60 минут
  });

  useEffect(() => {
    if (lessonId && open) {
      loadLessonData();
    }
  }, [lessonId, open]);

  useEffect(() => {
    // Обновляем timeSelection когда загружаются данные
    if (formData.schedule_time) {
      const parsed = parseTimeRange(formData.schedule_time);
      setTimeSelection({
        startHour: parsed.startHour,
        startMinute: parsed.startMinute,
        duration: '60' // можно вычислить из разницы времен, но пока оставим по умолчанию
      });
    }
  }, [formData.schedule_time]);

  useEffect(() => {
    // Формируем строку времени из выбранных значений
    const { startHour, startMinute, duration } = timeSelection;
    if (startHour && startMinute && duration) {
      // Вычисляем время окончания
      const startMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
      const endMinutes = startMinutes + parseInt(duration);
      const endHour = Math.floor(endMinutes / 60).toString().padStart(2, '0');
      const endMinute = (endMinutes % 60).toString().padStart(2, '0');
      
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
        
        // Проверяем наличие проведенных занятий
        const { data: sessions } = await supabase
          .from('individual_lesson_sessions')
          .select('lesson_date, status')
          .eq('individual_lesson_id', lessonId)
          .neq('status', 'scheduled')
          .order('lesson_date', { ascending: false })
          .limit(1);
        
        if (sessions && sessions.length > 0) {
          setHasCompletedSessions(true);
          // Устанавливаем минимальную дату применения - следующий день после последнего проведенного
          const lastCompletedDate = new Date(sessions[0].lesson_date);
          lastCompletedDate.setDate(lastCompletedDate.getDate() + 1);
          setApplyFromDate(lastCompletedDate.toISOString().split('T')[0]);
          // По умолчанию дата окончания - конец курса
          setApplyToDate(data.period_end || "");
        } else {
          setHasCompletedSessions(false);
          setApplyFromDate("");
          setApplyToDate("");
        }
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
      // Если есть проведенные занятия и указана дата применения
      if (hasCompletedSessions && applyFromDate) {
        // Для индивидуальных занятий преподаватель, филиал и время хранятся 
        // только в основной таблице individual_lessons
        // Обновляем только основную запись
        await updateLesson.mutateAsync({
          id: lessonId,
          branch: formData.branch,
          teacher_name: formData.teacher_name || undefined,
          schedule_time: formData.schedule_time || undefined,
          audit_location: formData.audit_location || undefined,
          schedule_days: formData.schedule_days.length > 0 ? formData.schedule_days : undefined,
        });
        
        const fromDateStr = new Date(applyFromDate).toLocaleDateString('ru-RU');
        const toDateStr = applyToDate ? ` по ${new Date(applyToDate).toLocaleDateString('ru-RU')}` : '';
        
        toast({
          title: "Успешно",
          description: `Изменения применены к занятиям с ${fromDateStr}${toDateStr}`
        });
      } else {
        // Обычное обновление для всех занятий
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
      }

      onOpenChange(false);
      onLessonUpdated?.();
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить данные занятия",
        variant: "destructive"
      });
    }
  };

  // Автоматический расчет академических часов
  const academicHoursPerDay = timeSelection.duration ? (parseInt(timeSelection.duration) / 40).toFixed(1) : "1";
  
  // Расчет общего количества академических часов
  const calculateTotalAcademicHours = () => {
    if (!formData.period_start || !formData.period_end || !formData.schedule_days.length || !timeSelection.duration) {
      return "0";
    }
    
    const start = new Date(formData.period_start);
    const end = new Date(formData.period_end);
    const dayMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };
    
    let lessonCount = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = Object.keys(dayMap).find(key => dayMap[key] === currentDate.getDay());
      if (dayOfWeek && formData.schedule_days.includes(dayOfWeek)) {
        lessonCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const hoursPerLesson = parseInt(timeSelection.duration) / 40;
    return (lessonCount * hoursPerLesson).toFixed(1);
  };
  
  const totalAcademicHours = calculateTotalAcademicHours();

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Редактирование расписания для {formData.student_name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Применить изменения с даты (если есть проведенные занятия) */}
            {hasCompletedSessions && (
              <div className="space-y-3 p-3 border border-warning/20 bg-warning/5 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="apply_from_date" className="text-sm font-medium">
                      Применить с:
                    </Label>
                    <Input
                      id="apply_from_date"
                      type="date"
                      value={applyFromDate}
                      onChange={(e) => setApplyFromDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="apply_to_date" className="text-sm font-medium">
                      Применить до:
                    </Label>
                    <Input
                      id="apply_to_date"
                      type="date"
                      value={applyToDate}
                      onChange={(e) => setApplyToDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Изменения применятся к занятиям в указанном диапазоне
                </p>
              </div>
            )}

            {/* Основная информация */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch" className="text-sm">Филиал</Label>
                <Select 
                  value={formData.branch} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, branch: value });
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
                <div className="space-y-1.5">
                  <Label htmlFor="audit_location" className="text-sm">Аудитория</Label>
                  <Select 
                    value={formData.audit_location} 
                    onValueChange={(value) => setFormData({ ...formData, audit_location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите" />
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

              <div className="space-y-1.5">
                <Label htmlFor="teacher_name" className="text-sm">Преподаватель</Label>
                <Select 
                  value={formData.teacher_name} 
                  onValueChange={(value) => setFormData({ ...formData, teacher_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-[100]">
                    {teachers.map((teacher, index) => {
                      const fullName = getTeacherFullName(teacher);
                      return (
                        <SelectItem key={`${teacher.id}-${index}`} value={fullName}>
                          {fullName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Период (если нет проведенных занятий) */}
            {!hasCompletedSessions && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Период начала</Label>
                  <Input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Период окончания</Label>
                  <Input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Расписание */}
            <div className="space-y-2">
              <Label className="text-sm">Дни недели</Label>
              <div className="flex gap-2 flex-wrap">
                {weekDays.map((day) => (
                  <div key={day.value} className="flex items-center space-x-1.5">
                    <Checkbox
                      id={day.value}
                      checked={formData.schedule_days.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value)}
                    />
                    <Label htmlFor={day.value} className="cursor-pointer text-sm font-normal">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Время и продолжительность */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Время начала</Label>
                <div className="flex items-center gap-1">
                  <Select 
                    value={timeSelection.startHour} 
                    onValueChange={(value) => setTimeSelection(prev => ({ ...prev, startHour: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="ЧЧ" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-[100]">
                      {hours.map((hour) => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm">:</span>
                  <Select 
                    value={timeSelection.startMinute} 
                    onValueChange={(value) => setTimeSelection(prev => ({ ...prev, startMinute: value }))}
                  >
                    <SelectTrigger className="w-full">
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

              <div className="space-y-1.5">
                <Label htmlFor="duration" className="text-sm">Продолжительность</Label>
                <Select 
                  value={timeSelection.duration} 
                  onValueChange={(value) => setTimeSelection(prev => ({ ...prev, duration: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-[100]">
                    <SelectItem value="40">40 мин</SelectItem>
                    <SelectItem value="60">60 мин</SelectItem>
                    <SelectItem value="80">80 мин</SelectItem>
                    <SelectItem value="100">100 мин</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="academic_hours_per_day" className="text-sm">Ак. ч./день</Label>
                <Input
                  id="academic_hours_per_day"
                  type="text"
                  value={academicHoursPerDay}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Академические часы */}
            <div className="space-y-1.5">
              <Label htmlFor="academic_hours" className="text-sm">Ак. часов всего</Label>
              <Input
                id="academic_hours"
                type="text"
                value={totalAcademicHours}
                readOnly
                className="bg-muted"
              />
            </div>

            {/* Кнопки */}
            <div className="flex justify-end gap-2 pt-2 border-t">
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
