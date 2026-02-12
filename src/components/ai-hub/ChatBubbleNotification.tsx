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
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-[420px] transition-all duration-300 ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div
        onClick={() => { notification.onOpen(); dismiss(); }}
        className="bg-background/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl cursor-pointer hover:bg-background transition-colors"
      >
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Avatar */}
          <div className="shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-semibold">
            {notification.senderInitial}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">{notification.senderName}</p>
            <p className="text-[13px] text-muted-foreground leading-snug truncate">{notification.message}</p>
          </div>
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};
