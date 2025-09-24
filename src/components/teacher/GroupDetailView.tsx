import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGroupSessions, useGroupStudents, useGroupHomework, useTeacherPayments } from '@/hooks/useGroupSessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Users, BookOpen, DollarSign, Check, X, Edit, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const GroupDetailView = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  // Получаем данные группы
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['learning_group', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      
      const { data, error } = await supabase
        .from('learning_groups')
        .select('*')
        .eq('id', groupId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  // Получаем данные с помощью кастомных хуков
  const { data: sessions, isLoading: sessionsLoading } = useGroupSessions(groupId || '');
  const { data: students, isLoading: studentsLoading } = useGroupStudents(groupId || '');
  const { data: homework, isLoading: homeworkLoading } = useGroupHomework(groupId || '');
  const { data: payments, isLoading: paymentsLoading } = useTeacherPayments(groupId || '', group?.responsible_teacher || '');

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

  if (groupLoading || sessionsLoading || studentsLoading || homeworkLoading || paymentsLoading) {
    return (
      <div className="container mx-auto max-w-6xl p-4">
        <div className="text-center py-8">Загружаем данные...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto max-w-6xl p-4">
        <div className="text-center py-8">
          <p className="text-lg mb-4">Группа не найдена</p>
          <Button onClick={() => navigate('/teacher-portal')}>Назад к кабинету</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/teacher-portal')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-muted-foreground">Детали группы</p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {group.level}
        </Badge>
      </div>

      {/* Основная информация о группе */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Информация о группе
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Предмет</p>
              <p className="font-medium">{group.subject}</p>
            </div>
            <div>  
              <p className="text-sm text-muted-foreground">Филиал</p>
              <p className="font-medium">{group.branch}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Студентов</p>
              <p className="font-medium">{group.current_students}/{group.capacity}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Расписание</p>
              <p className="font-medium">{group.schedule_time || 'Не указано'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Аудитория</p>
              <p className="font-medium">{group.schedule_room || 'Не указана'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Период</p>
              <p className="font-medium">
                {group.period_start && group.period_end
                  ? `${format(new Date(group.period_start), 'd.MM.yy')} - ${format(new Date(group.period_end), 'd.MM.yy')}`
                  : 'Не указан'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Табы с контентом */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Расписание</TabsTrigger>
          <TabsTrigger value="students">Студенты</TabsTrigger>
          <TabsTrigger value="homework">Домашние задания</TabsTrigger>
          <TabsTrigger value="payments">Оплаты</TabsTrigger>
        </TabsList>

        {/* Расписание занятий */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Все занятия группы
              </CardTitle>
              <CardDescription>
                Показать все элементы расписания
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions && sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <p className="font-medium">
                            {format(new Date(session.lesson_date), 'EEEE, d MMMM yyyy', { locale: ru })}
                          </p>
                          <p className="text-muted-foreground">
                            {session.start_time} - {session.end_time}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Ауд. {session.classroom}
                        </div>
                        <Badge className={getStatusColor(session.status)}>
                          {getStatusLabel(session.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
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
                <p className="text-muted-foreground text-center py-4">
                  Занятий пока не запланировано
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Студенты */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Студенты ({students?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students && students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {students.map((student: any) => (
                    <div key={student.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          {student.first_name} {student.last_name}
                        </h4>
                        <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                          {student.status === 'active' ? 'Активный' : 'Неактивный'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Возраст: {student.age} лет</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="ghost" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Добавить в ЛК
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  В группе пока нет студентов
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Домашние задания */}
        <TabsContent value="homework" className="space-y-4">
          <Card>
            <CardHeader className="bg-blue-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-blue-700">
                  ДОМАШНИЕ ЗАДАНИЯ / ПЛАНЫ ЗАНЯТИЙ
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    полностью
                  </Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Добавить
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Сотрудник</th>
                      <th className="text-left p-3 font-medium text-gray-600">Занятие</th>
                      <th className="text-left p-3 font-medium text-gray-600">Отобразить в ЛК</th>
                      <th className="text-left p-3 font-medium text-gray-600">Комментарий</th>
                      <th className="text-right p-3 font-medium text-gray-600">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homework?.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <span className="text-blue-600 hover:underline cursor-pointer">
                            {item.student_name}
                          </span>
                        </td>
                        <td className="p-3">{format(new Date(item.lesson_date), 'd MMMM yyyy г.', { locale: ru })}</td>
                        <td className="p-3">
                          {item.is_completed ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-gray-400" />
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-blue-600 hover:underline cursor-pointer">
                            {item.assignment}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 justify-end">
                            <Button variant="ghost" size="sm" className="text-yellow-600 hover:bg-yellow-50">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Оплаты преподавателям */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader className="bg-slate-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <span>ОПЛАТЫ ПРЕПОДАВАТЕЛЯМ</span>
                <Button variant="ghost" size="sm" className="text-white hover:bg-slate-600">
                  -
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {payments?.map((payment) => (
                <div key={payment.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-blue-600">{payment.teacher_name}</h3>
                      <p className="text-red-600 font-medium">
                        Задолженность: {payment.amount} а.ч. / {payment.academic_hours.toLocaleString('ru-RU')} руб.
                      </p>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Оплатить занятия
                    </Button>
                  </div>
                  
                  {/* Календарь оплат */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {/* Генер��руем календарь с датами */}
                      {Array.from({ length: 42 }, (_, i) => {
                        const startDate = new Date(2025, 5, 20); // Начинаем с 20 июня
                        const date = new Date(startDate);
                        date.setDate(date.getDate() + i);
                        
                        const isPaymentDate = [23, 25, 30, 3, 7, 9, 14, 16, 21, 23, 28, 30, 4, 6, 11, 13, 18, 20, 25, 27].includes(date.getDate());
                        const isCurrentDate = date.getDate() === 27 && date.getMonth() === 7; // 27 августа
                        
                        return (
                          <div
                            key={i}
                            className={`
                              aspect-square flex items-center justify-center text-xs rounded
                              ${isPaymentDate ? 'bg-red-500 text-white' : 'bg-gray-100'}
                              ${isCurrentDate ? 'bg-blue-500 text-white' : ''}
                            `}
                          >
                            {date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {Array.from({ length: 42 }, (_, i) => {
                        const startDate = new Date(2025, 8, 3); // Начинаем с 3 сентября
                        const date = new Date(startDate);
                        date.setDate(date.getDate() + i);
                        
                        const isPaymentDate = [5, 10, 12, 17, 19, 24, 26, 1, 3, 8, 10, 15, 17, 22, 24, 29, 31].includes(date.getDate());
                        
                        return (
                          <div
                            key={i + 42}
                            className={`
                              aspect-square flex items-center justify-center text-xs rounded
                              ${isPaymentDate ? 'bg-red-500 text-white' : 'bg-gray-100'}
                            `}
                          >
                            {date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GroupDetailView;