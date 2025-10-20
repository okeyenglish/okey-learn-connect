import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LearningGroup } from "@/hooks/useLearningGroups";
import { Calendar, Users, BookOpen, MapPin, Clock, User, Phone, Mail, Video, ExternalLink, Edit, Plus, ChevronDown, ChevronUp, Trash2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AddScheduleModal } from "./AddScheduleModal";
import { AddHomeworkModal } from "./AddHomeworkModal";
import { EditGroupDetailsModal } from "./EditGroupDetailsModal";
import { GroupScheduleCalendar } from "./GroupScheduleCalendar";
import { StudentPaymentInfo } from "./StudentPaymentInfo";
import { GroupHistoryTab } from "./GroupHistoryTab";
import { useToast } from "@/hooks/use-toast";
import { useGroupStudents } from "@/hooks/useGroupStudents";
import { useAvailableStudents } from "@/hooks/useAvailableStudents";
import { useStudents } from "@/hooks/useStudents";
import { useStudentGroupPaymentStats } from "@/hooks/useStudentGroupPaymentStats";
import { useGroupStatistics } from "@/hooks/useGroupStatistics";
import { useQueryClient } from "@tanstack/react-query";

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
  const [studentsExpanded, setStudentsExpanded] = useState(true);
  const [addScheduleOpen, setAddScheduleOpen] = useState(false);
  const [addHomeworkOpen, setAddHomeworkOpen] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Получаем студентов группы
  const { 
    groupStudents, 
    loading: studentsLoading,
    addStudentToGroup,
    removeStudentFromGroup 
  } = useGroupStudents(group?.id || '');

  // Получаем доступных студентов для добавления
  const { 
    availableStudents,
    loading: availableStudentsLoading 
  } = useAvailableStudents(group?.id);

  // Получаем статистику группы
  const { statistics: groupStats, loading: statsLoading } = useGroupStatistics(group?.id);
  
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
  
  const handleAddStudentToGroup = async (studentId: string) => {
    try {
      const success = await addStudentToGroup(studentId);
      if (success) {
        toast({
          title: "Успешно",
          description: "Студент добавлен в группу"
        });
        setShowAddStudentModal(false);
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить студента в группу",
        variant: "destructive"
      });
    }
  };

  const handleRemoveStudentFromGroup = async (studentId: string) => {
    try {
      // Find the group_students record to get its ID
      const groupStudentRecord = groupStudents.find(gs => gs.student_id === studentId);
      
      if (!groupStudentRecord) {
        toast({
          title: "Ошибка",
          description: "Студент не найден в группе",
          variant: "destructive"
        });
        return;
      }

      const success = await removeStudentFromGroup(groupStudentRecord.id, studentId);
      if (success) {
        toast({
          title: "Успешно",
          description: "Студент удален из группы"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить студента из группы",
        variant: "destructive"
      });
    }
  };

  if (!group) return null;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const teacherInfo = {
    name: group.responsible_teacher || "Не назначен",
    photo: "/placeholder.svg",
    phone: "+7 (999) 123-45-67",
    email: "teacher@okey-english.ru"
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

  const handleSaveDetails = async (details: any) => {
    // Here you would typically make an API call to update the group
    console.log("Saving group details:", details);
    
    // Force re-fetch of the current group data
    if (group?.id) {
      await queryClient.invalidateQueries({ queryKey: ['learning-groups'] });
      await queryClient.invalidateQueries({ queryKey: ['learning_group'] });
      await queryClient.refetchQueries({ queryKey: ['learning-groups'] });
    }
    
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

  const getStatusText = (status: string) => {
    const statuses = {
      'reserve': 'Резерв',
      'forming': 'Формируется',
      'active': 'В работе',
      'suspended': 'Приостановлена',
      'finished': 'Завершена'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] max-w-full overflow-hidden p-0 bg-background flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex-shrink-0">
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
                <Button size="sm" variant="outline" className="text-blue-600 border-white/20" onClick={() => setEditDetailsOpen(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="students" className="flex-1 overflow-hidden flex flex-col">
            <div className="border-b px-6 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="students">Студенты и расписание</TabsTrigger>
                <TabsTrigger value="homework">Домашние задания / планы занятий</TabsTrigger>
                <TabsTrigger value="details">Детали группы</TabsTrigger>
                <TabsTrigger value="history">История изменений</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="students" className="space-y-6 mt-0">
                {/* Расписание */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 mb-4">Расписание группы</h3>
                  <GroupScheduleCalendar groupId={group.id} />
                </div>
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
                        {statsLoading ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                            <p className="text-sm text-muted-foreground mt-2">Загрузка статистики...</p>
                          </div>
                        ) : groupStats ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Получено от плательщиков:</span>
                              <span className="font-medium">{formatMoney(groupStats.totalReceived)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Проведено занятий:</span>
                              <span className="font-medium">{groupStats.visits}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Оплаченных посещений:</span>
                              <span className="font-medium">{groupStats.paidVisits}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Пропущено занятий:</span>
                              <span className="font-medium">{groupStats.skipped}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Ак. часов за группу:</span>
                              <span className="font-medium">{groupStats.totalAcademicHours}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Баланс:</span>
                              <span className="font-medium">{formatMoney(groupStats.balance)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Оплата преподавателя:</span>
                              <span className="font-medium">{formatMoney(groupStats.teacherPayment)}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Нет данных</p>
                        )}
                      </CardContent>
                    )}
                  </Card>

                  {/* Parameters Section */}
                  <Card className="col-span-1">
                    <CardHeader 
                      className="cursor-pointer" 
                      onClick={() => setParametersExpanded(!parametersExpanded)}
                    >
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center justify-between w-full text-lg">
                          Параметры группы
                          {parametersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    {parametersExpanded && (
                      <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Название:</span>
                            <span className="font-medium">{group.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Статус:</span>
                            <span className="font-medium">{getStatusText(group.status || 'active')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Филиал:</span>
                            <span className="font-medium">{group.branch}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Преподаватель:</span>
                            <span className="font-medium">{group.responsible_teacher || 'Не назначен'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Дисциплина:</span>
                            <span className="font-medium">{group.subject}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Категория:</span>
                            <span className="font-medium">{group.category ? getCategoryText(group.category) : 'Не указана'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Уровень:</span>
                            <span className="font-medium">{group.level}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Тип группы:</span>
                            <span className="font-medium">{getGroupTypeText(group.group_type)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Вместимость:</span>
                            <span className="font-medium">{group.capacity || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Численность:</span>
                            <span className="font-medium">{group.current_students || 0}</span>
                          </div>
                          {group.course_name && (
                            <div className="flex justify-between">
                              <span>Курс/Программа:</span>
                              <span className="font-medium">{group.course_name}</span>
                            </div>
                          )}
                          {(group.total_lessons !== undefined && group.total_lessons !== null) && (
                            <div className="flex justify-between">
                              <span>Всего занятий:</span>
                              <span className="font-medium">{group.total_lessons}</span>
                            </div>
                          )}
                          {group.course_start_date && (
                            <div className="flex justify-between">
                              <span>Дата старта курса:</span>
                              <span className="font-medium">{format(new Date(group.course_start_date), 'dd.MM.yyyy', { locale: ru })}</span>
                            </div>
                          )}
                          {group.zoom_link && (
                            <div className="flex justify-between items-center">
                              <span>ZOOM ссылка:</span>
                              <a 
                                href={group.zoom_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Открыть <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Численность:</span>
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

              <TabsContent value="history" className="mt-0">
                <GroupHistoryTab groupId={group.id} />
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
