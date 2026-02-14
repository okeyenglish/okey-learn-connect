import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { getSmartReplies } from '@/hooks/useSmartReplies';
import { Sparkles } from 'lucide-react';

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
  const suggestions = useMemo(
    () => (isLastMessageIncoming && lastIncomingMessage ? getSmartReplies(lastIncomingMessage) : []),
    [lastIncomingMessage, isLastMessageIncoming],
  );

  // Hide if user is typing or no suggestions
  if (suggestions.length === 0 || currentInput.trim()) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-2 py-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Sparkles className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      {suggestions.map((text) => (
        <Button
          key={text}
          variant="outline"
          size="sm"
          className="h-6 text-xs rounded-full px-3 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={() => onSend(text)}
          disabled={disabled}
        >
          {text}
        </Button>
      ))}
    </div>
  );
}
