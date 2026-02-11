import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import {
  corsHeaders,
  handleCors,
  getErrorMessage,
  type GreenAPIWebhook,
  type GreenAPISenderData,
  type GreenAPIMessageData,
} from '../_shared/types.ts'

// Use self-hosted Supabase (api.academyos.ru) so incoming messages are saved to the correct DB
const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || 'https://api.academyos.ru'
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(selfHostedUrl, supabaseServiceKey)

// ========== DIAGNOSTIC LOGGING ==========
interface DiagnosticInfo {
  webhookType?: string;
  instanceId?: string;
  organizationId?: string | null;
  integrationId?: string | null;
  phone?: string;
  clientId?: string | null;
  teacherId?: string | null;
  insertResult?: string;
  error?: string;
  step?: string;
}

let currentLogId: string | null = null;
let diagnosticInfo: DiagnosticInfo = {};

async function initWebhookLog(webhookData: unknown): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('webhook_logs')
      .insert({
        messenger_type: 'whatsapp',
        event_type: (webhookData as any)?.typeWebhook || 'unknown',
        webhook_data: webhookData,
        processed: false,
      })
      .select('id')
      .single();
    
    if (!error && data) {
      currentLogId = data.id;
      console.log('[whatsapp-webhook] Created log entry:', currentLogId);
    }
  } catch (e) {
    console.warn('[whatsapp-webhook] Could not create log entry:', e);
  }
}

async function updateWebhookLog(processed: boolean, errorMessage?: string): Promise<void> {
  if (!currentLogId) return;
  
  try {
    await supabase
      .from('webhook_logs')
      .update({
        processed,
        error_message: errorMessage || null,
        // Store diagnostic info in webhook_data if possible
      })
      .eq('id', currentLogId);
    
    console.log('[whatsapp-webhook] Updated log:', { processed, errorMessage, diagnosticInfo });
  } catch (e) {
    console.warn('[whatsapp-webhook] Could not update log entry:', e);
  }
}

// ========== RESILIENT MESSAGE INSERT ==========
/**
 * Two-step resilient insert for chat_messages
 * Step 1: Try full payload with all useful fields
 * Step 2: If fails (column doesn't exist), retry with minimal payload
 */
interface MessageInsertParams {
  client_id: string | null
  teacher_id?: string | null
  organization_id: string
  integration_id?: string | null  // For smart routing
  content: string
  message_type: string // 'client' | 'manager' | 'system'
  is_incoming: boolean
  messenger: string // 'whatsapp'
  status: string // 'delivered' | 'sent'
  external_id: string
  media_url?: string | null
  media_type?: string | null
  file_name?: string | null
  created_at?: string
  metadata?: Record<string, unknown>
}

async function insertChatMessage(params: MessageInsertParams): Promise<{ success: boolean; error?: string }> {
  const now = params.created_at || new Date().toISOString();
  
  // ===== STEP 1: Full payload (for schemas with all columns) =====
  // Build metadata with optional teacher_id and integration_id
  const metadataObj: Record<string, unknown> = { ...(params.metadata || {}) };
  if (params.teacher_id) metadataObj.teacher_id = params.teacher_id;
  if (params.integration_id) metadataObj.integration_id = params.integration_id;

  const fullPayload: Record<string, unknown> = {
    organization_id: params.organization_id,
    client_id: params.teacher_id ? null : params.client_id,
    teacher_id: params.teacher_id || null,
    message_text: params.content,
    message_type: params.message_type,
    messenger_type: params.messenger,
    is_outgoing: !params.is_incoming,
    is_read: !params.is_incoming,
    message_status: params.status,
    external_message_id: params.external_id,
    file_url: params.media_url || null,
    file_type: params.media_type || null,
    file_name: params.file_name || null,
    created_at: now,
    metadata: Object.keys(metadataObj).length > 0 ? metadataObj : null,
  };
  
  console.log('[whatsapp-webhook] Attempting full insert with keys:', Object.keys(fullPayload));
  
  const { error: fullError } = await supabase.from('chat_messages').insert(fullPayload);
  
  if (!fullError) {
    console.log('[whatsapp-webhook] ✓ Full insert succeeded');
    diagnosticInfo.insertResult = 'full_success';
    return { success: true };
  }
  
  console.warn('[whatsapp-webhook] Full insert failed:', fullError.message, 'code:', fullError.code);
  
  // Check if it's a "column does not exist" or "null constraint" error
  const isColumnError = 
    fullError.message.includes('column') ||
    fullError.message.includes('does not exist') ||
    fullError.message.includes('PGRST') ||
    fullError.code === 'PGRST204' ||
    fullError.code === '42703'; // PostgreSQL column not found
  
  if (!isColumnError) {
    // Some other error (constraint violation, etc.) - don't retry
    console.error('[whatsapp-webhook] Non-column error, not retrying:', fullError);
    diagnosticInfo.insertResult = 'full_failed_other';
    diagnosticInfo.error = fullError.message;
    return { success: false, error: fullError.message };
  }
  
  // ===== STEP 2: Minimal payload (for self-hosted with fewer columns) =====
  console.log('[whatsapp-webhook] Retrying with minimal payload...');
  
  const minimalPayload: Record<string, unknown> = {
    organization_id: params.organization_id,
    client_id: params.teacher_id ? null : (params.client_id || null),
    teacher_id: params.teacher_id || null,
    message_text: params.content,
    message_type: params.message_type,
    messenger_type: params.messenger,
    is_outgoing: !params.is_incoming,
    is_read: !params.is_incoming,
    external_message_id: params.external_id,
    created_at: now,
  };
  
  console.log('[whatsapp-webhook] Minimal payload keys:', Object.keys(minimalPayload));
  
  const { error: minimalError } = await supabase.from('chat_messages').insert(minimalPayload);
  
  if (!minimalError) {
    console.log('[whatsapp-webhook] ✓ Minimal insert succeeded');
    diagnosticInfo.insertResult = 'minimal_success';
    return { success: true };
  }
  
  console.error('[whatsapp-webhook] Minimal insert also failed:', minimalError.message);
  diagnosticInfo.insertResult = 'minimal_failed';
  diagnosticInfo.error = minimalError.message;
  return { success: false, error: minimalError.message };
}

// ========== RESILIENT ORGANIZATION RESOLUTION ==========
/**
 * Resolve organization with relaxed filtering
 * - Tries with is_enabled=true first
 * - Falls back to any matching integration if that fails
 * - Supports both 'green_api' and 'greenapi' provider names
 */
