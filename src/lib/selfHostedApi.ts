import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/errorUtils';

const SELF_HOSTED_API = "https://api.academyos.ru/functions/v1";

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatuses?: number[];
  /** Disable retry logic entirely */
  noRetry?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
  /** Number of retry attempts made */
  retryCount?: number;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  const delay = exponentialDelay + jitter;
  // Cap at maxDelay
  return Math.min(delay, maxDelay);
}

/**
 * Check if the error/status is retryable
 */
function isRetryable(status: number, retryableStatuses: number[]): boolean {
  return retryableStatuses.includes(status);
}

/**
 * Get the current user's auth token
 */
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make an authenticated request to the self-hosted API with retry support
 */
export async function selfHostedFetch<T = unknown>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    headers?: Record<string, string>;
    requireAuth?: boolean;
    retry?: RetryConfig;
  } = {}
): Promise<ApiResponse<T>> {
  const { 
    method = 'GET', 
    body, 
    headers = {},
    requireAuth = true,
    retry = {}
  } = options;

  const retryConfig = {
    maxRetries: retry.noRetry ? 0 : (retry.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries),
    baseDelayMs: retry.baseDelayMs ?? DEFAULT_RETRY_CONFIG.baseDelayMs,
    maxDelayMs: retry.maxDelayMs ?? DEFAULT_RETRY_CONFIG.maxDelayMs,
    retryableStatuses: retry.retryableStatuses ?? DEFAULT_RETRY_CONFIG.retryableStatuses,
  };

  let lastError: string | undefined;
  let lastStatus = 0;
  let retryCount = 0;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Get auth token if required
      let authToken: string | null = null;
      if (requireAuth) {
        authToken = await getAuthToken();
        if (!authToken) {
          return {
            success: false,
            error: 'Необходима авторизация',
            status: 401,
            retryCount: 0
          };
        }
      }

      // Build request headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      };

      if (authToken) {
        requestHeaders['Authorization'] = `Bearer ${authToken}`;
      }

      // Build URL
      const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${SELF_HOSTED_API}/${endpoint.replace(/^\//, '')}`;

      // Make request
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined
      });

      // Parse response
      let data: T | undefined;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          // Response wasn't valid JSON
        }
      }

      // Handle non-2xx responses
      if (!response.ok) {
        lastStatus = response.status;
        lastError = (data as Record<string, unknown>)?.error as string || 
                    (data as Record<string, unknown>)?.message as string || 
                    `HTTP ${response.status}`;

        // Check if we should retry
        if (attempt < retryConfig.maxRetries && isRetryable(response.status, retryConfig.retryableStatuses)) {
          const delay = calculateBackoffDelay(attempt, retryConfig.baseDelayMs, retryConfig.maxDelayMs);
          console.log(`[selfHostedFetch] Retry ${attempt + 1}/${retryConfig.maxRetries} for ${endpoint} after ${Math.round(delay)}ms (status: ${response.status})`);
          await sleep(delay);
          retryCount++;
          continue;
        }

        return {
          success: false,
          error: lastError,
          data,
          status: response.status,
          retryCount
        };
      }

      return {
        success: true,
        data,
        status: response.status,
        retryCount
      };

    } catch (error) {
      lastError = getErrorMessage(error);
      lastStatus = 0;
      console.error(`[selfHostedFetch] Error calling ${endpoint} (attempt ${attempt + 1}):`, error);

      // Retry on network errors
      if (attempt < retryConfig.maxRetries) {
        const delay = calculateBackoffDelay(attempt, retryConfig.baseDelayMs, retryConfig.maxDelayMs);
        console.log(`[selfHostedFetch] Retry ${attempt + 1}/${retryConfig.maxRetries} for ${endpoint} after ${Math.round(delay)}ms (network error)`);
        await sleep(delay);
        retryCount++;
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastError || 'Request failed after retries',
    status: lastStatus,
    retryCount
  };
}

/**
 * Shorthand for GET requests
 */
export function selfHostedGet<T = unknown>(
  endpoint: string,
  options?: Omit<Parameters<typeof selfHostedFetch>[1], 'method'>
) {
  return selfHostedFetch<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Shorthand for POST requests
 */
export function selfHostedPost<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<Parameters<typeof selfHostedFetch>[1], 'method' | 'body'>
) {
  return selfHostedFetch<T>(endpoint, { ...options, method: 'POST', body });
}

/**
 * Shorthand for DELETE requests
 */
export function selfHostedDelete<T = unknown>(
  endpoint: string,
  options?: Omit<Parameters<typeof selfHostedFetch>[1], 'method'>
) {
  return selfHostedFetch<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Shorthand for PUT requests
 */
export function selfHostedPut<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<Parameters<typeof selfHostedFetch>[1], 'method' | 'body'>
) {
  return selfHostedFetch<T>(endpoint, { ...options, method: 'PUT', body });
}

/**
 * Shorthand for PATCH requests
 */
export function selfHostedPatch<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<Parameters<typeof selfHostedFetch>[1], 'method' | 'body'>
) {
  return selfHostedFetch<T>(endpoint, { ...options, method: 'PATCH', body });
}

export { SELF_HOSTED_API, DEFAULT_RETRY_CONFIG };
