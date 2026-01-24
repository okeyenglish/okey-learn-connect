import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, BookOpen, Upload, Sparkles, Clock, FileText } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'create' | 'templates' | 'ai'>('create');
  const { toast } = useToast();

  // Получаем шаблоны ДЗ преподавателя
  const { data: templates } = useQuery({
    queryKey: ['homework-templates', sessionId],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) return [];

      const { data } = await supabase
        .from('homework_templates')
        .select('*')
        .eq('teacher_id', session.session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return data || [];
    },
    enabled: open,
  });

  // Получаем AI-рекомендации
  const aiSuggestions = useMutation({
    mutationFn: async () => {
      const { data: lessonData } = await supabase
        .from('lesson_sessions')
        .select('*, learning_groups(*)')
        .eq('id', sessionId)
        .single();

      const response = await fetch(
        'https://api.academyos.ru/functions/v1/homework-suggestions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg'}`,
          },
          body: JSON.stringify({
            level: lessonData?.learning_groups?.level,
            subject: lessonData?.learning_groups?.subject,
            topic: lessonData?.learning_groups?.name || 'текущий урок',
            lessonNumber: lessonData?.lesson_number,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get suggestions');
      return response.json();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось получить рекомендации',
        variant: 'destructive',
      });
    },
  });

  const applyTemplate = (template: any) => {
    setAssignment(template.title);
    setDescription(template.body);
    setActiveTab('create');
  };

  const applySuggestion = (suggestion: any) => {
    setAssignment(suggestion.title);
    setDescription(suggestion.description);
    setActiveTab('create');
  };

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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Создать</TabsTrigger>
            <TabsTrigger value="templates">
              Шаблоны {templates && templates.length > 0 && `(${templates.length})`}
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-1" />
              AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
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
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {!templates || templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Нет сохранённых шаблонов</p>
                  <p className="text-sm mt-1">Создайте задание и сохраните его как шаблон</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template: any) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => applyTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{template.title}</h4>
                        <div className="flex gap-1">
                          {template.level && <Badge variant="outline">{template.level}</Badge>}
                          {template.subject && <Badge variant="outline">{template.subject}</Badge>}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{template.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  AI подберёт задания на основе текущего урока и уровня группы
                </p>
                <Button
                  onClick={() => aiSuggestions.mutate()}
                  disabled={aiSuggestions.isPending}
                  size="sm"
                >
                  {aiSuggestions.isPending ? 'Генерация...' : 'Получить рекомендации'}
                </Button>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                {!aiSuggestions.data ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Нажмите кнопку выше для генерации</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiSuggestions.data.suggestions?.map((suggestion: any, idx: number) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => applySuggestion(suggestion)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{suggestion.title}</h4>
                          <div className="flex gap-1">
                            {suggestion.type && <Badge variant="outline">{suggestion.type}</Badge>}
                            {suggestion.estimatedTime && (
                              <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {suggestion.estimatedTime} мин
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
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
