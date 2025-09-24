import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, CreditCard, Video, BookOpen, User, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function StudentPortal() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  // Получаем данные студента
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  // Получаем курсы студента
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['student-courses', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_courses')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  // Получаем индивидуальные уроки студента
  const { data: individualLessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['individual-lessons', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  // Получаем расписание занятий
  const { data: lessonSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['lesson-sessions', studentId],
    queryFn: async () => {
      // Получаем связи студента с занятиями через промежуточную таблицу
      const { data: studentSessions, error: studentSessionsError } = await supabase
        .from('student_lesson_sessions')
        .select(`
          lesson_sessions (
            id,
            lesson_date,
            start_time,
            end_time,
            classroom,
            teacher_name,
            status,
            branch,
            notes
          )
        `)
        .eq('student_id', studentId);
      
      if (studentSessionsError) throw studentSessionsError;
      
      return studentSessions?.map(s => s.lesson_sessions).filter(Boolean) || [];
    },
    enabled: !!studentId,
  });

  if (studentLoading || coursesLoading || lessonsLoading || sessionsLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center py-8">Загружаем данные...</div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center py-8">Студент не найден</div>
        </div>
      </div>
    );
  }

  const handleStartOnlineLesson = (lessonId: string, teacherName: string) => {
    navigate(`/online-lesson/${lessonId}?student=${student.name}&teacher=${teacherName}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-4 space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{student.name}</h1>
              <p className="text-muted-foreground">Личный кабинет ученика</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/newcrm')}>
            Вернуться в CRM
          </Button>
        </div>

        {/* Информация о студенте */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Личная информация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Возраст</p>
                <p className="font-medium">{student.age} лет</p>
              </div>
              {student.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Телефон</p>
                  <p className="font-medium">{student.phone}</p>
                </div>
              )}
              {student.date_of_birth && (
                <div>
                  <p className="text-sm text-muted-foreground">Дата рождения</p>
                  <p className="font-medium">
                    {format(new Date(student.date_of_birth), 'dd MMMM yyyy', { locale: ru })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Статус</p>
                <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                  {student.status === 'active' ? 'Активный' : 
                   student.status === 'trial' ? 'Пробный период' :
                   student.status === 'graduated' ? 'Выпускник' : 'Неактивный'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Текущие курсы */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Текущие курсы
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courses && courses.length > 0 ? (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{course.course_name}</h3>
                      <Badge variant="outline">Активный</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {course.start_date && (
                        <div>
                          <p className="text-muted-foreground">Начало курса</p>
                          <p className="font-medium">
                            {format(new Date(course.start_date), 'dd.MM.yyyy')}
                          </p>
                        </div>
                      )}
                      {course.next_payment_date && (
                        <div>
                          <p className="text-muted-foreground">Следующая оплата</p>
                          <p className="font-medium">
                            {format(new Date(course.next_payment_date), 'dd.MM.yyyy')}
                          </p>
                        </div>
                      )}
                      {course.payment_amount && (
                        <div>
                          <p className="text-muted-foreground">Стоимость</p>
                          <p className="font-medium">{course.payment_amount} ₽</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Нет активных курсов</p>
            )}
          </CardContent>
        </Card>

        {/* Расписание занятий */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ближайшие занятия
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lessonSessions && lessonSessions.length > 0 ? (
              <div className="space-y-4">
                {lessonSessions
                  .filter(session => new Date(session.lesson_date) >= new Date())
                  .sort((a, b) => new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime())
                  .slice(0, 5)
                  .map((session) => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-medium">
                              {format(new Date(session.lesson_date), 'dd MMMM yyyy', { locale: ru })}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {session.start_time} - {session.end_time}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {session.classroom}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            session.status === 'completed' ? 'default' :
                            session.status === 'cancelled' ? 'destructive' :
                            'secondary'
                          }>
                            {session.status === 'completed' ? 'Проведено' :
                             session.status === 'cancelled' ? 'Отменено' :
                             'Запланировано'}
                          </Badge>
                          {session.status === 'scheduled' && (
                            <Button
                              size="sm"
                              onClick={() => handleStartOnlineLesson(session.id, session.teacher_name)}
                              className="flex items-center gap-1"
                            >
                              <Video className="h-4 w-4" />
                              Войти в урок
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm">
                        <p><span className="text-muted-foreground">Преподаватель:</span> {session.teacher_name}</p>
                        <p><span className="text-muted-foreground">Филиал:</span> {session.branch}</p>
                        {session.notes && (
                          <p><span className="text-muted-foreground">Примечания:</span> {session.notes}</p>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>
            ) : (
              <p className="text-muted-foreground">Нет запланированных занятий</p>
            )}
          </CardContent>
        </Card>

        {/* Индивидуальные уроки */}
        {individualLessons && individualLessons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Индивидуальные уроки
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {individualLessons.map((lesson) => (
                  <div key={lesson.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{lesson.subject} - {lesson.level}</h4>
                      <Badge variant="outline">{lesson.status}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Преподаватель</p>
                        <p className="font-medium">{lesson.teacher_name || 'Не назначен'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Расписание</p>
                        <p className="font-medium">
                          {lesson.schedule_days?.join(', ')} в {lesson.schedule_time}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Стоимость урока</p>
                        <p className="font-medium">{lesson.price_per_lesson} ₽</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}