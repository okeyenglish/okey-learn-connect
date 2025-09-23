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
      const contentType = req.headers.get('content-type') || '';
      let webhookData: OnlinePBXWebhookData = {};
      try {
        if (contentType.includes('application/json')) {
          webhookData = await req.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const textBody = await req.text();
          const params = new URLSearchParams(textBody);
          const obj: any = {};
          params.forEach((value, key) => { obj[key] = value; });
          webhookData = obj;
        } else {
          const textBody = await req.text();
          try {
            webhookData = JSON.parse(textBody);
          } catch {
            const params = new URLSearchParams(textBody);
            const obj: any = {};
            params.forEach((value, key) => { obj[key] = value; });
            webhookData = obj;
          }
        }
      } catch (parseErr) {
        console.error('Failed to parse webhook body', parseErr);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid body', details: String(parseErr) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      console.log('Content-Type:', contentType);
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

      const status = mapStatus(webhookData.status || (webhookData as any).call_status || '');
      const direction = (webhookData.direction as 'incoming' | 'outgoing') || (webhookData as any).call_direction || (webhookData as any)['Direction'] || 'incoming';
      const rawFrom = webhookData.from || (webhookData as any).src || (webhookData as any).caller_number || (webhookData as any).caller || (webhookData as any).callerid;
      const rawTo = webhookData.to || (webhookData as any).dst || (webhookData as any).called_number || (webhookData as any).callee || (webhookData as any).calledid;
      const selectedPhone = direction === 'incoming' ? (rawFrom || rawTo) : (rawTo || rawFrom);
      const normalizePhone = (p?: string) => {
        if (!p) return '';
        const digits = (p.match(/\d+/g) || []).join('');
        if (digits.length === 11 && digits.startsWith('8')) return '7' + digits.slice(1);
        if (digits.length === 10) return '7' + digits;
        return digits;
      };
      const normalizedPhone = normalizePhone(selectedPhone);
      const durationSeconds = (typeof webhookData.duration === 'string' ? parseInt(webhookData.duration) : webhookData.duration) || null;

      // Basic validation
      if (!normalizedPhone) {
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
      const externalCallId = (webhookData as any).call_id || (webhookData as any).callid || (webhookData as any)['call-id'] || (webhookData as any).uniqueid || (webhookData as any).uid;
      if (externalCallId) {
        console.log('Looking for existing call log with external_call_id:', externalCallId);
        const { data: existingCall, error: findError } = await supabase
          .from('call_logs')
          .select('*')
          .eq('external_call_id', externalCallId)
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
        console.log('Creating new call log for phone (normalized):', normalizedPhone);
        
        // Try to find client by phone number (exact, then fallback by last 10 digits)
        let clientId: string | null = null;
        try {
          const variants = Array.from(new Set([
            selectedPhone,
            normalizedPhone,
            '+' + normalizedPhone
          ].filter(Boolean)));
          let matched: any = null;

          for (const v of variants) {
            const { data: exact, error: exactErr } = await supabase
              .from('clients')
              .select('id, phone')
              .eq('phone', v as string)
              .maybeSingle();
            if (exactErr) {
              console.error('Exact phone search error:', exactErr);
            }
            if (exact) { matched = exact; break; }
          }

          if (!matched && normalizedPhone.length >= 10) {
            const last10 = normalizedPhone.slice(-10);
            const { data: list, error: likeErr } = await supabase
              .from('clients')
              .select('id, phone')
              .ilike('phone', `%${last10}`)
              .limit(5);
            if (likeErr) {
              console.error('Fallback phone search error:', likeErr);
            } else if (list && list.length > 0) {
              matched = list[0];
            }
          }

          if (matched) {
            clientId = matched.id;
            console.log('Matched client:', clientId, 'stored phone:', matched.phone);
          } else {
            console.log('No client found for phone:', selectedPhone);
          }
        } catch (e) {
          console.error('Client lookup exception:', e);
        }

        if (!clientId) {
          // No client — skip inserting into call_logs because client_id is NOT NULL
          return new Response(
            JSON.stringify({
              success: true,
              message: 'No matching client; webhook processed (skipped call_logs insert).',
              phone: selectedPhone,
              normalizedPhone,
              status
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }

        const newCallData: any = {
          client_id: clientId,
          phone_number: selectedPhone,
          direction,
          status,
          duration_seconds: durationSeconds,
          started_at: webhookData.start_time ? new Date(webhookData.start_time).toISOString() : new Date().toISOString(),
          external_call_id: externalCallId || (webhookData as any).call_id || null,
          updated_at: new Date().toISOString()
        };

        if (webhookData.end_time) {
          newCallData.ended_at = new Date(webhookData.end_time).toISOString();
        }

        const { error: insertError } = await supabase
          .from('call_logs')
          .insert(newCallData);

        if (insertError) {
          console.error('Error creating call log:', insertError);
          throw insertError;
        }

        console.log('Created new call log for client', clientId, 'status:', status);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook processed successfully',
          callUpdated: !!callLog,
          phoneNumber: selectedPhone,
          normalizedPhone,
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