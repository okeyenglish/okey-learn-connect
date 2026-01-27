/**
 * usePWAUpdate hook
 * 
 * Manages PWA/Service Worker update lifecycle:
 * - Detects when a new SW version is available
 * - Shows UI prompt to update
 * - Handles SKIP_WAITING + reload
 * - Provides cache reset utility
 */
import { useState, useEffect, useCallback } from 'react';

// Build timestamp embedded at bundle time (via Vite define or fallback)
export const BUILD_VERSION = __BUILD_TIMESTAMP__ ?? 'dev';
export const SW_VERSION = 'push-support-v5'; // Must match src/sw.ts marker

declare const __BUILD_TIMESTAMP__: string | undefined;

interface PWAUpdateState {
  /** SW is supported and registered */
  isSupported: boolean;
  /** A new SW is waiting to activate */
  updateAvailable: boolean;
  /** Currently processing update */
  isUpdating: boolean;
  /** Active SW scope (if any) */
  swScope: string | null;
  /** Error message if something failed */
  error: string | null;
}

export function usePWAUpdate() {
  const [state, setState] = useState<PWAUpdateState>({
    isSupported: false,
    updateAvailable: false,
    isUpdating: false,
    swScope: null,
    error: null,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check SW support and registration on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    let cancelled = false;

    const checkRegistration = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (cancelled) return;

        if (reg) {
          setRegistration(reg);
          setState(prev => ({
            ...prev,
            isSupported: true,
            swScope: reg.scope,
            updateAvailable: !!reg.waiting,
          }));

          // Listen for new SW waiting
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New SW is waiting
                  setState(prev => ({ ...prev, updateAvailable: true }));
                }
              });
            }
          });

          // Check for updates periodically (every 30 min)
          const interval = setInterval(() => {
            reg.update().catch(() => {});
          }, 30 * 60 * 1000);

          return () => clearInterval(interval);
        } else {
          setState(prev => ({ ...prev, isSupported: true, swScope: null }));
        }
      } catch (err) {
        console.warn('[PWAUpdate] Error checking SW registration:', err);
        setState(prev => ({ 
          ...prev, 
          isSupported: false,
          error: err instanceof Error ? err.message : 'SW check failed'
        }));
      }
    };

    checkRegistration();

    // Listen for controller change (SW activated)
    const onControllerChange = () => {
      // New SW took control - reload to use new assets
      console.log('[PWAUpdate] Controller changed, reloading...');
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  // Apply pending update (SKIP_WAITING)
  const applyUpdate = useCallback(async () => {
    if (!registration?.waiting) {
      console.warn('[PWAUpdate] No waiting SW to apply');
      return false;
    }

    setState(prev => ({ ...prev, isUpdating: true }));

    try {
      // Tell the waiting SW to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // The controllerchange listener will trigger reload
      return true;
    } catch (err) {
      console.error('[PWAUpdate] Failed to apply update:', err);
      setState(prev => ({ 
        ...prev, 
        isUpdating: false,
        error: err instanceof Error ? err.message : 'Update failed'
      }));
      return false;
    }
  }, [registration]);

  // Force check for updates
  const checkForUpdates = useCallback(async () => {
    if (!registration) return false;

    try {
      await registration.update();
      return true;
    } catch (err) {
      console.warn('[PWAUpdate] Update check failed:', err);
      return false;
    }
  }, [registration]);

  // Reset all PWA caches and unregister SW
  const resetPWACache = useCallback(async () => {
    setState(prev => ({ ...prev, isUpdating: true }));

    try {
      // 1. Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      console.log(`[PWAUpdate] Unregistered ${registrations.length} service workers`);

      // 2. Clear all caches
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map(key => caches.delete(key)));
      console.log(`[PWAUpdate] Deleted ${cacheKeys.length} caches`);

      // 3. Clear push-related localStorage keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('push:') ||
          key.startsWith('pwa:') ||
          key.startsWith('sw:')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[PWAUpdate] Removed ${keysToRemove.length} localStorage keys`);

      // 4. Reload the page
      window.location.reload();
      return true;
    } catch (err) {
      console.error('[PWAUpdate] Reset failed:', err);
      setState(prev => ({ 
        ...prev, 
        isUpdating: false,
        error: err instanceof Error ? err.message : 'Reset failed'
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    buildVersion: BUILD_VERSION,
    swVersion: SW_VERSION,
    applyUpdate,
    checkForUpdates,
    resetPWACache,
  };
}
