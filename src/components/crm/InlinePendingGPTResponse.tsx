import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Edit3, Send, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { PendingGPTResponse, useApprovePendingResponse, useDismissPendingResponse } from '@/hooks/usePendingGPTResponses';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface InlinePendingGPTResponseProps {
  response: PendingGPTResponse;
  onUse: (text: string) => void;
}

export const InlinePendingGPTResponse: React.FC<InlinePendingGPTResponseProps> = ({ response, onUse }) => {
  const approveMutation = useApprovePendingResponse();
  const dismissMutation = useDismissPendingResponse();
  const { user } = useAuth();
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null);

  const handleApprove = () => {
    approveMutation.mutate({ responseId: response.id });
  };

  const handleDismiss = () => {
    dismissMutation.mutate(response.id);
  };

  const handleUseForEditing = () => {
    onUse(response.suggested_response);
    // Track as "edited" feedback — this triggers learning from edits
    saveFeedback('edited', response.suggested_response);
    dismissMutation.mutate(response.id);
  };

  const saveFeedback = async (feedback: 'used' | 'rejected' | 'edited', originalText?: string) => {
    if (feedbackGiven || !user) return;
    setFeedbackGiven(feedback);
    try {
      await supabase.from('ai_response_feedback').insert({
        user_id: user.id,
        client_id: response.client_id,
        response_text: response.suggested_response,
        feedback,
        pending_response_id: response.id,
      });
    } catch (err) {
      console.error('Failed to save AI feedback:', err);
    }
  };

  const handleFeedback = async (feedback: 'used' | 'rejected') => {
    await saveFeedback(feedback);
  };

  return (
    <div className="group relative bg-primary/3 border border-primary/15 rounded-md p-2 mx-4 my-1">
      {/* Компактный заголовок */}
      <div className="flex items-center gap-1.5 mb-1">
        <Bot className="h-3 w-3 text-primary" />
        <span className="text-xs font-medium text-primary">GPT</span>
        {/* Feedback buttons inline */}
        {!feedbackGiven ? (
          <div className="ml-auto flex gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleFeedback('used')}
              className="h-4 w-4 p-0 text-muted-foreground hover:text-green-600"
              title="Помогло"
            >
              <ThumbsUp className="h-2.5 w-2.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleFeedback('rejected')}
              className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
              title="Не подошло"
            >
              <ThumbsDown className="h-2.5 w-2.5" />
            </Button>
          </div>
        ) : (
          <span className="ml-auto text-[9px] text-muted-foreground">
            {feedbackGiven === 'used' ? '✓ Помогло' : feedbackGiven === 'edited' ? '✏️ Редактирован' : '✗ Не подошло'}
          </span>
        )}
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
