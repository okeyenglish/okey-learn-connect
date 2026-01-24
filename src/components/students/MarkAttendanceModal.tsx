import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, X, Clock, UserX } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { supabase } from '@/integrations/supabase/typedClient';

interface Student {
  id: string;
  name: string;
}

interface MarkAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonDate: Date;
  lessonId: string;
  sessionType: 'group' | 'individual';
  onMarked?: () => void;
}

export function MarkAttendanceModal({
  open,
  onOpenChange,
  lessonDate,
  lessonId,
  sessionType,
  onMarked,
}: MarkAttendanceModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: string; notes: string }>>({});

  const { attendance, markAttendance, isMarking } = useAttendance(sessionId, sessionType);

  useEffect(() => {
    if (open && lessonDate && lessonId) {
      loadSessionAndStudents();
    }
  }, [open, lessonDate, lessonId, sessionType]);

  useEffect(() => {
    if (attendance && students.length > 0) {
      const initialData: Record<string, { status: string; notes: string }> = {};
      students.forEach(student => {
        const existing = attendance.find(a => a.studentId === student.id);
        initialData[student.id] = {
          status: existing?.status || 'present',
          notes: existing?.notes || '',
        };
      });
      setAttendanceData(initialData);
    } else if (students.length > 0) {
      const initialData: Record<string, { status: string; notes: string }> = {};
      students.forEach(student => {
        initialData[student.id] = { status: 'present', notes: '' };
      });
      setAttendanceData(initialData);
    }
  }, [attendance, students]);

  const loadSessionAndStudents = async () => {
    const dateStr = format(lessonDate, 'yyyy-MM-dd');

    if (sessionType === 'individual') {
      // Get individual lesson session
      const { data: session } = await supabase
        .from('individual_lesson_sessions')
        .select('id')
        .eq('individual_lesson_id', lessonId)
        .eq('lesson_date', dateStr)
        .maybeSingle();

      if (session) {
        setSessionId(session.id);
      } else {
        // Create session if doesn't exist
        const { data: { user } } = await supabase.auth.getUser();
        const { data: newSession } = await supabase
          .from('individual_lesson_sessions')
          .insert({
            individual_lesson_id: lessonId,
            lesson_date: dateStr,
            status: 'scheduled',
            created_by: user?.id,
          })
          .select('id')
          .single();

        if (newSession) {
          setSessionId(newSession.id);
        }
      }

      // Get student
      const { data: lesson } = await supabase
        .from('individual_lessons')
        .select('student_id, students:student_id(id, name)')
        .eq('id', lessonId)
        .single();

      if (lesson?.students) {
        setStudents([{
          id: (lesson.students as any).id,
          name: (lesson.students as any).name,
        }]);
      }
    } else {
      // Get group lesson session
      const { data: session } = await supabase
        .from('lesson_sessions')
        .select('id')
        .eq('group_id', lessonId)
        .eq('lesson_date', dateStr)
        .maybeSingle();

      if (session) {
        setSessionId(session.id);
      }

      // Get students in group
      const { data: groupStudents } = await supabase
        .from('group_students')
        .select('student_id, students:student_id(id, name)')
        .eq('group_id', lessonId)
        .eq('status', 'active');

      if (groupStudents) {
        setStudents(groupStudents.map(gs => ({
          id: (gs.students as any).id,
          name: (gs.students as any).name,
        })));
      }
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  };

  const handleSave = () => {
    const records = Object.entries(attendanceData).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      notes: data.notes,
    }));

    markAttendance(records, {
      onSuccess: () => {
        onMarked?.();
        onOpenChange(false);
      },
    });
  };

  const statusOptions = [
    { value: 'present', label: 'Присутствовал', icon: Check, color: 'bg-green-500' },
    { value: 'absent', label: 'Отсутствовал', icon: X, color: 'bg-red-500' },
    { value: 'late', label: 'Опоздал', icon: Clock, color: 'bg-yellow-500' },
    { value: 'excused', label: 'Уважительная причина', icon: UserX, color: 'bg-blue-500' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Отметить посещаемость</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(lessonDate, 'dd MMMM yyyy', { locale: ru })}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {students.map(student => (
              <div key={student.id} className="border rounded-lg p-4 space-y-3">
                <div className="font-medium">{student.name}</div>
                
                <div className="flex gap-2 flex-wrap">
                  {statusOptions.map(option => {
                    const Icon = option.icon;
                    const isSelected = attendanceData[student.id]?.status === option.value;
                    
                    return (
                      <Button
                        key={option.value}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange(student.id, option.value)}
                        className={isSelected ? option.color : ''}
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>

                <Textarea
                  placeholder="Примечания (необязательно)"
                  value={attendanceData[student.id]?.notes || ''}
                  onChange={(e) => handleNotesChange(student.id, e.target.value)}
                  className="text-sm"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isMarking}>
            {isMarking ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
