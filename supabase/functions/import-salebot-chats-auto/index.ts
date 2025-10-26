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

    // Получаем прогресс импорта
    const { data: progressData, error: progressError } = await supabase
      .from('salebot_import_progress')
      .select('*')
      .limit(1)
      .single();

    if (progressError || !progressData) {
      console.error('Ошибка получения прогресса:', progressError);
      return new Response(
        JSON.stringify({ error: 'Не удалось получить прогресс импорта' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const listId = progressData.list_id;
    const lastRunAt = progressData.last_run_at ? new Date(progressData.last_run_at) : null;
    const now = new Date();

    // Проверка таймаута: если импорт запущен более 15 минут, сбрасываем флаг
    if (progressData.is_running && lastRunAt) {
      const minutesElapsed = (now.getTime() - lastRunAt.getTime()) / (1000 * 60);
      if (minutesElapsed > 15) {
        console.log(`⚠️ Импорт застрял более 15 минут (${Math.round(minutesElapsed)} мин), сбрасываем флаг is_running...`);
        await supabase
          .from('salebot_import_progress')
          .update({ is_running: false, updated_at: now.toISOString() })
          .eq('id', progressData.id);
      } else {
        console.log(`Импорт уже выполняется (${Math.round(minutesElapsed)} мин), пропускаем...`);
        return new Response(
          JSON.stringify({ message: 'Import already running', skipped: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (progressData.is_running) {
      console.log('Импорт уже выполняется, пропускаем...');
      return new Response(
        JSON.stringify({ message: 'Import already running', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentOffset = progressData.current_offset;
    const mode = listId ? `список ${listId}` : 'все клиенты';
    console.log(`Автоматический импорт (${mode}): начало батча (offset: ${currentOffset})...`);

    // Помечаем, что импорт запущен
    await supabase
      .from('salebot_import_progress')
      .update({ is_running: true, last_run_at: new Date().toISOString() })
      .eq('id', progressData.id);

    // Получаем organization_id
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    const organizationId = orgs?.[0]?.id;

    if (!organizationId) {
      throw new Error('Не найдена организация');
    }

    let totalImported = 0;
    let totalClients = 0;
    let totalProcessedMessages = 0;
    let errors: string[] = progressData.errors || [];
    const clientBatchSize = 20;
    
    // Устанавливаем start_time в начале
    await supabase
      .from('salebot_import_progress')
      .update({ 
        start_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', progressData.id);

    let salebotClients: SalebotClient[] = [];

    // Если указан list_id, получаем клиентов из списка Salebot
    if (listId) {
      const clientsUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_clients`;
      const clientsResponse = await fetch(clientsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list: listId,
          offset: currentOffset,
          limit: clientBatchSize
        })
      });

      if (!clientsResponse.ok) {
        throw new Error(`Ошибка получения клиентов из списка: ${clientsResponse.statusText}`);
      }

      const clientsData = await clientsResponse.json();
      salebotClients = clientsData.clients || [];

      if (salebotClients.length === 0) {
        console.log(`Все клиенты из списка ${listId} обработаны!`);
        await supabase
          .from('salebot_import_progress')
          .update({ is_running: false })
          .eq('id', progressData.id);

        return new Response(
          JSON.stringify({
            success: true,
            completed: true,
            message: 'All list clients processed'
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
            message: 'All clients processed'
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
          console.log(`Обработка клиента из списка: Salebot ID ${salebotClient.id}, имя: ${salebotClient.name || 'неизвестно'}`);

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
          let phoneNumber = salebotClient.platform_id?.replace(/\D/g, '');
          
          if (!phoneNumber || phoneNumber.length < 10) {
            console.log(`Не удалось извлечь телефон для клиента ${salebotClient.id}`);
            continue;
          }

          // Нормализуем телефон
          if (phoneNumber.match(/^8\d{10}$/)) {
            phoneNumber = '7' + phoneNumber.substring(1);
          }
          if (phoneNumber.length === 10) {
            phoneNumber = '7' + phoneNumber;
          }

          console.log(`Извлечен телефон: ${phoneNumber}`);

          // Ищем клиента в нашей базе по телефону
          const { data: existingPhones } = await supabase
            .from('client_phone_numbers')
            .select('client_id, clients(id, name)')
            .eq('phone', phoneNumber);

          let clientId: string;
          // Берем имя из Salebot, если оно есть и не пустое
          let clientName = (salebotClient.name && salebotClient.name.trim()) 
            ? salebotClient.name.trim() 
            : `Клиент ${phoneNumber}`;

          if (existingPhones && existingPhones.length > 0) {
            // Клиент существует
            clientId = existingPhones[0].client_id;
            console.log(`Найден существующий клиент: ${clientId}`);
          } else {
            // Создаем нового клиента
            const { data: newClient, error: createError } = await supabase
              .from('clients')
              .insert({
                name: clientName,
                organization_id: organizationId,
                is_active: true
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
            
            const existingIds = new Set((existing || []).map(e => e.salebot_message_id));
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
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          totalClients++;
          totalProcessedMessages += processedMessages;
          console.log(`Клиент обработан. Всего клиентов: ${totalClients}, обработано всего сообщений: ${totalProcessedMessages}, новых: ${totalImported}`);
          
          // Обновляем прогресс после каждого клиента
          const { error: updateError } = await supabase
            .from('salebot_import_progress')
            .update({ 
              total_messages_imported: progressData.total_messages_imported + totalProcessedMessages,
              total_clients_processed: progressData.total_clients_processed + totalClients,
              total_imported: progressData.total_imported + totalImported,
              updated_at: new Date().toISOString()
            })
            .eq('id', progressData.id);
          
          if (updateError) {
            console.error('Ошибка обновления прогресса:', updateError);
          } else {
            console.log(`Прогресс обновлен: клиентов ${progressData.total_clients_processed + totalClients}, обработано сообщений ${progressData.total_messages_imported + totalProcessedMessages}, новых ${progressData.total_imported + totalImported}`);
          }

        } catch (error: any) {
          console.error(`Ошибка обработки клиента Salebot ID ${salebotClient.id}:`, error);
          errors.push(`Salebot ID ${salebotClient.id}: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
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
          JSON.stringify({ success: true, completed: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      for (const client of clients) {
        const phoneNumbers = client.phone_numbers || [];
        
        for (const phoneRecord of phoneNumbers) {
          const phone = phoneRecord.phone;
          if (!phone) continue;

          let normalized = phone.replace(/\D/g, '');
          
          if (normalized.match(/^8\d{10}$/)) {
            normalized = '7' + normalized.substring(1);
          }
          
          if (normalized.length === 10) {
            normalized = '7' + normalized;
          }
          
          const cleanPhone = normalized;
          
          try {
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
              
              const existingIds = new Set((existing || []).map(e => e.salebot_message_id));
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
              
              await new Promise(resolve => setTimeout(resolve, 200));
            }

            totalClients++;
            totalProcessedMessages += processedMessages;

          } catch (error: any) {
            console.error(`Ошибка обработки ${client.name}:`, error);
            errors.push(`${client.name}: ${error.message}`);
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // Обновляем прогресс
    const nextOffset = currentOffset + clientBatchSize;
    await supabase
      .from('salebot_import_progress')
      .update({
        current_offset: nextOffset,
        total_imported: progressData.total_imported + totalImported,
        total_clients_processed: progressData.total_clients_processed + totalClients,
        total_messages_imported: (progressData.total_messages_imported || 0) + totalProcessedMessages,
        is_running: false,
        errors: errors.slice(-100), // Храним последние 100 ошибок
        updated_at: new Date().toISOString()
      })
      .eq('id', progressData.id);

    console.log(`✅ Батч завершен. Обработано сообщений: ${totalProcessedMessages}, импортировано новых: ${totalImported}, клиентов: ${totalClients}`);

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
        listId: listId || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Ошибка автоимпорта:', error);
    
    // Снимаем флаг is_running в случае ошибки
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      await supabase
        .from('salebot_import_progress')
        .update({ is_running: false })
        .limit(1);
    } catch (e) {
      console.error('Не удалось сбросить флаг is_running:', e);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
