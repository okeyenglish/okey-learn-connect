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
    <div className="group relative mb-3 bg-gradient-to-r from-primary/5 to-background border border-border/50 rounded-lg p-3">
      {/* Header с минимальной информацией */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="h-3 w-3 text-primary" />
          <span className="text-xs">GPT предложение</span>
          <Badge variant="secondary" className="text-xs px-1 py-0">
            {timeAgo}
          </Badge>
        </div>
        
        {/* Кнопки действий - показываются при hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-6 w-6 p-0 hover:bg-muted"
            title="Редактировать"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            className="h-6 px-2 text-xs"
            size="sm"
            title="Отправить"
          >
            <CheckCircle className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleReject}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            className="h-6 w-6 p-0 hover:bg-destructive/10 text-destructive"
            size="sm"
            title="Отклонить"
          >
            <XCircle className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Контент сообщения */}
      <div className="space-y-2">
        {/* Context Messages - компактно */}
        {response.messages_context && response.messages_context.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Контекст ({response.messages_context.length} сообщений)
            </summary>
            <div className="mt-2 space-y-1 pl-3 border-l-2 border-border">
              {response.messages_context.map((msg: any, index: number) => (
                <div key={index} className="text-xs text-muted-foreground">
                  <span className="font-medium">Клиент:</span> {msg.message_text}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Предложенный ответ */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              placeholder="Отредактируйте ответ..."
            />
            <div className="flex gap-1">
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                size="sm"
                className="h-6 px-2 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {approveMutation.isPending ? 'Отправка...' : 'Отправить'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCustomMessage(response.suggested_response);
                  setIsEditing(false);
                }}
                size="sm"
                className="h-6 px-2 text-xs"
              >
                Отменить
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-2 bg-muted/30 rounded text-sm leading-relaxed">
            <p className="whitespace-pre-wrap">{customMessage}</p>
          </div>
        )}
        
        {/* Индикатор изменений */}
        {isEditing && customMessage !== response.suggested_response && (
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            Изменено
          </Badge>
        )}
      </div>
    </div>
  );
};