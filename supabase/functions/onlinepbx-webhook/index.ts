import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema for webhook data - relaxed to accept OnlinePBX format
const WebhookSchema = z.object({
  event: z.string().optional(),
  direction: z.enum(['incoming', 'outgoing', 'inbound', 'outbound']).optional(),
  caller: z.string().optional(),
  callee: z.string().optional(),
  uuid: z.string().optional(),
  call_duration: z.string().or(z.number()).optional(),
  dialog_duration: z.string().or(z.number()).optional(),
  download_url: z.string().optional(), // Can be empty string
  hangup_cause: z.string().optional(),
}).passthrough(); // Allow additional fields

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
  console.log('=== OnlinePBX WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

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

      // Map OnlinePBX event/status to our status
      const mapStatus = (event: string | undefined, hangupCause: string | undefined, pbxStatus: string | undefined): string => {
        // First check event type - OnlinePBX sends events like "call_missed", "call_answered", etc.
        const eventLower = (event || '').toLowerCase();
        if (eventLower.includes('missed') || eventLower === 'call_missed') return 'missed';
        if (eventLower.includes('answered') || eventLower === 'call_answered') return 'answered';
        if (eventLower.includes('busy') || eventLower === 'call_busy') return 'busy';
        if (eventLower.includes('failed') || eventLower === 'call_failed') return 'failed';
        
        // Then check hangup_cause
        const hangupMap: { [key: string]: string } = {
          'NORMAL_CLEARING': 'answered',
          'USER_BUSY': 'busy',
          'NO_ANSWER': 'missed',
          'ORIGINATOR_CANCEL': 'missed',
          'CALL_REJECTED': 'missed',
          'NO_USER_RESPONSE': 'missed',
          'UNALLOCATED_NUMBER': 'failed',
          'SUBSCRIBER_ABSENT': 'failed',
        };
        if (hangupCause && hangupMap[hangupCause.toUpperCase()]) {
          return hangupMap[hangupCause.toUpperCase()];
        }
        
        // Finally check status field
        const statusMap: { [key: string]: string } = {
          'ANSWER': 'answered',
          'BUSY': 'busy',
          'NOANSWER': 'missed',
          'CANCEL': 'missed',
          'CONGESTION': 'failed',
          'CHANUNAVAIL': 'failed',
          'HANGUP': 'answered'
        };
        return statusMap[pbxStatus?.toUpperCase()] || 'missed'; // Default to missed for incoming calls
      };

      // Log event type for debugging
      const eventType = (webhookData as any).event;
      const hangupCause = (webhookData as any).hangup_cause;
      console.log('Event type:', eventType, 'Hangup cause:', hangupCause);

      const status = mapStatus(eventType, hangupCause, webhookData.status || (webhookData as any).call_status || '');
      let direction = (webhookData.direction as 'incoming' | 'outgoing') || (webhookData as any).call_direction || (webhookData as any)['Direction'];
      
      // Map OnlinePBX directions to database format
      // OnlinePBX sends: 'inbound'/'outbound', Database expects: 'incoming'/'outgoing'
      if (direction === 'inbound' || direction === 'incoming') {
        direction = 'incoming' as any;
      } else if (direction === 'outbound' || direction === 'outgoing') {
        direction = 'outgoing' as any;
      } else if (!direction) {
        direction = 'incoming' as any; // Default to incoming if not specified
      }
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
      
      const formatPhoneForSearch = (digits: string) => {
        if (digits.length === 11 && digits.startsWith('7')) {
          return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
        }
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
        
        // Generate summary for updated calls longer than 60 seconds
        if (durationSeconds && durationSeconds > 60 && status === 'answered' && !callLog.summary) {
          console.log('Updated call duration > 60 seconds, generating summary for call:', callLog.id);
          try {
            const summaryResponse = await supabase.functions.invoke('generate-call-summary', {
              body: { callId: callLog.id }
            });
            
            if (summaryResponse.error) {
              console.error('Error generating call summary:', summaryResponse.error);
            } else {
              console.log('Call summary generated successfully');
            }
          } catch (summaryError) {
            console.error('Exception generating call summary:', summaryError);
            // Don't fail the webhook for summary generation issues
          }
        }
      } else {
        // Create new call log entry
        console.log('Creating new call log for phone (normalized):', normalizedPhone);
        
        // Try to find client by phone number in clients.phone OR client_phone_numbers.phone
        let clientId: string | null = null;
        try {
          const formattedPhone = formatPhoneForSearch(normalizedPhone);
          const variants = Array.from(new Set([
            selectedPhone,
            normalizedPhone,
            '+' + normalizedPhone,
            formattedPhone
          ].filter(Boolean)));
          let matched: any = null;

          console.log('Searching for client with phone variants:', variants);

          // First try clients.phone
          for (const v of variants) {
            const { data: exact, error: exactErr } = await supabase
              .from('clients')
              .select('id, phone')
              .eq('phone', v as string)
              .maybeSingle();
            if (exactErr) {
              console.error('Exact phone search error:', exactErr);
            }
            if (exact) { 
              matched = exact; 
              console.log('Found exact match in clients.phone:', v);
              break; 
            }
          }

          // Then try client_phone_numbers table
          if (!matched) {
            console.log('Searching in client_phone_numbers table...');
            for (const v of variants) {
              const { data: phoneRecord, error: phoneErr } = await supabase
                .from('client_phone_numbers')
                .select('client_id, phone')
                .eq('phone', v as string)
                .maybeSingle();
              if (phoneErr) {
                console.error('Phone numbers search error:', phoneErr);
              }
              if (phoneRecord) { 
                matched = { id: phoneRecord.client_id, phone: phoneRecord.phone };
                console.log('Found match in client_phone_numbers:', v);
                break; 
              }
            }
          }

          // Fallback: search by last 10 digits in both tables
          if (!matched && normalizedPhone.length >= 10) {
            const last10 = normalizedPhone.slice(-10);
            console.log('Fallback search with last 10 digits:', last10);
            
            // Try clients.phone
            const { data: list, error: likeErr } = await supabase
              .from('clients')
              .select('id, phone')
              .ilike('phone', `%${last10}`)
              .limit(5);
            if (likeErr) {
              console.error('Fallback phone search error:', likeErr);
            } else if (list && list.length > 0) {
              matched = list[0];
              console.log('Found fallback match in clients:', matched.phone);
            }
            
            // If still not found, try client_phone_numbers
            if (!matched) {
              const { data: phoneList, error: phoneListErr } = await supabase
                .from('client_phone_numbers')
                .select('client_id, phone')
                .ilike('phone', `%${last10}`)
                .limit(5);
              if (phoneListErr) {
                console.error('Fallback phone_numbers search error:', phoneListErr);
              } else if (phoneList && phoneList.length > 0) {
                matched = { id: phoneList[0].client_id, phone: phoneList[0].phone };
                console.log('Found fallback match in client_phone_numbers:', matched.phone);
              }
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
          // Create new client if not found
          console.log('Client not found, creating new client for phone:', selectedPhone);
          
          // Get default organization - use hardcoded ID since is_active doesn't exist
          const defaultOrgId = '00000000-0000-0000-0000-000000000001';
          const { data: defaultOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('id', defaultOrgId)
            .single();
          
          if (!defaultOrg) {
            console.error('No active organization found');
            return new Response(
              JSON.stringify({
                success: false,
                error: 'No active organization found'
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            );
          }
          
          // Try to find responsible employee by extension (for incoming calls)
          let responsibleEmployeeId = null;
          if (direction === 'incoming' && rawTo) {
            const { data: employee } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, extension_number')
              .eq('extension_number', rawTo)
              .maybeSingle();
            
            if (employee) {
              responsibleEmployeeId = employee.id;
              console.log('Found responsible employee:', employee.first_name, employee.last_name);
            }
          }
          
          // Create new client
          const clientName = `Клиент ${formatPhoneForSearch(normalizedPhone)}`;
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              name: clientName,
              phone: selectedPhone,
              branch: 'Окская', // Default branch
              organization_id: defaultOrg.id,
              notes: `Создан автоматически из звонка ${direction === 'incoming' ? 'входящего' : 'исходящего'} ${new Date().toLocaleDateString('ru-RU')}`
            })
            .select('id')
            .single();
          
          if (clientError) {
            console.error('Error creating client:', clientError);
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Failed to create client',
                details: clientError.message
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            );
          }
          
          clientId = newClient.id;
          console.log('Created new client with ID:', clientId);
          
          // Create lead for incoming calls
          if (direction === 'incoming') {
            console.log('Creating lead for incoming call');
            
            // Get "New" status
            const { data: newStatus } = await supabase
              .from('lead_statuses')
              .select('id')
              .eq('slug', 'new')
              .single();
            
            // Get "Phone" source
            const { data: phoneSource } = await supabase
              .from('lead_sources')
              .select('id')
              .ilike('name', '%телефон%')
              .limit(1)
              .single();
            
            if (newStatus) {
              const { data: newLead, error: leadError } = await supabase
                .from('leads')
                .insert({
                  first_name: 'Клиент',
                  last_name: formatPhoneForSearch(normalizedPhone),
                  phone: selectedPhone,
                  branch: 'Окская',
                  organization_id: defaultOrg.id,
                  status_id: newStatus.id,
                  lead_source_id: phoneSource?.id || null,
                  assigned_to: responsibleEmployeeId,
                  notes: `Создан автоматически из входящего звонка ${new Date().toLocaleString('ru-RU')}`
                })
                .select('id')
                .single();
              
              if (leadError) {
                console.error('Error creating lead:', leadError);
              } else {
                console.log('Created lead with ID:', newLead.id);
              }
            }
          }
          
          // Create chat message about new client
          const systemMessage = direction === 'incoming' 
            ? `Новый входящий звонок от ${formatPhoneForSearch(normalizedPhone)}. Клиент создан автоматически.`
            : `Исходящий звонок на ${formatPhoneForSearch(normalizedPhone)}. Клиент создан автоматически.`;
          
          const { error: messageError } = await supabase
            .from('chat_messages')
            .insert({
              client_id: clientId,
              message_text: systemMessage,
              message_type: 'system',
              is_outgoing: false,
              system_type: 'call_notification'
            });
          
          if (messageError) {
            console.error('Error creating system message:', messageError);
            // Don't fail the whole process for this
          }
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

        const { data: newCallLog, error: insertError } = await supabase
          .from('call_logs')
          .insert(newCallData)
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating call log:', insertError);
          throw insertError;
        }

        console.log('Created new call log for client', clientId, 'status:', status);
        
        // Generate summary for calls longer than 60 seconds
        if (durationSeconds && durationSeconds > 60 && status === 'answered') {
          console.log('Call duration > 60 seconds, generating summary for call:', newCallLog.id);
          try {
            const summaryResponse = await supabase.functions.invoke('generate-call-summary', {
              body: { callId: newCallLog.id }
            });
            
            if (summaryResponse.error) {
              console.error('Error generating call summary:', summaryResponse.error);
            } else {
              console.log('Call summary generated successfully');
            }
          } catch (summaryError) {
            console.error('Exception generating call summary:', summaryError);
            // Don't fail the webhook for summary generation issues
          }
        }
        
        callLog = newCallLog; // Set for response
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