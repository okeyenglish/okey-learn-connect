import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/errorUtils';

const SELF_HOSTED_API = "https://api.academyos.ru/functions/v1";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

/**
 * Get the current user's auth token
 */
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make an authenticated request to the self-hosted API
 */
export async function selfHostedFetch<T = unknown>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    headers?: Record<string, string>;
    requireAuth?: boolean;
  } = {}
): Promise<ApiResponse<T>> {
  const { 
    method = 'GET', 
    body, 
    headers = {},
    requireAuth = true 
  } = options;

  try {
    // Get auth token if required
    let authToken: string | null = null;
    if (requireAuth) {
      authToken = await getAuthToken();
      if (!authToken) {
        return {
          success: false,
          error: 'Необходима авторизация',
          status: 401
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
      const errorMessage = (data as any)?.error || 
                          (data as any)?.message || 
                          `HTTP ${response.status}`;
      return {
        success: false,
        error: errorMessage,
        data,
        status: response.status
      };
    }

    return {
      success: true,
      data,
      status: response.status
    };

  } catch (error) {
    console.error(`[selfHostedFetch] Error calling ${endpoint}:`, error);
    return {
      success: false,
      error: getErrorMessage(error),
      status: 0
    };
  }
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

export { SELF_HOSTED_API };
