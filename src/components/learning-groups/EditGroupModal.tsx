import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUpdateLearningGroup, LearningGroup } from "@/hooks/useLearningGroups";
import { useTeachers } from "@/hooks/useTeachers";
import { useToast } from "@/hooks/use-toast";
import { getBranchesForSelect, getClassroomsForBranch } from "@/lib/branches";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, BookOpen, Users, Clock, User } from "lucide-react";

interface EditGroupModalProps {
  group: LearningGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupUpdated?: () => void;
}

export const EditGroupModal = ({ group, open, onOpenChange, onGroupUpdated }: EditGroupModalProps) => {
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
    schedule_times: {} as Record<string, { start_hour: string; start_minute: string; end_hour: string; end_minute: string }>,
    schedule_room: ""
  });
  
  const { toast } = useToast();
  const updateGroup = useUpdateLearningGroup();

  // Parse existing schedule_time into schedule_times
  const parseScheduleTime = (scheduleTime: string, scheduleDays: string[]) => {
    const scheduleTimes: Record<string, { start_hour: string; start_minute: string; end_hour: string; end_minute: string }> = {};
    
    if (scheduleTime && scheduleDays.length > 0) {
      // Check if it's the new format (day specific) or old format (general)
      if (scheduleTime.includes('пн') || scheduleTime.includes('вт') || scheduleTime.includes('ср') || 
          scheduleTime.includes('чт') || scheduleTime.includes('пт') || scheduleTime.includes('сб') || 
          scheduleTime.includes('вс')) {
        // New format: "пн 10:00-11:00, ср 15:00-16:00"
        const dayTimePairs = scheduleTime.split(', ');
        dayTimePairs.forEach(pair => {
          const [day, timeRange] = pair.split(' ');
          if (timeRange && timeRange.includes('-')) {
            const [startTime, endTime] = timeRange.split('-');
            const [startHour, startMinute] = startTime.split(':');
            const [endHour, endMinute] = endTime.split(':');
            
            scheduleTimes[day] = {
              start_hour: startHour,
              start_minute: startMinute,
              end_hour: endHour,
              end_minute: endMinute
            };
          }
        });
      } else {
        // Old format: "10:00-11:00" - apply to all scheduled days
        if (scheduleTime.includes('-')) {
          const [startTime, endTime] = scheduleTime.split('-');
          const [startHour, startMinute] = startTime.split(':');
          const [endHour, endMinute] = endTime.split(':');
          
          scheduleDays.forEach(day => {
            scheduleTimes[day] = {
              start_hour: startHour,
              start_minute: startMinute,
              end_hour: endHour,
              end_minute: endMinute
            };
          });
        }
      }
    }
    
    return scheduleTimes;
  };

  const { teachers } = useTeachers({
    subject: formData.subject,
    category: formData.category
  });

  const getTeacherFullName = (teacher: any) => {
    return `${teacher.last_name} ${teacher.first_name}`.trim();
  };

  const getCategoryFromLevel = (level: string): "preschool" | "school" | "adult" | "all" => {
    if (level.startsWith("Super Safari") || level.includes("Kindergarten")) return "preschool";
    if (level.startsWith("Kids Box") || level.startsWith("Prepare")) return "school";
    if (level.startsWith("Empower") || level.includes("Speaking Club") || level.includes("Workshop")) return "adult";
    return "all";
  };

  // Initialize form when group changes
  useEffect(() => {
    if (group && open) {
      const scheduleDays = group.schedule_days || [];
      const scheduleTimes = parseScheduleTime(group.schedule_time || "", scheduleDays);
      
      setFormData({
        name: group.name || "",
        branch: group.branch || "",
        subject: group.subject || "Английский",
        level: group.level || "",
        category: getCategoryFromLevel(group.level || ""),
        group_type: group.group_type || "general",
        status: group.status || "forming",
        capacity: group.capacity?.toString() || "10",
        academic_hours: group.academic_hours?.toString() || "",
        lesson_duration: "80", // Default, will be set based on level
        responsible_teacher: group.responsible_teacher || "",
        period_start: group.period_start ? new Date(group.period_start) : null,
        period_end: group.period_end ? new Date(group.period_end) : null,
        schedule_days: scheduleDays,
        schedule_times: scheduleTimes,
        schedule_room: group.schedule_room || ""
      });
    }
  }, [group, open]);

  // Auto-calculate end time based on start time and duration
  const calculateEndTime = (startHour: string, startMinute: string, durationMinutes: number) => {
    if (!startHour || !startMinute || !durationMinutes) return { hour: "", minute: "" };
    
    const startTotalMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
    const endTotalMinutes = startTotalMinutes + durationMinutes;
    
    const endHour = Math.floor(endTotalMinutes / 60) % 24;
    const endMinute = endTotalMinutes % 60;
    
    return {
      hour: endHour.toString().padStart(2, '0'),
      minute: endMinute.toString().padStart(2, '0')
    };
  };

  // Update end time for a specific day
  const updateEndTimeForDay = (day: string) => {
    const daySchedule = formData.schedule_times[day];
    if (daySchedule?.start_hour && daySchedule?.start_minute && formData.lesson_duration) {
      const durationMinutes = parseInt(formData.lesson_duration);
      const endTime = calculateEndTime(daySchedule.start_hour, daySchedule.start_minute, durationMinutes);
      
      setFormData(prev => ({
        ...prev,
        schedule_times: {
          ...prev.schedule_times,
          [day]: {
            ...prev.schedule_times[day],
            end_hour: endTime.hour,
            end_minute: endTime.minute
          }
        }
      }));
    }
  };

  const updateAllEndTimes = () => {
    formData.schedule_days.forEach(day => updateEndTimeForDay(day));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create schedule_time from schedule_times object
      let schedule_time: string | undefined = undefined;
      if (formData.schedule_days.length > 0) {
        const timeStrings = formData.schedule_days.map(day => {
          const dayTime = formData.schedule_times[day];
          if (dayTime?.start_hour && dayTime?.start_minute && dayTime?.end_hour && dayTime?.end_minute) {
            const startTime = `${dayTime.start_hour.padStart(2, '0')}:${dayTime.start_minute.padStart(2, '0')}`;
            const endTime = `${dayTime.end_hour.padStart(2, '0')}:${dayTime.end_minute.padStart(2, '0')}`;
            return `${day} ${startTime}-${endTime}`;
          }
          return null;
        }).filter(Boolean);
        
        if (timeStrings.length > 0) {
          schedule_time = timeStrings.join(', ');
        }
      }

      const groupData = {
        name: formData.name,
        branch: formData.branch,
        subject: formData.subject,
        level: formData.level,
        category: formData.category,
        group_type: formData.group_type,
        status: formData.status,
        capacity: parseInt(formData.capacity),
        academic_hours: formData.academic_hours ? parseFloat(formData.academic_hours) : undefined,
        responsible_teacher: formData.responsible_teacher || undefined,
        period_start: formData.period_start?.toISOString().split('T')[0] || undefined,
        period_end: formData.period_end?.toISOString().split('T')[0] || undefined,
        schedule_days: formData.schedule_days.length > 0 ? formData.schedule_days : undefined,
        schedule_time: schedule_time,
        schedule_room: formData.schedule_room || undefined
      };

      await updateGroup.mutateAsync({ id: group.id, data: groupData });

      toast({
        title: "Успешно",
        description: "Группа обновлена"
      });

      onOpenChange(false);
      onGroupUpdated?.();

    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить группу",
        variant: "destructive"
      });
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => {
      const isCurrentlySelected = prev.schedule_days.includes(day);
      let newScheduleDays;
      let newScheduleTimes = { ...prev.schedule_times };
      
      if (isCurrentlySelected) {
        // Remove day
        newScheduleDays = prev.schedule_days.filter(d => d !== day);
        delete newScheduleTimes[day];
      } else {
        // Add day
        newScheduleDays = [...prev.schedule_days, day];
        newScheduleTimes[day] = {
          start_hour: "",
          start_minute: "",
          end_hour: "",
          end_minute: ""
        };
      }
      
      return {
        ...prev,
        schedule_days: newScheduleDays,
        schedule_times: newScheduleTimes
      };
    });
  };

  const branches = getBranchesForSelect();
  const levels = [
    "Super Safari 1", "Super Safari 2", "Super Safari 3",
    "Kids Box Starter", "Kids Box 1", "Kids Box 2", "Kids Box 3", "Kids Box 4", "Kids Box 5", "Kids Box 6",
    "Kids Box 3+4", "Kids Box Starter + 1",
    "Prepare 1", "Prepare 2", "Prepare 3", "Prepare 4", "Prepare 5", "Prepare 6",
    "Empower 1", "Empower 2", "Empower 3", "Empower 4", "Empower 5",
    "Speaking Club", "Workshop", "Kindergarten"
  ];
  const days = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden p-0">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              Редактировать группу
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Название группы *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Название группы"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Филиал *
                    </Label>
                    <Select
                      value={formData.branch}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(branch => (
                          <SelectItem key={branch.value} value={branch.value}>
                            {branch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Предмет</Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                      disabled
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
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        level: value, 
                        category: getCategoryFromLevel(value)
                      }))}
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
                      placeholder="Академические часы"
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                            onSelect={(date) => setFormData(prev => ({ ...prev, period_start: date || null }))}
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
                            onSelect={(date) => setFormData(prev => ({ ...prev, period_end: date || null }))}
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
                  <Label className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Расписание занятий *
                  </Label>
                  <div className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {days.map(day => (
                        <Button
                          key={day}
                          type="button"
                          variant={formData.schedule_days.includes(day) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDay(day)}
                          className={formData.schedule_days.includes(day) ? "bg-blue-600 text-white" : ""}
                        >
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Time inputs for each selected day */}
                    {formData.schedule_days.length > 0 && (
                      <div className="space-y-3">
                        {formData.schedule_days.map(day => (
                          <div key={day} className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="font-medium mb-3 text-gray-700">{day.charAt(0).toUpperCase() + day.slice(1)}</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm text-gray-600">Время начала</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Select
                                    value={formData.schedule_times[day]?.start_hour || ""}
                                    onValueChange={(value) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        schedule_times: {
                                          ...prev.schedule_times,
                                          [day]: {
                                            ...prev.schedule_times[day],
                                            start_hour: value
                                          }
                                        }
                                      }));
                                      setTimeout(() => updateEndTimeForDay(day), 100);
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
                                    value={formData.schedule_times[day]?.start_minute || ""}
                                    onValueChange={(value) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        schedule_times: {
                                          ...prev.schedule_times,
                                          [day]: {
                                            ...prev.schedule_times[day],
                                            start_minute: value
                                          }
                                        }
                                      }));
                                      setTimeout(() => updateEndTimeForDay(day), 100);
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
                                    value={formData.schedule_times[day]?.end_hour || ""}
                                    disabled
                                  >
                                    <SelectTrigger className="bg-gray-100">
                                      <SelectValue placeholder="Час" />
                                    </SelectTrigger>
                                  </Select>
                                  <Select
                                    value={formData.schedule_times[day]?.end_minute || ""}
                                    disabled
                                  >
                                    <SelectTrigger className="bg-gray-100">
                                      <SelectValue placeholder="Мин" />
                                    </SelectTrigger>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                disabled={updateGroup.isPending}
              >
                {updateGroup.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};