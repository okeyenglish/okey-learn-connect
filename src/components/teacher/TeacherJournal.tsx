import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, User, Calendar, FileText, Clock, ClipboardCheck, BookOpenCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTeacherGroups, useTeacherIndividualLessons } from '@/hooks/useTeacherJournal';
import { Teacher } from '@/hooks/useTeachers';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { GroupAttendanceModal } from './modals/GroupAttendanceModal';
import { HomeworkModal } from './modals/HomeworkModal';

interface TeacherJournalProps {
  teacher: Teacher;
  selectedBranchId: string | 'all';
}

export const TeacherJournal = ({ teacher, selectedBranchId }: TeacherJournalProps) => {
  const teacherName = `${teacher.last_name} ${teacher.first_name}`;
  const [attendanceModal, setAttendanceModal] = useState<{ open: boolean; groupId: string; sessionId: string; sessionDate: string } | null>(null);
  const [homeworkModal, setHomeworkModal] = useState<{ open: boolean; groupId: string; sessionId: string } | null>(null);
  
  const { data: groups, isLoading: groupsLoading } = useTeacherGroups(teacherName);
  const { data: individualLessons, isLoading: individualsLoading } = useTeacherIndividualLessons(teacherName);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      scheduled: { label: 'Запланировано', variant: 'secondary' },
      completed: { label: 'Проведено', variant: 'default' },
      cancelled: { label: 'Отменено', variant: 'destructive' },
      rescheduled: { label: 'Перенесено', variant: 'outline' },
    };
    return statusMap[status] || { label: status, variant: 'secondary' };
  };
  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Журнал
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Группы
            </TabsTrigger>
            <TabsTrigger value="individuals" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Индивидуальные
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups">
            {groupsLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">Загрузка...</div>
              </div>
            ) : !groups || groups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">Групповых занятий не найдено</p>
                <p className="text-sm text-muted-foreground">
                  У вас пока нет назначенных групп
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <Card key={group.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{group.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              <span>{group.subject}</span>
                            </div>
                            <Badge variant="outline">{group.level}</Badge>
                            <Badge variant="secondary">{group.branch}</Badge>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{group.students_count} студентов</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {group.recent_sessions.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-3">Последние занятия:</p>
                          <div className="space-y-2">
                            {group.recent_sessions.slice(0, 3).map((session) => (
                              <div key={session.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{format(new Date(session.lesson_date), 'd MMMM yyyy', { locale: ru })}</span>
                                  <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                                  <span>{session.start_time}</span>
                                </div>
                                <Badge variant={getStatusBadge(session.status).variant}>
                                  {getStatusBadge(session.status).label}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const recentSession = group.recent_sessions[0];
                            if (recentSession) {
                              setAttendanceModal({
                                open: true,
                                groupId: group.id,
                                sessionId: recentSession.id,
                                sessionDate: format(new Date(recentSession.lesson_date), 'd MMMM yyyy', { locale: ru }),
                              });
                            }
                          }}
                          disabled={!group.recent_sessions[0]}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Посещаемость
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const recentSession = group.recent_sessions[0];
                            if (recentSession) {
                              setHomeworkModal({
                                open: true,
                                groupId: group.id,
                                sessionId: recentSession.id,
                              });
                            }
                          }}
                          disabled={!group.recent_sessions[0]}
                        >
                          <BookOpenCheck className="h-4 w-4 mr-2" />
                          Домашние задания
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="individuals">
            {individualsLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">Загрузка...</div>
              </div>
            ) : !individualLessons || individualLessons.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">Индивидуальных занятий не найдено</p>
                <p className="text-sm text-muted-foreground">
                  У вас пока нет назначенных индивидуальных уроков
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {individualLessons.map((lesson) => (
                  <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{lesson.student_name}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              <span>{lesson.subject}</span>
                            </div>
                            <Badge variant="secondary">{lesson.branch}</Badge>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{lesson.duration} мин</span>
                            </div>
                          </div>
                          {lesson.schedule_days.length > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <span>Расписание: {lesson.schedule_days.join(', ')} в {lesson.schedule_time}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {lesson.recent_sessions.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-3">Последние занятия:</p>
                          <div className="space-y-2">
                            {lesson.recent_sessions.slice(0, 3).map((session) => (
                              <div key={session.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{format(new Date(session.lesson_date), 'd MMMM yyyy', { locale: ru })}</span>
                                  <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                                  <span>{session.duration} мин</span>
                                </div>
                                <Badge variant={getStatusBadge(session.status).variant}>
                                  {getStatusBadge(session.status).label}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          История занятий
                        </Button>
                        <Button size="sm" variant="outline">
                          <Calendar className="h-4 w-4 mr-2" />
                          Расписание
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    {attendanceModal && (
      <GroupAttendanceModal
        open={attendanceModal.open}
        onOpenChange={(open) => !open && setAttendanceModal(null)}
        groupId={attendanceModal.groupId}
        sessionId={attendanceModal.sessionId}
        sessionDate={attendanceModal.sessionDate}
      />
    )}

    {homeworkModal && (
      <HomeworkModal
        open={homeworkModal.open}
        onOpenChange={(open) => !open && setHomeworkModal(null)}
        groupId={homeworkModal.groupId}
        sessionId={homeworkModal.sessionId}
      />
    )}
    </>
  );
};
