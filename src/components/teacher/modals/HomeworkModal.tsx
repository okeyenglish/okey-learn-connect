import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, BookOpen, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface HomeworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  groupId: string;
  existingHomework?: {
    text: string;
    description?: string;
    dueDate?: Date;
  };
}

export const HomeworkModal = ({ 
  open, 
  onOpenChange, 
  sessionId, 
  groupId,
  existingHomework 
}: HomeworkModalProps) => {
  const [assignment, setAssignment] = useState(existingHomework?.text || '');
  const [description, setDescription] = useState(existingHomework?.description || '');
  const [dueDate, setDueDate] = useState<Date>(existingHomework?.dueDate || new Date());
  const [showInPortal, setShowInPortal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Получаем студентов группы
  const { data: students } = useQuery({
    queryKey: ['group_students', groupId],
    queryFn: async () => {
      const { data: sessionIds } = await supabase
        .from('lesson_sessions')
        .select('id')
        .eq('group_id', groupId);

      if (!sessionIds || sessionIds.length === 0) return [];

      const { data } = await supabase
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

      const uniqueStudents = data?.reduce((acc: any[], item: any) => {
        const student = item.students;
        if (student && !acc.find(s => s.id === student.id)) {
          acc.push(student);
        }
        return acc;
      }, []);

      return uniqueStudents || [];
    },
    enabled: open && !!groupId,
  });

  const handleSave = async () => {
    if (!assignment.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите задание",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: homework, error: homeworkError } = await supabase
        .from('homework')
        .insert({
          lesson_session_id: sessionId,
          group_id: groupId,
          assignment: assignment,
          description: description || null,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          show_in_student_portal: showInPortal,
        })
        .select()
        .single();

      if (homeworkError) throw homeworkError;

      if (students && students.length > 0 && homework) {
        const studentHomeworkRecords = students.map((student: any) => ({
          homework_id: homework.id,
          student_id: student.id,
          status: 'assigned',
        }));

        const { error: studentError } = await supabase
          .from('student_homework')
          .insert(studentHomeworkRecords);

        if (studentError) throw studentError;
      }

      toast({
        title: "Домашнее задание сохранено",
        description: `Задание добавлено для ${students?.length || 0} студентов`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving homework:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить домашнее задание",
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
            Домашнее задание
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="assignment">Задание *</Label>
            <Input
              id="assignment"
              placeholder="Например: Unit 3, Exercise 1-5"
              value={assignment}
              onChange={(e) => setAssignment(e.target.value)}
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              placeholder="Дополнительные инструкции для студентов..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Срок выполнения</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal mt-2">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dueDate, 'PPP', { locale: ru })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => date && setDueDate(date)}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label htmlFor="show-portal" className="font-medium">
                Показать в личном кабинете студента
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Студенты увидят это задание в своем портале
              </p>
            </div>
            <Switch
              id="show-portal"
              checked={showInPortal}
              onCheckedChange={setShowInPortal}
            />
          </div>

          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Прикрепить файлы</p>
            <p className="text-xs text-muted-foreground">
              PDF, изображения, документы (скоро)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting || !assignment.trim()}
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
