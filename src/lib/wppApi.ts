/**
 * WPP API helper functions for WhatsApp session management
 * Uses selfHostedApi for all WPP edge function calls
 */
import { selfHostedPost } from './selfHostedApi';

export interface WppStatusResponse {
  status?: 'connected' | 'disconnected' | 'qr_issued';
  qrcode?: string;
  session_name?: string;
}

export interface WppProvisionResponse {
  success: boolean;
  status: 'qr_issued' | 'connected' | 'starting' | 'error';
  qrcode?: string;
  integration_id?: string;
  account_number?: string;
  error?: string;
}

export interface WppStartResponse {
  status?: string;
  session_name?: string;
  qrcode?: string;
  message?: string;
}

/**
 * Get WPP session status
 */
export const wppStatus = async (sessionName: string, force = false): Promise<WppStatusResponse> => {
  const response = await selfHostedPost<WppStatusResponse>('wpp-status', {
    session_name: sessionName,
    force,
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to get WPP status');
  }
  
  return response.data || {};
};

/**
 * Start a new WPP session
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
 */
export const wppDisconnect = async (sessionName: string): Promise<void> => {
  const response = await selfHostedPost('wpp-disconnect', {
    session_name: sessionName,
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to disconnect WPP session');
  }
};

/**
 * Auto-provision WPP integration (creates integration + starts account + returns QR)
 * This is the simplified one-click connection flow
 */
export const wppProvision = async (): Promise<WppProvisionResponse> => {
  const response = await selfHostedPost<WppProvisionResponse>('wpp-provision', {});
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to provision WPP');
  }
  
  return response.data || { success: false, status: 'error', error: 'No data returned' };
};
