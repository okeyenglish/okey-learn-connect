import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, User, BookOpen, MapPin, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateIndividualLesson, IndividualLesson } from "@/hooks/useIndividualLessons";
import { getBranchesForSelect } from "@/lib/branches";

interface AddIndividualLessonModalProps {
  onLessonAdded?: () => void;
}

export const AddIndividualLessonModal = ({ onLessonAdded }: AddIndividualLessonModalProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_name: "",
    branch: "",
    subject: "Английский",
    level: "",
    category: "all" as const,
    lesson_type: "individual",
    status: "active" as const,
    academic_hours: "",
    debt_hours: "",
    teacher_name: "",
    schedule_days: [] as string[],
    schedule_time: "",
    lesson_location: "office",
    is_skype_only: false,
    period_start: "",
    period_end: "",
    price_per_lesson: "",
    audit_location: "",
    description: "",
    notes: ""
  });
  
  const { toast } = useToast();
  const createLesson = useCreateIndividualLesson();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const lessonData: Omit<IndividualLesson, 'id' | 'created_at' | 'updated_at'> = {
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
        price_per_lesson: formData.price_per_lesson ? parseFloat(formData.price_per_lesson) : undefined,
        audit_location: formData.audit_location || undefined,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        is_active: true
      };

      await createLesson.mutateAsync(lessonData);

      toast({
        title: "Успешно",
        description: "Новое индивидуальное занятие добавлено"
      });

      // Reset form
      setFormData({
        student_name: "",
        branch: "",
        subject: "Английский",
        level: "",
        category: "all",
        lesson_type: "individual",
        status: "active",
        academic_hours: "",
        debt_hours: "",
        teacher_name: "",
        schedule_days: [],
        schedule_time: "",
        lesson_location: "office",
        is_skype_only: false,
        period_start: "",
        period_end: "",
        price_per_lesson: "",
        audit_location: "",
        description: "",
        notes: ""
      });
      
      setOpen(false);
      onLessonAdded?.();

    } catch (error) {
      console.error('Error adding individual lesson:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить индивидуальное занятие",
        variant: "destructive"
      });
    }
  };

  const branches = getBranchesForSelect();
  const levels = [
    "Super Safari 1", "Super Safari 2", "Super Safari 3",
    "Kids Box Starter", "Kids Box 1", "Kids Box 2", "Kids Box 3", "Kids Box 4", "Kids Box 5", "Kids Box 6",
    "Prepare 1", "Prepare 2", "Prepare 3", "Prepare 4", "Prepare 5", "Prepare 6",
    "Empower 1", "Empower 2", "Empower 3", "Empower 4", "Empower 5",
    "Focus 4", "Школьная программа", "Немецкий"
  ];

  const days = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white">
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden p-0">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <User className="h-6 w-6" />
              </div>
              Добавить индивидуальное занятие
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      <User className="h-4 w-4 text-green-600" />
                      ФИО ученика *
                    </Label>
                    <Input
                      value={formData.student_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, student_name: e.target.value }))}
                      placeholder="Например: Агафонов А. А."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Филиал *
                    </Label>
                    <Select
                      value={formData.branch}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите филиал" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(branch => (
                          <SelectItem key={branch.value} value={branch.label}>
                            {branch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Дисциплина</Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Английский">Английский</SelectItem>
                        <SelectItem value="Немецкий">Немецкий</SelectItem>
                        <SelectItem value="Французский">Французский</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      <BookOpen className="h-4 w-4 text-green-600" />
                      Уровень *
                    </Label>
                    <Select
                      value={formData.level}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите уровень" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {levels.map(level => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Категория</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="preschool">Дошкольники</SelectItem>
                        <SelectItem value="school">Школьники</SelectItem>
                        <SelectItem value="adult">Взрослые</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Ак. часов</Label>
                    <Input
                      type="number"
                      value={formData.academic_hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, academic_hours: e.target.value }))}
                      placeholder="39"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Долг часов</Label>
                    <Input
                      type="number"
                      value={formData.debt_hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, debt_hours: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Преподаватель</Label>
                    <Input
                      value={formData.teacher_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, teacher_name: e.target.value }))}
                      placeholder="Имя преподавателя"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Тип занятия</Label>
                    <Select
                      value={formData.lesson_location}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, lesson_location: value }))}
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
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    Дни занятий
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {days.map(day => (
                      <Button
                        key={day}
                        type="button"
                        variant={formData.schedule_days.includes(day) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(day)}
                        className={formData.schedule_days.includes(day) ? "bg-green-600 text-white" : ""}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Время занятий</Label>
                    <Input
                      value={formData.schedule_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                      placeholder="19:10-19:50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Цена за занятие
                    </Label>
                    <Input
                      type="number"
                      value={formData.price_per_lesson}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_per_lesson: e.target.value }))}
                      placeholder="1200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Период начала</Label>
                    <Input
                      type="date"
                      value={formData.period_start}
                      onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Период окончания</Label>
                    <Input
                      type="date"
                      value={formData.period_end}
                      onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Аудит</Label>
                  <Input
                    value={formData.audit_location}
                    onChange={(e) => setFormData(prev => ({ ...prev, audit_location: e.target.value }))}
                    placeholder="LAS VEGAS, CAMBRIDGE, На территории ученика"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skype"
                      checked={formData.is_skype_only}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_skype_only: checked as boolean }))}
                    />
                    <Label htmlFor="skype" className="text-sm font-normal cursor-pointer">
                      Только по Skype
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Дополнительная информация об индивидуальном занятии"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Отменить
              </Button>
              <Button
                type="submit"
                disabled={createLesson.isPending}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {createLesson.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};