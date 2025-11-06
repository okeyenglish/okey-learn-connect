import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EditMessageRequest {
  messageId: string;
  newMessage: string;
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

    const { messageId, newMessage, clientId }: EditMessageRequest = await req.json();

    console.log('Editing message (WPP):', { messageId, newMessage, clientId });

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

    // Edit message via WPP API
    try {
      const editUrl = `${wppHost}/api/${sessionName}/edit-message`;
      console.log('Editing message via WPP:', editUrl);

      const editResponse = await fetch(editUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wppToken}`,
        },
        body: JSON.stringify({
          id: messageData.external_message_id,
          remoteJid: remoteJid,
          text: newMessage,
        })
      });

      const editText = await editResponse.text();
      console.log('WPP edit response:', editText);

      if (editResponse.ok) {
        // Update message in database
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ 
            message_text: newMessage,
          })
          .eq('id', messageId);

        if (updateError) {
          console.error('Error updating message in database:', updateError);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Message edited successfully'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        throw new Error(`WPP API error: ${editResponse.status} - ${editText}`);
      }
    } catch (error) {
      console.error('Error editing message:', error);
      const message = (error as any)?.message ?? 'Failed to edit message';
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to edit message: ${message}`
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
