import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate HMAC-SHA256 signature for OnlinePBX API
async function generateSignature(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pbx_domain, api_key_id, api_key_secret } = await req.json();

    console.log('Testing OnlinePBX connection for domain:', pbx_domain);

    if (!pbx_domain || !api_key_id || !api_key_secret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Test connection by getting PBX info
    const apiPath = `/${pbx_domain}/info.json`;
    const onlinePbxUrl = `https://api.onlinepbx.ru${apiPath}`;

    const bodyString = JSON.stringify({});
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Generate signature: HMAC-SHA256(key, keyId + timestamp + bodyString)
    const signatureMessage = api_key_id + timestamp + bodyString;
    const signature = await generateSignature(api_key_secret, signatureMessage);
    
    const headers = {
      'x-pbx-authentication': `${api_key_id}:${timestamp}:${signature}`,
      'Content-Type': 'application/json'
    };

    console.log('Making OnlinePBX API test call:', {
      url: onlinePbxUrl,
      timestamp: timestamp
    });

    const response = await fetch(onlinePbxUrl, {
      method: 'POST',
      headers: headers,
      body: bodyString
    });

    const responseData = await response.json();
    
    console.log('OnlinePBX test response:', responseData);

    // Check if the response indicates success
    // OnlinePBX API returns status: "1" for success
    if (response.ok && (responseData.status === '1' || responseData.status === 1)) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Connection successful',
          pbx_info: responseData.data || responseData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for specific error codes
    if (responseData.errorCode === 'API_KEY_CHECK_FAILED') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Неверные API-ключи. Проверьте Key ID и Secret Key.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (responseData.errorCode === 'DOMAIN_NOT_FOUND') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Домен PBX не найден. Проверьте адрес АТС.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: responseData.errorMessage || responseData.comment || 'Ошибка подключения к OnlinePBX',
        details: responseData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OnlinePBX test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
