import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { to_number, from_user } = await req.json();

    console.log('OnlinePBX call request:', { to_number, from_user });

    // Get user profile for operator information
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, branch')
      .eq('id', from_user)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Get OnlinePBX credentials
    const onlinePbxKeyId = Deno.env.get('ONLINEPBX_KEY_ID');
    const onlinePbxKey = Deno.env.get('ONLINEPBX_KEY');

    if (!onlinePbxKeyId || !onlinePbxKey) {
      throw new Error('OnlinePBX credentials not configured');
    }

    // Determine operator number based on user (simplified mapping)
    // In real implementation, you would have a proper mapping of users to extension numbers
    const operatorExtension = '101'; // Default extension, should be mapped from user profile

    // Make call via OnlinePBX API
    const onlinePbxUrl = 'https://api.onlinepbx.ru/pbx11034.onpbx.ru/call/now.json';
    
    const onlinePbxHeaders = {
      'x-pbx-authentication': `${onlinePbxKeyId}:${onlinePbxKey}`,
      'Content-Type': 'application/json'
    };

    const onlinePbxBody = {
      from: operatorExtension,
      to: to_number
    };

    console.log('Making OnlinePBX API call:', {
      url: onlinePbxUrl,
      from: operatorExtension,
      to: to_number
    });

    const response = await fetch(onlinePbxUrl, {
      method: 'POST',
      headers: onlinePbxHeaders,
      body: JSON.stringify(onlinePbxBody)
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('OnlinePBX API error:', responseData);
      throw new Error(`OnlinePBX API error: ${responseData.message || 'Unknown error'}`);
    }

    console.log('OnlinePBX call successful:', responseData);

    // Log the call request
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
          timestamp: new Date().toISOString()
        },
        processed: true
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'Звонок инициирован через OnlinePBX',
      from_extension: operatorExtension,
      to_number: to_number,
      call_id: responseData.call_id || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OnlinePBX call error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});