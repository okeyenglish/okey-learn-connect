import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useIndividualLessons } from '@/hooks/useIndividualLessons';
import { useTeachers, getTeacherFullName } from '@/hooks/useTeachers';
import { useClassrooms } from '@/hooks/useScheduleData';
import { useToast } from '@/hooks/use-toast';
import { calculateLessonPrice, LESSON_DURATIONS, getDurationLabel } from '@/utils/lessonPricing';

interface AddIndividualLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export function AddIndividualLessonModal({ open, onOpenChange, studentId, studentName }: AddIndividualLessonModalProps) {
  const [formData, setFormData] = useState({
    subject: 'Английский',
    level: '',
    teacher_name: '',
    duration: 60,
    price_per_lesson: '',
    schedule_days: [] as string[],
    schedule_time: '',
    start_hour: '09',
    start_minute: '00',
    lesson_location: '',
    notes: '',
    branch: 'Окская',
    period_start: '',
    period_end: ''
  });
  const [loading, setLoading] = useState(false);
  
  const { createIndividualLesson } = useIndividualLessons();
  const { teachers } = useTeachers();
  const { data: classrooms } = useClassrooms(formData.branch);
  const { toast } = useToast();

  // Генерация часов (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  
  // Генерация минут с шагом 5 (0, 5, 10, ..., 55)
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  // Функция для расчета времени окончания
  const calculateEndTime = (startHour: string, startMinute: string, durationMinutes: number) => {
    const startTotalMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
    const endTotalMinutes = startTotalMinutes + durationMinutes;
    const endHour = Math.floor(endTotalMinutes / 60) % 24;
    const endMinute = endTotalMinutes % 60;
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  };

  // Автоматически формируем schedule_time при изменении времени начала или продолжительности
  useEffect(() => {
    const startTime = `${formData.start_hour}:${formData.start_minute}`;
    const endTime = calculateEndTime(formData.start_hour, formData.start_minute, formData.duration);
    setFormData(prev => ({ ...prev, schedule_time: `${startTime}-${endTime}` }));
  }, [formData.start_hour, formData.start_minute, formData.duration]);

