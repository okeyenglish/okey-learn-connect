/* @refresh reset */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { selfHostedPost } from '@/lib/selfHostedApi';

// VAPID public key - must match the VAPID_PUBLIC_KEY in Supabase secrets
const VAPID_PUBLIC_KEY = 'BNCGXWZNiciyztYDIZPXM_smN8mBxrfFPIG_ohpea-9H5B0Gl-zjfWkh7XJOemAh2iDQR87V3f54LQ12DRJfl6s';

// Persist last known endpoint so we can delete stale subscriptions on the server
// even if the browser already dropped the subscription locally.
const LAST_ENDPOINT_STORAGE_PREFIX = 'push:last_endpoint:';
const PUSH_DEBUG_UNTIL_KEY = 'push:debug_until';
const PUSH_LAST_HEALTH_CHECK_KEY = 'push:last_health_check:';
const HEALTH_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getLastEndpointStorageKey(userId: string) {
  return `${LAST_ENDPOINT_STORAGE_PREFIX}${userId}`;
}

function safeLocalStorageGet(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeLocalStorageRemove(key: string) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function isDebugWindowActive(): boolean {
  const raw = safeLocalStorageGet(PUSH_DEBUG_UNTIL_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
}

async function fetchVapidPublicKey(): Promise<string> {
  // Prefer fetching from self-hosted backend (prevents mismatches after key rotation), fallback to hardcoded.
  try {
    const res = await selfHostedPost<{ success?: boolean; vapidPublicKey?: string; error?: string }>(
      'portal-push-config',
      undefined
    );

    const key = res.data?.vapidPublicKey;
    if (res.success && typeof key === 'string' && key.length > 20) {
      console.log('[Push] VAPID key from self-hosted server:', key.substring(0, 20) + '...');
      return key;
    }
    console.warn('[Push] Self-hosted returned invalid VAPID, using fallback:', VAPID_PUBLIC_KEY.substring(0, 20) + '...');
  } catch (e) {
    console.warn('[Push] Failed to fetch VAPID from self-hosted, using fallback:', e);
  }
  return VAPID_PUBLIC_KEY;
}

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

/** Diagnostic info structure for SW errors */
interface SWDiagnostics {
  name?: string;
  message?: string;
  swStatus?: number;
  swContentType?: string | null;
  swSnippet?: string;
  href?: string;
  ua?: string;
  secure?: boolean;
  diagError?: string;
}

export function usePushNotifications() {
  // === ALL HOOKS FIRST (unconditional, stable order) ===
  const { user } = useAuth();
  const lastSWErrorRef = useRef<SWDiagnostics | null>(null);

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
      const error = err as Error | undefined;
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
          name: error?.name,
          message: error?.message,
          swStatus: res.status,
          swContentType: ct,
          swSnippet: snippet,
          href: window.location.href,
          ua: navigator.userAgent,
          secure: window.isSecureContext,
        };
        console.warn('[Push] SW diagnostics:', lastSWErrorRef.current);
      } catch (e) {
        const diagErr = e as Error | undefined;
        lastSWErrorRef.current = {
          name: error?.name,
          message: error?.message,
          diagError: diagErr?.message || String(e),
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

  // When SW receives a push, it broadcasts a message to open clients.
  // If app is in foreground, OS notification banner likely won't show - so we show in-app toast as fallback.
  useEffect(() => {
    if (!isSupported) return;

    const onMessage = (event: MessageEvent) => {
      const msg = event.data as any;
      if (!msg || msg.type !== 'PUSH_RECEIVED') return;
      
      const isDebugActive = isDebugWindowActive();
      const isInForeground = document.visibilityState === 'visible' && document.hasFocus();
      const payload = (msg.payload ?? {}) as { 
        title?: unknown; 
        body?: unknown;
        url?: unknown;
        tag?: unknown;
      };
      
      const title = typeof payload.title === 'string' ? payload.title.trim() : '';
      const body = typeof payload.body === 'string' ? payload.body : '';
      const url = typeof payload.url === 'string' ? payload.url : '';
      const tag = typeof payload.tag === 'string' ? payload.tag : '';
      
      // Debug mode: show confirmation toast
      if (isDebugActive) {
        toast.success(title ? `Push получен: ${title}` : 'Push получен');
        if (body) toast.message(body.length > 140 ? `${body.slice(0, 140)}…` : body);
        
        // Mark Focus/DND detection if in foreground
        if (isInForeground) {
          try {
            localStorage.setItem('push:focus_mode_detected', 'true');
            localStorage.setItem('push:focus_mode_detected_at', String(Date.now()));
          } catch {
            // ignore
          }
        }
        return;
      }
      
      // Foreground fallback: show in-app toast notification with type-specific styling
      if (isInForeground && title) {
        const truncatedBody = body.length > 100 ? `${body.slice(0, 100)}…` : body;
        const actionConfig = url ? {
          label: 'Открыть',
          onClick: () => {
            if (url.startsWith('/')) {
              window.location.href = url;
            }
          },
        } : undefined;

        // Determine notification type from tag
        const notificationType = getNotificationType(tag);
        
        switch (notificationType) {
          case 'whatsapp':
            toast(title, {
              description: truncatedBody,
              duration: 8000,
              icon: '💬',
              className: 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/30',
              action: actionConfig,
            });
            break;
            
          case 'telegram':
            toast(title, {
              description: truncatedBody,
              duration: 8000,
              icon: '✈️',
              className: 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/30',
              action: actionConfig,
            });
            break;
            
          case 'max':
            toast(title, {
              description: truncatedBody,
              duration: 8000,
              icon: '📨',
              className: 'border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/30',
              action: actionConfig,
            });
            break;
            
          case 'missed-call':
            toast(title, {
              description: truncatedBody,
              duration: 10000,
              icon: '📞',
              className: 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/30',
              action: actionConfig,
            });
            break;
            
          case 'lesson':
            toast(title, {
              description: truncatedBody,
              duration: 12000,
              icon: '🎓',
              className: 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30',
              action: actionConfig,
            });
            break;
            
          case 'lesson-parent':
            toast(title, {
              description: truncatedBody,
              duration: 12000,
              icon: '📚',
              className: 'border-l-4 border-l-indigo-500 bg-indigo-50 dark:bg-indigo-950/30',
              action: actionConfig,
            });
            break;
            
          default:
            // Generic notification
            toast(title, {
              description: truncatedBody,
              duration: 8000,
              icon: '🔔',
              action: actionConfig,
            });
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [isSupported]);

  // Helper to determine notification type from tag
  function getNotificationType(tag: string): string {
    if (!tag) return 'generic';
    
    if (tag.startsWith('whatsapp-')) return 'whatsapp';
    if (tag.startsWith('telegram-')) return 'telegram';
    if (tag.startsWith('max-')) return 'max';
    if (tag.startsWith('missed-call')) return 'missed-call';
    if (tag.startsWith('lesson-teacher') || tag.includes('teacher-reminder')) return 'lesson';
    if (tag.startsWith('lesson-parent') || tag.includes('parent-reminder')) return 'lesson-parent';
    if (tag.includes('lesson') || tag.includes('schedule')) return 'lesson';
    
    return 'generic';
  }

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
        const err = lastSWErrorRef.current;
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
      // 1) Reuse existing subscription if present (prevents InvalidStateError)
      // 2) Otherwise create a fresh one using the current VAPID key from backend
      const existing = await registration.pushManager.getSubscription();
      const vapidKey = await fetchVapidPublicKey();
      console.log('[Push] Using VAPID key (len):', vapidKey?.length);

      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // iOS Safari is picky about the key type; pass Uint8Array (not .buffer) for best compatibility.
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        }));

      const subscriptionJson = subscription.toJSON();
      
      if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error('Invalid subscription data');
      }

      // Save subscription to self-hosted database via Edge Function
      console.log('[Push] Saving subscription to self-hosted for user:', user.id);
      const saveResponse = await selfHostedPost<{ success: boolean; error?: string }>('push-subscription-save', {
        user_id: user.id,
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
        },
        user_agent: navigator.userAgent,
      });

      if (!saveResponse.success || saveResponse.error) {
        console.error('Error saving subscription:', saveResponse.error);
        throw new Error(saveResponse.error || 'Failed to save subscription');
      }
      
      console.log('[Push] Subscription saved successfully');

      // Remember endpoint for later cleanup
      safeLocalStorageSet(getLastEndpointStorageKey(user.id), subscriptionJson.endpoint);

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
      const err = error as Error;
      const name = err?.name ? String(err.name) : 'Ошибка';
      const msg = err?.message ? String(err.message) : '';
      const details = msg ? `: ${msg}` : '';
      toast.error(`Ошибка при подписке (${name})${details}`);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user, isSupported, getSWRegistration, isPreviewHost]);

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
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Remove from self-hosted database via Edge Function
        console.log('[Push] Deleting subscription from self-hosted for user:', user.id);
        const deleteResponse = await selfHostedPost<{ success: boolean; error?: string }>('push-subscription-delete', {
          user_id: user.id,
          endpoint,
        });

        if (!deleteResponse.success) {
          console.warn('[Push] Error deleting subscription:', deleteResponse.error);
          // Don't throw - local unsubscribe succeeded
        }

        // Clear stored endpoint if it matches
        const storedKey = getLastEndpointStorageKey(user.id);
        const stored = safeLocalStorageGet(storedKey);
        if (stored && stored === endpoint) {
          safeLocalStorageRemove(storedKey);
        }
      } else {
        // No local subscription (often happens when browser already invalidated it).
        // Try to delete last known endpoint from server to avoid “all subscriptions expired”.
        const storedKey = getLastEndpointStorageKey(user.id);
        const storedEndpoint = safeLocalStorageGet(storedKey);
        if (storedEndpoint) {
          console.log('[Push] No local subscription; deleting stored endpoint from server');
          await selfHostedPost<{ success: boolean; error?: string }>('push-subscription-delete', {
            user_id: user.id,
            endpoint: storedEndpoint,
          });
          safeLocalStorageRemove(storedKey);
        }
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

  // Auto health check every 24 hours - silently re-subscribe if subscription is stale
  useEffect(() => {
    if (!isSupported || !user || state.isLoading) return;
    if (!state.isSubscribed) return;

    const healthCheckKey = `${PUSH_LAST_HEALTH_CHECK_KEY}${user.id}`;
    
    const performHealthCheck = async () => {
      try {
        const lastCheck = safeLocalStorageGet(healthCheckKey);
        const lastCheckTime = lastCheck ? parseInt(lastCheck, 10) : 0;
        const now = Date.now();

        // Skip if checked within last 24 hours
        if (lastCheckTime && (now - lastCheckTime) < HEALTH_CHECK_INTERVAL_MS) {
          console.log('[Push] Health check skipped - checked recently');
          return;
        }

        console.log('[Push] Running subscription health check...');

        const registration = await getSWRegistration();
        if (!registration) {
          console.warn('[Push] Health check: No SW registration');
          return;
        }

        const subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          // Subscription expired or was revoked - try to re-subscribe silently
          console.log('[Push] Health check: Subscription expired, re-subscribing...');
          
          const vapidKey = await fetchVapidPublicKey();
          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
          });

          const subscriptionJson = newSubscription.toJSON();
          
          if (subscriptionJson.endpoint && subscriptionJson.keys?.p256dh && subscriptionJson.keys?.auth) {
            // Save new subscription to server
            const saveResponse = await selfHostedPost<{ success: boolean; error?: string }>('push-subscription-save', {
              user_id: user.id,
              endpoint: subscriptionJson.endpoint,
              keys: {
                p256dh: subscriptionJson.keys.p256dh,
                auth: subscriptionJson.keys.auth,
              },
              user_agent: navigator.userAgent,
            });

            if (saveResponse.success) {
              console.log('[Push] Health check: Re-subscribed successfully');
              safeLocalStorageSet(getLastEndpointStorageKey(user.id), subscriptionJson.endpoint);
            } else {
              console.warn('[Push] Health check: Failed to save new subscription:', saveResponse.error);
            }
          }
        } else {
          // Subscription exists - check VAPID key match
          const serverVapidKey = await fetchVapidPublicKey();
          const subKey = subscription.options?.applicationServerKey;
          
          let vapidMismatch = false;
          if (subKey && serverVapidKey) {
            try {
              const subKeyArray = new Uint8Array(subKey as ArrayBuffer);
              const subKeyB64 = btoa(String.fromCharCode(...subKeyArray))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
              vapidMismatch = subKeyB64 !== serverVapidKey;
            } catch {
              console.warn('[Push] Health check: Could not compare VAPID keys');
            }
          }
          
          if (vapidMismatch) {
            // VAPID key mismatch - need to resubscribe with correct key
            console.warn('[Push] Health check: VAPID key mismatch detected! Re-subscribing with correct key...');
            
            try {
              // Unsubscribe old
              await subscription.unsubscribe();
              
              // Subscribe with correct key
              const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(serverVapidKey) as BufferSource,
              });
              
              const subscriptionJson = newSubscription.toJSON();
              
              if (subscriptionJson.endpoint && subscriptionJson.keys?.p256dh && subscriptionJson.keys?.auth) {
                const saveResponse = await selfHostedPost<{ success: boolean; error?: string }>('push-subscription-save', {
                  user_id: user.id,
                  endpoint: subscriptionJson.endpoint,
                  keys: {
                    p256dh: subscriptionJson.keys.p256dh,
                    auth: subscriptionJson.keys.auth,
                  },
                  user_agent: navigator.userAgent,
                });
                
                if (saveResponse.success) {
                  console.log('[Push] Health check: Re-subscribed with correct VAPID key');
                  safeLocalStorageSet(getLastEndpointStorageKey(user.id), subscriptionJson.endpoint);
                } else {
                  console.error('[Push] Health check: Failed to save corrected subscription:', saveResponse.error);
                }
              }
            } catch (resubError) {
              console.error('[Push] Health check: Failed to resubscribe after VAPID mismatch:', resubError);
            }
          } else {
            // VAPID matches - verify endpoint is up to date on server
            const storedEndpoint = safeLocalStorageGet(getLastEndpointStorageKey(user.id));
            
            if (storedEndpoint && storedEndpoint !== subscription.endpoint) {
              // Endpoint changed - update server
              console.log('[Push] Health check: Endpoint changed, updating server...');
              
              const subscriptionJson = subscription.toJSON();
              if (subscriptionJson.keys?.p256dh && subscriptionJson.keys?.auth) {
                await selfHostedPost<{ success: boolean }>('push-subscription-save', {
                  user_id: user.id,
                  endpoint: subscription.endpoint,
                  keys: {
                    p256dh: subscriptionJson.keys.p256dh,
                    auth: subscriptionJson.keys.auth,
                  },
                  user_agent: navigator.userAgent,
                });
                safeLocalStorageSet(getLastEndpointStorageKey(user.id), subscription.endpoint);
              }
            }
            
            console.log('[Push] Health check: Subscription valid, VAPID keys match');
          }
        }

        // Update last check time
        safeLocalStorageSet(healthCheckKey, String(now));
        
      } catch (error) {
        console.error('[Push] Health check failed:', error);
        // Don't update lastCheck on error - will retry next time
      }
    };

    // Run health check after a short delay (don't block initial render)
    const timeoutId = setTimeout(performHealthCheck, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [isSupported, user, state.isSubscribed, state.isLoading, getSWRegistration]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    toggle,
    refresh: checkSubscription,
  };
}
