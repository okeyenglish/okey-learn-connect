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
    <div className="group relative bg-primary/3 border border-primary/15 rounded-md p-2 mx-4 my-1">
      {/* Компактный заголовок */}
      <div className="flex items-center gap-1.5 mb-1">
        <Bot className="h-3 w-3 text-primary" />
        <span className="text-xs font-medium text-primary">GPT</span>
      </div>
      
      {/* Текст */}
      <p className="text-xs text-foreground whitespace-pre-wrap leading-tight pr-16">
        {response.suggested_response}
      </p>
      
      {/* Кнопки поверх текста при hover */}
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded px-1 py-0.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleUseForEditing}
          className="h-4 w-4 p-0 hover:bg-muted"
          title="Редактировать"
        >
          <Edit3 className="h-2.5 w-2.5" />
        </Button>
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={approveMutation.isPending}
          className="h-4 px-1 text-[8px] bg-primary hover:bg-primary/90"
        >
          <Send className="h-2.5 w-2.5 mr-0.5" />
          {approveMutation.isPending ? '...' : 'Отправить'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          disabled={dismissMutation.isPending}
          className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
          title="Скрыть"
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
};