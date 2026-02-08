import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  getErrorMessage,
  type WhatsAppEditRequest,
} from '../_shared/types.ts';

const WAPPI_BASE_URL = 'https://wappi.pro';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WappiSettings {
  wappiProfileId?: string;
  wappiApiToken?: string;
}

interface WappiEditResponse {
  status?: string;
  description?: string;
  message?: string;
  error?: string;
}

async function getWappiSettings(organizationId: string): Promise<WappiSettings | null> {
  // 1. First try messenger_integrations (priority)
  const { data: integration } = await supabase
    .from('messenger_integrations')
    .select('id, settings, is_primary')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'wappi')
    .eq('is_enabled', true)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (integration?.settings) {
    const settings = integration.settings as Record<string, unknown>;
    if (settings.wappiProfileId && settings.wappiApiToken) {
      return {
        wappiProfileId: String(settings.wappiProfileId),
        wappiApiToken: String(settings.wappiApiToken),
      };
    }
  }

  // 2. Fallback to messenger_settings
  const { data: legacySettings } = await supabase
    .from('messenger_settings')
    .select('settings')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'wappi')
    .eq('is_enabled', true)
    .maybeSingle();

  if (legacySettings?.settings) {
    const settings = legacySettings.settings as Record<string, unknown>;
    if (settings.wappiProfileId && settings.wappiApiToken) {
      return {
        wappiProfileId: String(settings.wappiProfileId),
        wappiApiToken: String(settings.wappiApiToken),
      };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { messageId, newMessage, clientId } = await req.json() as WhatsAppEditRequest;

    if (!messageId || !newMessage || !clientId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'messageId, newMessage, and clientId are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get message details
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, external_id, client_id, organization_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Message not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const organizationId = message.organization_id;
    if (!organizationId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Organization not found for message'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Wappi credentials for the organization
    const wappiSettings = await getWappiSettings(organizationId);

    if (!wappiSettings) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wappi settings not found for this organization'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profileId = wappiSettings.wappiProfileId;
    const apiToken = wappiSettings.wappiApiToken;

    if (!profileId || !apiToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing Wappi credentials'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Using Wappi profile:', profileId);

    // If no external_id, just update in database
    if (!message.external_id) {
      console.log('No external_id, updating only in database');
      
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ content: newMessage })
        .eq('id', messageId);

      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Message updated in database only (no external message ID)',
        localOnly: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Wappi API to edit message
    const url = `${WAPPI_BASE_URL}/api/sync/message/edit?profile_id=${profileId}`;

    console.log('Editing message via Wappi:', message.external_id);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message_id: message.external_id,
        body: newMessage
      })
    });

    const text = await response.text();
    let result: WappiEditResponse;

    try {
      result = JSON.parse(text);
    } catch {
      console.error('Wappi returned non-JSON response:', text.substring(0, 200));
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid response from Wappi API'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Wappi edit response:', result);

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: result.description || result.message || 'Failed to edit message'
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update message in database
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ content: newMessage })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message in database:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Message edited successfully',
      messageId: messageId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error editing message via Wappi:', error);

    return new Response(JSON.stringify({
      success: false,
      error: getErrorMessage(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
