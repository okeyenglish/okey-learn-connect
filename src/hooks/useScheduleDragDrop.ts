import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUpdateLessonSession } from '@/hooks/useLessonSessions';
import { format } from 'date-fns';

export interface DraggedSession {
  id: string;
  sessionData: any;
  sourceTeacher?: string;
  sourceClassroom?: string;
  sourceDate?: string;
  sourceTime?: string;
}

export const useScheduleDragDrop = () => {
  const [draggedSession, setDraggedSession] = useState<DraggedSession | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const updateSession = useUpdateLessonSession();

  const handleDragStart = (
    sessionId: string, 
    sessionData: any,
    source: {
      teacher?: string;
      classroom?: string;
      date?: string;
      time?: string;
    }
  ) => {
    setDraggedSession({
      id: sessionId,
      sessionData,
      sourceTeacher: source.teacher,
      sourceClassroom: source.classroom,
      sourceDate: source.date,
      sourceTime: source.time,
    });
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedSession(null);
    setIsDragging(false);
  };

  const handleDrop = async (
    target: {
      teacher?: string;
      classroom?: string;
      date?: Date;
      time?: string;
    }
  ) => {
    if (!draggedSession) return;

    try {
      const updates: any = {};
      
      // Update teacher if dropped on different teacher
      if (target.teacher && target.teacher !== draggedSession.sourceTeacher) {
        updates.teacher_name = target.teacher;
      }

      // Update classroom if dropped on different classroom
      if (target.classroom && target.classroom !== draggedSession.sourceClassroom) {
        updates.classroom = target.classroom;
      }

      // Update date if dropped on different date
      if (target.date) {
        const newDate = format(target.date, 'yyyy-MM-dd');
        if (newDate !== draggedSession.sourceDate) {
          updates.lesson_date = newDate;
        }
      }

      // Update time if dropped on different time slot
      if (target.time && target.time !== draggedSession.sourceTime) {
        updates.start_time = target.time;
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await updateSession.mutateAsync({
          id: draggedSession.id,
          data: updates,
        });

        const changes = [];
        if (updates.teacher_name) changes.push(`Преподаватель: ${updates.teacher_name}`);
        if (updates.classroom) changes.push(`Аудитория: ${updates.classroom}`);
        if (updates.lesson_date) changes.push(`Дата: ${updates.lesson_date}`);
        if (updates.start_time) changes.push(`Время: ${updates.start_time}`);

        toast({
          title: 'Занятие перенесено',
          description: `Обновлено: ${changes.join(', ')}`,
        });
      }
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось перенести занятие',
        variant: 'destructive',
      });
    } finally {
      handleDragEnd();
    }
  };

  return {
    draggedSession,
    isDragging,
    handleDragStart,
    handleDragEnd,
    handleDrop,
  };
};