import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { to_number, from_user } = await req.json();

    console.log('Callback request:', { to_number, from_user });

    // Get user profile for SIP credentials
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('extension_number, sip_domain, sip_password, first_name, last_name')
      .eq('id', from_user)
      .single();

    if (profileError || !profile?.extension_number) {
      throw new Error('User SIP profile not found');
    }

    // Here you would integrate with your PBX system to initiate a callback
    // For OnlinePBX, you might use their API to create a click-to-call request
    
    console.log('Initiating callback from', profile.extension_number, 'to', to_number);

    // Simulate callback initiation
    // In a real implementation, you would call OnlinePBX API here
    const callbackResult = {
      success: true,
      message: 'Callback initiated',
      from_extension: profile.extension_number,
      to_number: to_number,
      estimated_time: '30 seconds'
    };

    // Log the callback request
    await supabaseClient
      .from('webhook_logs')
      .insert({
        messenger_type: 'system',
        event_type: 'callback_request',
        webhook_data: {
          from_user: from_user,
          from_extension: profile.extension_number,
          to_number: to_number,
          timestamp: new Date().toISOString()
        },
        processed: true
      });

    return successResponse(callbackResult);

  } catch (error: unknown) {
    console.error('Callback request error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});