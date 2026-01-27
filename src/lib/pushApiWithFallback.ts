/**
 * Push API with Self-Hosted fallback
 * 
 * Tries Lovable Cloud first (primary), falls back to self-hosted
 * if Cloud is unavailable.
 */
import { selfHostedPost } from './selfHostedApi';

// Lovable Cloud Supabase configuration (PRIMARY)
const LOVABLE_CLOUD_URL = 'https://igqdjqmohwsgyeuhitqg.supabase.co';
const LOVABLE_CLOUD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWRqcW1vaHdzZ3lldWhpdHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODgxNTUsImV4cCI6MjA4NDg2NDE1NX0.Sp6Ab2BHF_nKi-ZgIKl8pJ1jhz8DmODoYHSXbpMaUpw';

export type PushApiSource = 'lovable-cloud' | 'self-hosted';

export interface PushApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  source: PushApiSource;
}

interface FallbackOptions {
  /** Maximum retry attempts for primary (default: 1) */
  maxRetries?: number;
  /** Enable fallback to self-hosted (default: true) */
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
 * Call Lovable Cloud edge function
 * 
 * NOTE: We do NOT send JWT tokens from self-hosted Supabase to Lovable Cloud
 * because they have different JWT secrets. Instead, we rely on API key auth
 * and pass user_id in the request body.
 */
async function callLovableCloud<T>(
  endpoint: string,
  body?: unknown,
  _options: { requireAuth?: boolean } = {}
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  try {
    const url = `${LOVABLE_CLOUD_URL}/functions/v1/${endpoint}`;
    
    // Only use API key - JWT from self-hosted won't validate in Lovable Cloud
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': LOVABLE_CLOUD_ANON_KEY,
      // Some runtimes/proxies don't forward `apikey` reliably; `Authorization` is widely supported.
      // We send the anon key (NOT a self-hosted JWT).
      'Authorization': `Bearer ${LOVABLE_CLOUD_ANON_KEY}`,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
      return { success: false, error: errorMessage, status: response.status };
    }

    const data = await response.json().catch(() => ({})) as T;
    return { success: true, data, status: response.status };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Lovable Cloud request failed',
    };
  }
}

/**
 * Call self-hosted edge function (fallback)
 */
async function callSelfHosted<T>(
  endpoint: string,
  body?: unknown,
  options: { requireAuth?: boolean } = {}
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const { requireAuth = true } = options;
  
  const res = await selfHostedPost<T>(endpoint, body, {
    retry: { noRetry: true }, // Disable internal retry for faster response
    requireAuth,
  });

  return {
    success: res.success,
    data: res.data,
    error: res.error,
    status: res.status,
  };
}

// Endpoints that should prefer self-hosted first due to auth incompatibility
const SELF_HOSTED_FIRST_ENDPOINTS = [
  'push-subscription-save',
  'push-subscription-delete',
  'portal-push-subscribe',
  'portal-push-unsubscribe',
];

/**
 * Make a push-related API call with automatic fallback
 * 
 * For subscription endpoints: Self-hosted first (auth compatible), Cloud fallback
 * For other endpoints: Lovable Cloud first (primary), Self-hosted fallback
 */
export async function pushApiWithFallback<T = unknown>(
  endpoint: string,
  body?: unknown,
  options: FallbackOptions = {}
): Promise<PushApiResponse<T>> {
  const { maxRetries = 1, fallbackEnabled = true, requireAuth = true } = options;

  // Determine primary/fallback order based on endpoint
  const useSelfHostedFirst = SELF_HOSTED_FIRST_ENDPOINTS.includes(endpoint);
  
  if (useSelfHostedFirst) {
    // STRATEGY A: Self-hosted first for subscription endpoints
    return await pushApiWithSelfHostedFirst<T>(endpoint, body, { maxRetries, fallbackEnabled, requireAuth });
  } else {
    // STRATEGY B: Lovable Cloud first for other endpoints
    return await pushApiWithCloudFirst<T>(endpoint, body, { maxRetries, fallbackEnabled, requireAuth });
  }
}

/**
 * Self-hosted first strategy (for subscription endpoints)
 */
