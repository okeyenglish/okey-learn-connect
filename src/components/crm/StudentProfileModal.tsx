import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddFamilyMemberModal } from "./AddFamilyMemberModal";
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
  MessageCircle
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Занимается';
      case 'inactive': return 'Неактивный';
      case 'trial': return 'Пробный';
      default: return status;
    }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              {isEditing && editedStudent ? (
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Фамилия"
                    value={editedStudent.lastName}
                    onChange={(e) => setEditedStudent({...editedStudent, lastName: e.target.value})}
                    className="text-lg font-semibold"
                  />
                  <Input
                    placeholder="Имя"
                    value={editedStudent.firstName}
                    onChange={(e) => setEditedStudent({...editedStudent, firstName: e.target.value})}
                    className="text-lg font-semibold"
                  />
                  <Input
                    placeholder="Отчество"
                    value={editedStudent.middleName}
                    onChange={(e) => setEditedStudent({...editedStudent, middleName: e.target.value})}
                    className="text-lg font-semibold"
                  />
                </div>
              ) : (
                <DialogTitle className="text-xl font-semibold">
                  {currentStudent.lastName} {currentStudent.firstName} {currentStudent.middleName}
                </DialogTitle>
              )}
              <p className="text-sm text-muted-foreground">Ученик (ID: {currentStudent.id})</p>
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
                <Button size="sm" variant="outline" onClick={handleEdit}>
                  Редактировать
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Student Avatar and Basic Info */}
        <div className="flex items-center gap-6 mb-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          </div>
          <div className="flex-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Общая информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
                  <span className="text-sm">{currentStudent.age} лет (03.06.2011)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Телефон ученика</span>
                  {isEditing && editedStudent ? (
                    <Input
                      placeholder="+7 (___) ___-__-__"
                      value={editedStudent.phone || ''}
                      onChange={(e) => setEditedStudent({...editedStudent, phone: e.target.value})}
                      className="text-sm w-40"
                    />
                  ) : (
                    <span className="text-sm">{currentStudent.phone || 'Не указан'}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Добавить в группу
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    Заниматься индивидуально
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Parent Contacts Block */}
          <div className="flex-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  Контакты родителей
                  <AddFamilyMemberModal 
                    familyGroupId="550e8400-e29b-41d4-a716-446655440000" 
                    onMemberAdded={() => console.log('Member added')}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Мария Петрова</span>
                      <Badge variant="outline" className="text-xs">Мама</Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => handleMessageParent('Мария Петрова', '+7 (985) 261-50-56')}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Написать
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>📱</span>
                      <span>+7 (985) 261-50-56</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>✉️</span>
                      <span>maria.petrova@email.com</span>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Александр Петров</span>
                      <Badge variant="outline" className="text-xs">Папа</Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => handleMessageParent('Александр Петров', '+7 (903) 444-55-66')}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Написать
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>📱</span>
                      <span>+7 (903) 444-55-66</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info" className="text-xs">Информация</TabsTrigger>
            <TabsTrigger value="lessons" className="text-xs">Занятия</TabsTrigger>
            <TabsTrigger value="tests" className="text-xs">Тесты</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">Платежи</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">История</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Информация по ученику
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Филиал:</span>
                    <span className="text-primary">OKEY ENGLISH Окская</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ответственные:</span>
                    <span className="text-primary">Пышнов Даниил Александрович</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Категория:</span>
                    <span>Школьники</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Тип:</span>
                    <span>Общий</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Дисциплины:</span>
                    <span>Английский (Empower 1)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Дата обращения:</span>
                    <span>30.09.2016</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Рекламный источник:</span>
                    <span>По рекомендации</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Оплаты занятий:</span>
                    <span className="text-primary">125 810,00 руб.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">В черном списке:</span>
                    <span>Нет</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lessons" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Занятия (всего 11)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4 text-sm">
                    <Badge variant="outline">Актуальные (1)</Badge>
                    <Badge variant="secondary" className="text-primary">Закончившие (10)</Badge>
                  </div>
                  
                  {mockLessons.map((lesson) => (
                    <Card key={lesson.id} className="bg-slate-600 text-white">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white">{lesson.groupName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">
                          <div className="font-medium">{lesson.groupName} (OKEY ENGLISH Окская)</div>
                          <div className="text-slate-300">Остаток: {lesson.remaining} а.ч. / {lesson.cost}</div>
                        </div>
                        <div className="text-xs text-slate-300">
                          <div>Занимается с 02.09 по 28.05.26</div>
                          <div>Цена: Prepare_LITE2_80 (12 490,00 за 16 а.ч.)</div>
                          <div>Курс: 156 а.ч. (опл. 160 а.ч.)/125 420,00 руб. (по дог.: 124 900,00 руб.)</div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge className="bg-green-500 text-white text-xs">Оплачено: {lesson.paid} а.ч./13 010,00 руб.</Badge>
                          <Badge variant="destructive" className="text-xs">Осталось оплатить: {lesson.remaining} а.ч./112 410,00 руб.</Badge>
                        </div>
                        <div className="text-xs text-slate-300 mt-2">
                          {lesson.teacher} | {lesson.schedule} | {lesson.period} | Ауд. WASHINGTON
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Тесты
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Дата</th>
                        <th className="text-left p-2">Тип теста</th>
                        <th className="text-left p-2">Дисциплина</th>
                        <th className="text-left p-2">Преп. / Группа</th>
                        <th className="text-left p-2">Категория тестов</th>
                        <th className="text-left p-2">Тест</th>
                        <th className="text-left p-2">Результат теста</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockTests.map((test) => (
                        <tr key={test.id} className="border-b hover:bg-muted/30">
                          <td className="p-2">{test.date}</td>
                          <td className="p-2">{test.type}</td>
                          <td className="p-2">{test.subject}</td>
                          <td className="p-2 text-primary">{test.teacher}</td>
                          <td className="p-2">{test.category}</td>
                          <td className="p-2">{test.test}</td>
                          <td className="p-2">
                            <div>{test.result}</div>
                            <div>Итого: {test.total}</div>
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
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Личный счёт: 125 810,00 - 125 810,00 = 0,00 руб.
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium mb-2">Приход (130 810,00 руб.)</h4>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Расход (125 810,00 руб.)</h4>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Филиал</th>
                        <th className="text-left p-2">Дата добавления</th>
                        <th className="text-left p-2">Сумма</th>
                        <th className="text-left p-2">Комментарий</th>
                        <th className="text-left p-2">Способ оплаты</th>
                        <th className="text-left p-2">Кто добавил</th>
                        <th className="text-left p-2">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockPayments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-muted/30">
                          <td className="p-2 text-primary">OKEY ENGLISH Окская</td>
                          <td className="p-2">{payment.date}</td>
                          <td className="p-2">{payment.amount}</td>
                          <td className="p-2 italic">{payment.description}</td>
                          <td className="p-2">{payment.method}</td>
                          <td className="p-2 text-primary">Пышнов Д. А.</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-green-600 border-green-600">
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
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  История и задачи
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-xs border-b pb-2">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">18.09.2025 19:46</span>
                      <span className="text-primary">Пышнов Даниил Александрович</span>
                    </div>
                    <p className="text-muted-foreground">
                      Удалён платёж от Юрганов Н. А. (Учебные материалы): 
                      Дата: 18.09.2025, Счёт: №1111204367, Способ оплаты: Безналичные, 
                      Сумма: 5 000,00 руб. Оплачен (Дата оплаты: 18.09.2025)
                    </p>
                  </div>
                  
                  <div className="text-xs border-b pb-2">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">18.09.2025 19:46</span>
                      <span className="text-primary">Пышнов Даниил Александрович</span>
                    </div>
                    <p className="text-muted-foreground">
                      Добавлен платёж от Юрганов Н. А. (Учебные материалы): 
                      Дата: 18.09.2025, Счёт: №1111204372, Способ оплаты: Безналичные, 
                      Сумма: 5 000,00 руб. Оплачен (Дата оплаты: 18.09.2025)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};