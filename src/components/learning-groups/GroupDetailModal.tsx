import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LearningGroup } from "@/hooks/useLearningGroups";
import { Calendar, Users, BookOpen, MapPin, Clock, User, Phone, Mail, Video, ExternalLink, Edit, Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AddScheduleModal } from "./AddScheduleModal";
import { AddHomeworkModal } from "./AddHomeworkModal";
import { EditGroupDetailsModal } from "./EditGroupDetailsModal";
import { GroupScheduleCalendar } from "./GroupScheduleCalendar";
import { useToast } from "@/hooks/use-toast";

interface GroupDetailModalProps {
  group: LearningGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GroupDetailModal = ({ group, open, onOpenChange }: GroupDetailModalProps) => {
  const [teacherExpanded, setTeacherExpanded] = useState(true);
  const [statisticsExpanded, setStatisticsExpanded] = useState(true);
  const [parametersExpanded, setParametersExpanded] = useState(true);
  const [userFieldsExpanded, setUserFieldsExpanded] = useState(true);
  const [addScheduleOpen, setAddScheduleOpen] = useState(false);
  const [addHomeworkOpen, setAddHomeworkOpen] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState([
    { day: "Ср/Пт", time: "с 20:00 до 21:00", period: "с 03.09 по 27.02.26", room: "Ауд. London" },
    { day: "Пн/Ср", time: "с 19:00 до 20:00", period: "с 21.07 по 29.08", room: "Ауд. New York" },
    { day: "Пн/Ср", time: "с 19:30 до 20:30", period: "с 07.07 по 16.07", room: "Ауд. New York" },
    { day: "Чт", time: "с 19:30 до 20:30", period: "03.07", room: "Ауд. New York" },
    { day: "Пн/Ср", time: "с 20:00 до 21:00", period: "с 23.06 по 01.07", room: "Ауд. New York" },
    { day: "Пт", time: "с 19:00 до 20:00", period: "20.06", room: "Ауд. New York" }
  ]);
  const [homeworkData, setHomeworkData] = useState([
    { student: "Tchuente Dany", assignment: "10 сентября 2025 г.", showInLK: true, comments: "Audio HW" },
    { student: "Tchuente Dany", assignment: "5 сентября 2025 г.", showInLK: true, comments: "Audio HW" },
    { student: "Tchuente Dany", assignment: "3 сентября 2025 г.", showInLK: true, comments: "Workbook page 16" },
    { student: "Tchuente Dany", assignment: "20 августа 2025 г.", showInLK: true, comments: "Weekend HW" },
    { student: "Tchuente Dany", assignment: "18 августа 2025 г.", showInLK: true, comments: "UNIT 2 – REVISION EXERCISE" }
  ]);
  
  const { toast } = useToast();

  if (!group) return null;

  // Mock data for demonstration - in real app this would come from APIs
  const teacherInfo = {
    name: group.responsible_teacher || "Не назначен",
    photo: "/placeholder.svg",
    phone: "+7 (999) 123-45-67",
    email: "teacher@okey-english.ru"
  };

  const statistics = {
    totalReceived: "74 938,00 руб.",
    balance: "0,00 руб. + 135 а.ч.",
    total: "74 938,00 руб. + 135 а.ч.",
    visits: 44,
    paidVisits: 44,
    skipped: 10,
    paidSkipped: 2,
    unpaidSkipped: 8,
    rateForGroup: "450,00-600,00/а.ч.",
    totalAcademicHours: "102 а.ч.",
    teacherPayment: "45 900,00 руб."
  };

  const handleAddSchedule = (newSchedule: any) => {
    setScheduleData(prev => [...prev, newSchedule]);
    toast({
      title: "Успешно",
      description: "Элемент расписания добавлен"
    });
  };

  const handleDeleteSchedule = (index: number) => {
    setScheduleData(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Успешно", 
      description: "Элемент расписания удален"
    });
  };

  const handleAddHomework = (newHomework: any) => {
    setHomeworkData(prev => [...prev, newHomework]);
    toast({
      title: "Успешно",
      description: "Домашнее задание добавлено"
    });
  };