async function pushApiWithSelfHostedFirst<T>(
  endpoint: string,
  body?: unknown,
  options: FallbackOptions = {}
): Promise<PushApiResponse<T>> {
  const { maxRetries = 1, fallbackEnabled = true, requireAuth = true } = options;

  // 1. Try Self-hosted first (PRIMARY for subscriptions)
  console.log(`[PushAPI] 🏠 ${endpoint} trying self-hosted first (subscription endpoint)`);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const selfHostedResponse = await callSelfHosted<T>(endpoint, body, { requireAuth });

    if (selfHostedResponse.success) {
      lastSuccessfulSource = 'self-hosted';
      console.log(`[PushAPI] ✅ ${endpoint} via self-hosted (primary)`);
      return { success: true, data: selfHostedResponse.data, source: 'self-hosted' };
    }

    // Only retry on network/server errors, not client errors
    if (selfHostedResponse.status && selfHostedResponse.status >= 400 && selfHostedResponse.status < 500) {
      console.warn(`[PushAPI] ⚠️ ${endpoint} self-hosted client error (${selfHostedResponse.status}):`, selfHostedResponse.error);
      break; // Don't retry client errors
    }

    console.warn(`[PushAPI] ⚠️ ${endpoint} self-hosted attempt ${attempt + 1} failed:`, selfHostedResponse.error);

    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 2. Fallback to Lovable Cloud
  if (fallbackEnabled) {
    console.log(`[PushAPI] 🔄 Falling back to Lovable Cloud for: ${endpoint}`);

    const cloudResponse = await callLovableCloud<T>(endpoint, body, { requireAuth });

    if (cloudResponse.success) {
      lastSuccessfulSource = 'lovable-cloud';
      console.log(`[PushAPI] ✅ ${endpoint} via Lovable Cloud (fallback)`);
      return { success: true, data: cloudResponse.data, source: 'lovable-cloud' };
    }

    console.error(`[PushAPI] ❌ ${endpoint} Lovable Cloud fallback failed:`, cloudResponse.error);
    return { success: false, error: cloudResponse.error, source: 'lovable-cloud' };
  }

  return {
    success: false,
    error: 'All push API attempts failed',
    source: 'self-hosted',
  };
}

/**
 * Lovable Cloud first strategy (for send/config endpoints)
 */
async function pushApiWithCloudFirst<T>(
  endpoint: string,
  body?: unknown,
  options: FallbackOptions = {}
): Promise<PushApiResponse<T>> {
  const { maxRetries = 1, fallbackEnabled = true, requireAuth = true } = options;

  // 1. Try Lovable Cloud first (PRIMARY)
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const cloudResponse = await callLovableCloud<T>(endpoint, body, { requireAuth });

    if (cloudResponse.success) {
      lastSuccessfulSource = 'lovable-cloud';
      console.log(`[PushAPI] ✅ ${endpoint} via Lovable Cloud (primary)`);
      return { success: true, data: cloudResponse.data, source: 'lovable-cloud' };
    }

    // Client errors (4xx except 408, 429)
    // IMPORTANT: 401/403 are often caused by cross-environment auth differences (self-hosted JWTs vs Cloud).
    // In this case we should ALLOW fallback to self-hosted.
    if (
      cloudResponse.status &&
      cloudResponse.status >= 400 &&
      cloudResponse.status < 500 &&
      cloudResponse.status !== 408 &&
      cloudResponse.status !== 429
    ) {
      if (cloudResponse.status === 401 || cloudResponse.status === 403) {
        console.warn(
          `[PushAPI] ⚠️ ${endpoint} Lovable Cloud auth error (${cloudResponse.status}) -> allow fallback:`,
          cloudResponse.error
        );
      } else {
        console.warn(
          `[PushAPI] ❌ ${endpoint} Lovable Cloud client error (${cloudResponse.status}):`,
          cloudResponse.error
        );
        return { success: false, error: cloudResponse.error, source: 'lovable-cloud' };
      }
    }

    console.warn(`[PushAPI] ⚠️ ${endpoint} Lovable Cloud attempt ${attempt + 1} failed:`, cloudResponse.error);

    // Small delay between retries
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 2. Fallback to self-hosted
  if (fallbackEnabled) {
    console.log(`[PushAPI] 🔄 Falling back to self-hosted for: ${endpoint}`);

    const selfHostedResponse = await callSelfHosted<T>(endpoint, body, { requireAuth });

    if (selfHostedResponse.success) {
      lastSuccessfulSource = 'self-hosted';
      console.log(`[PushAPI] ✅ ${endpoint} via self-hosted (fallback)`);
      return { success: true, data: selfHostedResponse.data, source: 'self-hosted' };
    }

    console.error(`[PushAPI] ❌ ${endpoint} self-hosted fallback failed:`, selfHostedResponse.error);
    return { success: false, error: selfHostedResponse.error, source: 'self-hosted' };
  }

  // Both failed or fallback disabled
  return {
    success: false,
    error: 'All push API attempts failed',
    source: 'lovable-cloud',
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
  return { vapidKey: HARDCODED_VAPID, source: 'lovable-cloud' };
}

/**
 * Send push notification with fallback
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
