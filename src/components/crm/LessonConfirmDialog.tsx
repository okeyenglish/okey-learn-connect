import React, { useState } from 'react';
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
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, ArrowRightLeft, Calendar as CalendarIcon, Copy } from 'lucide-react';

export type ConfirmActionType = 'status' | 'move' | 'copy';

interface LessonConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: ConfirmActionType;
  lessonName?: string;
  newStatus?: string;
  targetDate?: string;
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
          <AlertDialogDescription>
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Подтвердить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Date picker dialog for copying lessons
interface CopyLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonName?: string;
  onCopy: (date: Date) => void;
}

export const CopyLessonDialog: React.FC<CopyLessonDialogProps> = ({
  open,
  onOpenChange,
  lessonName,
  onCopy,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleCopy = () => {
    if (selectedDate) {
      onCopy(selectedDate);
      setSelectedDate(undefined);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      onOpenChange(value);
      if (!value) setSelectedDate(undefined);
    }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-primary" />
            Копировать занятие
          </DialogTitle>
          <DialogDescription>
            {lessonName ? `Выберите дату для копии «${lessonName}»` : 'Выберите дату для копии занятия'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center py-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ru}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            className={cn("p-3 pointer-events-auto border rounded-lg")}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleCopy} disabled={!selectedDate}>
            <Copy className="h-4 w-4 mr-2" />
            Копировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LessonConfirmDialog;
