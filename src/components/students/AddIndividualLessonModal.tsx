import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useIndividualLessons } from '@/hooks/useIndividualLessons';
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
    lesson_location: '',
    notes: '',
    branch: 'Окская'
  });
  const [loading, setLoading] = useState(false);
  
  const { createIndividualLesson } = useIndividualLessons();
  const { toast } = useToast();

  // Автоматически рассчитываем стоимость при изменении продолжительности
  useEffect(() => {
    const price = calculateLessonPrice(formData.duration);
    setFormData(prev => ({ ...prev, price_per_lesson: price.toString() }));
  }, [formData.duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.level || !formData.teacher_name) {
      toast({
        title: "Ошибка",
        description: "Заполните обязательные поля",
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
        is_active: true
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
        lesson_location: '',
        notes: '',
        branch: 'Окская'
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating individual lesson:', error);
    } finally {
      setLoading(false);
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

  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

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
              <Input
                id="teacher_name"
                value={formData.teacher_name}
                onChange={(e) => setFormData(prev => ({...prev, teacher_name: e.target.value}))}
                placeholder="Имя преподавателя"
              />
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
              {days.map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant={formData.schedule_days.includes(day) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDayToggle(day)}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="schedule_time">Время</Label>
              <Input
                id="schedule_time"
                value={formData.schedule_time}
                onChange={(e) => setFormData(prev => ({...prev, schedule_time: e.target.value}))}
                placeholder="например, 10:00-11:00"
              />
            </div>

            <div>
              <Label htmlFor="lesson_location">Место проведения</Label>
              <Input
                id="lesson_location"
                value={formData.lesson_location}
                onChange={(e) => setFormData(prev => ({...prev, lesson_location: e.target.value}))}
                placeholder="например, Аудитория 1"
              />
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