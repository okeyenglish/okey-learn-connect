import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSearchBarProps {
  messages: Array<{ id: string; message_text?: string; message?: string }>;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
  className?: string;
}

/**
 * Search bar component for navigating between message search results
 * Shows current position (e.g. "3 из 15") and up/down navigation buttons
 */
export const ChatSearchBar: React.FC<ChatSearchBarProps> = ({
  messages,
  isOpen,
  onClose,
  onNavigateToMessage,
  className,
}) => {
  const [query, setQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Find all matching messages
  const matchingMessages = useMemo(() => {
    if (!query || query.length < 2) return [];
    
    const lowerQuery = query.toLowerCase();
    return messages.filter(msg => {
      const text = msg.message_text || msg.message || '';
      return text.toLowerCase().includes(lowerQuery);
    });
  }, [messages, query]);
  
  const totalResults = matchingMessages.length;
  
  // Reset index when query changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [query]);
  
  // Navigate to current result
  useEffect(() => {
    if (matchingMessages.length > 0 && currentIndex >= 0 && currentIndex < matchingMessages.length) {
      const targetMessage = matchingMessages[currentIndex];
      onNavigateToMessage(targetMessage.id);
    }
  }, [currentIndex, matchingMessages, onNavigateToMessage]);
  
  // Navigate to previous result
  const handlePrevious = useCallback(() => {
    if (totalResults === 0) return;
    setCurrentIndex(prev => (prev - 1 + totalResults) % totalResults);
  }, [totalResults]);
  
  // Navigate to next result
  const handleNext = useCallback(() => {
    if (totalResults === 0) return;
    setCurrentIndex(prev => (prev + 1) % totalResults);
  }, [totalResults]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [handleNext, handlePrevious, onClose]);
  
  // Clear search and close
  const handleClose = useCallback(() => {
    setQuery('');
    setCurrentIndex(0);
    onClose();
  }, [onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 bg-background border-b animate-in slide-in-from-top-2 duration-200",
      className
    )}>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Поиск в чате..."
          className="pl-9 pr-3 h-9"
          autoFocus
        />
      </div>
      
      {/* Results counter */}
      <div className="text-sm text-muted-foreground min-w-[70px] text-center">
        {query.length >= 2 ? (
          totalResults > 0 ? (
            <span>{currentIndex + 1} из {totalResults}</span>
          ) : (
            <span className="text-destructive/70">Не найдено</span>
          )
        ) : (
          <span className="opacity-50">—</span>
        )}
      </div>
      
      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handlePrevious}
          disabled={totalResults === 0}
          title="Предыдущий (Shift+Enter)"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleNext}
          disabled={totalResults === 0}
          title="Следующий (Enter)"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleClose}
        title="Закрыть (Esc)"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ChatSearchBar;
