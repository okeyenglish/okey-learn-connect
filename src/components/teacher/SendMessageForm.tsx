import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';
import { useTeacherMessages, CreateTeacherMessageData } from '@/hooks/useTeacherMessages';

interface SendMessageFormProps {
  messageType: 'group' | 'individual';
  targetGroupId?: string;
  targetStudentId?: string;
  targetStudentName?: string;
  branch: string;
  groupName?: string;
}

export const SendMessageForm = ({
  messageType,
  targetGroupId,
  targetStudentId,
  targetStudentName,
  branch,
  groupName,
}: SendMessageFormProps) => {
  const [message, setMessage] = useState('');
  const { createMessage, isCreating } = useTeacherMessages();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    const messageData: CreateTeacherMessageData = {
      message_text: message.trim(),
      message_type: messageType,
      branch,
    };

    if (messageType === 'group' && targetGroupId) {
      messageData.target_group_id = targetGroupId;
    } else if (messageType === 'individual' && targetStudentId) {
      messageData.target_student_id = targetStudentId;
      messageData.target_student_name = targetStudentName;
    }

    createMessage(messageData);
    setMessage('');
  };

  const targetName = messageType === 'group' 
    ? `группе "${groupName}"` 
    : `студенту ${targetStudentName}`;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4" />
        <h3 className="font-medium">Отправить сообщение {targetName}</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="message">Текст сообщения</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Введите сообщение для отправки студентам..."
            rows={4}
            maxLength={1000}
          />
          <div className="text-xs text-muted-foreground text-right">
            {message.length}/1000 символов
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Важно:</strong> Ваше сообщение будет отправлено на модерацию менеджерам. 
            После одобрения оно будет отправлено студентам через WhatsApp.
          </p>
        </div>

        <Button 
          type="submit" 
          disabled={!message.trim() || isCreating}
          className="w-full"
        >
          {isCreating ? (
            'Отправляется...'
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Отправить на модерацию
            </>
          )}
        </Button>
      </form>
    </div>
  );
};