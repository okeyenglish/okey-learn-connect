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

    // Если импорт уже запущен, пропускаем
    if (progressData.is_running) {
      console.log('Импорт уже выполняется, пропускаем...');
      return new Response(
        JSON.stringify({ message: 'Import already running', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentOffset = progressData.current_offset;
    console.log(`Автоматический импорт: начало батча (offset: ${currentOffset})...`);

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
    let errors: string[] = progressData.errors || [];
    const clientBatchSize = 5;

    // Получаем клиентов
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

    for (const client of clients) {
      const phoneNumbers = client.phone_numbers || [];
      
      for (const phoneRecord of phoneNumbers) {
        const phone = phoneRecord.phone;
        if (!phone) continue;

        // Нормализуем телефон к формату 79161234567
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

          // Пробуем разные форматы для Salebot API
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

          // Получаем историю сообщений
          const historyUrl = `https://chatter.salebot.pro/api/${salebotApiKey}/get_history?client_id=${salebotClientId}&limit=2000`;
          const historyResponse = await fetch(historyUrl);

          if (!historyResponse.ok) {
            throw new Error(`Ошибка получения истории: ${historyResponse.statusText}`);
          }

          const historyData = await historyResponse.json();
          const messages: SalebotHistoryMessage[] = historyData.result || [];

          console.log(`Получено ${messages.length} сообщений`);

          if (messages.length === 0) continue;

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

          // Вставляем батчами
          const batchSize = 10;
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
                .insert(newMessages);

              if (insertError) {
                console.error('Ошибка вставки:', insertError);
              } else {
                totalImported += newMessages.length;
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          totalClients++;

        } catch (error: any) {
          console.error(`Ошибка обработки ${client.name}:`, error);
          errors.push(`${client.name}: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log(`Батч завершен. Импортировано: ${totalImported}, клиентов: ${totalClients}`);

    // Обновляем прогресс
    const nextOffset = currentOffset + clientBatchSize;
    await supabase
      .from('salebot_import_progress')
      .update({
        current_offset: nextOffset,
        total_imported: progressData.total_imported + totalImported,
        total_clients_processed: progressData.total_clients_processed + totalClients,
        is_running: false,
        errors: errors.slice(-100), // Храним последние 100 ошибок
        updated_at: new Date().toISOString()
      })
      .eq('id', progressData.id);

    return new Response(
      JSON.stringify({
        success: true,
        totalImported,
        totalClients,
        nextOffset,
        completed: clients.length < clientBatchSize,
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
