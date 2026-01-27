import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const PUSH_PROMPT_DISMISSED_KEY = 'push_prompt_dismissed';
const PUSH_PROMPT_SHOWN_KEY = 'push_prompt_shown_at';
// Show prompt again after 30 days if user dismissed
const PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Shows a non-blocking floating banner prompting the user to enable push notifications
 * after they log in for the first time (or after cooldown period)
 */
export function PushSubscriptionPrompt() {
  const { user, loading: authLoading } = useAuth();
  const { isSupported, isSubscribed, isLoading, subscribe, permission } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Don't show if:
    // - Still loading auth
    // - No user logged in
    // - Push not supported
    // - Already subscribed
    // - Permission denied (can't ask again)
    // - Still checking subscription status
    if (
      authLoading ||
      !user ||
      !isSupported ||
      isSubscribed ||
      permission === 'denied' ||
      isLoading
    ) {
      return;
    }

    // Check if we should show the prompt
    const shouldShow = checkShouldShowPrompt(user.id);
    if (shouldShow) {
      // Small delay to let the UI settle after login
      const timer = setTimeout(() => {
        setVisible(true);
        // Mark that we showed the prompt
        markPromptShown(user.id);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user, isSupported, isSubscribed, permission, isLoading]);

  const handleClose = (markAsDismissed = false) => {
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      setIsExiting(false);
      if (markAsDismissed && user) {
        markDismissed(user.id);
      }
    }, 300);
  };

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      const success = await subscribe();
      if (success) {
        handleClose(false);
        // Clear dismissed flag on success
        if (user) {
          clearDismissed(user.id);
        }
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!visible || !isSupported || isSubscribed) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50',
        'bg-background border border-border rounded-lg shadow-lg',
        'transition-all duration-300 ease-out',
        isExiting
          ? 'opacity-0 translate-y-4'
          : 'opacity-100 translate-y-0 animate-fade-in'
      )}
    >
      {/* Close button */}
      <button
        onClick={() => handleClose(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="Закрыть"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="p-4 pr-8">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">Включить уведомления?</h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Получайте оповещения о сообщениях, занятиях и звонках — даже когда браузер закрыт
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleClose(false)}
            className="text-xs h-8 px-3"
          >
            Позже
          </Button>
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={isSubscribing}
            className="text-xs h-8 px-3 gap-1.5"
          >
            {isSubscribing ? (
              'Включаю...'
            ) : (
              <>
                <Bell className="h-3.5 w-3.5" />
                Включить
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper functions for localStorage persistence
function getStorageKey(userId: string, suffix: string) {
  return `${suffix}:${userId}`;
}

function checkShouldShowPrompt(userId: string): boolean {
  try {
    // Check if dismissed
    const dismissedAt = localStorage.getItem(getStorageKey(userId, PUSH_PROMPT_DISMISSED_KEY));
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      // If dismissed recently, don't show
      if (Date.now() - dismissedTime < PROMPT_COOLDOWN_MS) {
        return false;
      }
    }

    // Check if we already showed it this session
    const shownAt = sessionStorage.getItem(getStorageKey(userId, PUSH_PROMPT_SHOWN_KEY));
    if (shownAt) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function markPromptShown(userId: string) {
  try {
    sessionStorage.setItem(getStorageKey(userId, PUSH_PROMPT_SHOWN_KEY), Date.now().toString());
  } catch {
    // ignore
  }
}

function markDismissed(userId: string) {
  try {
    localStorage.setItem(getStorageKey(userId, PUSH_PROMPT_DISMISSED_KEY), Date.now().toString());
  } catch {
    // ignore
  }
}

function clearDismissed(userId: string) {
  try {
    localStorage.removeItem(getStorageKey(userId, PUSH_PROMPT_DISMISSED_KEY));
  } catch {
    // ignore
  }
}

export default PushSubscriptionPrompt;
