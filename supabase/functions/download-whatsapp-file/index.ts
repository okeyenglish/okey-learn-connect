import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
const CHAT_ID_REGEX = /^\d+@[cg]\.(us|net)$/; // WhatsApp chat ID format
const MAX_MESSAGE_ID_LENGTH = 200;

const validateChatId = (chatId: unknown): boolean => {
  return typeof chatId === 'string' && CHAT_ID_REGEX.test(chatId);
};

const validateMessageId = (idMessage: unknown): boolean => {
  return typeof idMessage === 'string' && 
         idMessage.length > 0 && 
         idMessage.length <= MAX_MESSAGE_ID_LENGTH;
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
    const body = await req.json();
    const { chatId, idMessage } = body;
    
    // Validate inputs
    if (!validateChatId(chatId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid chat ID format', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!validateMessageId(idMessage)) {
      return new Response(
        JSON.stringify({ error: 'Invalid message ID', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Downloading WhatsApp file for chatId: ${chatId}, messageId: ${idMessage}`);
    
    // Get Green API credentials from environment variables
    const greenApiUrl = Deno.env.get('GREEN_API_URL');
    const greenApiIdInstance = Deno.env.get('GREEN_API_ID_INSTANCE');
    const greenApiToken = Deno.env.get('GREEN_API_TOKEN_INSTANCE');
    
    if (!greenApiUrl || !greenApiIdInstance || !greenApiToken) {
      return new Response(
        JSON.stringify({ error: 'Service configuration error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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