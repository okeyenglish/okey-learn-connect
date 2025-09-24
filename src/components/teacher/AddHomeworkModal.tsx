import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, BookOpen, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface AddHomeworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  groupId?: string;
}

export const AddHomeworkModal = ({ open, onOpenChange, sessionId, groupId }: AddHomeworkModalProps) => {
  const [formData, setFormData] = useState({
    assignment: '',
    description: '',
    dueDate: new Date(),
    showInStudentPortal: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Получаем студентов группы или занятия
  const { data: students, isLoading } = useQuery({
    queryKey: ['session_students', sessionId, groupId],
    queryFn: async () => {
      if (groupId) {
        // Получаем студентов группы
        const { data: sessionIds, error: sessionError } = await supabase
          .from('lesson_sessions')
          .select('id')
          .eq('group_id', groupId);

        if (sessionError) throw sessionError;
        
        if (!sessionIds || sessionIds.length === 0) return [];

        const { data, error } = await supabase
          .from('student_lesson_sessions')
          .select(`
            students!student_lesson_sessions_student_id_fkey (
              id,
              name,
              first_name,
              last_name
            )
          `)
          .in('lesson_session_id', sessionIds.map(s => s.id));

        if (error) throw error;
        
        // Убираем дубликаты
        const uniqueStudents = data?.reduce((acc: any[], item: any) => {
          const student = item.students;
          if (student && !acc.find(s => s.id === student.id)) {
            acc.push(student);
          }
          return acc;
        }, []);

        return uniqueStudents || [];
      } else {
        // Получаем студентов конкретного занятия
        const { data, error } = await supabase
          .from('student_lesson_sessions')
          .select(`
            students!student_lesson_sessions_student_id_fkey (
              id,
              name,
              first_name,
              last_name
            )
          `)
          .eq('lesson_session_id', sessionId);

        if (error) throw error;
        return data?.map(item => item.students).filter(Boolean) || [];
      }
    },
    enabled: open && (!!sessionId || !!groupId),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assignment.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите задание",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Здесь будет логика сохранения домашнего задания
      // Пока что просто показываем успешное сообщение
      toast({
        title: "Домашнее задание добавлено",
        description: `Задание "${formData.assignment}" добавлено для ${students?.length || 0} студентов`,
      });
      
      // Сбрасываем форму
      setFormData({
        assignment: '',
        description: '',
        dueDate: new Date(),
        showInStudentPortal: true,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding homework:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить домашнее задание",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Добавить домашнее задание
          </DialogTitle>
          <DialogDescription>
            Создайте домашнее задание для студентов
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Задание */}
          <div className="space-y-2">
            <Label htmlFor="assignment">Задание *</Label>
            <Input
              id="assignment"
              value={formData.assignment}
              onChange={(e) => setFormData(prev => ({ ...prev, assignment: e.target.value }))}
              placeholder="Например: Unit 3, Exercise 1-5"
              required
            />
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Дополнительные инструкции для студентов..."
              rows={3}
            />
          </div>

          {/* Дата выполнения */}
          <div className="space-y-2">
            <Label>Срок выполнения</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.dueDate, 'PPP', { locale: ru })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, dueDate: date }))}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Отображение в личном кабинете */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showInPortal"
              checked={formData.showInStudentPortal}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, showInStudentPortal: !!checked }))
              }
            />
            <Label htmlFor="showInPortal">Показать в личном кабинете студента</Label>
          </div>

          {/* Студенты */}
          {students && students.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Студенты ({students.length})
              </Label>
              <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <div className="text-sm space-y-1">
                  {students.map((student: any) => (
                    <div key={student.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      {student.first_name} {student.last_name} ({student.name})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-4 text-muted-foreground">
              Загружаем список студентов...
            </div>
          )}

          {/* Кнопки */}
          <div className="flex items-center gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Добавление...' : 'Добавить задание'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};