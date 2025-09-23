import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnlinePBXWebhookData {
  call_id?: string;
  from?: string;
  to?: string;
  direction?: 'incoming' | 'outgoing';
  status?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  record_url?: string;
  [key: string]: any;
}

serve(async (req) => {
  console.log('OnlinePBX webhook received:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    if (req.method === 'POST') {
      const webhookData: OnlinePBXWebhookData = await req.json();
      console.log('Webhook data received:', JSON.stringify(webhookData, null, 2));

      // Map OnlinePBX status to our status
      const mapStatus = (pbxStatus: string): string => {
        const statusMap: { [key: string]: string } = {
          'ANSWER': 'answered',
          'BUSY': 'busy',
          'NOANSWER': 'missed',
          'CANCEL': 'missed',
          'CONGESTION': 'failed',
          'CHANUNAVAIL': 'failed',
          'HANGUP': 'answered'
        };
        return statusMap[pbxStatus?.toUpperCase()] || 'failed';
      };

      const status = mapStatus(webhookData.status || '');
      const phoneNumber = webhookData.direction === 'incoming' ? webhookData.from : webhookData.to;
      const durationSeconds = webhookData.duration || null;

      // Basic validation
      if (!phoneNumber) {
        console.log('No phone number found in webhook data');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Webhook processed but no phone number found'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      // Try to find existing call log by call_id
      let callLog = null;
      
      if (webhookData.call_id) {
        console.log('Looking for existing call log with external_call_id:', webhookData.call_id);
        const { data: existingCall, error: findError } = await supabase
          .from('call_logs')
          .select('*')
          .eq('external_call_id', webhookData.call_id)
          .maybeSingle();
        
        if (findError) {
          console.error('Error finding existing call log:', findError);
        } else {
          callLog = existingCall;
          console.log('Found existing call log:', callLog?.id);
        }
      }

      if (callLog) {
        // Update existing call log
        console.log('Updating existing call log:', callLog.id);
        const updateData: any = {
          status,
          updated_at: new Date().toISOString()
        };

        if (webhookData.end_time) {
          updateData.ended_at = new Date(webhookData.end_time).toISOString();
        }

        if (durationSeconds !== null) {
          updateData.duration_seconds = durationSeconds;
        }

        const { error: updateError } = await supabase
          .from('call_logs')
          .update(updateData)
          .eq('id', callLog.id);

        if (updateError) {
          console.error('Error updating call log:', updateError);
          throw updateError;
        }

        console.log(`Updated call log ${callLog.id} with status: ${status}`);
      } else {
        // Create new call log entry
        console.log('Creating new call log for phone:', phoneNumber);
        
        // Try to find client by phone number
        const { data: clients, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('phone', phoneNumber)
          .limit(1);

        if (clientError) {
          console.error('Error finding client:', clientError);
        }

        let clientId = null;
        if (clients && clients.length > 0) {
          clientId = clients[0].id;
          console.log('Found client:', clientId);
        } else {
          console.log(`No client found for phone number: ${phoneNumber}`);
          // Still create the call log without client_id for now
        }

        const newCallData: any = {
          phone_number: phoneNumber,
          direction: webhookData.direction || 'incoming',
          status,
          duration_seconds: durationSeconds,
          started_at: webhookData.start_time ? new Date(webhookData.start_time).toISOString() : new Date().toISOString(),
          external_call_id: webhookData.call_id
        };

        if (webhookData.end_time) {
          newCallData.ended_at = new Date(webhookData.end_time).toISOString();
        }

        if (clientId) {
          newCallData.client_id = clientId;
        }

        const { error: insertError } = await supabase
          .from('call_logs')
          .insert(newCallData);

        if (insertError) {
          console.error('Error creating call log:', insertError);
          throw insertError;
        }

        console.log(`Created new call log for ${phoneNumber} with status: ${status}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook processed successfully',
          callUpdated: !!callLog,
          phoneNumber,
          status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Handle non-POST requests
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OnlinePBX Webhook is running',
        method: req.method
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});