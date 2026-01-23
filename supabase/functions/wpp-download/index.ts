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
    
    console.log(`Downloading WPP file for messageId: ${messageId}`);
    
    // Get WPP credentials from environment variables
    const wppHost = Deno.env.get('WPP_HOST');
    const wppSecret = Deno.env.get('WPP_SECRET');
    
    if (!wppHost || !wppSecret) {
      throw new Error('Missing WPP credentials: WPP_HOST or WPP_SECRET');
    }

    // Get WPP session name (org_<uuid>)
    const sessionName = `org_${organizationId}`;

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
      throw new Error('Failed to generate WPP token');
    }

    // Download file via WPP API
    const downloadUrl = `${wppHost}/api/${sessionName}/download-media/${messageId}`;
    console.log('Downloading media via WPP:', downloadUrl);

    const downloadResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${wppToken}`,
      },
    });

    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.text();
      console.error('WPP download file error:', errorData);
      throw new Error(`WPP API error: ${downloadResponse.status} - ${errorData}`);
    }

    // Get the file as blob and forward it
    const blob = await downloadResponse.blob();
    const contentType = downloadResponse.headers.get('content-type') || 'application/octet-stream';

    return new Response(blob, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': contentType,
        'Content-Disposition': downloadResponse.headers.get('content-disposition') || 'attachment',
      },
    });

  } catch (error) {
    console.error('Error downloading WPP file:', error);
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