  const handleDeleteHomework = (index: number) => {
    setHomeworkData(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Успешно",
      description: "Домашнее задание удалено"
    });
  };

  const handleSaveDetails = (details: any) => {
    // Here you would typically make an API call to update the group
    console.log("Saving group details:", details);
    toast({
      title: "Успешно",
      description: "Детали группы обновлены"
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'reserve': 'bg-gray-100 text-gray-800',
      'forming': 'bg-yellow-100 text-yellow-800',
      'active': 'bg-green-100 text-green-800',
      'suspended': 'bg-red-100 text-red-800',
      'finished': 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryText = (category: string) => {
    const categories = {
      'preschool': 'Дошкольники',
      'school': 'Школьники', 
      'adult': 'Взрослые',
      'all': 'Все'
    };
    return categories[category as keyof typeof categories] || category;
  };

  const getGroupTypeText = (type: string) => {
    return type === 'mini' ? 'Мини-группа' : 'Группа';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-0">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{group.name}</div>
                  <div className="text-lg opacity-90">Группа</div>
                </div>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-sm", getStatusColor(group.status))}>
                  {group.status === 'active' ? 'в работе' : group.status}
                </Badge>
                <Button size="sm" className="bg-teal-500 hover:bg-teal-600">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ссылка на запись в группу
                </Button>
                <Button size="sm" variant="outline" className="text-blue-600 border-white/20">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="schedule" className="h-full">
            <div className="border-b px-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="schedule">Расписание</TabsTrigger>
                <TabsTrigger value="homework">Домашние задания / планы занятий</TabsTrigger>
                <TabsTrigger value="details">Детали группы</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="schedule" className="space-y-6 mt-0">
                <GroupScheduleCalendar groupId={group.id} />
              </TabsContent>

              <TabsContent value="homework" className="space-y-6 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-blue-600">Домашние задания / планы занятий</h3>
                  <div className="flex gap-2">
                    <span className="text-sm text-gray-600">полностью</span>
                    <Button 
                      size="sm" 
                      className="bg-blue-500 hover:bg-blue-600"
                      onClick={() => setAddHomeworkOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ученики (всего 2, договоров 0)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-4">
                      <div className="p-4">
                        <div className="text-sm font-medium text-gray-600 mb-2">Актуальные (2)</div>
                        <div className="space-y-3">
                          {homeworkData.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-6">
                                <div className="text-blue-600 font-medium min-w-[200px]">{item.student}</div>
                                <div className="text-gray-700 min-w-[150px]">{item.assignment}</div>
                                <div className="text-center min-w-[100px]">
                                  {item.showInLK && <span className="text-green-600">✓</span>}
                                </div>
                                <div className="text-blue-600">{item.comments}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" className="text-yellow-600">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600"
                                  onClick={() => handleDeleteHomework(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-6 mt-0">
                <div className="grid grid-cols-3 gap-6">
                  {/* Teachers Section */}
                  <Card>
                    <CardHeader 
                      className="cursor-pointer" 
                      onClick={() => setTeacherExpanded(!teacherExpanded)}
                    >
                      <CardTitle className="flex items-center justify-between text-lg">
                        Преподаватели
                        {teacherExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CardTitle>
                    </CardHeader>
                    {teacherExpanded && (
                      <CardContent className="space-y-4">
                        <div className="flex flex-col items-center text-center">
                          <Avatar className="h-24 w-24 mb-3">
                            <AvatarImage src={teacherInfo.photo} alt={teacherInfo.name} />
                            <AvatarFallback className="text-lg">
                              {teacherInfo.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="font-medium text-blue-600">{teacherInfo.name}</h3>
                          <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            {teacherInfo.phone}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            {teacherInfo.email}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Statistics Section */}
                  <Card>
                    <CardHeader 
                      className="cursor-pointer" 
                      onClick={() => setStatisticsExpanded(!statisticsExpanded)}
                    >
                      <CardTitle className="flex items-center justify-between text-lg">
                        Статистика
                        {statisticsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CardTitle>
                    </CardHeader>
                    {statisticsExpanded && (
                      <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Получено от плательщиков:</span>
                            <span className="font-medium">{statistics.totalReceived}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Осталось:</span>
                            <span className="font-medium">{statistics.balance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Итого:</span>
                            <span className="font-medium">{statistics.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>На 21.09.2025</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span>Посещений:</span>
                            <span className="font-medium">{statistics.visits}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>- оплачиваемых:</span>
                            <span className="font-medium">{statistics.paidVisits}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Пропусков:</span>
                            <span className="font-medium">{statistics.skipped}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>- оплачиваемых:</span>
                            <span className="font-medium">{statistics.paidSkipped}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>- неоплачиваемых:</span>
                            <span className="font-medium">{statistics.unpaidSkipped}</span>
                          </div>
                          <div className="text-blue-600 font-medium">{teacherInfo.name}</div>
                          <div className="flex justify-between">
                            <span>Ставка по данной группе:</span>
                            <span className="font-medium">{statistics.rateForGroup}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Академ. часов всего:</span>
                            <span className="font-medium">{statistics.totalAcademicHours}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Оплата преподавателя за всё время занятий:</span>
                            <span className="font-medium">{statistics.teacherPayment}</span>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Parameters Section */}
                  <Card>
                    <CardHeader 
                      className="cursor-pointer" 
                      onClick={() => setParametersExpanded(!parametersExpanded)}
                    >
                      <CardTitle className="flex items-center justify-between text-lg">
                        Параметры
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="p-0 h-auto"
                            onClick={() => setEditDetailsOpen(true)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {parametersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    {parametersExpanded && (
                      <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Филиал:</span>
                            <span className="font-medium">{group.branch}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ответственный:</span>
                            <span className="font-medium">{group.responsible_teacher}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Дисциплина:</span>
                            <span className="font-medium">{group.subject}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Категория:</span>
                            <span className="font-medium">{getCategoryText(group.category)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Уровень:</span>
                            <span className="font-medium">{group.level}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Тип:</span>
                            <span className="font-medium">{getGroupTypeText(group.group_type)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Учебник:</span>
                            <span className="font-medium">{group.level}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Способ оплаты:</span>
                            <span className="font-medium">По занятиям</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Категория продукта:</span>
                            <span className="font-medium">* Менеджер</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Средний возраст:</span>
                            <span className="font-medium">27,5</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Вместимость:</span>
                            <span className="font-medium">{group.capacity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Численность:</span>
                            <span className="font-medium">{group.current_students}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Резервов:</span>
                            <span className="font-medium">0</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Договоров:</span>
                            <span className="font-medium text-blue-600">0</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Оплативших:</span>
                            <span className="font-medium">{group.current_students}</span>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>

                {/* User Fields Section */}
                <Card>
                  <CardHeader 
                    className="cursor-pointer" 
                    onClick={() => setUserFieldsExpanded(!userFieldsExpanded)}
                  >
                    <CardTitle className="flex items-center justify-between text-lg">
                      Пользовательские поля
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="p-0 h-auto"
                          onClick={() => setEditDetailsOpen(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {userFieldsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {userFieldsExpanded && (
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">ZOOM:</span>
                        </div>
                        <a 
                          href={group.zoom_link || "#"} 
                          className="text-blue-600 hover:underline text-sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {group.zoom_link || "okeyclass.ktalk.ru/tklogp..."}
                        </a>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        {/* Modals */}
        <AddScheduleModal 
          open={addScheduleOpen}
          onOpenChange={setAddScheduleOpen}
          onAddSchedule={handleAddSchedule}
        />
        
        <AddHomeworkModal 
          open={addHomeworkOpen}
          onOpenChange={setAddHomeworkOpen}
          onAddHomework={handleAddHomework}
        />
        
        <EditGroupDetailsModal 
          open={editDetailsOpen}
          onOpenChange={setEditDetailsOpen}
          group={group}
          onSaveDetails={handleSaveDetails}
        />
      </DialogContent>
    </Dialog>
  );
};