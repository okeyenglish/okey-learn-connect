import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Phone, 
  Mail, 
  Calendar, 
  User,
  GraduationCap,
  CreditCard,
  Clock,
  MessageSquare,
  Edit,
  Users,
  BookOpen,
  MapPin,
  Building,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Smartphone,
  MessageCircleIcon
} from 'lucide-react';
import { useStudentDetails, StudentFullDetails } from '@/hooks/useStudentDetails';
import { Student } from '@/hooks/useStudents';

interface EnhancedStudentCardProps {
  student: {
    id: string;
    name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedStudentCard({ student, open, onOpenChange }: EnhancedStudentCardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: studentDetails, isLoading } = useStudentDetails(student.id);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Активный' },
      inactive: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Неактивный' },
      trial: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Пробный' },
      graduated: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Выпускник' },
    };
    const variant = variants[status] || variants.active;
    return <Badge className={`${variant.color} border`}>{variant.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.map(p => p.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const getRelationshipLabel = (relationship: string) => {
    const labels: Record<string, string> = {
      main: 'Основной',
      parent: 'Родитель',
      mother: 'Мать',
      father: 'Отец',
      guardian: 'Опекун',
      spouse: 'Супруг(а)',
      other: 'Другое',
    };
    return labels[relationship] || relationship;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] max-w-full overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Загрузка данных студента...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!studentDetails) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] max-w-full overflow-hidden p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-semibold">
                  {getInitials(studentDetails.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {studentDetails.lastName} {studentDetails.firstName} {studentDetails.middleName}
                </h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {studentDetails.age && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {studentDetails.age} лет
                    </span>
                  )}
                  {studentDetails.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {studentDetails.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    С {formatDate(studentDetails.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(studentDetails.status)}
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100%-88px)]">
          {/* Sidebar */}
          <div className="w-80 border-r bg-muted/30 p-4 overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Быстрые действия</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Написать сообщение
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Добавить в группу
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Записать на урок
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Создать платеж
                    </Button>
                  </CardContent>
                </Card>

                {/* Parents/Guardians */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Родители и опекуны
                      </CardTitle>
                      <Badge variant="secondary">{studentDetails.parents.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {studentDetails.parents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Контакты не добавлены</p>
                    ) : (
                      studentDetails.parents.map((parent) => (
                        <div key={parent.id} className="space-y-2 p-3 bg-background rounded-lg border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{parent.name}</p>
                                {parent.isPrimary && (
                                  <Badge variant="outline" className="text-xs">Основной</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {getRelationshipLabel(parent.relationship)}
                              </p>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-1">
                            {parent.phoneNumbers.map((phone) => (
                              <div key={phone.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span>{phone.phone}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {phone.isWhatsappEnabled && (
                                    <MessageCircleIcon className="h-3 w-3 text-green-600" />
                                  )}
                                  {phone.isTelegramEnabled && (
                                    <Smartphone className="h-3 w-3 text-blue-600" />
                                  )}
                                </div>
                              </div>
                            ))}
                            {parent.email && (
                              <div className="flex items-center gap-1 text-xs">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span>{parent.email}</span>
                              </div>
                            )}
                          </div>

                          <Button variant="ghost" size="sm" className="w-full h-7 text-xs">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Открыть чат
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Notes */}
                {studentDetails.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Заметки</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {studentDetails.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b px-6 pt-4">
                <TabsList className="h-auto p-0 bg-transparent">
                  <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    Обзор
                  </TabsTrigger>
                  <TabsTrigger value="groups" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    Группы
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    Платежи
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    Посещаемость
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    История
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                <TabsContent value="overview" className="mt-0 space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                          <p className="text-2xl font-bold">{studentDetails.groups.length}</p>
                          <p className="text-xs text-muted-foreground">Активных групп</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <p className="text-2xl font-bold">{studentDetails.payments.length}</p>
                          <p className="text-xs text-muted-foreground">Платежей</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                          <p className="text-2xl font-bold">-</p>
                          <p className="text-xs text-muted-foreground">Уроков посещено</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                          <p className="text-2xl font-bold">-</p>
                          <p className="text-xs text-muted-foreground">Средняя оценка</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Current Groups */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Текущие группы
                      </CardTitle>
                      <CardDescription>
                        Активные группы, в которых занимается студент
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {studentDetails.groups.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-muted-foreground">Студент пока не добавлен ни в одну группу</p>
                          <Button variant="outline" size="sm" className="mt-4">
                            <Users className="h-4 w-4 mr-2" />
                            Добавить в группу
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {studentDetails.groups.map((group) => (
                            <div key={group.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-lg">{group.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {group.subject} • {group.level}
                                  </p>
                                </div>
                                <Badge variant={group.status === 'active' ? 'default' : 'secondary'}>
                                  {group.status === 'active' ? 'Активна' : 'Неактивна'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Преподаватель</p>
                                  <p className="font-medium">{group.teacher}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Филиал</p>
                                  <div className="flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    <span>{group.branch}</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Дата записи</p>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(group.enrollmentDate)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Payments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Последние платежи
                      </CardTitle>
                      <CardDescription>
                        История оплат за последнее время
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {studentDetails.payments.length === 0 ? (
                        <div className="text-center py-8">
                          <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-muted-foreground">Платежи отсутствуют</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {studentDetails.payments.slice(0, 5).map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                  <DollarSign className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{payment.description}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(payment.date)} • {payment.paymentMethod || 'Не указан'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-lg">
                                  {payment.amount.toLocaleString('ru-RU')} ₽
                                </p>
                                <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                  {payment.status === 'completed' ? 'Оплачено' : payment.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="groups" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Все группы студента</CardTitle>
                      <CardDescription>
                        Полный список групп, включая неактивные
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {studentDetails.groups.length === 0 ? (
                        <div className="text-center py-12">
                          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-lg text-muted-foreground mb-2">Студент не добавлен в группы</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Добавьте студента в группу для начала обучения
                          </p>
                          <Button>
                            <Users className="h-4 w-4 mr-2" />
                            Добавить в группу
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {studentDetails.groups.map((group) => (
                            <div key={group.id} className="p-4 border rounded-lg">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h4 className="font-semibold text-lg mb-1">{group.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {group.subject} • {group.level}
                                  </p>
                                </div>
                                <Badge variant={group.status === 'active' ? 'default' : 'secondary'}>
                                  {group.status === 'active' ? 'Активна' : 'Завершена'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Преподаватель</p>
                                  <p className="font-medium">{group.teacher}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Филиал</p>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{group.branch}</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Дата записи</p>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(group.enrollmentDate)}</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">Расписание</p>
                                  <span>{group.schedule || 'Не указано'}</span>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button variant="outline" size="sm">
                                  Подробнее
                                </Button>
                                <Button variant="outline" size="sm">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Чат группы
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payments" className="mt-0">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>История платежей</CardTitle>
                          <CardDescription>
                            Полная история всех платежей студента
                          </CardDescription>
                        </div>
                        <Button>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Создать платеж
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {studentDetails.payments.length === 0 ? (
                        <div className="text-center py-12">
                          <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-lg text-muted-foreground mb-2">Платежи отсутствуют</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Создайте первый платеж для студента
                          </p>
                          <Button>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Создать платеж
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {studentDetails.payments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                  payment.status === 'completed' ? 'bg-green-100' : 
                                  payment.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                                }`}>
                                  {payment.status === 'completed' ? (
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                  ) : payment.status === 'pending' ? (
                                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                                  ) : (
                                    <XCircle className="h-6 w-6 text-red-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{payment.description}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(payment.date)}
                                    {payment.paymentMethod && ` • ${payment.paymentMethod}`}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-xl">
                                  {payment.amount.toLocaleString('ru-RU')} ₽
                                </p>
                                <Badge 
                                  variant={payment.status === 'completed' ? 'default' : 'secondary'}
                                  className="text-xs mt-1"
                                >
                                  {payment.status === 'completed' ? 'Оплачено' : 
                                   payment.status === 'pending' ? 'Ожидание' : 'Отменено'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="attendance" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Посещаемость</CardTitle>
                      <CardDescription>
                        История посещений занятий
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg text-muted-foreground mb-2">Данные о посещаемости</p>
                        <p className="text-sm text-muted-foreground">
                          Информация о посещаемости будет доступна после начала занятий
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>История взаимодействий</CardTitle>
                      <CardDescription>
                        Хронология всех действий и событий
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <div className="w-0.5 h-full bg-border"></div>
                          </div>
                          <div className="flex-1 pb-8">
                            <p className="font-medium mb-1">Студент зарегистрирован</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(studentDetails.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
