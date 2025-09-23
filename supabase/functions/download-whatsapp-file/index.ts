import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { chatId, idMessage } = await req.json();
    
    console.log(`Downloading WhatsApp file for chatId: ${chatId}, messageId: ${idMessage}`);
    
    // Get Green API credentials from environment variables
    const greenApiUrl = Deno.env.get('GREEN_API_URL');
    const greenApiIdInstance = Deno.env.get('GREEN_API_ID_INSTANCE');
    const greenApiToken = Deno.env.get('GREEN_API_TOKEN_INSTANCE');
    
    if (!greenApiUrl || !greenApiIdInstance || !greenApiToken) {
      throw new Error('Missing Green API credentials: GREEN_API_URL, GREEN_API_ID_INSTANCE, or GREEN_API_TOKEN_INSTANCE');
    }

    // Call Green API downloadFile endpoint
    const downloadResponse = await fetch(`${greenApiUrl}/waInstance${greenApiIdInstance}/downloadFile/${greenApiToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        idMessage
      })
    });

    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.text();
      console.error('WhatsApp download file error:', errorData);
      throw new Error(`WhatsApp API error: ${downloadResponse.status} - ${errorData}`);
    }

    const downloadData = await downloadResponse.json();
    console.log('WhatsApp download response:', downloadData);

    if (!downloadData.downloadUrl) {
      throw new Error('No download URL returned from WhatsApp API');
    }

    // Return the download URL
    return new Response(JSON.stringify({ 
      downloadUrl: downloadData.downloadUrl,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error downloading WhatsApp file:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});