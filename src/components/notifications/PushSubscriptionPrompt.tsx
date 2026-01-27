import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';

const PUSH_PROMPT_DISMISSED_KEY = 'push_prompt_dismissed';
const PUSH_PROMPT_SHOWN_KEY = 'push_prompt_shown_at';
// Show prompt again after 30 days if user dismissed
const PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Shows a dialog prompting the user to enable push notifications
 * after they log in for the first time (or after cooldown period)
 */
export function PushSubscriptionPrompt() {
  const { user, loading: authLoading } = useAuth();
  const { isSupported, isSubscribed, isLoading, subscribe, permission } = usePushNotifications();
  const [open, setOpen] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

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
        setOpen(true);
        // Mark that we showed the prompt
        markPromptShown(user.id);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user, isSupported, isSubscribed, permission, isLoading]);

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      const success = await subscribe();
      if (success) {
        setOpen(false);
        // Clear dismissed flag on success
        if (user) {
          clearDismissed(user.id);
        }
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setOpen(false);
    if (user) {
      markDismissed(user.id);
    }
  };

  const handleRemindLater = () => {
    setOpen(false);
    // Don't mark as dismissed - just close
    // It will show again on next login
  };

  if (!isSupported || isSubscribed) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Включить уведомления?
          </DialogTitle>
          <DialogDescription className="text-left">
            Получайте мгновенные оповещения о новых сообщениях, занятиях и важных событиях — даже когда браузер закрыт.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 text-sm">
            <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
              <Bell className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Новые сообщения</p>
              <p className="text-muted-foreground text-xs">Моментально узнавайте о входящих</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
              <Bell className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Напоминания об уроках</p>
              <p className="text-muted-foreground text-xs">Не пропустите занятия</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
              <Bell className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Пропущенные звонки</p>
              <p className="text-muted-foreground text-xs">Узнавайте сразу, если не смогли ответить</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemindLater}
            className="text-muted-foreground"
          >
            Позже
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
          >
            Не сейчас
          </Button>
          <Button
            onClick={handleEnable}
            disabled={isSubscribing}
            className="gap-2"
          >
            {isSubscribing ? (
              <>Включаю...</>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Включить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
