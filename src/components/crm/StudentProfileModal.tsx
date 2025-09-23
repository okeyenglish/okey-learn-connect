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
  Edit2,
  Phone,
  Plus,
  FileCheck
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
    console.log(`Opening chat with ${parentName} (${parentPhone})`);
  };

  const loadFamilyData = () => {
    // Mock function for family data loading
  };

  // Mock data
  const mockFamilyMembers = [
    {
      id: '1',
      name: 'Мария Петрова',
      relationship: 'mother' as const,
      phone: '+7 (985) 261-50-56',
      phoneNumbers: [
        { id: '1', number: '+7 (985) 261-50-56', type: 'mobile' as const, isPrimary: true }
      ]
    },
    {
      id: '2',
      name: 'Александр Петров',
      relationship: 'father' as const,
      phone: '+7 (903) 141-32-11',
      phoneNumbers: [
        { id: '2', number: '+7 (903) 141-32-11', type: 'mobile' as const, isPrimary: true }
      ]
    }
  ];

  const mockLessons = [
    {
      id: '1',
      groupName: 'Школьники 5 - Empower 1',
      subject: 'Английский',
      level: 'Empower 1',
      teacher: 'Kaba Edward',
      startDate: '01.09.2018',
      endDate: '31.05.2019',
      status: 'active',
      price: '8 400,00 руб/мес'
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded flex items-center justify-center border border-slate-200">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                {isEditing && editedStudent ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Фамилия"
                      value={editedStudent.lastName}
                      onChange={(e) => setEditedStudent({...editedStudent, lastName: e.target.value})}
                      className="text-sm font-semibold h-7 w-24"
                    />
                    <Input
                      placeholder="Имя"
                      value={editedStudent.firstName}
                      onChange={(e) => setEditedStudent({...editedStudent, firstName: e.target.value})}
                      className="text-sm font-semibold h-7 w-20"
                    />
                    <Input
                      placeholder="Отчество"
                      value={editedStudent.middleName}
                      onChange={(e) => setEditedStudent({...editedStudent, middleName: e.target.value})}
                      className="text-sm font-semibold h-7 w-24"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-foreground">
                      {currentStudent.lastName} {currentStudent.firstName} {currentStudent.middleName}
                    </h2>
                    <p className="text-xs text-muted-foreground">Ученик (ID: {currentStudent.id.slice(-8)})</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={getStatusColor(currentStudent.status)} 
                className={`text-xs ${getStatusBadgeClass(currentStudent.status)}`}
              >
                {getStatusLabel(currentStudent.status)}
              </Badge>
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 px-2">
                    Отмена
                  </Button>
                  <Button size="sm" onClick={handleSave} className="h-7 px-2">
                    Сохранить
                  </Button>
                </>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleEdit}
                  className="h-7 w-7 p-0"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Optimized Grid Layout */}
        <div className="p-4 h-[calc(90vh-80px)] overflow-y-auto">
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Quick Info Sidebar */}
            <div className="col-span-3 space-y-3">
              {/* Basic Info */}
              <Card className="p-3">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Основная информация
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Возраст:</span>
                    <span className="font-medium">{currentStudent.age} лет</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Дата рожд:</span>
                    <span>03.06.2011</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Телефон:</span>
                    <span>{currentStudent.phone || 'Не указан'}</span>
                  </div>
                </div>
                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="outline" className="text-xs flex-1 h-7">
                    <Users className="w-3 h-3 mr-1" />
                    В группу
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs flex-1 h-7">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Индивидуально
                  </Button>
                </div>
              </Card>

              {/* Parents */}
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Родители
                  </h3>
                  <AddFamilyMemberModal familyGroupId={currentStudent.id} onMemberAdded={loadFamilyData}>
                    <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </AddFamilyMemberModal>
                </div>
                <div className="space-y-2">
                  {mockFamilyMembers.map((member) => (
                    <div key={member.id} className="text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-4 h-4 rounded bg-pink-100 flex items-center justify-center">
                          <span className="text-pink-600 text-[10px] font-bold">
                            {member.relationship === 'mother' ? 'М' : 'П'}
                          </span>
                        </div>
                        <span className="font-medium text-slate-900">{member.name}</span>
                      </div>
                      <div className="ml-5 text-muted-foreground">
                        {member.phone}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="col-span-9">
              <Tabs defaultValue="info" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-5 h-8">
                  <TabsTrigger value="info" className="text-xs">Информация</TabsTrigger>
                  <TabsTrigger value="lessons" className="text-xs">Занятия</TabsTrigger>
                  <TabsTrigger value="tests" className="text-xs">Тесты</TabsTrigger>
                  <TabsTrigger value="payments" className="text-xs">Платежи</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">История</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="flex-1 mt-2 overflow-y-auto">
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3">Детальная информация</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Филиал:</span>
                        <span className="font-medium">OKEY ENGLISH Окская</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ответственные:</span>
                        <span className="font-medium">Пышнов Даниил Александрович</span>
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
                        <span className="font-medium">125 810,00 руб.</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">В черном списке:</span>
                        <span>Нет</span>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="lessons" className="flex-1 mt-2 overflow-y-auto">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-1">
                        <GraduationCap className="w-4 h-4" />
                        Занятия
                      </h3>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">Актуальные (1)</Badge>
                        <Badge variant="secondary" className="text-xs">Закончившие (10)</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {mockLessons.map((lesson) => (
                        <div key={lesson.id} className="border rounded p-3 bg-slate-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-sm">{lesson.groupName}</h4>
                              <p className="text-xs text-muted-foreground">{lesson.subject} • {lesson.level}</p>
                            </div>
                            <Badge variant={lesson.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {lesson.status === 'active' ? 'Активное' : 'Завершено'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Преподаватель:</span>
                              <div className="font-medium">{lesson.teacher}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Период:</span>
                              <div>{lesson.startDate} - {lesson.endDate}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Цена:</span>
                              <div className="font-medium">{lesson.price}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="tests" className="flex-1 mt-2 overflow-y-auto">
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
                      <FileCheck className="w-4 h-4" />
                      Результаты тестов
                    </h3>
                    <div className="space-y-2">
                      {mockTests.map((test) => (
                        <div key={test.id} className="border rounded p-3">
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground text-xs">Дата:</span>
                              <div className="font-medium">{test.date}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Тест:</span>
                              <div>{test.test}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Преподаватель:</span>
                              <div>{test.teacher}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Результат:</span>
                              <div className="font-medium text-green-600">{test.total}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="payments" className="flex-1 mt-2 overflow-y-auto">
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      История платежей
                    </h3>
                    <p className="text-sm text-muted-foreground">Данные о платежах загружаются...</p>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="flex-1 mt-2 overflow-y-auto">
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
                      <History className="w-4 h-4" />
                      История изменений
                    </h3>
                    <p className="text-sm text-muted-foreground">История изменений загружается...</p>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};