import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateLessonSession, useCheckScheduleConflicts } from "@/hooks/useLessonSessions";
import { useLearningGroups } from "@/hooks/useLearningGroups";
import { getClassroomsForBranch } from "@/lib/branches";

interface ScheduleConflict {
  conflict_type: 'teacher' | 'classroom';
  conflicting_teacher?: string;
  conflicting_classroom?: string;
  conflicting_time_range: string;
}

interface AddLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultGroupId?: string;
}

export const AddLessonModal = ({ open, onOpenChange, defaultGroupId }: AddLessonModalProps) => {
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    start_time: "",
    duration: "80",
    classroom: "",
    notes: ""
  });
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [currentGroup, setCurrentGroup] = useState<any>(null);
  
  const { toast } = useToast();
  const createSession = useCreateLessonSession();
  const checkConflicts = useCheckScheduleConflicts();
  const { groups } = useLearningGroups({});

  // Загружаем данные группы при открытии модального окна
  React.useEffect(() => {
    if (open && defaultGroupId && groups.length > 0) {
      const group = groups.find(g => g.id === defaultGroupId);
      if (group) {
        setCurrentGroup(group);
        setFormData(prev => ({ 
          ...prev, 
          classroom: group.schedule_room || "" 
        }));
      }
    }
  }, [open, defaultGroupId, groups]);

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    const dayMap = {
      0: 'sunday' as const,
      1: 'monday' as const,
      2: 'tuesday' as const,
      3: 'wednesday' as const,
      4: 'thursday' as const,
      5: 'friday' as const,
      6: 'saturday' as const
    };
    return dayMap[date.getDay()];
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleCheckConflicts = async () => {
    if (!currentGroup || !formData.classroom || !formData.start_date || !formData.start_time || !formData.duration) {
      return;
    }

    if (!currentGroup.responsible_teacher) {
      return; // Не проверяем конфликты если нет преподавателя
    }

    const endTime = calculateEndTime(formData.start_time, parseInt(formData.duration));

    try {
      const result = await checkConflicts.mutateAsync({
        teacher_name: currentGroup.responsible_teacher,
        branch: currentGroup.branch,
        classroom: formData.classroom,
        lesson_date: formData.start_date,
        start_time: formData.start_time,
        end_time: endTime
      });
      setConflicts(result || []);
    } catch (error) {
      console.error('Error checking conflicts:', error);
      setConflicts([]);
    }
  };

  React.useEffect(() => {
    if (currentGroup) {
      handleCheckConflicts();
    }
  }, [currentGroup, formData.classroom, formData.start_date, formData.start_time, formData.duration]);

  const resetForm = () => {
    setFormData({
      start_date: "",
      end_date: "",
      start_time: "",
      duration: "80",
      classroom: "",
      notes: ""
    });
    setSelectedWeekdays([]);
    setConflicts([]);
    setCurrentGroup(null);
  };

  const generateDateRange = (startDate: string, endDate: string, weekdays?: string[]): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Маппинг дней недели
    const weekdayMap: Record<string, number> = {
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
      'sunday': 0
    };
    
    // Если дни недели не указаны или массив пустой, добавляем все дни
    const filterByWeekdays = weekdays && weekdays.length > 0;
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      if (filterByWeekdays) {
        const dayOfWeek = date.getDay();
        const isSelectedDay = weekdays.some(day => weekdayMap[day] === dayOfWeek);
        if (isSelectedDay) {
          dates.push(date.toISOString().split('T')[0]);
        }
      } else {
        // Если дни не указаны, добавляем все дни
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentGroup || !defaultGroupId || !formData.start_date || !formData.start_time || !formData.duration || !formData.classroom) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    if (!currentGroup.responsible_teacher) {
      toast({
        title: "Ошибка",
        description: "У группы не указан преподаватель",
        variant: "destructive"
      });
      return;
    }

    if (conflicts.length > 0) {
      toast({
        title: "Ошибка",
        description: "Есть конфликты в расписании. Измените время или аудиторию.",
        variant: "destructive"
      });
      return;
    }

    try {
      const endTime = calculateEndTime(formData.start_time, parseInt(formData.duration));
      
      // Генерируем список дат
      // Если выбран период И выбраны дни недели - фильтруем по дням
      // Если выбран период БЕЗ дней - создаем на каждый день
      // Если не выбран период - создаем только на start_date
      const datesToCreate = formData.end_date 
        ? generateDateRange(
            formData.start_date, 
            formData.end_date, 
            selectedWeekdays.length > 0 ? selectedWeekdays : undefined
          )
        : [formData.start_date];

      let createdCount = 0;

      // Создаем занятия для каждой даты
      for (const lessonDate of datesToCreate) {
        const sessionData: any = {
          group_id: defaultGroupId,
          teacher_name: currentGroup.responsible_teacher,
          branch: currentGroup.branch,
          classroom: formData.classroom,
          lesson_date: lessonDate,
          start_time: formData.start_time,
          end_time: endTime,
          day_of_week: getDayOfWeek(lessonDate),
          status: 'scheduled'
        };

        // Добавляем заметки только если они есть
        if (formData.notes && formData.notes.trim()) {
          sessionData.notes = formData.notes.trim();
        }

        await createSession.mutateAsync(sessionData);
        createdCount++;
      }

      toast({
        title: "Успешно",
        description: `Создано занятий: ${createdCount}`
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating lessons:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать занятия",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить занятие в расписание</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Информация о группе */}
          {currentGroup && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="font-medium text-sm">Группа: {currentGroup.name}</div>
              <div className="text-sm text-muted-foreground">
                <div>Преподаватель: {currentGroup.responsible_teacher || <span className="text-destructive font-medium">Не указан</span>}</div>
                <div>Филиал: {currentGroup.branch}</div>
                <div>Аудитория по умолчанию: {currentGroup.schedule_room || 'Не указана'}</div>
              </div>
              {!currentGroup.responsible_teacher && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    У группы не указан преподаватель. Пожалуйста, укажите преподавателя в настройках группы перед созданием занятий.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Конфликты */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Обнаружены конфликты в расписании:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>
                      {conflict.conflict_type === 'teacher' 
                        ? `Преподаватель ${conflict.conflicting_teacher} уже ведёт занятие в ${conflict.conflicting_time_range}`
                        : `Аудитория ${conflict.conflicting_classroom} уже занята в ${conflict.conflicting_time_range}`
                      }
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Дата начала занятий *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Дата окончания (необязательно)</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                min={formData.start_date}
              />
              <p className="text-xs text-muted-foreground">
                Для создания занятий в периоде
              </p>
            </div>
          </div>

          {/* Дни недели - показываем только если указана дата окончания */}
          {formData.end_date && (
            <div className="space-y-2">
              <Label>Дни недели</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'monday', label: 'Пн' },
                  { value: 'tuesday', label: 'Вт' },
                  { value: 'wednesday', label: 'Ср' },
                  { value: 'thursday', label: 'Чт' },
                  { value: 'friday', label: 'Пт' },
                  { value: 'saturday', label: 'Сб' },
                  { value: 'sunday', label: 'Вс' }
                ].map(day => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={selectedWeekdays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedWeekdays(prev => 
                        prev.includes(day.value) 
                          ? prev.filter(d => d !== day.value)
                          : [...prev, day.value]
                      );
                    }}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedWeekdays.length > 0 
                  ? 'Занятия будут созданы только в выбранные дни недели'
                  : 'Если не выбрано, занятия будут созданы на каждый день периода'
                }
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Время начала *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Продолжительность (минут) *</Label>
              <Select value={formData.duration} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="40">40 минут</SelectItem>
                  <SelectItem value="45">45 минут</SelectItem>
                  <SelectItem value="60">60 минут</SelectItem>
                  <SelectItem value="80">80 минут</SelectItem>
                  <SelectItem value="90">90 минут</SelectItem>
                  <SelectItem value="120">120 минут</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classroom">Аудитория *</Label>
            <Select value={formData.classroom} onValueChange={(value) => setFormData(prev => ({ ...prev, classroom: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите аудиторию" />
              </SelectTrigger>
              <SelectContent>
                {currentGroup && getClassroomsForBranch(currentGroup.branch).map(classroom => (
                  <SelectItem key={classroom} value={classroom}>
                    {classroom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки (необязательно)</Label>
            <Textarea
              id="notes"
              placeholder="Дополнительная информация о занятии..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={
                createSession.isPending || 
                conflicts.length > 0 || 
                !currentGroup ||
                !currentGroup.responsible_teacher
              }
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              {createSession.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Создание...
                </>
              ) : (
                'Создать занятие'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};