async function resolveOrganizationByWebhookKey(req: Request): Promise<{ organizationId: string; integrationId: string } | null> {
  const url = new URL(req.url);
  
  // Try path-based key first: /whatsapp-webhook/{key}
  const pathParts = url.pathname.split('/');
  let webhookKey = pathParts[pathParts.length - 1];
  
  // If path key looks like function name, try query param
  if (webhookKey === 'whatsapp-webhook' || !webhookKey || webhookKey.length < 10) {
    webhookKey = url.searchParams.get('key') || '';
  }
  
  if (!webhookKey || webhookKey.length < 10) {
    return null;
  }
  
  console.log('[whatsapp-webhook] Looking up by webhook_key:', webhookKey);
  diagnosticInfo.step = 'resolve_by_webhook_key';
  
  // ===== STEP 1: Try with full filters =====
  const { data: integration, error } = await supabase
    .from('messenger_integrations')
    .select('organization_id, id')
    .eq('webhook_key', webhookKey)
    .eq('messenger_type', 'whatsapp')
    .in('provider', ['green_api', 'greenapi']) // Support both naming conventions
    .eq('is_enabled', true)
    .maybeSingle();
  
  if (!error && integration) {
    console.log('[whatsapp-webhook] ✓ Found organization by webhook_key (with filters):', integration.organization_id);
    return { 
      organizationId: integration.organization_id as string,
      integrationId: integration.id as string
    };
  }
  
  // ===== STEP 2: Try without is_enabled filter (column might not exist) =====
  console.log('[whatsapp-webhook] Retrying without is_enabled filter...');
  
  const { data: integration2, error: error2 } = await supabase
    .from('messenger_integrations')
    .select('organization_id, id')
    .eq('webhook_key', webhookKey)
    .eq('messenger_type', 'whatsapp')
    .maybeSingle();
  
  if (!error2 && integration2) {
    console.log('[whatsapp-webhook] ✓ Found organization by webhook_key (relaxed):', integration2.organization_id);
    return { 
      organizationId: integration2.organization_id as string,
      integrationId: integration2.id as string
    };
  }
  
  if (error2) {
    console.error('[whatsapp-webhook] Error in relaxed lookup:', error2.message);
  }
  
  return null;
}

async function resolveOrganizationIdFromWebhook(webhook: GreenAPIWebhook): Promise<string | null> {
  const instanceIdRaw = webhook.instanceData?.idInstance as any;
  const instanceId = instanceIdRaw !== undefined && instanceIdRaw !== null ? String(instanceIdRaw) : null;
  console.log('[whatsapp-webhook] Resolving organization for instanceId:', { raw: instanceIdRaw, normalized: instanceId });
  diagnosticInfo.instanceId = instanceId || 'null';
  
  if (!instanceId) {
    console.error('[whatsapp-webhook] No instanceId in webhook.instanceData:', JSON.stringify(webhook.instanceData));
    return null;
  }

  // ========== PRIORITY 1: Search in messenger_integrations (new multi-account table) ==========
  console.log('[whatsapp-webhook] Searching in messenger_integrations...');
  
  // Try with is_enabled filter first
  let { data: integrations, error: intError } = await supabase
    .from('messenger_integrations')
    .select('organization_id, settings')
    .eq('messenger_type', 'whatsapp')
    .in('provider', ['green_api', 'greenapi'])
    .eq('is_enabled', true);

  // If error (possibly is_enabled doesn't exist), retry without that filter
  if (intError) {
    console.warn('[whatsapp-webhook] Error with is_enabled filter, retrying without it:', intError.message);
    const { data: integrations2, error: intError2 } = await supabase
      .from('messenger_integrations')
      .select('organization_id, settings')
      .eq('messenger_type', 'whatsapp')
      .in('provider', ['green_api', 'greenapi']);
    
    if (!intError2) {
      integrations = integrations2;
    }
  }

  if (integrations && integrations.length > 0) {
    // Manual search through settings (JSON field)
    for (const integration of integrations) {
      const settingsObj = integration.settings as Record<string, unknown> | null;
      const storedInstanceId = settingsObj?.instanceId;
      
      if (String(storedInstanceId) === instanceId) {
        console.log('[whatsapp-webhook] ✓ Found organization via messenger_integrations:', integration.organization_id);
        return (integration.organization_id as string | null) ?? null;
      }
    }
    console.log('[whatsapp-webhook] No match in messenger_integrations for instanceId:', instanceId);
  }

  // ========== PRIORITY 2: Fallback to messenger_settings (legacy table) ==========
  console.log('[whatsapp-webhook] Fallback: searching in messenger_settings...');
  
  // Try to find by settings->>instanceId (string match)
  let { data, error } = await supabase
    .from('messenger_settings')
    .select('organization_id, settings')
    .eq('messenger_type', 'whatsapp')
    .not('organization_id', 'is', null)
    .eq('settings->>instanceId', instanceId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data && !error) {
    // Fallback: try with numeric instanceId (in case stored as number in JSON)
    console.log('[whatsapp-webhook] No match with string, trying manual search...');
    
    const { data: data2, error: error2 } = await supabase
      .from('messenger_settings')
      .select('organization_id, settings')
      .eq('messenger_type', 'whatsapp')
      .not('organization_id', 'is', null)
      .order('updated_at', { ascending: false });
    
    if (error2) {
      console.error('[whatsapp-webhook] Error fetching all messenger_settings:', error2);
    } else if (data2 && data2.length > 0) {
      // Manual search through settings
      for (const setting of data2) {
        const settingsObj = setting.settings as Record<string, unknown> | null;
        const storedInstanceId = settingsObj?.instanceId;
        
        if (String(storedInstanceId) === instanceId) {
          data = setting;
          console.log('[whatsapp-webhook] ✓ Found match via messenger_settings manual search:', setting.organization_id);
          break;
        }
      }
    }
  }

  if (error) {
    console.error('[whatsapp-webhook] Failed to resolve organization by instanceId:', { instanceId, error });
    return null;
  }

  if (!data) {
    console.warn('[whatsapp-webhook] No organization found for instanceId:', instanceId);
    return null;
  }

  console.log('[whatsapp-webhook] ✓ Resolved organization_id via messenger_settings:', data.organization_id);
  return (data.organization_id as string | null) ?? null;
}

// ========== CLIENT MATCHING BY LAST 10 DIGITS ==========
// Normalize phone number to digits only for consistent matching
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  // Normalize 8XXXXXXXXXX to 7XXXXXXXXXX for Russian numbers
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    cleaned = '7' + cleaned.substring(1);
  }
  // Normalize 10-digit numbers starting with 9 (add 7 prefix)
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '7' + cleaned;
  }
  return cleaned;
}

function getLast10Digits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
}

