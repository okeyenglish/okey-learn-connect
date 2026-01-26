import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pbx_domain, auth_key } = await req.json();

    console.log('Testing OnlinePBX connection for domain:', pbx_domain);

    if (!pbx_domain || !auth_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'Укажите домен и Auth Key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Authenticate using auth.json endpoint
    const authUrl = `https://api2.onlinepbx.ru/${pbx_domain}/auth.json`;
    
    console.log('Making OnlinePBX auth request:', authUrl);

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_key })
    });

    const responseData = await response.json();
    
    console.log('OnlinePBX auth response:', responseData);

    // Check if the response indicates success
    // OnlinePBX API returns status: "1" for success
    if (response.ok && (responseData.status === '1' || responseData.status === 1)) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Подключение успешно! Ключи получены.',
          pbx_info: {
            key_id: responseData.data?.key_id || responseData.key_id,
            domain: pbx_domain
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for specific error codes
    if (responseData.errorCode === 'API_KEY_CHECK_FAILED' || responseData.errorCode === 'AUTH_FAILED') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Неверный Auth Key. Проверьте ключ в разделе «Интеграция» → «API».'
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
