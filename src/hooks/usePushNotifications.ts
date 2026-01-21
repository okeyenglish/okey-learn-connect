import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// VAPID public key - must match the VAPID_PUBLIC_KEY in Supabase secrets
const VAPID_PUBLIC_KEY = 'BCqgfbaK1qdKUo3mtYwL3UAGl5tcaRyIMEE_Dmt7vc6sGSQ_MO730PV3bc9mF5WAMeGhl4t2byCljxFpkbjiwGM';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'default';
  isSubscribed: boolean;
  isLoading: boolean;
}

export function usePushNotifications() {
  const { user } = useAuth();
  
  // Check support synchronously on mount
  const isSupported = 
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator && 
    'PushManager' in window && 
    'Notification' in window;

  // useState MUST come before any useCallback
  const [state, setState] = useState<PushNotificationState>({
    isSupported,
    permission: typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'default',
    isSubscribed: false,
    isLoading: true,
  });

  // Helper to get SW registration with fallback
  const getSWRegistration = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isSupported) return null;

    // 1) Try existing registration for current scope
    try {
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing?.active) return existing;
    } catch {
      // ignore
    }

    // 2) Force register SW (override preview disabling for push testing)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Wait for SW to become active
      if (reg.installing || reg.waiting) {
        await new Promise<void>((resolve) => {
          const sw = reg.installing || reg.waiting;
          if (!sw) { resolve(); return; }
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') resolve();
          });
          // Timeout fallback
          setTimeout(resolve, 3000);
        });
      }
      return reg;
    } catch (e) {
      console.warn('[Push] SW register failed:', e);
    }

    // 3) Last resort: wait for ready with timeout
    try {
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      return ready ? (ready as ServiceWorkerRegistration) : null;
    } catch {
      return null;
    }
  }, [isSupported]);

  // Get current subscription status
  const checkSubscription = useCallback(async () => {
    if (!isSupported) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // If no user, just update permission but don't check subscription
    if (!user) {
      setState(prev => ({ 
        ...prev, 
        isSupported: true,
        permission: Notification.permission,
        isLoading: false 
      }));
      return;
    }

    try {
      const registration = await getSWRegistration();
      if (!registration) {
        setState({
          isSupported: true,
          permission: Notification.permission,
          isSubscribed: false,
          isLoading: false,
        });
        return;
      }
      const subscription = await registration.pushManager.getSubscription();
      
      setState({
        isSupported: true,
        permission: Notification.permission,
        isSubscribed: !!subscription,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setState(prev => ({ 
        ...prev, 
        isSupported: true,
        permission: Notification.permission,
        isLoading: false 
      }));
    }
  }, [isSupported, user, getSWRegistration]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Необходимо войти в систему');
      return false;
    }

    if (!isSupported) {
      toast.error('Push-уведомления не поддерживаются в этом браузере');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast.error('Разрешение на уведомления отклонено');
        setState(prev => ({ ...prev, permission, isLoading: false }));
        return false;
      }

      // Get service worker registration
      const registration = await getSWRegistration();
      if (!registration) {
        toast.error('Сервис-воркер не готов (обновите страницу)');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
      
      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const subscriptionJson = subscription.toJSON();
      
      if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error('Invalid subscription data');
      }

      // Save subscription to database with VAPID key info for debugging
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            vapidPublicKeyPrefix: VAPID_PUBLIC_KEY.substring(0, 12),
            subscribedAt: new Date().toISOString(),
          },
          is_active: true,
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        console.error('Error saving subscription:', error);
        throw error;
      }

      setState(prev => ({ 
        ...prev, 
        permission: 'granted', 
        isSubscribed: true, 
        isLoading: false 
      }));
      
      toast.success('Push-уведомления включены');
      return true;

    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Ошибка при подписке на уведомления');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user, isSupported, getSWRegistration]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await getSWRegistration();
      if (!registration) {
        setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
        return true;
      }
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setState(prev => ({ 
        ...prev, 
        isSubscribed: false, 
        isLoading: false 
      }));
      
      toast.success('Push-уведомления отключены');
      return true;

    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Ошибка при отключении уведомлений');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user, getSWRegistration]);

  // Toggle subscription
  const toggle = useCallback(async () => {
    if (state.isSubscribed) {
      return unsubscribe();
    } else {
      return subscribe();
    }
  }, [state.isSubscribed, subscribe, unsubscribe]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    toggle,
    refresh: checkSubscription,
  };
}
