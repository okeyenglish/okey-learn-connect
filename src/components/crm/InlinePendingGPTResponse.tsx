import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Edit3, Send, X } from 'lucide-react';
import { PendingGPTResponse, useApprovePendingResponse, useRejectPendingResponse } from '@/hooks/usePendingGPTResponses';

interface InlinePendingGPTResponseProps {
  response: PendingGPTResponse;
}

export const InlinePendingGPTResponse: React.FC<InlinePendingGPTResponseProps> = ({ response }) => {
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

  if (isEditing) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mx-4 my-2">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Предложенный GPT ответ</span>
        </div>
        <Textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          className="min-h-[80px] mb-3 text-sm"
          placeholder="Отредактируйте ответ..."
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
            className="h-8 px-3 text-xs"
          >
            <Send className="h-3 w-3 mr-1" />
            {approveMutation.isPending ? 'Отправка...' : 'Отправить'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCustomMessage(response.suggested_response);
              setIsEditing(false);
            }}
            className="h-8 px-3 text-xs"
          >
            Отменить
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReject}
            disabled={rejectMutation.isPending}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mx-4 my-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Предложенный GPT ответ</span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {response.suggested_response}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8 p-0"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
            className="h-8 px-3 text-xs"
          >
            <Send className="h-3 w-3 mr-1" />
            {approveMutation.isPending ? '...' : 'Отправить'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReject}
            disabled={rejectMutation.isPending}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};