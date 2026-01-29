import { useState, useEffect, useCallback, useRef } from 'react';
import { PushNotifications, PushNotificationSchema, ActionPerformed, Token, RegistrationError } from '@capacitor/push-notifications';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { isNativePlatform, getPlatform } from '@/lib/capacitorPlatform';

export interface NativePushNotificationState {
  isSupported: boolean;
  permission: 'default' | 'granted' | 'denied';
  isSubscribed: boolean;
  isLoading: boolean;
  deviceToken: string | null;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Hook for managing native push notifications on iOS/Android via Capacitor
 * Uses FCM (Firebase Cloud Messaging) for both platforms
 * Registers tokens with self-hosted Supabase (api.academyos.ru)
 */
export function useNativePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<NativePushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    deviceToken: null,
    platform: getPlatform(),
  });
  
  const tokenRef = useRef<string | null>(null);

  // Check if native push is supported
  useEffect(() => {
    const checkSupport = async () => {
      if (!isNativePlatform()) {
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
        return;
      }

      try {
        // Check current permission status
        const result = await PushNotifications.checkPermissions();
        
        setState(prev => ({
          ...prev,
          isSupported: true,
          permission: result.receive === 'granted' ? 'granted' : 
                     result.receive === 'denied' ? 'denied' : 'default',
          isLoading: false,
        }));
      } catch (error) {
        console.error('[NativePush] Error checking permissions:', error);
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
      }
    };

    checkSupport();
  }, []);

  // Set up push notification listeners
  useEffect(() => {
    if (!isNativePlatform()) return;

    // Registration success - we got the device token
    const registrationListener = PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[NativePush] Registration successful, token:', token.value.substring(0, 20) + '...');
      tokenRef.current = token.value;
      
      setState(prev => ({
        ...prev,
        deviceToken: token.value,
        isSubscribed: true,
        isLoading: false,
      }));

      // Save token to server
      if (user?.id) {
        await saveTokenToServer(user.id, token.value);
      }
    });

    // Registration error
    const registrationErrorListener = PushNotifications.addListener('registrationError', (error: RegistrationError) => {
      console.error('[NativePush] Registration error:', error.error);
      toast.error('Ошибка регистрации уведомлений');
      
      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));
    });

    // Notification received while app is in foreground
    const notificationReceivedListener = PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[NativePush] Notification received:', notification);
      
      // Show in-app toast for foreground notifications
      const title = notification.title || "O'KEY ENGLISH";
      const body = notification.body || '';
      
      toast(title, {
        description: body.length > 100 ? `${body.slice(0, 100)}…` : body,
        duration: 8000,
        icon: '🔔',
      });
    });

    // Notification clicked/tapped
    const notificationActionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[NativePush] Action performed:', action);
      
      const data = action.notification.data as Record<string, unknown> | undefined;
      const url = data?.url as string | undefined;
      
      // Handle deep linking
      if (url && url.startsWith('/')) {
        // Navigate to the specified route
        window.location.href = url;
      }
    });

    // Cleanup listeners
    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
      notificationReceivedListener.then(l => l.remove());
      notificationActionListener.then(l => l.remove());
    };
  }, [user?.id]);

  // Save device token to self-hosted server
  const saveTokenToServer = async (userId: string, token: string) => {
    try {
      const platform = getPlatform();
      const subscriptionType = platform === 'ios' ? 'apns' : 'fcm';
      
      console.log(`[NativePush] Saving ${subscriptionType} token to self-hosted server for user:`, userId);
      
      const response = await selfHostedPost<{ success: boolean }>('native-push-register', {
        user_id: userId,
        device_token: token,
        subscription_type: subscriptionType,
        user_agent: navigator.userAgent,
        action: 'register',
      });

      if (!response.success) {
        console.error('[NativePush] Error saving token:', response.error);
        throw new Error(response.error || 'Failed to save token');
      }

      console.log('[NativePush] Token saved successfully to self-hosted server');
    } catch (error) {
      console.error('[NativePush] Failed to save token to server:', error);
      toast.error('Не удалось сохранить регистрацию уведомлений');
    }
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isNativePlatform()) {
      toast.error('Нативные push-уведомления доступны только в приложении');
      return false;
    }

    if (!user) {
      toast.error('Необходимо войти в систему');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request permission
      let permResult = await PushNotifications.checkPermissions();
      
      if (permResult.receive === 'prompt') {
        permResult = await PushNotifications.requestPermissions();
      }

      if (permResult.receive !== 'granted') {
        toast.error('Разрешение на уведомления отклонено');
        setState(prev => ({
          ...prev,
          permission: 'denied',
          isLoading: false,
        }));
        return false;
      }

      // Register with FCM/APNs
      await PushNotifications.register();
      
      // The token will be received via the 'registration' listener
      // setState will be updated there
      
      return true;
    } catch (error) {
      console.error('[NativePush] Subscribe error:', error);
      toast.error('Не удалось подписаться на уведомления');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isNativePlatform() || !user) {
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Remove registration from self-hosted server
      const response = await selfHostedPost<{ success: boolean }>('native-push-register', {
        user_id: user.id,
        action: 'unregister',
      });

      if (!response.success) {
        console.error('[NativePush] Error unregistering:', response.error);
      }

      // Unregister from FCM/APNs
      await PushNotifications.unregister();

      tokenRef.current = null;
      setState(prev => ({
        ...prev,
        deviceToken: null,
        isSubscribed: false,
        isLoading: false,
      }));

      toast.success('Уведомления отключены');
      return true;
    } catch (error) {
      console.error('[NativePush] Unsubscribe error:', error);
      toast.error('Не удалось отписаться от уведомлений');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user]);

  // Get delivery channel info
  const getDeliveredNotifications = useCallback(async () => {
    if (!isNativePlatform()) return [];
    
    try {
      const result = await PushNotifications.getDeliveredNotifications();
      return result.notifications;
    } catch (error) {
      console.error('[NativePush] Error getting delivered notifications:', error);
      return [];
    }
  }, []);

  // Remove all delivered notifications
  const removeAllDeliveredNotifications = useCallback(async () => {
    if (!isNativePlatform()) return;
    
    try {
      await PushNotifications.removeAllDeliveredNotifications();
    } catch (error) {
      console.error('[NativePush] Error removing notifications:', error);
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    getDeliveredNotifications,
    removeAllDeliveredNotifications,
  };
}