async function findOrCreateClient(phoneNumber: string, displayName: string | undefined, organizationId: string) {
  const normalizedPhone = normalizePhone(phoneNumber);
  const last10 = getLast10Digits(phoneNumber);
  
  console.log('[whatsapp-webhook] findOrCreateClient:', { phoneNumber, normalizedPhone, last10, organizationId });
  diagnosticInfo.phone = phoneNumber;

  // ===== STEP 1: Search by last 10 digits using ILIKE (most tolerant) =====
  if (last10 && last10.length === 10) {
    console.log('[whatsapp-webhook] Searching by last 10 digits:', last10);
    
    const { data: existingByLike, error: likeError } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('phone', `%${last10}`)
      .limit(1);
    
    if (likeError) {
      console.warn('[whatsapp-webhook] ILIKE search failed:', likeError.message);
    } else if (existingByLike && existingByLike.length > 0) {
      console.log('[whatsapp-webhook] ✓ Found client by last 10 digits:', existingByLike[0].id);
      diagnosticInfo.clientId = existingByLike[0].id;
      
      // Update last_message_at
      await supabase
        .from('clients')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', existingByLike[0].id);
      
      return existingByLike[0];
    }
  }

  // ===== STEP 2: Fallback to exact match with variants =====
  const phoneVariants = [
    phoneNumber,
    `+${normalizedPhone}`,
    normalizedPhone,
    normalizedPhone.replace(/^7/, '8'),
    normalizedPhone.replace(/^8/, '7'),
  ];
  
  const uniqueVariants = [...new Set(phoneVariants.filter(Boolean))];
  console.log('[whatsapp-webhook] Fallback: searching with variants:', uniqueVariants);

  const { data: existingClients } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', organizationId)
    .in('phone', uniqueVariants);

  let existingClient = existingClients?.[0] || null;

  // ===== STEP 3: Search in client_phone_numbers table =====
  if (!existingClient) {
    console.log('[whatsapp-webhook] Searching in client_phone_numbers...');
    const { data: phoneRecords, error: phoneError } = await supabase
      .from('client_phone_numbers')
      .select('client_id, phone')
      .in('phone', uniqueVariants);

    if (!phoneError && phoneRecords && phoneRecords.length > 0) {
      const clientIds = [...new Set(phoneRecords.map(r => r.client_id))];
      
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .in('id', clientIds)
        .limit(1);
      
      existingClient = clients?.[0] || null;
    }
  }

  if (existingClient) {
    console.log('[whatsapp-webhook] ✓ Found existing client:', existingClient.id, existingClient.name);
    diagnosticInfo.clientId = existingClient.id;
    
    // Fetch avatar if missing
    if (!existingClient.avatar_url || !existingClient.whatsapp_avatar_url) {
      const avatarUrl = await fetchAndSaveAvatar(phoneNumber, existingClient.id);
      if (avatarUrl) {
        const updateData: any = { whatsapp_avatar_url: avatarUrl };
        if (!existingClient.avatar_url) {
          updateData.avatar_url = avatarUrl;
        }
        await supabase
          .from('clients')
          .update(updateData)
          .eq('id', existingClient.id);
        existingClient.avatar_url = existingClient.avatar_url || avatarUrl;
        existingClient.whatsapp_avatar_url = avatarUrl;
      }
    }
    
    // Update last_message_at
    await supabase
      .from('clients')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', existingClient.id);
    
    return existingClient;
  }

  // ===== STEP 4: Create new client =====
  console.log('[whatsapp-webhook] Creating new client for phone:', phoneNumber);

  const clientName = displayName || phoneNumber || 'Без имени';
  const formattedPhone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

  const newClientData: Record<string, unknown> = {
    phone: formattedPhone,
    name: clientName,
    organization_id: organizationId,
    is_active: true,
    last_message_at: new Date().toISOString(),
  };

  const { data: newClient, error: createError } = await supabase
    .from('clients')
    .insert(newClientData)
    .select()
    .single();

  if (createError) {
    // Handle unique constraint — find and restore deactivated client
    if (createError.code === '23505') {
      console.log('[whatsapp-webhook] Unique constraint hit, searching for existing client');
      const { data: conflictClient } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .ilike('phone', `%${last10}`)
        .limit(1);
      
      if (conflictClient && conflictClient.length > 0) {
        await supabase
          .from('clients')
          .update({ is_active: true, last_message_at: new Date().toISOString() })
          .eq('id', conflictClient[0].id);
        console.log('[whatsapp-webhook] Restored client after constraint:', conflictClient[0].id);
        diagnosticInfo.clientId = conflictClient[0].id;
        return conflictClient[0];
      }
    }
    console.error('[whatsapp-webhook] Error creating client:', createError);
    diagnosticInfo.error = 'client_create_failed: ' + createError.message;
    throw new Error(`Failed to create client: ${createError.message}`);
  }

  console.log('[whatsapp-webhook] ✓ Created new client:', newClient.id, newClient.name);
  diagnosticInfo.clientId = newClient.id;

  // Try to get avatar for new client
  const avatarUrl = await fetchAndSaveAvatar(phoneNumber, newClient.id);
  if (avatarUrl) {
    await supabase
      .from('clients')
      .update({ 
        avatar_url: avatarUrl,
        whatsapp_avatar_url: avatarUrl
      })
      .eq('id', newClient.id);
    newClient.avatar_url = avatarUrl;
    newClient.whatsapp_avatar_url = avatarUrl;
  }

  return newClient;
}

