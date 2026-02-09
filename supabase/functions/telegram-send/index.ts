import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  errorResponse,
  getErrorMessage,
  type TelegramSendRequest,
  type TelegramSendResponse,
  type TelegramSettings,
} from '../_shared/types.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body early to get clientId for smart routing
    const body = await req.json() as TelegramSendRequest & { phoneNumber?: string; teacherId?: string; organizationId?: string };
    const { clientId, text, fileUrl, fileName, fileType, phoneId, phoneNumber, teacherId } = body;

    // Get organization ID - try auth first, fall back to body.organizationId for inter-function calls
    let organizationId: string | null = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        organizationId = profile?.organization_id || null;
      }
    }

    // Fallback: use organizationId from body (for inter-function calls like tbank-webhook)
    if (!organizationId && body.organizationId) {
      organizationId = body.organizationId;
      console.log('[telegram-send] Using organizationId from body (inter-function call)');
    }

    if (!organizationId) {
      return errorResponse('Organization not found - auth failed and no organizationId provided', 401);
    }

    // === SMART ROUTING: Find integration_id from last incoming message ===
    let resolvedIntegrationId: string | null = null;
    
    // Mode 1: Search by clientId (for client messages)
    if (clientId) {
      const { data: lastMessage } = await supabase
        .from('chat_messages')
        .select('integration_id')
        .eq('client_id', clientId)
        .eq('is_outgoing', false)
        .eq('messenger_type', 'telegram')
        .not('integration_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMessage?.integration_id) {
        resolvedIntegrationId = lastMessage.integration_id;
        console.log('[telegram-send] Smart routing (client):', resolvedIntegrationId);
      }
    }
    
    // Mode 2: Search by teacherId (for teacher messages)
    if (!resolvedIntegrationId && teacherId) {
      const { data: lastTeacherMessage } = await supabase
        .from('chat_messages')
        .select('integration_id')
        .eq('teacher_id', teacherId)
        .eq('is_outgoing', false)
        .eq('messenger_type', 'telegram')
        .not('integration_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastTeacherMessage?.integration_id) {
        resolvedIntegrationId = lastTeacherMessage.integration_id;
        console.log('[telegram-send] Smart routing (teacher):', resolvedIntegrationId);
      }
    }
    
    // Mode 3: Search by phone → teacher_id (fallback when teacherId not provided)
    if (!resolvedIntegrationId && phoneNumber && !teacherId) {
      const phone10 = phoneNumber.replace(/\D/g, '').slice(-10);
      
      if (phone10.length === 10) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .ilike('phone', `%${phone10}`)
          .eq('organization_id', organizationId)
          .maybeSingle();
        
        if (teacher?.id) {
          const { data: msg } = await supabase
            .from('chat_messages')
            .select('integration_id')
            .eq('teacher_id', teacher.id)
            .eq('is_outgoing', false)
            .eq('messenger_type', 'telegram')
            .not('integration_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (msg?.integration_id) {
            resolvedIntegrationId = msg.integration_id;
            console.log('[telegram-send] Smart routing (phone→teacher):', resolvedIntegrationId);
          }
        }
      }
    }

    // Build integration query based on smart routing result
    let integrationQuery = supabase
      .from('messenger_integrations')
      .select('id, provider, settings, is_enabled')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'telegram')
      .eq('is_enabled', true);

    // If smart routing found an integration_id, use it; otherwise fall back to primary
    if (resolvedIntegrationId) {
      integrationQuery = integrationQuery.eq('id', resolvedIntegrationId);
    } else {
      integrationQuery = integrationQuery.eq('is_primary', true);
    }

    const { data: integration, error: integrationError } = await integrationQuery.maybeSingle();

    // If using telegram_crm provider, delegate to telegram-crm-send
    if (integration && integration.provider === 'telegram_crm') {
      console.log('[telegram-send] Routing to telegram-crm-send');
      
      // Forward to telegram-crm-send - let it do its own smart routing if no resolvedIntegrationId
      const crmResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-crm-send`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          // Only pass integrationId if we found it via smart routing, otherwise let telegram-crm-send find it
          ...(resolvedIntegrationId ? { integrationId: resolvedIntegrationId } : {}),
        }),
      });

      const crmResult = await crmResponse.json();
      return new Response(
        JSON.stringify(crmResult),
        { 
          status: crmResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fall back to legacy messenger_settings or wappi provider
    let profileId: string | undefined;
    let wappiApiToken: string | undefined;

    if (integration && integration.provider === 'wappi') {
      // Use wappi settings from messenger_integrations
      const settings = integration.settings as TelegramSettings | null;
      profileId = settings?.profileId;
      wappiApiToken = settings?.apiToken;
    } else {
      // Legacy: Get from messenger_settings
      const { data: messengerSettings, error: settingsError } = await supabase
        .from('messenger_settings')
        .select('settings, is_enabled')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'telegram')
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching Telegram settings:', settingsError);
        return errorResponse('Failed to fetch Telegram settings', 500);
      }

      if (!messengerSettings || !messengerSettings.is_enabled) {
        return errorResponse('Telegram integration not configured or disabled', 400);
      }

      const settings = messengerSettings.settings as TelegramSettings | null;
      profileId = settings?.profileId;
      wappiApiToken = settings?.apiToken;
    }

    if (!profileId || !wappiApiToken) {
      return errorResponse('Telegram Profile ID or API Token not configured', 400);
    }

    // body, clientId, text, etc. already parsed above for smart routing

    // Validate: either clientId or phoneNumber must be provided
    if (!clientId && !phoneNumber) {
      return errorResponse('clientId or phoneNumber is required', 400);
    }

    let resolvedTeacherId: string | null = teacherId || null;
    let resolvedClientId: string | null = clientId || null;
    let client: { telegram_chat_id?: string | null; telegram_user_id?: string | null; phone?: string | null; name?: string | null } | null = null;

    // Mode 1: Client lookup (when clientId provided)
    if (clientId) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('telegram_chat_id, telegram_user_id, phone, name')
        .eq('id', clientId)
        .eq('organization_id', organizationId)
        .single();

      if (clientError || !clientData) {
        return errorResponse('Client not found', 404);
      }
      client = clientData;
    }

    // ====== STRICT PHONE VALIDATION ======
    // Checks if a number looks like a phone (not a Telegram ID)
    // Telegram IDs: 9-13 digits, don't follow phone patterns
    // Russian phones: 79XXXXXXXXX (11 digits starting with 79)
    function isLikelyPhoneNumber(input: string | null | undefined): boolean {
      if (!input) return false;
      
      const cleaned = input.replace(/\D/g, '');
      const len = cleaned.length;
      
      // Too short or too long - not a phone
      if (len < 10 || len > 15) return false;
      
      const first = cleaned[0];
      const second = cleaned[1];
      
      // 11 digits starting with 7: check second digit
      // Valid: 79 (mobile), 73/74/78 (landline)
      // Invalid: 70, 71, 72 - these are likely Telegram IDs with 7 prepended
      if (len === 11 && first === '7') {
        if (second === '0' || second === '1' || second === '2') {
          return false; // Likely Telegram ID
        }
        return true;
      }
      
      // 11 digits starting with 8: same check
      if (len === 11 && first === '8') {
        if (second === '0' || second === '1' || second === '2') {
          return false;
        }
        return true;
      }
      
      // 10 digits starting with 9: mobile without country code
      if (len === 10 && first === '9') {
        return true;
      }
      
      // 10 digits NOT starting with 9: likely Telegram ID (e.g., 1212686911)
      if (len === 10 && first !== '9') {
        return false;
      }
      
      // 12+ digits: check for known country codes
      if (len >= 12) {
        const knownPrefixes = ['7', '380', '375', '998', '996', '992', '993', '994', '995', '374', '373', '370', '371', '372', '1', '44', '49', '33', '39', '34', '90', '86', '91'];
        if (knownPrefixes.some(p => cleaned.startsWith(p))) {
          return true;
        }
        return false; // Unknown prefix - likely Telegram ID
      }
      
      return false;
    }
    
    // Strict normalize: returns null if input doesn't look like a phone
    function normalizePhoneStrict(phone: string | null | undefined): string | null {
      if (!phone) return null;
      if (!isLikelyPhoneNumber(phone)) return null;
      
      let digits = phone.replace(/\D/g, '');
      
      // 11 digits starting with 8 → replace with 7
      if (digits.length === 11 && digits.startsWith('8')) {
        digits = '7' + digits.substring(1);
      }
      
      // 10 digits starting with 9 → prepend 7
      if (digits.length === 10 && digits.startsWith('9')) {
        digits = '7' + digits;
      }
      
      return digits.length >= 10 ? digits : null;
    }
    
    // Legacy normalize: for backward compatibility (any 10+ digit number)
    function normalizePhone(phone: string | null | undefined): string | null {
      if (!phone) return null;
      
      let digits = phone.replace(/\D/g, '');
      
      if (digits.length === 11 && digits.startsWith('8')) {
        digits = '7' + digits.substring(1);
      }
      
      if (digits.length === 10 && digits.startsWith('9')) {
        digits = '7' + digits;
      }
      
      return digits.length >= 10 ? digits : null;
    }

    // Try to get chat ID from specified phone number first, with phone fallback
    let recipient: string | null = null;
    let recipientSource = 'none';
    
    // === COLLECT FALLBACK PHONE DURING RECIPIENT RESOLUTION ===
    // This is the phone number we'll use for fallback if ID-based send fails
    let fallbackPhoneRaw: string | null = null;
    let fallbackPhoneNormalized: string | null = null;

    // Mode 2: Direct phone number (for teacher messages)
    if (phoneNumber && !clientId) {
      recipient = normalizePhone(phoneNumber);
      recipientSource = 'direct phoneNumber';
      // For direct phone mode, the phone itself is the recipient, no fallback needed
      fallbackPhoneRaw = phoneNumber;
      fallbackPhoneNormalized = normalizePhoneStrict(phoneNumber);
      console.log(`[telegram-send] Direct phone mode: ${phoneNumber} → ${recipient}`);
      
      // Find teacher by phone if teacherId not provided
      if (!resolvedTeacherId && recipient) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .ilike('phone', `%${recipient.slice(-10)}`)
          .eq('organization_id', organizationId)
          .maybeSingle();
        if (teacher) {
          resolvedTeacherId = teacher.id;
          console.log(`[telegram-send] Found teacher by phone: ${resolvedTeacherId}`);
        }
      }
    }
    // Client mode: lookup by phoneId, primary phone, or client fields
    else if (clientId && client) {
      // First, collect ALL possible phone sources for fallback
      const phoneSources: string[] = [];
      
      if (phoneId) {
        // Get chat ID from specific phone number
        const { data: phoneRecord } = await supabase
          .from('client_phone_numbers')
          .select('telegram_chat_id, telegram_user_id, telegram_username, phone_number')
          .eq('id', phoneId)
          .eq('client_id', clientId)
          .single();

        if (phoneRecord) {
          console.log('[telegram-send] Phone record found:', {
            telegram_chat_id: phoneRecord.telegram_chat_id,
            telegram_user_id: phoneRecord.telegram_user_id,
            telegram_username: phoneRecord.telegram_username,
            phone_number: phoneRecord.phone_number
          });
          
          // Collect phone for fallback (from same record)
          if (phoneRecord.phone_number) {
            phoneSources.push(phoneRecord.phone_number);
          }
          
          // Priority: chat_id > user_id > username > phone
          if (phoneRecord.telegram_chat_id) {
            recipient = phoneRecord.telegram_chat_id;
            recipientSource = 'telegram_chat_id (phoneRecord)';
          } else if (phoneRecord.telegram_user_id) {
            recipient = phoneRecord.telegram_user_id.toString();
            recipientSource = 'telegram_user_id (phoneRecord)';
          } else if (phoneRecord.telegram_username) {
            recipient = phoneRecord.telegram_username;
            recipientSource = 'telegram_username (phoneRecord)';
          } else {
            recipient = normalizePhone(phoneRecord.phone_number);
            recipientSource = 'phone_number (phoneRecord fallback)';
          }
        }
      }

      // If no recipient from phoneId, try primary phone number
      if (!recipient) {
        const { data: primaryPhone } = await supabase
          .from('client_phone_numbers')
          .select('telegram_chat_id, telegram_user_id, telegram_username, phone_number')
          .eq('client_id', clientId)
          .eq('is_primary', true)
          .maybeSingle();

        if (primaryPhone) {
          console.log('[telegram-send] Primary phone found:', {
            telegram_chat_id: primaryPhone.telegram_chat_id,
            telegram_user_id: primaryPhone.telegram_user_id,
            telegram_username: primaryPhone.telegram_username,
            phone_number: primaryPhone.phone_number
          });
          
          // Collect phone for fallback
          if (primaryPhone.phone_number) {
            phoneSources.push(primaryPhone.phone_number);
          }
          
          if (primaryPhone.telegram_chat_id) {
            recipient = primaryPhone.telegram_chat_id;
            recipientSource = 'telegram_chat_id (primary)';
          } else if (primaryPhone.telegram_user_id) {
            recipient = primaryPhone.telegram_user_id.toString();
            recipientSource = 'telegram_user_id (primary)';
          } else if (primaryPhone.telegram_username) {
            recipient = primaryPhone.telegram_username;
            recipientSource = 'telegram_username (primary)';
          } else {
            recipient = normalizePhone(primaryPhone.phone_number);
            recipientSource = 'phone_number (primary fallback)';
          }
        }
      }
      
      // Also collect client.phone for fallback
      if (client.phone) {
        phoneSources.push(client.phone);
      }

      // Fallback to client's telegram fields or phone (backward compatibility)
      if (!recipient) {
        console.log('[telegram-send] Client fields:', {
          telegram_chat_id: client.telegram_chat_id,
          telegram_user_id: client.telegram_user_id,
          phone: client.phone
        });
        
        if (client.telegram_chat_id) {
          recipient = client.telegram_chat_id;
          recipientSource = 'telegram_chat_id (client)';
        } else if (client.telegram_user_id) {
          recipient = client.telegram_user_id.toString();
          recipientSource = 'telegram_user_id (client)';
        } else {
          recipient = normalizePhone(client.phone);
          recipientSource = 'phone (client fallback)';
        }
      }
      
      // Try to get any phone from client_phone_numbers if we don't have one yet
      if (phoneSources.length === 0) {
        const { data: anyPhone } = await supabase
          .from('client_phone_numbers')
          .select('phone_number')
          .eq('client_id', clientId)
          .limit(1)
          .maybeSingle();
        if (anyPhone?.phone_number) {
          phoneSources.push(anyPhone.phone_number);
        }
      }
      
      // Find the first VALID phone from collected sources (using strict validation)
      for (const rawPhone of phoneSources) {
        const normalized = normalizePhoneStrict(rawPhone);
        if (normalized) {
          fallbackPhoneRaw = rawPhone;
          fallbackPhoneNormalized = normalized;
          break;
        }
      }
      
      console.log(`[telegram-send] Fallback phone collected: raw=${fallbackPhoneRaw}, normalized=${fallbackPhoneNormalized}`);
    }
    
    if (!recipient) {
      const response: TelegramSendResponse = { 
        success: false,
        error: 'У клиента нет Telegram ID и номера телефона для отправки',
        code: 'NO_TELEGRAM_CONTACT'
      };
      return new Response(
        JSON.stringify(response),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[telegram-send] Final recipient: ${recipient} (source: ${recipientSource})`);
    console.log(`[telegram-send] ⚠️ IMPORTANT: If using phone number, Wappi may fail with "peer not found" unless contact is in phone book`);

    // Send message via Wappi.pro using per-organization apiToken
    let sendResult: { success: boolean; messageId?: string; error?: string };
    if (fileUrl) {
      sendResult = await sendFileMessage(profileId, recipient, fileUrl, text || '', wappiApiToken);
    } else if (text) {
      sendResult = await sendTextMessage(profileId, recipient, text, wappiApiToken);
    } else {
      return errorResponse('Message text or file is required', 400);
    }

    // === FALLBACK: If first attempt failed, try phone number ===
    if (!sendResult.success) {
      const errorMsg = sendResult.error || 'Failed to send message';
      console.log(`[telegram-send] First attempt failed: ${errorMsg}`);
      console.log(`[telegram-send] Recipient was: ${recipient}, source: ${recipientSource}`);
      console.log(`[telegram-send] Fallback phone available: ${fallbackPhoneNormalized}`);
      
      // Determine if we should try phone fallback:
      // 1. Source explicitly says we used telegram_* field
      // 2. OR recipient doesn't look like a valid phone number (strict check)
      const sourceIndicatesId = recipientSource.includes('telegram_chat_id') || 
                                 recipientSource.includes('telegram_user_id') ||
                                 recipientSource.includes('telegram_username') ||
                                 recipientSource === 'none';
      
      const recipientLooksLikePhone = isLikelyPhoneNumber(recipient);
      
      // Try fallback if: source says ID, OR recipient doesn't look like phone
      const shouldTryFallback = sourceIndicatesId || !recipientLooksLikePhone;
      
      console.log(`[telegram-send] Fallback check: sourceIndicatesId=${sourceIndicatesId}, recipientLooksLikePhone=${recipientLooksLikePhone}, shouldTryFallback=${shouldTryFallback}`);
      
      if (shouldTryFallback && fallbackPhoneNormalized && fallbackPhoneNormalized !== recipient) {
        console.log(`[telegram-send] ===== PHONE FALLBACK ATTEMPT =====`);
        console.log(`[telegram-send] Original recipient: ${recipient}`);
        console.log(`[telegram-send] Fallback phone: ${fallbackPhoneNormalized}`);
        
        if (fileUrl) {
          sendResult = await sendFileMessage(profileId, fallbackPhoneNormalized, fileUrl, text || '', wappiApiToken);
        } else if (text) {
          sendResult = await sendTextMessage(profileId, fallbackPhoneNormalized, text, wappiApiToken);
        }
        
        if (sendResult.success) {
          console.log(`[telegram-send] Phone fallback SUCCEEDED!`);
          recipient = fallbackPhoneNormalized;
          recipientSource = 'phone (fallback after ID error)';
        } else {
          console.log(`[telegram-send] Phone fallback also failed:`, sendResult.error);
        }
      } else if (fallbackPhoneNormalized === recipient) {
        console.log(`[telegram-send] Phone fallback skipped: fallback phone equals recipient`);
      } else if (!fallbackPhoneNormalized) {
        console.log(`[telegram-send] No valid phone available for fallback (fallbackPhoneNormalized is null)`);
        console.log(`[telegram-send] This means no phone number in DB passed strict validation (isLikelyPhoneNumber)`);
      } else {
        console.log(`[telegram-send] Fallback not triggered: shouldTryFallback=${shouldTryFallback}`);
      }
    }

    // === FALLBACK TO OTHER INTEGRATIONS ===
    // If primary integration failed (including phone fallback), try alternative integrations
    if (!sendResult.success) {
      console.log(`[telegram-send] Primary integration ${integration?.id} failed, looking for alternative integrations`);
      
      const { data: alternativeIntegrations } = await supabase
        .from('messenger_integrations')
        .select('id, provider, settings, is_enabled')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'telegram')
        .eq('is_enabled', true)
        .neq('id', integration?.id || '')
        .order('is_primary', { ascending: false });
      
      if (alternativeIntegrations && alternativeIntegrations.length > 0) {
        console.log(`[telegram-send] Found ${alternativeIntegrations.length} alternative integration(s)`);
        
        for (const altIntegration of alternativeIntegrations) {
          console.log(`[telegram-send] Trying alternative: ${altIntegration.provider} (${altIntegration.id})`);
          
          if (altIntegration.provider === 'wappi') {
            // Try Wappi with alternative account
            const altSettings = altIntegration.settings as TelegramSettings;
            if (altSettings?.profileId && altSettings?.apiToken) {
              // Try with ID first
              let altRecipient = recipient;
              let altResult: { success: boolean; messageId?: string; error?: string };
              
              if (fileUrl) {
                altResult = await sendFileMessage(altSettings.profileId, altRecipient, fileUrl, text || '', altSettings.apiToken);
              } else if (text) {
                altResult = await sendTextMessage(altSettings.profileId, altRecipient, text, altSettings.apiToken);
              } else {
                altResult = { success: false, error: 'No content' };
              }
              
              // If ID failed, try phone
              if (!altResult.success && fallbackPhoneNormalized && fallbackPhoneNormalized !== altRecipient) {
                console.log(`[telegram-send] Alternative Wappi: ID failed, trying phone ${fallbackPhoneNormalized}`);
                if (fileUrl) {
                  altResult = await sendFileMessage(altSettings.profileId, fallbackPhoneNormalized, fileUrl, text || '', altSettings.apiToken);
                } else if (text) {
                  altResult = await sendTextMessage(altSettings.profileId, fallbackPhoneNormalized, text, altSettings.apiToken);
                }
                if (altResult.success) altRecipient = fallbackPhoneNormalized;
              }
              
              if (altResult.success) {
                console.log(`[telegram-send] Alternative Wappi integration SUCCEEDED! (${altIntegration.id})`);
                sendResult = altResult;
                recipientSource = `alternative wappi (${altIntegration.id})`;
                break;
              } else {
                console.log(`[telegram-send] Alternative Wappi failed:`, altResult.error);
              }
            }
          } else if (altIntegration.provider === 'telegram_crm') {
            // Try Telegram CRM via cross-function call
            try {
              console.log(`[telegram-send] Trying alternative Telegram CRM (${altIntegration.id})`);
              const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
              
              const crmResponse = await fetch(`${supabaseUrl}/functions/v1/telegram-crm-send`, {
                method: 'POST',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  clientId: resolvedClientId,
                  text,
                  fileUrl,
                  fileName,
                  fileType,
                  integrationId: altIntegration.id,
                }),
              });
              
              const crmResult = await crmResponse.json();
              console.log(`[telegram-send] Telegram CRM response:`, crmResult);
              
              if (crmResult.success) {
                console.log(`[telegram-send] Alternative Telegram CRM integration SUCCEEDED! (${altIntegration.id})`);
                sendResult = { success: true, messageId: crmResult.messageId };
                recipientSource = `alternative telegram_crm (${altIntegration.id})`;
                break;
              } else {
                console.log(`[telegram-send] Alternative Telegram CRM failed:`, crmResult.error);
              }
            } catch (e) {
              console.error(`[telegram-send] Alternative Telegram CRM exception:`, e);
            }
          }
        }
      } else {
        console.log('[telegram-send] No alternative integrations available');
      }
    }
      
    // Helper function to check if error indicates contact not found (PEER_NOT_FOUND, IMPORT_FAILED, etc.)
    function isContactNotFoundError(errorMsg: string): boolean {
      const lower = errorMsg.toLowerCase();
      return lower.includes('peer not found') ||
             lower.includes('peer_not_found') ||
             lower.includes('no peer') ||
             lower.includes('import_failed') ||
             lower.includes('import failed');
    }

    // If still failed after ALL fallback attempts (primary + phone + alternatives)
    if (!sendResult.success) {
      const finalErrorMsg = sendResult.error || 'Failed to send message';
      const isFinalPeerNotFound = isContactNotFoundError(finalErrorMsg);
      
      console.log(`[telegram-send] Final error analysis: "${finalErrorMsg}", isContactNotFound=${isFinalPeerNotFound}`);
      
      if (isFinalPeerNotFound) {
        const response: TelegramSendResponse = { 
          success: false,
          error: 'Клиент не найден в Telegram (IMPORT_FAILED/PEER_NOT_FOUND). Попросите клиента написать вам первым, чтобы установить связь. Попробованы все доступные интеграции.',
          code: 'PEER_NOT_FOUND'
        };
        console.error('[telegram-send] Contact not found error after trying all integrations. Client needs to message first.');
        return new Response(
          JSON.stringify(response),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return errorResponse(finalErrorMsg, 500);
    }

    // Save message to database - message_type is 'manager' for outgoing messages
    const contentType = fileUrl ? getMessageTypeFromFile(fileType) : 'text';
    
    const messageRecord: Record<string, unknown> = {
      organization_id: organizationId,
      message_text: text || (fileUrl ? '[Файл]' : ''),
      message_type: 'manager', // outgoing message from manager
      messenger_type: 'telegram',
      message_status: 'sent', // Use 'message_status' field for delivery tracking
      is_outgoing: true,
      is_read: true,
      external_message_id: sendResult.messageId,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType || contentType // store content type
    };

    // Add client_id or teacher_id based on mode
    if (resolvedClientId) {
      messageRecord.client_id = resolvedClientId;
    }
    if (resolvedTeacherId) {
      messageRecord.teacher_id = resolvedTeacherId;
    }
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert(messageRecord)
      .select('id')
      .single();

    if (saveError) {
      console.error('Error saving sent message:', saveError);
    }

    // Update client's last_message_at (only if we have a clientId)
    if (resolvedClientId) {
      await supabase
        .from('clients')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', resolvedClientId);
    }

    const response: TelegramSendResponse = { 
      success: true, 
      messageId: sendResult.messageId,
      savedMessageId: savedMessage?.id
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Telegram send error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});

async function sendTextMessage(
  profileId: string,
  recipient: string,
  text: string,
  apiToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `https://wappi.pro/tapi/sync/message/send?profile_id=${profileId}`;
  // Removed parse_mode: 'MarkdownV2' - it causes API errors when text contains unescaped special chars
  return await sendMessage(url, apiToken, { recipient, body: text }, 'text');
}

async function sendFileMessage(
  profileId: string,
  recipient: string,
  fileUrl: string,
  caption: string,
  apiToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `https://wappi.pro/tapi/sync/message/file/url/send?profile_id=${profileId}`;
  // Removed parse_mode: 'MarkdownV2' - it causes API errors when caption contains unescaped special chars
  const body: Record<string, unknown> = { recipient, url: fileUrl };
  if (caption) {
    body.caption = caption;
  }
  return await sendMessage(url, apiToken, body, 'file');
}

async function sendMessage(
  url: string,
  apiToken: string,
  body: Record<string, unknown>,
  kind: 'text' | 'file'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log(`[telegram-send] Sending ${kind} message:`, body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    let data: { status?: string; detail?: string; message_id?: string; id?: string } | null = null;
    try {
      data = await response.json();
    } catch {
      const text = await response.text().catch(() => '');
      data = { detail: text || `HTTP ${response.status}` };
    }

    console.log(`[telegram-send] Response:`, data);

    if (response.ok && data?.status !== 'error') {
      return {
        success: true,
        messageId: data?.message_id || data?.id,
      };
    }

    return {
      success: false,
      error: data?.detail || `HTTP ${response.status}`,
    };
  } catch (err: unknown) {
    console.error(`[telegram-send] ${kind} message failed:`, err);
    return {
      success: false,
      error: getErrorMessage(err),
    };
  }
}

function getMessageTypeFromFile(fileType: string | undefined): string {
  if (!fileType) return 'document';
  
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  
  return 'document';
}
