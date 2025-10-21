import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, DollarSign, Gift, Clock, AlertCircle } from 'lucide-react';
import { useGroupStudentsAttendance } from '@/hooks/useTeacherJournal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroupAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  sessionId: string;
  sessionDate: string;
}

type AttendanceStatus = 'present' | 'paid_absence' | 'unpaid_absence' | 'excused' | 'not_marked';

export const GroupAttendanceModal = ({ 
  open, 
  onOpenChange, 
  groupId, 
  sessionId,
  sessionDate 
}: GroupAttendanceModalProps) => {
  const { data: students, isLoading } = useGroupStudentsAttendance(groupId, sessionId);
  const [attendance, setAttendance] = useState<Record<string, { status: AttendanceStatus; notes?: string }>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveAttendance = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(attendance).map(([studentId, data]) => ({
        lesson_session_id: sessionId,
        student_id: studentId,
        attendance_status: data.status,
        notes: notes[studentId] || null,
      }));

      // Сначала удаляем существующие записи
      await supabase
        .from('student_lesson_sessions')
        .delete()
        .eq('lesson_session_id', sessionId);

      // Затем вставляем новые
      const { error } = await supabase
        .from('student_lesson_sessions')
        .insert(updates);

      if (error) throw error;

      // Обновляем статус сессии на completed
      await supabase
        .from('lesson_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-students-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-journal-groups'] });
      queryClient.invalidateQueries({ queryKey: ['lesson_sessions'] });
      toast({
        title: 'Посещаемость сохранена',
        description: 'Данные успешно обновлены',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error saving attendance:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить посещаемость',
        variant: 'destructive',
      });
    },
  });

  const toggleAttendance = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { status },
    }));
  };

  const getStatusButton = (studentId: string, status: AttendanceStatus, icon: any, label: string, variant: any) => {
    const isActive = attendance[studentId]?.status === status;
    const Icon = icon;
    
    return (
      <Button
        size="sm"
        variant={isActive ? 'default' : 'outline'}
        onClick={() => toggleAttendance(studentId, status)}
        className="flex-1"
      >
        <Icon className="h-4 w-4 mr-1" />
        {label}
      </Button>
    );
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="text-center py-8">Загрузка...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Отметка посещаемости</DialogTitle>
          <p className="text-sm text-muted-foreground">Занятие: {sessionDate}</p>
        </DialogHeader>

        <div className="space-y-4">
          {students?.map((student: any) => (
            <div key={student.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{student.name || `${student.first_name} ${student.last_name}`}</p>
                  {student.attendance_status && student.attendance_status !== 'not_marked' && (
                    <Badge variant="secondary" className="mt-1">
                      Текущий статус: {student.attendance_status}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {getStatusButton(student.id, 'present', Check, 'Был', 'default')}
                {getStatusButton(student.id, 'paid_absence', DollarSign, 'Оплач. пропуск', 'outline')}
                {getStatusButton(student.id, 'unpaid_absence', X, 'Пропуск', 'outline')}
                {getStatusButton(student.id, 'excused', Gift, 'Уважит.', 'outline')}
              </div>

              {attendance[student.id]?.status && attendance[student.id].status !== 'present' && (
                <Textarea
                  placeholder="Комментарий (опционально)"
                  value={notes[student.id] || ''}
                  onChange={(e) => setNotes(prev => ({ ...prev, [student.id]: e.target.value }))}
                  className="text-sm"
                  rows={2}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={() => saveAttendance.mutate()} 
            disabled={saveAttendance.isPending || Object.keys(attendance).length === 0}
          >
            {saveAttendance.isPending ? 'Сохранение...' : 'Сохранить посещаемость'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
