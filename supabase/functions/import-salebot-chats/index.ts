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

    // Получаем параметры из запроса
    const { offset = 0 } = await req.json().catch(() => ({ offset: 0 }));
    
    console.log(`Начинаем импорт чатов из Salebot (offset: ${offset})...`);

    // Получаем organization_id (берем первую организацию)
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    const organizationId = orgs?.[0]?.id;

    if (!organizationId) {
      throw new Error('Не найдена организация');
    }

    let totalImported = 0;
    let totalClients = 0;
    let errors: string[] = [];
    const clientBatchSize = 5; // Обрабатываем только 5 клиентов за раз
    
    // Получаем клиентов батчами с retry при таймауте
    let clients: any[] = [];
    let retries = 3;
    
    while (retries > 0) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, phone_numbers:client_phone_numbers(phone)')
          .not('phone_numbers', 'is', null)
          .range(offset, offset + clientBatchSize - 1);

        if (error) throw error;
        
        clients = data || [];
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0 || !error.message?.includes('timeout')) {
          throw new Error(`Ошибка загрузки клиентов: ${error.message}`);
        }
        console.log(`Retry загрузки клиентов (осталось: ${retries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (clients.length === 0) {
      console.log('Все клиенты обработаны');
      return new Response(
        JSON.stringify({
          success: true,
          completed: true,
          totalImported: 0,
          totalClients: 0,
          nextOffset: offset,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Загружено ${clients.length} клиентов (offset: ${offset})`);

    for (const client of clients || []) {
      const phoneNumbers = client.phone_numbers || [];
      
      for (const phoneRecord of phoneNumbers) {
        const phone = phoneRecord.phone;
        if (!phone) continue;

        // Нормализуем телефон к формату 79161234567
        let normalized = phone.replace(/\D/g, ''); // Убираем все кроме цифр
        
        // Если номер начинается с 8, заменяем на 7
        if (normalized.match(/^8\d{10}$/)) {
          normalized = '7' + normalized.substring(1);
        }
        
        // Если номер 10 цифр, добавляем 7
        if (normalized.length === 10) {
          normalized = '7' + normalized;
        }
        
        const cleanPhone = normalized;
        
        try {
          console.log(`Обработка клиента: ${client.name}, телефон: ${phone} → нормализован: ${cleanPhone}`);

          // Шаг 1: Получаем client_id из Salebot по номеру телефона
          // Пробуем разные форматы для Salebot API
          const phoneVariants = [
            cleanPhone,                                    // 79161234567
            cleanPhone.replace(/^7/, '8'),                // 89161234567
            `+${cleanPhone}`,                             // +79161234567
            cleanPhone.substring(1),                       // 9161234567
          ];

          let salebotClientId = null;
          let foundPhone = null;

          for (const phoneVariant of phoneVariants) {
            const clientIdUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/whatsapp_client_id?phone=${phoneVariant}&group_id=115236`;
            
            try {
              const clientIdResponse = await fetch(clientIdUrl);

              if (clientIdResponse.status === 404) {
                continue; // Пробуем следующий вариант
              }

              if (!clientIdResponse.ok) {
                console.warn(`Ошибка для ${phoneVariant}: ${clientIdResponse.statusText}`);
                continue;
              }

              const clientIdData = await clientIdResponse.json();
              if (clientIdData.client_id) {
                salebotClientId = clientIdData.client_id;
                foundPhone = phoneVariant;
                break;
              }
            } catch (error) {
              console.warn(`Ошибка запроса для ${phoneVariant}:`, error);
              continue;
            }
          }

          if (!salebotClientId) {
            console.log(`Клиент с телефоном ${phone} не найден в Salebot (пробовали: ${phoneVariants.join(', ')})`);
            continue;
          }

          console.log(`Получен client_id: ${salebotClientId} для ${phone} (формат: ${foundPhone})`);

          // Шаг 2: Получаем историю сообщений
          const historyUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_history?client_id=${salebotClientId}&limit=2000`;
          const historyResponse = await fetch(historyUrl);

          if (!historyResponse.ok) {
            throw new Error(`Ошибка получения истории: ${historyResponse.statusText}`);
          }

          const historyData = await historyResponse.json();
          const messages: SalebotHistoryMessage[] = historyData.result || [];

          console.log(`Получено ${messages.length} сообщений для клиента ${client.name}`);

          if (messages.length === 0) {
            continue;
          }

          // Шаг 3: Преобразуем и сохраняем сообщения
          const chatMessages: any[] = [];
          
          for (const msg of messages) {
            // Пропускаем сообщения без timestamp
            if (!msg.created_at) {
              console.warn(`Пропущено сообщение ${msg.id} - нет timestamp`);
              continue;
            }

            // Парсим дату - может быть строкой или числом (unix timestamp)
            let date: Date;
            if (typeof msg.created_at === 'number') {
              // Unix timestamp в секундах
              date = new Date(msg.created_at * 1000);
            } else {
              // Строка с датой
              date = new Date(msg.created_at);
            }
            
            // Проверяем валидность даты
            if (isNaN(date.getTime())) {
              console.warn(`Пропущено сообщение ${msg.id} - невалидная дата (timestamp: ${msg.created_at})`);
              continue;
            }
            
            chatMessages.push({
              client_id: client.id,
              organization_id: organizationId,
              message_text: msg.text || '',
              message_type: msg.client_replica ? 'client' : 'manager',
              is_outgoing: !msg.client_replica,
              is_read: true,
              created_at: date.toISOString(),
              messenger_type: 'whatsapp',
              salebot_message_id: msg.id.toString(), // Сохраняем ID из Salebot
            });
          }

          console.log(`Валидных сообщений для ${client.name}: ${chatMessages.length} из ${messages.length}`);

          // Вставляем сообщения батчами по 10 (уменьшено для снижения нагрузки)
          const batchSize = 10;
          for (let i = 0; i < chatMessages.length; i += batchSize) {
            const batch = chatMessages.slice(i, i + batchSize);
            
            // Проверяем какие сообщения уже существуют с retry при таймауте
            let existing: any[] = [];
            let retries = 3;
            while (retries > 0) {
              try {
                const salebotIds = batch.map(m => m.salebot_message_id);
                const { data, error } = await supabase
                  .from('chat_messages')
                  .select('salebot_message_id')
                  .eq('client_id', client.id)
                  .in('salebot_message_id', salebotIds);
                
                if (error) throw error;
                existing = data || [];
                break;
              } catch (error: any) {
                retries--;
                if (retries === 0 || !error.message?.includes('timeout')) {
                  console.error(`Ошибка проверки существующих сообщений:`, error);
                  break;
                }
                console.log(`Retry проверки существующих (осталось: ${retries})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            const existingIds = new Set(existing.map(e => e.salebot_message_id));
            
            // Фильтруем только новые сообщения
            const newMessages = batch.filter(m => !existingIds.has(m.salebot_message_id));
            
            if (newMessages.length > 0) {
              // Вставка с retry при таймауте
              let insertRetries = 3;
              while (insertRetries > 0) {
                try {
                  const { error: insertError } = await supabase
                    .from('chat_messages')
                    .insert(newMessages);

                  if (insertError) throw insertError;
                  
                  totalImported += newMessages.length;
                  console.log(`Вставлено ${newMessages.length} новых сообщений (пропущено ${batch.length - newMessages.length} дубликатов)`);
                  break;
                } catch (error: any) {
                  insertRetries--;
                  if (insertRetries === 0 || !error.message?.includes('timeout')) {
                    console.error(`Ошибка вставки сообщений для ${client.name}:`, error);
                    errors.push(`${client.name} (${phone}): ${error.message}`);
                    break;
                  }
                  console.log(`Retry вставки (осталось: ${insertRetries})`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            } else {
              console.log(`Все ${batch.length} сообщений уже существуют, пропускаем`);
            }
            
            // Задержка между батчами для снижения нагрузки
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          totalClients++;
          console.log(`Импортировано ${chatMessages.length} сообщений для ${client.name}`);

        } catch (error) {
          console.error(`Ошибка обработки клиента ${client.name} (${phone}):`, error);
          errors.push(`${client.name} (${phone}): ${error.message}`);
        }

        // Задержка между клиентами для снижения нагрузки
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log(`Батч завершен. Импортировано: ${totalImported} сообщений от ${totalClients} клиентов`);

    const nextOffset = offset + clientBatchSize;
    const hasMore = clients.length === clientBatchSize;

    return new Response(
      JSON.stringify({
        success: true,
        completed: !hasMore,
        totalImported,
        totalClients,
        nextOffset,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Ошибка импорта чатов:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