// ========== MAIN HANDLER ==========
Deno.serve(async (req) => {
  console.log(
    `[whatsapp-webhook] ${req.method} ${req.url} ua=${(req.headers.get('user-agent') || 'unknown').substring(0, 80)}`,
  );
  
  // Reset diagnostics
  currentLogId = null;
  diagnosticInfo = {};

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Handle non-POST requests gracefully (GreenAPI may send GET for health checks)
  if (req.method !== 'POST') {
    console.log('[whatsapp-webhook] Non-POST request, returning OK');
    return new Response(JSON.stringify({ success: true, status: 'ok', method: req.method }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Try to parse JSON body
    let webhook: GreenAPIWebhook;
    try {
      const rawBody = await req.text();
      console.log('[whatsapp-webhook] Raw body length:', rawBody.length);

      if (!rawBody || rawBody.trim() === '') {
        console.log('[whatsapp-webhook] Empty body received');
        return new Response(JSON.stringify({ success: true, status: 'ignored', reason: 'empty body' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      webhook = JSON.parse(rawBody);
      
      // Initialize webhook log
      await initWebhookLog(webhook);
      
    } catch (parseError) {
      console.error('[whatsapp-webhook] JSON parse error:', parseError);
      return new Response(JSON.stringify({ success: true, status: 'ignored', reason: 'invalid json' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[whatsapp-webhook] Received webhook type:', webhook.typeWebhook);
    diagnosticInfo.webhookType = webhook.typeWebhook;

    // Validate required webhook fields early
    const instanceIdRaw = webhook.instanceData?.idInstance as any;
    const instanceId = instanceIdRaw !== undefined && instanceIdRaw !== null ? String(instanceIdRaw) : null;

    if (!instanceId) {
      console.log('[whatsapp-webhook] Invalid payload - missing instanceData.idInstance');
      await updateWebhookLog(false, 'missing_instance_id');
      return new Response(JSON.stringify({ success: true, status: 'ignored', reason: 'invalid payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PRIORITY 1: Try to resolve organization by webhook_key from URL
    let organizationId: string | null = null;
    let integrationId: string | null = null;

    const keyResult = await resolveOrganizationByWebhookKey(req);
    if (keyResult) {
      organizationId = keyResult.organizationId;
      integrationId = keyResult.integrationId;
      console.log('[whatsapp-webhook] Resolved via webhook_key:', { organizationId, integrationId });
    }

    // PRIORITY 2: Fallback to resolving by instanceId in webhook body
    if (!organizationId) {
      organizationId = await resolveOrganizationIdFromWebhook(webhook);
      console.log('[whatsapp-webhook] Resolved via instanceId:', organizationId);
    }
    
    diagnosticInfo.organizationId = organizationId;
    diagnosticInfo.integrationId = integrationId;

    const orgRequiredEvents = new Set([
      'incomingMessageReceived',
      'outgoingMessageReceived',
      'outgoingAPIMessageReceived',
      'incomingCall',
      'incomingReaction',
    ]);

    if (!organizationId && orgRequiredEvents.has(webhook.typeWebhook)) {
      console.error('[whatsapp-webhook] Organization not resolved; ignoring event', {
        typeWebhook: webhook.typeWebhook,
        instanceId,
        integrationId,
      });

      await updateWebhookLog(false, 'organization_not_resolved');

      return new Response(
        JSON.stringify({
          success: true,
          status: 'ignored',
          reason: 'organization_not_resolved',
          typeWebhook: webhook.typeWebhook,
          instanceId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Process webhook events
    try {
      switch (webhook.typeWebhook) {
        case 'incomingMessageReceived':
          await handleIncomingMessage(webhook, organizationId, integrationId);
          break;

        case 'outgoingMessageStatus':
          await handleMessageStatus(webhook);
          break;

        case 'outgoingMessageReceived':
        case 'outgoingAPIMessageReceived':
          await handleOutgoingMessage(webhook, organizationId, integrationId);
          break;

        case 'stateInstanceChanged':
          await handleStateChange(webhook);
          break;

        case 'incomingCall':
          await handleIncomingCall(webhook, organizationId);
          break;

        case 'incomingReaction':
          await handleIncomingReaction(webhook, organizationId);
          break;

        default:
          console.log(`[whatsapp-webhook] Unhandled webhook type: ${webhook.typeWebhook}`);
      }
      
      await updateWebhookLog(true);
      
    } catch (processingError) {
      console.error('[whatsapp-webhook] Error processing webhook event:', processingError);
      await updateWebhookLog(false, getErrorMessage(processingError));
      
      // IMPORTANT: always return 200 to avoid provider retry storms
      return new Response(
        JSON.stringify({
          success: true,
          status: 'ignored',
          reason: 'processing_error',
          error: getErrorMessage(processingError),
          typeWebhook: webhook.typeWebhook,
          instanceId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[whatsapp-webhook] Fatal error in webhook handler:', error);

    await updateWebhookLog(false, 'fatal: ' + getErrorMessage(error));

    return new Response(
      JSON.stringify({
        success: true,
        status: 'ignored',
        reason: 'exception',
        error: getErrorMessage(error),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ========== EVENT HANDLERS ==========

async function handleIncomingMessage(webhook: GreenAPIWebhook, organizationId: string | null, integrationId: string | null = null) {
  const { senderData, messageData, idMessage } = webhook;

  if (!senderData || !messageData) {
    console.log('Missing sender or message data');
    return;
  }

  if (!organizationId) {
    console.error('Cannot process incoming message: organization_id not resolved');
    return;
  }

  const chatId = senderData.chatId;
  const phoneNumber = extractPhoneFromChatId(chatId);
  const whatsappId = phoneNumber;
  
  // Определяем тип и содержимое сообщения
  let messageText = '';
  let fileUrl = null;
  let fileName = null;
  let fileType = null;

  switch (messageData.typeMessage) {
    case 'textMessage':
      messageText = messageData.textMessageData?.textMessage || '';
      break;
      
    case 'reactionMessage':
      // Handled separately below
      break;
      
    case 'imageMessage':
    case 'videoMessage':
    case 'documentMessage':
    case 'audioMessage':
      if (messageData.typeMessage === 'imageMessage') {
        messageText = messageData.fileMessageData?.caption || '📷 Изображение';
      } else if (messageData.typeMessage === 'videoMessage') {
        messageText = messageData.fileMessageData?.caption || '🎥 Видео';
      } else if (messageData.typeMessage === 'audioMessage') {
        const mimeType = messageData.fileMessageData?.mimeType;
        if (mimeType && (mimeType.includes('ogg') || mimeType.includes('opus'))) {
          messageText = '🎙️ Голосовое сообщение';
        } else {
          messageText = messageData.fileMessageData?.caption || '🎵 Аудиофайл';
        }
      } else if (messageData.typeMessage === 'documentMessage') {
        messageText = messageData.fileMessageData?.caption || `📄 ${messageData.fileMessageData?.fileName || 'Документ'}`;
      } else {
        messageText = messageData.fileMessageData?.caption || '[Файл]';
      }
      
      // For media files, try to get download URL
      if (messageData.fileMessageData?.downloadUrl) {
        try {
          console.log('Getting download URL for media file:', idMessage);
          const { data: downloadResult, error: downloadError } = await supabase.functions.invoke('download-whatsapp-file', {
            body: { 
              chatId: chatId,
              idMessage: idMessage 
            }
          });

          if (downloadError) {
            console.error('Error getting download URL:', downloadError);
            fileUrl = messageData.fileMessageData.downloadUrl;
          } else if (downloadResult?.downloadUrl) {
            fileUrl = downloadResult.downloadUrl;
            console.log('Got real download URL:', fileUrl);
          } else {
            fileUrl = messageData.fileMessageData.downloadUrl;
          }
        } catch (error) {
          console.error('Error calling download-whatsapp-file:', error);
          fileUrl = messageData.fileMessageData.downloadUrl;
        }
      } else {
        fileUrl = messageData.fileMessageData?.downloadUrl;
      }
      
      fileName = messageData.fileMessageData?.fileName;
      fileType = messageData.fileMessageData?.mimeType;
      break;
    case 'quotedMessage':
      messageText = messageData.extendedTextMessageData?.text || '';
      // quotedMessage может содержать файл в fileMessageData
      if (messageData.fileMessageData?.downloadUrl) {
        fileUrl = messageData.fileMessageData.downloadUrl;
        fileName = messageData.fileMessageData?.fileName;
        fileType = messageData.fileMessageData?.mimeType;
      }
      break;
    case 'extendedTextMessage':
      messageText = messageData.extendedTextMessageData?.text || '';
      break;
    case 'editedMessage': {
      // Message was edited — find original by stanzaId and update content
      const editedData = (messageData as any).editedMessageData;
      const stanzaId = editedData?.stanzaId;
      const newText = editedData?.textMessage || '';
      if (stanzaId) {
        console.log('[whatsapp-webhook] Edited message received, stanzaId:', stanzaId);
        const { error: editError } = await supabase
          .from('chat_messages')
          .update({
            message_text: newText,
            metadata: {
              is_edited: true,
              edited_at: new Date(webhook.timestamp * 1000).toISOString(),
            },
          })
          .eq('external_message_id', stanzaId);
        if (editError) {
          console.error('[whatsapp-webhook] Error updating edited message:', editError);
        } else {
          console.log('[whatsapp-webhook] ✓ Message edited in DB, stanzaId:', stanzaId);
        }
      }
      return; // No need to insert a new message
    }
    case 'deletedMessage': {
      // Message was deleted — find original by stanzaId and mark as deleted
      const deletedData = (messageData as any).deletedMessageData;
      const deletedStanzaId = deletedData?.stanzaId;
      if (deletedStanzaId) {
        console.log('[whatsapp-webhook] Deleted message received, stanzaId:', deletedStanzaId);
        const { error: deleteError } = await supabase
          .from('chat_messages')
          .update({
            message_text: 'Сообщение было удалено',
            metadata: {
              is_deleted: true,
              deleted_at: new Date(webhook.timestamp * 1000).toISOString(),
            },
            file_url: null,
            file_name: null,
            file_type: null,
          })
          .eq('external_message_id', deletedStanzaId);
        if (deleteError) {
          console.error('[whatsapp-webhook] Error marking message as deleted:', deleteError);
        } else {
          console.log('[whatsapp-webhook] ✓ Message marked as deleted, stanzaId:', deletedStanzaId);
        }
      }
      return; // No need to insert a new message
    }
    default:
      messageText = `[${messageData.typeMessage}]`;
  }

  // ========== PRIORITY 1: Check if sender is a TEACHER ==========
  const { data: teacherData, error: teacherError } = await supabase
    .from('teachers')
    .select('id, first_name, last_name')
    .eq('organization_id', organizationId)
    .eq('whatsapp_id', whatsappId)
    .eq('is_active', true)
    .maybeSingle();

  if (teacherError) {
    console.error('Error checking teacher by whatsapp_id:', teacherError);
  }

  if (teacherData) {
    console.log(`Found teacher by whatsapp_id: ${teacherData.first_name} ${teacherData.last_name || ''} (ID: ${teacherData.id})`);
    diagnosticInfo.teacherId = teacherData.id;
    
    // Handle reaction message for teacher
    if (messageData.typeMessage === 'reactionMessage') {
      await handleReactionMessageForTeacher(webhook, teacherData.id, organizationId);
      return;
    }
    
    // Save message with teacher_id
    const insertResult = await insertChatMessage({
      client_id: null,
      teacher_id: teacherData.id,
      organization_id: organizationId,
      integration_id: integrationId,  // Smart routing
      content: messageText,
      message_type: 'client',
      is_incoming: true,
      messenger: 'whatsapp',
      status: 'delivered',
      external_id: idMessage,
      media_url: fileUrl,
      media_type: fileType,
      file_name: fileName,
      created_at: new Date(webhook.timestamp * 1000).toISOString(),
    });

    if (!insertResult.success) {
      console.error('Error saving teacher message:', insertResult.error);
    }

    console.log(`Saved incoming teacher message from ${phoneNumber}: ${messageText}`);
    return;
  }

  // ========== PRIORITY 2: Normal client flow ==========
  let client = await findOrCreateClient(phoneNumber, senderData.senderName || senderData.sender, organizationId);
  
  // Handle reaction message for client
  if (messageData.typeMessage === 'reactionMessage') {
    await handleReactionMessage(webhook, client);
    return;
  }

  // Save message
  const insertResult = await insertChatMessage({
    client_id: client.id,
    organization_id: organizationId,
    integration_id: integrationId,  // Smart routing
    content: messageText,
    message_type: 'client',
    is_incoming: true,
    messenger: 'whatsapp',
    status: 'delivered',
    external_id: idMessage,
    media_url: fileUrl,
    media_type: fileType,
    file_name: fileName,
    created_at: new Date(webhook.timestamp * 1000).toISOString(),
  });

  if (!insertResult.success) {
    console.error('Error saving incoming message:', insertResult.error);
  }

  // Update last_message_at is already done in findOrCreateClient
  console.log(`Saved incoming message from ${phoneNumber}: ${messageText}`);

  // Sync teacher data if linked
  await syncTeacherFromClient(supabase, client.id, {
    phone: phoneNumber,
    whatsappId: chatId.replace('@c.us', '')
  });
  
  // Trigger delayed GPT response
  console.log('Checking for existing GPT processing for client:', client.id);
  
  const { data: existingProcessing } = await supabase
    .from('pending_gpt_responses')
    .select('id, status, created_at')
    .eq('client_id', client.id)
    .in('status', ['pending', 'processing'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (existingProcessing && existingProcessing.length > 0) {
    console.log('Already processing GPT response for this client, skipping:', existingProcessing[0]);
    return;
  }
  
  setTimeout(async () => {
    try {
      const { data: gptResult, error: gptError } = await supabase.functions.invoke('generate-delayed-gpt-response', {
        body: { 
          clientId: client.id,
          maxWaitTimeMs: 30000
        }
      });

      if (gptError) {
        console.error('Error generating delayed GPT response:', gptError);
      } else {
        console.log('Delayed GPT response generated:', gptResult);
      }
    } catch (error) {
      console.error('Error triggering delayed GPT response:', error);
    }
  }, 500);
}

async function handleMessageStatus(webhook: GreenAPIWebhook) {
  const { statusData } = webhook;
  
  if (!statusData) {
    console.log('Missing status data');
    return;
  }

  const messageId = statusData.idMessage;
  const status = statusData.status;

  const { error } = await supabase
    .from('chat_messages')
    .update({ 
      message_status: status as any
    })
    .eq('external_message_id', messageId);

  if (error) {
    console.error('Error updating message status:', error);
  }

  console.log(`Updated message ${messageId} status to ${status}`);
}

async function handleOutgoingMessage(webhook: GreenAPIWebhook, organizationId: string | null, integrationId: string | null = null) {
  const { senderData, messageData, idMessage } = webhook;
  
  if (!senderData || !messageData) {
    console.log('Missing sender or message data in outgoing message');
    return;
  }

  if (!organizationId) {
    console.error('Cannot process outgoing message: organization_id not resolved');
    return;
  }

  console.log(`Processing outgoing WhatsApp message: ${idMessage}, type: ${webhook.typeWebhook}`);

  // Check for duplicate
  const { data: existingMessage } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('external_message_id', idMessage)
    .maybeSingle();

  if (existingMessage) {
    console.log('Outgoing message already exists (sent via CRM), skipping:', idMessage);
    return;
  }

  const chatId = senderData.chatId;
  const phoneNumber = extractPhoneFromChatId(chatId);
  const whatsappId = phoneNumber;
  
  let messageText = '';
  let fileUrl = null;
  let fileName = null;
  let fileType = null;

  switch (messageData.typeMessage) {
    case 'textMessage':
      messageText = messageData.textMessageData?.textMessage || '';
      break;
    case 'extendedTextMessage':
      messageText = messageData.extendedTextMessageData?.text || '';
      break;
    case 'imageMessage':
      messageText = messageData.fileMessageData?.caption || '📷 Изображение';
      fileUrl = messageData.fileMessageData?.downloadUrl;
      fileName = messageData.fileMessageData?.fileName;
      fileType = messageData.fileMessageData?.mimeType;
      break;
    case 'videoMessage':
      messageText = messageData.fileMessageData?.caption || '🎥 Видео';
      fileUrl = messageData.fileMessageData?.downloadUrl;
      fileName = messageData.fileMessageData?.fileName;
      fileType = messageData.fileMessageData?.mimeType;
      break;
    case 'audioMessage':
      const mimeType = messageData.fileMessageData?.mimeType;
      if (mimeType && (mimeType.includes('ogg') || mimeType.includes('opus'))) {
        messageText = '🎙️ Голосовое сообщение';
      } else {
        messageText = messageData.fileMessageData?.caption || '🎵 Аудиофайл';
      }
      fileUrl = messageData.fileMessageData?.downloadUrl;
      fileName = messageData.fileMessageData?.fileName;
      fileType = mimeType;
      break;
    case 'documentMessage':
      messageText = messageData.fileMessageData?.caption || `📄 ${messageData.fileMessageData?.fileName || 'Документ'}`;
      fileUrl = messageData.fileMessageData?.downloadUrl;
      fileName = messageData.fileMessageData?.fileName;
      fileType = messageData.fileMessageData?.mimeType;
      break;
    case 'quotedMessage':
      messageText = messageData.extendedTextMessageData?.text || '';
      if (messageData.fileMessageData?.downloadUrl) {
        fileUrl = messageData.fileMessageData.downloadUrl;
        fileName = messageData.fileMessageData?.fileName;
        fileType = messageData.fileMessageData?.mimeType;
      }
      break;
    case 'editedMessage': {
      const editedData = (messageData as any).editedMessageData;
      const stanzaId = editedData?.stanzaId;
      const newText = editedData?.textMessage || '';
      if (stanzaId) {
        console.log('[whatsapp-webhook] Edited outgoing message, stanzaId:', stanzaId);
        await supabase.from('chat_messages').update({
          message_text: newText,
          metadata: { is_edited: true, edited_at: new Date(webhook.timestamp * 1000).toISOString() },
        }).eq('external_message_id', stanzaId);
      }
      return;
    }
    case 'deletedMessage': {
      const deletedData = (messageData as any).deletedMessageData;
      const deletedStanzaId = deletedData?.stanzaId;
      if (deletedStanzaId) {
        console.log('[whatsapp-webhook] Deleted outgoing message, stanzaId:', deletedStanzaId);
        await supabase.from('chat_messages').update({
          message_text: 'Сообщение было удалено',
          metadata: { is_deleted: true, deleted_at: new Date(webhook.timestamp * 1000).toISOString() },
          file_url: null, file_name: null, file_type: null,
        }).eq('external_message_id', deletedStanzaId);
      }
      return;
    }
    default:
      messageText = `[${messageData.typeMessage}]`;
  }

  // ========== PRIORITY 1: Check if recipient is a TEACHER ==========
  const { data: teacherData, error: teacherError } = await supabase
    .from('teachers')
    .select('id, first_name, last_name')
    .eq('organization_id', organizationId)
    .eq('whatsapp_id', whatsappId)
    .eq('is_active', true)
    .maybeSingle();

  if (teacherError) {
    console.error('Error checking teacher by whatsapp_id:', teacherError);
  }

  if (teacherData) {
    console.log(`Found teacher by whatsapp_id: ${teacherData.first_name} ${teacherData.last_name || ''} (ID: ${teacherData.id})`);
    
    const insertResult = await insertChatMessage({
      client_id: null,
      teacher_id: teacherData.id,
      organization_id: organizationId,
      integration_id: integrationId,  // Smart routing
      content: messageText,
      message_type: 'manager',
      is_incoming: false,
      messenger: 'whatsapp',
      status: 'sent',
      external_id: idMessage,
      media_url: fileUrl,
      media_type: fileType,
      file_name: fileName,
      created_at: new Date(webhook.timestamp * 1000).toISOString(),
    });

    if (!insertResult.success) {
      console.error('Error saving outgoing teacher message:', insertResult.error);
    }

    console.log(`Saved outgoing teacher message to ${phoneNumber}: ${messageText}`);
    return;
  }

  // ========== PRIORITY 2: Normal client flow ==========
  let client = await findOrCreateClient(phoneNumber, senderData.chatName, organizationId);

  const insertResult = await insertChatMessage({
    client_id: client.id,
    organization_id: organizationId,
    integration_id: integrationId,  // Smart routing
    content: messageText,
    message_type: 'manager',
    is_incoming: false,
    messenger: 'whatsapp',
    status: 'sent',
    external_id: idMessage,
    media_url: fileUrl,
    media_type: fileType,
    file_name: fileName,
    created_at: new Date(webhook.timestamp * 1000).toISOString(),
  });

  if (!insertResult.success) {
    console.error('Error saving outgoing message:', insertResult.error);
  }

  console.log(`Saved outgoing WhatsApp message to ${phoneNumber}: ${messageText}`);
}

async function handleStateChange(webhook: GreenAPIWebhook) {
  console.log('State change:', webhook);
  
  const state = (webhook as any).stateInstance;
  
  await supabase
    .from('messenger_settings')
    .upsert({
      messenger_type: 'whatsapp',
      settings: {
        instance_state: state,
        last_state_change: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    });
}

async function handleIncomingCall(webhook: GreenAPIWebhook, organizationId: string | null) {
  const callData = (webhook as any);
  const phoneNumber = extractPhoneFromChatId(callData.from);
  
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phoneNumber)
    .single();

  if (client) {
    await insertChatMessage({
      client_id: client.id,
      organization_id: client.organization_id || organizationId,
      content: `📞 Входящий звонок (${callData.status || 'unknown'})`,
      message_type: 'system',
      is_incoming: true,
      messenger: 'whatsapp',
      status: 'delivered',
      external_id: `call_${webhook.timestamp}`,
      created_at: new Date(webhook.timestamp * 1000).toISOString(),
    });
    
    console.log(`Recorded call from ${phoneNumber} with status ${callData.status}`);
  }
}

function extractPhoneFromChatId(chatId: string): string {
  const match = chatId.match(/^(\d+)@c\.us$/);
  if (match) {
    const phoneNumber = match[1];
    if (phoneNumber.startsWith('7') && phoneNumber.length === 11) {
      return `+${phoneNumber}`;
    }
    return `+${phoneNumber}`;
  }
  return chatId;
}

// ========== AVATAR FETCHING ==========
async function fetchAndSaveAvatar(phoneNumber: string, clientId: string): Promise<string | null> {
  try {
    const greenApiUrl = Deno.env.get('GREEN_API_URL');
    const greenApiId = Deno.env.get('GREEN_API_ID_INSTANCE');
    const greenApiToken = Deno.env.get('GREEN_API_TOKEN_INSTANCE');

    if (!greenApiUrl || !greenApiId || !greenApiToken) {
      console.log('Green API credentials not configured');
      return null;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const chatId = `${cleanPhone}@c.us`;
    
    const contactInfoUrl = `${greenApiUrl}/waInstance${greenApiId}/getContactInfo/${greenApiToken}`;
    
    console.log(`Fetching contact info for ${chatId}`);
    
    const contactResponse = await fetch(contactInfoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatId })
    });

    if (!contactResponse.ok) {
      console.log(`Failed to get contact info: ${contactResponse.status}`);
      return null;
    }

    const contactData = await contactResponse.json();
    console.log('Contact info response:', JSON.stringify(contactData));
    
    await enrichClientData(clientId, contactData, 'whatsapp');
    
    if (!contactData.avatar) {
      console.log(`No avatar found for ${phoneNumber}`);
      return null;
    }

    console.log(`Downloading avatar from: ${contactData.avatar}`);
    
    const avatarResponse = await fetch(contactData.avatar);
    if (!avatarResponse.ok) {
      console.log(`Failed to download avatar: ${avatarResponse.status}`);
      return null;
    }

    const avatarBlob = await avatarResponse.arrayBuffer();
    const fileName = `avatar_${clientId}_${Date.now()}.jpg`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    console.log(`Avatar saved for ${phoneNumber}: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('Error fetching avatar:', error);
    return null;
  }
}

async function enrichClientData(clientId: string, contactInfo: any, messengerType: 'whatsapp' | 'max') {
  try {
    const updateData: Record<string, any> = {};
    
    const contactName = contactInfo.name || contactInfo.chatName || contactInfo.pushname || contactInfo.displayName;
    const contactPhone = contactInfo.numberPhone || contactInfo.phone;
    const contactAbout = contactInfo.about || contactInfo.description;
    
    const { data: currentClient } = await supabase
      .from('clients')
      .select('name, phone, notes, holihope_metadata')
      .eq('id', clientId)
      .single();
    
    if (!currentClient) {
      console.log('Client not found for enrichment:', clientId);
      return;
    }
    
    const currentName = currentClient.name || '';
    const isAutoName = currentName === 'Без имени' ||
                       currentName.startsWith('Клиент ') || 
                       currentName.startsWith('+') || 
                       /^\d+$/.test(currentName) ||
                       currentName.includes('@c.us') ||
                       currentName.startsWith('MAX User') ||
                       currentName.startsWith('Telegram ');
    
    if (contactName && isAutoName) {
      updateData.name = contactName;
      console.log(`Updating client name from "${currentName}" to "${contactName}"`);
    }
    
    if (contactPhone && !currentClient.phone) {
      const formattedPhone = String(contactPhone).startsWith('+') ? contactPhone : `+${contactPhone}`;
      updateData.phone = formattedPhone;
      console.log(`Setting client phone to "${formattedPhone}"`);
    }
    
    const existingMetadata = (currentClient.holihope_metadata as Record<string, any>) || {};
    const messengerInfo = existingMetadata[`${messengerType}_info`] || {};
    
    const newMessengerInfo: Record<string, any> = {
      ...messengerInfo,
      last_updated: new Date().toISOString()
    };
    
    if (contactName) newMessengerInfo.name = contactName;
    if (contactPhone) newMessengerInfo.phone = contactPhone;
    if (contactAbout) newMessengerInfo.about = contactAbout;
    if (contactInfo.avatar) newMessengerInfo.avatar_url = contactInfo.avatar;
    if (contactInfo.email) newMessengerInfo.email = contactInfo.email;
    if (contactInfo.lastSeen) newMessengerInfo.last_seen = contactInfo.lastSeen;
    if (contactInfo.isArchive !== undefined) newMessengerInfo.is_archive = contactInfo.isArchive;
    if (contactInfo.isMute !== undefined) newMessengerInfo.is_mute = contactInfo.isMute;
    if (contactInfo.isContact !== undefined) newMessengerInfo.is_contact = contactInfo.isContact;
    
    updateData.holihope_metadata = {
      ...existingMetadata,
      [`${messengerType}_info`]: newMessengerInfo
    };
    
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);
      
      if (updateError) {
        console.error('Error enriching client data:', updateError);
      } else {
        console.log(`Client ${clientId} enriched with ${messengerType} data:`, Object.keys(updateData));
      }
    }
  } catch (error) {
    console.error('Error in enrichClientData:', error);
  }
}

// ========== REACTION HANDLERS ==========
async function handleReactionMessage(webhook: GreenAPIWebhook, client: any) {
  const { senderData, messageData, idMessage } = webhook;
  
  if (!messageData) {
    console.log('Missing reaction message data');
    return;
  }

  const reaction = (messageData as any).extendedTextMessageData?.text;
  const originalMessageId = (messageData as any)?.quotedMessage?.stanzaId;
  
  if (!originalMessageId) {
    console.log('Missing original message ID in reaction');
    return;
  }
  
  try {
    const { data: originalMessage, error: messageError } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('external_id', originalMessageId)
      .single();

    if (messageError || !originalMessage) {
      console.log('Original message not found for reaction:', originalMessageId);
      return;
    }

    const { data: existingReaction, error: existingError } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', originalMessage.id)
      .eq('client_id', client.id)
      .single();

    if (reaction && reaction.trim() !== '') {
      if (existingReaction) {
        const { error: updateError } = await supabase
          .from('message_reactions')
          .update({
            emoji: reaction,
            whatsapp_reaction_id: idMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReaction.id);

        if (updateError) {
          console.error('Error updating reaction:', updateError);
        } else {
          console.log(`Updated reaction ${reaction} for client ${client.id} on message ${originalMessage.id}`);
        }
      } else {
        const { error: insertError } = await supabase
          .from('message_reactions')
          .insert({
            message_id: originalMessage.id,
            client_id: client.id,
            emoji: reaction,
            whatsapp_reaction_id: idMessage
          });

        if (insertError) {
          console.error('Error adding reaction:', insertError);
        } else {
          console.log(`Added reaction ${reaction} for client ${client.id} on message ${originalMessage.id}`);
        }
      }
    } else {
      if (existingReaction) {
        const { error: deleteError } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (deleteError) {
          console.error('Error removing reaction:', deleteError);
        } else {
          console.log(`Removed reaction for client ${client.id} on message ${originalMessage.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error handling reaction message:', error);
  }
}

async function handleReactionMessageForTeacher(webhook: GreenAPIWebhook, teacherId: string, organizationId: string) {
  const { messageData, idMessage } = webhook;
  
  if (!messageData) {
    console.log('Missing reaction message data for teacher');
    return;
  }

  const reaction = (messageData as any).extendedTextMessageData?.text;
  const originalMessageId = (messageData as any)?.quotedMessage?.stanzaId;
  
  if (!originalMessageId) {
    console.log('Missing original message ID in teacher reaction');
    return;
  }
  
  try {
    const { data: originalMessage, error: messageError } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('external_id', originalMessageId)
      .single();

    if (messageError || !originalMessage) {
      console.log('Original message not found for teacher reaction:', originalMessageId);
      return;
    }

    const { data: existingReaction, error: existingError } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', originalMessage.id)
      .eq('teacher_id', teacherId)
      .single();

    if (reaction && reaction.trim() !== '') {
      if (existingReaction) {
        const { error: updateError } = await supabase
          .from('message_reactions')
          .update({
            emoji: reaction,
            whatsapp_reaction_id: idMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReaction.id);

        if (updateError) {
          console.error('Error updating teacher reaction:', updateError);
        } else {
          console.log(`Updated reaction ${reaction} for teacher ${teacherId} on message ${originalMessage.id}`);
        }
      } else {
        const { error: insertError } = await supabase
          .from('message_reactions')
          .insert({
            message_id: originalMessage.id,
            teacher_id: teacherId,
            client_id: null,
            emoji: reaction,
            whatsapp_reaction_id: idMessage
          });

        if (insertError) {
          console.error('Error adding teacher reaction:', insertError);
        } else {
          console.log(`Added reaction ${reaction} for teacher ${teacherId} on message ${originalMessage.id}`);
        }
      }
    } else {
      if (existingReaction) {
        const { error: deleteError } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (deleteError) {
          console.error('Error removing teacher reaction:', deleteError);
        } else {
          console.log(`Removed reaction for teacher ${teacherId} on message ${originalMessage.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error handling teacher reaction message:', error);
  }
}

async function handleIncomingReaction(webhook: GreenAPIWebhook, organizationId: string | null) {
  const { senderData, messageData } = webhook;
  
  if (!senderData || !messageData?.reactionMessageData) {
    console.log('Missing sender or reaction data');
    return;
  }

  if (!organizationId) {
    console.log('Missing organizationId for reaction, skipping');
    return;
  }

  const chatId = senderData.chatId;
  const phoneNumber = extractPhoneFromChatId(chatId);
  const whatsappId = phoneNumber.replace('+', '');
  
  // ========== PRIORITY 1: Check if sender is a TEACHER ==========
  const { data: teacherData } = await supabase
    .from('teachers')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('whatsapp_id', whatsappId)
    .eq('is_active', true)
    .maybeSingle();

  if (teacherData) {
    await handleReactionMessageForTeacher(webhook, teacherData.id, organizationId);
    return;
  }

  // ========== PRIORITY 2: Normal client flow ==========
  const client = await findOrCreateClient(phoneNumber, senderData.senderName || senderData.sender, organizationId);
  
  if (client) {
    await handleReactionMessage(webhook, client);
  }
}

// ========== TEACHER SYNC ==========
async function syncTeacherFromClient(
  supabaseClient: ReturnType<typeof createClient>,
  clientId: string,
  data: {
    phone?: string | null;
    whatsappId?: string | null;
  }
): Promise<void> {
  try {
    const { data: teacherLink, error: linkError } = await supabaseClient
      .from('teacher_client_links')
      .select('teacher_id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (linkError) {
      console.log('Error finding teacher link:', linkError);
      return;
    }

    if (!teacherLink) {
      console.log('No teacher link found for client:', clientId);
      return;
    }

    console.log(`Found teacher link: client ${clientId} -> teacher ${teacherLink.teacher_id}`);

    const { data: teacher, error: teacherError } = await supabaseClient
      .from('teachers')
      .select('phone, whatsapp_id')
      .eq('id', teacherLink.teacher_id)
      .single();

    if (teacherError || !teacher) {
      console.error('Error fetching teacher:', teacherError);
      return;
    }

    const updateData: Record<string, unknown> = {};
    
    if (data.phone && !teacher.phone) {
      const normalizedPhone = normalizePhone(data.phone);
      if (normalizedPhone && normalizedPhone.length >= 10) {
        updateData.phone = normalizedPhone;
      }
    }
    
    if (data.whatsappId && !teacher.whatsapp_id) {
      updateData.whatsapp_id = data.whatsappId;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseClient
        .from('teachers')
        .update(updateData)
        .eq('id', teacherLink.teacher_id);

      if (updateError) {
        console.error('Error updating teacher:', updateError);
      } else {
        console.log(`Synced WhatsApp data to teacher ${teacherLink.teacher_id}:`, updateData);
      }
    } else {
      console.log('No new data to sync for teacher:', teacherLink.teacher_id);
    }
  } catch (error: unknown) {
    console.error('Error in syncTeacherFromClient:', getErrorMessage(error));
  }
}
