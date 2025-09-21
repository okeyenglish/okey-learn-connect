import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Users, BookOpen, MapPin, Calendar, Clock, User } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCreateLearningGroup, LearningGroup, useLearningGroups } from "@/hooks/useLearningGroups";
import { useTeachers, getTeacherFullName } from "@/hooks/useTeachers";
import { getBranchesForSelect, getClassroomsForBranch } from "@/lib/branches";

interface AddGroupModalProps {
  onGroupAdded?: () => void;
}

export const AddGroupModal = ({ onGroupAdded }: AddGroupModalProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    branch: "",
    subject: "Английский",
    level: "",
    category: "all" as "preschool" | "school" | "adult" | "all",
    group_type: "general" as "general" | "mini",
    status: "forming" as "reserve" | "forming" | "active" | "suspended" | "finished",
    capacity: "10",
    academic_hours: "",
    lesson_duration: "",
    responsible_teacher: "",
    period_start: null as Date | null,
    period_end: null as Date | null,
    schedule_days: [] as string[],
    schedule_room: "",
    lesson_start_hour: "",
    lesson_start_minute: "",
    lesson_end_hour: "",
    lesson_end_minute: ""
  });
  
  const { toast } = useToast();
  const createGroup = useCreateLearningGroup();
  
  // Get all groups for auto-naming
  const { groups: allGroups } = useLearningGroups();
  
  // Get filtered teachers for the current branch/subject/category
  const { teachers } = useTeachers({
    branch: formData.branch || undefined,
    subject: formData.subject,
    category: formData.category
  });

  // Function to automatically set category based on level
  const getCategoryFromLevel = (level: string): "preschool" | "school" | "adult" | "all" => {
    if (level.startsWith("Super Safari")) return "preschool";
    if (level.startsWith("Kids Box")) return "school";
    if (level.startsWith("Prepare")) return "school";
    if (level.startsWith("Empower")) return "adult";
    return "all";
  };

  // Function to generate branch abbreviation
  const getBranchAbbreviation = (branch: string): string => {
    const abbreviations: Record<string, string> = {
      "Окская": "ОК",
      "Котельники": "КТ",
      "Люберцы-1": "Л1",
      "Люберцы-2": "Л2", 
      "Мытищи": "МТ",
      "Новокосино": "НК",
      "Солнцево": "СЛ",
      "Стахановская": "СТ",
      "Онлайн": "ОН"
    };
    return abbreviations[branch] || "ОК";
  };

  // Function to generate group name automatically
  const generateGroupName = (branch: string) => {
    if (!branch || !allGroups) return "";
    
    const branchAbbr = getBranchAbbreviation(branch);
    const existingGroups = allGroups.filter(g => 
      g.name?.startsWith(branchAbbr) && g.branch === branch
    );
    
    // Find next available number
    let nextNumber = 1;
    while (existingGroups.some(g => g.name === `${branchAbbr}${nextNumber}`)) {
      nextNumber++;
    }
    
    return `${branchAbbr}${nextNumber}`;
  };

  // Calculate academic hours based on dates, schedule and time
  const calculateAcademicHours = (startDate: Date | null, endDate: Date | null, scheduleDays: string[], lessonDuration: number) => {
    if (!startDate || !endDate || scheduleDays.length === 0 || lessonDuration === 0) return 0;
    
    const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const lessonsPerWeek = scheduleDays.length;
    const totalLessons = totalWeeks * lessonsPerWeek;
    const academicHoursPerLesson = lessonDuration / 45; // 45 minutes = 1 academic hour
    
    return Math.round(totalLessons * academicHoursPerLesson);
  };

  // Get lesson duration in minutes
  const getLessonDuration = () => {
    if (!formData.lesson_start_hour || !formData.lesson_start_minute || 
        !formData.lesson_end_hour || !formData.lesson_end_minute) return 0;
    
    const startMinutes = parseInt(formData.lesson_start_hour) * 60 + parseInt(formData.lesson_start_minute);
    const endMinutes = parseInt(formData.lesson_end_hour) * 60 + parseInt(formData.lesson_end_minute);
    
    return endMinutes - startMinutes;
  };

  // Auto-calculate academic hours when relevant fields change
  const updateAcademicHours = () => {
    const lessonDuration = getLessonDuration();
    const hours = calculateAcademicHours(formData.period_start, formData.period_end, formData.schedule_days, lessonDuration);
    
    if (hours > 0) {
      setFormData(prev => ({ ...prev, academic_hours: hours.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create schedule_time from start and end times
      const schedule_time = (formData.lesson_start_hour && formData.lesson_start_minute && 
                           formData.lesson_end_hour && formData.lesson_end_minute) 
        ? `${formData.lesson_start_hour.padStart(2, '0')}:${formData.lesson_start_minute.padStart(2, '0')}-${formData.lesson_end_hour.padStart(2, '0')}:${formData.lesson_end_minute.padStart(2, '0')}`
        : undefined;

      const groupData: Omit<LearningGroup, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name,
        branch: formData.branch,
        subject: formData.subject,
        level: formData.level,
        category: formData.category,
        group_type: formData.group_type,
        status: formData.status,
        capacity: parseInt(formData.capacity),
        current_students: 0,
        academic_hours: formData.academic_hours ? parseFloat(formData.academic_hours) : undefined,
        responsible_teacher: formData.responsible_teacher || undefined,
        period_start: formData.period_start?.toISOString().split('T')[0] || undefined,
        period_end: formData.period_end?.toISOString().split('T')[0] || undefined,
        schedule_days: formData.schedule_days.length > 0 ? formData.schedule_days : undefined,
        schedule_time: schedule_time,
        schedule_room: formData.schedule_room || undefined,
        debt_count: 0,
        is_active: true
      };

      await createGroup.mutateAsync(groupData);

      toast({
        title: "Успешно",
        description: "Новая группа добавлена"
      });

      // Reset form
      setFormData({
        name: "",
        branch: "",
        subject: "Английский",
        level: "",
        category: "all",
        group_type: "general",
        status: "forming",
        capacity: "10",
        academic_hours: "",
        lesson_duration: "",
        responsible_teacher: "",
        period_start: null,
        period_end: null,
        schedule_days: [],
        schedule_room: "",
        lesson_start_hour: "",
        lesson_start_minute: "",
        lesson_end_hour: "",
        lesson_end_minute: ""
      });
      
      setOpen(false);
      onGroupAdded?.();

    } catch (error) {
      console.error('Error adding group:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить группу",
        variant: "destructive"
      });
    }
  };

  const branches = getBranchesForSelect();
  // Function to get default academic hours based on level
  const getDefaultAcademicHours = (level: string): string => {
    if (level.startsWith("Super Safari")) return "120";
    if (level.startsWith("Kids Box")) return "160";
    if (level.startsWith("Prepare")) return "160";
    if (level.startsWith("Empower")) return "120";
    return "";
  };

  // Function to get default lesson duration based on level
  const getDefaultLessonDuration = (level: string): string => {
    if (level.startsWith("Super Safari")) return "60";
    return "80"; // Default for Kids Box, Prepare, Empower
  };

  // Function to get total lessons for course
  const getTotalLessons = (level: string): number => {
    if (level.startsWith("Super Safari")) return 80;
    if (level.startsWith("Kids Box")) return 80;
    if (level.startsWith("Prepare")) return 80;
    if (level.startsWith("Empower")) return 60;
    return 0;
  };

  // Function to get next May 31st date
  const getNextMay31 = (): Date => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const may31ThisYear = new Date(currentYear, 4, 31); // May is month 4 (0-indexed)
    
    // If we're past May 31st this year, use next year
    if (now > may31ThisYear) {
      return new Date(currentYear + 1, 4, 31);
    }
    return may31ThisYear;
  };

  // Function to set period end for special programs
  const shouldSetMay31End = (level: string): boolean => {
    const specialPrograms = ["Speaking Club", "Workshop", "Kindergarten"];
    return specialPrograms.some(program => level.includes(program));
  };

  // Function to calculate end date based on start date, schedule days and total lessons
  const calculateEndDate = (startDate: Date, scheduleDays: string[], totalLessons: number): Date => {
    if (!startDate || !scheduleDays || scheduleDays.length === 0 || totalLessons === 0) {
      return startDate;
    }

    const daysPerWeek = scheduleDays.length;
    const totalWeeks = Math.ceil(totalLessons / daysPerWeek);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (totalWeeks * 7));
    
    return endDate;
  };

  const levels = [
    "Super Safari 1", "Super Safari 2", "Super Safari 3",
    "Kids Box Starter", "Kids Box 1", "Kids Box 2", "Kids Box 3", "Kids Box 4", "Kids Box 5", "Kids Box 6",
    "Kids Box 3+4", "Kids Box Starter + 1",
    "Prepare 1", "Prepare 2", "Prepare 3", "Prepare 4", "Prepare 5", "Prepare 6",
    "Empower 1", "Empower 2", "Empower 3", "Empower 4", "Empower 5",
    "Speaking Club", "Workshop", "Kindergarten"
  ];

  const days = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  
  // Generate classroom options based on branch
  const getClassroomsForBranch = (branch: string) => {
    const classroomMap: Record<string, string[]> = {
      "Окская": ["Аудитория 1", "Аудитория 2", "Аудитория 3", "Аудитория 4"],
      "Котельники": ["Кабинет 101", "Кабинет 102", "Кабинет 103"],
      "Люберцы-1": ["Класс А", "Класс Б", "Класс В", "Класс Г"],
      "Люберцы-2": ["Комната 1", "Комната 2", "Комната 3"],
      "Мытищи": ["Зал 1", "Зал 2", "Зал 3", "Зал 4"],
      "Новокосино": ["Студия 1", "Студия 2", "Студия 3"],
      "Солнцево": ["Кабинет 1", "Кабинет 2", "Кабинет 3", "Кабинет 4"],
      "Стахановская": ["Аудитория А", "Аудитория Б", "Аудитория В"],
      "Онлайн": ["Zoom-комната 1", "Zoom-комната 2", "Zoom-комната 3"]
    };
    return classroomMap[branch] || [];
  };

  // Generate time options
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
          <Plus className="h-4 w-4" />
          Добавить группу
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden p-0">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              Добавить группу
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Филиал *
                    </Label>
                    <Select
                      value={formData.branch}
                      onValueChange={(value) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          branch: value,
                          name: generateGroupName(value)
                        }));
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите филиал" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(branch => (
                          <SelectItem key={branch.value} value={branch.label}>
                            {branch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      <Badge className="h-4 w-4 text-yellow-600" />
                      Статус группы
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="forming">
                          <span className="text-yellow-600">Формирующаяся</span>
                        </SelectItem>
                        <SelectItem value="active">
                          <span className="text-green-600">В работе</span>
                        </SelectItem>
                        <SelectItem value="reserve">
                          <span className="text-gray-600">Резервная</span>
                        </SelectItem>
                        <SelectItem value="suspended">
                          <span className="text-red-600">Приостановленная</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Язык</Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Английский">Английский</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      <BookOpen className="h-4 w-4 text-green-600" />
                      Уровень *
                    </Label>
                    <Select
                      value={formData.level}
                      onValueChange={(value) => setFormData(prev => {
                        const newFormData = { 
                          ...prev, 
                          level: value, 
                          category: getCategoryFromLevel(value),
                          academic_hours: getDefaultAcademicHours(value),
                          lesson_duration: getDefaultLessonDuration(value),
                          period_end: shouldSetMay31End(value) ? getNextMay31() : 
                            (prev.period_start && prev.schedule_days?.length > 0 ? 
                              calculateEndDate(prev.period_start, prev.schedule_days, getTotalLessons(value)) : 
                              prev.period_end)
                        };
                        return newFormData;
                      })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите уровень" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {levels.map(level => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Категория</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
                      disabled
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">[Все]</SelectItem>
                        <SelectItem value="preschool">Дошкольники</SelectItem>
                        <SelectItem value="school">Школьники</SelectItem>
                        <SelectItem value="adult">Взрослые</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Тип</Label>
                    <Select
                      value={formData.group_type}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, group_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Группа</SelectItem>
                        <SelectItem value="mini">Мини-группа</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Вместимость *
                    </Label>
                    <Input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                      min="1"
                      max="20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ак. часов</Label>
                    <Input
                      type="number"
                      value={formData.academic_hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, academic_hours: e.target.value }))}
                      placeholder="Рассчитается автоматически"
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      Продолжительность урока (мин.)
                    </Label>
                    <Select
                      value={formData.lesson_duration}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, lesson_duration: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите продолжительность" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="40">40 минут</SelectItem>
                        <SelectItem value="60">60 минут</SelectItem>
                        <SelectItem value="80">80 минут</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Преподаватель *
                    </Label>
                    <Select
                      value={formData.responsible_teacher}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, responsible_teacher: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите преподавателя" />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-50 max-h-60">
                        {teachers.map(teacher => (
                          <SelectItem key={teacher.id} value={getTeacherFullName(teacher)}>
                            {getTeacherFullName(teacher)}
                          </SelectItem>
                        ))}
                        {teachers.length === 0 && (
                          <SelectItem value="no-teachers" disabled>
                            Нет доступных преподавателей
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      Аудитория *
                    </Label>
                    <Select
                      value={formData.schedule_room}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, schedule_room: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите аудиторию" />
                      </SelectTrigger>
                      <SelectContent>
                        {getClassroomsForBranch(formData.branch).map(room => (
                          <SelectItem key={room} value={room}>
                            {room}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Period dates */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-green-600" />
                    Период обучения *
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Дата начала</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.period_start && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.period_start ? (
                              format(formData.period_start, "dd.MM.yyyy", { locale: ru })
                            ) : (
                              <span>Выберите дату</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={formData.period_start || undefined}
                            onSelect={(date) => {
                              setFormData(prev => ({ ...prev, period_start: date || null }));
                              setTimeout(updateAcademicHours, 100);
                            }}
                            className="p-3 pointer-events-auto"
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Дата окончания</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.period_end && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.period_end ? (
                              format(formData.period_end, "dd.MM.yyyy", { locale: ru })
                            ) : (
                              <span>Выберите дату</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={formData.period_end || undefined}
                            onSelect={(date) => {
                              setFormData(prev => ({ ...prev, period_end: date || null }));
                              setTimeout(updateAcademicHours, 100);
                            }}
                            className="p-3 pointer-events-auto"
                            disabled={(date) => formData.period_start ? date < formData.period_start : false}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    Дни занятий
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {days.map(day => (
                      <Button
                        key={day}
                        type="button"
                        variant={formData.schedule_days.includes(day) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          toggleDay(day);
                          setTimeout(updateAcademicHours, 100);
                        }}
                        className={formData.schedule_days.includes(day) ? "bg-blue-600 text-white" : ""}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Время занятий *
                  </Label>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Время начала</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={formData.lesson_start_hour}
                          onValueChange={(value) => {
                            setFormData(prev => ({ ...prev, lesson_start_hour: value }));
                            setTimeout(updateAcademicHours, 100);
                          }}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Час" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {hours.map(hour => (
                              <SelectItem key={hour} value={hour}>
                                {hour}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={formData.lesson_start_minute}
                          onValueChange={(value) => {
                            setFormData(prev => ({ ...prev, lesson_start_minute: value }));
                            setTimeout(updateAcademicHours, 100);
                          }}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Мин" />
                          </SelectTrigger>
                          <SelectContent>
                            {minutes.map(minute => (
                              <SelectItem key={minute} value={minute}>
                                {minute}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Время окончания</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={formData.lesson_end_hour}
                          onValueChange={(value) => {
                            setFormData(prev => ({ ...prev, lesson_end_hour: value }));
                            setTimeout(updateAcademicHours, 100);
                          }}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Час" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {hours.map(hour => (
                              <SelectItem key={hour} value={hour}>
                                {hour}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={formData.lesson_end_minute}
                          onValueChange={(value) => {
                            setFormData(prev => ({ ...prev, lesson_end_minute: value }));
                            setTimeout(updateAcademicHours, 100);
                          }}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Мин" />
                          </SelectTrigger>
                          <SelectContent>
                            {minutes.map(minute => (
                              <SelectItem key={minute} value={minute}>
                                {minute}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Название группы *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Генерируется автоматически"
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Отменить
              </Button>
              <Button
                type="submit"
                disabled={createGroup.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {createGroup.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};