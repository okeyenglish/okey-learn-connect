/**
 * WPP API helper functions for WhatsApp session management
 * Uses selfHostedApi for all WPP edge function calls
 */
import { selfHostedPost, selfHostedGet } from './selfHostedApi';

// ============================================================================
// Types
// ============================================================================

export interface WppCreateResponse {
  success: boolean;
  session?: string;
  apiKey?: string;
  status: 'connected' | 'starting' | 'qr_issued' | 'error';
  qrcode?: string;
  error?: string;
}

export interface WppQrResponse {
  success: boolean;
  qr?: string | null;
  error?: string;
}

export interface WppStatusResponse {
  success: boolean;
  status: 'connected' | 'qr_issued' | 'qr_pending' | 'disconnected' | 'error';
  qrcode?: string;
  last_qr_at?: string;
  account_number?: string;
  message?: string;
}

// Legacy types for backward compatibility
export interface WppProvisionResponse {
  success: boolean;
  status: 'qr_issued' | 'connected' | 'starting' | 'error';
  qrcode?: string;
  integration_id?: string;
  account_number?: string;
  api_key?: string;
  session?: string;
  error?: string;
}

export interface WppStartResponse {
  status?: string;
  session_name?: string;
  qrcode?: string;
  message?: string;
}

// ============================================================================
// New API (Plan implementation)
// ============================================================================

/**
 * Create WPP integration automatically
 * POST /wpp-create
 * Returns session, apiKey (masked), status, and optionally QR code
 */
export const wppCreate = async (forceRecreate = false): Promise<WppCreateResponse> => {
  const response = await selfHostedPost<WppCreateResponse>('wpp-create', {
    force_recreate: forceRecreate,
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to create WPP integration');
  }
  
  return response.data || { success: false, status: 'error', error: 'No data returned' };
};

/**
 * Get QR code for session
 * GET /wpp-qr?session={session} or POST /wpp-qr { session }
 */
export const wppQr = async (session: string): Promise<WppQrResponse> => {
  const response = await selfHostedGet<WppQrResponse>(`wpp-qr?session=${encodeURIComponent(session)}`);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to get QR code');
  }
  
  return response.data || { success: false, qr: null };
};

/**
 * Get WPP session status
 * POST /wpp-status with session parameter
 */
export const wppGetStatus = async (session: string, force = false): Promise<WppStatusResponse> => {
  const response = await selfHostedPost<WppStatusResponse>('wpp-status', {
    session_name: session,
    force,
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to get WPP status');
  }
  
  return response.data || { success: false, status: 'error' };
};

// ============================================================================
// Legacy API (for backward compatibility)
// ============================================================================

/**
 * Get WPP session status (legacy)
 * @deprecated Use wppGetStatus instead
 */
export const wppStatus = async (sessionName: string, force = false): Promise<{
  status?: 'connected' | 'disconnected' | 'qr_issued';
  qrcode?: string;
  session_name?: string;
}> => {
  const response = await selfHostedPost<WppStatusResponse>('wpp-status', {
    session_name: sessionName,
    force,
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to get WPP status');
  }
  
  const data = response.data;
  return {
    status: data?.status === 'connected' ? 'connected' : 
            data?.status === 'qr_issued' ? 'qr_issued' : 'disconnected',
    qrcode: data?.qrcode,
    session_name: data?.account_number,
  };
};

/**
 * Start a new WPP session (legacy)
 * @deprecated Use wppCreate instead
 */
export const wppStart = async (sessionSuffix?: string): Promise<WppStartResponse> => {
  const body = sessionSuffix ? { session_suffix: sessionSuffix } : {};
  const response = await selfHostedPost<WppStartResponse>('wpp-start', body);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to start WPP session');
  }
  
  return response.data || {};
};

/**
 * Disconnect a WPP session
 * @param integrationId - ID of the integration from messenger_integrations table
 */
export const wppDisconnect = async (integrationId: string): Promise<void> => {
  const response = await selfHostedPost('wpp-disconnect', {
    integration_id: integrationId,
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to disconnect WPP session');
  }
};

/**
 * Auto-provision WPP integration (legacy)
 * @deprecated Use wppCreate instead
 */
export const wppProvision = async (): Promise<WppProvisionResponse> => {
  const response = await selfHostedPost<WppProvisionResponse>('wpp-provision', {});
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to provision WPP');
  }
  
  return response.data || { success: false, status: 'error', error: 'No data returned' };
};
