import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MessageSquare, User, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TeacherMessage, useTeacherMessages } from '@/hooks/useTeacherMessages';

interface TeacherMessageModerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: TeacherMessage | null;
}

export const TeacherMessageModerationModal = ({ 
  open, 
  onOpenChange, 
  message 
}: TeacherMessageModerationModalProps) => {
  const [moderationNotes, setModerationNotes] = useState('');
  const { moderateMessage, isModerating } = useTeacherMessages();

  if (!message) return null;

  const handleApprove = () => {
    moderateMessage({
      messageId: message.id,
      status: 'approved',
      moderationNotes: moderationNotes.trim() || undefined,
    });
    onOpenChange(false);
    setModerationNotes('');
  };

  const handleReject = () => {
    moderateMessage({
      messageId: message.id,
      status: 'rejected',
      moderationNotes: moderationNotes.trim() || undefined,
    });
    onOpenChange(false);
    setModerationNotes('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'На модерации';
      case 'approved': return 'Одобрено';
      case 'rejected': return 'Отклонено';
      case 'sent': return 'Отправлено';
      default: return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Модерация сообщения преподавателя
          </DialogTitle>
          <DialogDescription>
            Проверьте сообщение и решите, отправлять ли его студентам
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информация о сообщении */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">{message.teacher_name}</span>
              </div>
              <Badge className={getStatusColor(message.status)}>
                {getStatusText(message.status)}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(message.created_at), 'dd.MM.yyyy в HH:mm', { locale: ru })}
              </div>
              <div className="flex items-center gap-1">
                {message.message_type === 'group' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {message.message_type === 'group' ? 'Групповое' : 'Индивидуальное'}
              </div>
            </div>

            {message.target_student_name && (
              <div className="text-sm">
                <span className="text-muted-foreground">Получатель: </span>
                <span className="font-medium">{message.target_student_name}</span>
              </div>
            )}

            <div className="text-sm">
              <span className="text-muted-foreground">Филиал: </span>
              <span>{message.branch}</span>
            </div>
          </div>

          {/* Текст сообщения */}
          <div className="space-y-2">
            <Label>Текст сообщения:</Label>
            <div className="bg-background border rounded-lg p-3 min-h-[100px] whitespace-pre-wrap">
              {message.message_text}
            </div>
          </div>

          {/* Поле для заметок модератора */}
          <div className="space-y-2">
            <Label htmlFor="moderation-notes">
              Заметки модератора (необязательно)
            </Label>
            <Textarea
              id="moderation-notes"
              value={moderationNotes}
              onChange={(e) => setModerationNotes(e.target.value)}
              placeholder="Добавьте комментарий к решению..."
              rows={3}
            />
          </div>

          {/* Кнопки действий */}
          {message.status === 'pending' && (
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                onClick={handleApprove}
                disabled={isModerating}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Одобрить и отправить
              </Button>
              <Button
                onClick={handleReject}
                disabled={isModerating}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Отклонить
              </Button>
            </div>
          )}

          {/* Информация о модерации */}
          {message.status !== 'pending' && message.moderated_at && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <div className="font-medium mb-1">
                Результат модерации:
              </div>
              <div className="text-muted-foreground">
                {format(new Date(message.moderated_at), 'dd.MM.yyyy в HH:mm', { locale: ru })}
              </div>
              {message.moderation_notes && (
                <div className="mt-2">
                  <span className="font-medium">Комментарий: </span>
                  {message.moderation_notes}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};