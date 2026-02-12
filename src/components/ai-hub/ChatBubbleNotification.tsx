import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ChatNotification {
  id: string;
  senderName: string;
  senderInitial: string;
  message: string;
  onOpen: () => void;
}

// Global event bus for chat notifications
type Listener = (n: ChatNotification) => void;
const listeners = new Set<Listener>();

export const showChatBubbleNotification = (notification: ChatNotification) => {
  listeners.forEach(fn => fn(notification));
};

export const ChatBubbleNotification = () => {
  const [notification, setNotification] = useState<ChatNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => setNotification(null), 300);
  }, []);

  useEffect(() => {
    const handler: Listener = (n) => {
      setNotification(n);
      setIsVisible(true);
      // Auto-dismiss after 5s
      const timer = setTimeout(dismiss, 5000);
      return () => clearTimeout(timer);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, [dismiss]);

  if (!notification) return null;

  return (
    <div
      className={`fixed bottom-24 right-6 z-[60] max-w-[300px] transition-all duration-300 ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      {/* Chat bubble */}
      <div
        onClick={() => { notification.onOpen(); dismiss(); }}
        className="bg-background border border-border rounded-2xl shadow-xl cursor-pointer hover:shadow-2xl transition-shadow relative"
      >
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>

        <div className="p-3 flex items-start gap-2.5">
          {/* Avatar */}
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold mt-0.5">
            {notification.senderInitial}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">{notification.senderName}</p>
            <p className="text-[13px] text-foreground/70 leading-snug mt-0.5 line-clamp-3 whitespace-pre-wrap">{notification.message}</p>
          </div>
        </div>
      </div>

      {/* Tail pointing to bottom-right (toward FAB) */}
      <div className="flex justify-end mr-4">
        <div className="w-3 h-3 bg-background border-b border-r border-border transform rotate-45 -mt-1.5" />
      </div>
    </div>
  );
};
