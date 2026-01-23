import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteMessageRequest {
  messageId: string;
  clientId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { messageId, clientId }: DeleteMessageRequest = await req.json();

    console.log('Deleting message (WPP):', { messageId, clientId });

    // Get message info from database
    const { data: messageData, error: fetchError } = await supabase
      .from('chat_messages')
      .select('external_message_id, client_id, organization_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !messageData) {
      console.error('Error fetching message:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Message not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    if (!messageData.external_message_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'No external message ID found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get client data for phone number
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('phone')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData) {
      console.error('Error fetching client:', clientError);
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    if (!clientData.phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'No phone number available' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get WPP credentials
    const wppHost = Deno.env.get('WPP_HOST');
    const wppSecret = Deno.env.get('WPP_SECRET');

    if (!wppHost || !wppSecret) {
      console.error('WPP credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'WPP not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Get WPP session name (org_<uuid>)
    const sessionName = `org_${messageData.organization_id}`;

    // Generate WPP token
    const tokenUrl = `${wppHost}/api/${sessionName}/${wppSecret}/generate-token`;
    console.log('Generating WPP token:', tokenUrl);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    let wppToken = '';
    const tokenText = await tokenResponse.text();

    if (tokenResponse.ok && tokenText) {
      try {
        const tokenData = JSON.parse(tokenText);
        wppToken = tokenData.token || tokenData.bearer || tokenText;
      } catch {
        wppToken = tokenText;
      }
    }

    if (!wppToken) {
      console.error('Failed to generate WPP token');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to authenticate with WPP' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Prepare phone number
    const cleanPhone = clientData.phone.replace(/[^\d]/g, '');
    const remoteJid = `${cleanPhone}@c.us`;

    // Delete message via WPP API
    try {
      const deleteUrl = `${wppHost}/api/${sessionName}/delete-message`;
      console.log('Deleting message via WPP:', deleteUrl);

      const deleteResponse = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wppToken}`,
        },
        body: JSON.stringify({
          id: messageData.external_message_id,
          remoteJid: remoteJid,
        })
      });

      const deleteText = await deleteResponse.text();
      console.log('WPP delete response:', deleteText);

      if (deleteResponse.ok) {
        // Mark message as deleted in database
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ 
            message_text: '[Сообщение удалено]',
            external_message_id: null
          })
          .eq('id', messageId);

        if (updateError) {
          console.error('Error updating message in database:', updateError);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Message deleted successfully'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        throw new Error(`WPP API error: ${deleteResponse.status} - ${deleteText}`);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      const message = (error as any)?.message ?? 'Failed to delete message';
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to delete message: ${message}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    const message = (error as any)?.message ?? 'Unexpected error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
