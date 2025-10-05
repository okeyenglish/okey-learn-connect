import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { usePayments } from '@/hooks/usePayments';
import { useAddBalanceTransaction } from '@/hooks/useStudentBalance';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateLessonPrice } from '@/utils/lessonPricing';

interface CreatePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  individualLessonId?: string;
  groupId?: string;
  totalUnpaidCount?: number;
  pricePerLesson?: number;
  onPaymentSuccess?: () => void;
}

const LESSON_PACKAGES = [1, 4, 8, 24, 80];

interface StudentLesson {
  id: string;
  type: 'group' | 'individual';
  name: string;
  subject: string;
  level: string;
  teacher: string;
  branch: string;
  duration?: number;
  pricePerLesson?: number;
  academicHours?: number;
  scheduleTime?: string;
  scheduleDays?: string[];
  schedule?: string;
}

export function CreatePaymentModal({ 
  open, 
  onOpenChange, 
  studentId, 
  studentName,
  individualLessonId,
  groupId,
  totalUnpaidCount = 0,
  pricePerLesson = 0,
  onPaymentSuccess
}: CreatePaymentModalProps) {
  const [paymentType, setPaymentType] = useState<'lessons' | 'balance' | 'textbooks'>('lessons');
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [studentLessons, setStudentLessons] = useState<StudentLesson[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customLessonsCount, setCustomLessonsCount] = useState<string>('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('5000');
  const [lessonDuration, setLessonDuration] = useState<number>(60);
  const [calculatedPricePerLesson, setCalculatedPricePerLesson] = useState(pricePerLesson);
  const [formData, setFormData] = useState({
    method: 'card' as const,
    description: '',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  
  const { createPayment } = usePayments();
  const { mutateAsync: addBalanceTransaction } = useAddBalanceTransaction();
  const { toast } = useToast();

  // Загружаем занятия студента
  useEffect(() => {
    const fetchStudentLessons = async () => {
      if (!open || !studentId) return;
      
      try {
        // Загружаем групповые занятия
        const { data: groupsData, error: groupsError } = await supabase
          .from('group_students')
          .select(`
            group_id,
            learning_groups (
              id,
              name,
              subject,
              level,
              teacher_name,
              branch,
              academic_hours_per_day
            )
          `)
          .eq('student_id', studentId)
          .eq('status', 'active');
        
        // Загружаем индивидуальные занятия
        const { data: individualData, error: individualError } = await supabase
          .from('individual_lessons')
          .select(`
            id, 
            student_name, 
            subject, 
            level, 
            teacher_name, 
            branch, 
            duration, 
            price_per_lesson, 
            academic_hours_per_day,
            schedule_time,
            schedule_days
          `)
          .eq('student_id', studentId)
          .eq('status', 'active');
        
        const lessons: StudentLesson[] = [];
        
        // Добавляем групповые занятия
        if (groupsData) {
          groupsData.forEach((item: any) => {
            const group = item.learning_groups;
            if (group) {
              // Для групповых занятий используем стандартную цену за академический час
              const academicHoursPerDay = group.academic_hours_per_day || 1;
              const pricePerAcademicHour = 1000; // Стандартная цена за академический час для групп
              const pricePerLesson = pricePerAcademicHour * academicHoursPerDay;
              
              lessons.push({
                id: group.id,
                type: 'group',
                name: group.name,
                subject: group.subject || '',
                level: group.level || '',
                teacher: group.teacher_name || '',
                branch: group.branch || '',
                academicHours: academicHoursPerDay,
                pricePerLesson: pricePerLesson,
              });
            }
          });
        }
        
        // Добавляем индивидуальные занятия
        if (individualData) {
          individualData.forEach((lesson: any) => {
            // Используем ту же логику, что и в карточке - всегда вычисляем цену по формуле
            const duration = lesson.duration || 60;
            const price = calculateLessonPrice(duration);
            // 1 академический час = 40 минут, поэтому 60 мин = 1.5 ак.ч.
            const academicHours = duration / 40;
            lessons.push({
              id: lesson.id,
              type: 'individual',
              name: `Индивидуально с ${lesson.teacher_name || 'преподавателем'}`,
              subject: lesson.subject || '',
              level: lesson.level || '',
              teacher: lesson.teacher_name || '',
              branch: lesson.branch || '',
              duration: duration,
              pricePerLesson: price,
              academicHours: academicHours,
              scheduleTime: lesson.schedule_time,
              scheduleDays: lesson.schedule_days,
            });
          });
        }
        
        setStudentLessons(lessons);
        
        console.log('Payment modal - groupId:', groupId, 'individualLessonId:', individualLessonId);
        console.log('Available lessons:', lessons);
        
        // Если передан individualLessonId или groupId, автоматически выбираем его
        if (individualLessonId) {
          console.log('Selecting individual lesson:', individualLessonId);
          setSelectedLesson(individualLessonId);
          const lesson = lessons.find(l => l.id === individualLessonId);
          if (lesson && lesson.pricePerLesson) {
            setCalculatedPricePerLesson(lesson.pricePerLesson);
          }
        } else if (groupId) {
          console.log('Selecting group:', groupId);
          setSelectedLesson(groupId);
          const lesson = lessons.find(l => l.id === groupId);
          console.log('Found lesson:', lesson);
          if (lesson && lesson.pricePerLesson) {
            setCalculatedPricePerLesson(lesson.pricePerLesson);
          }
        }
      } catch (error) {
        console.error('Error fetching student lessons:', error);
      }
    };
    
    fetchStudentLessons();
  }, [open, studentId, individualLessonId, groupId]);

  const getLessonsCount = () => {
    if (customLessonsCount) {
      return parseInt(customLessonsCount) || 0;
    }
    return selectedPackage || 0;
  };

  const calculateAmount = () => {
    if (paymentType === 'textbooks') {
      return parseFloat(customAmount) || 5000;
    }
    if (useCustomAmount) {
      return parseFloat(customAmount) || 0;
    }
    return getLessonsCount() * calculatedPricePerLesson;
  };
  
  const getSelectedLessonInfo = () => {
    return studentLessons.find(l => l.id === selectedLesson);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== PAYMENT MODAL SUBMIT ===');
    console.log('Payment type:', paymentType);
    
    const amount = paymentType === 'balance' ? parseFloat(customAmount) : calculateAmount();
    
    if (!amount) {
      toast({
        title: "Ошибка",
        description: "Укажите сумму платежа",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (paymentType === 'balance') {
        // Пополнение личного баланса
        await addBalanceTransaction({
          studentId: studentId,
          amount,
          transactionType: 'credit',
          description: formData.description || 'Пополнение личного баланса',
        });
        
        toast({
          title: "Успех",
          description: `Баланс пополнен на ${amount} ₽`,
        });
      } else if (paymentType === 'textbooks') {
        // Оплата учебных пособий
        const paymentPayload = {
          student_id: studentId,
          amount,
          method: formData.method,
          payment_date: formData.payment_date,
          description: formData.description || 'Оплата учебных пособий',
          notes: formData.notes,
          lessons_count: 0
        };
        
        await createPayment(paymentPayload);
        
        toast({
          title: "Успех",
          description: 'Оплата учебных пособий прошла успешно',
        });
      } else {
        // Оплата занятий
        const lessonsCount = getLessonsCount();
        
        if (!selectedLesson) {
          toast({
            title: "Ошибка",
            description: "Выберите занятие для оплаты",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        if (!lessonsCount && !useCustomAmount) {
          toast({
            title: "Ошибка",
            description: "Выберите пакет занятий или укажите количество",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        const lessonInfo = getSelectedLessonInfo();
        const academicHours = lessonsCount * (lessonInfo?.academicHours || 1);
        
        const paymentPayload = {
          student_id: studentId,
          amount,
          method: formData.method,
          payment_date: formData.payment_date,
          description: formData.description || `Оплата ${lessonsCount} занятий (${academicHours} ак.ч.)`,
          notes: formData.notes,
          lessons_count: lessonsCount,
          individual_lesson_id: lessonInfo?.type === 'individual' ? selectedLesson : undefined,
          group_id: lessonInfo?.type === 'group' ? selectedLesson : undefined
        };
        
        await createPayment(paymentPayload);
        
        toast({
          title: "Успех",
          description: `Оплачено ${lessonsCount} занятий (${academicHours} ак.ч.)`,
        });
      }
      
      // Reset form
      setFormData({
        method: 'card' as const,
        description: '',
        notes: '',
        payment_date: new Date().toISOString().split('T')[0]
      });
      setPaymentType('lessons');
      setSelectedLesson('');
      setSelectedPackage(null);
      setCustomLessonsCount('');
      setUseCustomAmount(false);
      setCustomAmount('5000');
      
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error in payment modal submit:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Оплата занятий</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Студент</Label>
            <div className="text-sm text-muted-foreground">{studentName}</div>
          </div>

          <div>
            <Label>Тип оплаты</Label>
            <RadioGroup value={paymentType} onValueChange={(value: 'lessons' | 'balance' | 'textbooks') => setPaymentType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lessons" id="type-lessons" />
                <Label htmlFor="type-lessons" className="cursor-pointer">Оплата занятий</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balance" id="type-balance" />
                <Label htmlFor="type-balance" className="cursor-pointer">Пополнение личного баланса</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="textbooks" id="type-textbooks" />
                <Label htmlFor="type-textbooks" className="cursor-pointer">Учебные пособия</Label>
              </div>
            </RadioGroup>
          </div>

          {paymentType === 'balance' && (
            <div>
              <Label htmlFor="balance-amount">Сумма пополнения (руб.)</Label>
              <Input
                id="balance-amount"
                type="number"
                min="0"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Введите сумму..."
                required
              />
              {parseFloat(customAmount) > 0 && (
                <div className="mt-2 p-3 bg-primary/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">К пополнению:</span>
                    <span className="text-2xl font-bold">{parseFloat(customAmount)} руб.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {paymentType === 'textbooks' && (
            <div>
              <Label htmlFor="textbooks-amount">Сумма за учебные пособия (руб.)</Label>
              <Input
                id="textbooks-amount"
                type="number"
                min="0"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="5000"
                required
              />
              {parseFloat(customAmount) > 0 && (
                <div className="mt-2 p-3 bg-primary/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">К оплате:</span>
                    <span className="text-2xl font-bold">{parseFloat(customAmount)} руб.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {paymentType === 'lessons' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="lesson-select">Выберите занятие</Label>
                <Select value={selectedLesson} onValueChange={(value) => {
                  setSelectedLesson(value);
                  const lesson = studentLessons.find(l => l.id === value);
                  if (lesson && lesson.pricePerLesson) {
                    setCalculatedPricePerLesson(lesson.pricePerLesson);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите занятие..." />
                  </SelectTrigger>
                  <SelectContent>
                    {studentLessons.map(lesson => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{lesson.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {lesson.subject} • {lesson.level} • {lesson.branch}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLesson && (
                <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Стоимость урока:</span>
                    <span className="font-bold text-primary">{calculatedPricePerLesson} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ак. часов за урок:</span>
                    <span className="font-medium">{getSelectedLessonInfo()?.academicHours || 1} ак.ч.</span>
                  </div>
                </div>
              )}

              <div>
                <Label>Выберите пакет занятий</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {LESSON_PACKAGES.map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setSelectedPackage(count);
                        setCustomLessonsCount('');
                      }}
                      className={cn(
                        "p-2 rounded border-2 transition-all text-center",
                        selectedPackage === count 
                          ? "border-primary bg-primary/10" 
                          : "border-muted hover:border-primary/50"
                      )}
                    >
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">
                        {count * calculatedPricePerLesson} ₽
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="custom-lessons">Или укажите количество занятий</Label>
                <Input
                  id="custom-lessons"
                  type="number"
                  min="1"
                  value={customLessonsCount}
                  onChange={(e) => {
                    setCustomLessonsCount(e.target.value);
                    setSelectedPackage(null);
                  }}
                  placeholder="Введите количество..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="custom-amount"
                  checked={useCustomAmount}
                  onCheckedChange={(checked) => setUseCustomAmount(checked as boolean)}
                />
                <Label htmlFor="custom-amount" className="text-sm cursor-pointer">
                  Указать произвольную сумму
                </Label>
              </div>

              {useCustomAmount && (
                <div>
                  <Label htmlFor="amount">Сумма оплаты (руб.)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Введите сумму..."
                  />
                </div>
              )}

              {(selectedPackage || customLessonsCount || useCustomAmount) && selectedLesson && (
                <div className="p-4 bg-primary/10 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">К оплате:</span>
                    <span className="text-2xl font-bold">{calculateAmount()} руб.</span>
                  </div>
                  {!useCustomAmount && (
                    <>
                      <div className="text-sm text-muted-foreground">
                        {getLessonsCount()} {getLessonsCount() === 1 ? 'занятие' : getLessonsCount() < 5 ? 'занятия' : 'занятий'}
                      </div>
                      <div className="text-sm font-medium text-primary">
                        Всего: {getLessonsCount() * (getSelectedLessonInfo()?.academicHours || 1)} ак.ч.
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">

            <div>
              <Label htmlFor="method">Способ оплаты</Label>
              <Select value={formData.method} onValueChange={(value: any) => setFormData(prev => ({...prev, method: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Банковская карта</SelectItem>
                  <SelectItem value="cash">Наличные</SelectItem>
                  <SelectItem value="transfer">Банковский перевод</SelectItem>
                  <SelectItem value="online">Онлайн платеж</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="payment_date">Дата платежа</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData(prev => ({...prev, payment_date: e.target.value}))}
            />
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              placeholder="Описание платежа..."
              rows={2}
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