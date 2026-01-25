import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NewMessageIndicatorProps {
  /** Reference to the scroll container */
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  /** Reference to the bottom element to scroll to */
  bottomRef: React.RefObject<HTMLDivElement>;
  /** Number of new messages (shows badge if > 0) */
  newMessagesCount?: number;
  /** Threshold in px from bottom to consider "at bottom" */
  threshold?: number;
  /** Called when new message arrives while user is scrolled up */
  onNewMessage?: () => void;
}

export const NewMessageIndicator = ({
  scrollContainerRef,
  bottomRef,
  newMessagesCount = 0,
  threshold = 150,
  onNewMessage,
}: NewMessageIndicatorProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const prevCountRef = useRef(newMessagesCount);

  // Check if user is near bottom
  const checkIfAtBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < threshold;
  }, [scrollContainerRef, threshold]);

  // Handle scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atBottom = checkIfAtBottom();
      
      if (atBottom) {
        setIsVisible(false);
        setLocalCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef, checkIfAtBottom]);

  // Show indicator when new messages arrive and user is scrolled up
  useEffect(() => {
    if (newMessagesCount > prevCountRef.current) {
      const atBottom = checkIfAtBottom();
      
      if (!atBottom) {
        setIsVisible(true);
        setLocalCount(prev => prev + (newMessagesCount - prevCountRef.current));
        onNewMessage?.();
      }
    }
    
    prevCountRef.current = newMessagesCount;
  }, [newMessagesCount, checkIfAtBottom, onNewMessage]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsVisible(false);
    setLocalCount(0);
  }, [bottomRef]);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
      <Button
        variant="secondary"
        size="sm"
        onClick={scrollToBottom}
        className="rounded-full shadow-lg gap-2 pr-3 bg-background/95 backdrop-blur-sm border hover:bg-muted"
      >
        <ChevronDown className="h-4 w-4" />
        <span className="text-sm">Новое сообщение</span>
        {localCount > 0 && (
          <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs">
            {localCount > 99 ? '99+' : localCount}
          </Badge>
        )}
      </Button>
    </div>
  );
};

/**
 * Hook to track if scroll is at bottom and manage new message indicator state
 */
export const useNewMessageIndicator = (
  scrollContainerRef: React.RefObject<HTMLDivElement>,
  messagesCount: number,
  threshold = 150
) => {
  const [showIndicator, setShowIndicator] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const prevMessagesCountRef = useRef(messagesCount);
  const isAtBottomRef = useRef(true);

  const checkIfAtBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < threshold;
  }, [scrollContainerRef, threshold]);

  // Update isAtBottom on scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      isAtBottomRef.current = checkIfAtBottom();
      
      if (isAtBottomRef.current) {
        setShowIndicator(false);
        setNewCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef, checkIfAtBottom]);

  // Track new messages
  useEffect(() => {
    const newMessages = messagesCount - prevMessagesCountRef.current;
    
    if (newMessages > 0 && !isAtBottomRef.current) {
      setShowIndicator(true);
      setNewCount(prev => prev + newMessages);
    }
    
    prevMessagesCountRef.current = messagesCount;
  }, [messagesCount]);

  const scrollToBottom = useCallback((bottomRef: React.RefObject<HTMLDivElement>) => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowIndicator(false);
    setNewCount(0);
  }, []);

  const reset = useCallback(() => {
    setShowIndicator(false);
    setNewCount(0);
  }, []);

  return {
    showIndicator,
    newCount,
    scrollToBottom,
    reset,
    isAtBottom: isAtBottomRef.current,
  };
};
