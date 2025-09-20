import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddFamilyMemberModal } from "./AddFamilyMemberModal";
import { PhoneNumberManager } from "./PhoneNumberManager";
import { 
  User, 
  GraduationCap, 
  Calendar, 
  DollarSign, 
  FileText, 
  Clock,
  MapPin,
  Users,
  BookOpen,
  Target,
  CreditCard,
  History,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Edit2
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phone?: string;
  age: number;
  status: string;
  courses: Array<{
    id?: string;
    name: string;
    nextLesson?: string;
    nextPayment?: string;
  }>;
}

interface StudentProfileModalProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StudentProfileModal = ({ student, open, onOpenChange }: StudentProfileModalProps) => {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [editedStudent, setEditedStudent] = useState<Student | null>(null);

  if (!student) return null;

  // Initialize edited student data when modal opens
  const currentStudent = editedStudent || student;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'trial': return 'outline';
      default: return 'default';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'active') {
      return 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200';
    }
    return '';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Занимается';
      case 'inactive': return 'Неактивный';
      case 'trial': return 'Пробный';
      default: return status;
    }
  };

  const handleSave = async () => {
    if (!editedStudent) return;
    
    try {
      // Here you would typically save to the database
      // For now, we'll just update the local state
      console.log('Saving student data:', editedStudent);
      setIsEditing(false);
      setEditedStudent(null);
    } catch (error) {
      console.error('Error saving student data:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedStudent(null);
  };

  const handleEdit = () => {
    setEditedStudent({ ...student });
    setIsEditing(true);
  };

  const handleMessageParent = (parentName: string, parentPhone: string) => {
    // This would typically open the chat interface or redirect to messaging
    console.log(`Opening chat with ${parentName} (${parentPhone})`);
    // You could dispatch an action to open the chat or redirect to chat page
  };

  // Mock data - in real app this would come from props or API
  const mockLessons = [
    {
      id: '1',
      groupName: 'ГРУППА ОКСЯ_PR7',
      course: 'Empower A1',
      teacher: 'Пяткин Семён',
      schedule: 'Вт/Чт с 19:20 до 20:40',
      period: 'с 26.08 по 28.05.26',
      status: 'active',
      paid: 16,
      totalLessons: 144,
      remaining: 128,
      cost: '13 010,00 руб.'
    }
  ];

  const mockPayments = [
    {
      id: '1',
      date: '18.09.25',
      amount: '5 000,00 руб.',
      description: 'Учебные материалы "Prepare 7"',
      method: 'Безналичные',
      status: 'Оплачен'
    },
    {
      id: '2', 
      date: '02.09.25',
      amount: '13 010,00 руб.',
      description: 'Оплата для Группа ОКСЯ_PR7 (16 а.ч.)',
      method: 'Безналичные',
      status: 'Оплачен'
    }
  ];

  const mockTests = [
    {
      id: '1',
      date: '24.06.2018',
      type: 'Персональный',
      subject: 'Английский',
      teacher: 'Kaba Edward',
      category: 'Основная',
      test: 'Unit 8',
      result: 'General: 95/100 (95,0%)',
      total: '95,0%'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center border-2 border-primary/20">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                {isEditing && editedStudent ? (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <Input
                      placeholder="Фамилия"
                      value={editedStudent.lastName}
                      onChange={(e) => setEditedStudent({...editedStudent, lastName: e.target.value})}
                      className="text-lg font-semibold h-8"
                    />
                    <Input
                      placeholder="Имя"
                      value={editedStudent.firstName}
                      onChange={(e) => setEditedStudent({...editedStudent, firstName: e.target.value})}
                      className="text-lg font-semibold h-8"
                    />
                    <Input
                      placeholder="Отчество"
                      value={editedStudent.middleName}
                      onChange={(e) => setEditedStudent({...editedStudent, middleName: e.target.value})}
                      className="text-lg font-semibold h-8"
                    />
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold text-foreground">
                    {currentStudent.lastName} {currentStudent.firstName} {currentStudent.middleName}
                  </h2>
                )}
                <p className="text-sm text-muted-foreground">Ученик (ID: {currentStudent.id})</p>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    Отмена
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Сохранить
                  </Button>
                </>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleEdit}
                  className="h-8 w-8 p-0"
                  title="Редактировать"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(95vh-120px)]">
          {/* Left Panel - Basic Info & Parents */}
          <div className="w-80 border-r bg-muted/20 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Общая информация
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Статус</span>
                    <Badge 
                      variant={getStatusColor(currentStudent.status)} 
                      className={`text-xs ${getStatusBadgeClass(currentStudent.status)}`}
                    >
                      {getStatusLabel(currentStudent.status)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Возраст</span>
                    <span className="text-sm font-medium">{currentStudent.age} лет</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Дата рождения</span>
                    <span className="text-sm">03.06.2011</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Телефон</span>
                    {isEditing && editedStudent ? (
                      <Input
                        placeholder="+7 (___) ___-__-__"
                        value={editedStudent.phone || ''}
                        onChange={(e) => setEditedStudent({...editedStudent, phone: e.target.value})}
                        className="text-sm h-6 w-32"
                      />
                    ) : (
                      <span className="text-sm">{currentStudent.phone || 'Не указан'}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="text-xs flex-1">
                    <Users className="w-3 h-3 mr-1" />
                    В группу
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs flex-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    Индивидуально
                  </Button>
                </div>
              </div>

              {/* Parent Contacts */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Родители
                  </h3>
                  <AddFamilyMemberModal 
                    familyGroupId="550e8400-e29b-41d4-a716-446655440000" 
                    onMemberAdded={() => console.log('Member added')}
                  />
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Мария Петрова</p>
                          <Badge variant="outline" className="text-xs">Мама</Badge>
                        </div>
                      </div>
                    </div>
                    <PhoneNumberManager
                      clientId="maria-petrova"
                      phoneNumbers={[
                        {
                          id: '1',
                          phone: '+7 (985) 261-50-56',
                          phoneType: 'mobile',
                          isPrimary: true,
                          isWhatsappEnabled: true,
                          isTelegramEnabled: false
                        }
                      ]}
                      onUpdate={(phoneNumbers) => console.log('Updated phone numbers:', phoneNumbers)}
                      onMessageClick={(phoneNumber, platform) => console.log(`Opening ${platform} chat`)}
                    />
                  </div>
                  
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Александр Петров</p>
                          <Badge variant="outline" className="text-xs">Папа</Badge>
                        </div>
                      </div>
                    </div>
                    <PhoneNumberManager
                      clientId="alexander-petrov"
                      phoneNumbers={[
                        {
                          id: '2',
                          phone: '+7 (903) 444-55-66',
                          phoneType: 'mobile',
                          isPrimary: true,
                          isWhatsappEnabled: true,
                          isTelegramEnabled: true
                        }
                      ]}
                      onUpdate={(phoneNumbers) => console.log('Updated phone numbers:', phoneNumbers)}
                      onMessageClick={(phoneNumber, platform) => console.log(`Opening ${platform} chat`)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Tabs Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-5 m-4 mb-0">
                <TabsTrigger value="info" className="text-xs">Информация</TabsTrigger>
                <TabsTrigger value="lessons" className="text-xs">Занятия</TabsTrigger>
                <TabsTrigger value="tests" className="text-xs">Тесты</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs">Платежи</TabsTrigger>
                <TabsTrigger value="history" className="text-xs">История</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-y-auto p-4 pt-0">
                <TabsContent value="info" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Детальная информация
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Филиал:</span>
                            <span className="text-primary font-medium">OKEY ENGLISH Окская</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Категория:</span>
                            <span>Школьники</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Дисциплины:</span>
                            <span>Английский (Empower 1)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Рекламный источник:</span>
                            <span>По рекомендации</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">В черном списке:</span>
                            <span>Нет</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ответственные:</span>
                            <span className="text-primary font-medium">Пышнов Даниил Александрович</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Тип:</span>
                            <span>Общий</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Дата обращения:</span>
                            <span>30.09.2016</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Оплаты занятий:</span>
                            <span className="text-primary font-medium">125 810,00 руб.</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="lessons" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5" />
                          Занятия
                        </div>
                        <div className="flex gap-2 text-sm">
                          <Badge variant="outline">Актуальные (1)</Badge>
                          <Badge variant="secondary" className="text-primary">Закончившие (10)</Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mockLessons.map((lesson) => (
                          <Card key={lesson.id} className="bg-slate-50 border-slate-200">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-semibold text-slate-900">{lesson.groupName}</h4>
                                  <p className="text-sm text-slate-600">OKEY ENGLISH Окская</p>
                                </div>
                                <Badge className="bg-green-100 text-green-800">Активное</Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                <div>
                                  <span className="text-slate-500">Преподаватель:</span>
                                  <p className="font-medium">{lesson.teacher}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Расписание:</span>
                                  <p className="font-medium">{lesson.schedule}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Период:</span>
                                  <p className="font-medium">{lesson.period}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Аудитория:</span>
                                  <p className="font-medium">WASHINGTON</p>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  Оплачено: {lesson.paid} а.ч. / 13 010,00 руб.
                                </Badge>
                                <Badge variant="destructive" className="text-xs">
                                  Осталось: {lesson.remaining} а.ч. / 112 410,00 руб.
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tests" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Результаты тестов
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">Дата</th>
                              <th className="text-left p-3 font-medium">Тип</th>
                              <th className="text-left p-3 font-medium">Дисциплина</th>
                              <th className="text-left p-3 font-medium">Преподаватель</th>
                              <th className="text-left p-3 font-medium">Тест</th>
                              <th className="text-left p-3 font-medium">Результат</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mockTests.map((test) => (
                              <tr key={test.id} className="border-b hover:bg-muted/30">
                                <td className="p-3">{test.date}</td>
                                <td className="p-3">{test.type}</td>
                                <td className="p-3">{test.subject}</td>
                                <td className="p-3 text-primary">{test.teacher}</td>
                                <td className="p-3">{test.test}</td>
                                <td className="p-3">
                                  <div className="space-y-1">
                                    <div>{test.result}</div>
                                    <div className="font-semibold text-green-600">Итого: {test.total}</div>
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

                <TabsContent value="payments" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Финансовая информация
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold mb-2">Баланс личного счёта</h4>
                        <div className="text-2xl font-bold">125 810,00 - 125 810,00 = 0,00 руб.</div>
                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                          <div>
                            <span className="text-green-600 font-medium">Приход:</span>
                            <span className="ml-2">130 810,00 руб.</span>
                          </div>
                          <div>
                            <span className="text-red-600 font-medium">Расход:</span>
                            <span className="ml-2">125 810,00 руб.</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">Дата</th>
                              <th className="text-left p-3 font-medium">Сумма</th>
                              <th className="text-left p-3 font-medium">Комментарий</th>
                              <th className="text-left p-3 font-medium">Способ оплаты</th>
                              <th className="text-left p-3 font-medium">Статус</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mockPayments.map((payment) => (
                              <tr key={payment.id} className="border-b hover:bg-muted/30">
                                <td className="p-3">{payment.date}</td>
                                <td className="p-3 font-medium">{payment.amount}</td>
                                <td className="p-3 italic">{payment.description}</td>
                                <td className="p-3">{payment.method}</td>
                                <td className="p-3">
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    {payment.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <History className="w-5 h-5" />
                        История действий
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">18.09.2025 19:46</span>
                            <span className="text-primary text-xs">Пышнов Даниил Александрович</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Удалён платёж от Юрганов Н. А. (Учебные материалы): 
                            Дата: 18.09.2025, Счёт: №1111204367, Способ оплаты: Безналичные, 
                            Сумма: 5 000,00 руб. Оплачен (Дата оплаты: 18.09.2025)
                          </p>
                        </div>
                        
                        <div className="p-4 border-l-4 border-green-500 bg-green-50">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">18.09.2025 19:46</span>
                            <span className="text-primary text-xs">Пышнов Даниил Александрович</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Добавлен платёж от Юрганов Н. А. (Учебные материалы): 
                            Дата: 18.09.2025, Счёт: №1111204372, Способ оплаты: Безналичные, 
                            Сумма: 5 000,00 руб. Оплачен (Дата оплаты: 18.09.2025)
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};