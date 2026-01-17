import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SalebotHistoryMessage {
  id: number;
  answered: boolean;
  client_replica: boolean;
  message_id: number;
  message_from_outside: number;
  created_at: number;
  text: string;
  attachments: any;
  delivered: boolean;
  error_message: string;
  manager_id: number | null;
  manager_email: string | null;
}

interface SalebotClient {
  id: number;
  platform_id: string;
  client_type: number;
  name: string | null;
  avatar: string | null;
  message_id: number | null;
  project_id: number;
  created_at: number;
  updated_at: number;
  custom_answer: string | null;
  tag: string | null;
  group: string;
  operator_start_dialog: string | null;
}

// Helper: Normalize phone to format 79161234567
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (/^8\d{10}$/.test(cleaned)) {
    cleaned = '7' + cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = '7' + cleaned;
  }
  return cleaned;
}

// Helper: Check and increment API usage, returns remaining requests or -1 if limit reached
async function checkAndIncrementApiUsage(supabase: any, incrementBy: number = 1): Promise<{ allowed: boolean; remaining: number; used: number; limit: number }> {
  // Get or create today's usage record
  const { data: usage } = await supabase.rpc('get_or_create_salebot_usage');
  
  if (!usage) {
    console.error('Failed to get API usage record');
    return { allowed: false, remaining: 0, used: 0, limit: 6000 };
  }

  const currentCount = usage.api_requests_count || 0;
  const maxLimit = usage.max_daily_limit || 6000;
  
  // Check if adding incrementBy would exceed limit
  if (currentCount + incrementBy > maxLimit) {
    console.log(`⚠️ API лимит достигнут: ${currentCount}/${maxLimit}. Пропускаем импорт.`);
    return { allowed: false, remaining: 0, used: currentCount, limit: maxLimit };
  }

  // Increment counter
  const { data: updated } = await supabase.rpc('increment_salebot_api_usage', { increment_by: incrementBy });
  const newCount = updated?.api_requests_count || currentCount + incrementBy;
  
  console.log(`📊 API использование: ${newCount}/${maxLimit} (+${incrementBy})`);
  
  return { 
    allowed: true, 
    remaining: maxLimit - newCount, 
    used: newCount, 
    limit: maxLimit 
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(
  url: string,
  init?: RequestInit,
  opts?: {
    retries?: number;
    timeoutMs?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    logPrefix?: string;
  }
): Promise<any> {
  const retries = opts?.retries ?? 5;
  const timeoutMs = opts?.timeoutMs ?? 25000;
  const baseDelayMs = opts?.baseDelayMs ?? 800;
  const maxDelayMs = opts?.maxDelayMs ?? 8000;
  const logPrefix = opts?.logPrefix ?? 'fetchJsonWithRetry';

  let lastErr: any;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });

      if (res.ok) {
        return await res.json();
      }

      const msg = `${logPrefix}: HTTP ${res.status} ${res.statusText}`;
      if (!isRetryableStatus(res.status)) {
        throw new Error(msg);
      }

      lastErr = new Error(msg);
    } catch (e: any) {
      lastErr = e;

      // AbortError, network errors, etc. are retryable
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt <= retries) {
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      console.log(`🔁 ${logPrefix}: retry ${attempt}/${retries} через ${delay}ms (${url})`);
      await sleep(delay);
      continue;
    }
  }

  throw lastErr;
}

// Helper: Link client with student by phone
async function linkClientWithStudent(supabase: any, clientId: string, phoneNumber: string): Promise<void> {
  const phoneLast10 = phoneNumber.slice(-10);
  if (phoneLast10.length < 10) return;

  // Search student by phone (contact_phone field)
  const { data: students } = await supabase
    .from('students')
    .select('id, external_id, family_group_id, first_name, last_name')
    .or(`contact_phone.ilike.%${phoneLast10}%,additional_contact_phone.ilike.%${phoneLast10}%`)
    .limit(1);

  if (students && students.length > 0) {
    const student = students[0];
    console.log(`🔗 Найден студент по телефону: ${student.first_name} ${student.last_name} (external_id: ${student.external_id})`);
    
    // Update client with HolyHope data
    const updateData: any = {
      holihope_metadata: {
        student_id: student.id,
        external_id: student.external_id,
        linked_at: new Date().toISOString()
      }
    };
    
    // Link to family group if exists
    if (student.family_group_id) {
      // Check if client is already in family_members
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('client_id', clientId)
        .eq('family_group_id', student.family_group_id)
        .maybeSingle();
      
      if (!existingMember) {
        // Add client to family group
        await supabase
          .from('family_members')
          .insert({
            client_id: clientId,
            family_group_id: student.family_group_id,
            relationship_type: 'parent',
            is_primary_contact: false
          });
        console.log(`👨‍👩‍👧 Клиент добавлен в семейную группу студента`);
      }
    }
    
    await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId);
  }
}

