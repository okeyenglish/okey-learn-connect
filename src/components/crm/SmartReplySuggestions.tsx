import { Sparkles } from 'lucide-react';
import { useSmartRepliesWithStats, useTrackSmartReply } from '@/hooks/useSmartReplyStats';

interface SmartReplySuggestionsProps {
  lastIncomingMessage: string | null;
  isLastMessageIncoming: boolean;
  currentInput: string;
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function SmartReplySuggestions({
  lastIncomingMessage,
  isLastMessageIncoming,
  currentInput,
  onSend,
  disabled = false,
}: SmartReplySuggestionsProps) {
  const suggestions = useSmartRepliesWithStats(
    isLastMessageIncoming ? lastIncomingMessage : null,
  );
  const trackReply = useTrackSmartReply();

  if (suggestions.length === 0 || currentInput.trim()) return null;

  const handleClick = (text: string) => {
    if (lastIncomingMessage) {
      trackReply(text, lastIncomingMessage);
    }
    onSend(text);
  };

  return (
    <div className="flex items-center gap-1.5 px-1 py-1 overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-bottom-1 duration-150">
      <Sparkles className="h-3 w-3 text-muted-foreground shrink-0" />
      {suggestions.map((text) => (
        <button
          key={text}
          onClick={() => handleClick(text)}
          disabled={disabled}
          className="shrink-0 px-2.5 py-0.5 text-[11px] leading-4 rounded-md border border-blue-200 bg-blue-50 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