  // Автоматически рассчитываем стоимость при изменении продолжительности
  useEffect(() => {
    const price = calculateLessonPrice(formData.duration);
    setFormData(prev => ({ ...prev, price_per_lesson: price.toString() }));
  }, [formData.duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.level || !formData.teacher_name || !formData.period_start || !formData.period_end) {
      toast({
        title: "Ошибка",
        description: "Заполните обязательные поля: уровень, преподаватель, даты начала и окончания",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const lessonData = {
        student_id: studentId,
        student_name: studentName,
        subject: formData.subject,
        level: formData.level,
        teacher_name: formData.teacher_name,
        duration: formData.duration,
        price_per_lesson: formData.price_per_lesson ? parseFloat(formData.price_per_lesson) : null,
        schedule_days: formData.schedule_days,
        schedule_time: formData.schedule_time,
        lesson_location: formData.lesson_location,
        notes: formData.notes,
        branch: formData.branch,
        lesson_type: 'individual' as const,
        status: 'active' as const,
        category: 'all' as const,
        is_active: true,
        period_start: formData.period_start,
        period_end: formData.period_end
      };

      await createIndividualLesson(lessonData);
      
      // Reset form
      setFormData({
        subject: 'Английский',
        level: '',
        teacher_name: '',
        duration: 60,
        price_per_lesson: '',
        schedule_days: [],
        schedule_time: '',
        start_hour: '09',
        start_minute: '00',
        lesson_location: '',
        notes: '',
        branch: 'Окская',
        period_start: '',
        period_end: ''
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating individual lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayValue: string) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(dayValue)
        ? prev.schedule_days.filter(d => d !== dayValue)
        : [...prev.schedule_days, dayValue]
    }));
  };

  const daysOfWeek = [
    { label: 'Пн', value: 'monday' },
    { label: 'Вт', value: 'tuesday' },
    { label: 'Ср', value: 'wednesday' },
    { label: 'Чт', value: 'thursday' },
    { label: 'Пт', value: 'friday' },
    { label: 'Сб', value: 'saturday' },
    { label: 'Вс', value: 'sunday' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Индивидуальные занятия</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Студент</Label>
            <div className="text-sm text-muted-foreground">{studentName}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Предмет</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({...prev, subject: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Английский">Английский</SelectItem>
                  <SelectItem value="Немецкий">Немецкий</SelectItem>
                  <SelectItem value="Французский">Французский</SelectItem>
                  <SelectItem value="Испанский">Испанский</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="level">Уровень *</Label>
              <Select value={formData.level} onValueChange={(value) => setFormData(prev => ({...prev, level: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите уровень" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Elementary">Elementary</SelectItem>
                  <SelectItem value="Pre-Intermediate">Pre-Intermediate</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Upper-Intermediate">Upper-Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="teacher_name">Преподаватель *</Label>
              <Select 
                value={formData.teacher_name} 
                onValueChange={(value) => setFormData(prev => ({...prev, teacher_name: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите преподавателя" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {teachers?.map((teacher) => {
                    const fullName = getTeacherFullName(teacher);
                    return (
                      <SelectItem key={teacher.id} value={fullName}>
                        {fullName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Продолжительность *</Label>
              <Select 
                value={formData.duration.toString()} 
                onValueChange={(value) => setFormData(prev => ({...prev, duration: parseInt(value)}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LESSON_DURATIONS.map(duration => (
                    <SelectItem key={duration} value={duration.toString()}>
                      {getDurationLabel(duration)} — {calculateLessonPrice(duration)} ₽
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Стоимость урока:</span>
              <span className="text-lg font-bold">{formData.price_per_lesson} ₽</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Автоматически рассчитывается на основе продолжительности
            </div>
          </div>

          <div>
            <Label>Дни недели</Label>
            <div className="flex gap-2 flex-wrap">
              {daysOfWeek.map(({ label, value }) => (
                <Button
                  key={value}
                  type="button"
                  variant={formData.schedule_days.includes(value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDayToggle(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Время начала</Label>
              <div className="flex gap-2">
                <Select 
                  value={formData.start_hour} 
                  onValueChange={(value) => setFormData(prev => ({...prev, start_hour: value}))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {hours.map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="flex items-center">:</span>
                <Select 
                  value={formData.start_minute} 
                  onValueChange={(value) => setFormData(prev => ({...prev, start_minute: value}))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {minutes.map((minute) => (
                      <SelectItem key={minute} value={minute}>
                        {minute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Окончание: {calculateEndTime(formData.start_hour, formData.start_minute, formData.duration)}
              </div>
            </div>

            <div>
              <Label htmlFor="lesson_location">Аудитория</Label>
              <Select 
                value={formData.lesson_location} 
                onValueChange={(value) => setFormData(prev => ({...prev, lesson_location: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите аудиторию" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {classrooms?.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.name}>
                      {classroom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="branch">Филиал</Label>
            <Select value={formData.branch} onValueChange={(value) => setFormData(prev => ({...prev, branch: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Окская">Окская</SelectItem>
                <SelectItem value="Котельники">Котельники</SelectItem>
                <SelectItem value="Мытищи">Мытищи</SelectItem>
                <SelectItem value="Стахановская">Стахановская</SelectItem>
                <SelectItem value="Новокосино">Новокосино</SelectItem>
                <SelectItem value="Люберцы">Люберцы</SelectItem>
                <SelectItem value="Солнцево">Солнцево</SelectItem>
                <SelectItem value="Онлайн школа">Онлайн школа</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="period_start">Дата начала *</Label>
              <Input
                id="period_start"
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData(prev => ({...prev, period_start: e.target.value}))}
              />
            </div>

            <div>
              <Label htmlFor="period_end">Дата окончания *</Label>
              <Input
                id="period_end"
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData(prev => ({...prev, period_end: e.target.value}))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}