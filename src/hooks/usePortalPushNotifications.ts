import { useState, useEffect, useCallback } from 'react';
import { pushApiWithFallback, type PushApiSource } from '@/lib/pushApiWithFallback';

// VAPID public key - synchronized across Lovable Cloud (primary) and self-hosted (fallback)
const VAPID_PUBLIC_KEY = 'BNCGXWZNiciyztYDIZPXM_smN8mBxrfFPIG_ohpea-9H5B0Gl-zjfWkh7XJOemAh2iDQR87V3f54LQ12DRJfl6s';
interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  apiSource: PushApiSource | null;
}

// Convert VAPID key from base64 to Uint8Array
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

export function usePortalPushNotifications(clientId: string | undefined) {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    error: null,
    apiSource: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      
      if (!isSupported || !clientId) {
        setState(prev => ({ ...prev, isSupported, isLoading: false }));
        return;
      }

      try {
        // Check if already subscribed
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        setState(prev => ({
          ...prev,
          isSupported: true,
          isSubscribed: !!subscription,
          isLoading: false,
        }));
      } catch (err) {
        console.error('Error checking push subscription:', err);
        setState(prev => ({
          ...prev,
          isSupported: true,
          isLoading: false,
          error: 'Не удалось проверить статус подписки',
        }));
      }
    };

    checkSupport();
  }, [clientId]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!clientId) return false;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Разрешение на уведомления не получено',
        }));
        return false;
      }

      // Get VAPID key from edge function (with fallback)
      const vapidResponse = await pushApiWithFallback<{ vapidPublicKey: string }>(
        'portal-push-config',
        undefined,
        { requireAuth: false }
      );
      const vapidKey = vapidResponse.data?.vapidPublicKey || VAPID_PUBLIC_KEY;
      console.log(`[PortalPush] VAPID from ${vapidResponse.source}:`, vapidKey.substring(0, 20) + '...');

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // Send subscription to server (with fallback)
      const response = await pushApiWithFallback('portal-push-subscribe', {
        client_id: clientId,
        subscription: subscription.toJSON(),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save subscription');
      }

      console.log(`[PortalPush] Subscription saved via ${response.source}`);

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        apiSource: response.source,
      }));

      return true;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Не удалось подписаться на уведомления',
      }));
      return false;
    }
  }, [clientId]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!clientId) return false;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from server (with fallback)
      const response = await pushApiWithFallback('portal-push-unsubscribe', {
        client_id: clientId,
      });

      console.log(`[PortalPush] Unsubscribed via ${response.source}`);

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        apiSource: response.source,
      }));

      return true;
    } catch (err) {
      console.error('Error unsubscribing from push:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Не удалось отписаться от уведомлений',
      }));
      return false;
    }
  }, [clientId]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
