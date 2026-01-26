import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
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

// Find organization by webhook key from query params (PRIMARY method)
async function findOrganizationByWebhookKey(supabase: ReturnType<typeof createClient>, webhookKey: string): Promise<string | null> {
  if (!webhookKey) return null;
  
  console.log('[onlinepbx-webhook] Looking up organization by webhook key:', webhookKey.substring(0, 8) + '...');
  
  // Try both camelCase (webhookKey) and snake_case (webhook_key) formats
  // Also try searching all enabled OnlinePBX settings and matching manually
  const { data: settings, error } = await supabase
    .from('messenger_settings')
    .select('organization_id, settings')
    .eq('messenger_type', 'onlinepbx')
    .eq('is_enabled', true);
  
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
        return setting.organization_id as string;
      }
    }
  }
  
  console.log('[onlinepbx-webhook] No organization found for webhook key');
  return null;
}

// Find organization by PBX domain from messenger_settings (FALLBACK method)
async function findOrganizationByPbxDomain(supabase: ReturnType<typeof createClient>, pbxDomain: string): Promise<string | null> {
  if (!pbxDomain) return null;
  
  console.log('[onlinepbx-webhook] Looking up organization by PBX domain:', pbxDomain);
  
  // Search in messenger_settings where messenger_type = 'onlinepbx'
  const { data: settings, error } = await supabase
    .from('messenger_settings')
    .select('organization_id, settings')
    .eq('messenger_type', 'onlinepbx')
    .eq('is_enabled', true);
  
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
        return setting.organization_id as string;
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
        return setting.organization_id as string;
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

      // STEP 1: Try to get organization from webhook key in URL (PRIMARY method)
      const url = new URL(req.url);
      const webhookKey = url.searchParams.get('key') || url.searchParams.get('webhook_key') || '';
      let organizationId: string | null = null;
      
      if (webhookKey) {
        organizationId = await findOrganizationByWebhookKey(supabase, webhookKey);
      }

      // STEP 2: Fallback - try PBX domain from webhook data
      if (!organizationId) {
        const pbxDomain = webhookData.domain || webhookData.pbx_domain || webhookData.account || 
                          (webhookData as any).pbx || (webhookData as any).Domain || '';
        console.log('[onlinepbx-webhook] PBX domain from webhook:', pbxDomain);
        
        if (pbxDomain) {
          organizationId = await findOrganizationByPbxDomain(supabase, pbxDomain);
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

      // Map OnlinePBX event/status to our status
      const mapStatus = (event: string | undefined, hangupCause: string | undefined, pbxStatus: string | undefined): string => {
        const eventLower = (event || '').toLowerCase();
        if (eventLower.includes('missed') || eventLower === 'call_missed') return 'missed';
        if (eventLower.includes('answered') || eventLower === 'call_answered') return 'answered';
        if (eventLower.includes('busy') || eventLower === 'call_busy') return 'busy';
        if (eventLower.includes('failed') || eventLower === 'call_failed') return 'failed';
        
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

      if (!normalizedPhone) {
        console.log('No phone number found in webhook data');
        return new Response(
          JSON.stringify({ success: true, message: 'Webhook processed but no phone number found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
        
        if (!findError && existingCall) {
          callLog = existingCall;
          console.log('Found existing call log:', callLog.id);
        }
      }

      if (callLog) {
        // Update existing call log
        console.log('Updating existing call log:', callLog.id);
        
        // Extract recording URL from webhook data
        const recordingUrl = (webhookData as any).download_url || 
                            (webhookData as any).record_url ||
                            (webhookData as any).record ||
                            (webhookData as any).recording_url ||
                            (webhookData as any).recordingUrl || null;
        
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
            
            await supabase.from('call_logs').update(updateData).eq('id', recentCall.id);
          }
          
          return new Response(
            JSON.stringify({ success: true, message: 'Deduplicated to existing call', callId: recentCall.id, deduplicated: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        
        // Create new call log
        console.log('Creating new call log for phone:', normalizedPhone);
        
        // Find client by phone - IMPROVED: use ilike for fuzzy matching
        // Filter by organization to ensure proper matching
        let clientId: string | null = null;
        const last10 = normalizedPhone.length >= 10 ? normalizedPhone.slice(-10) : normalizedPhone;
        console.log('[onlinepbx-webhook] Searching for client in org:', organizationId, 'last10:', last10);
        
        // First try client_phone_numbers with ilike (most reliable - normalized phones)
        if (last10.length >= 10) {
          const { data: phoneRecords } = await supabase
            .from('client_phone_numbers')
            .select('client_id, phone, clients!inner(id, organization_id)')
            .eq('clients.organization_id', organizationId)
            .ilike('phone', `%${last10}%`)
            .limit(5);
          
          if (phoneRecords && phoneRecords.length > 0) {
            clientId = phoneRecords[0].client_id;
            console.log('[onlinepbx-webhook] Found client via client_phone_numbers:', clientId);
          }
        }
        
        // Fallback: search in clients.phone with ilike
        if (!clientId && last10.length >= 10) {
          const { data: clients } = await supabase
            .from('clients')
            .select('id, phone')
            .eq('organization_id', organizationId)
            .or(`phone.ilike.%${last10}%,phone.ilike.%${normalizedPhone}%`)
            .limit(5);
          
          if (clients && clients.length > 0) {
            clientId = clients[0].id;
            console.log('[onlinepbx-webhook] Found client via clients table:', clientId);
          }
        }

        // Find manager by OnlinePBX extension
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

        // Extract recording URL from webhook data
        const recordingUrl = (webhookData as any).download_url || 
                            (webhookData as any).record_url ||
                            (webhookData as any).record ||
                            (webhookData as any).recording_url ||
                            (webhookData as any).recordingUrl || null;

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
          manager_name: managerName
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
        if (durationSeconds && durationSeconds > 30 && status === 'answered' && recordingUrl) {
          console.log('Triggering automatic call analysis for:', newCallLog.id);
          try {
            // Use EdgeRuntime.waitUntil for background processing if available
            const analyzePromise = supabase.functions.invoke('analyze-call', { 
              body: { callId: newCallLog.id } 
            }).catch(e => console.error('Auto-analysis error:', e));
            
            // Don't await - let it run in background
            if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
              EdgeRuntime.waitUntil(analyzePromise);
            }
          } catch (e) {
            console.error('Error triggering analysis:', e);
          }
        }
        
        // Notify about missed calls
        if (status === 'missed' && direction === 'incoming') {
          console.log('Missed incoming call, creating notification');
          
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
          
          const clientName = formattedPhone;
          
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
