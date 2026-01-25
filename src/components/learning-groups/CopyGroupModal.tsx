import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/typedClient";
import { Copy, Users, Calendar } from "lucide-react";
import { LearningGroup } from "@/hooks/useLearningGroups";
import { getErrorMessage } from '@/lib/errorUtils';

interface CopyGroupModalProps {
  sourceGroup: LearningGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newGroupId: string) => void;
}

type StudentCopyOption = 'none' | 'active' | 'as_leads';

export const CopyGroupModal = ({
  sourceGroup,
  open,
  onOpenChange,
  onSuccess
}: CopyGroupModalProps) => {
  const { toast } = useToast();
  const [newGroupName, setNewGroupName] = useState(`${sourceGroup.name} (копия)`);
  const [studentsCopyOption, setStudentsCopyOption] = useState<StudentCopyOption>('none');
  const [copySchedule, setCopySchedule] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      // Создаём копию группы
      const { data: newGroup, error: groupError } = await supabase
        .from('learning_groups')
        .insert({
          name: newGroupName,
          custom_name: sourceGroup.custom_name,
          branch: sourceGroup.branch,
          subject: sourceGroup.subject,
          level: sourceGroup.level,
          category: sourceGroup.category,
          group_type: sourceGroup.group_type,
          status: 'forming', // Новая группа всегда в статусе "формируется"
          capacity: sourceGroup.capacity,
          current_students: 0,
          academic_hours: sourceGroup.academic_hours,
          schedule_days: copySchedule ? sourceGroup.schedule_days : null,
          schedule_time: copySchedule ? sourceGroup.schedule_time : null,
          schedule_room: sourceGroup.schedule_room,
          period_start: null,
          period_end: null,
          lesson_start_time: sourceGroup.lesson_start_time,
          lesson_end_time: sourceGroup.lesson_end_time,
          zoom_link: sourceGroup.zoom_link,
          description: sourceGroup.description,
          responsible_teacher: sourceGroup.responsible_teacher,
          course_id: sourceGroup.course_id,
          is_active: true,
          // Не копируем авто-группу настройки
          is_auto_group: false,
          auto_filter_conditions: null,
          responsible_manager_id: sourceGroup.responsible_manager_id,
          custom_name_locked: sourceGroup.custom_name_locked,
          color_code: sourceGroup.color_code
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Копируем студентов если нужно
      if (studentsCopyOption !== 'none' && newGroup) {
        const { data: sourceStudents, error: studentsError } = await supabase
          .from('group_students')
          .select('student_id, notes, enrollment_date')
          .eq('group_id', sourceGroup.id)
          .eq('status', 'active');

        if (studentsError) throw studentsError;

        if (sourceStudents && sourceStudents.length > 0) {
          if (studentsCopyOption === 'active') {
            // Копируем как активных студентов
            const studentsToInsert = sourceStudents.map(s => ({
              group_id: newGroup.id,
              student_id: s.student_id,
              status: 'active' as const,
              enrollment_type: 'manual' as const,
              enrollment_date: new Date().toISOString().split('T')[0],
              notes: `Переведён из группы "${sourceGroup.name}"`
            }));

            const { error: insertError } = await supabase
              .from('group_students')
              .insert(studentsToInsert);

            if (insertError) throw insertError;
          } else if (studentsCopyOption === 'as_leads') {
            // TODO: Копируем как лиды
            // Это потребует связи с таблицей leads
            console.log('Копирование как лидов - требуется реализация');
          }
        }
      }

      toast({
        title: "Успешно",
        description: `Группа "${newGroupName}" успешно создана`
      });

      onSuccess?.(newGroup.id);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error copying group:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Копирование группы
          </DialogTitle>
          <DialogDescription>
            Создание копии группы "{sourceGroup.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Название новой группы */}
          <div className="space-y-2">
            <Label htmlFor="new-group-name">Название новой группы</Label>
            <Input
              id="new-group-name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Введите название группы"
            />
          </div>

          {/* Копирование студентов */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Студенты
              </CardTitle>
              <CardDescription>
                Выберите, как копировать студентов из исходной группы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={studentsCopyOption}
                onValueChange={(value) => setStudentsCopyOption(value as StudentCopyOption)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="students-none" />
                  <Label htmlFor="students-none" className="font-normal cursor-pointer">
                    Не копировать студентов
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="students-active" />
                  <Label htmlFor="students-active" className="font-normal cursor-pointer">
                    Копировать как активных студентов
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="as_leads" id="students-leads" />
                  <Label htmlFor="students-leads" className="font-normal cursor-pointer">
                    Копировать как лидов (предзапись)
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Копирование расписания */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Расписание
              </CardTitle>
              <CardDescription>
                Расписание не будет скопировано. Вы сможете настроить его позже.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCopying}
          >
            Отмена
          </Button>
          <Button
            onClick={handleCopy}
            disabled={isCopying || !newGroupName.trim()}
          >
            {isCopying ? 'Копирование...' : 'Создать копию'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
