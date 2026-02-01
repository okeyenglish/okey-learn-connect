import { Button } from '@/components/ui/button';
import { useQuickReplies, useTrackQuickReplyUsage } from '@/hooks/useManagerQuickReplies';
import { Loader2 } from 'lucide-react';

interface QuickReplySuggestionsProps {
  category: 'activity_warning' | 'tab_feedback';
  onSelectReply: (text: string) => void;
  disabled?: boolean;
}

export function QuickReplySuggestions({ 
  category, 
  onSelectReply,
  disabled = false 
}: QuickReplySuggestionsProps) {
  const { data: replies = [], isLoading } = useQuickReplies(category);
  const trackUsage = useTrackQuickReplyUsage();

  const handleSelect = (replyId: string, text: string) => {
    // Track usage (fire and forget)
    trackUsage.mutate(replyId);
    onSelectReply(text);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 py-2 border-t bg-muted/30">
      {replies.map((reply) => (
        <Button
          key={reply.id}
          variant="outline"
          size="sm"
          className="h-7 text-xs rounded-full"
          onClick={() => handleSelect(reply.id, reply.text)}
          disabled={disabled}
        >
          {reply.text}
        </Button>
      ))}
    </div>
  );
}
