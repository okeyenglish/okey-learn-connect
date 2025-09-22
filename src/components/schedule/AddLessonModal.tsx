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
import { useTeachers } from "@/hooks/useTeachers";
import { StudentSelector } from "./StudentSelector";
import { useAddStudentsToSession } from "@/hooks/useStudentScheduleConflicts";
import { getBranchesForSelect, getClassroomsForBranch } from "@/lib/branches";

interface ScheduleConflict {
  conflict_type: 'teacher' | 'classroom';
  conflicting_teacher?: string;
  conflicting_classroom?: string;
  conflicting_time_range: string;
}

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
    lesson_date: "",
    start_time: "",
    end_time: "",
    notes: ""
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  
  const { toast } = useToast();
  const createSession = useCreateLessonSession();
  const addStudentsToSession = useAddStudentsToSession();
  const checkConflicts = useCheckScheduleConflicts();
  const { groups } = useLearningGroups({});
  const { teachers } = useTeachers({});
  const branches = getBranchesForSelect();

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
        lesson_date: formData.lesson_date,
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

  const resetForm = () => {
    setFormData({
      group_id: "",
      teacher_name: "",
      branch: "",
      classroom: "",
      lesson_date: "",
      start_time: "",
      end_time: "",
      notes: ""
    });
    setSelectedStudents([]);
    setConflicts([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lesson_date || !formData.start_time || !formData.end_time || 
        !formData.teacher_name || !formData.branch || !formData.classroom) {
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
      // Create the lesson session first
      const newSession = await createSession.mutateAsync({
        group_id: formData.group_id || undefined,
        teacher_name: formData.teacher_name,
        branch: formData.branch,
        classroom: formData.classroom,
        lesson_date: formData.lesson_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        day_of_week: getDayOfWeek(formData.lesson_date),
        status: 'scheduled',
        notes: formData.notes || undefined
      });

      // Add students to the session if any are selected
      if (selectedStudents.length > 0) {
        await addStudentsToSession.mutateAsync({
          studentIds: selectedStudents,
          lessonSessionId: newSession.id
        });
      }

      toast({
        title: "Успешно",
        description: `Занятие создано${selectedStudents.length > 0 ? ` и добавлено ${selectedStudents.length} учеников` : ''}`
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать занятие",
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
              <Label htmlFor="group_id">Группа (необязательно)</Label>
              <Select value={formData.group_id} onValueChange={(value) => setFormData(prev => ({ ...prev, group_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите группу или оставьте пустым для индивидуального занятия" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Индивидуальное занятие</SelectItem>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher_name">Преподаватель *</Label>
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
              <Label htmlFor="branch">Филиал *</Label>
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
              <Label htmlFor="classroom">Аудитория *</Label>
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lesson_date">Дата занятия *</Label>
              <Input
                id="lesson_date"
                type="date"
                value={formData.lesson_date}
                onChange={(e) => setFormData(prev => ({ ...prev, lesson_date: e.target.value }))}
              />
            </div>
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
              <Label htmlFor="end_time">Время окончания *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Students Section */}
          {formData.lesson_date && formData.start_time && formData.end_time && (
            <div className="space-y-4">
              <StudentSelector
                selectedStudentIds={selectedStudents}
                onSelectionChange={setSelectedStudents}
                lessonDate={formData.lesson_date}
                startTime={formData.start_time}
                endTime={formData.end_time}
                branch={formData.branch}
              />
            </div>
          )}

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
              disabled={createSession.isPending || addStudentsToSession.isPending || conflicts.length > 0}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              {createSession.isPending || addStudentsToSession.isPending ? (
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