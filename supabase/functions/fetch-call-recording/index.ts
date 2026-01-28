import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../_shared/types.ts';

interface FetchRecordingRequest {
  callLogId: string;
  phoneNumber?: string;
  externalCallId?: string;
}

// Get OnlinePBX config from messenger_settings
async function getOnlinePBXConfig(supabase: any, organizationId: string) {
  const { data: messengerSettings, error: msError } = await supabase
    .from('messenger_settings')
    .select('settings, is_enabled')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'onlinepbx')
    .maybeSingle();

  if (!msError && messengerSettings?.settings) {
    const settings = messengerSettings.settings;
    return {
      pbx_domain: settings.pbxDomain || settings.pbx_domain,
      key_id: settings.keyId || settings.key_id,
      key_secret: settings.keySecret || settings.key_secret,
      is_enabled: messengerSettings.is_enabled
    };
  }

  return null;
}

Deno.serve(async (req) => {
  console.log('=== FETCH CALL RECORDING ===');
  
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse('Configuration error', 500);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (req.method !== 'POST') {
      return successResponse({ message: 'Fetch call recording service ready' });
    }

    const body: FetchRecordingRequest = await req.json();
    const { callLogId, phoneNumber, externalCallId } = body;

    if (!callLogId) {
      return errorResponse('callLogId is required', 400);
    }

    console.log('[fetch-call-recording] Processing call:', callLogId);

    // Get call log details
    const { data: callLog, error: callError } = await supabase
      .from('call_logs')
      .select('*, organization_id')
      .eq('id', callLogId)
      .single();

    if (callError || !callLog) {
      console.error('[fetch-call-recording] Call not found:', callError);
      return errorResponse('Call not found', 404);
    }

    // Skip if already has recording
    if (callLog.recording_url) {
      console.log('[fetch-call-recording] Call already has recording:', callLog.recording_url.substring(0, 50));
      return successResponse({ 
        success: true, 
        message: 'Recording already exists',
        recording_url: callLog.recording_url 
      });
    }

    // Get OnlinePBX config
    const config = await getOnlinePBXConfig(supabase, callLog.organization_id);
    
    if (!config || !config.is_enabled) {
      console.log('[fetch-call-recording] OnlinePBX not configured or disabled');
      return errorResponse('OnlinePBX not configured', 400);
    }

    if (!config.pbx_domain || !config.key_id || !config.key_secret) {
      console.log('[fetch-call-recording] OnlinePBX config incomplete');
      return errorResponse('OnlinePBX config incomplete', 400);
    }

    // Build API request to get call history
    const pbxDomain = config.pbx_domain.replace(/\.onpbx\.ru$/, '');
    const apiUrl = `https://api2.onlinepbx.ru/${pbxDomain}/calls/history.json`;
    
    // Normalize phone for search
    const phone = phoneNumber || callLog.phone_number;
    const digits = phone?.replace(/\D/g, '') || '';
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    
    // Calculate date range (last 24 hours from call start)
    const callDate = new Date(callLog.started_at);
    const dateFrom = new Date(callDate.getTime() - 24 * 60 * 60 * 1000);
    const dateTo = new Date(callDate.getTime() + 24 * 60 * 60 * 1000);
    
    const params = new URLSearchParams({
      date_from: dateFrom.toISOString().split('T')[0],
      date_to: dateTo.toISOString().split('T')[0],
      phone: last10.length >= 10 ? last10 : phone,
    });

    console.log('[fetch-call-recording] Fetching from OnlinePBX:', apiUrl, params.toString());

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'x-pbx-authentication': `${config.key_id}:${config.key_secret}`,
        'Content-Type': 'application/json'
      }
    });

    const responseData = await response.json();
    console.log('[fetch-call-recording] OnlinePBX response status:', response.status);
    console.log('[fetch-call-recording] OnlinePBX response:', JSON.stringify(responseData).substring(0, 500));

    if (!response.ok) {
      console.error('[fetch-call-recording] OnlinePBX API error:', responseData);
      return errorResponse(`OnlinePBX API error: ${response.status}`, 500);
    }

    // Find matching call in history
    const calls = responseData.data || responseData.calls || responseData.items || [];
    let matchedCall = null;
    
    for (const call of calls) {
      // Match by external_call_id first
      const callId = call.call_id || call.callid || call.uniqueid || call.uid;
      if (externalCallId && callId === externalCallId) {
        matchedCall = call;
        break;
      }
      
      // Match by phone and time
      const callPhone = (call.from || call.to || call.src || call.dst || '').replace(/\D/g, '');
      const callPhoneLast10 = callPhone.length >= 10 ? callPhone.slice(-10) : callPhone;
      
      if (callPhoneLast10 === last10) {
        // Check time proximity (within 5 minutes)
        const callTime = new Date(call.start_time || call.started_at || call.date);
        const timeDiff = Math.abs(callTime.getTime() - callDate.getTime());
        
        if (timeDiff < 5 * 60 * 1000) { // 5 minutes
          matchedCall = call;
          break;
        }
      }
    }

    if (!matchedCall) {
      console.log('[fetch-call-recording] No matching call found in OnlinePBX history');
      
      // Log the search attempt for debugging
      await supabase.from('webhook_logs').insert({
        messenger_type: 'onlinepbx',
        event_type: 'recording_fetch_failed',
        webhook_data: {
          call_log_id: callLogId,
          phone_searched: last10,
          external_call_id: externalCallId,
          calls_found: calls.length,
          date_range: { from: dateFrom.toISOString(), to: dateTo.toISOString() }
        },
        processed: true
      });
      
      return successResponse({ 
        success: false, 
        message: 'No matching call found in OnlinePBX history',
        calls_checked: calls.length
      });
    }

    console.log('[fetch-call-recording] Found matching call:', JSON.stringify(matchedCall).substring(0, 300));

    // Extract recording URL from matched call
    const recordingUrl = matchedCall.download_url || 
                        matchedCall.record_url ||
                        matchedCall.record ||
                        matchedCall.recording_url ||
                        matchedCall.audio_path ||
                        matchedCall.audio_url ||
                        matchedCall.link ||
                        matchedCall.mp3 ||
                        matchedCall.wav || null;

    const duration = matchedCall.duration || matchedCall.billsec || matchedCall.duration_seconds || null;

    // Update call log
    const updateData: any = {};
    
    if (recordingUrl) {
      updateData.recording_url = recordingUrl;
      console.log('[fetch-call-recording] Found recording URL:', recordingUrl.substring(0, 80));
    }
    
    if (duration && !callLog.duration_seconds) {
      updateData.duration_seconds = typeof duration === 'string' ? parseInt(duration) : duration;
    }
    
    if (matchedCall.call_id || matchedCall.uniqueid) {
      updateData.external_call_id = matchedCall.call_id || matchedCall.uniqueid;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('call_logs')
        .update(updateData)
        .eq('id', callLogId);

      if (updateError) {
        console.error('[fetch-call-recording] Update error:', updateError);
        return errorResponse(`Update failed: ${updateError.message}`, 500);
      }

      console.log('[fetch-call-recording] Updated call log with:', Object.keys(updateData));

      // Trigger analysis if we now have recording and duration
      const shouldAnalyze = recordingUrl && updateData.duration_seconds && updateData.duration_seconds >= 1 && callLog.status === 'answered';
      console.log('[fetch-call-recording] Analysis check: hasRecording=', !!recordingUrl, 'duration=', updateData.duration_seconds, 'status=', callLog.status, 'shouldAnalyze=', shouldAnalyze);
      
      if (shouldAnalyze) {
        console.log('[fetch-call-recording] ✓ Triggering call analysis for:', callLogId);
        
        try {
          const result = await supabase.functions.invoke('analyze-call', { 
            body: { callId: callLogId } 
          });
          console.log('[fetch-call-recording] analyze-call result:', JSON.stringify(result.data || result.error));
        } catch (e) {
          console.error('[fetch-call-recording] Failed to trigger analysis:', e);
        }
      } else {
        console.log('[fetch-call-recording] ✗ Skipping analysis: conditions not met');
      }
    }

    return successResponse({
      success: true,
      recording_url: recordingUrl,
      duration_seconds: updateData.duration_seconds,
      external_call_id: updateData.external_call_id,
      message: recordingUrl ? 'Recording found and saved' : 'No recording URL in call data'
    });

  } catch (error) {
    console.error('[fetch-call-recording] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
