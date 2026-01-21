import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// VAPID public key - this should match the one in your Supabase secrets
// You can get this from your VAPID key pair generation
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

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
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
  });

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    const isSupported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    
    return isSupported;
  }, []);

  // Get current subscription status
  const checkSubscription = useCallback(async () => {
    if (!checkSupport() || !user) {
      setState(prev => ({ ...prev, isLoading: false, isSupported: checkSupport() }));
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setState({
        isSupported: true,
        permission: Notification.permission,
        isSubscribed: !!subscription,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkSupport, user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Необходимо войти в систему');
      return false;
    }

    if (!checkSupport()) {
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
      const registration = await navigator.serviceWorker.ready;
      
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

      // Save subscription to database
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
  }, [user, checkSupport]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
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
  }, [user]);

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
