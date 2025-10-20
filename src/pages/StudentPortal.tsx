import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Video, BookOpen, User, Clock, MapPin, LogOut, Library } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useToast } from '@/components/ui/use-toast';
import { CourseMaterialsLibrary } from '@/components/student/CourseMaterialsLibrary';
import { StudentLessonCard } from '@/components/student/StudentLessonCard';

export default function StudentPortal() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Получаем данные студента через функцию связки по user_id
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-by-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Используем функцию для получения студента по user_id
      const { data, error } = await supabase.rpc('get_student_by_user_id', {
        _user_id: user.id
      });
      
      if (error) {
        console.error('Error fetching student:', error);
        return null; // Возвращаем null вместо throw, чтобы не блокировать UI
      }
      
      return data?.[0] || null;
    },
    enabled: !!user?.id,
  });

  // Получаем курсы студента
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['student-courses', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      
      const { data, error } = await supabase
        .from('student_courses')
        .select('*')
        .eq('student_id', student.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!student?.id,
  });

  // Получаем индивидуальные уроки студента
  const { data: individualLessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['individual-lessons', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      
      const { data, error } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('student_id', student.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!student?.id,
  });

  // Получаем расписание занятий
  const { data: lessonSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['lesson-sessions', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      
      // Получаем связи студента с занятиями через промежуточную таблицу
      const { data: studentSessions, error: studentSessionsError } = await supabase
        .from('student_lesson_sessions')
        .select(`
          lesson_session_id,
          lesson_sessions (
            id,
            lesson_date,
            start_time,
            end_time,
            classroom,
            teacher_name,
            status,
            branch,
            notes,
            bbb_meeting_id,
            bbb_meeting_url,
            group_id,
            learning_groups (
              id,
              name
            )
          )
        `)
        .eq('student_id', student.id);
      
      if (studentSessionsError) throw studentSessionsError;
      
      return studentSessions?.map(s => ({
        ...s.lesson_sessions,
        group: s.lesson_sessions?.learning_groups
      })).filter(Boolean) || [];
    },
    enabled: !!student?.id,
  });

  // Получаем индивидуальные занятия студента
  const { data: individualSessions, isLoading: individualSessionsLoading } = useQuery({
    queryKey: ['individual-sessions', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      
      // Сначала получаем индивидуальные уроки студента
      const { data: lessons, error: lessonsError } = await supabase
        .from('individual_lessons')
        .select('id, student_name, teacher_name, branch, subject, level, schedule_time, duration')
        .eq('student_id', student.id)
        .eq('is_active', true);
      
      if (lessonsError) throw lessonsError;
      if (!lessons || lessons.length === 0) return [];
      
      const lessonIds = lessons.map(l => l.id);
      
      // Теперь получаем сессии для этих уроков
      const { data: sessions, error: sessionsError } = await supabase
        .from('individual_lesson_sessions')
        .select('*')
        .in('individual_lesson_id', lessonIds)
        .gte('lesson_date', new Date().toISOString().split('T')[0])
        .order('lesson_date', { ascending: true });
      
      if (sessionsError) throw sessionsError;
      
      // Объединяем данные
      return sessions?.map(session => {
        const lesson = lessons.find(l => l.id === session.individual_lesson_id);
        const scheduleTime = lesson?.schedule_time?.split('-') || ['09:00', '10:00'];
        const duration = session.duration || lesson?.duration || 60;
        const startTime = scheduleTime[0]?.trim() || '09:00';
        const endTime = scheduleTime[1]?.trim() || calculateEndTime(startTime, duration);
        
        return {
          ...session,
          start_time: startTime,
          end_time: endTime,
          teacher_name: lesson?.teacher_name,
          branch: lesson?.branch,
          individual_lesson: lesson,
        };
      }) || [];
    },
    enabled: !!student?.id,
  });

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: "Выход выполнен",
        description: "Вы успешно вышли из системы",
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleStartOnlineLesson = (lessonId: string, teacherName: string) => {
    navigate(`/online-lesson/${lessonId}?student=${student.name}&teacher=${teacherName}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {studentLoading || coursesLoading || lessonsLoading || sessionsLoading || individualSessionsLoading ? (
          <div className="container mx-auto max-w-4xl p-4">
            <div className="text-center py-8">Загружаем данные...</div>
          </div>
        ) : !student ? (
          <div className="container mx-auto max-w-4xl p-4">
            <div className="text-center py-8">
              <p className="text-lg mb-4">Студент не найден или у вас нет доступа к этому кабинету</p>
              <Button onClick={() => navigate('/')}>На главную</Button>
            </div>
          </div>
        ) : (
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
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => navigate('/newcrm')}>
                  CRM
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Выход
                </Button>
              </div>
            </div>

            {/* Вкладки */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Главная
                </TabsTrigger>
                <TabsTrigger value="materials" className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  Материалы
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6 mt-6">
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
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold">{course.course_name}</h3>
                                <Badge variant="outline">Активный</Badge>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => navigate(`/course/${course.id}`)}
                                className="flex items-center gap-1"
                              >
                                <BookOpen className="h-4 w-4" />
                                Открыть курс
                              </Button>
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

                {/* Групповые занятия */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Групповые занятия
                    </CardTitle>
                    <CardDescription>Ближайшие групповые занятия</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {lessonSessions && lessonSessions.length > 0 ? (
                      <div className="space-y-3">
                        {lessonSessions
                          .filter(session => new Date(session.lesson_date) >= new Date())
                          .sort((a, b) => new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime())
                          .slice(0, 5)
                          .map((session) => (
                            <StudentLessonCard
                              key={session.id}
                              lesson={session}
                              type="group"
                            />
                          ))
                        }
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Нет запланированных групповых занятий</p>
                    )}
                  </CardContent>
                </Card>

                {/* Индивидуальные занятия */}
                {individualSessions && individualSessions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Индивидуальные занятия
                      </CardTitle>
                      <CardDescription>Ближайшие индивидуальные занятия</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {individualSessions
                          .slice(0, 5)
                          .map((session) => (
                            <StudentLessonCard
                              key={session.id}
                              lesson={session}
                              type="individual"
                            />
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                              <div className="flex items-center gap-3">
                                <h4 className="font-medium">{lesson.subject} - {lesson.level}</h4>
                                <Badge variant="outline">{lesson.status}</Badge>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => navigate(`/course/${lesson.id}`)}
                                className="flex items-center gap-1"
                              >
                                <BookOpen className="h-4 w-4" />
                                Открыть курс
                              </Button>
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
              </TabsContent>

              <TabsContent value="materials" className="mt-6">
                <CourseMaterialsLibrary />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}