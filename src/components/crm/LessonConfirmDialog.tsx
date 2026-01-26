import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, ArrowRightLeft, Calendar as CalendarIcon, Copy, AlertTriangle, Clock } from 'lucide-react';

export type ConfirmActionType = 'status' | 'move' | 'copy';

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingLessons: Array<{
    id: string;
    group_name: string | null;
    start_time: string | null;
    end_time: string | null;
  }>;
}

interface LessonConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: ConfirmActionType;
  lessonName?: string;
  newStatus?: string;
  targetDate?: string;
  conflict?: ConflictInfo;
  onConfirm: () => void;
}

const statusLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  completed: { label: 'Провести', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
  cancelled: { label: 'Отменить', icon: <XCircle className="h-4 w-4" />, color: 'text-red-600' },
  rescheduled: { label: 'Перенести', icon: <ArrowRightLeft className="h-4 w-4" />, color: 'text-yellow-600' },
  scheduled: { label: 'Вернуть в план', icon: <CalendarIcon className="h-4 w-4" />, color: 'text-blue-600' },
};

export const LessonConfirmDialog: React.FC<LessonConfirmDialogProps> = ({
  open,
  onOpenChange,
  actionType,
  lessonName,
  newStatus,
  targetDate,
  conflict,
  onConfirm,
}) => {
  const getTitle = () => {
    if (actionType === 'status' && newStatus) {
      const status = statusLabels[newStatus];
      return `${status?.label || 'Изменить статус'} занятие?`;
    }
    if (actionType === 'move') {
      return 'Перенести занятие?';
    }
    if (actionType === 'copy') {
      return 'Копировать занятие?';
    }
    return 'Подтвердите действие';
  };

  const getDescription = () => {
    const lessonText = lessonName ? `«${lessonName}»` : 'это занятие';
    
    if (actionType === 'status' && newStatus) {
      const statusLabel = statusLabels[newStatus]?.label.toLowerCase() || 'изменить статус';
      return `Вы уверены, что хотите ${statusLabel} ${lessonText}?`;
    }
    if (actionType === 'move' && targetDate) {
      return `Вы уверены, что хотите перенести ${lessonText} на ${format(new Date(targetDate), 'd MMMM yyyy', { locale: ru })}?`;
    }
    if (actionType === 'copy' && targetDate) {
      return `Занятие ${lessonText} будет скопировано на ${format(new Date(targetDate), 'd MMMM yyyy', { locale: ru })}.`;
    }
    return `Вы уверены, что хотите выполнить это действие для ${lessonText}?`;
  };

  const getIcon = () => {
    if (actionType === 'status' && newStatus) {
      return statusLabels[newStatus]?.icon;
    }
    if (actionType === 'move') {
      return <ArrowRightLeft className="h-4 w-4" />;
    }
    if (actionType === 'copy') {
      return <Copy className="h-4 w-4" />;
    }
    return null;
  };

  const getColor = () => {
    if (actionType === 'status' && newStatus) {
      return statusLabels[newStatus]?.color || '';
    }
    if (actionType === 'copy') {
      return 'text-primary';
    }
    return 'text-primary';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={cn("flex items-center gap-2", getColor())}>
            {getIcon()}
            {getTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{getDescription()}</p>
              
              {/* Conflict Warning */}
              {conflict?.hasConflict && (actionType === 'move' || actionType === 'copy') && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        На эту дату уже есть занятия
                      </p>
                      <div className="mt-2 space-y-1">
                        {conflict.conflictingLessons.map((lesson, idx) => (
                          <div key={lesson.id || idx} className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
                            <Clock className="h-3 w-3" />
                            <span>
                              {lesson.start_time?.slice(0, 5)}
                              {lesson.end_time && ` - ${lesson.end_time.slice(0, 5)}`}
                            </span>
                            {lesson.group_name && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-yellow-100 dark:bg-yellow-900/50 border-yellow-300">
                                {lesson.group_name}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                        Вы можете продолжить, но обратите внимание на возможное пересечение времени.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={conflict?.hasConflict ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
          >
            {conflict?.hasConflict ? 'Продолжить всё равно' : 'Подтвердить'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Date picker dialog for copying lessons with conflict detection
interface CopyLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonName?: string;
  lessonTime?: string;
  existingLessons?: Array<{
    id: string;
    lesson_date: string;
    start_time: string | null;
    end_time: string | null;
    group_name: string | null;
  }>;
  onCopy: (date: Date, hasConflict: boolean, conflictingLessons: ConflictInfo['conflictingLessons']) => void;
}

export const CopyLessonDialog: React.FC<CopyLessonDialogProps> = ({
  open,
  onOpenChange,
  lessonName,
  lessonTime,
  existingLessons = [],
  onCopy,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [conflictsOnDate, setConflictsOnDate] = useState<ConflictInfo['conflictingLessons']>([]);

  // Check for conflicts when date changes
  useEffect(() => {
    if (!selectedDate) {
      setConflictsOnDate([]);
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const lessonsOnDate = existingLessons.filter(l => l.lesson_date === dateStr);
    setConflictsOnDate(lessonsOnDate.map(l => ({
      id: l.id,
      group_name: l.group_name,
      start_time: l.start_time,
      end_time: l.end_time,
    })));
  }, [selectedDate, existingLessons]);

  const handleCopy = () => {
    if (selectedDate) {
      onCopy(selectedDate, conflictsOnDate.length > 0, conflictsOnDate);
      setSelectedDate(undefined);
      onOpenChange(false);
    }
  };

  // Get dates that have lessons for visual indication
  const datesWithLessons = existingLessons.reduce((acc, lesson) => {
    acc[lesson.lesson_date] = true;
    return acc;
  }, {} as Record<string, boolean>);

  return (
    <Dialog open={open} onOpenChange={(value) => {
      onOpenChange(value);
      if (!value) {
        setSelectedDate(undefined);
        setConflictsOnDate([]);
      }
    }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-primary" />
            Копировать занятие
          </DialogTitle>
          <DialogDescription>
            {lessonName ? `Выберите дату для копии «${lessonName}»` : 'Выберите дату для копии занятия'}
            {lessonTime && (
              <span className="block text-xs mt-1">
                Время занятия: <strong>{lessonTime}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center py-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ru}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            modifiers={{
              hasLessons: (date) => datesWithLessons[format(date, 'yyyy-MM-dd')] || false,
            }}
            modifiersStyles={{
              hasLessons: {
                backgroundColor: 'hsl(var(--primary) / 0.1)',
                fontWeight: 'bold',
              },
            }}
            className={cn("p-3 pointer-events-auto border rounded-lg")}
          />
        </div>

        {/* Conflict warning */}
        {conflictsOnDate.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800 p-3 mx-1">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  На эту дату уже есть занятия:
                </p>
                <div className="mt-1.5 space-y-1">
                  {conflictsOnDate.map((lesson, idx) => (
                    <div key={lesson.id || idx} className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
                      <Clock className="h-3 w-3" />
                      <span>
                        {lesson.start_time?.slice(0, 5)}
                        {lesson.end_time && ` - ${lesson.end_time.slice(0, 5)}`}
                      </span>
                      {lesson.group_name && (
                        <span className="truncate">{lesson.group_name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary/10 border border-primary/20" />
            <span>Есть занятия</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleCopy} 
            disabled={!selectedDate}
            variant={conflictsOnDate.length > 0 ? 'default' : 'default'}
            className={conflictsOnDate.length > 0 ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
          >
            <Copy className="h-4 w-4 mr-2" />
            {conflictsOnDate.length > 0 ? 'Копировать всё равно' : 'Копировать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LessonConfirmDialog;