// ======== FILL SALEBOT IDS MODE: Get salebot_client_id for existing clients ========
async function handleFillSalebotIds(
  supabase: any,
  salebotApiKey: string,
  progressId: string,
  listId: string | null
): Promise<Response> {
  console.log('🔗 Запуск режима FILL_SALEBOT_IDS: получение salebot_client_id для существующих клиентов');
  
  // Get fill progress from salebot_import_progress
  const { data: progressData } = await supabase
    .from('salebot_import_progress')
    .select('fill_ids_offset, fill_ids_total_matched, fill_ids_total_processed')
    .eq('id', progressId)
    .single();
  
  const currentOffset = progressData?.fill_ids_offset || 0;
  const baseMatched = progressData?.fill_ids_total_matched || 0;
  const baseProcessed = progressData?.fill_ids_total_processed || 0;
  
  const batchSize = 50;
  let totalMatched = 0;
  let totalProcessed = 0;
  let totalApiCalls = 0;
  
  // Check API limit
  const apiCheck = await checkAndIncrementApiUsage(supabase, 0);
  if (!apiCheck.allowed || apiCheck.remaining < 1) {
    console.log('⚠️ API лимит достигнут');
    await supabase
      .from('salebot_import_progress')
      .update({ is_running: false })
      .eq('id', progressId);
    return new Response(
      JSON.stringify({ skipped: true, apiLimitReached: true, apiUsage: apiCheck }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // Get clients from Salebot API
  await checkAndIncrementApiUsage(supabase, 1);
  totalApiCalls++;
  
  const clientsUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_clients`;
  const clientsResponse = await fetch(clientsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      list: listId || undefined,
      offset: currentOffset,
      limit: batchSize
    })
  });
  
  if (!clientsResponse.ok) {
    console.error('Ошибка получения клиентов из Salebot:', clientsResponse.statusText);
    throw new Error(`Ошибка получения клиентов: ${clientsResponse.statusText}`);
  }
  
  const clientsData = await clientsResponse.json();
  const salebotClients: SalebotClient[] = clientsData.clients || [];
  
  if (salebotClients.length === 0) {
    console.log('✅ Все клиенты Salebot обработаны! Заполнение ID завершено.');
    
    // Reset progress
    await supabase
      .from('salebot_import_progress')
      .update({
        fill_ids_offset: 0,
        fill_ids_mode: false,
        is_running: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', progressId);
    
    return new Response(
      JSON.stringify({
        success: true,
        completed: true,
        mode: 'fill_salebot_ids',
        message: 'Все клиенты Salebot обработаны',
        totalMatched: baseMatched,
        totalProcessed: baseProcessed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log(`📋 Загружено ${salebotClients.length} клиентов из Salebot (offset: ${currentOffset})`);
  
  // Process each Salebot client
  for (const salebotClient of salebotClients) {
    try {
      totalProcessed++;
      
      // Extract phone from platform_id
      const phoneNumber = normalizePhone(salebotClient.platform_id);
      
      if (!phoneNumber || phoneNumber.length < 10) {
        console.log(`⏭️ Пропуск клиента ${salebotClient.id}: нет валидного телефона`);
        continue;
      }
      
      const phoneLast10 = phoneNumber.slice(-10);
      
      // Search for matching client in our DB by phone
      const { data: matchingPhones } = await supabase
        .from('client_phone_numbers')
        .select('client_id, phone')
        .or(`phone.eq.${phoneNumber},phone.ilike.%${phoneLast10}`)
        .limit(1);
      
      if (matchingPhones && matchingPhones.length > 0) {
        const clientId = matchingPhones[0].client_id;
        
        // Update client with salebot_client_id
        const { error: updateError } = await supabase
          .from('clients')
          .update({ salebot_client_id: salebotClient.id })
          .eq('id', clientId)
          .is('salebot_client_id', null); // Only update if not already set
        
        if (!updateError) {
          totalMatched++;
          console.log(`✅ Связан клиент ${clientId} с Salebot ID ${salebotClient.id} (телефон: ${phoneNumber})`);
        }
      }
      
      // Small delay to avoid overwhelming DB
      await new Promise(resolve => setTimeout(resolve, 10));
      
    } catch (error: any) {
      console.error(`Ошибка обработки Salebot клиента ${salebotClient.id}:`, error);
    }
  }
  
  // Update progress
  const nextOffset = currentOffset + salebotClients.length;
  const isCompleted = salebotClients.length < batchSize;
  
  await supabase
    .from('salebot_import_progress')
    .update({
      fill_ids_offset: isCompleted ? 0 : nextOffset,
      fill_ids_total_matched: baseMatched + totalMatched,
      fill_ids_total_processed: baseProcessed + totalProcessed,
      fill_ids_mode: !isCompleted,
      is_running: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', progressId);
  
  console.log(`📊 Батч завершён: обработано ${totalProcessed}, связано ${totalMatched}, API вызовов: ${totalApiCalls}`);
  
  return new Response(
    JSON.stringify({
      success: true,
      mode: 'fill_salebot_ids',
      completed: isCompleted,
      processedThisBatch: totalProcessed,
      matchedThisBatch: totalMatched,
      totalProcessed: baseProcessed + totalProcessed,
      totalMatched: baseMatched + totalMatched,
      nextOffset,
      apiCalls: totalApiCalls
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ======== SYNC WITH SALEBOT IDS MODE: Sync only clients that already have salebot_client_id ========
async function handleSyncWithSalebotIds(
  supabase: any,
  salebotApiKey: string,
  organizationId: string,
  progressId: string
): Promise<Response> {
  console.log('🔗 Запуск режима SYNC_WITH_SALEBOT_IDS: синхронизация сообщений только для клиентов с Salebot ID');
  
  // Get resync progress (reusing resync fields)
  const { data: progressData } = await supabase
    .from('salebot_import_progress')
    .select('resync_offset, resync_total_clients, resync_new_messages')
    .eq('id', progressId)
    .single();
  
  const resyncOffset = progressData?.resync_offset || 0;
  const baseTotalClients = progressData?.resync_total_clients || 0;
  const baseNewMessages = progressData?.resync_new_messages || 0;
  
  const clientBatchSize = 20; // Can handle more since we skip API lookups
  
  // Get ONLY clients that have salebot_client_id
  const { data: localClients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, salebot_client_id')
    .not('salebot_client_id', 'is', null)
    .order('created_at', { ascending: true })
    .range(resyncOffset, resyncOffset + clientBatchSize - 1);
  
  if (clientsError) {
    console.error('Ошибка получения клиентов:', clientsError);
    throw clientsError;
  }
  
  if (!localClients || localClients.length === 0) {
    console.log('✅ Все клиенты с Salebot ID обработаны!');
    
    await supabase
      .from('salebot_import_progress')
      .update({
        resync_offset: 0,
        resync_mode: false,
        is_running: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', progressId);
    
    return new Response(
      JSON.stringify({
        success: true,
        completed: true,
        mode: 'sync_with_salebot_ids',
        message: 'Все клиенты с Salebot ID синхронизированы',
        totalClients: baseTotalClients,
        newMessages: baseNewMessages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log(`📋 Загружено ${localClients.length} клиентов с Salebot ID (offset: ${resyncOffset})`);
  
  let processedClients = 0;
  let totalNewMessages = 0;
  let totalApiCalls = 0;
  
  for (const client of localClients) {
    try {
      // Check API limit
      const apiCheck = await checkAndIncrementApiUsage(supabase, 0);
      if (!apiCheck.allowed || apiCheck.remaining < 1) {
        console.log(`⚠️ API лимит достигнут. Прерываем синхронизацию.`);
        break;
      }
      
      // IMPORTANT: Convert bigint to string without scientific notation
      const salebotClientId = String(client.salebot_client_id).replace(/[^\d]/g, '');
      
      if (!salebotClientId || salebotClientId === '0') {
        console.log(`⏭️ Пропуск клиента ${client.name}: невалидный salebot_client_id`);
        processedClients++;
        continue;
      }
      
      // Get message history from Salebot
      await checkAndIncrementApiUsage(supabase, 1);
      totalApiCalls++;
      
      const historyUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_history?client_id=${salebotClientId}&limit=2000`;
      console.log(`📡 Запрос истории для ${client.name}: ${historyUrl}`);
      const historyResponse = await fetch(historyUrl);
      
      if (!historyResponse.ok) {
        console.error(`Ошибка получения истории для клиента ${client.id}: ${historyResponse.statusText}`);
        processedClients++;
        continue;
      }
      
      const historyData = await historyResponse.json();
      console.log(`📥 Ответ Salebot для ${client.name}: ${JSON.stringify(historyData).substring(0, 300)}`);
      const messages: SalebotHistoryMessage[] = historyData.result || [];
      
      if (messages.length === 0) {
        console.log(`📭 Нет сообщений для клиента ${client.name} (Salebot ID: ${salebotClientId})`);
        processedClients++;
        continue;
      }
      
      console.log(`📨 Получено ${messages.length} сообщений для клиента ${client.name}`);
      
      // Convert messages
      const chatMessages: any[] = [];
      for (const msg of messages) {
        if (!msg.created_at) continue;
        
        let date: Date;
        if (typeof msg.created_at === 'number') {
          date = new Date(msg.created_at * 1000);
        } else {
          date = new Date(msg.created_at);
        }
        
        if (isNaN(date.getTime())) continue;
        
        chatMessages.push({
          client_id: client.id,
          organization_id: organizationId,
          message_text: msg.text || '',
          message_type: msg.client_replica ? 'client' : 'manager',
          is_outgoing: !msg.client_replica,
          is_read: true,
          created_at: date.toISOString(),
          messenger_type: 'whatsapp',
          salebot_message_id: msg.id.toString(),
        });
      }
      
      // Insert in batches, checking for duplicates
      const batchSize = 50;
      let clientNewMessages = 0;
      
      for (let i = 0; i < chatMessages.length; i += batchSize) {
        const batch = chatMessages.slice(i, i + batchSize);
        
        const salebotIds = batch.map(m => m.salebot_message_id);
        const { data: existing } = await supabase
          .from('chat_messages')
          .select('salebot_message_id')
          .eq('client_id', client.id)
          .in('salebot_message_id', salebotIds);
        
        const existingIds = new Set((existing || []).map((e: any) => e.salebot_message_id));
        const newMessages = batch.filter(m => !existingIds.has(m.salebot_message_id));
        
        if (newMessages.length > 0) {
          const { error: insertError } = await supabase
            .from('chat_messages')
            .insert(newMessages, { onConflict: 'client_id,salebot_message_id', ignoreDuplicates: true });
          
          if (!insertError) {
            clientNewMessages += newMessages.length;
            totalNewMessages += newMessages.length;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (clientNewMessages > 0) {
        console.log(`✅ Добавлено ${clientNewMessages} новых сообщений для клиента ${client.name}`);
      }
      
      processedClients++;
      
      // Intermediate update every 5 clients
      if (processedClients % 5 === 0) {
        await supabase
          .from('salebot_import_progress')
          .update({
            resync_offset: resyncOffset + processedClients,
            resync_total_clients: baseTotalClients + processedClients,
            resync_new_messages: baseNewMessages + totalNewMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', progressId);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      console.error(`Ошибка обработки клиента ${client.name}:`, error);
    }
  }
  
  // Final update
  const nextOffset = resyncOffset + processedClients;
  const isCompleted = localClients.length < clientBatchSize;
  
  await supabase
    .from('salebot_import_progress')
    .update({
      resync_offset: isCompleted ? 0 : nextOffset,
      resync_total_clients: baseTotalClients + processedClients,
      resync_new_messages: baseNewMessages + totalNewMessages,
      resync_mode: !isCompleted,
      is_running: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', progressId);
  
  const finalApiUsage = await checkAndIncrementApiUsage(supabase, 0);
  
  console.log(`📊 Синхронизация батча завершена: ${processedClients} клиентов, ${totalNewMessages} новых сообщений, ${totalApiCalls} API вызовов`);
  
  return new Response(
    JSON.stringify({
      success: true,
      mode: 'sync_with_salebot_ids',
      completed: isCompleted,
      processedClients,
      newMessages: totalNewMessages,
      totalClients: baseTotalClients + processedClients,
      totalNewMessages: baseNewMessages + totalNewMessages,
      nextOffset,
      apiCalls: totalApiCalls,
      apiUsage: finalApiUsage
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ======== SYNC_NEW_CLIENTS_ONLY MODE: Import only for clients without imported messages ========
async function handleSyncNewClientsOnly(
  supabase: any,
  salebotApiKey: string,
  organizationId: string,
  progressId: string
): Promise<Response> {
  console.log('🆕 Запуск режима SYNC_NEW_CLIENTS_ONLY: импорт только для клиентов БЕЗ импортированных сообщений');
  
  // Get resync progress (reusing resync fields)
  const { data: progressData } = await supabase
    .from('salebot_import_progress')
    .select('resync_offset, resync_total_clients, resync_new_messages')
    .eq('id', progressId)
    .single();
  
  const resyncOffset = progressData?.resync_offset || 0;
  const baseTotalClients = progressData?.resync_total_clients || 0;
  const baseNewMessages = progressData?.resync_new_messages || 0;
  
  const clientBatchSize = 20;
  
  // Use RPC function to get ONLY clients that have salebot_client_id BUT NO imported messages
  const { data: localClients, error: clientsError } = await supabase
    .rpc('get_clients_without_imported_messages', {
      p_org_id: organizationId,
      p_offset: resyncOffset,
      p_limit: clientBatchSize
    });
  
  if (clientsError) {
    console.error('Ошибка получения клиентов без сообщений:', clientsError);
    throw clientsError;
  }
  
  if (!localClients || localClients.length === 0) {
    console.log('✅ Все клиенты без сообщений обработаны! Импорт завершён.');
    
    await supabase
      .from('salebot_import_progress')
      .update({
        resync_offset: 0,
        resync_mode: false,
        is_running: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', progressId);
    
    return new Response(
      JSON.stringify({
        success: true,
        completed: true,
        mode: 'sync_new_clients_only',
        message: 'Все клиенты без сообщений импортированы',
        totalClients: baseTotalClients,
        newMessages: baseNewMessages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log(`📋 Загружено ${localClients.length} клиентов БЕЗ сообщений (offset: ${resyncOffset})`);
  
  let processedClients = 0;
  let totalNewMessages = 0;
  let totalApiCalls = 0;
  
  for (const client of localClients) {
    try {
      // Check API limit
      const apiCheck = await checkAndIncrementApiUsage(supabase, 0);
      if (!apiCheck.allowed || apiCheck.remaining < 1) {
        console.log(`⚠️ API лимит достигнут. Прерываем импорт.`);
        break;
      }
      
      // Convert bigint to string without scientific notation
      const salebotClientId = String(client.salebot_client_id).replace(/[^\d]/g, '');
      
      if (!salebotClientId || salebotClientId === '0') {
        console.log(`⏭️ Пропуск клиента ${client.name}: невалидный salebot_client_id`);
        processedClients++;
        continue;
      }
      
      // Get message history from Salebot
      await checkAndIncrementApiUsage(supabase, 1);
      totalApiCalls++;
      
      const historyUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_history?client_id=${salebotClientId}&limit=2000`;
      console.log(`📡 Запрос истории для ${client.name}: ${historyUrl}`);
      const historyResponse = await fetch(historyUrl);
      
      if (!historyResponse.ok) {
        console.error(`Ошибка получения истории для клиента ${client.id}: ${historyResponse.statusText}`);
        processedClients++;
        continue;
      }
      
      const historyData = await historyResponse.json();
      console.log(`📥 Ответ Salebot для ${client.name}: ${JSON.stringify(historyData).substring(0, 300)}`);
      const messages: SalebotHistoryMessage[] = historyData.result || [];
      
      if (messages.length === 0) {
        console.log(`📭 Нет сообщений для клиента ${client.name} (Salebot ID: ${salebotClientId})`);
        processedClients++;
        continue;
      }
      
      console.log(`📨 Получено ${messages.length} сообщений для клиента ${client.name}`);
      
      // Convert messages
      const chatMessages: any[] = [];
      for (const msg of messages) {
        if (!msg.created_at) continue;
        
        let date: Date;
        if (typeof msg.created_at === 'number') {
          date = new Date(msg.created_at * 1000);
        } else {
          date = new Date(msg.created_at);
        }
        
        if (isNaN(date.getTime())) continue;
        
        chatMessages.push({
          client_id: client.id,
          organization_id: organizationId,
          message_text: msg.text || '',
          message_type: msg.client_replica ? 'client' : 'manager',
          is_outgoing: !msg.client_replica,
          is_read: true,
          created_at: date.toISOString(),
          messenger_type: 'whatsapp',
          salebot_message_id: msg.id.toString(),
        });
      }
      
      // Insert in batches
      const batchSize = 50;
      let clientNewMessages = 0;
      
      for (let i = 0; i < chatMessages.length; i += batchSize) {
        const batch = chatMessages.slice(i, i + batchSize);
        
        const salebotIds = batch.map(m => m.salebot_message_id);
        const { data: existing } = await supabase
          .from('chat_messages')
          .select('salebot_message_id')
          .eq('client_id', client.id)
          .in('salebot_message_id', salebotIds);
        
        const existingIds = new Set((existing || []).map((e: any) => e.salebot_message_id));
        const newMessages = batch.filter(m => !existingIds.has(m.salebot_message_id));
        
        if (newMessages.length > 0) {
          const { error: insertError } = await supabase
            .from('chat_messages')
            .insert(newMessages, { onConflict: 'client_id,salebot_message_id', ignoreDuplicates: true });
          
          if (!insertError) {
            clientNewMessages += newMessages.length;
            totalNewMessages += newMessages.length;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (clientNewMessages > 0) {
        console.log(`✅ Добавлено ${clientNewMessages} сообщений для клиента ${client.name}`);
      }
      
      processedClients++;
      
      // Intermediate update every 5 clients
      if (processedClients % 5 === 0) {
        await supabase
          .from('salebot_import_progress')
          .update({
            resync_offset: resyncOffset + processedClients,
            resync_total_clients: baseTotalClients + processedClients,
            resync_new_messages: baseNewMessages + totalNewMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', progressId);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      console.error(`Ошибка обработки клиента ${client.name}:`, error);
    }
  }
  
  // Final update
  const nextOffset = resyncOffset + processedClients;
  const isCompleted = localClients.length < clientBatchSize;
  
  await supabase
    .from('salebot_import_progress')
    .update({
      resync_offset: isCompleted ? 0 : nextOffset,
      resync_total_clients: baseTotalClients + processedClients,
      resync_new_messages: baseNewMessages + totalNewMessages,
      resync_mode: !isCompleted,
      is_running: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', progressId);
  
  const finalApiUsage = await checkAndIncrementApiUsage(supabase, 0);
  
  console.log(`📊 Батч завершён: ${processedClients} клиентов, ${totalNewMessages} новых сообщений, ${totalApiCalls} API вызовов`);
  
  return new Response(
    JSON.stringify({
      success: true,
      mode: 'sync_new_clients_only',
      completed: isCompleted,
      processedClients,
      newMessages: totalNewMessages,
      totalClients: baseTotalClients + processedClients,
      totalNewMessages: baseNewMessages + totalNewMessages,
      nextOffset,
      apiCalls: totalApiCalls,
      apiUsage: finalApiUsage
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ======== RESYNC MODE: Get history for existing clients in our DB ========
async function handleResyncMessages(
  supabase: any,
  salebotApiKey: string,
  organizationId: string,
  progressId: string
): Promise<Response> {
  console.log('🔄 Запуск режима RESYNC_MESSAGES: синхронизация новых сообщений для существующих клиентов');
  
  // Get resync progress
  const { data: progressData } = await supabase
    .from('salebot_import_progress')
    .select('resync_offset, resync_total_clients, resync_new_messages')
    .eq('id', progressId)
    .single();
  
  const resyncOffset = progressData?.resync_offset || 0;
  const baseTotalClients = progressData?.resync_total_clients || 0;
  const baseNewMessages = progressData?.resync_new_messages || 0;
  
  const clientBatchSize = 10;
  
  // Get clients that have salebot messages (meaning they came from Salebot)
  const { data: localClients, error: clientsError } = await supabase
    .from('clients')
    .select(`
      id, 
      name, 
      salebot_client_id,
      phone_numbers:client_phone_numbers(phone)
    `)
    .order('created_at', { ascending: true })
    .range(resyncOffset, resyncOffset + clientBatchSize - 1);
  
  if (clientsError) {
    console.error('Ошибка получения клиентов:', clientsError);
    throw clientsError;
  }
  
  if (!localClients || localClients.length === 0) {
    console.log('✅ Все клиенты обработаны! Ресинхронизация завершена.');
    
    // Reset resync progress
    await supabase
      .from('salebot_import_progress')
      .update({
        resync_offset: 0,
        resync_mode: false,
        is_running: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', progressId);
    
    return new Response(
      JSON.stringify({
        success: true,
        completed: true,
        mode: 'resync_messages',
        message: 'Все клиенты синхронизированы',
        totalClients: baseTotalClients,
        newMessages: baseNewMessages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log(`📋 Загружено ${localClients.length} клиентов для ресинхронизации (offset: ${resyncOffset})`);
  
  let processedClients = 0;
  let totalNewMessages = 0;
  let totalApiCalls = 0;
  
  for (const client of localClients) {
    try {
      // Check API limit
      const apiCheck = await checkAndIncrementApiUsage(supabase, 0);
      if (!apiCheck.allowed || apiCheck.remaining < 2) {
        console.log(`⚠️ API лимит достигнут. Прерываем ресинхронизацию.`);
        break;
      }
      
      let salebotClientId = client.salebot_client_id;
      
      // If no salebot_client_id, try to find it by phone
      if (!salebotClientId && client.phone_numbers && client.phone_numbers.length > 0) {
        const phone = client.phone_numbers[0]?.phone;
        if (phone) {
          const cleanPhone = normalizePhone(phone);
          
          // Try to find Salebot client ID by phone
          await checkAndIncrementApiUsage(supabase, 1);
          totalApiCalls++;
          
          const clientIdUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/whatsapp_client_id?phone=${cleanPhone}&group_id=115236`;
          
          try {
            const response = await fetch(clientIdUrl);
            if (response.ok) {
              const data = await response.json();
              if (data.client_id) {
                salebotClientId = data.client_id;
                
                // Save salebot_client_id for future use
                await supabase
                  .from('clients')
                  .update({ salebot_client_id: salebotClientId })
                  .eq('id', client.id);
                
                console.log(`📱 Найден Salebot ID ${salebotClientId} для клиента ${client.name} по телефону ${cleanPhone}`);
              }
            }
          } catch (e) {
            console.log(`Не удалось найти Salebot ID для телефона ${cleanPhone}`);
          }
        }
      }
      
      if (!salebotClientId) {
        console.log(`⏭️ Пропуск клиента ${client.name}: нет salebot_client_id`);
        processedClients++;
        continue;
      }
      
      // IMPORTANT: Convert bigint to string without scientific notation
      const salebotClientIdStr = String(salebotClientId).replace(/[^\d]/g, '');
      
      // Get message history from Salebot
      await checkAndIncrementApiUsage(supabase, 1);
      totalApiCalls++;
      
      const historyUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_history?client_id=${salebotClientIdStr}&limit=2000`;
      console.log(`📡 Запрос истории для ${client.name}: client_id=${salebotClientIdStr}`);
      const historyResponse = await fetch(historyUrl);
      
      if (!historyResponse.ok) {
        console.error(`Ошибка получения истории для клиента ${client.id}: ${historyResponse.statusText}`);
        processedClients++;
        continue;
      }
      
      const historyData = await historyResponse.json();
      console.log(`📥 Ответ Salebot для ${client.name}: ${JSON.stringify(historyData).substring(0, 300)}`);
      const messages: SalebotHistoryMessage[] = historyData.result || [];
      
      if (messages.length === 0) {
        console.log(`📭 Нет сообщений для клиента ${client.name}`);
        processedClients++;
        continue;
      }
      
      console.log(`📨 Получено ${messages.length} сообщений для клиента ${client.name}`);
      
      // Convert messages
      const chatMessages: any[] = [];
      for (const msg of messages) {
        if (!msg.created_at) continue;
        
        let date: Date;
        if (typeof msg.created_at === 'number') {
          date = new Date(msg.created_at * 1000);
        } else {
          date = new Date(msg.created_at);
        }
        
        if (isNaN(date.getTime())) continue;
        
        chatMessages.push({
          client_id: client.id,
          organization_id: organizationId,
          message_text: msg.text || '',
          message_type: msg.client_replica ? 'client' : 'manager',
          is_outgoing: !msg.client_replica,
          is_read: true,
          created_at: date.toISOString(),
          messenger_type: 'whatsapp',
          salebot_message_id: msg.id.toString(),
        });
      }
      
      // Insert in batches, checking for duplicates
      const batchSize = 50;
      let clientNewMessages = 0;
      
      for (let i = 0; i < chatMessages.length; i += batchSize) {
        const batch = chatMessages.slice(i, i + batchSize);
        
        const salebotIds = batch.map(m => m.salebot_message_id);
        const { data: existing } = await supabase
          .from('chat_messages')
          .select('salebot_message_id')
          .eq('client_id', client.id)
          .in('salebot_message_id', salebotIds);
        
        const existingIds = new Set((existing || []).map((e: any) => e.salebot_message_id));
        const newMessages = batch.filter(m => !existingIds.has(m.salebot_message_id));
        
        if (newMessages.length > 0) {
          const { error: insertError } = await supabase
            .from('chat_messages')
            .insert(newMessages, { onConflict: 'client_id,salebot_message_id', ignoreDuplicates: true });
          
          if (!insertError) {
            clientNewMessages += newMessages.length;
            totalNewMessages += newMessages.length;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (clientNewMessages > 0) {
        console.log(`✅ Добавлено ${clientNewMessages} новых сообщений для клиента ${client.name}`);
      }
      
      processedClients++;
      
      // Intermediate commit every 5 clients
      if (processedClients % 5 === 0) {
        await supabase
          .from('salebot_import_progress')
          .update({
            resync_offset: resyncOffset + processedClients,
            resync_total_clients: baseTotalClients + processedClients,
            resync_new_messages: baseNewMessages + totalNewMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', progressId);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      console.error(`Ошибка обработки клиента ${client.name}:`, error);
    }
  }
  
  // Final update
  const nextOffset = resyncOffset + processedClients;
  const isCompleted = localClients.length < clientBatchSize;
  
  await supabase
    .from('salebot_import_progress')
    .update({
      resync_offset: isCompleted ? 0 : nextOffset,
      resync_total_clients: baseTotalClients + processedClients,
      resync_new_messages: baseNewMessages + totalNewMessages,
      resync_mode: !isCompleted,
      is_running: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', progressId);
  
  const finalApiUsage = await checkAndIncrementApiUsage(supabase, 0);
  
  console.log(`📊 Ресинхронизация батча завершена: ${processedClients} клиентов, ${totalNewMessages} новых сообщений, ${totalApiCalls} API вызовов`);
  
  return new Response(
    JSON.stringify({
      success: true,
      mode: 'resync_messages',
      completed: isCompleted,
      processedClients,
      newMessages: totalNewMessages,
      totalClients: baseTotalClients + processedClients,
      totalNewMessages: baseNewMessages + totalNewMessages,
      nextOffset,
      apiCalls: totalApiCalls,
      apiUsage: finalApiUsage
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const salebotApiKey = Deno.env.get('SALEBOT_API_KEY');

    if (!salebotApiKey) {
      throw new Error('SALEBOT_API_KEY не настроен');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse request body for mode parameter
    let requestMode:
      | 'full'
      | 'incremental'
      | 'sync_new'
      | 'resync_messages'
      | 'fill_salebot_ids'
      | 'full_reimport'
      | 'sync_with_salebot_ids'
      | 'continuous_sync'
      | 'background_chain' = 'full';
    try {
      const body = await req.json();
      if (
        body?.mode === 'incremental' ||
        body?.mode === 'sync_new' ||
        body?.mode === 'resync_messages' ||
        body?.mode === 'fill_salebot_ids' ||
        body?.mode === 'full_reimport' ||
        body?.mode === 'sync_with_salebot_ids' ||
        body?.mode === 'continuous_sync' ||
        body?.mode === 'background_chain'
      ) {
        requestMode = body.mode;
      }
    } catch {
      // No body or invalid JSON - use default mode
    }
    
    console.log(`🚀 Запуск импорта в режиме: ${requestMode}`);

    // ======== BACKGROUND_CHAIN MODE: Handle BEFORE lock check ========
    // This mode uses its own lock management via updated_at heartbeat
    // Features: time budget, stale run detection, fetchJsonWithRetry, reliable self-invoke
    if (requestMode === 'background_chain') {
      const BATCH_TIME_BUDGET_MS = 45000; // 45 seconds max per batch (edge runtime limit is ~60s)
      const STALE_RUN_THRESHOLD_MS = 120000; // 2 minutes - consider previous run as crashed
      const batchStartedAt = Date.now();
      
      console.log('🔗 Запуск BACKGROUND_CHAIN режима (до проверки блокировки)');
      
      // Get current progress directly - skip try_acquire_import_lock
      const { data: chainProgress } = await supabase
        .from('salebot_import_progress')
        .select('id, resync_offset, resync_total_clients, resync_new_messages, is_paused, is_running, updated_at')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (!chainProgress) {
        console.error('❌ Не найдена запись прогресса для background_chain');
        return new Response(
          JSON.stringify({ error: 'No progress record found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const progressId = chainProgress.id;
      
      // Check if should stop (paused by user)
      if (chainProgress.is_paused) {
        console.log('⏸️ Background chain остановлен пользователем (is_paused=true)');
        await supabase
          .from('salebot_import_progress')
          .update({ is_running: false })
          .eq('id', progressId);
        return new Response(
          JSON.stringify({ success: true, stopped: true, reason: 'paused' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Stale run detection: if is_running=true but updated_at is old, consider it crashed and continue
      if (chainProgress.is_running) {
        const lastUpdateTime = new Date(chainProgress.updated_at).getTime();
        const timeSinceUpdate = Date.now() - lastUpdateTime;
        
        if (timeSinceUpdate > STALE_RUN_THRESHOLD_MS) {
          console.log(`⚠️ Обнаружен зависший процесс (${Math.round(timeSinceUpdate / 1000)}с без обновления). Перезапускаем...`);
          // Continue processing - don't block, just take over
        } else {
          console.log(`ℹ️ Процесс уже запущен (обновление ${Math.round(timeSinceUpdate / 1000)}с назад). Возможно дубль вызова, но продолжаем.`);
          // Don't block - in chain mode we want to continue processing
        }
      }
      
      // Check API limit
      const chainApiCheck = await checkAndIncrementApiUsage(supabase, 0);
      if (!chainApiCheck.allowed || chainApiCheck.remaining < 5) {
        console.log(`⚠️ API лимит достигнут в background chain: ${chainApiCheck.remaining} осталось`);
        await supabase
          .from('salebot_import_progress')
          .update({ is_running: false })
          .eq('id', progressId);
        return new Response(
          JSON.stringify({ success: true, stopped: true, reason: 'api_limit', apiUsage: chainApiCheck }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get organization_id
      const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      const organizationId = orgs?.[0]?.id;
      
      if (!organizationId) {
        console.error('❌ Не найдена организация');
        return new Response(
          JSON.stringify({ error: 'No organization found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Mark as running with heartbeat immediately
      await supabase
        .from('salebot_import_progress')
        .update({ 
          is_running: true,
          is_paused: false,
          resync_mode: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', progressId);
      
      const BATCH_SIZE = 10;
      const resyncOffset = chainProgress.resync_offset || 0;
      const baseTotalClients = chainProgress.resync_total_clients || 0;
      const baseNewMessages = chainProgress.resync_new_messages || 0;
      
      // Get clients with salebot_client_id
      const { data: localClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, salebot_client_id')
        .not('salebot_client_id', 'is', null)
        .order('created_at', { ascending: true })
        .range(resyncOffset, resyncOffset + BATCH_SIZE - 1);
      
      if (clientsError) {
        console.error('Ошибка получения клиентов:', clientsError);
        await supabase
          .from('salebot_import_progress')
          .update({ is_running: false })
          .eq('id', progressId);
        return new Response(
          JSON.stringify({ error: clientsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if completed
      if (!localClients || localClients.length === 0) {
        console.log('✅ Background chain завершён! Все клиенты обработаны.');
        await supabase
          .from('salebot_import_progress')
          .update({
            resync_offset: 0,
            resync_mode: false,
            is_running: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', progressId);
        
        return new Response(
          JSON.stringify({
            success: true,
            completed: true,
            mode: 'background_chain',
            totalClients: baseTotalClients,
            totalNewMessages: baseNewMessages
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`📦 Background chain batch: ${localClients.length} клиентов (offset: ${resyncOffset})`);
      
      let processedClients = 0;
      let totalNewMessages = 0;
      let totalApiCalls = 0;
      let stoppedDueToTimeBudget = false;
      
      // Helper to save progress and trigger next batch
      const saveProgressAndContinue = async (hasMoreClients: boolean) => {
        const nextOffset = resyncOffset + processedClients;
        
        await supabase
          .from('salebot_import_progress')
          .update({
            resync_offset: nextOffset,
            resync_total_clients: baseTotalClients + processedClients,
            resync_new_messages: baseNewMessages + totalNewMessages,
            updated_at: new Date().toISOString(),
            is_running: hasMoreClients
          })
          .eq('id', progressId);
        
        console.log(`✅ Batch сохранён: ${processedClients} клиентов, ${totalNewMessages} сообщений, offset → ${nextOffset}`);
        
        if (hasMoreClients) {
          // Check if paused before continuing
          const { data: checkPause } = await supabase
            .from('salebot_import_progress')
            .select('is_paused')
            .eq('id', progressId)
            .single();
          
          if (!checkPause?.is_paused) {
            console.log('🔗 Вызываем следующий batch через EdgeRuntime.waitUntil...');
            
            // Use EdgeRuntime.waitUntil for reliable background task
            const nextBatchPromise = fetch(`${supabaseUrl}/functions/v1/import-salebot-chats-auto`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceRoleKey}`
              },
              body: JSON.stringify({ mode: 'background_chain' })
            }).catch(err => console.error('Self-invoke error:', err));
            
            // @ts-ignore - EdgeRuntime is available in Deno edge functions
            if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
              // @ts-ignore
              EdgeRuntime.waitUntil(nextBatchPromise);
            } else {
              // Fallback for environments without EdgeRuntime
              nextBatchPromise.catch(() => {});
            }
          } else {
            console.log('⏸️ Пауза обнаружена, остановка цепочки');
            await supabase
              .from('salebot_import_progress')
              .update({ is_running: false })
              .eq('id', progressId);
          }
        } else {
          // Mark as completed
          await supabase
            .from('salebot_import_progress')
            .update({ 
              is_running: false,
              resync_mode: false,
              resync_offset: 0
            })
            .eq('id', progressId);
        }
      };
      
      // Process batch
      for (const client of localClients) {
        // Check time budget BEFORE processing each client
        const elapsedMs = Date.now() - batchStartedAt;
        if (elapsedMs > BATCH_TIME_BUDGET_MS) {
          console.log(`⏱️ Time budget исчерпан (${Math.round(elapsedMs / 1000)}с). Сохраняем прогресс и продолжаем в следующем batch.`);
          stoppedDueToTimeBudget = true;
          break;
        }
        
        try {
          const salebotClientId = String(client.salebot_client_id).replace(/[^\d]/g, '');
          
          if (!salebotClientId || salebotClientId === '0') {
            processedClients++;
            continue;
          }
          
          // Update heartbeat before API call (in case it hangs)
          await supabase
            .from('salebot_import_progress')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', progressId);
          
          // Get message history using fetchJsonWithRetry with timeout
          await checkAndIncrementApiUsage(supabase, 1);
          totalApiCalls++;
          
          const historyUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_history?client_id=${salebotClientId}&limit=2000`;
          
          let historyData: any;
          try {
            historyData = await fetchJsonWithRetry(historyUrl, undefined, {
              retries: 2,
              timeoutMs: 20000, // 20 second timeout per request
              baseDelayMs: 500,
              maxDelayMs: 3000,
              logPrefix: `get_history(${client.name})`
            });
          } catch (fetchError: any) {
            console.error(`❌ Не удалось получить историю для ${client.name} после ретраев: ${fetchError.message}`);
            processedClients++;
            // Continue to next client instead of failing the whole batch
            continue;
          }
          
          const messages: SalebotHistoryMessage[] = historyData?.result || [];
          
          if (messages.length > 0) {
            // Convert messages
            const chatMessages: any[] = [];
            for (const msg of messages) {
              if (!msg.created_at) continue;
              
              let date: Date;
              if (typeof msg.created_at === 'number') {
                date = new Date(msg.created_at * 1000);
              } else {
                date = new Date(msg.created_at);
              }
              
              if (isNaN(date.getTime())) continue;
              
              chatMessages.push({
                client_id: client.id,
                organization_id: organizationId,
                message_text: msg.text || '',
                message_type: msg.client_replica ? 'client' : 'manager',
                is_outgoing: !msg.client_replica,
                is_read: true,
                created_at: date.toISOString(),
                messenger_type: 'whatsapp',
                salebot_message_id: msg.id.toString(),
              });
            }
            
            // Insert in batches
            const batchSize = 50;
            for (let i = 0; i < chatMessages.length; i += batchSize) {
              const batch = chatMessages.slice(i, i + batchSize);
              
              const salebotIds = batch.map(m => m.salebot_message_id);
              const { data: existing } = await supabase
                .from('chat_messages')
                .select('salebot_message_id')
                .eq('client_id', client.id)
                .in('salebot_message_id', salebotIds);
              
              const existingIds = new Set((existing || []).map((e: any) => e.salebot_message_id));
              const newMessages = batch.filter(m => !existingIds.has(m.salebot_message_id));
              
              if (newMessages.length > 0) {
                const { error: insertError } = await supabase
                  .from('chat_messages')
                  .insert(newMessages, { onConflict: 'client_id,salebot_message_id', ignoreDuplicates: true });
                
                if (!insertError) {
                  totalNewMessages += newMessages.length;
                }
              }
              
              await sleep(50);
            }
          }
          
          processedClients++;
          
          // Update heartbeat after each client (more reliable)
          await supabase
            .from('salebot_import_progress')
            .update({
              resync_offset: resyncOffset + processedClients,
              resync_total_clients: baseTotalClients + processedClients,
              resync_new_messages: baseNewMessages + totalNewMessages,
              updated_at: new Date().toISOString()
            })
            .eq('id', progressId);
          
          await sleep(100);
          
        } catch (error: any) {
          console.error(`Ошибка обработки ${client.name}:`, error);
          processedClients++;
        }
      }
      
      // Determine if there are more clients to process
      const hasMoreClients = stoppedDueToTimeBudget || localClients.length === BATCH_SIZE;
      
      // Save progress and trigger next batch using the helper function
      await saveProgressAndContinue(hasMoreClients);
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'background_chain',
          completed: !hasMoreClients,
          stoppedDueToTimeBudget,
          processedClients,
          newMessages: totalNewMessages,
          nextOffset: resyncOffset + processedClients,
          apiCalls: totalApiCalls,
          elapsedMs: Date.now() - batchStartedAt
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ======== END BACKGROUND_CHAIN MODE ========

    // Check pause flag to prevent auto-resume (for non-chain modes)
    const { data: pauseRow } = await supabase
      .from('salebot_import_progress')
      .select('id, is_paused')
      .order('last_run_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    if (pauseRow?.is_paused) {
      console.log('⏸️ Автоимпорт на паузе (is_paused=true). Выходим.');
      return new Response(
        JSON.stringify({ skipped: true, paused: true, message: 'Auto-import paused' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ======== CHECK API LIMIT BEFORE STARTING ========
    // Estimate: 1 get_clients + ~10 get_history = ~11 API requests per batch
    const estimatedApiCalls = 11;
    const apiCheck = await checkAndIncrementApiUsage(supabase, 0); // Check without incrementing
    
    if (!apiCheck.allowed || apiCheck.remaining < estimatedApiCalls) {
      console.log(`⚠️ Недостаточно API лимита для батча. Осталось: ${apiCheck.remaining}, нужно: ${estimatedApiCalls}`);
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          apiLimitReached: true, 
          message: `Дневной лимит API достигнут (${apiCheck.used}/${apiCheck.limit})`,
          apiUsage: apiCheck
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Проверяем и очищаем зависший процесс (старше 3 минут)
    const STALE_THRESHOLD_SECONDS = 180; // 3 минуты
    const { data: staleProgress } = await supabase
      .from('salebot_import_progress')
      .select('id, is_running, updated_at')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (staleProgress?.is_running) {
      const lastUpdate = new Date(staleProgress.updated_at);
      const now = new Date();
      const ageSeconds = (now.getTime() - lastUpdate.getTime()) / 1000;
      
      if (ageSeconds > STALE_THRESHOLD_SECONDS) {
        console.log(`⚠️ Обнаружен зависший процесс (последнее обновление ${Math.round(ageSeconds)}с назад). Автосброс...`);
        await supabase
          .from('salebot_import_progress')
          .update({ 
            is_running: false,
            resync_mode: false,
            fill_ids_mode: false
          })
          .eq('id', staleProgress.id);
        console.log('✅ Зависший процесс сброшен, можно продолжить импорт');
      }
    }

    // Пытаемся получить блокировку для запуска импорта через атомарную RPC функцию
    const { data: lockResult, error: lockError } = await supabase.rpc('try_acquire_import_lock');
    
    if (lockError) {
      console.error('Ошибка получения блокировки:', lockError);
      return new Response(
        JSON.stringify({ error: `Ошибка получения блокировки импорта: ${lockError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lockResult || lockResult.length === 0) {
      console.error('Не удалось получить данные блокировки');
      return new Response(
        JSON.stringify({ error: 'Не удалось получить данные блокировки' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lock = lockResult[0];
    
    if (!lock.acquired) {
      console.log('⏸️ Импорт уже выполняется. Пропускаем запуск.');
      return new Response(
        JSON.stringify({ 
          message: 'Импорт уже выполняется',
          totalImported: 0,
          totalClients: 0,
          completed: false,
          skipped: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const progressId = lock.progress_id;
    
    console.log('Результат блокировки:', JSON.stringify(lock));
    
    if (!progressId) {
      console.error('progress_id не найден в результате блокировки');
      return new Response(
        JSON.stringify({ error: 'Не удалось получить progress_id из блокировки' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get organization_id
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    const organizationId = orgs?.[0]?.id;

    if (!organizationId) {
      throw new Error('Не найдена организация');
    }
    
// ======== BACKGROUND_CHAIN MODE is now handled BEFORE lock check (line ~927) ========
    // This block was moved up to avoid lock conflicts in self-invoking chain

// ======== CONTINUOUS MODE: Фоновый импорт (DEPRECATED - use background_chain) ========
    if (requestMode === 'continuous_sync') {
      // Redirect to background_chain mode
      console.log('⚠️ continuous_sync deprecated, redirecting to background_chain');
      
      // Reset and start chain
      await supabase
        .from('salebot_import_progress')
        .update({ 
          resync_offset: 0,
          resync_total_clients: 0,
          resync_new_messages: 0,
          resync_mode: true,
          is_running: true,
          is_paused: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', progressId);
      
      // Start the chain
      fetch(`${supabaseUrl}/functions/v1/import-salebot-chats-auto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceRoleKey}`
        },
        body: JSON.stringify({ mode: 'background_chain' })
      }).catch(err => console.error('Chain start error:', err));
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'background_chain',
          message: 'Фоновый импорт запущен (self-invoking chain). Можно закрыть страницу.',
          chainStarted: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ======== SYNC_NEW_CLIENTS_ONLY MODE: Import only for clients without imported messages ========
    if (requestMode === 'sync_new_clients_only') {
      console.log('🆕 Запуск режима SYNC_NEW_CLIENTS_ONLY: импорт только для клиентов без сообщений');
      
      // Set resync mode flag
      await supabase
        .from('salebot_import_progress')
        .update({ resync_mode: true })
        .eq('id', progressId);
      
      return await handleSyncNewClientsOnly(supabase, salebotApiKey, organizationId, progressId);
    }
    
    // ======== SYNC_WITH_SALEBOT_IDS MODE ========
    if (requestMode === 'sync_with_salebot_ids') {
      // Set resync mode flag
      await supabase
        .from('salebot_import_progress')
        .update({ resync_mode: true })
        .eq('id', progressId);
      
      return await handleSyncWithSalebotIds(supabase, salebotApiKey, organizationId, progressId);
    }
    
    // ======== RESYNC_MESSAGES MODE ========
    if (requestMode === 'resync_messages') {
      // Set resync mode flag
      await supabase
        .from('salebot_import_progress')
        .update({ resync_mode: true })
        .eq('id', progressId);
      
      return await handleResyncMessages(supabase, salebotApiKey, organizationId, progressId);
    }
    
    // Получаем информацию о прогрессе (list_id и безопасный offset)
    const { data: progressData } = await supabase
      .from('salebot_import_progress')
      .select('id, list_id, current_offset, total_clients_processed, total_messages_imported, total_imported')
      .eq('id', progressId)
      .single();
    
    const listId = progressData?.list_id;
    
    // ======== FULL_REIMPORT MODE: Сброс и полный реимпорт с нуля ========
    if (requestMode === 'full_reimport') {
      console.log('🔄 Запуск FULL_REIMPORT: сброс прогресса и полный импорт с нуля');
      
      // Reset all progress counters
      await supabase
        .from('salebot_import_progress')
        .update({
          current_offset: 0,
          total_clients_processed: 0,
          total_messages_imported: 0,
          total_imported: 0,
          resync_offset: 0,
          resync_total_clients: 0,
          resync_new_messages: 0,
          resync_mode: false,
          fill_ids_offset: 0,
          fill_ids_total_processed: 0,
          fill_ids_total_matched: 0,
          fill_ids_mode: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', progressId);
      
      // Continue with standard import logic (requestMode will be treated as 'full')
      // The code below will start from offset 0
    }
    
    // ======== FILL_SALEBOT_IDS MODE ========
    if (requestMode === 'fill_salebot_ids') {
      // Set fill mode flag
      await supabase
        .from('salebot_import_progress')
        .update({ fill_ids_mode: true })
        .eq('id', progressId);
      
      return await handleFillSalebotIds(supabase, salebotApiKey, progressId, listId);
    }
    // Базовые значения для точного пересчёта абсолютных метрик
    const baseClients = progressData?.total_clients_processed ?? 0;
    const baseMsgs = progressData?.total_messages_imported ?? 0;
    const baseImported = progressData?.total_imported ?? 0;

    // Фолбэк: если current_offset = 0, но уже обработаны клиенты, продолжим с этого места
    let currentOffset = (lock.current_offset ?? 0);
    if ((!currentOffset || currentOffset === 0) && progressData) {
      currentOffset = progressData.current_offset ?? progressData.total_clients_processed ?? 0;
    }
    const mode = listId ? `список ${listId}` : 'все клиенты';
    
    console.log(`🔒 Блокировка получена. Progress ID: ${progressId}`);
    console.log(`Автоматический импорт (${mode}): начало батча (offset: ${currentOffset})...`);

    let totalImported = 0;
    let totalClients = 0;
    let totalProcessedMessages = 0;
    let totalApiCalls = 0;
    let errors: string[] = [];
    // Reduced batch size to complete within 60s edge function timeout
    const clientBatchSize = 5;

    let salebotClients: SalebotClient[] = [];

    // Если указан list_id, получаем клиентов из списка Salebot
    if (listId) {
      // ======== INCREMENT API COUNTER FOR get_clients ========
      const apiResult = await checkAndIncrementApiUsage(supabase, 1);
      totalApiCalls++;
      if (!apiResult.allowed) {
        console.log('⚠️ API лимит достигнут при get_clients');
        await supabase
          .from('salebot_import_progress')
          .update({ is_running: false })
          .eq('id', progressId);
        return new Response(
          JSON.stringify({ skipped: true, apiLimitReached: true, apiUsage: apiResult }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const clientsUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_clients`;
      const clientsData = await fetchJsonWithRetry(
        clientsUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            list: listId,
            offset: currentOffset,
            limit: clientBatchSize,
          }),
        },
        { logPrefix: 'Salebot get_clients' }
      );

      salebotClients = clientsData.clients || [];

      if (salebotClients.length === 0) {
        const nowIso = new Date().toISOString();
        
        // If incremental/sync_new mode and completed, reset offset for next cycle
        if (requestMode === 'incremental' || requestMode === 'sync_new') {
          console.log('🔄 Incremental режим: сбрасываем offset для следующего цикла');
          await supabase
            .from('salebot_import_progress')
            .update({
              current_offset: 0,
              last_run_at: nowIso,
              updated_at: nowIso,
              is_running: false
            })
            .eq('id', progressId);
        } else {
          await supabase
            .from('salebot_import_progress')
            .update({
              current_offset: currentOffset,
              last_run_at: nowIso,
              updated_at: nowIso,
              is_running: false
            })
            .eq('id', progressId);
        }

        return new Response(
          JSON.stringify({
            success: true,
            completed: true,
            message: 'All list clients processed',
            apiCalls: totalApiCalls,
            mode: requestMode,
            offsetReset: requestMode === 'incremental' || requestMode === 'sync_new'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Загружено ${salebotClients.length} клиентов из списка ${listId} (offset: ${currentOffset})`);
    } else {
      // Получаем клиентов из нашей базы
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, phone_numbers:client_phone_numbers(phone)')
        .not('phone_numbers', 'is', null)
        .range(currentOffset, currentOffset + clientBatchSize - 1);

      if (clientsError) {
        throw clientsError;
      }

      if (!clients || clients.length === 0) {
        console.log('Все клиенты обработаны! Импорт завершен.');
        await supabase
          .from('salebot_import_progress')
          .update({ is_running: false })
          .eq('id', progressData.id);

        return new Response(
          JSON.stringify({
            success: true,
            completed: true,
            message: 'All clients processed',
            apiCalls: totalApiCalls
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Загружено ${clients.length} клиентов (offset: ${currentOffset})`);
    }

    // Обработка клиентов из списка Salebot
    if (listId && salebotClients.length > 0) {
      for (const salebotClient of salebotClients) {
        try {
          // ======== CHECK API LIMIT BEFORE EACH get_history ========
          const apiCheck = await checkAndIncrementApiUsage(supabase, 0);
          if (!apiCheck.allowed || apiCheck.remaining < 1) {
            console.log(`⚠️ API лимит достигнут. Прерываем батч на клиенте ${salebotClient.id}`);
            break;
          }

          console.log(`Обработка клиента из списка: Salebot ID ${salebotClient.id}, имя: ${salebotClient.name || 'неизвестно'}`);

          // ======== INCREMENT API COUNTER FOR get_history ========
          await checkAndIncrementApiUsage(supabase, 1);
          totalApiCalls++;

          // Получаем историю сообщений
          const historyUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_history?client_id=${salebotClient.id}&limit=2000`;
          const historyResponse = await fetch(historyUrl);

          if (!historyResponse.ok) {
            throw new Error(`Ошибка получения истории: ${historyResponse.statusText}`);
          }

          const historyData = await historyResponse.json();
          const messages: SalebotHistoryMessage[] = historyData.result || [];

          console.log(`Получено ${messages.length} сообщений`);

          if (messages.length === 0) continue;

          // Пытаемся извлечь телефон из platform_id или из сообщений
          let phoneNumber = normalizePhone(salebotClient.platform_id);
          
          if (!phoneNumber || phoneNumber.length < 10) {
            console.log(`Не удалось извлечь телефон для клиента ${salebotClient.id}`);
            continue;
          }

          console.log(`Извлечен телефон: ${phoneNumber}`);

          // ======== STEP 1: Check by salebot_client_id first (most reliable) ========
          const { data: existingBySalebotId } = await supabase
            .from('clients')
            .select('id, name')
            .eq('salebot_client_id', salebotClient.id)
            .maybeSingle();
          
          let clientId: string;
          let clientName = (salebotClient.name && salebotClient.name.trim()) 
            ? salebotClient.name.trim() 
            : `Клиент ${phoneNumber}`;
          
          if (existingBySalebotId) {
            // Client already exists with this salebot_client_id
            clientId = existingBySalebotId.id;
            console.log(`Найден существующий клиент по salebot_client_id: ${clientId}`);
            
            // Try to link with student
            await linkClientWithStudent(supabase, clientId, phoneNumber);
          } else {
            // ======== STEP 2: Try to find by phone (last 10 digits) ========
            const phoneLast10 = phoneNumber.slice(-10);
            
            const { data: existingPhones } = await supabase
              .from('client_phone_numbers')
              .select('client_id, phone, clients(id, name)')
              .or(`phone.eq.${phoneNumber},phone.ilike.%${phoneLast10}`)
              .limit(5);

            if (existingPhones && existingPhones.length > 0) {
              // Клиент существует по телефону
              clientId = existingPhones[0].client_id;
              console.log(`Найден существующий клиент по телефону: ${clientId}`);
              
              // Save salebot_client_id for future resync
              await supabase
                .from('clients')
                .update({ salebot_client_id: salebotClient.id })
                .eq('id', clientId);
              
              // Try to link with student
              await linkClientWithStudent(supabase, clientId, phoneNumber);
            } else {
              // ======== STEP 3: Create new client ========
              const { data: newClient, error: createError } = await supabase
                .from('clients')
                .insert({
                  name: clientName,
                  organization_id: organizationId,
                  is_active: true,
                  salebot_client_id: salebotClient.id
                })
                .select()
                .single();

              if (createError || !newClient) {
                console.error('Ошибка создания клиента:', createError);
                continue;
              }

              clientId = newClient.id;

              // Добавляем телефон
              await supabase
                .from('client_phone_numbers')
                .insert({
                  client_id: clientId,
                  phone: phoneNumber,
                  is_primary: true
                });

              console.log(`Создан новый клиент: ${clientId}, телефон: ${phoneNumber}`);
              
              // Try to link with student from HolyHope
              await linkClientWithStudent(supabase, clientId, phoneNumber);
            }
          }

          // Преобразуем сообщения
          const chatMessages: any[] = [];
          
          for (const msg of messages) {
            if (!msg.created_at) continue;

            let date: Date;
            if (typeof msg.created_at === 'number') {
              date = new Date(msg.created_at * 1000);
            } else {
              date = new Date(msg.created_at);
            }
            
            if (isNaN(date.getTime())) continue;
            
            chatMessages.push({
              client_id: clientId,
              organization_id: organizationId,
              message_text: msg.text || '',
              message_type: msg.client_replica ? 'client' : 'manager',
              is_outgoing: !msg.client_replica,
              is_read: true,
              created_at: date.toISOString(),
              messenger_type: 'whatsapp',
              salebot_message_id: msg.id.toString(),
            });
          }

          // Вставляем батчами
          const batchSize = 50;
          let processedMessages = 0;
          
          for (let i = 0; i < chatMessages.length; i += batchSize) {
            const batch = chatMessages.slice(i, i + batchSize);
            processedMessages += batch.length;
            
            const salebotIds = batch.map(m => m.salebot_message_id);
            const { data: existing } = await supabase
              .from('chat_messages')
              .select('salebot_message_id')
              .eq('client_id', clientId)
              .in('salebot_message_id', salebotIds);
            
            const existingIds = new Set((existing || []).map((e: any) => e.salebot_message_id));
            const newMessages = batch.filter(m => !existingIds.has(m.salebot_message_id));
            
            console.log(`Батч ${i/batchSize + 1}: всего ${batch.length} сообщений, уже существует ${existingIds.size}, новых ${newMessages.length}`);
            
            if (newMessages.length > 0) {
              const { error: insertError } = await supabase
                .from('chat_messages')
                .insert(newMessages, { onConflict: 'client_id,salebot_message_id', ignoreDuplicates: true });

              if (insertError) {
                console.error('Ошибка вставки:', insertError);
              } else {
                totalImported += newMessages.length;
                console.log(`Вставлено ${newMessages.length} новых сообщений, всего: ${totalImported}`);
              }
            } else {
              console.log('Все сообщения в батче уже импортированы (дубликаты)');
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          totalClients++;
          totalProcessedMessages += processedMessages;
          console.log(`Клиент обработан. Всего клиентов: ${totalClients}, обработано всего сообщений: ${totalProcessedMessages}, новых: ${totalImported}, API вызовов: ${totalApiCalls}`);
          
          // Промежуточный коммит каждые 5 клиентов
          if (totalClients % 5 === 0) {
            console.log(`💾 Промежуточный коммит (${totalClients} клиентов)...`);
            const nowIso = new Date().toISOString();
            const { error: updErr } = await supabase
              .from('salebot_import_progress')
              .update({
                total_clients_processed: baseClients + totalClients,
                total_messages_imported: baseMsgs + totalProcessedMessages,
                total_imported: baseImported + totalImported,
                current_offset: currentOffset + totalClients,
                last_run_at: nowIso,
                updated_at: nowIso,
                is_running: true,
              })
              .eq('id', progressId);
            if (updErr) {
              console.error('❌ Ошибка обновления прогресса:', updErr);
            }

            const { data: check } = await supabase
              .from('salebot_import_progress')
              .select('current_offset, total_clients_processed, total_messages_imported, updated_at')
              .eq('id', progressId)
              .single();
            console.log(`✅ Коммит выполнен: offset ${currentOffset + totalClients}; в БД offset=${check?.current_offset}, clients=${check?.total_clients_processed}, msgs=${check?.total_messages_imported}`);
          }

        } catch (error: any) {
          console.error(`Ошибка обработки клиента Salebot ID ${salebotClient.id}:`, error);
          errors.push(`Salebot ID ${salebotClient.id}: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 150));
      }
    } else if (!listId) {
      // Обработка клиентов из нашей базы
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, phone_numbers:client_phone_numbers(phone)')
        .not('phone_numbers', 'is', null)
        .range(currentOffset, currentOffset + clientBatchSize - 1);

      if (!clients || clients.length === 0) {
        return new Response(
          JSON.stringify({ success: true, completed: true, apiCalls: totalApiCalls }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      for (const client of clients) {
        const phoneNumbers = client.phone_numbers || [];
        
        for (const phoneRecord of phoneNumbers) {
          const phone = phoneRecord.phone;
          if (!phone) continue;

          const cleanPhone = normalizePhone(phone);
          
          try {
            // Check API limit before each client lookup
            const apiCheck = await checkAndIncrementApiUsage(supabase, 0);
            if (!apiCheck.allowed || apiCheck.remaining < 5) {
              console.log(`⚠️ API лимит достигнут. Прерываем батч.`);
              break;
            }

            console.log(`Обработка: ${client.name}, тел: ${phone} → ${cleanPhone}`);

            const phoneVariants = [
              cleanPhone,
              cleanPhone.replace(/^7/, '8'),
              `+${cleanPhone}`,
              cleanPhone.substring(1),
            ];

            let salebotClientId = null;
            let foundPhone = null;

            for (const phoneVariant of phoneVariants) {
              // Increment API counter for each lookup attempt
              await checkAndIncrementApiUsage(supabase, 1);
              totalApiCalls++;

              const clientIdUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/whatsapp_client_id?phone=${phoneVariant}&group_id=115236`;
              
              try {
                const clientIdResponse = await fetch(clientIdUrl);

                if (clientIdResponse.status === 404) continue;
                if (!clientIdResponse.ok) continue;

                const clientIdData = await clientIdResponse.json();
                if (clientIdData.client_id) {
                  salebotClientId = clientIdData.client_id;
                  foundPhone = phoneVariant;
                  break;
                }
              } catch (error) {
                continue;
              }
            }

            if (!salebotClientId) {
              console.log(`Клиент ${phone} не найден в Salebot`);
              continue;
            }

            console.log(`Получен client_id: ${salebotClientId} (формат: ${foundPhone})`);
            
            // Save salebot_client_id for future resync
            await supabase
              .from('clients')
              .update({ salebot_client_id: salebotClientId })
              .eq('id', client.id);

            // Increment for get_history
            await checkAndIncrementApiUsage(supabase, 1);
            totalApiCalls++;

            const historyUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_history?client_id=${salebotClientId}&limit=2000`;
            const historyResponse = await fetch(historyUrl);

            if (!historyResponse.ok) {
              throw new Error(`Ошибка получения истории: ${historyResponse.statusText}`);
            }

            const historyData = await historyResponse.json();
            const messages: SalebotHistoryMessage[] = historyData.result || [];
            const processedMessages = messages.length;

            console.log(`Получено ${processedMessages} сообщений`);

            if (processedMessages === 0) continue;

            const chatMessages: any[] = [];
            
            for (const msg of messages) {
              if (!msg.created_at) continue;

              let date: Date;
              if (typeof msg.created_at === 'number') {
                date = new Date(msg.created_at * 1000);
              } else {
                date = new Date(msg.created_at);
              }
              
              if (isNaN(date.getTime())) continue;
              
              chatMessages.push({
                client_id: client.id,
                organization_id: organizationId,
                message_text: msg.text || '',
                message_type: msg.client_replica ? 'client' : 'manager',
                is_outgoing: !msg.client_replica,
                is_read: true,
                created_at: date.toISOString(),
                messenger_type: 'whatsapp',
                salebot_message_id: msg.id.toString(),
              });
            }

            const batchSize = 50;
            for (let i = 0; i < chatMessages.length; i += batchSize) {
              const batch = chatMessages.slice(i, i + batchSize);
              
              const salebotIds = batch.map(m => m.salebot_message_id);
              const { data: existing } = await supabase
                .from('chat_messages')
                .select('salebot_message_id')
                .eq('client_id', client.id)
                .in('salebot_message_id', salebotIds);
              
              const existingIds = new Set((existing || []).map((e: any) => e.salebot_message_id));
              const newMessages = batch.filter(m => !existingIds.has(m.salebot_message_id));
              
              if (newMessages.length > 0) {
                const { error: insertError } = await supabase
                  .from('chat_messages')
                  .insert(newMessages, { onConflict: 'client_id,salebot_message_id', ignoreDuplicates: true });

                if (insertError) {
                  console.error('Ошибка вставки:', insertError);
                } else {
                  totalImported += newMessages.length;
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            totalClients++;
            totalProcessedMessages += processedMessages;

          } catch (error: any) {
            console.error(`Ошибка обработки ${client.name}:`, error);
            errors.push(`${client.name}: ${error.message}`);
          }

          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
    }

    // Финальный коммит батча
    const nextOffset = currentOffset + totalClients;

    // Явно фиксируем абсолютные значения и heartbeat
    const nowIso = new Date().toISOString();
    const { error: finalUpdErr } = await supabase
      .from('salebot_import_progress')
      .update({
        total_clients_processed: baseClients + totalClients,
        total_messages_imported: baseMsgs + totalProcessedMessages,
        total_imported: baseImported + totalImported,
        current_offset: nextOffset,
        last_run_at: nowIso,
        updated_at: nowIso,
        is_running: false,
      })
      .eq('id', progressId);
    if (finalUpdErr) console.error('❌ Ошибка финального обновления прогресса:', finalUpdErr);

    // Get final API usage stats
    const finalApiUsage = await checkAndIncrementApiUsage(supabase, 0);

    console.log(`✅ Батч завершен. Клиентов: ${totalClients}, сообщений: ${totalProcessedMessages}, новых: ${totalImported}, API вызовов: ${totalApiCalls}, nextOffset: ${nextOffset}`);

    const isCompleted = listId 
      ? salebotClients.length < clientBatchSize 
      : false;

    return new Response(
      JSON.stringify({
        success: true,
        totalImported,
        totalClients,
        nextOffset,
        completed: isCompleted,
        mode: listId ? 'list' : 'all_clients',
        listId: listId || null,
        apiCalls: totalApiCalls,
        apiUsage: finalApiUsage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Ошибка автоимпорта:', error);

    // Снимаем флаг is_running в случае ошибки (обязательно с фильтром)
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: lastProgress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastProgress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({
            is_running: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lastProgress.id);
      }
    } catch (e) {
      console.error('Не удалось сбросить флаг is_running:', e);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
