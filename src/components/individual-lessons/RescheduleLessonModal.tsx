import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { useRescheduleLesson } from '@/hooks/useIndividualLessonAttendance';

interface RescheduleLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    lesson_date: string;
    duration?: number;
  };
}

export function RescheduleLessonModal({ open, onOpenChange, session }: RescheduleLessonModalProps) {
  const [newDate, setNewDate] = useState('');
  const [newDuration, setNewDuration] = useState(session.duration || 60);

  const rescheduleLesson = useRescheduleLesson();

  const handleReschedule = async () => {
    if (!newDate) return;

    await rescheduleLesson.mutateAsync({
      sessionId: session.id,
      newDate,
      newDuration,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Перенос занятия
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Текущая дата: {new Date(session.lesson_date).toLocaleDateString('ru-RU')}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-date">Новая дата *</Label>
            <Input
              id="new-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Продолжительность (минуты)</Label>
            <Input
              id="duration"
              type="number"
              value={newDuration}
              onChange={(e) => setNewDuration(parseInt(e.target.value))}
              min={30}
              max={180}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              При переносе старое занятие будет помечено как "Перенесено", 
              а на новую дату будет создано новое занятие.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleReschedule} 
              disabled={!newDate || rescheduleLesson.isPending}
            >
              {rescheduleLesson.isPending ? 'Перенос...' : 'Перенести'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
