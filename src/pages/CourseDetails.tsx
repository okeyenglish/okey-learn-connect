import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Copy, Video, Calendar, BookOpen, Users, ArrowLeft, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function CourseDetails() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isVideoActive, setIsVideoActive] = useState(false);

  // Получаем данные курса
  const { data: course, isLoading } = useQuery({
    queryKey: ['course-details', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('Course ID is required');
      
      // Сначала пробуем individual_lessons
      const { data: individualLesson } = await (supabase.from('individual_lessons' as any) as any)
        .select('*')
        .eq('id', courseId)
        .single();

      if (individualLesson) {
        return { ...(individualLesson as any), type: 'individual' };
      }

      // Потом пробуем learning_groups
      const { data: learningGroup } = await (supabase.from('learning_groups' as any) as any)
        .select('*')
        .eq('id', courseId)
        .single();

      if (learningGroup) {
        return { ...(learningGroup as any), type: 'group' };
      }

      throw new Error('Course not found');
    },
    enabled: !!courseId,
  });

  // Получаем данные студента
  const { data: student } = useQuery({
    queryKey: ['student-by-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await (supabase.rpc as any)('get_student_by_user_id', {
        _user_id: user.id
      });
      
      if (error) return null;
      return (data as any[])?.[0] || null;
    },
    enabled: !!user?.id,
  });

  // Получаем расписание занятий для курса
  const { data: lessonSessions } = useQuery({
    queryKey: ['course-lesson-sessions', courseId, student?.id],
    queryFn: async () => {
      if (!courseId || !student?.id) return [];
      
      const { data: studentSessions, error } = await (supabase.from('student_lesson_sessions' as any) as any)
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
        .eq('student_id', student.id);
      
      if (error) return [];
      
      return ((studentSessions as any[]) || []).map((s: any) => s.lesson_sessions).filter(Boolean) || [];
    },
    enabled: !!courseId && !!student?.id,
  });

  const generateRoomName = (courseId: string, courseType: string) => {
    return `vpaas-magic-cookie-e8f4ca26e53c428a8221b593330a443a/OKEYEnglish_${courseType}_${courseId}`;
  };

  const generateLessonLink = (sessionId?: string) => {
    if (sessionId) {
      return `${window.location.origin}/online-lesson/${sessionId}?student=${student?.name}&teacher=${getTeacherName()}`;
    }
    return `${window.location.origin}/course/${courseId}/live`;
  };

  const getTeacherName = () => {
    if (course?.type === 'individual') {
      return (course as any).teacher_name || 'Преподаватель';
    } else {
      return (course as any).responsible_teacher || 'Преподаватель';
    }
  };

  const getCourseName = () => {
    if (course?.type === 'individual') {
      return (course as any).student_name;
    } else {
      return (course as any).name;
    }
  };

  const copyLessonLink = (sessionId?: string) => {
    const link = generateLessonLink(sessionId);
    navigator.clipboard.writeText(link);
    toast({
      title: "Ссылка скопирована",
      description: "Ссылка на урок скопирована в буфер обмена",
    });
  };

  const initializeJitsi = async () => {
    if (!course || jitsiApi || !jitsiContainerRef.current) return;

    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve(true);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://8x8.vc/vpaas-magic-cookie-e8f4ca26e53c428a8221b593330a443a/external_api.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Не удалось загрузить Jitsi API'));
        document.head.appendChild(script);
      });
    };

    try {
      await loadJitsiScript();
      
      const domain = '8x8.vc';
      const roomName = generateRoomName(courseId!, course.type);
      
      const displayName = student?.name || 'Ученик';

      const options = {
        roomName,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: true,
          startWithVideoMuted: true,
        }
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      setJitsiApi(api);
      setIsVideoActive(true);

      api.addEventListener('videoConferenceLeft', () => {
        setIsVideoActive(false);
        setJitsiApi(null);
      });
    } catch (error) {
      console.error('Ошибка инициализации Jitsi:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось запустить видеоконференцию",
        variant: "destructive",
      });
    }
  };

  const stopJitsi = () => {
    if (jitsiApi) {
      jitsiApi.dispose();
      setJitsiApi(null);
      setIsVideoActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (jitsiApi) {
        jitsiApi.dispose();
      }
    };
  }, [jitsiApi]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p>Загружаем курс...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!course) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="mb-4">Курс не найден</p>
            <Button onClick={() => navigate('/student-portal')}>Вернуться назад</Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-6xl p-4 space-y-6">
          {/* Заголовок */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/student-portal')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {getCourseName()}
                </h1>
                <p className="text-muted-foreground">
                  {course.subject} - {course.level}
                  {course.type === 'individual' ? ' (Индивидуальные занятия)' : ' (Групповые занятия)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => copyLessonLink()}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Копировать ссылку
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open(generateLessonLink(), '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Открыть в новой вкладке
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="schedule">Расписание</TabsTrigger>
              <TabsTrigger value="live">Онлайн урок</TabsTrigger>
              <TabsTrigger value="materials">Материалы</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Информация о курсе
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Предмет</p>
                      <p className="font-medium">{course.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Уровень</p>
                      <p className="font-medium">{course.level}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Преподаватель</p>
                      <p className="font-medium">
                        {getTeacherName()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Филиал</p>
                      <p className="font-medium">{course.branch}</p>
                    </div>
                    {course.type === 'group' && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Участники</p>
                          <p className="font-medium">{(course as any).current_students} из {(course as any).capacity}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Статус группы</p>
                          <Badge variant={(course as any).status === 'active' ? 'default' : 'secondary'}>
                            {(course as any).status === 'active' ? 'Активная' :
                             (course as any).status === 'forming' ? 'Формируется' :
                             (course as any).status === 'finished' ? 'Завершена' : (course as any).status}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                  {(course as any).description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Описание</p>
                      <p className="font-medium">{(course as any).description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Расписание занятий
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lessonSessions && lessonSessions.length > 0 ? (
                    <div className="space-y-4">
                      {lessonSessions
                        .sort((a, b) => new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime())
                        .map((session) => (
                          <div key={session.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h4 className="font-medium">
                                  {format(new Date(session.lesson_date), 'dd MMMM yyyy', { locale: ru })}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {session.start_time} - {session.end_time} • {session.classroom}
                                </p>
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
                                    onClick={() => copyLessonLink(session.id)}
                                    variant="outline"
                                  >
                                    <Copy className="h-4 w-4 mr-1" />
                                    Копировать ссылку
                                  </Button>
                                )}
                              </div>
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
            </TabsContent>

            <TabsContent value="live" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Онлайн урок
                  </CardTitle>
                  <CardDescription>
                    Видеоконференция для проведения занятий в режиме реального времени
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    {!isVideoActive ? (
                      <Button onClick={initializeJitsi} className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Присоединиться к уроку
                      </Button>
                    ) : (
                      <Button onClick={stopJitsi} variant="destructive" className="flex items-center gap-2">
                        Покинуть урок
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => copyLessonLink()}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Копировать ссылку
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden" style={{ height: '500px' }}>
                    {isVideoActive ? (
                      <div 
                        ref={jitsiContainerRef}
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <div className="text-center">
                          <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Нажмите "Присоединиться к уроку" чтобы начать видеоконференцию
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Учебные материалы</CardTitle>
                  <CardDescription>
                    Домашние задания, дополнительные материалы и ресурсы
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Раздел находится в разработке. Здесь будут размещены учебные материалы, 
                    домашние задания и дополнительные ресурсы для изучения.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}