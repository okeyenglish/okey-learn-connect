import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
  sendPushNotification,
  getOrgAdminManagerUserIds,
  type OnlinePBXWebhookPayload,
  type OnlinePBXWebhookResponse,
} from '../_shared/types.ts';

// Generate a unique webhook key
function generateWebhookKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let key = '';
  for (let i = 0; i < 24; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

type OrgLookup = { organizationId: string; isEnabled: boolean };

// Find organization by webhook key from query params (PRIMARY method)
async function findOrganizationByWebhookKey(
  supabase: ReturnType<typeof createClient>,
  webhookKey: string
): Promise<OrgLookup | null> {
  if (!webhookKey) return null;
  
  console.log('[onlinepbx-webhook] Looking up organization by webhook key:', webhookKey.substring(0, 8) + '...');
  
  // Try both camelCase (webhookKey) and snake_case (webhook_key) formats
  // Also try searching all enabled OnlinePBX settings and matching manually
  const { data: settings, error } = await supabase
    .from('messenger_settings')
    .select('organization_id, is_enabled, settings')
    .eq('messenger_type', 'onlinepbx')
    .limit(200);
  
  if (error) {
    console.error('[onlinepbx-webhook] Error searching by webhook key:', error);
    return null;
  }
  
  if (settings && settings.length > 0) {
    for (const setting of settings) {
      const settingsObj = setting.settings as Record<string, unknown> | null;
      const storedKey = settingsObj?.webhookKey || settingsObj?.webhook_key;
      
      console.log('[onlinepbx-webhook] Checking org:', setting.organization_id, 'storedKey:', storedKey ? String(storedKey).substring(0, 8) + '...' : 'none');
      
      if (storedKey === webhookKey) {
        console.log('[onlinepbx-webhook] ✓ Found organization by webhook key:', setting.organization_id);
        return {
          organizationId: setting.organization_id as string,
          isEnabled: !!(setting as any).is_enabled,
        };
      }
    }
  }
  
  console.log('[onlinepbx-webhook] No organization found for webhook key');
  return null;
}

// Find organization by PBX domain from messenger_settings (FALLBACK method)
async function findOrganizationByPbxDomain(
  supabase: ReturnType<typeof createClient>,
  pbxDomain: string
): Promise<OrgLookup | null> {
  if (!pbxDomain) return null;
  
  console.log('[onlinepbx-webhook] Looking up organization by PBX domain:', pbxDomain);
  
  // Search in messenger_settings where messenger_type = 'onlinepbx'
  const { data: settings, error } = await supabase
    .from('messenger_settings')
    .select('organization_id, is_enabled, settings')
    .eq('messenger_type', 'onlinepbx')
    .limit(200);
  
  if (error) {
    console.error('[onlinepbx-webhook] Error searching messenger_settings:', error);
    return null;
  }
  
  if (!settings || settings.length === 0) {
    console.log('[onlinepbx-webhook] No OnlinePBX settings found in messenger_settings');
  } else {
    // Find matching domain (case-insensitive, handle both formats)
    const normalizedDomain = pbxDomain.toLowerCase().replace(/\.onpbx\.ru$/, '');
    
    for (const setting of settings) {
      const settingDomain = ((setting.settings as Record<string, unknown>)?.pbxDomain || (setting.settings as Record<string, unknown>)?.pbx_domain || '').toString().toLowerCase();
      const normalizedSettingDomain = settingDomain.replace(/\.onpbx\.ru$/, '');
      
      if (normalizedSettingDomain === normalizedDomain || settingDomain === pbxDomain.toLowerCase()) {
        console.log('[onlinepbx-webhook] Found organization:', setting.organization_id, 'for domain:', pbxDomain);
        return {
          organizationId: setting.organization_id as string,
          isEnabled: !!(setting as any).is_enabled,
        };
      }
    }
  }
  
  // Fallback: try system_settings for legacy configs
  const { data: legacySettings } = await supabase
    .from('system_settings')
    .select('organization_id, setting_value')
    .eq('setting_key', 'onlinepbx_config');
  
  if (legacySettings) {
    const normalizedDomain = pbxDomain.toLowerCase().replace(/\.onpbx\.ru$/, '');
    for (const setting of legacySettings) {
      const settingDomain = ((setting.setting_value as Record<string, unknown>)?.pbx_domain || '').toString().toLowerCase();
      const normalizedSettingDomain = settingDomain.replace(/\.onpbx\.ru$/, '');
      
      if (normalizedSettingDomain === normalizedDomain || settingDomain === pbxDomain.toLowerCase()) {
        console.log('[onlinepbx-webhook] Found organization (legacy):', setting.organization_id, 'for domain:', pbxDomain);
        return {
          organizationId: setting.organization_id as string,
          // Legacy configs don't have an explicit enabled flag; if a legacy domain matches, allow processing.
          isEnabled: true,
        };
      }
    }
  }
  
  console.log('[onlinepbx-webhook] No organization found for domain:', pbxDomain);
  return null;
}

Deno.serve(async (req) => {
  console.log('=== OnlinePBX WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return errorResponse('Configuration error', 500);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      let webhookData: OnlinePBXWebhookPayload = {};
      
      try {
        if (contentType.includes('application/json')) {
          webhookData = await req.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const textBody = await req.text();
          const params = new URLSearchParams(textBody);
          const obj: Record<string, string> = {};
          params.forEach((value, key) => { obj[key] = value; });
          webhookData = obj as unknown as OnlinePBXWebhookPayload;
        } else {
          const textBody = await req.text();
          try {
            webhookData = JSON.parse(textBody);
          } catch {
            const params = new URLSearchParams(textBody);
            const obj: Record<string, string> = {};
            params.forEach((value, key) => { obj[key] = value; });
            webhookData = obj as unknown as OnlinePBXWebhookPayload;
          }
        }
      } catch (parseErr) {
        console.error('Failed to parse webhook body', parseErr);
        return errorResponse(`Invalid body: ${String(parseErr)}`, 400);
      }
      
      console.log('Content-Type:', contentType);
      console.log('Webhook data received:', JSON.stringify(webhookData, null, 2));
      
      // Debug: Log all recording-related fields for diagnostics
      const recordingFields = ['download_url', 'record_url', 'record', 'recording_url', 'recordingUrl', 
                               'audio_path', 'audio_url', 'link', 'record_link', 'file', 'file_url', 'mp3', 'wav'];
      const foundRecordingFields: Record<string, string> = {};
      for (const field of recordingFields) {
        if ((webhookData as any)[field]) {
          foundRecordingFields[field] = String((webhookData as any)[field]).substring(0, 100);
        }
      }
      if (Object.keys(foundRecordingFields).length > 0) {
        console.log('[onlinepbx-webhook] Recording fields found:', JSON.stringify(foundRecordingFields));
      } else {
        console.log('[onlinepbx-webhook] No recording URL fields found in webhook data');
      }
      
      // Log full webhook to webhook_logs for debugging specific calls
      const logRawFrom = (webhookData as any).from || (webhookData as any).src || (webhookData as any).caller_number || '';
      const logRawTo = (webhookData as any).to || (webhookData as any).dst || (webhookData as any).called_number || '';
      const phoneForLog = logRawFrom || logRawTo;
      
      // Store raw webhook for debugging - non-blocking
      try {
        supabase.from('webhook_logs').insert({
          messenger_type: 'onlinepbx',
          event_type: 'raw_webhook',
          webhook_data: {
            ...webhookData,
            _recording_fields_found: foundRecordingFields,
            _phone_from: logRawFrom,
            _phone_to: logRawTo,
            _received_at: new Date().toISOString()
          },
          processed: true,
        }).then(() => {
          console.log('[onlinepbx-webhook] Raw webhook logged for phone:', phoneForLog);
        }).catch(e => {
          console.warn('[onlinepbx-webhook] Failed to log raw webhook:', e);
        });
      } catch (e) {
        console.warn('[onlinepbx-webhook] Failed to schedule raw webhook logging:', e);
      }

      // STEP 1: Try to get organization from webhook key in URL (PRIMARY method)
      const url = new URL(req.url);
      const webhookKey = url.searchParams.get('key') || url.searchParams.get('webhook_key') || '';

      let organizationId: string | null = null;
      let integrationEnabled: boolean | null = null;
      
      if (webhookKey) {
        const org = await findOrganizationByWebhookKey(supabase, webhookKey);
        if (org) {
          organizationId = org.organizationId;
          integrationEnabled = org.isEnabled;
        }
      }

      // STEP 2: Fallback - try PBX domain from webhook data
      if (!organizationId) {
        const pbxDomain = webhookData.domain || webhookData.pbx_domain || webhookData.account || 
                          (webhookData as any).pbx || (webhookData as any).Domain || '';
        console.log('[onlinepbx-webhook] PBX domain from webhook:', pbxDomain);
        
        if (pbxDomain) {
          const org = await findOrganizationByPbxDomain(supabase, pbxDomain);
          if (org) {
            organizationId = org.organizationId;
            integrationEnabled = org.isEnabled;
          }
        }
      }
      
      // STEP 3: Final fallback - first active OnlinePBX config
      if (!organizationId) {
        console.log('[onlinepbx-webhook] Trying fallback: first enabled OnlinePBX config');
        const { data: anyConfig } = await supabase
          .from('messenger_settings')
          .select('organization_id')
          .eq('messenger_type', 'onlinepbx')
          .eq('is_enabled', true)
          .limit(1)
          .maybeSingle();
        
        if (anyConfig?.organization_id) {
          organizationId = anyConfig.organization_id;
          console.log('[onlinepbx-webhook] Using fallback organization:', organizationId);
        }
      }
      
      // If still no organization - reject the webhook
      if (!organizationId) {
        console.error('[onlinepbx-webhook] CRITICAL: Could not determine organization!');
        return errorResponse('Organization not found. Please configure webhook with correct key.', 400);
      }
      
      console.log('[onlinepbx-webhook] Using organization:', organizationId);

      // If integration is disabled, acknowledge webhook (OnlinePBX test expects 2xx) but do not process.
      if (integrationEnabled === false) {
        console.log('[onlinepbx-webhook] Integration disabled for org, acknowledging without processing');
        return new Response(
          JSON.stringify({ success: true, message: 'Integration disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Map OnlinePBX event/status to our status
      // OnlinePBX events: call_start, call_user_start, call_answered, call_end, call_missed, call_transfer_answered
      const mapStatus = (event: string | undefined, hangupCause: string | undefined, pbxStatus: string | undefined): string => {
        const eventLower = (event || '').toLowerCase();
        
        // Direct event mapping from OnlinePBX
        if (eventLower === 'call_missed') return 'missed';
        if (eventLower === 'call_answered') return 'answered';
        if (eventLower === 'call_end') {
          // For call_end, check hangup_cause to determine actual status
          const cause = (hangupCause || '').toUpperCase();
          if (cause === 'NORMAL_CLEARING') return 'answered';
          if (cause === 'USER_BUSY') return 'busy';
          if (cause === 'NO_ANSWER' || cause === 'ORIGINATOR_CANCEL' || cause === 'CALL_REJECTED' || cause === 'NO_USER_RESPONSE') return 'missed';
          if (cause === 'UNALLOCATED_NUMBER' || cause === 'SUBSCRIBER_ABSENT') return 'failed';
          return 'answered'; // Default for call_end
        }
        if (eventLower === 'call_start' || eventLower === 'call_user_start') return 'initiated';
        
        // Legacy fallback for includes-based matching
        if (eventLower.includes('missed')) return 'missed';
        if (eventLower.includes('answered')) return 'answered';
        if (eventLower.includes('busy')) return 'busy';
        if (eventLower.includes('failed')) return 'failed';
        
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
        
        const statusMap: { [key: string]: string } = {
          'ANSWER': 'answered',
          'BUSY': 'busy',
          'NOANSWER': 'missed',
          'CANCEL': 'missed',
          'CONGESTION': 'failed',
          'CHANUNAVAIL': 'failed',
          'HANGUP': 'answered'
        };
        return statusMap[pbxStatus?.toUpperCase()] || 'missed';
      };

      const eventType = (webhookData as any).event;
      const hangupCause = (webhookData as any).hangup_cause;
      console.log('Event type:', eventType, 'Hangup cause:', hangupCause);

      const status = mapStatus(eventType, hangupCause, webhookData.status || (webhookData as any).call_status || '');
      let direction = (webhookData.direction as 'incoming' | 'outgoing') || (webhookData as any).call_direction || (webhookData as any)['Direction'];
      
      if (direction === 'inbound' || direction === 'incoming') {
        direction = 'incoming' as any;
      } else if (direction === 'outbound' || direction === 'outgoing') {
        direction = 'outgoing' as any;
      } else if (!direction) {
        direction = 'incoming' as any;
      }
      
      // OnlinePBX uses 'caller' and 'callee' according to docs
      const rawFrom = (webhookData as any).caller || webhookData.from || (webhookData as any).src || (webhookData as any).caller_number || (webhookData as any).callerid;
      const rawTo = (webhookData as any).callee || webhookData.to || (webhookData as any).dst || (webhookData as any).called_number || (webhookData as any).calledid;
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
      
      // OnlinePBX uses 'dialog_duration' for actual talk time, 'call_duration' for total
      // Prefer dialog_duration as it's the actual conversation length
      const dialogDuration = (webhookData as any).dialog_duration;
      const callDuration = (webhookData as any).call_duration || webhookData.duration;
      const durationRaw = dialogDuration || callDuration;
      const durationSeconds = durationRaw ? (typeof durationRaw === 'string' ? parseInt(durationRaw) : durationRaw) : null;
      
      console.log('[onlinepbx-webhook] Duration fields: dialog_duration=', dialogDuration, 'call_duration=', callDuration, '-> using:', durationSeconds);

      if (!normalizedPhone) {
        console.log('No phone number found in webhook data');
        return new Response(
          JSON.stringify({ success: true, message: 'Webhook processed but no phone number found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Try to find existing call log by call_id
      // OnlinePBX uses 'uuid' as unique call identifier according to docs
      let callLog = null;
      const externalCallId = (webhookData as any).uuid || (webhookData as any).call_id || (webhookData as any).callid || (webhookData as any)['call-id'] || (webhookData as any).uniqueid || (webhookData as any).uid;
      
      if (externalCallId) {
        console.log('Looking for existing call log with external_call_id:', externalCallId);
        const { data: existingCall, error: findError } = await supabase
          .from('call_logs')
          .select('*')
          .eq('external_call_id', externalCallId)
          .maybeSingle();
        
        if (!findError && existingCall) {
          callLog = existingCall;
          console.log('Found existing call log:', callLog.id);
        }
      }

      if (callLog) {
        // Update existing call log
        console.log('Updating existing call log:', callLog.id);
        
        // Extract recording URL from webhook data - OnlinePBX can send it in various fields
        const recordingUrl = (webhookData as any).download_url || 
                            (webhookData as any).record_url ||
                            (webhookData as any).record ||
                            (webhookData as any).recording_url ||
                            (webhookData as any).recordingUrl ||
                            (webhookData as any).audio_path ||
                            (webhookData as any).audio_url ||
                            (webhookData as any).link ||
                            (webhookData as any).record_link ||
                            (webhookData as any).file ||
                            (webhookData as any).file_url ||
                            (webhookData as any).mp3 ||
                            (webhookData as any).wav || null;
        
        console.log('[onlinepbx-webhook] Recording URL from webhook:', recordingUrl ? recordingUrl.substring(0, 80) + '...' : 'none');
        
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
        if (recordingUrl && !callLog.recording_url) {
          updateData.recording_url = recordingUrl;
        }
        // Save hangup_cause for call analysis
        if (hangupCause) {
          updateData.hangup_cause = hangupCause;
        }

        const { error: updateError } = await supabase
          .from('call_logs')
          .update(updateData)
          .eq('id', callLog.id);

        if (updateError) {
          console.error('Error updating call log:', updateError);
          throw updateError;
        }

        console.log(`Updated call log ${callLog.id} with status: ${status}, recording: ${!!recordingUrl}`);
        
        // Trigger automatic call analysis for answered calls > 30 seconds with recording (if not already analyzed)
        if (durationSeconds && durationSeconds > 30 && status === 'answered' && recordingUrl && !callLog.ai_evaluation) {
          console.log('Triggering automatic call analysis for updated call:', callLog.id);
          try {
            const analyzePromise = supabase.functions.invoke('analyze-call', { 
              body: { callId: callLog.id } 
            }).catch(e => console.error('Auto-analysis error:', e));
            
            if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
              EdgeRuntime.waitUntil(analyzePromise);
            }
          } catch (e) {
            console.error('Error triggering analysis:', e);
          }
        }
      } else {
        // Check for deduplication
        const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
        const { data: recentCall } = await supabase
          .from('call_logs')
          .select('id, status, direction, phone_number, started_at')
          .eq('phone_number', selectedPhone)
          .eq('direction', direction)
          .gte('started_at', sixtySecondsAgo)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (recentCall) {
          console.log('Found recent call, updating instead of creating new. Call ID:', recentCall.id);
          
          const statusPriority: { [key: string]: number } = {
            'answered': 5, 'busy': 4, 'failed': 3, 'missed': 2, 'initiated': 1
          };
          
          if ((statusPriority[status] || 0) >= (statusPriority[recentCall.status] || 0)) {
            const updateData: any = { status, updated_at: new Date().toISOString() };
            if (durationSeconds !== null) updateData.duration_seconds = durationSeconds;
            if (webhookData.end_time) updateData.ended_at = new Date(webhookData.end_time).toISOString();
            if (externalCallId) updateData.external_call_id = externalCallId;
            if (hangupCause) updateData.hangup_cause = hangupCause;
            
            await supabase.from('call_logs').update(updateData).eq('id', recentCall.id);
          }
          
          return new Response(
            JSON.stringify({ success: true, message: 'Deduplicated to existing call', callId: recentCall.id, deduplicated: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        
        // Create new call log
        console.log('Creating new call log for phone:', normalizedPhone);
        
        // Find client by phone - IMPROVED: support multiple phone formats
        // Filter by organization to ensure proper matching
        let clientId: string | null = null;
        let searchMethod: 'client_phone_numbers' | 'clients_phone' | 'messenger_id' | 'not_found' = 'not_found';
        const last10 = normalizedPhone.length >= 10 ? normalizedPhone.slice(-10) : normalizedPhone;
        
        // Generate multiple search variants for different formats
        // Russian phones can be: +79123456789, 89123456789, 79123456789, 9123456789
        const phoneVariants: string[] = [];
        if (last10.length === 10) {
          phoneVariants.push(last10);                    // 9123456789
          phoneVariants.push('7' + last10);              // 79123456789
          phoneVariants.push('8' + last10);              // 89123456789
          phoneVariants.push('+7' + last10);             // +79123456789
          // Formatted variants
          const formatted = `+7 (${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6, 8)}-${last10.slice(8, 10)}`;
          phoneVariants.push(formatted);                 // +7 (912) 345-67-89
        } else {
          phoneVariants.push(normalizedPhone);
        }
        
        console.log('[onlinepbx-webhook] Searching for client in org:', organizationId, 'variants:', phoneVariants.slice(0, 3));
        
        // First try client_phone_numbers with multiple patterns
        if (last10.length >= 10) {
          // Build OR conditions for all variants
          const orConditions = phoneVariants.map(v => `phone.ilike.%${v}%`).join(',');
          
          const { data: phoneRecords } = await supabase
            .from('client_phone_numbers')
            .select('client_id, phone, clients!inner(id, organization_id)')
            .eq('clients.organization_id', organizationId)
            .or(orConditions)
            .limit(5);
          
          if (phoneRecords && phoneRecords.length > 0) {
            clientId = phoneRecords[0].client_id;
            searchMethod = 'client_phone_numbers';
            console.log('[onlinepbx-webhook] Found client via client_phone_numbers:', clientId);
          }
        }
        
        // Fallback: search in clients.phone with multiple patterns
        if (!clientId && last10.length >= 10) {
          const orConditions = phoneVariants.map(v => `phone.ilike.%${v}%`).join(',');
          
          const { data: clients } = await supabase
            .from('clients')
            .select('id, phone')
            .eq('organization_id', organizationId)
            .or(orConditions)
            .limit(5);
          
          if (clients && clients.length > 0) {
            clientId = clients[0].id;
            searchMethod = 'clients_phone';
            console.log('[onlinepbx-webhook] Found client via clients table:', clientId);
          }
        }
        
        // Final fallback: try WhatsApp ID format (without + prefix)
        if (!clientId && last10.length >= 10) {
          const whatsappId = '7' + last10 + '@c.us';
          const { data: waClients } = await supabase
            .from('clients')
            .select('id')
            .eq('organization_id', organizationId)
            .or(`whatsapp_id.eq.${whatsappId},telegram_user_id.eq.${last10}`)
            .limit(1);
          
          if (waClients && waClients.length > 0) {
            clientId = waClients[0].id;
            searchMethod = 'messenger_id';
            console.log('[onlinepbx-webhook] Found client via messenger ID:', clientId);
          }
        }
        
        // Log client search result to webhook_logs for debugging (non-blocking)
        const clientSearchLog = {
          phone_searched: selectedPhone,
          normalized_phone: normalizedPhone,
          last_10_digits: last10,
          phone_variants_tried: phoneVariants?.slice(0, 5) || [],
          client_found: !!clientId,
          client_id: clientId,
          search_method: searchMethod,
          organization_id: organizationId
        };
        
        // Fire-and-forget logging - must not block or break webhook processing.
        // IMPORTANT: webhook_logs schema may not include organization_id column, so we only store it inside webhook_data.
        try {
          const logPromise = supabase.from('webhook_logs').insert({
            messenger_type: 'onlinepbx',
            event_type: 'client_search',
            webhook_data: clientSearchLog,
            processed: true,
          });

          if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
            // @ts-ignore
            EdgeRuntime.waitUntil(
              logPromise.then(() => {
                console.log('[onlinepbx-webhook] Logged client search:', clientSearchLog.client_found ? 'FOUND' : 'NOT_FOUND');
              }).catch((e) => {
                console.warn('[onlinepbx-webhook] Failed to log client search:', e);
              })
            );
          } else {
            logPromise.then(() => {
              console.log('[onlinepbx-webhook] Logged client search:', clientSearchLog.client_found ? 'FOUND' : 'NOT_FOUND');
            }).catch((e) => {
              console.warn('[onlinepbx-webhook] Failed to log client search:', e);
            });
          }
        } catch (e) {
          console.warn('[onlinepbx-webhook] Failed to schedule client search logging:', e);
        }

        let managerId: string | null = null;
        let managerName: string | null = null;
        
        // Get internal extension from webhook (dst for incoming, src for outgoing)
        const internalExtension = direction === 'incoming' ? rawTo : rawFrom;
        console.log('[onlinepbx-webhook] Looking for manager by extension:', internalExtension);
        
        if (internalExtension) {
          // Try exact match first
          const { data: managerByExt } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, onlinepbx_extension')
            .eq('onlinepbx_extension', internalExtension)
            .eq('organization_id', organizationId)
            .maybeSingle();
          
          if (managerByExt) {
            managerId = managerByExt.id;
            managerName = [managerByExt.first_name, managerByExt.last_name].filter(Boolean).join(' ') || null;
            console.log('[onlinepbx-webhook] Found manager:', managerName, managerId);
          } else {
            // Try partial match (extension might be part of SIP address)
            const { data: managerByPartial } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, onlinepbx_extension')
              .eq('organization_id', organizationId)
              .not('onlinepbx_extension', 'is', null)
              .limit(50);
            
            if (managerByPartial) {
              for (const m of managerByPartial) {
                if (m.onlinepbx_extension && 
                    (internalExtension.includes(m.onlinepbx_extension) || 
                     m.onlinepbx_extension.includes(internalExtension))) {
                  managerId = m.id;
                  managerName = [m.first_name, m.last_name].filter(Boolean).join(' ') || null;
                  console.log('[onlinepbx-webhook] Found manager by partial match:', managerName);
                  break;
                }
              }
            }
          }
        }
        
        // Create client if not found
        if (!clientId && direction === 'incoming') {
          console.log('Creating new client for phone:', selectedPhone);
          
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              name: `Клиент ${formattedPhone}`,
              phone: selectedPhone,
              branch: 'Окская',
              organization_id: organizationId,
              notes: `Создан автоматически из входящего звонка ${new Date().toLocaleDateString('ru-RU')}`
            })
            .select('id')
            .single();
          
          if (!clientError && newClient) {
            clientId = newClient.id;
            console.log('Created new client:', clientId);
            
            // Create lead for incoming calls
            const { data: newStatus } = await supabase
              .from('lead_statuses')
              .select('id')
              .eq('slug', 'new')
              .single();
            
            if (newStatus) {
              await supabase.from('leads').insert({
                first_name: 'Клиент',
                last_name: formattedPhone,
                phone: selectedPhone,
                branch: 'Окская',
                organization_id: organizationId,
                status_id: newStatus.id,
                notes: `Создан из входящего звонка ${new Date().toLocaleString('ru-RU')}`
              });
            }
          }
        }

        // Extract recording URL from webhook data - OnlinePBX can send it in various fields
        const recordingUrl = (webhookData as any).download_url || 
                            (webhookData as any).record_url ||
                            (webhookData as any).record ||
                            (webhookData as any).recording_url ||
                            (webhookData as any).recordingUrl ||
                            (webhookData as any).audio_path ||
                            (webhookData as any).audio_url ||
                            (webhookData as any).link ||
                            (webhookData as any).record_link ||
                            (webhookData as any).file ||
                            (webhookData as any).file_url ||
                            (webhookData as any).mp3 ||
                            (webhookData as any).wav || null;
        
        console.log('[onlinepbx-webhook] Recording URL for new call:', recordingUrl ? recordingUrl.substring(0, 80) + '...' : 'none');

        const newCallData: any = {
          client_id: clientId,
          phone_number: selectedPhone,
          direction,
          status,
          duration_seconds: durationSeconds,
          started_at: webhookData.start_time ? new Date(webhookData.start_time).toISOString() : new Date().toISOString(),
          external_call_id: externalCallId || null,
          updated_at: new Date().toISOString(),
          organization_id: organizationId,
          recording_url: recordingUrl,
          manager_id: managerId,
          manager_name: managerName,
          hangup_cause: hangupCause || null
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

        console.log('Created call log:', newCallLog.id, 'for org:', organizationId, 'status:', status, 'recording:', !!recordingUrl);
        
        // Trigger automatic call analysis for answered calls > 30 seconds with recording
        console.log('[onlinepbx-webhook] Analysis check: duration=', durationSeconds, 'status=', status, 'hasRecording=', !!recordingUrl);
        
        if (durationSeconds && durationSeconds >= 1 && status === 'answered' && recordingUrl) {
          console.log('[onlinepbx-webhook] ✓ Triggering automatic call analysis for:', newCallLog.id);
          try {
            // Use EdgeRuntime.waitUntil for background processing if available
            const analyzePromise = (async () => {
              try {
                console.log('[onlinepbx-webhook] Invoking analyze-call function...');
                const result = await supabase.functions.invoke('analyze-call', { 
                  body: { callId: newCallLog.id } 
                });
                console.log('[onlinepbx-webhook] analyze-call result:', JSON.stringify(result.data || result.error));
              } catch (e) {
                console.error('[onlinepbx-webhook] analyze-call invocation error:', e);
              }
            })();
            
            // Don't await - let it run in background
            if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
              EdgeRuntime.waitUntil(analyzePromise);
            }
          } catch (e) {
            console.error('[onlinepbx-webhook] Error triggering analysis:', e);
          }
        } else {
          console.log('[onlinepbx-webhook] ✗ Skipping analysis: conditions not met');
        }
        
        // If answered call without recording URL - schedule delayed fetch from OnlinePBX API
        // OnlinePBX often doesn't send recording URL in webhook, need to fetch it separately
        if (status === 'answered' && !recordingUrl) {
          console.log('[onlinepbx-webhook] Scheduling delayed recording fetch for call:', newCallLog.id);
          
          try {
            // Delay fetch by 30 seconds to allow OnlinePBX to process recording
            const fetchRecordingPromise = new Promise<void>(async (resolve) => {
              await new Promise(r => setTimeout(r, 30000)); // 30 second delay
              
              try {
                await supabase.functions.invoke('fetch-call-recording', { 
                  body: { 
                    callLogId: newCallLog.id,
                    phoneNumber: selectedPhone,
                    externalCallId: externalCallId
                  } 
                });
                console.log('[onlinepbx-webhook] Delayed recording fetch completed for:', newCallLog.id);
              } catch (e) {
                console.error('[onlinepbx-webhook] Delayed recording fetch error:', e);
              }
              resolve();
            });
            
            if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
              EdgeRuntime.waitUntil(fetchRecordingPromise);
            }
          } catch (e) {
            console.error('[onlinepbx-webhook] Error scheduling recording fetch:', e);
          }
        }
        
        // Notify about missed calls
        if (status === 'missed' && direction === 'incoming') {
          console.log('Missed incoming call, creating notification and push');
          
          // Format time for notification
          const callTime = webhookData.start_time 
            ? new Date(webhookData.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          
          // Get client name if available
          let clientName = formattedPhone;
          if (clientId) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('first_name, last_name, name, avatar_url')
              .eq('id', clientId)
              .single();
            
            if (clientData) {
              clientName = [clientData.first_name, clientData.last_name].filter(Boolean).join(' ') 
                || clientData.name 
                || formattedPhone;
            }
          }
          
          // Send push notification to managers/admins in this organization
          // === PUSH DIAGNOSTIC LOGGING ===
          console.log('[onlinepbx-webhook] === PUSH NOTIFICATION START ===');
          console.log('[onlinepbx-webhook] Organization ID:', organizationId);
          
          let pushResult: { sent?: number; failed?: number; error?: string } = {};
          let userIds: string[] = [];
          
          try {
            userIds = await getOrgAdminManagerUserIds(supabase, organizationId);
            console.log('[onlinepbx-webhook] getOrgAdminManagerUserIds returned:', userIds.length, 'users');
            console.log('[onlinepbx-webhook] User IDs:', userIds.slice(0, 5)); // Log first 5 for privacy
            
            if (userIds.length > 0) {
              pushResult = await sendPushNotification({
                userIds,
                payload: {
                  title: '📞 Пропущенный звонок',
                  body: `${clientName} звонил в ${callTime}`,
                  icon: '/pwa-192x192.png',
                  url: clientId ? `/newcrm?clientId=${clientId}&tab=calls` : '/newcrm?tab=calls',
                  tag: `missed-call-${newCallLog.id}`,
                },
              });
              console.log('[onlinepbx-webhook] Push result:', pushResult);
            } else {
              console.warn('[onlinepbx-webhook] No admin/manager users found for push!');
              pushResult = { sent: 0, failed: 0, error: 'No users with admin/manager role in org' };
            }
          } catch (pushErr) {
            console.error('[onlinepbx-webhook] Push notification error:', pushErr);
            pushResult = { sent: 0, failed: 0, error: String(pushErr) };
          }
          
          // Log push diagnostic to webhook_logs for UI visibility
          try {
            await supabase.from('webhook_logs').insert({
              messenger_type: 'push-diagnostic',
              event_type: 'missed_call_push',
              webhook_data: {
                organizationId,
                userIds,
                userCount: userIds.length,
                pushResult,
                callLogId: newCallLog.id,
                clientName,
                callTime,
              },
              processed: pushResult.sent !== undefined && pushResult.sent > 0,
            });
            console.log('[onlinepbx-webhook] Push diagnostic logged to webhook_logs');
          } catch (logErr) {
            console.warn('[onlinepbx-webhook] Failed to log push diagnostic:', logErr);
          }
          
          console.log('[onlinepbx-webhook] === PUSH NOTIFICATION END ===');
          
          let responsibleEmployeeId: string | null = null;
          if (rawTo) {
            const { data: employee } = await supabase
              .from('profiles')
              .select('id')
              .eq('extension_number', rawTo)
              .eq('organization_id', organizationId)
              .maybeSingle();
            responsibleEmployeeId = employee?.id || null;
          }
          
          if (responsibleEmployeeId) {
            await supabase.from('notifications').insert({
              recipient_id: responsibleEmployeeId,
              recipient_type: 'employee',
              title: 'Пропущенный звонок',
              message: `Пропущенный звонок от ${clientName}`,
              notification_type: 'missed_call',
              status: 'pending',
              delivery_method: ['in_app', 'push'],
              metadata: { call_log_id: newCallLog.id, phone_number: selectedPhone }
            });
          } else {
            // Notify all managers in this organization
            const { data: managers } = await supabase
              .from('profiles')
              .select('id')
              .eq('organization_id', organizationId)
              .in('role', ['admin', 'manager'])
              .limit(10);
            
            if (managers && managers.length > 0) {
              const notifications = managers.map(m => ({
                recipient_id: m.id,
                recipient_type: 'employee',
                title: 'Пропущенный звонок',
                message: `Пропущенный звонок от ${clientName}`,
                notification_type: 'missed_call',
                status: 'pending',
                delivery_method: ['in_app', 'push'],
                metadata: { call_log_id: newCallLog.id, phone_number: selectedPhone }
              }));
              
              await supabase.from('notifications').insert(notifications);
            }
          }
          
          // System message in chat
          if (clientId) {
            await supabase.from('chat_messages').insert({
              client_id: clientId,
              message_text: `⚠️ Пропущенный звонок от ${clientName}!`,
              message_type: 'system',
              is_outgoing: false,
              system_type: 'missed_call_notification',
              organization_id: organizationId
            });
          }
        }
        
        callLog = newCallLog;
      }

      const response: OnlinePBXWebhookResponse = { 
        success: true, 
        message: 'Webhook processed successfully',
        callId: callLog?.id
      };

      return new Response(
        JSON.stringify({ 
          ...response,
          callUpdated: !!callLog,
          phoneNumber: selectedPhone,
          normalizedPhone,
          status,
          organizationId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return successResponse({ success: true, message: 'OnlinePBX Webhook is running', method: req.method });

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
