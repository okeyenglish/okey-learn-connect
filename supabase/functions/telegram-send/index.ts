import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  errorResponse,
  getErrorMessage,
  getWappiTelegramApiPrefix,
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
    // Use self-hosted Supabase for DB operations
    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || 'https://api.academyos.ru';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(selfHostedUrl, supabaseServiceKey);

    // Parse body early to get clientId for smart routing
    const body = await req.json() as TelegramSendRequest & { phoneNumber?: string; teacherId?: string; organizationId?: string; telegramUserId?: string; integrationId?: string; profileId?: string };
    const { clientId, text, fileUrl, fileName, fileType, phoneId, phoneNumber, teacherId, telegramUserId: bodyTelegramUserId } = body;

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

    // === SMART ROUTING: Find integration_id from message history ===
    let resolvedIntegrationId: string | null = null;

    // Priority: explicit integrationId from request body (e.g. test send, forced routing)
    if (body.integrationId) {
      resolvedIntegrationId = body.integrationId;
      console.log('[telegram-send] Forced integration from body:', resolvedIntegrationId);
    }
    
    // Mode 1: Search by clientId (for client messages) — skip if integrationId was forced
    if (!resolvedIntegrationId && clientId) {
      // Strategy: check BOTH incoming and outgoing messages, pick the MOST RECENT one
      // so that replies go through the same integration the client last communicated through
      
      // 1a. Last outgoing with integration_id
      const { data: lastOutgoing } = await supabase
        .from('chat_messages')
        .select('integration_id, created_at')
        .eq('client_id', clientId)
        .eq('is_outgoing', true)
        .eq('messenger_type', 'telegram')
        .not('integration_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 1b. Last incoming with integration_id
      const { data: lastIncoming } = await supabase
        .from('chat_messages')
        .select('integration_id, created_at')
        .eq('client_id', clientId)
        .eq('is_outgoing', false)
        .eq('messenger_type', 'telegram')
        .not('integration_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Pick the most recent message (incoming or outgoing) to determine which integration to use
      if (lastOutgoing?.integration_id && lastIncoming?.integration_id) {
        const outTime = new Date(lastOutgoing.created_at).getTime();
        const inTime = new Date(lastIncoming.created_at).getTime();
        if (inTime >= outTime) {
          resolvedIntegrationId = lastIncoming.integration_id;
          console.log('[telegram-send] Smart routing (client, incoming is newer):', resolvedIntegrationId);
        } else {
          resolvedIntegrationId = lastOutgoing.integration_id;
          console.log('[telegram-send] Smart routing (client, outgoing is newer):', resolvedIntegrationId);
        }
      } else if (lastOutgoing?.integration_id) {
        resolvedIntegrationId = lastOutgoing.integration_id;
        console.log('[telegram-send] Smart routing (client, outgoing only):', resolvedIntegrationId);
      } else if (lastIncoming?.integration_id) {
        resolvedIntegrationId = lastIncoming.integration_id;
        console.log('[telegram-send] Smart routing (client, incoming only):', resolvedIntegrationId);
      }
      
      // Fallback: search in metadata->>'integration_id' (self-hosted compatibility)
      if (!resolvedIntegrationId) {
        const { data: metaMessage } = await supabase
          .from('chat_messages')
          .select('metadata')
          .eq('client_id', clientId)
          .eq('is_outgoing', true)
          .eq('messenger_type', 'telegram')
          .not('metadata->integration_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let metaIntegrationId = (metaMessage?.metadata as any)?.integration_id;
        
        // If no outgoing metadata, try incoming metadata
        if (!metaIntegrationId) {
          const { data: metaIncoming } = await supabase
            .from('chat_messages')
            .select('metadata')
            .eq('client_id', clientId)
            .eq('is_outgoing', false)
            .eq('messenger_type', 'telegram')
            .not('metadata->integration_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          metaIntegrationId = (metaIncoming?.metadata as any)?.integration_id;
        }

        if (metaIntegrationId) {
          resolvedIntegrationId = metaIntegrationId;
          console.log('[telegram-send] Smart routing (client, metadata fallback):', resolvedIntegrationId);
        }
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
        console.log('[telegram-send] Smart routing (teacher, column):', resolvedIntegrationId);
      }
      
      // Fallback: search in metadata->>'integration_id'
      if (!resolvedIntegrationId) {
        const { data: metaMsg } = await supabase
          .from('chat_messages')
          .select('metadata')
          .eq('teacher_id', teacherId)
          .eq('is_outgoing', false)
          .eq('messenger_type', 'telegram')
          .not('metadata->integration_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const metaId = (metaMsg?.metadata as any)?.integration_id;
        if (metaId) {
          resolvedIntegrationId = metaId;
          console.log('[telegram-send] Smart routing (teacher, metadata fallback):', resolvedIntegrationId);
        }
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
            console.log('[telegram-send] Smart routing (phone→teacher, column):', resolvedIntegrationId);
          }
          
          // Fallback: metadata
          if (!resolvedIntegrationId) {
            const { data: metaMsg } = await supabase
              .from('chat_messages')
              .select('metadata')
              .eq('teacher_id', teacher.id)
              .eq('is_outgoing', false)
              .eq('messenger_type', 'telegram')
              .not('metadata->integration_id', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const metaId = (metaMsg?.metadata as any)?.integration_id;
            if (metaId) {
              resolvedIntegrationId = metaId;
              console.log('[telegram-send] Smart routing (phone→teacher, metadata):', resolvedIntegrationId);
            }
          }
        }
      }
    }

    // Build integration query based on smart routing result
    let integration: { id: string; provider: string; settings: unknown; is_enabled: boolean } | null = null;

    if (resolvedIntegrationId) {
      // Try to find by integration ID first
      const { data: found } = await supabase
        .from('messenger_integrations')
        .select('id, provider, settings, is_enabled')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'telegram')
        .eq('is_enabled', true)
        .eq('id', resolvedIntegrationId)
        .maybeSingle();
      
      integration = found;
      console.log('[telegram-send] Integration by ID:', resolvedIntegrationId, '→', integration ? `found (${integration.provider})` : 'NOT FOUND');

      // Dead-link fallback: resolved ID points to a deleted integration — find a replacement
      if (!integration) {
        console.log('[telegram-send] Dead link detected — searching for active replacement');
        const { data: activeIntegrations } = await supabase
          .from('messenger_integrations')
          .select('id, provider, settings, is_enabled')
          .eq('organization_id', organizationId)
          .eq('messenger_type', 'telegram')
          .eq('is_enabled', true);

        if (activeIntegrations && activeIntegrations.length > 0) {
          if (activeIntegrations.length === 1) {
            // Only one active — use it
            integration = activeIntegrations[0];
            console.log('[telegram-send] Single active integration as replacement:', integration.id, integration.provider);
          } else {
            // Multiple active — try to match by profileId from body
            if (body.profileId) {
              integration = activeIntegrations.find(
                (i) => (i.settings as any)?.profileId === body.profileId
              ) || null;
            }
            // If still not found, pick non-primary (bot) over primary (personal)
            if (!integration) {
              const { data: nonPrimary } = await supabase
                .from('messenger_integrations')
                .select('id, provider, settings, is_enabled')
                .eq('organization_id', organizationId)
                .eq('messenger_type', 'telegram')
                .eq('is_enabled', true)
                .eq('is_primary', false)
                .limit(1)
                .maybeSingle();
              integration = nonPrimary || activeIntegrations[0];
            }
            console.log('[telegram-send] Replacement from multiple:', integration?.id, integration?.provider);
          }
        }
      }
    }

    // Fallback: if body has profileId but integration wasn't found by ID, search by profileId in settings
    if (!integration && body.profileId) {
      const { data: allIntegrations } = await supabase
        .from('messenger_integrations')
        .select('id, provider, settings, is_enabled')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'telegram')
        .eq('is_enabled', true);
      
      if (allIntegrations) {
        integration = allIntegrations.find(
          (i) => (i.settings as any)?.profileId === body.profileId
        ) || null;
        if (integration) {
          console.log('[telegram-send] Found integration by profileId match:', body.profileId, '→', integration.id);
        }
      }
    }

    // Final fallback: primary integration
    if (!integration) {
      const { data: primary } = await supabase
        .from('messenger_integrations')
        .select('id, provider, settings, is_enabled')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'telegram')
        .eq('is_enabled', true)
        .eq('is_primary', true)
        .maybeSingle();
      
      integration = primary;
      console.log('[telegram-send] Using primary integration fallback:', integration?.id || 'NONE');
    }

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
    let isBotProfile: boolean | undefined;

    if (integration && integration.provider === 'wappi') {
      // Use wappi settings from messenger_integrations
      const settings = integration.settings as TelegramSettings | null;
      profileId = settings?.profileId;
      wappiApiToken = settings?.apiToken;
      isBotProfile = settings?.isBotProfile;
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
      isBotProfile = settings?.isBotProfile;
    }

    console.log(`[telegram-send] Integration config: profileId=${profileId}, isBotProfile=${isBotProfile}`);

    if (!profileId || !wappiApiToken) {
      return errorResponse('Telegram Profile ID or API Token not configured', 400);
    }

    // body, clientId, text, etc. already parsed above for smart routing

    // Validate: either clientId, phoneNumber, or telegramUserId must be provided
    if (!clientId && !phoneNumber && !bodyTelegramUserId) {
      return errorResponse('clientId, phoneNumber, or telegramUserId is required', 400);
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

    // Mode 2: Direct telegramUserId (highest priority for teacher messages with known ID)
    if (bodyTelegramUserId && !clientId) {
      recipient = bodyTelegramUserId;
      recipientSource = 'direct telegramUserId';
      fallbackPhoneRaw = phoneNumber || null;
      fallbackPhoneNormalized = normalizePhoneStrict(phoneNumber);
      console.log(`[telegram-send] Direct telegramUserId mode: ${bodyTelegramUserId}`);
      
      // Find teacher by phone if teacherId not provided
      if (!resolvedTeacherId && phoneNumber) {
        const phone10 = phoneNumber.replace(/\D/g, '').slice(-10);
        if (phone10.length === 10) {
          const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .ilike('phone', `%${phone10}`)
            .eq('organization_id', organizationId)
            .maybeSingle();
          if (teacher) {
            resolvedTeacherId = teacher.id;
            console.log(`[telegram-send] Found teacher by phone: ${resolvedTeacherId}`);
          }
        }
      }
    }
    // Mode 3: Direct phone number (for teacher messages without telegramUserId)
    else if (phoneNumber && !clientId) {
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

    // === ALWAYS PREFER TELEGRAM ID OVER PHONE NUMBER ===
    // Both bots AND personal accounts can send by ID. Only personal accounts can send by phone.
    // So if we have a telegram_user_id/chat_id, always use it regardless of integration type.
    if (isLikelyPhoneNumber(recipient)) {
      console.log(`[telegram-send] 📱 Recipient is phone (${recipient}). Looking for telegram_user_id/chat_id to swap...`);
      
      let idRecipient: string | null = null;
      
      // Try from client fields
      if (client) {
        if (client.telegram_user_id) {
          idRecipient = client.telegram_user_id.toString();
          console.log(`[telegram-send] ✅ Found telegram_user_id from client: ${idRecipient}`);
        } else if (client.telegram_chat_id) {
          idRecipient = client.telegram_chat_id;
          console.log(`[telegram-send] ✅ Found telegram_chat_id from client: ${idRecipient}`);
        }
      }
      
      // Try from client_phone_numbers if not found yet
      if (!idRecipient && clientId) {
        const { data: phoneRecords } = await supabase
          .from('client_phone_numbers')
          .select('telegram_user_id, telegram_chat_id')
          .eq('client_id', clientId)
          .not('telegram_user_id', 'is', null);
        
        if (phoneRecords && phoneRecords.length > 0) {
          const rec = phoneRecords[0];
          if (rec.telegram_user_id) {
            idRecipient = rec.telegram_user_id.toString();
            console.log(`[telegram-send] ✅ Found telegram_user_id from phone_numbers: ${idRecipient}`);
          } else if (rec.telegram_chat_id) {
            idRecipient = rec.telegram_chat_id;
            console.log(`[telegram-send] ✅ Found telegram_chat_id from phone_numbers: ${idRecipient}`);
          }
        }
        
        // Also try chat_id records
        if (!idRecipient) {
          const { data: chatIdRecords } = await supabase
            .from('client_phone_numbers')
            .select('telegram_chat_id')
            .eq('client_id', clientId)
            .not('telegram_chat_id', 'is', null)
            .limit(1)
            .maybeSingle();
          
          if (chatIdRecords?.telegram_chat_id) {
            idRecipient = chatIdRecords.telegram_chat_id;
            console.log(`[telegram-send] ✅ Found telegram_chat_id from phone_numbers (2nd pass): ${idRecipient}`);
          }
        }
      }
      
      if (idRecipient) {
        console.log(`[telegram-send] 🔄 Swapping recipient: ${recipient} → ${idRecipient} (prefer ID over phone)`);
        recipient = idRecipient;
        recipientSource = 'telegram_id (auto-swap)';
      } else {
        console.log(`[telegram-send] ℹ️ No telegram ID found, keeping phone: ${recipient}`);
      }
    }

    let sendResult: { success: boolean; messageId?: string; error?: string };
    let actualIntegrationId: string | null = integration?.id || null;
    
    if (fileUrl) {
      sendResult = await sendFileMessage(profileId, recipient, fileUrl, text || '', wappiApiToken, isBotProfile);
    } else if (text) {
      sendResult = await sendTextMessage(profileId, recipient, text, wappiApiToken, isBotProfile);
    } else {
      return errorResponse('Message text or file is required', 400);
    }
    
    // === AUTO-FALLBACK: "Wrong platform" → switch bot/personal prefix and retry ===
    if (!sendResult.success && (sendResult as any).wrongPlatform) {
      const flippedBot = !isBotProfile;
      console.log(`[telegram-send] ⚠️ "Wrong platform" detected! Flipping isBotProfile: ${isBotProfile} → ${flippedBot}`);
      
      if (fileUrl) {
        sendResult = await sendFileMessage(profileId, recipient, fileUrl, text || '', wappiApiToken, flippedBot);
      } else if (text) {
        sendResult = await sendTextMessage(profileId, recipient, text, wappiApiToken, flippedBot);
      }
      
      if (sendResult.success) {
        console.log(`[telegram-send] ✅ Flipped prefix worked! Updating isBotProfile in DB...`);
        isBotProfile = flippedBot;
        
        // Update integration settings in DB (fire-and-forget)
        if (integration?.id) {
          const currentSettings = (integration.settings || {}) as Record<string, unknown>;
          supabase
            .from('messenger_integrations')
            .update({ settings: { ...currentSettings, isBotProfile: flippedBot } })
            .eq('id', integration.id)
            .then(({ error }: any) => {
              if (error) console.error('[telegram-send] Failed to update isBotProfile:', error.message);
              else console.log(`[telegram-send] ✅ isBotProfile updated to ${flippedBot} for integration ${integration.id}`);
            });
        }
      } else {
        console.log(`[telegram-send] Flipped prefix also failed:`, sendResult.error);
      }
    }

    // === FALLBACK: If first attempt failed (non-bot), try phone number ===
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
          sendResult = await sendFileMessage(profileId, fallbackPhoneNormalized, fileUrl, text || '', wappiApiToken, isBotProfile);
        } else if (text) {
          sendResult = await sendTextMessage(profileId, fallbackPhoneNormalized, text, wappiApiToken, isBotProfile);
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
              const altIsBotProfile = altSettings.isBotProfile;
              // Try with ID first
              let altRecipient = recipient;
              let altResult: { success: boolean; messageId?: string; error?: string };
              
              if (fileUrl) {
                altResult = await sendFileMessage(altSettings.profileId, altRecipient, fileUrl, text || '', altSettings.apiToken, altIsBotProfile);
              } else if (text) {
                altResult = await sendTextMessage(altSettings.profileId, altRecipient, text, altSettings.apiToken, altIsBotProfile);
              } else {
                altResult = { success: false, error: 'No content' };
              }
              
              // If ID failed, try phone
              if (!altResult.success && fallbackPhoneNormalized && fallbackPhoneNormalized !== altRecipient) {
                console.log(`[telegram-send] Alternative Wappi: ID failed, trying phone ${fallbackPhoneNormalized}`);
                if (fileUrl) {
                  altResult = await sendFileMessage(altSettings.profileId, fallbackPhoneNormalized, fileUrl, text || '', altSettings.apiToken, altIsBotProfile);
                } else if (text) {
                  altResult = await sendTextMessage(altSettings.profileId, fallbackPhoneNormalized, text, altSettings.apiToken, altIsBotProfile);
                }
                if (altResult.success) altRecipient = fallbackPhoneNormalized;
              }
              
              if (altResult.success) {
                console.log(`[telegram-send] Alternative Wappi integration SUCCEEDED! (${altIntegration.id})`);
                sendResult = altResult;
                recipientSource = `alternative wappi (${altIntegration.id})`;
                actualIntegrationId = altIntegration.id;
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
                actualIntegrationId = altIntegration.id;
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
      message_type: 'manager',
      messenger_type: 'telegram',
      message_status: 'sent',
      is_outgoing: true,
      is_read: true,
      external_message_id: sendResult.messageId,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType || contentType,
      sender_name: body.senderName || null,
      integration_id: actualIntegrationId,
      metadata: { sender_name: body.senderName || null, integration_id: actualIntegrationId },
    };

    // Add client_id or teacher_id based on mode
    if (resolvedClientId) {
      messageRecord.client_id = resolvedClientId;
    }
    if (resolvedTeacherId) {
      messageRecord.teacher_id = resolvedTeacherId;
      messageRecord.metadata = { ...(messageRecord.metadata as Record<string, unknown> || {}), teacher_id: resolvedTeacherId };
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
      savedMessageId: savedMessage?.id,
      integrationId: integration?.id || resolvedIntegrationId || 'unknown',
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
  apiToken: string,
  isBotProfile?: boolean
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const prefix = getWappiTelegramApiPrefix(isBotProfile);
  const url = `https://wappi.pro/${prefix}/message/send?profile_id=${profileId}`;
  return await sendMessage(url, apiToken, { recipient, body: text }, 'text');
}

async function sendFileMessage(
  profileId: string,
  recipient: string,
  fileUrl: string,
  caption: string,
  apiToken: string,
  isBotProfile?: boolean
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const prefix = getWappiTelegramApiPrefix(isBotProfile);
  const url = `https://wappi.pro/${prefix}/message/file/url/send?profile_id=${profileId}`;
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
  console.log(`[telegram-send] 📤 Sending ${kind} message to Wappi:`, {
    recipient: body.recipient,
    url: url.replace(/profile_id=[^&]+/, 'profile_id=***'),
    hasBody: !!body.body,
    hasUrl: !!body.url,
  });

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
    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text().catch(() => '');
    
    console.log(`[telegram-send] Response status: ${response.status}, content-type: ${contentType}, body preview: ${responseText.substring(0, 200)}`);
    
    if (contentType.includes('application/json') && responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(`[telegram-send] Failed to parse JSON despite content-type:`, responseText.substring(0, 300));
        data = { detail: responseText.substring(0, 200) || `HTTP ${response.status}` };
      }
    } else {
      console.error(`[telegram-send] Wappi returned non-JSON (${contentType}):`, responseText.substring(0, 300));
      data = { detail: responseText ? `Non-JSON response (${response.status}): ${responseText.substring(0, 150)}` : `HTTP ${response.status}` };
    }

    console.log(`[telegram-send] Response:`, data);

    if (response.ok && data?.status !== 'error') {
      return {
        success: true,
        messageId: data?.message_id || data?.id,
      };
    }

    // Check for "Wrong platform" error - indicates bot/personal mismatch
    const errorDetail = data?.detail || `HTTP ${response.status}`;
    if (errorDetail.toLowerCase().includes('wrong platform')) {
      return {
        success: false,
        error: errorDetail,
        wrongPlatform: true,
      } as any;
    }

    return {
      success: false,
      error: errorDetail,
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
