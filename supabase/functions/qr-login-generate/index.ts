import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body (optional browser info)
    let browserInfo = null;
    try {
      const body = await req.json();
      browserInfo = body.browser_info || null;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Generate a cryptographically secure token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create token in database
    const { data, error } = await supabase
      .from('qr_login_tokens')
      .insert({
        token,
        status: 'pending',
        browser_info: browserInfo,
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2 minutes
      })
      .select('id, token, expires_at')
      .single();

    if (error) {
      console.error('Error creating QR token:', error);
      throw error;
    }

    // Clean up old expired tokens (fire and forget)
    supabase.rpc('cleanup_expired_qr_tokens').then(() => {
      console.log('Cleaned up expired tokens');
    }).catch(err => {
      console.log('Cleanup failed (non-critical):', err.message);
    });

    console.log(`Generated QR token: ${token.substring(0, 8)}...`);

    // Build the QR URL that mobile app will scan
    const qrUrl = `academyos://qr-login?token=${token}`;
    
    // Also provide a web fallback URL
    const webConfirmUrl = `${supabaseUrl.replace('api.', '')}/auth/qr-confirm?token=${token}`;

    return successResponse({
      success: true,
      token,
      qr_url: qrUrl,
      web_confirm_url: webConfirmUrl,
      expires_at: data.expires_at,
      ttl_seconds: 120
    });

  } catch (error: unknown) {
    console.error('Error in qr-login-generate:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
