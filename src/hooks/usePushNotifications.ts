/* @refresh reset */
import { useState, useEffect, useCallback, useRef } from 'react';
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
  // === ALL HOOKS FIRST (unconditional, stable order) ===
  const { user } = useAuth();
  const lastSWErrorRef = useRef<unknown>(null);

  // Compute derived booleans (no hooks here)
  const isPreviewHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('lovableproject.com') ||
      window.location.hostname.startsWith('id-preview--') ||
      window.location.hostname.startsWith('preview--'));

  const isSupported =
    typeof window !== 'undefined' &&
    !isPreviewHost &&
    window.isSecureContext &&
    window.location.protocol === 'https:' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const initialPermission: NotificationPermission | 'default' =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';

  // useState (always called, stable position)
  const [state, setState] = useState<PushNotificationState>(() => ({
    isSupported,
    permission: initialPermission,
    isSubscribed: false,
    isLoading: true,
  }));

  // Helper to get SW registration with activation/ready handling
  const getSWRegistration = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isSupported) return null;

    const captureSWDiagnostics = async (err: unknown) => {
      try {
        const res = await fetch('/sw.js', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const ct = res.headers.get('content-type');
        // Don't pull huge body; just enough to see if it's HTML.
        const text = await res.text();
        const snippet = text.slice(0, 120);
        lastSWErrorRef.current = {
          name: (err as any)?.name,
          message: (err as any)?.message,
          swStatus: res.status,
          swContentType: ct,
          swSnippet: snippet,
          href: window.location.href,
          ua: navigator.userAgent,
          secure: window.isSecureContext,
        };
        console.warn('[Push] SW diagnostics:', lastSWErrorRef.current);
      } catch (e) {
        lastSWErrorRef.current = {
          name: (err as any)?.name,
          message: (err as any)?.message,
          diagError: (e as any)?.message || String(e),
          href: typeof window !== 'undefined' ? window.location.href : undefined,
        };
        console.warn('[Push] SW diagnostics failed:', lastSWErrorRef.current);
      }
    };

    const waitForActivation = async (
      reg: ServiceWorkerRegistration,
      timeoutMs = 15000
    ): Promise<ServiceWorkerRegistration | null> => {
      if (reg.active) return reg;

      const sw = reg.installing || reg.waiting;
      if (sw) {
        await new Promise<void>((resolve) => {
          const t = window.setTimeout(resolve, timeoutMs);
          const onState = () => {
            if (sw.state === 'activated') {
              window.clearTimeout(t);
              sw.removeEventListener('statechange', onState);
              resolve();
            }
          };
          sw.addEventListener('statechange', onState);
        });
      }

      // navigator.serviceWorker.ready resolves only when there's an active controller.
      // On mobile Safari first install may take noticeably longer, so we race with a longer timeout.
      try {
        const ready = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
        ]);
        if (ready) return ready as ServiceWorkerRegistration;
      } catch {
        // ignore
      }

      return reg.active ? reg : null;
    };

    // 1) Try existing registration for current scope
    try {
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (existing) {
        const activated = await waitForActivation(existing);
        if (activated) return activated;
      }
    } catch {
      // ignore
    }

    // 2) Register SW (production only)
    try {
      // Try normal register first
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Force a check for updates (best-effort)
      try {
        await reg.update();
      } catch {
        // ignore
      }

      const activated = await waitForActivation(reg);
      if (activated) return activated;
    } catch (e) {
      await captureSWDiagnostics(e);
      console.warn('[Push] SW register failed:', e);

      // Fallback: cache-bust URL (some iOS setups get a cached HTML fallback)
      try {
        const reg2 = await navigator.serviceWorker.register(`/sw.js?sw-bust=${Date.now()}`, { scope: '/' });
        const activated2 = await waitForActivation(reg2);
        if (activated2) return activated2;
      } catch (e2) {
        await captureSWDiagnostics(e2);
        console.warn('[Push] SW register failed (bust):', e2);
      }
    }

    return null;
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
      if (isPreviewHost) {
        toast.error('Push недоступен в предпросмотре. Откройте опубликованный домен (crm.academyos.ru)');
      } else {
      toast.error('Push-уведомления не поддерживаются в этом браузере');
      }
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
      let registration = await getSWRegistration();

      // On iOS PWA first load the SW may not be active yet even after registration.
      // Ensure we have an active registration via ready.
      if (!registration || !registration.active) {
        try {
          const ready = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<null>((r) => window.setTimeout(() => r(null), 20000)),
          ]);
          if (ready) registration = ready as ServiceWorkerRegistration;
        } catch {
          // ignore
        }
      }

      if (!registration || !registration.active) {
        const err = lastSWErrorRef.current as any;
        const name = err?.name ? String(err.name) : 'Ошибка';
        const msg = err?.message ? String(err.message) : '';
        const details = msg ? `: ${msg}` : '';
        const swHint =
          err?.swStatus || err?.swContentType
            ? ` | /sw.js: ${err?.swStatus ?? '?'} ${err?.swContentType ?? ''}`
            : '';
        // Keep user-facing text short; diagnostics go to console.
        toast.error(`Сервис-воркер не готов (${name})${details}${swHint}`);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Subscribe to push
      // iOS Safari is picky about the key type; pass Uint8Array (not .buffer) for best compatibility.
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
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
      const err = error as any;
      const name = err?.name ? String(err.name) : 'Ошибка';
      const msg = err?.message ? String(err.message) : '';
      const details = msg ? `: ${msg}` : '';
      toast.error(`Ошибка при подписке (${name})${details}`);
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
