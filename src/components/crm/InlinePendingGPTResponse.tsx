import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Edit3, Send, X } from 'lucide-react';
import { PendingGPTResponse, useApprovePendingResponse, useDismissPendingResponse } from '@/hooks/usePendingGPTResponses';

interface InlinePendingGPTResponseProps {
  response: PendingGPTResponse;
  onUse: (text: string) => void;
}

export const InlinePendingGPTResponse: React.FC<InlinePendingGPTResponseProps> = ({ response, onUse }) => {
  const approveMutation = useApprovePendingResponse();
  const dismissMutation = useDismissPendingResponse();

  const handleApprove = () => {
    approveMutation.mutate({ responseId: response.id });
  };

  const handleDismiss = () => {
    dismissMutation.mutate(response.id);
  };

  const handleUseForEditing = () => {
    onUse(response.suggested_response);
    dismissMutation.mutate(response.id);
  };

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
            onClick={handleUseForEditing}
            className="h-8 w-8 p-0"
            title="Редактировать"
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
            onClick={handleDismiss}
            disabled={dismissMutation.isPending}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            title="Скрыть"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};