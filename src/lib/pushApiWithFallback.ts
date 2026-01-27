/**
 * Push API with Lovable Cloud fallback
 * 
 * Tries self-hosted (api.academyos.ru) first, falls back to Lovable Cloud
 * if self-hosted is unavailable.
 */
import { selfHostedPost } from './selfHostedApi';
import { supabase } from '@/integrations/supabase/client';

// Lovable Cloud Supabase client for fallback
const LOVABLE_CLOUD_URL = 'https://igqdjqmohwsgyeuhitqg.supabase.co';
const LOVABLE_CLOUD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWRqcW1vaHdzZ3lldWhpdHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODgxNTUsImV4cCI6MjA4NDg2NDE1NX0.Sp6Ab2BHF_nKi-ZgIKl8pJ1jhz8DmODoYHSXbpMaUpw';

export type PushApiSource = 'self-hosted' | 'lovable-cloud';

export interface PushApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  source: PushApiSource;
}

interface FallbackOptions {
  /** Maximum retry attempts for self-hosted (default: 1) */
  maxRetries?: number;
  /** Enable fallback to Lovable Cloud (default: true) */
  fallbackEnabled?: boolean;
  /** Require authentication for the request (default: true) */
  requireAuth?: boolean;
}

// Track which source was last successful for diagnostics
let lastSuccessfulSource: PushApiSource | null = null;

/**
 * Get the last successful API source
 */
export function getLastPushApiSource(): PushApiSource | null {
  return lastSuccessfulSource;
}

/**
 * Make a push-related API call with automatic fallback to Lovable Cloud
 */
export async function pushApiWithFallback<T = unknown>(
  endpoint: string,
  body?: unknown,
  options: FallbackOptions = {}
): Promise<PushApiResponse<T>> {
  const { maxRetries = 1, fallbackEnabled = true, requireAuth = true } = options;

  // 1. Try self-hosted first (with minimal retries for faster fallback)
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await selfHostedPost<T>(endpoint, body, {
        retry: { noRetry: true }, // Disable internal retry for faster fallback
        requireAuth,
      });

      if (res.success) {
        lastSuccessfulSource = 'self-hosted';
        console.log(`[PushAPI] ✅ ${endpoint} via self-hosted`);
        return { success: true, data: res.data, source: 'self-hosted' };
      }

      // Client errors (4xx except 408, 429) - don't fallback, return error
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        console.warn(`[PushAPI] ❌ ${endpoint} client error (${res.status}):`, res.error);
        return { success: false, error: res.error, source: 'self-hosted' };
      }

      // Server error - will try fallback
      console.warn(`[PushAPI] ⚠️ ${endpoint} self-hosted attempt ${attempt + 1} failed:`, res.error);
    } catch (e) {
      console.warn(`[PushAPI] ⚠️ ${endpoint} self-hosted attempt ${attempt + 1} exception:`, e);
    }

    // Small delay between retries
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 2. Fallback to Lovable Cloud
  if (fallbackEnabled) {
    console.log(`[PushAPI] 🔄 Falling back to Lovable Cloud for: ${endpoint}`);

    try {
      // Use direct fetch to Lovable Cloud edge functions
      const url = `${LOVABLE_CLOUD_URL}/functions/v1/${endpoint}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': LOVABLE_CLOUD_ANON_KEY,
      };

      // Get auth token from current session if required
      if (requireAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
        console.error(`[PushAPI] ❌ ${endpoint} Lovable Cloud error:`, errorMessage);
        return { success: false, error: errorMessage, source: 'lovable-cloud' };
      }

      const data = await response.json().catch(() => ({})) as T;
      lastSuccessfulSource = 'lovable-cloud';
      console.log(`[PushAPI] ✅ ${endpoint} via Lovable Cloud (fallback)`);
      return { success: true, data, source: 'lovable-cloud' };
    } catch (e) {
      console.error(`[PushAPI] ❌ ${endpoint} Lovable Cloud exception:`, e);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Fallback request failed',
        source: 'lovable-cloud',
      };
    }
  }

  // Both failed
  return {
    success: false,
    error: 'All push API attempts failed',
    source: 'self-hosted',
  };
}

/**
 * Fetch VAPID public key with fallback
 */
export async function fetchVapidKeyWithFallback(): Promise<{
  vapidKey: string;
  source: PushApiSource;
}> {
  const HARDCODED_VAPID = 'BNCGXWZNiciyztYDIZPXM_smN8mBxrfFPIG_ohpea-9H5B0Gl-zjfWkh7XJOemAh2iDQR87V3f54LQ12DRJfl6s';

  const response = await pushApiWithFallback<{ vapidPublicKey?: string }>(
    'portal-push-config',
    undefined,
    { requireAuth: false }
  );

  if (response.success && response.data?.vapidPublicKey) {
    return { vapidKey: response.data.vapidPublicKey, source: response.source };
  }

  console.warn('[PushAPI] Using hardcoded VAPID fallback');
  return { vapidKey: HARDCODED_VAPID, source: 'self-hosted' };
}

/**
 * Send push notification with fallback to Lovable Cloud
 * 
 * @param userId - Target user ID (for CRM managers)
 * @param payload - Notification payload
 * @returns PushApiResponse with delivery result
 */
export async function sendPushWithFallback(
  userId: string,
  payload: { 
    title: string; 
    body: string; 
    url?: string; 
    tag?: string;
    icon?: string;
  }
): Promise<PushApiResponse<{ sent?: number; failed?: number; total?: number }>> {
  const response = await pushApiWithFallback<{ sent?: number; failed?: number; total?: number }>(
    'send-push-notification',
    { user_id: userId, payload },
    { requireAuth: true }
  );
  
  return response;
}

/**
 * Send push notification to multiple users with fallback
 */
export async function sendPushToUsersWithFallback(
  userIds: string[],
  payload: { 
    title: string; 
    body: string; 
    url?: string; 
    tag?: string;
    icon?: string;
  }
): Promise<PushApiResponse<{ sent?: number; failed?: number; total?: number }>> {
  const response = await pushApiWithFallback<{ sent?: number; failed?: number; total?: number }>(
    'send-push-notification',
    { user_ids: userIds, payload },
    { requireAuth: true }
  );
  
  return response;
}

/**
 * Send portal push notification (to clients via parent portal)
 */
export async function sendPortalPushWithFallback(
  clientId: string,
  title: string,
  body: string,
  options?: { url?: string; tag?: string }
): Promise<PushApiResponse<{ statusCode?: number }>> {
  const response = await pushApiWithFallback<{ statusCode?: number }>(
    'portal-push-send',
    { client_id: clientId, title, body, ...options },
    { requireAuth: true }
  );
  
  return response;
}
