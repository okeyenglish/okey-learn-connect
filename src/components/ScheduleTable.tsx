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

// Функция для определения программы из названия курса
const getProgramName = (courseName: string): string => {
  const lowerName = courseName.toLowerCase();
  if (lowerName.includes('safari') || lowerName.includes('ss')) return 'Super Safari';
  if (lowerName.includes("kid's box") || lowerName.includes('kb')) return "Kid's Box";
  if (lowerName.includes('prepare') || lowerName.includes('pr')) return 'Prepare';
  if (lowerName.includes('empower') || lowerName.includes('em')) return 'Empower';
  return courseName;
};

// Функция для сопоставления уровней
const mapToEuropeanLevel = (courseName: string, originalLevel: string): string => {
  const lowerName = courseName.toLowerCase();
  const lowerLevel = originalLevel.toLowerCase();
  
  // Super Safari (1–3) - все уровни pre-A1
  if (lowerName.includes('safari') || lowerName.includes('ss')) {
    return 'pre-A1';
  }
  
  // Kid's Box (1–6)
  if (lowerName.includes("kid's box") || lowerName.includes('kb')) {
    if (lowerLevel.includes('1') || lowerLevel.includes('2')) return 'pre-A1';
    if (lowerLevel.includes('3') || lowerLevel.includes('4')) return 'A1';
    if (lowerLevel.includes('5') || lowerLevel.includes('6')) return 'A2';
  }
  
  // Prepare (1–7)
  if (lowerName.includes('prepare') || lowerName.includes('pr')) {
    if (lowerLevel.includes('1')) return 'A1';
    if (lowerLevel.includes('2') || lowerLevel.includes('3')) return 'A2';
    if (lowerLevel.includes('4') || lowerLevel.includes('5')) return 'B1';
    if (lowerLevel.includes('6') || lowerLevel.includes('7')) return 'B2';
  }
  
  // Empower (1–6)
  if (lowerName.includes('empower') || lowerName.includes('em')) {
    if (lowerLevel.includes('1')) return 'A1';
    if (lowerLevel.includes('2')) return 'A2';
    if (lowerLevel.includes('3')) return 'B1';
    if (lowerLevel.includes('4')) return 'B1+';
    if (lowerLevel.includes('5')) return 'B2';
    if (lowerLevel.includes('6')) return 'C1';
  }
  
  return originalLevel;
};

// Функция для определения возраста по программе
const getAgeRange = (courseName: string): string => {
  const lowerName = courseName.toLowerCase();
  if (lowerName.includes('safari') || lowerName.includes('ss')) return '3-6 лет';
  if (lowerName.includes("kid's box") || lowerName.includes('kb')) return '5-9 лет';
  if (lowerName.includes('prepare') || lowerName.includes('pr')) return '10-17 лет';
  if (lowerName.includes('empower') || lowerName.includes('em')) return '18+ лет';
  return 'Уточняйте';
};

// Функция для сортировки курсов
const sortCoursesByProgram = (courses: ScheduleItem[]): ScheduleItem[] => {
  return courses.sort((a, b) => {
    const programA = getProgramName(a.name);
    const programB = getProgramName(b.name);
    
    const programOrder = ['Super Safari', "Kid's Box", 'Prepare', 'Empower'];
    const indexA = programOrder.indexOf(programA);
    const indexB = programOrder.indexOf(programB);
    
    // Если обе программы в списке - сортируем по порядку
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // Если только одна в списке - она идет первой
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // Если обе не в списке - сортируем по алфавиту
    return programA.localeCompare(programB);
  });
};

interface ScheduleTableProps {
  branchName: string;
}

export default function ScheduleTable({ branchName }: ScheduleTableProps) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [filteredSchedule, setFilteredSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLevel, setSearchLevel] = useState<string>("all");
  const [searchDays, setSearchDays] = useState<string>("all");
  const [searchAge, setSearchAge] = useState<string>("all");
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
        
        // First try to fetch from secure Supabase view
        const { data: scheduleData, error } = await supabase
          .from('schedule_public')
          .select('*')
          .eq('office_name', branchName)
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
            groupLink: item.group_URL
          }));
          
          // Сортируем курсы по программам
          const sortedData = sortCoursesByProgram(convertedData);
          
          setSchedule(sortedData);
          setFilteredSchedule(sortedData);
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
              
              // Сортируем курсы по программам
              const sortedSchedule = sortCoursesByProgram(branchSchedule);
              
              setSchedule(sortedSchedule);
              setFilteredSchedule(sortedSchedule);
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
      filtered = filtered.filter(item => {
        const mappedLevel = mapToEuropeanLevel(item.name, item.level);
        return mappedLevel.toLowerCase().includes(searchLevel.toLowerCase());
      });
    }

    if (searchDays && searchDays !== "all") {
      filtered = filtered.filter(item =>
        item.compactDays.toLowerCase().includes(searchDays.toLowerCase())
      );
    }

    if (searchAge && searchAge !== "all") {
      filtered = filtered.filter(item => {
        const ageRange = getAgeRange(item.name);
        return ageRange === searchAge;
      });
    }

    setFilteredSchedule(filtered);
  }, [schedule, searchLevel, searchDays, searchAge]);

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
              <SelectItem value="pre-A1">pre-A1 (Дошкольный)</SelectItem>
              <SelectItem value="A1">A1 (Начальный)</SelectItem>
              <SelectItem value="A2">A2 (Элементарный)</SelectItem>
              <SelectItem value="B1">B1 (Средний)</SelectItem>
              <SelectItem value="B1+">B1+ (Средний+)</SelectItem>
              <SelectItem value="B2">B2 (Выше среднего)</SelectItem>
              <SelectItem value="C1">C1 (Продвинутый)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={searchAge} onValueChange={setSearchAge}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Фильтр по возрасту" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все возрасты</SelectItem>
              <SelectItem value="3-6 лет">3-6 лет</SelectItem>
              <SelectItem value="5-9 лет">5-9 лет</SelectItem>
              <SelectItem value="10-17 лет">10-17 лет</SelectItem>
              <SelectItem value="18+ лет">18+ лет</SelectItem>
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
                <TableHead>Программа</TableHead>
                <TableHead>Уровень</TableHead>
                <TableHead>Возраст</TableHead>
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Нет доступных групп по выбранным фильтрам
                  </TableCell>
                </TableRow>
              ) : (
                filteredSchedule.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{getProgramName(item.name)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{mapToEuropeanLevel(item.name, item.level)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getAgeRange(item.name)}</Badge>
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
                                <p><strong>Программа:</strong> {getProgramName(selectedCourse.name)}</p>
                                <p><strong>Уровень:</strong> {mapToEuropeanLevel(selectedCourse.name, selectedCourse.level)}</p>
                                <p><strong>Возраст:</strong> {getAgeRange(selectedCourse.name)}</p>
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