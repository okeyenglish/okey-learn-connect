import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGroupSessions, useGroupStudents, useGroupHomework, useTeacherPayments } from '@/hooks/useGroupSessions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, BookOpen, DollarSign, Check, X, Edit, Trash2, Plus, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SendMessageForm } from './SendMessageForm';

interface GroupDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export const GroupDetailModal = ({ open, onOpenChange, groupId }: GroupDetailModalProps) => {
  // Получаем данные группы
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['learning_group', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      
      const { data, error } = await supabase
        .from('learning_groups')
        .select(`
          *,
          courses:course_id (
            title
          )
        `)
        .eq('id', groupId)
        .single();
      
      if (error) throw error;
      
      // Добавляем course_name из связанной таблицы
      return {
        ...data,
        course_name: data.courses?.title || null
      };
    },
    enabled: !!groupId && open,
  });

  // Получаем данные с помощью кастомных хуков
  const { data: sessions, isLoading: sessionsLoading } = useGroupSessions(open ? groupId : '');
  const { data: students, isLoading: studentsLoading } = useGroupStudents(open ? groupId : '');
  const { data: homework, isLoading: homeworkLoading } = useGroupHomework(open ? groupId : '');
  const { data: payments, isLoading: paymentsLoading } = useTeacherPayments(open ? groupId : '', group?.responsible_teacher || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Проведено';
      case 'cancelled':
        return 'Отменено';
      case 'rescheduled':
        return 'Перенесено';
      default:
        return 'Запланировано';
    }
  };

  if (!group && !groupLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{group?.name || 'Загрузка...'}</DialogTitle>
              <DialogDescription>Детали группы</DialogDescription>
            </div>
            {group && (
              <Badge variant="outline" className="text-base px-3 py-1">
                {group.level}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {groupLoading || sessionsLoading || studentsLoading || homeworkLoading || paymentsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">Загружаем данные...</div>
          </div>
        ) : group ? (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Основная информация о группе */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Предмет</p>
                  <p className="font-medium">{group.subject}</p>
                </div>
                <div>  
                  <p className="text-muted-foreground">Филиал</p>
                  <p className="font-medium">{group.branch}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Студентов</p>
                  <p className="font-medium">{group.current_students}/{group.capacity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Расписание</p>
                  <p className="font-medium">{group.schedule_time || 'Не указано'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Аудитория</p>
                  <p className="font-medium">{group.schedule_room || 'Не указана'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Период</p>
                  <p className="font-medium">
                    {group.period_start && group.period_end
                      ? `${format(new Date(group.period_start), 'd.MM.yy')} - ${format(new Date(group.period_end), 'd.MM.yy')}`
                      : 'Не указан'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Табы с контентом */}
            <Tabs defaultValue="schedule" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="schedule">Расписание</TabsTrigger>
                <TabsTrigger value="students">Студенты</TabsTrigger>
                <TabsTrigger value="homework">ДЗ</TabsTrigger>
                <TabsTrigger value="payments">Оплаты</TabsTrigger>
              </TabsList>

              {/* Расписание занятий */}
              <TabsContent value="schedule" className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Все занятия группы
                    </h3>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Показать все элементы расписания
                    </Button>
                  </div>
                  
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
                            <Badge className={getStatusColor(session.status)}>
                              {getStatusLabel(session.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Занятий пока не запланировано
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Студенты */}
              <TabsContent value="students" className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Студенты ({students?.length || 0})
                  </h3>
                  
                  {students && students.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {students.map((student: any) => (
                        <div key={student.id} className="p-3 border rounded-lg bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">
                              {student.first_name} {student.last_name}
                            </h4>
                            <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {student.status === 'active' ? 'Активный' : 'Неактивный'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <p>Возраст: {student.age} лет</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                              <Plus className="h-3 w-3 mr-1" />
                              В ЛК
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      В группе пока нет студентов
                    </p>
                  )}

                  {/* Форма отправки сообщения группе */}
                  {group && (
                    <SendMessageForm
                      messageType="group"
                      targetGroupId={group.id}
                      branch={group.branch}
                      groupName={group.name}
                    />
                  )}
                </div>
              </TabsContent>

              {/* Домашние задания */}
              <TabsContent value="homework" className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-blue-50 p-3 rounded-t-lg">
                    <h3 className="text-blue-700 font-medium">ДОМАШНИЕ ЗАДАНИЯ / ПЛАНЫ ЗАНЯТИЙ</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 h-6 text-xs">
                        полностью
                      </Button>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-6 text-xs">
                        Добавить
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-b-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium text-gray-600">Сотрудник</th>
                            <th className="text-left p-2 font-medium text-gray-600">Занятие</th>
                            <th className="text-left p-2 font-medium text-gray-600">ЛК</th>
                            <th className="text-left p-2 font-medium text-gray-600">Комментарий</th>
                            <th className="text-right p-2 font-medium text-gray-600">Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {homework?.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">
                                <span className="text-blue-600 hover:underline cursor-pointer text-xs">
                                  {item.student_name}
                                </span>
                              </td>
                              <td className="p-2 text-xs">{format(new Date(item.lesson_date), 'd MMMM yyyy г.', { locale: ru })}</td>
                              <td className="p-2">
                                {item.is_completed ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <X className="h-3 w-3 text-gray-400" />
                                )}
                              </td>
                              <td className="p-2">
                                <span className="text-blue-600 hover:underline cursor-pointer text-xs">
                                  {item.assignment}
                                </span>
                              </td>
                              <td className="p-2">
                                <div className="flex items-center gap-1 justify-end">
                                  <Button variant="ghost" size="sm" className="text-yellow-600 hover:bg-yellow-50 h-6 w-6 p-0">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 h-6 w-6 p-0">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Оплаты преподавателям */}
              <TabsContent value="payments" className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-3">
                  <div className="bg-slate-700 text-white p-3 rounded-t-lg">
                    <h3 className="font-medium">ОПЛАТЫ ПРЕПОДАВАТЕЛЯМ</h3>
                  </div>
                  
                  <div className="p-4 border border-t-0 rounded-b-lg">
                    {payments?.map((payment) => (
                      <div key={payment.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-blue-600 font-medium">{payment.teacher_name}</h4>
                            <p className="text-red-600 font-medium text-sm">
                              Задолженность: {payment.amount} а.ч. / {payment.academic_hours.toLocaleString('ru-RU')} руб.
                            </p>
                          </div>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Оплатить занятия
                          </Button>
                        </div>
                        
                        {/* Компактный календарь оплат */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-10 gap-1 text-center text-xs max-h-32 overflow-y-auto">
                            {Array.from({ length: 60 }, (_, i) => {
                              const startDate = new Date(2025, 5, 20);
                              const date = new Date(startDate);
                              date.setDate(date.getDate() + i);
                              
                              const isPaymentDate = [23, 25, 30, 3, 7, 9, 14, 16, 21, 23, 28, 30, 4, 6, 11, 13, 18, 20, 25, 27].includes(date.getDate());
                              const isCurrentDate = date.getDate() === 27 && date.getMonth() === 7;
                              
                              return (
                                <div
                                  key={i}
                                  className={`
                                    aspect-square flex items-center justify-center text-xs rounded cursor-pointer
                                    ${isPaymentDate ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}
                                    ${isCurrentDate ? 'bg-blue-500 text-white' : ''}
                                  `}
                                  title={format(date, 'd MMMM yyyy', { locale: ru })}
                                >
                                  {date.getDate()}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
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