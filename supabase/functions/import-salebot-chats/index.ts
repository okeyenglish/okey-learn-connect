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

    console.log('Начинаем импорт чатов из Salebot...');

    // Получаем всех клиентов с номерами телефонов
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, phone_numbers:client_phone_numbers(phone)')
      .not('phone_numbers', 'is', null);

    if (clientsError) {
      throw new Error(`Ошибка загрузки клиентов: ${clientsError.message}`);
    }

    console.log(`Найдено ${clients?.length || 0} клиентов`);

    let totalImported = 0;
    let totalClients = 0;
    let errors: string[] = [];

    // Получаем organization_id (берем первую организацию)
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    const organizationId = orgs?.[0]?.id;

    if (!organizationId) {
      throw new Error('Не найдена организация');
    }

    for (const client of clients || []) {
      const phoneNumbers = client.phone_numbers || [];
      
      for (const phoneRecord of phoneNumbers) {
        const phone = phoneRecord.phone;
        if (!phone) continue;

        // Убираем все символы кроме цифр
        const cleanPhone = phone.replace(/\D/g, '');
        
        try {
          console.log(`Обработка клиента: ${client.name}, телефон: ${phone}`);

          // Шаг 1: Получаем client_id из Salebot по номеру телефона
          const clientIdUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/whatsapp_client_id?phone=${cleanPhone}&group_id=115236`;
          const clientIdResponse = await fetch(clientIdUrl);

          if (clientIdResponse.status === 404) {
            console.log(`Клиент с телефоном ${phone} не найден в Salebot`);
            continue;
          }

          if (!clientIdResponse.ok) {
            throw new Error(`Ошибка получения client_id: ${clientIdResponse.statusText}`);
          }

          const clientIdData = await clientIdResponse.json();
          const salebotClientId = clientIdData.client_id;

          if (!salebotClientId) {
            console.log(`client_id не получен для телефона ${phone}`);
            continue;
          }

          console.log(`Получен client_id: ${salebotClientId} для ${phone}`);

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
              message_type: 'text',
              is_outgoing: !msg.client_replica,
              is_read: true,
              created_at: date.toISOString(),
              messenger_type: 'whatsapp',
              salebot_message_id: msg.id.toString(), // Сохраняем ID из Salebot
            });
          }

          console.log(`Валидных сообщений для ${client.name}: ${chatMessages.length} из ${messages.length}`);

          // Вставляем сообщения батчами по 100
          const batchSize = 100;
          for (let i = 0; i < chatMessages.length; i += batchSize) {
            const batch = chatMessages.slice(i, i + batchSize);
            
            // Проверяем какие сообщения уже существуют
            const salebotIds = batch.map(m => m.salebot_message_id);
            const { data: existing } = await supabase
              .from('chat_messages')
              .select('salebot_message_id')
              .eq('client_id', client.id)
              .in('salebot_message_id', salebotIds);
            
            const existingIds = new Set(existing?.map(e => e.salebot_message_id) || []);
            
            // Фильтруем только новые сообщения
            const newMessages = batch.filter(m => !existingIds.has(m.salebot_message_id));
            
            if (newMessages.length > 0) {
              const { error: insertError } = await supabase
                .from('chat_messages')
                .insert(newMessages);

              if (insertError) {
                console.error(`Ошибка вставки сообщений для ${client.name}:`, insertError);
                errors.push(`${client.name} (${phone}): ${insertError.message}`);
              } else {
                totalImported += newMessages.length;
                console.log(`Вставлено ${newMessages.length} новых сообщений (пропущено ${batch.length - newMessages.length} дубликатов)`);
              }
            } else {
              console.log(`Все ${batch.length} сообщений уже существуют, пропускаем`);
            }
          }

          totalClients++;
          console.log(`Импортировано ${chatMessages.length} сообщений для ${client.name}`);

        } catch (error) {
          console.error(`Ошибка обработки клиента ${client.name} (${phone}):`, error);
          errors.push(`${client.name} (${phone}): ${error.message}`);
        }

        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Импорт завершен. Всего импортировано: ${totalImported} сообщений от ${totalClients} клиентов`);

    return new Response(
      JSON.stringify({
        success: true,
        totalImported,
        totalClients,
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
