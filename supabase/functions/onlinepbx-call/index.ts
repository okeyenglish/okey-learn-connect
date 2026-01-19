import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { to_number, from_user } = await req.json();

    console.log('OnlinePBX call request:', { to_number, from_user });

    // Get user profile for operator information including extension number
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, branch, extension_number')
      .eq('id', from_user)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Get operator extension from user profile
    const operatorExtension = profile.extension_number || '101';
    
    if (!profile.extension_number) {
      console.warn('User has no extension_number configured, using default 101');
    }

    // Get client ID from phone number
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('id')
      .eq('phone', to_number)
      .single();

    if (clientError) {
      console.log('Client not found for phone number:', to_number);
    }

    // Create call log entry
    const { data: callLog, error: callLogError } = await supabaseClient
      .from('call_logs')
      .insert({
        client_id: client?.id,
        phone_number: to_number,
        direction: 'outgoing',
        status: 'initiated',
        initiated_by: from_user
      })
      .select()
      .single();

    if (callLogError) {
      console.error('Failed to create call log:', callLogError);
    }

    // Get OnlinePBX credentials
    const onlinePbxKeyId = Deno.env.get('ONLINEPBX_KEY_ID');
    const onlinePbxKey = Deno.env.get('ONLINEPBX_KEY');

    if (!onlinePbxKeyId || !onlinePbxKey) {
      throw new Error('OnlinePBX credentials not configured');
    }

    // OnlinePBX API v3 with HMAC-SHA256 authentication
    const pbxDomain = 'pbx11034.onpbx.ru';
    const apiPath = `/${pbxDomain}/call/now.json`;
    const onlinePbxUrl = `https://api.onlinepbx.ru${apiPath}`;

    const onlinePbxBody = {
      from: operatorExtension,
      to: to_number
    };

    const bodyString = JSON.stringify(onlinePbxBody);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Generate signature: HMAC-SHA256(key, keyId + timestamp + bodyString)
    const signatureMessage = onlinePbxKeyId + timestamp + bodyString;
    const signature = await generateSignature(onlinePbxKey, signatureMessage);
    
    const onlinePbxHeaders = {
      'x-pbx-authentication': `${onlinePbxKeyId}:${timestamp}:${signature}`,
      'Content-Type': 'application/json'
    };

    console.log('Making OnlinePBX API call:', {
      url: onlinePbxUrl,
      from: operatorExtension,
      to: to_number,
      timestamp: timestamp,
      authHeader: `${onlinePbxKeyId}:${timestamp}:${signature.substring(0, 10)}...`
    });

    const response = await fetch(onlinePbxUrl, {
      method: 'POST',
      headers: onlinePbxHeaders,
      body: bodyString
    });

    const responseData = await response.json();
    
    console.log('OnlinePBX call successful:', responseData);

    // Update call log with result
    if (callLog) {
      let callStatus = 'failed';
      if (response.ok && responseData.status === '1') {
        callStatus = 'answered';
      } else if (response.ok && responseData.status === '0') {
        callStatus = responseData.errorCode === 'API_KEY_CHECK_FAILED' ? 'failed' : 'busy';
      }

      await supabaseClient
        .from('call_logs')
        .update({ 
          status: callStatus,
          ended_at: new Date().toISOString()
        })
        .eq('id', callLog.id);
    }

    if (!response.ok) {
      console.error('OnlinePBX API error:', responseData);
      throw new Error(`OnlinePBX API error: ${responseData.message || 'Unknown error'}`);
    }

    // Log the call request in webhook_logs
    await supabaseClient
      .from('webhook_logs')
      .insert({
        messenger_type: 'system',
        event_type: 'onlinepbx_call',
        webhook_data: {
          from_user: from_user,
          from_extension: operatorExtension,
          to_number: to_number,
          response: responseData,
          call_log_id: callLog?.id,
          timestamp: new Date().toISOString()
        },
        processed: true
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'Звонок инициирован через OnlinePBX',
      from_extension: operatorExtension,
      to_number: to_number,
      call_id: responseData.call_id || null,
      call_log_id: callLog?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OnlinePBX call error:', error);
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