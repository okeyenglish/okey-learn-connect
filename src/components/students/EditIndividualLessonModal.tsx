import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateIndividualLesson } from "@/hooks/useIndividualLessons";
import { getBranchesForSelect } from "@/lib/branches";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { useProficiencyLevels } from "@/hooks/useReferences";
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
    category: "all" as "preschool" | "school" | "adult" | "all",
    lesson_type: "individual",
    status: "active" as "reserve" | "forming" | "active" | "suspended" | "finished",
    academic_hours: "",
    debt_hours: "",
    teacher_name: "",
    schedule_days: [] as string[],
    schedule_time: "",
    lesson_location: "office",
    is_skype_only: false,
    period_start: "",
    period_end: "",
    lesson_start_month: "",
    lesson_end_month: "",
    price_per_lesson: "",
    audit_location: "",
    description: "",
    notes: ""
  });
  
  const { toast } = useToast();
  const updateLesson = useUpdateIndividualLesson();
  const { data: proficiencyLevels } = useProficiencyLevels();
  const { teachers } = useTeachers();

  useEffect(() => {
    if (lessonId && open) {
      loadLessonData();
    }
  }, [lessonId, open]);

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
          category: data.category || "all",
          lesson_type: data.lesson_type || "individual",
          status: data.status || "active",
          academic_hours: data.academic_hours?.toString() || "",
          debt_hours: data.debt_hours?.toString() || "",
          teacher_name: data.teacher_name || "",
          schedule_days: data.schedule_days || [],
          schedule_time: data.schedule_time || "",
          lesson_location: data.lesson_location || "office",
          is_skype_only: data.is_skype_only || false,
          period_start: data.period_start || "",
          period_end: data.period_end || "",
          lesson_start_month: data.lesson_start_month || "",
          lesson_end_month: data.lesson_end_month || "",
          price_per_lesson: data.price_per_lesson?.toString() || "",
          audit_location: data.audit_location || "",
          description: data.description || "",
          notes: data.notes || ""
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
        student_name: formData.student_name,
        branch: formData.branch,
        subject: formData.subject,
        level: formData.level,
        category: formData.category,
        lesson_type: formData.lesson_type,
        status: formData.status,
        academic_hours: formData.academic_hours ? parseFloat(formData.academic_hours) : undefined,
        debt_hours: formData.debt_hours ? parseFloat(formData.debt_hours) : undefined,
        teacher_name: formData.teacher_name || undefined,
        schedule_days: formData.schedule_days.length > 0 ? formData.schedule_days : undefined,
        schedule_time: formData.schedule_time || undefined,
        lesson_location: formData.lesson_location || undefined,
        is_skype_only: formData.is_skype_only,
        period_start: formData.period_start || undefined,
        period_end: formData.period_end || undefined,
        lesson_start_month: formData.lesson_start_month || undefined,
        lesson_end_month: formData.lesson_end_month || undefined,
        price_per_lesson: formData.price_per_lesson ? parseFloat(formData.price_per_lesson) : undefined,
        audit_location: formData.audit_location || undefined,
        description: formData.description || undefined,
        notes: formData.notes || undefined
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Редактирование индивидуального занятия</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="main">Основное</TabsTrigger>
                <TabsTrigger value="schedule">Расписание</TabsTrigger>
                <TabsTrigger value="finance">Финансы</TabsTrigger>
                <TabsTrigger value="additional">Дополнительно</TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student_name">Имя студента *</Label>
                    <Input
                      id="student_name"
                      value={formData.student_name}
                      onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branch">Филиал *</Label>
                    <Select 
                      value={formData.branch} 
                      onValueChange={(value) => setFormData({ ...formData, branch: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите филиал" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.value} value={branch.value}>
                            {branch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Предмет *</Label>
                    <Select 
                      value={formData.subject} 
                      onValueChange={(value) => setFormData({ ...formData, subject: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Английский">Английский</SelectItem>
                        <SelectItem value="Немецкий">Немецкий</SelectItem>
                        <SelectItem value="Французский">Французский</SelectItem>
                        <SelectItem value="Испанский">Испанский</SelectItem>
                        <SelectItem value="Китайский">Китайский</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">Уровень *</Label>
                    <Select 
                      value={formData.level} 
                      onValueChange={(value) => setFormData({ ...formData, level: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите уровень" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-[100]">
                        {proficiencyLevels?.filter(level => level.is_active).map((level) => (
                          <SelectItem key={level.id} value={level.name}>
                            {level.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Категория</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все возрасты</SelectItem>
                        <SelectItem value="preschool">Дошкольники</SelectItem>
                        <SelectItem value="school">Школьники</SelectItem>
                        <SelectItem value="adult">Взрослые</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Статус</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reserve">Резерв</SelectItem>
                        <SelectItem value="forming">Формируется</SelectItem>
                        <SelectItem value="active">Активна</SelectItem>
                        <SelectItem value="suspended">Приостановлена</SelectItem>
                        <SelectItem value="finished">Завершена</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacher_name">Преподаватель</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Дни недели</Label>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={day.value}
                          checked={formData.schedule_days.includes(day.value)}
                          onCheckedChange={() => handleDayToggle(day.value)}
                        />
                        <Label htmlFor={day.value} className="cursor-pointer">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule_time">Время занятий</Label>
                  <Input
                    id="schedule_time"
                    value={formData.schedule_time}
                    onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                    placeholder="Например: 10:00-11:30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period_start">Дата начала</Label>
                    <Input
                      id="period_start"
                      type="date"
                      value={formData.period_start}
                      onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="period_end">Дата окончания</Label>
                    <Input
                      id="period_end"
                      type="date"
                      value={formData.period_end}
                      onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="lesson_location">Место проведения</Label>
                  <Select 
                    value={formData.lesson_location} 
                    onValueChange={(value) => setFormData({ ...formData, lesson_location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">В офисе</SelectItem>
                      <SelectItem value="skype">По Skype</SelectItem>
                      <SelectItem value="home">На дому</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_skype_only"
                    checked={formData.is_skype_only}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_skype_only: checked as boolean })}
                  />
                  <Label htmlFor="is_skype_only" className="cursor-pointer">
                    Только онлайн (Skype)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audit_location">Аудитория</Label>
                  <Input
                    id="audit_location"
                    value={formData.audit_location}
                    onChange={(e) => setFormData({ ...formData, audit_location: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="finance" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="academic_hours">Академических часов</Label>
                    <Input
                      id="academic_hours"
                      type="number"
                      step="0.5"
                      value={formData.academic_hours}
                      onChange={(e) => setFormData({ ...formData, academic_hours: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="debt_hours">Долг (часы)</Label>
                    <Input
                      id="debt_hours"
                      type="number"
                      step="0.5"
                      value={formData.debt_hours}
                      onChange={(e) => setFormData({ ...formData, debt_hours: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_per_lesson">Стоимость урока (₽)</Label>
                  <Input
                    id="price_per_lesson"
                    type="number"
                    step="0.01"
                    value={formData.price_per_lesson}
                    onChange={(e) => setFormData({ ...formData, price_per_lesson: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lesson_start_month">Месяц начала занятий</Label>
                    <Input
                      id="lesson_start_month"
                      value={formData.lesson_start_month}
                      onChange={(e) => setFormData({ ...formData, lesson_start_month: e.target.value })}
                      placeholder="Например: Сентябрь 2024"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lesson_end_month">Месяц окончания занятий</Label>
                    <Input
                      id="lesson_end_month"
                      value={formData.lesson_end_month}
                      onChange={(e) => setFormData({ ...formData, lesson_end_month: e.target.value })}
                      placeholder="Например: Май 2025"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Заметки</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Дополнительная информация о занятии..."
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={updateLesson.isPending}
              >
                {updateLesson.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Сохранить
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};