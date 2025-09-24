import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BookOpen, 
  Clock, 
  Users, 
  ChevronDown,
  ExternalLink,
  Copy,
  Video,
  ArrowLeft,
  GraduationCap,
  Target,
  Gamepad2,
  Star
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { InlineCourseMaterials } from "@/components/student/InlineCourseMaterials";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Типы для данных курса
interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
}

interface CourseUnit {
  id: string;
  unit_number: number;
  title: string;
  description: string;
  vocabulary: string;
  grammar: string;
  lessons_count: number;
  sort_order: number;
}

interface Student {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
}

interface LessonSession {
  id: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: string;
  teacher_name: string;
  classroom: string;
  branch: string;
}

export default function CourseDetails() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApi = useRef<any>(null);
  const [isJitsiLoaded, setIsJitsiLoaded] = useState(false);

  // Получение данных о курсе
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseSlug],
    queryFn: async () => {
      if (!courseSlug) throw new Error('Course slug is required');
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', courseSlug)
        .single();
        
      if (error) throw error;
      return data as Course;
    },
    enabled: !!courseSlug
  });

  // Получение юнитов курса
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ['course-units', course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      
      const { data, error } = await supabase
        .from('course_units')
        .select('*')
        .eq('course_id', course.id)
        .order('sort_order');
        
      if (error) throw error;
      return data as CourseUnit[];
    },
    enabled: !!course?.id
  });

  // Получение данных студента
  const { data: student } = useQuery({
    queryKey: ['student-profile'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_student_by_user_id', {
        _user_id: (await supabase.auth.getUser()).data.user?.id
      });
      
      if (error) throw error;
      return data?.[0] as Student;
    }
  });

  // Получение расписания занятий
  const { data: lessonSessions } = useQuery({
    queryKey: ['lesson-sessions', course?.id, student?.id],
    queryFn: async () => {
      if (!course?.id || !student?.id) return [];
      
      const { data, error } = await supabase
        .from('student_lesson_sessions')
        .select(`
          lesson_session_id,
          lesson_sessions (
            id,
            lesson_date,
            start_time,
            end_time,
            status,
            teacher_name,
            classroom,
            branch
          )
        `)
        .eq('student_id', student.id);
        
      if (error) throw error;
      return data?.map(item => item.lesson_sessions).filter(Boolean) as LessonSession[];
    },
    enabled: !!course?.id && !!student?.id
  });

  // Функции для Jitsi
  const generateRoomName = () => {
    if (!course || !student) return '';
    return `okey-english-${course.slug}-${student.id}`.replace(/[^a-zA-Z0-9-]/g, '');
  };

  const generateLessonLink = () => {
    const roomName = generateRoomName();
    return `${window.location.origin}/online-lesson/${roomName}`;
  };

  const copyLessonLink = () => {
    const link = generateLessonLink();
    navigator.clipboard.writeText(link);
    toast({
      title: "Ссылка скопирована!",
      description: "Ссылка на онлайн-урок скопирована в буфер обмена",
    });
  };

  const initializeJitsi = () => {
    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;

    const roomName = generateRoomName();
    if (!roomName) return;

    const options = {
      roomName: roomName,
      width: '100%',
      height: '500px',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'settings', 'videoquality',
          'filmstrip', 'feedback', 'stats', 'shortcuts', 'tileview'
        ],
        SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile'],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false
      },
      userInfo: {
        displayName: student?.name || 'Студент'
      }
    };

    try {
      jitsiApi.current = new window.JitsiMeetExternalAPI('meet.jit.si', options);
      setIsJitsiLoaded(true);
    } catch (error) {
      console.error('Failed to initialize Jitsi:', error);
    }
  };

  const stopJitsi = () => {
    if (jitsiApi.current) {
      jitsiApi.current.dispose();
      jitsiApi.current = null;
      setIsJitsiLoaded(false);
    }
  };

  useEffect(() => {
    return () => {
      stopJitsi();
    };
  }, []);

  // Определение цвета для юнита
  const getUnitColor = (unitNumber: number) => {
    const colors = [
      "bg-blue-50 border-blue-200",
      "bg-green-50 border-green-200", 
      "bg-purple-50 border-purple-200",
      "bg-red-50 border-red-200",
      "bg-yellow-50 border-yellow-200",
      "bg-pink-50 border-pink-200",
      "bg-indigo-50 border-indigo-200",
      "bg-orange-50 border-orange-200",
      "bg-teal-50 border-teal-200",
      "bg-cyan-50 border-cyan-200",
      "bg-lime-50 border-lime-200",
      "bg-emerald-50 border-emerald-200"
    ];
    return colors[(unitNumber - 1) % colors.length];
  };

  if (courseLoading || unitsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Загрузка курса...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Курс не найден</h1>
          <p className="text-gray-600">Запрошенный курс не существует</p>
          <Button onClick={() => navigate('/programs')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Вернуться к курсам
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${course.title} - Детали курса`}
        description={course.description}
        keywords={`${course.title}, английский для детей, обучение английскому`}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/programs')}
                className="text-white border-white hover:bg-white hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <GraduationCap className="h-12 w-12" />
              <div>
                <h1 className="text-4xl font-bold">{course.title}</h1>
                <p className="text-xl text-blue-100">{course.description}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <BookOpen className="h-5 w-5" />
                <span>{units?.length || 0} юнитов</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Clock className="h-5 w-5" />
                <span>{units?.reduce((total, unit) => total + unit.lessons_count, 0) || 0} уроков</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="schedule">Расписание</TabsTrigger>
              <TabsTrigger value="live">Онлайн-урок</TabsTrigger>
              <TabsTrigger value="materials">Материалы</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-6 w-6 text-blue-600" />
                    Структура курса
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {units?.map((unit) => (
                      <Collapsible key={unit.id}>
                        <CollapsibleTrigger asChild>
                          <Card className={`cursor-pointer transition-all hover:shadow-md ${getUnitColor(unit.unit_number)}`}>
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="secondary">
                                      Юнит {unit.unit_number}
                                    </Badge>
                                    <h3 className="text-lg font-semibold">{unit.title}</h3>
                                  </div>
                                  <p className="text-gray-600">{unit.description}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {unit.lessons_count} уроков
                                    </span>
                                  </div>
                                </div>
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              </div>
                            </CardContent>
                          </Card>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Card className="mt-2">
                            <CardContent className="p-6 space-y-4">
                              <div>
                                <h4 className="font-semibold text-green-600 mb-2">📚 Лексика:</h4>
                                <p className="text-gray-700">{unit.vocabulary}</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-blue-600 mb-2">⚙️ Грамматика:</h4>
                                <p className="text-gray-700">{unit.grammar}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-6 w-6 text-blue-600" />
                    Расписание занятий
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lessonSessions && lessonSessions.length > 0 ? (
                    <div className="space-y-3">
                      {lessonSessions.map((session) => (
                        <Card key={session.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold">
                                  {new Date(session.lesson_date).toLocaleDateString('ru-RU')}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {session.start_time} - {session.end_time}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Преподаватель: {session.teacher_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {session.branch}, {session.classroom}
                                </div>
                              </div>
                              <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                                {session.status === 'completed' ? 'Завершено' : 'Запланировано'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      Расписание занятий пока не составлено
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Live Lesson Tab */}
            <TabsContent value="live" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-6 w-6 text-blue-600" />
                    Онлайн-урок
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="flex gap-4 justify-center">
                      <Button 
                        onClick={copyLessonLink}
                        variant="outline"
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Копировать ссылку
                      </Button>
                      <Button 
                        onClick={initializeJitsi}
                        disabled={isJitsiLoaded}
                        className="gap-2"
                      >
                        <Video className="h-4 w-4" />
                        {isJitsiLoaded ? 'Урок активен' : 'Начать урок'}
                      </Button>
                      {isJitsiLoaded && (
                        <Button 
                          onClick={stopJitsi}
                          variant="destructive"
                          className="gap-2"
                        >
                          Завершить урок
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div 
                    ref={jitsiContainerRef} 
                    className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center"
                  >
                    {!isJitsiLoaded && (
                      <div className="text-center space-y-2">
                        <Video className="h-12 w-12 text-gray-400 mx-auto" />
                        <p className="text-gray-500">Нажмите "Начать урок" для подключения</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Materials Tab */}
            <TabsContent value="materials" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                    Учебные материалы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InlineCourseMaterials selectedCourse={course.slug} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}