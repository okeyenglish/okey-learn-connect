import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { XCircle } from 'lucide-react';
import { useCancelLesson } from '@/hooks/useIndividualLessonAttendance';

interface CancelLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    lesson_date: string;
  };
}

export function CancelLessonModal({ open, onOpenChange, session }: CancelLessonModalProps) {
  const [reason, setReason] = useState('');

  const cancelLesson = useCancelLesson();

  const handleCancel = async () => {
    await cancelLesson.mutateAsync({
      sessionId: session.id,
      reason: reason || 'Не указана',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Отмена занятия
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Дата: {new Date(session.lesson_date).toLocaleDateString('ru-RU')}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Причина отмены</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину отмены занятия..."
              rows={4}
            />
          </div>

          <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
            <p className="text-sm text-red-900 dark:text-red-100">
              ⚠️ Отмененное занятие будет помечено и не будет учитываться в оплате.
              Это действие можно отменить, изменив статус посещаемости.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Назад
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancel} 
              disabled={cancelLesson.isPending}
            >
              {cancelLesson.isPending ? 'Отмена...' : 'Отменить занятие'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
