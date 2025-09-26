import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Phone, 
  Mail, 
  Calendar, 
  MapPin,
  User,
  GraduationCap,
  CreditCard,
  Gift,
  Clock,
  MessageSquare,
  Edit,
  Pause,
  Play,
  Settings,
  Users,
  BookOpen
} from 'lucide-react';
// import { AddToGroupModal } from './AddToGroupModal';
// import { AddIndividualLessonModal } from './AddIndividualLessonModal';
import { AddToGroupModal } from './AddToGroupModal';
import { AddIndividualLessonModal } from './AddIndividualLessonModal';
import { CreatePaymentModal } from './CreatePaymentModal';
import { Student } from '@/hooks/useStudents';


interface StudentCardProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentCard({ student, open, onOpenChange }: StudentCardProps) {
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [showAddIndividualLesson, setShowAddIndividualLesson] = useState(false);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Активный</Badge>;
      case 'inactive':
        return <Badge variant="outline">Неактивный</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Пробный</Badge>;
      case 'graduated':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Выпускник</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSubscriptionBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Активен</Badge>;
      case 'expired':
        return <Badge variant="destructive">Истек</Badge>;
      case 'none':
        return <Badge variant="outline">Нет абонемента</Badge>;
      default:
        return <Badge variant="outline">Не указан</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[1].charAt(0)}${parts[0].charAt(0)}`.toUpperCase() : name.charAt(0).toUpperCase();
  };

  const getFullName = () => {
    return student.name || [student.last_name, student.first_name, student.middle_name]
      .filter(Boolean)
      .join(' ');
  };

  // Моковые данные для демонстрации
  const mockSchedule = [
    { day: 'Понедельник', time: '18:00-19:30', group: 'Intermediate Group A', teacher: 'Анна Петрова' },
    { day: 'Среда', time: '18:00-19:30', group: 'Intermediate Group A', teacher: 'Анна Петрова' },
    { day: 'Пятница', time: '18:00-19:30', group: 'Intermediate Group A', teacher: 'Анна Петрова' }
  ];

  const mockAttendance = [
    { date: '2024-01-25', status: 'attended', lesson: 'Present Perfect Continuous' },
    { date: '2024-01-23', status: 'attended', lesson: 'Modal Verbs' },
    { date: '2024-01-20', status: 'missed', lesson: 'Past Perfect', reason: 'Болезнь' },
    { date: '2024-01-18', status: 'attended', lesson: 'Conditionals' },
    { date: '2024-01-15', status: 'attended', lesson: 'Passive Voice' }
  ];

  const mockPayments = [
    { date: '2024-01-15', amount: 8000, description: 'Абонемент на 8 занятий', status: 'paid' },
    { date: '2023-12-20', amount: 8000, description: 'Абонемент на 8 занятий', status: 'paid' },
    { date: '2023-11-25', amount: 4000, description: 'Индивидуальные занятия', status: 'paid' }
  ];

  const mockTasks = [
    { date: '2024-01-25', task: 'Связаться с родителями по поводу успеваемости', status: 'pending', author: 'Анна Петрова' },
    { date: '2024-01-20', task: 'Предложить дополнительные материалы', status: 'completed', author: 'Мария Иванова' },
    { date: '2024-01-15', task: 'Обсудить перевод в следующую группу', status: 'completed', author: 'Анна Петрова' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {getInitials(student.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{getFullName()}</h2>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(student.status)}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Основная информация */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Личная информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {student.age || calculateAge(student.date_of_birth || '')} лет 
                    {student.date_of_birth && ` (${formatDate(student.date_of_birth)})`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{student.phone || 'Не указан'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">С {formatDate(student.created_at)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Финансы и абонементы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Статус:</span>
                    {getStatusBadge(student.status)}
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Заметки:</span>
                  <span className="text-sm text-muted-foreground">
                    {student.notes || 'Нет заметок'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Действия */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddToGroup(true)}>
              <Users className="h-4 w-4 mr-2" />
              В группу
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddIndividualLesson(true)}>
              <BookOpen className="h-4 w-4 mr-2" />
              Индивидуально
            </Button>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Написать сообщение
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Записать на урок
            </Button>
            {student.status === 'active' ? (
              <Button variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-2" />
                Приостановить
              </Button>
            ) : student.status === 'inactive' ? (
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Возобновить
              </Button>
            ) : null}
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Настройки
            </Button>
          </div>

          {/* Модальные окна будут добавлены после создания компонентов */}
          {/* 
          <AddToGroupModal
            studentId={student.id}
            studentName={student.name}
            open={showAddToGroup}
            onOpenChange={setShowAddToGroup}
          />
          
          <AddIndividualLessonModal
            studentId={student.id}
            studentName={student.name}
            open={showAddIndividualLesson}
            onOpenChange={setShowAddIndividualLesson}
          />
          */}

          {/* Детальная информация в табах */}
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="schedule">Расписание</TabsTrigger>
              <TabsTrigger value="attendance">Посещаемость</TabsTrigger>
              <TabsTrigger value="payments">Платежи</TabsTrigger>
              <TabsTrigger value="tasks">Задачи</TabsTrigger>
              <TabsTrigger value="history">История</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Текущее расписание</CardTitle>
                  <CardDescription>
                    Регулярные занятия ученика
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockSchedule.map((lesson, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{lesson.day}</p>
                          <p className="text-sm text-muted-foreground">{lesson.time}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{lesson.group}</p>
                          <p className="text-sm text-muted-foreground">{lesson.teacher}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>История посещаемости</CardTitle>
                  <CardDescription>
                    Последние занятия и отметки о посещении
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockAttendance.map((record, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{formatDate(record.date)}</p>
                          <p className="text-sm text-muted-foreground">{record.lesson}</p>
                          {record.reason && (
                            <p className="text-sm text-red-600">Причина: {record.reason}</p>
                          )}
                        </div>
                        <Badge 
                          variant={record.status === 'attended' ? 'default' : 'destructive'}
                          className={record.status === 'attended' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                        >
                          {record.status === 'attended' ? 'Присутствовал' : 'Отсутствовал'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>История платежей</CardTitle>
                    <CardDescription>
                      Оплаты за обучение и дополнительные услуги
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowCreatePayment(true)}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Добавить платеж
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockPayments.map((payment, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{formatDate(payment.date)}</p>
                          <p className="text-sm text-muted-foreground">{payment.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{payment.amount.toLocaleString('ru-RU')} ₽</p>
                          <Badge 
                            variant="default"
                            className="bg-green-100 text-green-800 hover:bg-green-100"
                          >
                            Оплачено
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Задачи и напоминания</CardTitle>
                  <CardDescription>
                    Задачи по работе с учеником
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockTasks.map((task, index) => (
                      <div key={index} className="flex justify-between items-start p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{task.task}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.author} • {formatDate(task.date)}
                          </p>
                        </div>
                        <Badge 
                          variant={task.status === 'completed' ? 'default' : 'secondary'}
                          className={task.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                        >
                          {task.status === 'completed' ? 'Выполнено' : 'В работе'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>История взаимодействий</CardTitle>
                  <CardDescription>
                    Все взаимодействия с учеником
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Создан профиль ученика</p>
                        <p className="text-sm text-muted-foreground">{formatDate(student.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Отправлено приглашение в личный кабинет</p>
                        <p className="text-sm text-muted-foreground">15.01.2024</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Оформлен абонемент на 8 занятий</p>
                        <p className="text-sm text-muted-foreground">15.01.2024</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      {/* Модальные окна */}
      <AddToGroupModal
        open={showAddToGroup}
        onOpenChange={setShowAddToGroup}
        studentId={student.id}
        studentName={student.name || 'Студент'}
      />

      <AddIndividualLessonModal
        open={showAddIndividualLesson}
        onOpenChange={setShowAddIndividualLesson}
        studentId={student.id}
        studentName={student.name || 'Студент'}
      />
      <CreatePaymentModal
        open={showCreatePayment}
        onOpenChange={setShowCreatePayment}
        studentId={student.id}
        studentName={student.name || 'Студент'}
      />
    </Dialog>
  );
}