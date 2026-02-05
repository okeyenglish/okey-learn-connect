import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppMsgClient } from '../_shared/wpp.ts';
import { 
  corsHeaders, 
  errorResponse,
  getErrorMessage,
  handleCors,
} from '../_shared/types.ts';

const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';

console.log('[wpp-disconnect] Configuration:', { WPP_BASE_URL });

interface WppDisconnectRequest {
  integration_id?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({})) as WppDisconnectRequest;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orgId = profile.organization_id;
    console.log('[wpp-disconnect] Org ID:', orgId);

    // Find WPP integration
    let integrationQuery = supabaseClient
      .from('messenger_integrations')
      .select('id, settings')
      .eq('organization_id', orgId)
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wpp')
      .eq('is_active', true);

    if (body.integration_id) {
      integrationQuery = integrationQuery.eq('id', body.integration_id);
    } else {
      integrationQuery = integrationQuery.eq('is_primary', true);
    }

    const { data: integration } = await integrationQuery.maybeSingle();

    if (!integration) {
      return new Response(JSON.stringify({ error: 'WPP integration not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const settings = (integration.settings || {}) as Record<string, any>;
    const wppApiKey = settings.wppApiKey;
    const wppAccountNumber = settings.wppAccountNumber;

    if (!wppApiKey || !wppAccountNumber) {
      return new Response(JSON.stringify({ error: 'wppApiKey or wppAccountNumber not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[wpp-disconnect] Account number:', wppAccountNumber);

    // Create WPP client and delete account
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: wppApiKey,
    });

    await wpp.deleteAccount(wppAccountNumber);

    // Deactivate and delete the integration from messenger_integrations
    const { error: deleteError } = await supabaseClient
      .from('messenger_integrations')
      .delete()
      .eq('id', integration.id);

    if (deleteError) {
      console.error('[wpp-disconnect] Failed to delete integration:', deleteError);
      // Still return success since WPP account was deleted
    }

    // Update session status in DB (if whatsapp_sessions table is used)
    const sessionName = `wpp_${wppAccountNumber}`;
    await supabaseClient
      .from('whatsapp_sessions')
      .upsert({
        organization_id: orgId,
        session_name: sessionName,
        status: 'disconnected',
        last_qr_b64: null,
        last_qr_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_name' });

    console.log('[wpp-disconnect] Successfully disconnected and deleted integration:', integration.id);

    return new Response(
      JSON.stringify({ ok: true, success: true, status: 'disconnected' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[wpp-disconnect] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, success: false, error: getErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
