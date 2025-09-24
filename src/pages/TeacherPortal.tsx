import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video, BookOpen, User, Clock, MapPin, LogOut, GraduationCap, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useToast } from '@/hooks/use-toast';
import { GroupDetailModal } from '@/components/teacher/GroupDetailModal';
import { IndividualLessonModal } from '@/components/teacher/IndividualLessonModal';
import { AddHomeworkModal } from '@/components/teacher/AddHomeworkModal';
import { AttendanceModal } from '@/components/teacher/AttendanceModal';
import { StartLessonModal } from '@/components/teacher/StartLessonModal';
import { LessonPlanCard } from '@/components/teacher/LessonPlanCard';
import { getLessonNumberForGroup } from '@/utils/lessonCalculator';
import { useState } from 'react';

export default function TeacherPortal() {
  const navigate = useNavigate();
  const { user, signOut, profile } = useAuth();
  const { toast } = useToast();
  
  // Состояния для модальных окон
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [startLessonModalOpen, setStartLessonModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionData, setSelectedSessionData] = useState<any>(null);

  // Получаем данные преподавателя по имени из профиля
  const { data: teacher, isLoading: teacherLoading } = useQuery({
    queryKey: ['teacher-by-profile', profile?.first_name, profile?.last_name],
    queryFn: async () => {
      if (!profile?.first_name || !profile?.last_name) return null;
      
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('first_name', profile.first_name)
        .eq('last_name', profile.last_name)
        .eq('is_active', true)
        .limit(1);
      
      if (error) {
        console.error('Error fetching teacher:', error);
        return null;
      }
      
      return data?.[0] || null;
    },
    enabled: !!profile?.first_name && !!profile?.last_name,
  });

  // Получаем сегодняшние занятия преподавателя
  const { data: todayLessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['teacher-lessons-today', teacher?.first_name, teacher?.last_name],
    queryFn: async () => {
      if (!teacher) return [];
      
      const teacherName = `${teacher.last_name} ${teacher.first_name}`;
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          *,
          learning_groups (
            name,
            subject,
            level,
            capacity,
            current_students
          )
        `)
        .eq('teacher_name', teacherName)
        .eq('lesson_date', today)
        .order('start_time');
      
      if (error) throw error;
      return data;
    },
    enabled: !!teacher,
  });

  // Получаем все будущие занятия преподавателя (ближайшие 7 дней)
  const { data: upcomingLessons, isLoading: upcomingLoading } = useQuery({
    queryKey: ['teacher-lessons-upcoming', teacher?.first_name, teacher?.last_name],
    queryFn: async () => {
      if (!teacher) return [];
      
      const teacherName = `${teacher.last_name} ${teacher.first_name}`;
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          *,
          learning_groups (
            name,
            subject,
            level,
            capacity,
            current_students
          )
        `)
        .eq('teacher_name', teacherName)
        .gte('lesson_date', today)
        .lte('lesson_date', nextWeek.toISOString().split('T')[0])
        .order('lesson_date')
        .order('start_time');
      
      if (error) throw error;
      return data;
    },
    enabled: !!teacher,
  });

  // Получаем группы преподавателя
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['teacher-groups', teacher?.first_name, teacher?.last_name],
    queryFn: async () => {
      if (!teacher) return [];
      
      const teacherName = `${teacher.last_name} ${teacher.first_name}`;
      
      const { data, error } = await supabase
        .from('learning_groups')
        .select('*')
        .eq('responsible_teacher', teacherName)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!teacher,
  });

  // Получаем индивидуальные уроки преподавателя
  const { data: individualLessons, isLoading: individualLoading } = useQuery({
    queryKey: ['teacher-individual-lessons', teacher?.first_name, teacher?.last_name],
    queryFn: async () => {
      if (!teacher) return [];
      
      const teacherName = `${teacher.last_name} ${teacher.first_name}`;
      
      const { data, error } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('teacher_name', teacherName)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!teacher,
  });

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

  const handleStartOnlineLesson = (session: any) => {
    setSelectedSessionData(session);
    setStartLessonModalOpen(true);
  };

  const handleAddHomework = (sessionId: string, groupId?: string) => {
    setSelectedSessionId(sessionId);
    setSelectedSessionData({ groupId });
    setHomeworkModalOpen(true);
  };

  const handleAttendance = (sessionId: string, session: any) => {
    setSelectedSessionId(sessionId);
    setSelectedSessionData(session);
    setAttendanceModalOpen(true);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {teacherLoading || lessonsLoading || upcomingLoading || groupsLoading || individualLoading ? (
          <div className="container mx-auto max-w-6xl p-4">
            <div className="text-center py-8">Загружаем данные...</div>
          </div>
        ) : !teacher ? (
          <div className="container mx-auto max-w-6xl p-4">
            <div className="text-center py-8">
              <p className="text-lg mb-4">Преподаватель не найден или у вас нет доступа к этому кабинету</p>
              <Button onClick={() => navigate('/')}>На главную</Button>
            </div>
          </div>
        ) : (
          <div className="container mx-auto max-w-6xl p-4 space-y-6">
            {/* Заголовок */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">{teacher.last_name} {teacher.first_name}</h1>
                  <p className="text-muted-foreground">Личный кабинет преподавателя</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => navigate('/programs/kidsbox1')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Kid's Box 1 - Планирование
                </Button>
                <Button variant="outline" onClick={() => navigate('/newcrm')}>
                  CRM
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Выйти
                </Button>
              </div>
            </div>

            {/* Информация о преподавателе */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Личная информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ФИО</p>
                    <p className="font-medium">{teacher.last_name} {teacher.first_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Филиал</p>
                    <p className="font-medium">{teacher.branch}</p>
                  </div>
                  {teacher.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{teacher.email}</p>
                    </div>
                  )}
                  {teacher.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Телефон</p>
                      <p className="font-medium">{teacher.phone}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Предметы</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {teacher.subjects?.map((subject: string) => (
                      <Badge key={subject} variant="secondary">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Сегодняшние занятия */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Сегодняшние занятия
                </CardTitle>
                <CardDescription>
                  {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ru })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {todayLessons && todayLessons.length > 0 ? (
                   <div className="space-y-6">
                     {todayLessons.map((lesson: any) => (
                       <div key={lesson.id} className="space-y-3">
                         <div className="flex items-center justify-between p-4 border rounded-lg">
                           <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                               <Clock className="h-4 w-4" />
                               {lesson.start_time} - {lesson.end_time}
                             </div>
                             <div className="flex items-center gap-2">
                               <BookOpen className="h-4 w-4" />
                               <span className="font-medium">
                                 {lesson.learning_groups?.name || 'Индивидуальное занятие'}
                               </span>
                             </div>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                               <MapPin className="h-4 w-4" />
                               {lesson.classroom}
                             </div>
                             <Badge variant={lesson.status === 'completed' ? 'default' : 'secondary'}>
                               {lesson.status === 'scheduled' ? 'Запланировано' : 
                                lesson.status === 'ongoing' ? 'Идет урок' : 
                                lesson.status === 'completed' ? 'Завершено' : 'Отменено'}
                             </Badge>
                           </div>
                            <div className="flex items-center gap-2">
                              {lesson.status === 'scheduled' || lesson.status === 'ongoing' ? (
                                <>
                                  <Button 
                                    size="sm"
                                    onClick={() => handleStartOnlineLesson(lesson)}
                                  >
                                    <Video className="h-4 w-4 mr-2" />
                                    Начать урок
                                  </Button>
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAddHomework(lesson.id, lesson.group_id)}
                                  >
                                    +ДЗ
                                  </Button>
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAttendance(lesson.id, lesson)}
                                  >
                                    Присутствие
                                  </Button>
                                </>
                              ) : null}
                            </div>
                         </div>
                         
                         {/* Планирование урока */}
                         <LessonPlanCard
                           lessonNumber={getLessonNumberForGroup(
                             lesson.learning_groups?.name || 'Индивидуальное занятие',
                             lesson.learning_groups?.level,
                             lesson.lesson_date
                           )}
                           groupName={lesson.learning_groups?.name || 'Индивидуальное занятие'}
                           level={lesson.learning_groups?.level}
                           subject={lesson.learning_groups?.subject}
                         />
                       </div>
                     ))}
                   </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    На сегодня занятий не запланировано
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Мои группы */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Мои группы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {groups && groups.length > 0 ? (
                     <div className="space-y-3">
                       {groups.map((group: any) => (
                         <div 
                           key={group.id} 
                           className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                           onClick={() => setSelectedGroupId(group.id)}
                         >
                           <div className="flex items-center justify-between mb-2">
                             <h4 className="font-medium">{group.name}</h4>
                             <Badge variant="outline">{group.level}</Badge>
                           </div>
                           <div className="text-sm text-muted-foreground space-y-1">
                             <p>Предмет: {group.subject}</p>
                             <p>Студентов: {group.current_students}/{group.capacity}</p>
                             {group.schedule_time && (
                               <p>Расписание: {group.schedule_time}</p>
                             )}
                           </div>
                         </div>
                       ))}
                     </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Активных групп не найдено
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Индивидуальные занятия */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Индивидуальные занятия
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {individualLessons && individualLessons.length > 0 ? (
                     <div className="space-y-3">
                       {individualLessons.map((lesson: any) => (
                         <div 
                           key={lesson.id} 
                           className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                           onClick={() => setSelectedLessonId(lesson.id)}
                         >
                           <div className="flex items-center justify-between mb-2">
                             <h4 className="font-medium">{lesson.student_name}</h4>
                             <Badge variant="outline">{lesson.level}</Badge>
                           </div>
                           <div className="text-sm text-muted-foreground space-y-1">
                             <p>Предмет: {lesson.subject}</p>
                             <p>Цена: {lesson.price_per_lesson}₽ за урок</p>
                             {lesson.schedule_time && (
                               <p>Расписание: {lesson.schedule_time}</p>
                             )}
                             <p>Часов: {lesson.academic_hours}</p>
                           </div>
                         </div>
                       ))}
                     </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Индивидуальных занятий не найдено
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Расписание на неделю */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Расписание на неделю
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingLessons && upcomingLessons.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingLessons.map((lesson: any) => (
                      <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <p className="font-medium">
                              {format(new Date(lesson.lesson_date), 'EEEE, d MMMM', { locale: ru })}
                            </p>
                            <p className="text-muted-foreground">
                              {lesson.start_time} - {lesson.end_time}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span className="font-medium">
                              {lesson.learning_groups?.name || 'Индивидуальное занятие'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {lesson.classroom}
                          </div>
                        </div>
                         <div className="flex items-center gap-2">
                           {new Date(`${lesson.lesson_date}T${lesson.start_time}`) <= new Date() && 
                            lesson.status !== 'completed' && lesson.status !== 'cancelled' ? (
                             <>
                               <Button 
                                 size="sm"
                                 onClick={() => handleStartOnlineLesson(lesson)}
                               >
                                 <Video className="h-4 w-4 mr-2" />
                                 Начать урок
                               </Button>
                               <Button 
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleAddHomework(lesson.id, lesson.group_id)}
                               >
                                 +ДЗ
                               </Button>
                               <Button 
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleAttendance(lesson.id, lesson)}
                               >
                                 Присутствие
                               </Button>
                             </>
                           ) : (
                             <div className="flex items-center gap-2">
                               <Badge variant="outline">
                                 {lesson.status === 'scheduled' ? 'Запланировано' : 
                                  lesson.status === 'completed' ? 'Завершено' : 'Отменено'}
                               </Badge>
                               {/* Кнопки для завершенных занятий */}
                               {lesson.status === 'completed' && (
                                 <>
                                   <Button 
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleAddHomework(lesson.id, lesson.group_id)}
                                   >
                                     +ДЗ
                                   </Button>
                                   <Button 
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleAttendance(lesson.id, lesson)}
                                   >
                                     Присутствие
                                   </Button>
                                 </>
                               )}
                             </div>
                           )}
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    На ближайшую неделю занятий не запланировано
                   </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Модальные окна */}
        {selectedGroupId && (
          <GroupDetailModal
            open={!!selectedGroupId}
            onOpenChange={(open) => !open && setSelectedGroupId(null)}
            groupId={selectedGroupId}
          />
        )}
        
        {selectedLessonId && (
          <IndividualLessonModal
            open={!!selectedLessonId}
            onOpenChange={(open) => !open && setSelectedLessonId(null)}
            lessonId={selectedLessonId}
          />
        )}

        {/* Модальное окно добавления домашнего задания */}
        {homeworkModalOpen && selectedSessionId && (
          <AddHomeworkModal
            open={homeworkModalOpen}
            onOpenChange={setHomeworkModalOpen}
            sessionId={selectedSessionId}
            groupId={selectedSessionData?.groupId}
          />
        )}

        {/* Модальное окно отметки присутствия */}
        {attendanceModalOpen && selectedSessionId && selectedSessionData && (
          <AttendanceModal
            open={attendanceModalOpen}
            onOpenChange={setAttendanceModalOpen}
            sessionId={selectedSessionId}
            groupId={selectedSessionData?.group_id}
            sessionDate={selectedSessionData?.lesson_date}
            sessionTime={`${selectedSessionData?.start_time} - ${selectedSessionData?.end_time}`}
          />
        )}

        {/* Модальное окно начала урока */}
        {startLessonModalOpen && selectedSessionData && teacher && (
          <StartLessonModal
            open={startLessonModalOpen}
            onOpenChange={setStartLessonModalOpen}
            session={selectedSessionData}
            teacherName={`${teacher.last_name} ${teacher.first_name}`}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}