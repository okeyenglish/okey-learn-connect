import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Calendar, Clock, MapPin, BookOpen, DollarSign, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface IndividualLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
}

export const IndividualLessonModal = ({ open, onOpenChange, lessonId }: IndividualLessonModalProps) => {
  // Получаем данные индивидуального урока
  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['individual_lesson', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      
      const { data, error } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId && open,
  });

  // Получаем занятия для этого индивидуального урока
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['individual_lesson_sessions', lessonId],
    queryFn: async () => {
      if (!lesson) return [];
      
      // Получаем занятия по имени преподавателя и студента
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select('*')
        .eq('teacher_name', lesson.teacher_name)
        .ilike('notes', `%${lesson.student_name}%`)
        .order('lesson_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!lesson && open,
  });

  // Получаем информацию о студенте
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student_by_name', lesson?.student_name],
    queryFn: async () => {
      if (!lesson?.student_name) return null;
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('name', lesson.student_name)
        .limit(1);
      
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!lesson?.student_name && open,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активный';
      case 'completed':
        return 'Завершен';
      case 'paused':
        return 'Приостановлен';
      default:
        return status;
    }
  };

  if (!lesson && !lessonLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                {lesson?.student_name || 'Загрузка...'}
              </DialogTitle>
              <DialogDescription>Индивидуальные занятия</DialogDescription>
            </div>
            {lesson && (
              <Badge className={getStatusColor(lesson.status)}>
                {getStatusLabel(lesson.status)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {lessonLoading || sessionsLoading || studentLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">Загружаем данные...</div>
          </div>
        ) : lesson ? (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Основная информация */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Предмет</p>
                  <p className="font-medium">{lesson.subject}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Уровень</p>
                  <p className="font-medium">{lesson.level || 'Не указан'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Филиал</p>
                  <p className="font-medium">{lesson.branch}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Преподаватель</p>
                  <p className="font-medium">{lesson.teacher_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Расписание</p>
                  <p className="font-medium">{lesson.schedule_time || 'Не указано'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Цена за урок</p>
                  <p className="font-medium">{lesson.price_per_lesson ? `${lesson.price_per_lesson}₽` : 'Не указана'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Академических часов</p>
                  <p className="font-medium">{lesson.academic_hours || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Задолженность</p>
                  <p className="font-medium text-red-600">{lesson.debt_hours || 0} ч.</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Период</p>
                  <p className="font-medium">
                    {lesson.period_start && lesson.period_end
                      ? `${format(new Date(lesson.period_start), 'd.MM.yy')} - ${format(new Date(lesson.period_end), 'd.MM.yy')}`
                      : 'Не указан'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Табы с контентом */}
            <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Информация</TabsTrigger>
                <TabsTrigger value="schedule">История занятий</TabsTrigger>
                <TabsTrigger value="payments">Оплаты</TabsTrigger>
              </TabsList>

              {/* Информация о студенте */}
              <TabsContent value="info" className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Информация о студенте
                  </h3>
                  
                  {student ? (
                    <div className="p-4 border rounded-lg bg-background">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Полное имя</p>
                          <p className="font-medium">
                            {student.first_name} {student.last_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Возраст</p>
                          <p className="font-medium">{student.age} лет</p>
                        </div>
                        {student.phone && (
                          <div>
                            <p className="text-sm text-muted-foreground">Телефон</p>
                            <p className="font-medium flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {student.phone}
                            </p>
                          </div>
                        )}
                        {student.date_of_birth && (
                          <div>
                            <p className="text-sm text-muted-foreground">Дата рождения</p>
                            <p className="font-medium">
                              {format(new Date(student.date_of_birth), 'd MMMM yyyy', { locale: ru })}
                            </p>
                          </div>
                        )}
                      </div>
                      {student.notes && (
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground">Заметки</p>
                          <p className="font-medium">{student.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 border rounded-lg bg-background">
                      <p className="text-muted-foreground">Информация о студенте не найдена</p>
                    </div>
                  )}

                  {lesson.description && (
                    <div>
                      <h4 className="font-medium mb-2">Описание курса</h4>
                      <div className="p-4 border rounded-lg bg-background">
                        <p className="text-sm">{lesson.description}</p>
                      </div>
                    </div>
                  )}

                  {lesson.notes && (
                    <div>
                      <h4 className="font-medium mb-2">Заметки</h4>
                      <div className="p-4 border rounded-lg bg-background">
                        <p className="text-sm">{lesson.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* История занятий */}
              <TabsContent value="schedule" className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    История занятий
                  </h3>
                  
                  {sessions && sessions.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                          <div className="flex items-center gap-4">
                            <div className="text-sm">
                              <p className="font-medium">
                                {format(new Date(session.lesson_date), 'EEEE, d MMMM yyyy', { locale: ru })}
                              </p>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {session.start_time} - {session.end_time}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {session.classroom}
                            </div>
                            <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                              {session.status === 'completed' ? 'Проведено' : 
                               session.status === 'cancelled' ? 'Отменено' : 'Запланировано'}
                            </Badge>
                          </div>
                          {session.notes && (
                            <div className="text-xs text-muted-foreground max-w-xs">
                              {session.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      История занятий пока пуста
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Оплаты */}
              <TabsContent value="payments" className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Финансовая информация
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg bg-background">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <h4 className="font-medium">Цена за урок</h4>
                      </div>
                      <p className="text-2xl font-bold">
                        {lesson.price_per_lesson ? `${lesson.price_per_lesson}₽` : 'Не указана'}
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg bg-background">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium">Академических часов</h4>
                      </div>
                      <p className="text-2xl font-bold">{lesson.academic_hours || 0}</p>
                    </div>
                    
                    <div className="p-4 border rounded-lg bg-background">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-red-600" />
                        <h4 className="font-medium">Задолженность</h4>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{lesson.debt_hours || 0} ч.</p>
                    </div>
                  </div>

                  {lesson.debt_hours && lesson.debt_hours > 0 && (
                    <div className="p-4 border-l-4 border-red-500 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-700 mb-2">Внимание!</h4>
                      <p className="text-red-600 text-sm">
                        У студента есть задолженность по оплате: {lesson.debt_hours} часов
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Добавить оплату
                    </Button>
                    <Button size="sm" variant="outline">
                      История платежей
                    </Button>  
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};