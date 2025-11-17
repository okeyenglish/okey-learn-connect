import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BookOpen, User, LogOut, Library, BarChart3, Wallet, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useToast } from '@/hooks/use-toast';
import { CourseMaterialsLibrary } from '@/components/student/CourseMaterialsLibrary';
import { StudentLessonCard } from '@/components/student/StudentLessonCard';
import { DashboardModal } from '@/components/dashboards/DashboardModal';
import { StudentDashboard } from '@/components/dashboards/StudentDashboard';

export default function StudentPortal() {
  const navigate = useNavigate();
  const { user, signOut, isRoleEmulation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDashboardModal, setShowDashboardModal] = useState(false);

  // Получаем данные студента
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-by-user', user?.id, isRoleEmulation],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Если админ тестирует роль студента, используем демо-студента
      if (isRoleEmulation) {
        const { data: demoProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', 'demo-student@academius.ru')
          .single();
        
        if (demoProfile) {
          const { data, error } = await supabase.rpc('get_student_by_user_id', {
            _user_id: demoProfile.id
          });
          if (!error && data?.[0]) {
            return data[0];
          }
        }
      }
      
      const { data, error } = await supabase.rpc('get_student_by_user_id', {
        _user_id: user.id
      });
      if (error) {
        console.error('Error fetching student:', error);
        return null;
      }
      return data?.[0] || null;
    },
    enabled: !!user?.id,
  });

  // Получаем расписание занятий
  const { data: lessonSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['lesson-sessions', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      
      const { data: studentSessions, error } = await supabase
        .from('student_lesson_sessions')
        .select(`
          lesson_session_id,
          attendance_status,
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
            group_id,
            learning_groups (
              id,
              name,
              subject
            )
          )
        `)
        .eq('student_id', student.id)
        .gte('lesson_sessions.lesson_date', new Date().toISOString().split('T')[0])
        .order('lesson_sessions(lesson_date)', { ascending: true });
      
      if (error) throw error;
      
      return studentSessions?.map(s => ({
        ...s.lesson_sessions,
        attendance_status: s.attendance_status,
        group: s.lesson_sessions?.learning_groups
      })).filter(Boolean) || [];
    },
    enabled: !!student?.id,
  });

  // Получаем домашние задания
  const { data: homework, isLoading: homeworkLoading } = useQuery({
    queryKey: ['student-homework', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      
      const { data, error } = await supabase
        .from('student_homework')
        .select(`
          id,
          status,
          completed_at,
          grade,
          teacher_notes,
          student_notes,
          homework (
            id,
            assignment,
            description,
            due_date,
            lesson_session_id,
            group_id,
            learning_groups (
              name,
              subject
            )
          )
        `)
        .eq('student_id', student.id)
        .order('homework(due_date)', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!student?.id,
  });

  // Получаем баланс
  const { data: balance } = useQuery({
    queryKey: ['student-balance', student?.id],
    queryFn: async () => {
      if (!student?.id) return null;
      
      const { data, error } = await supabase
        .from('student_balances')
        .select('*')
        .eq('student_id', student.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || { balance: 0 };
    },
    enabled: !!student?.id,
  });

  // Получаем историю платежей и вычисляем статистику
  const { data: payments } = useQuery({
    queryKey: ['student-payments', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', student.id)
        .order('payment_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!student?.id,
  });

  // Вычисляем общую сумму оплат
  const totalPaid = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
  const currentBalance = balance?.balance || 0;
  const totalDebt = currentBalance < 0 ? Math.abs(currentBalance) : 0;

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

  const getHomeworkStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      assigned: { label: 'Назначено', variant: 'secondary' },
      in_progress: { label: 'В работе', variant: 'default' },
      completed: { label: 'Выполнено', variant: 'outline' },
      reviewed: { label: 'Проверено', variant: 'default' },
    };
    const config = statusMap[status] || statusMap.assigned;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (studentLoading || sessionsLoading || homeworkLoading) {
    return (
      <div className="container mx-auto max-w-6xl p-4">
        <div className="text-center py-8">Загружаем данные...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container mx-auto max-w-6xl p-4">
        <div className="text-center py-8">
          <p className="text-lg mb-4">Студент не найден или у вас нет доступа</p>
          <Button onClick={() => navigate('/')}>На главную</Button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-6xl p-4 space-y-6">
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
              <Button variant="outline" size="sm" onClick={() => setShowDashboardModal(true)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Дашборд
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Выход
              </Button>
            </div>
          </div>

          {/* Быстрая статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Баланс</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {balance?.balance || 0} ₽
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(balance?.balance || 0) < 0 ? 'Задолженность' : 'Оплачено'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Занятий</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lessonSessions?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Запланировано</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Домашних заданий</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {homework?.filter(h => h.status !== 'reviewed').length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Активных</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Статус</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                  {student.status === 'active' ? 'Активный' : 
                   student.status === 'trial' ? 'Пробный' :
                   student.status === 'graduated' ? 'Выпускник' : 'Неактивный'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Вкладки */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard">
                <User className="h-4 w-4 mr-2" />
                Главная
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <Calendar className="h-4 w-4 mr-2" />
                Расписание
              </TabsTrigger>
              <TabsTrigger value="homework">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Домашние задания
              </TabsTrigger>
              <TabsTrigger value="payments">
                <Wallet className="h-4 w-4 mr-2" />
                Оплаты
              </TabsTrigger>
              <TabsTrigger value="materials">
                <Library className="h-4 w-4 mr-2" />
                Материалы
              </TabsTrigger>
            </TabsList>

            {/* Вкладка: Главная */}
            <TabsContent value="dashboard" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Личная информация
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <p className="text-sm text-muted-foreground">Дата регистрации</p>
                      <p className="font-medium">
                        {format(new Date(student.created_at), 'dd.MM.yyyy', { locale: ru })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ближайшие занятия */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Ближайшие занятия
                  </CardTitle>
                  <CardDescription>Ваше расписание на ближайшее время</CardDescription>
                </CardHeader>
                <CardContent>
                  {lessonSessions && lessonSessions.length > 0 ? (
                    <div className="space-y-3">
                      {lessonSessions.slice(0, 5).map((session: any) => (
                        <StudentLessonCard key={session.id} lesson={session} type="group" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Нет запланированных занятий</p>
                  )}
                </CardContent>
              </Card>

              {/* Активные домашние задания */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Активные домашние задания
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {homework && homework.filter(h => h.status !== 'reviewed').length > 0 ? (
                    <div className="space-y-3">
                      {homework
                        .filter(h => h.status !== 'reviewed')
                        .slice(0, 3)
                        .map((hw: any) => (
                          <div key={hw.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{hw.homework.assignment}</h4>
                                  {getHomeworkStatusBadge(hw.status)}
                                </div>
                                {hw.homework.learning_groups && (
                                  <p className="text-sm text-muted-foreground">
                                    {hw.homework.learning_groups.name} • {hw.homework.learning_groups.subject}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {format(new Date(hw.homework.due_date), 'dd MMM', { locale: ru })}
                                </p>
                              </div>
                            </div>
                            {hw.homework.description && (
                              <p className="text-sm text-muted-foreground">{hw.homework.description}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Нет активных домашних заданий</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Вкладка: Расписание */}
            <TabsContent value="schedule" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Расписание занятий</CardTitle>
                  <CardDescription>Все ваши запланированные занятия</CardDescription>
                </CardHeader>
                <CardContent>
                  {lessonSessions && lessonSessions.length > 0 ? (
                    <div className="space-y-3">
                      {lessonSessions.map((session: any) => (
                        <StudentLessonCard key={session.id} lesson={session} type="group" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Нет запланированных занятий</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Вкладка: Домашние задания */}
            <TabsContent value="homework" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Домашние задания</CardTitle>
                  <CardDescription>Все ваши задания и их статусы</CardDescription>
                </CardHeader>
                <CardContent>
                  {homework && homework.length > 0 ? (
                    <div className="space-y-4">
                      {homework.map((hw: any) => (
                        <div key={hw.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-lg">{hw.homework.assignment}</h4>
                                {getHomeworkStatusBadge(hw.status)}
                              </div>
                              {hw.homework.learning_groups && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {hw.homework.learning_groups.name} • {hw.homework.learning_groups.subject}
                                </p>
                              )}
                              {hw.homework.description && (
                                <p className="text-sm mb-2">{hw.homework.description}</p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm font-medium mb-1">Срок</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(hw.homework.due_date), 'dd MMMM yyyy', { locale: ru })}
                              </p>
                            </div>
                          </div>

                          {hw.grade && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm font-medium">Оценка: {hw.grade}</p>
                            </div>
                          )}

                          {hw.teacher_notes && (
                            <div className="mt-2 p-3 bg-muted/50 rounded">
                              <p className="text-sm font-medium mb-1">Комментарий преподавателя:</p>
                              <p className="text-sm">{hw.teacher_notes}</p>
                            </div>
                          )}

                          {hw.completed_at && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              Выполнено: {format(new Date(hw.completed_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Домашних заданий пока нет</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Вкладка: Оплаты */}
            <TabsContent value="payments" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Баланс и оплаты</CardTitle>
                  <CardDescription>Информация о платежах и балансе</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Текущий баланс */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Текущий баланс</p>
                      <p className={`text-2xl font-bold ${currentBalance < 0 ? 'text-destructive' : 'text-primary'}`}>
                        {currentBalance} ₽
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Всего оплачено</p>
                      <p className="text-2xl font-bold">{totalPaid} ₽</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Общая задолженность</p>
                      <p className="text-2xl font-bold text-destructive">{totalDebt} ₽</p>
                    </div>
                  </div>

                  {/* История платежей */}
                  <div>
                    <h3 className="font-semibold mb-4">История платежей</h3>
                    {payments && payments.length > 0 ? (
                      <div className="space-y-3">
                        {payments.map((payment: any) => (
                          <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">
                                {format(new Date(payment.payment_date), 'dd MMMM yyyy', { locale: ru })}
                              </p>
                              <p className="text-sm text-muted-foreground">{payment.payment_method || 'Оплата'}</p>
                              {payment.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">+{payment.amount} ₽</p>
                              <Badge variant="outline">{payment.status || 'completed'}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">История платежей пуста</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Вкладка: Материалы */}
            <TabsContent value="materials" className="mt-6">
              <CourseMaterialsLibrary />
            </TabsContent>
          </Tabs>
        </div>

        {/* Модальное окно дашборда */}
        <DashboardModal 
          open={showDashboardModal} 
          onOpenChange={setShowDashboardModal} 
        />
      </div>
    </ProtectedRoute>
  );
}
