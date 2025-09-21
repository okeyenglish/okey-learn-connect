import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCreateLessonSession, useCheckScheduleConflicts, LessonSession } from "@/hooks/useLessonSessions";
import { useLearningGroups } from "@/hooks/useLearningGroups";
import { useTeachers } from "@/hooks/useTeachers";
import { getBranchesForSelect, getClassroomsForBranch } from "@/lib/branches";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AddLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddLessonModal = ({ open, onOpenChange }: AddLessonModalProps) => {
  const [formData, setFormData] = useState({
    group_id: "",
    teacher_name: "",
    branch: "",
    classroom: "",
    lesson_date: null as Date | null,
    start_time: "",
    end_time: "",
    notes: ""
  });
  const [conflicts, setConflicts] = useState<any[]>([]);
  
  const { toast } = useToast();
  const createSession = useCreateLessonSession();
  const checkConflicts = useCheckScheduleConflicts();
  const { groups } = useLearningGroups({});
  const { teachers } = useTeachers({});
  const branches = getBranchesForSelect();

  const getDayOfWeek = (date: Date): LessonSession['day_of_week'] => {
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

  const handleCheckConflicts = async () => {
    if (!formData.teacher_name || !formData.branch || !formData.classroom || 
        !formData.lesson_date || !formData.start_time || !formData.end_time) {
      return;
    }

    try {
      const result = await checkConflicts.mutateAsync({
        teacher_name: formData.teacher_name,
        branch: formData.branch,
        classroom: formData.classroom,
        lesson_date: format(formData.lesson_date, 'yyyy-MM-dd'),
        start_time: formData.start_time,
        end_time: formData.end_time
      });
      setConflicts(result);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  React.useEffect(() => {
    handleCheckConflicts();
  }, [formData.teacher_name, formData.branch, formData.classroom, formData.lesson_date, formData.start_time, formData.end_time]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lesson_date) {
      toast({
        title: "Ошибка",
        description: "Выберите дату занятия",
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
      await createSession.mutateAsync({
        group_id: formData.group_id,
        teacher_name: formData.teacher_name,
        branch: formData.branch,
        classroom: formData.classroom,
        lesson_date: format(formData.lesson_date, 'yyyy-MM-dd'),
        start_time: formData.start_time,
        end_time: formData.end_time,
        day_of_week: getDayOfWeek(formData.lesson_date),
        status: 'scheduled',
        notes: formData.notes || undefined
      });

      toast({
        title: "Успешно",
        description: "Занятие добавлено в расписание"
      });

      // Сброс формы
      setFormData({
        group_id: "",
        teacher_name: "",
        branch: "",
        classroom: "",
        lesson_date: null,
        start_time: "",
        end_time: "",
        notes: ""
      });
      setConflicts([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить занятие",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить занятие в расписание</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="group_id">Группа</Label>
              <Select value={formData.group_id} onValueChange={(value) => setFormData(prev => ({ ...prev, group_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите группу" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher_name">Преподаватель</Label>
              <Select value={formData.teacher_name} onValueChange={(value) => setFormData(prev => ({ ...prev, teacher_name: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите преподавателя" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={`${teacher.first_name} ${teacher.last_name}`.trim()}>
                      {`${teacher.first_name} ${teacher.last_name}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Филиал</Label>
              <Select 
                value={formData.branch} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value, classroom: "" }))}
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
              <Label htmlFor="classroom">Аудитория</Label>
              <Select value={formData.classroom} onValueChange={(value) => setFormData(prev => ({ ...prev, classroom: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите аудиторию" />
                </SelectTrigger>
                <SelectContent>
                  {getClassroomsForBranch(formData.branch).map(classroom => (
                    <SelectItem key={classroom} value={classroom}>
                      {classroom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Дата занятия</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.lesson_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.lesson_date ? format(formData.lesson_date, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.lesson_date || undefined}
                  onSelect={(date) => setFormData(prev => ({ ...prev, lesson_date: date || null }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Время начала</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Время окончания</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
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
              disabled={createSession.isPending || conflicts.length > 0}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              {createSession.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Сохранение...
                </>
              ) : (
                'Добавить занятие'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};