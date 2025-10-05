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

    const endTime = calculateEndTime(formData.start_time, parseInt(formData.duration));

    try {
      const result = await checkConflicts.mutateAsync({
        teacher_name: currentGroup.responsible_teacher || "",
        branch: currentGroup.branch,
        classroom: formData.classroom,
        lesson_date: formData.start_date,
        start_time: formData.start_time,
        end_time: endTime
      });
      setConflicts(result);
    } catch (error) {
      console.error('Error checking conflicts:', error);
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
    setConflicts([]);
    setCurrentGroup(null);
  };

  const generateDateRange = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentGroup || !formData.start_date || !formData.start_time || !formData.duration || !formData.classroom) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
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
      const datesToCreate = formData.end_date 
        ? generateDateRange(formData.start_date, formData.end_date)
        : [formData.start_date];

      // Создаем занятия для каждой даты
      for (const lessonDate of datesToCreate) {
        await createSession.mutateAsync({
          group_id: defaultGroupId,
          teacher_name: currentGroup.responsible_teacher || "",
          branch: currentGroup.branch,
          classroom: formData.classroom,
          lesson_date: lessonDate,
          start_time: formData.start_time,
          end_time: endTime,
          day_of_week: getDayOfWeek(lessonDate),
          status: 'scheduled',
          notes: formData.notes || undefined
        });
      }

      toast({
        title: "Успешно",
        description: `Создано занятий: ${datesToCreate.length}`
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
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
                <div>Преподаватель: {currentGroup.responsible_teacher || 'Не указан'}</div>
                <div>Филиал: {currentGroup.branch}</div>
                <div>Аудитория по умолчанию: {currentGroup.schedule_room || 'Не указана'}</div>
              </div>
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
                Если указана, будут созданы занятия на каждый день в диапазоне
              </p>
            </div>
          </div>

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
              disabled={createSession.isPending || conflicts.length > 0 || !currentGroup}
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