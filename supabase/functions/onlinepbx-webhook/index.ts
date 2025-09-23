import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('OnlinePBX webhook received:', req.method);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    if (req.method === 'POST') {
      const webhookData: OnlinePBXWebhookData = await req.json();
      console.log('Webhook data received:', JSON.stringify(webhookData, null, 2));

      // Log the webhook event
      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert({
          source: 'onlinepbx',
          event_type: 'call_status_update',
          payload: webhookData,
          received_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Error logging webhook:', logError);
      }

      // Map OnlinePBX status to our status
      const mapStatus = (pbxStatus: string): string => {
        const statusMap: { [key: string]: string } = {
          'ANSWER': 'answered',
          'BUSY': 'busy',
          'NOANSWER': 'missed',
          'CANCEL': 'missed',
          'CONGESTION': 'failed',
          'CHANUNAVAIL': 'failed',
          'HANGUP': 'answered' // If there was a hangup, call was likely answered
        };
        return statusMap[pbxStatus?.toUpperCase()] || 'failed';
      };

      // Try to find existing call log by call_id or phone number + time
      let callLog = null;
      
      if (webhookData.call_id) {
        const { data: existingCall } = await supabase
          .from('call_logs')
          .select('*')
          .eq('external_call_id', webhookData.call_id)
          .single();
        
        callLog = existingCall;
      }

      // If no call found by call_id, try to find by phone number and approximate time
      if (!callLog && webhookData.from && webhookData.start_time) {
        const phoneNumber = webhookData.direction === 'incoming' ? webhookData.from : webhookData.to;
        const startTime = new Date(webhookData.start_time);
        const searchWindowStart = new Date(startTime.getTime() - 60000); // 1 minute before
        const searchWindowEnd = new Date(startTime.getTime() + 60000); // 1 minute after

        const { data: recentCalls } = await supabase
          .from('call_logs')
          .select('*')
          .eq('phone_number', phoneNumber)
          .gte('started_at', searchWindowStart.toISOString())
          .lte('started_at', searchWindowEnd.toISOString())
          .order('started_at', { ascending: false })
          .limit(1);

        if (recentCalls && recentCalls.length > 0) {
          callLog = recentCalls[0];
        }
      }

      const status = mapStatus(webhookData.status || '');
      const phoneNumber = webhookData.direction === 'incoming' ? webhookData.from : webhookData.to;
      const durationSeconds = webhookData.duration || null;

      if (callLog) {
        // Update existing call log
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

        if (webhookData.call_id && !callLog.external_call_id) {
          updateData.external_call_id = webhookData.call_id;
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

        // Try to find client by phone number
        const { data: clients } = await supabase
          .from('clients')
          .select('id')
          .contains('phone_numbers', [phoneNumber])
          .limit(1);

        if (clients && clients.length > 0) {
          newCallData.client_id = clients[0].id;
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
          callUpdated: !!callLog 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
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