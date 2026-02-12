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

interface ChatBubbleNotificationProps {
  /** When true, renders as floating popover near AI HUB button (bottom-right). Default: false (inline banner). */
  floating?: boolean;
}

export const ChatBubbleNotification = ({ floating = false }: ChatBubbleNotificationProps) => {
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

  // Floating mode: popover near the AI HUB button (bottom-right)
  if (floating) {
    return (
      <div
        className={`fixed z-[60] bottom-24 right-6 w-80 transition-all duration-300 ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        {/* Speech bubble tail */}
        <div className="absolute -bottom-2 right-6 w-4 h-4 bg-blue-50 dark:bg-blue-950/80 border-r border-b border-blue-200 dark:border-blue-800 rotate-45" />
        <div
          onClick={() => { notification.onOpen(); dismiss(); }}
          className="bg-blue-50 dark:bg-blue-950/80 backdrop-blur-lg border border-blue-200 dark:border-blue-800 rounded-2xl shadow-2xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
        >
          <div className="px-4 py-3 flex items-center gap-3">
            {/* Avatar */}
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-semibold">
              {notification.senderInitial}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{notification.senderName}</p>
              <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{notification.message}</p>
            </div>
            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(); }}
              className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Inline mode: banner inside the panel (original behavior)
  return (
    <div
      className={`absolute top-2 left-2 right-2 z-50 transition-all duration-300 ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div
        onClick={() => { notification.onOpen(); dismiss(); }}
        className="bg-blue-50 dark:bg-blue-950/60 backdrop-blur-lg border border-blue-200 dark:border-blue-800 rounded-xl shadow-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
      >
        <div className="px-3 py-2.5 flex items-center gap-3">
          {/* Avatar */}
          <div className="shrink-0 w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-semibold">
            {notification.senderInitial}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">{notification.senderName}</p>
            <p className="text-[12px] text-muted-foreground leading-snug truncate">{notification.message}</p>
          </div>
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};