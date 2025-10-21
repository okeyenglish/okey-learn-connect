import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video, BookOpen, User, Clock, MapPin, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Teacher } from '@/hooks/useTeachers';
import { GroupDetailModal } from '@/components/teacher/GroupDetailModal';
import { IndividualLessonModal } from '@/components/teacher/IndividualLessonModal';
import { AddHomeworkModal } from '@/components/teacher/AddHomeworkModal';
import { AttendanceModal } from '@/components/teacher/AttendanceModal';
import { StartLessonModal } from '@/components/teacher/StartLessonModal';
import { LessonPlanCard } from '@/components/teacher/LessonPlanCard';
import { getLessonNumberForGroup } from '@/utils/lessonCalculator';
import { DashboardModal } from '@/components/dashboards/DashboardModal';

interface TeacherHomeProps {
  teacher: Teacher;
}

export const TeacherHome = ({ teacher }: TeacherHomeProps) => {
  const navigate = useNavigate();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [startLessonModalOpen, setStartLessonModalOpen] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionData, setSelectedSessionData] = useState<any>(null);

  const teacherName = `${teacher.last_name} ${teacher.first_name}`;

  // Получаем сегодняшние занятия преподавателя
  const { data: todayLessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['teacher-lessons-today', teacherName],
    queryFn: async () => {
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
  });

  // Получаем группы преподавателя
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['teacher-groups', teacherName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_groups')
        .select('*')
        .eq('responsible_teacher', teacherName)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Получаем индивидуальные уроки преподавателя
  const { data: individualLessons, isLoading: individualLoading } = useQuery({
    queryKey: ['teacher-individual-lessons', teacherName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('teacher_name', teacherName)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Получаем все будущие занятия преподавателя (ближайшие 7 дней)
  const { data: upcomingLessons } = useQuery({
    queryKey: ['teacher-lessons-upcoming', teacherName],
    queryFn: async () => {
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
            level
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
  });

  const handleStartOnlineLesson = (session: any) => {
    setSelectedSessionData(session);
    setStartLessonModalOpen(true);
  };

  const handleAddHomework = (sessionId: string, groupId?: string) => {
    setSelectedSessionId(sessionId);
    setSelectedSessionData({ groupId });
    setHomeworkModalOpen(true);
  };

  const handleAttendance = (sessionId: string, lessonDate: string, startTime: string, endTime: string, groupId?: string) => {
    setSelectedSessionId(sessionId);
    setSelectedSessionData({ 
      lesson_date: lessonDate,
      start_time: startTime, 
      end_time: endTime,
      group_id: groupId
    });
    setAttendanceModalOpen(true);
  };

  if (lessonsLoading || groupsLoading || individualLoading) {
    return <div className="text-center py-8">Загружаем данные...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Кнопка дашборда */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setShowDashboardModal(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Посмотреть статистику
          </Button>
        </div>

        {/* Информация о преподавателе */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Личная информация
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">ФИО</p>
                <p className="font-medium">{teacher.last_name} {teacher.first_name}</p>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Филиал</p>
                <p className="font-medium">{teacher.branch}</p>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Предметы</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {teacher.subjects?.map((subject: string) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
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
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{lesson.start_time} - {lesson.end_time}</span>
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
                                    onClick={() => handleAttendance(
                                      lesson.id, 
                                      lesson.lesson_date,
                                      lesson.start_time,
                                      lesson.end_time,
                                      lesson.group_id
                                    )}
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
              <p className="text-muted-foreground text-center py-8">
                На сегодня занятий не запланировано
              </p>
            )}
          </CardContent>
        </Card>

        {/* Мои группы и Индивидуальные */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      className="p-3 border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
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
                <p className="text-muted-foreground text-center py-8">
                  Активных групп не найдено
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Индивидуальные занятия</CardTitle>
            </CardHeader>
            <CardContent>
              {individualLessons && individualLessons.length > 0 ? (
                <div className="space-y-3">
                  {individualLessons.map((lesson: any) => (
                    <div 
                      key={lesson.id} 
                      className="p-3 border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedLessonId(lesson.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{lesson.student_name}</h4>
                        <Badge variant="outline">{lesson.level}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Предмет: {lesson.subject}</p>
                        {lesson.schedule_time && (
                          <p>Расписание: {lesson.schedule_time}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
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
                  <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {format(new Date(lesson.lesson_date), 'EEEE, d MMMM', { locale: ru })}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {lesson.start_time} - {lesson.end_time}
                        </span>
                      </div>
                      <p className="text-sm">
                        {lesson.learning_groups?.name || 'Индивидуальное'}
                      </p>
                    </div>
                    <Badge variant="secondary">{lesson.classroom}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                На ближайшую неделю занятий не запланировано
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Модальные окна */}
      {selectedGroupId && (
        <GroupDetailModal
          groupId={selectedGroupId}
          open={!!selectedGroupId}
          onOpenChange={(open) => !open && setSelectedGroupId(null)}
        />
      )}

      {selectedLessonId && (
        <IndividualLessonModal
          lessonId={selectedLessonId}
          open={!!selectedLessonId}
          onOpenChange={(open) => !open && setSelectedLessonId(null)}
        />
      )}

      {selectedSessionId && (
        <>
          <AddHomeworkModal
            open={homeworkModalOpen}
            onOpenChange={setHomeworkModalOpen}
            sessionId={selectedSessionId}
            groupId={selectedSessionData?.groupId}
          />
          <AttendanceModal
            open={attendanceModalOpen}
            onOpenChange={setAttendanceModalOpen}
            sessionId={selectedSessionId}
            groupId={selectedSessionData?.group_id}
            sessionDate={selectedSessionData?.lesson_date || ''}
            sessionTime={`${selectedSessionData?.start_time || ''} - ${selectedSessionData?.end_time || ''}`}
          />
        </>
      )}

      {selectedSessionData && (
        <StartLessonModal
          open={startLessonModalOpen}
          onOpenChange={setStartLessonModalOpen}
          session={selectedSessionData}
          teacherName={`${teacher.last_name} ${teacher.first_name}`}
        />
      )}

      <DashboardModal
        open={showDashboardModal}
        onOpenChange={setShowDashboardModal}
      />
    </>
  );
};
