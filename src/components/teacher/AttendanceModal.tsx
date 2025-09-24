import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, UserX, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface AttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  groupId?: string;
  sessionDate: string;
  sessionTime: string;
}

interface StudentAttendance {
  studentId: string;
  name: string;
  fullName: string;
  isPresent: boolean;
  isLate: boolean;
  notes: string;
}

export const AttendanceModal = ({ 
  open, 
  onOpenChange, 
  sessionId, 
  groupId,
  sessionDate,
  sessionTime
}: AttendanceModalProps) => {
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Получаем студентов группы или занятия
  const { data: students, isLoading } = useQuery({
    queryKey: ['session_students', sessionId, groupId],
    queryFn: async () => {
      if (groupId) {
        // Получаем студентов группы
        const { data: sessionIds, error: sessionError } = await supabase
          .from('lesson_sessions')
          .select('id')
          .eq('group_id', groupId);

        if (sessionError) throw sessionError;
        
        if (!sessionIds || sessionIds.length === 0) return [];

        const { data, error } = await supabase
          .from('student_lesson_sessions')
          .select(`
            students!student_lesson_sessions_student_id_fkey (
              id,
              name,
              first_name,
              last_name
            )
          `)
          .in('lesson_session_id', sessionIds.map(s => s.id));

        if (error) throw error;
        
        // Убираем дубликаты
        const uniqueStudents = data?.reduce((acc: any[], item: any) => {
          const student = item.students;
          if (student && !acc.find(s => s.id === student.id)) {
            acc.push(student);
          }
          return acc;
        }, []);

        return uniqueStudents || [];
      } else {
        // Получаем студентов конкретного занятия
        const { data, error } = await supabase
          .from('student_lesson_sessions')
          .select(`
            students!student_lesson_sessions_student_id_fkey (
              id,
              name,
              first_name,
              last_name
            )
          `)
          .eq('lesson_session_id', sessionId);

        if (error) throw error;
        return data?.map(item => item.students).filter(Boolean) || [];
      }
    },
    enabled: open && (!!sessionId || !!groupId),
  });

  // Инициализируем список присутствия при загрузке студентов
  useEffect(() => {
    if (students && students.length > 0) {
      const initialAttendance: StudentAttendance[] = students.map((student: any) => ({
        studentId: student.id,
        name: student.name,
        fullName: `${student.first_name} ${student.last_name}`,
        isPresent: true, // По умолчанию все присутствуют
        isLate: false,
        notes: '',
      }));
      setAttendance(initialAttendance);
    }
  }, [students]);

  const handleAttendanceChange = (studentId: string, field: 'isPresent' | 'isLate', value: boolean) => {
    setAttendance(prev => prev.map(student => 
      student.studentId === studentId 
        ? { ...student, [field]: value }
        : student
    ));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendance(prev => prev.map(student => 
      student.studentId === studentId 
        ? { ...student, notes }
        : student
    ));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Здесь будет логика сохранения посещаемости
      // Пока что просто показываем успешное сообщение
      const presentCount = attendance.filter(s => s.isPresent).length;
      const absentCount = attendance.filter(s => !s.isPresent).length;
      const lateCount = attendance.filter(s => s.isLate).length;
      
      toast({
        title: "Посещаемость сохранена",
        description: `Присутствовали: ${presentCount}, Отсутствовали: ${absentCount}, Опоздали: ${lateCount}`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить посещаемость",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const presentCount = attendance.filter(s => s.isPresent).length;
  const absentCount = attendance.filter(s => !s.isPresent).length;
  const lateCount = attendance.filter(s => s.isLate).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Отметить присутствие
          </DialogTitle>
          <DialogDescription>
            {format(new Date(sessionDate), 'EEEE, d MMMM yyyy', { locale: ru })} в {sessionTime}
          </DialogDescription>
        </DialogHeader>

        {/* Статистика */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            <span className="text-sm">Присутствуют: <strong>{presentCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-red-600" />
            <span className="text-sm">Отсутствуют: <strong>{absentCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm">Опоздали: <strong>{lateCount}</strong></span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">Загружаем список студентов...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {attendance.map((student) => (
              <div 
                key={student.studentId} 
                className={`p-4 border rounded-lg transition-colors ${
                  student.isPresent ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`present-${student.studentId}`}
                          checked={student.isPresent}
                          onCheckedChange={(checked) => 
                            handleAttendanceChange(student.studentId, 'isPresent', !!checked)
                          }
                        />
                        <Label 
                          htmlFor={`present-${student.studentId}`}
                          className="font-medium cursor-pointer"
                        >
                          {student.fullName}
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {student.isPresent && (
                          <>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`late-${student.studentId}`}
                                checked={student.isLate}
                                onCheckedChange={(checked) => 
                                  handleAttendanceChange(student.studentId, 'isLate', !!checked)
                                }
                              />
                              <Label 
                                htmlFor={`late-${student.studentId}`}
                                className="text-sm cursor-pointer"
                              >
                                Опоздал
                              </Label>
                            </div>
                          </>
                        )}
                        
                        <Badge variant={student.isPresent ? 'default' : 'destructive'}>
                          {student.isPresent ? 'Присутствует' : 'Отсутствует'}
                        </Badge>
                        
                        {student.isLate && (
                          <Badge variant="secondary">
                            Опоздал
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {student.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Быстрые действия */}
        <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">Быстрые действия:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAttendance(prev => prev.map(s => ({ ...s, isPresent: true, isLate: false })))}
          >
            Все присутствуют
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAttendance(prev => prev.map(s => ({ ...s, isPresent: false, isLate: false })))}
          >
            Все отсутствуют
          </Button>
        </div>

        {/* Кнопки */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : 'Сохранить посещаемость'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};