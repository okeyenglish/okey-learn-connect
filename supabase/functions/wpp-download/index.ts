import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, organizationId } = await req.json();
    
    console.log(`[wpp-download] Looking up file for messageId: ${messageId}`);
    
    // First, try to get the file URL from the database
    // Files are stored in Supabase Storage by wpp-webhook
    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .select('file_url, file_name, file_type, external_message_id')
      .eq('external_message_id', messageId)
      .maybeSingle();

    if (message?.file_url) {
      console.log('[wpp-download] Found stored file_url:', message.file_url);
      return new Response(JSON.stringify({ 
        success: true,
        downloadUrl: message.file_url,
        fileName: message.file_name,
        fileType: message.file_type,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: try to download from WPP API
    const wppHost = Deno.env.get('WPP_HOST');
    const wppSecret = Deno.env.get('WPP_SECRET');
    
    if (!wppHost || !wppSecret) {
      console.warn('[wpp-download] No WPP credentials, cannot download from API');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'File not found in storage and WPP credentials not configured',
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get WPP session for this organization
    const { data: integration } = await supabase
      .from('messenger_integrations')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wpp')
      .eq('is_active', true)
      .maybeSingle();

    const accountNumber = (integration?.settings as any)?.wppAccountNumber;
    if (!accountNumber) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'WPP integration not found for organization',
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionName = `wpp_${accountNumber}`;

    // Get auth token for WPP API
    const { data: sessionData } = await supabase
      .from('whatsapp_sessions')
      .select('api_key')
      .eq('session_name', sessionName)
      .maybeSingle();

    const apiKey = sessionData?.api_key;
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'WPP session not authenticated',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange apiKey for JWT token
    const tokenResponse = await fetch(`${wppHost}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });

    if (!tokenResponse.ok) {
      console.error('[wpp-download] Failed to get JWT token');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to authenticate with WPP',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { token: jwtToken } = await tokenResponse.json();

    // Download file via WPP API
    const downloadUrl = `${wppHost}/api/messages/media/${messageId}`;
    console.log('[wpp-download] Downloading media via WPP:', downloadUrl);

    const downloadResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.text();
      console.error('[wpp-download] WPP API error:', errorData);
      return new Response(JSON.stringify({ 
        success: false,
        error: `WPP API error: ${downloadResponse.status}`,
      }), {
        status: downloadResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the file as blob and save to storage
    const blob = await downloadResponse.blob();
    const contentType = downloadResponse.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = downloadResponse.headers.get('content-disposition');
    
    // Extract filename from content-disposition or generate one
    let fileName = `media_${messageId}`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) {
        fileName = match[1].replace(/['"]/g, '');
      }
    }

    // Save to Supabase Storage
    const ext = contentType.split('/')[1] || 'bin';
    const storagePath = `wpp/${organizationId}/${Date.now()}_${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(storagePath, blob, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[wpp-download] Storage upload error:', uploadError.message);
      // Return the blob directly as fallback
      return new Response(blob, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': contentType,
          'Content-Disposition': contentDisposition || `attachment; filename="${fileName}"`,
        },
      });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(storagePath);

    const fileUrl = publicUrlData.publicUrl;

    // Update the message with the new file URL
    if (messageId) {
      await supabase
        .from('chat_messages')
        .update({ file_url: fileUrl })
        .eq('external_message_id', messageId);
    }

    console.log('[wpp-download] File saved and URL updated:', fileUrl);

    return new Response(JSON.stringify({ 
      success: true,
      downloadUrl: fileUrl,
      fileName,
      fileType: contentType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[wpp-download] Error:', error);
    const message = (error as any)?.message ?? 'Server error';
    return new Response(JSON.stringify({ 
      error: message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
