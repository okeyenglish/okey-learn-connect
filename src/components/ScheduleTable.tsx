import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Users, MapPin, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScheduleItem {
  id: string;
  name: string;
  officeName: string;
  level: string;
  compactDays: string;
  compactTime: string;
  compactClassroom: string;
  compactTeacher: string;
  vacancies: number;
  groupLink?: string;
}

interface ScheduleTableProps {
  branchName: string;
}

export default function ScheduleTable({ branchName }: ScheduleTableProps) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [filteredSchedule, setFilteredSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLevel, setSearchLevel] = useState<string>("all");
  const [searchDays, setSearchDays] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<ScheduleItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: ""
  });
  const { toast } = useToast();

  // Fetch schedule data
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        
        // First try to fetch from Supabase database
        const { data: scheduleData, error } = await supabase
          .from('schedule')
          .select('*')
          .eq('office_name', branchName)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }

        if (scheduleData && scheduleData.length > 0) {
          // Convert database format to component format
          const convertedData: ScheduleItem[] = scheduleData.map(item => ({
            id: item.id,
            name: item.name,
            officeName: item.office_name,
            level: item.level,
            compactDays: item.compact_days,
            compactTime: item.compact_time,
            compactClassroom: item.compact_classroom,
            compactTeacher: item.compact_teacher,
            vacancies: item.vacancies,
            groupLink: item.group_link
          }));
          
          setSchedule(convertedData);
          setFilteredSchedule(convertedData);
        } else {
          // Fallback: Try n8n webhook if no data in Supabase
          try {
            const webhookUrl = "https://n8n.okey-english.ru/webhook/public/schedule";
            const response = await fetch(webhookUrl);
            if (response.ok) {
              const data = await response.json();
              const branchSchedule = data.filter((item: ScheduleItem) => 
                item.officeName === branchName
              );
              setSchedule(branchSchedule);
              setFilteredSchedule(branchSchedule);
            } else {
              throw new Error("No schedule data available");
            }
          } catch (webhookError) {
            console.warn("No schedule data found:", webhookError);
            setSchedule([]);
            setFilteredSchedule([]);
          }
        }
      } catch (error) {
        console.error("Error fetching schedule:", error);
        setSchedule([]);
        setFilteredSchedule([]);
        toast({
          title: "Информация",
          description: "Расписание обновляется. Попробуйте позже.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [branchName, toast]);

  // Filter schedule
  useEffect(() => {
    let filtered = schedule;

    if (searchLevel && searchLevel !== "all") {
      filtered = filtered.filter(item => 
        item.level.toLowerCase().includes(searchLevel.toLowerCase())
      );
    }

    if (searchDays && searchDays !== "all") {
      filtered = filtered.filter(item =>
        item.compactDays.toLowerCase().includes(searchDays.toLowerCase())
      );
    }

    setFilteredSchedule(filtered);
  }, [schedule, searchLevel, searchDays]);

  const getVacancyBadge = (vacancies: number) => {
    if (vacancies === 0) {
      return <Badge variant="destructive">Группа набрана</Badge>;
    } else if (vacancies <= 2) {
      return <Badge variant="secondary">Осталось {vacancies} места</Badge>;
    } else {
      return <Badge variant="default">Есть места ({vacancies})</Badge>;
    }
  };

  const handleEnrollClick = (course: ScheduleItem) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCourse || !formData.name || !formData.phone) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    try {
      const enrollmentData = {
        source: "website",
        page: `/branches/${branchName.toLowerCase()}`,
        type: "course_enrollment",
        course_info: {
          course_name: selectedCourse.name,
          level: selectedCourse.level,
          schedule: `${selectedCourse.compactDays} ${selectedCourse.compactTime}`,
          teacher: selectedCourse.compactTeacher,
          classroom: selectedCourse.compactClassroom,
          branch: branchName
        },
        contact_info: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email
        },
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase.functions.invoke('webhook-proxy', {
        body: enrollmentData
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Заявка отправлена!",
        description: "Мы свяжемся с вами в ближайшее время для уточнения деталей"
      });

      setIsModalOpen(false);
      setFormData({ name: "", phone: "", email: "" });
      setSelectedCourse(null);

    } catch (error) {
      console.error("Error submitting enrollment:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Попробуйте еще раз.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Расписание занятий</CardTitle>
          <CardDescription>Загрузка...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Расписание занятий
        </CardTitle>
        <CardDescription>
          Выберите удобную группу и запишитесь на пробный урок
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select value={searchLevel} onValueChange={setSearchLevel}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Фильтр по уровню" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все уровни</SelectItem>
              <SelectItem value="A1">A1 (Начальный)</SelectItem>
              <SelectItem value="A2">A2 (Элементарный)</SelectItem>
              <SelectItem value="B1">B1 (Средний)</SelectItem>
              <SelectItem value="B2">B2 (Выше среднего)</SelectItem>
              <SelectItem value="C1">C1 (Продвинутый)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={searchDays} onValueChange={setSearchDays}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Фильтр по дням" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все дни</SelectItem>
              <SelectItem value="пн">Понедельник</SelectItem>
              <SelectItem value="вт">Вторник</SelectItem>
              <SelectItem value="ср">Среда</SelectItem>
              <SelectItem value="чт">Четверг</SelectItem>
              <SelectItem value="пт">Пятница</SelectItem>
              <SelectItem value="сб">Суббота</SelectItem>
              <SelectItem value="вс">Воскресенье</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Schedule Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Курс</TableHead>
                <TableHead>Уровень</TableHead>
                <TableHead className="hidden sm:table-cell">Дни</TableHead>
                <TableHead className="hidden md:table-cell">Время</TableHead>
                <TableHead className="hidden lg:table-cell">Преподаватель</TableHead>
                <TableHead>Места</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedule.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Нет доступных групп по выбранным фильтрам
                  </TableCell>
                </TableRow>
              ) : (
                filteredSchedule.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.level}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{item.compactDays}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {item.compactTime}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{item.compactTeacher}</TableCell>
                    <TableCell>{getVacancyBadge(item.vacancies)}</TableCell>
                    <TableCell>
                      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            disabled={item.vacancies === 0}
                            onClick={() => handleEnrollClick(item)}
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Записаться
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Запись на пробный урок</DialogTitle>
                            <DialogDescription>
                              Заполните форму и мы свяжемся с вами для уточнения деталей
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedCourse && (
                            <div className="bg-muted/50 rounded-lg p-4 mb-4">
                              <h4 className="font-semibold mb-2">Выбранная группа:</h4>
                              <div className="text-sm space-y-1">
                                <p><strong>Курс:</strong> {selectedCourse.name}</p>
                                <p><strong>Уровень:</strong> {selectedCourse.level}</p>
                                <p><strong>Расписание:</strong> {selectedCourse.compactDays} {selectedCourse.compactTime}</p>
                                <p><strong>Преподаватель:</strong> {selectedCourse.compactTeacher}</p>
                                <p><strong>Кабинет:</strong> {selectedCourse.compactClassroom}</p>
                              </div>
                            </div>
                          )}

                          <form onSubmit={handleSubmitEnrollment} className="space-y-4">
                            <div>
                              <Input
                                placeholder="Ваше имя *"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                              />
                            </div>
                            <div>
                              <Input
                                placeholder="Телефон *"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                required
                              />
                            </div>
                            <div>
                              <Input
                                placeholder="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                              />
                            </div>
                            <div className="flex gap-3">
                              <Button type="submit" className="flex-1">
                                Отправить заявку
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsModalOpen(false)}
                              >
                                Отмена
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}