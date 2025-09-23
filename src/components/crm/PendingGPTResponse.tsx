import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Edit3, Bot } from 'lucide-react';
import { PendingGPTResponse, useApprovePendingResponse, useRejectPendingResponse } from '@/hooks/usePendingGPTResponses';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PendingGPTResponseProps {
  response: PendingGPTResponse;
}

export const PendingGPTResponseComponent: React.FC<PendingGPTResponseProps> = ({ response }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customMessage, setCustomMessage] = useState(response.suggested_response);

  const approveMutation = useApprovePendingResponse();
  const rejectMutation = useRejectPendingResponse();

  const handleApprove = () => {
    const messageToSend = isEditing && customMessage !== response.suggested_response 
      ? customMessage 
      : undefined;
    
    approveMutation.mutate({ 
      responseId: response.id, 
      customMessage: messageToSend 
    });
  };

  const handleReject = () => {
    rejectMutation.mutate(response.id);
  };

  const timeAgo = formatDistanceToNow(new Date(response.created_at), { 
    addSuffix: true, 
    locale: ru 
  });

  return (
    <div className="group relative mb-2 bg-gradient-to-r from-primary/3 to-background/50 border border-border/30 rounded-md p-2">
      {/* Компактный заголовок */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Bot className="h-3 w-3 text-primary" />
          <span className="text-[10px]">GPT</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
            {timeAgo}
          </Badge>
        </div>
        
        {/* Компактные кнопки - показываются при hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-5 w-5 p-0 hover:bg-muted"
            title="Редактировать"
          >
            <Edit3 className="h-2.5 w-2.5" />
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            className="h-5 px-1.5 text-[9px] bg-primary hover:bg-primary/90"
            size="sm"
            title="Отправить"
          >
            <CheckCircle className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleReject}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            className="h-5 w-5 p-0 hover:bg-destructive/10 text-destructive"
            size="sm"
            title="Отклонить"
          >
            <XCircle className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
      
      {/* Контент - максимально компактный */}
      <div className="mt-1">
        {/* Context - свернутый */}
        {response.messages_context && response.messages_context.length > 0 && (
          <details className="text-[10px] mb-1">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Контекст ({response.messages_context.length})
            </summary>
          </details>
        )}

        {/* Ответ */}
        {isEditing ? (
          <div className="space-y-1">
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[40px] text-xs resize-none p-1.5"
              placeholder="Отредактируйте ответ..."
            />
            <div className="flex gap-0.5">
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                size="sm"
                className="h-5 px-1.5 text-[9px]"
              >
                {approveMutation.isPending ? 'Отправка...' : 'Отправить'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCustomMessage(response.suggested_response);
                  setIsEditing(false);
                }}
                size="sm"
                className="h-5 px-1.5 text-[9px]"
              >
                Отменить
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-1.5 bg-muted/20 rounded text-xs leading-relaxed border border-border/20">
            <p className="whitespace-pre-wrap line-clamp-3">{customMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};