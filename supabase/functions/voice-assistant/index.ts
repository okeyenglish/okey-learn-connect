import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, command, userId } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userCommand = '';

    // Если передан аудио, конвертируем его в текст
    if (audio) {
      try {
        // Process base64 in chunks to prevent stack overflow
        const chunkSize = 8192;
        const chunks: Uint8Array[] = [];
        let position = 0;
        
        while (position < audio.length) {
          const chunk = audio.slice(position, position + chunkSize);
          const binaryChunk = atob(chunk);
          const bytes = new Uint8Array(binaryChunk.length);
          
          for (let i = 0; i < binaryChunk.length; i++) {
            bytes[i] = binaryChunk.charCodeAt(i);
          }
          
          chunks.push(bytes);
          position += chunkSize;
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const binaryAudio = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of chunks) {
          binaryAudio.set(chunk, offset);
          offset += chunk.length;
        }

        const formData = new FormData();
        const blob = new Blob([binaryAudio], { type: 'audio/webm' });
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'ru');

        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
          },
          body: formData,
        });

        if (!transcriptionResponse.ok) {
          const errorText = await transcriptionResponse.text();
          console.error('Transcription error:', errorText);
          throw new Error(`Failed to transcribe audio: ${transcriptionResponse.status}`);
        }

        const transcription = await transcriptionResponse.json();
        userCommand = transcription.text;
        console.log('Transcribed command:', userCommand);
      } catch (error) {
        console.error('Audio processing error:', error);
        throw new Error('Ошибка обработки аудио');
      }
    } else if (command) {
      userCommand = command;
    }

    if (!userCommand.trim()) {
      throw new Error('Команда не распознана');
    }

    // Получаем контекст пользователя
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    // Системный промпт для GPT с описанием доступных функций
    const systemPrompt = `Ты голосовой ассистент CRM системы английской школы "O'KEY ENGLISH". 
Ты помогаешь менеджерам управлять клиентами, преподавателями и задачами.

Информация о пользователе:
- Имя: ${userProfile?.first_name || 'Не указано'} ${userProfile?.last_name || ''}
- Email: ${userProfile?.email}
- Роль: ${userRole?.role}
- Филиал: ${userProfile?.branch}

Доступные команды:
1. Поиск клиентов: "найди клиента [имя]", "покажи клиента [имя]"
2. Отправка сообщений: "отправь сообщение [имя] что [текст]", "напиши [имя] что [текст]"
3. Создание задач: "создай задачу [описание]", "напомни [описание]"
4. Поиск преподавателей: "найди преподавателя [имя]", "покажи преподавателя [имя]"
5. Управление чатами: "закрепи чат [имя]", "архивируй чат [имя]", "отметь прочитанным [имя]"
6. Расписание: "покажи расписание", "расписание на сегодня"

Всегда отвечай дружелюбно и профессионально на русском языке. 
Если команда неясна, переспроси для уточнения.
Если нужно выполнить действие, используй соответствующую функцию.

Команда пользователя: "${userCommand}"`;

    // Функции для GPT в новом формате Tools API
    const functions = [
      {
        name: "search_clients",
        description: "Поиск клиентов по имени",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Поисковый запрос (имя клиента)" }
          },
          required: ["query"]
        }
      },
      {
        name: "send_message",
        description: "Отправить сообщение клиенту через WhatsApp",
        parameters: {
          type: "object",
          properties: {
            clientName: { type: "string", description: "Имя клиента" },
            message: { type: "string", description: "Текст сообщения" }
          },
          required: ["clientName", "message"]
        }
      },
      {
        name: "create_task",
        description: "Создать новую задачу",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Заголовок задачи" },
            description: { type: "string", description: "Описание задачи" }
          },
          required: ["title"]
        }
      },
      {
        name: "search_teachers",
        description: "Поиск преподавателей",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Поисковый запрос" }
          },
          required: ["query"]
        }
      },
      {
        name: "manage_chat",
        description: "Управление чатом (закрепление, архивирование, отметка прочитанным)",
        parameters: {
          type: "object",
          properties: {
            clientName: { type: "string", description: "Имя клиента" },
            action: { type: "string", enum: ["pin", "archive", "mark_read"], description: "Действие" }
          },
          required: ["clientName", "action"]
        }
      },
      {
        name: "get_schedule",
        description: "Получить расписание занятий",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Дата в формате YYYY-MM-DD (опционально)" }
          }
        }
      }
    ];

    // Вызов GPT для обработки команды
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userCommand }
        ],
        tools: functions.map(func => ({
          type: 'function',
          function: func
        })),
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 300
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('GPT API error:', errorText);
      throw new Error('Failed to get GPT response');
    }

    const gptData = await gptResponse.json();
    const message = gptData.choices[0].message;
    console.log('GPT Response:', message);

    let responseText = message.content || 'Готов выполнить команду.';
    let actionResult = null;

    // Если GPT вызвал функцию, выполняем её
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      console.log('Function call:', functionName, functionArgs);

      try {
        switch (functionName) {
          case 'search_clients':
            const { data: clients } = await supabase
              .from('clients')
              .select('id, name, phone')
              .ilike('name', `%${functionArgs.query}%`)
              .limit(5);
            
            if (clients && clients.length > 0) {
              const clientsList = clients.map(c => c.name).join(', ');
              responseText = `Найдены клиенты: ${clientsList}`;
              actionResult = { type: 'clients', data: clients };
            } else {
              responseText = `Клиенты с именем "${functionArgs.query}" не найдены.`;
            }
            break;

          case 'send_message':
            // Поиск клиента
            const { data: client } = await supabase
              .from('clients')
              .select('*')
              .ilike('name', `%${functionArgs.clientName}%`)
              .single();

            if (client && client.phone) {
              // Отправка сообщения через WhatsApp с правильными параметрами
              const { error } = await supabase.functions.invoke('whatsapp-send', {
                body: {
                  phone: client.phone,
                  message: functionArgs.message
                }
              });

              if (error) {
                console.error('WhatsApp send error:', error);
                responseText = `Ошибка при отправке сообщения клиенту ${client.name}.`;
              } else {
                responseText = `Сообщение "${functionArgs.message}" отправлено клиенту ${client.name}.`;
                actionResult = { type: 'message_sent', clientName: client.name };
              }
            } else {
              responseText = `Клиент "${functionArgs.clientName}" не найден или у него нет номера телефона.`;
            }
            break;

          case 'create_task':
            const { error: taskError } = await supabase
              .from('tasks')
              .insert({
                user_id: userId,
                title: functionArgs.title,
                description: functionArgs.description || '',
                status: 'pending',
                priority: 'medium'
              });

            if (taskError) {
              responseText = 'Ошибка при создании задачи.';
            } else {
              responseText = `Задача "${functionArgs.title}" создана.`;
              actionResult = { type: 'task_created', title: functionArgs.title };
            }
            break;

          case 'search_teachers':
            const { data: teachers } = await supabase
              .from('clients')
              .select('id, name, phone')
              .like('id', 'teacher_%')
              .ilike('name', `%${functionArgs.query}%`)
              .limit(5);
            
            if (teachers && teachers.length > 0) {
              const teachersList = teachers.map(t => t.name).join(', ');
              responseText = `Найдены преподаватели: ${teachersList}`;
              actionResult = { type: 'teachers', data: teachers };
            } else {
              responseText = `Преподаватели с именем "${functionArgs.query}" не найдены.`;
            }
            break;

          case 'manage_chat':
            // Поиск клиента для управления чатом
            const { data: chatClient } = await supabase
              .from('clients')
              .select('*')
              .ilike('name', `%${functionArgs.clientName}%`)
              .single();

            if (chatClient) {
              const chatAction = functionArgs.action;
              const updateData: any = {};
              
              if (chatAction === 'pin') updateData.is_pinned = true;
              else if (chatAction === 'archive') updateData.is_archived = true;
              
              const { error: chatError } = await supabase
                .from('chat_states')
                .upsert({
                  user_id: userId,
                  chat_id: chatClient.id,
                  ...updateData
                });

              if (chatAction === 'mark_read') {
                await supabase
                  .from('chat_messages')
                  .update({ is_read: true })
                  .eq('client_id', chatClient.id);
              }

              if (chatError) {
                responseText = `Ошибка при управлении чатом с ${chatClient.name}.`;
              } else {
                const actionText = chatAction === 'pin' ? 'закреплён' : 
                                 chatAction === 'archive' ? 'архивирован' : 
                                 'отмечен как прочитанный';
                responseText = `Чат с ${chatClient.name} ${actionText}.`;
                actionResult = { type: 'chat_managed', clientName: chatClient.name, action: chatAction };
              }
            } else {
              responseText = `Клиент "${functionArgs.clientName}" не найден.`;
            }
            break;

          case 'get_schedule':
            const { data: schedule } = await supabase
              .rpc('get_public_schedule')
              .limit(10);
            
            if (schedule && schedule.length > 0) {
              const scheduleText = schedule.slice(0, 3).map(s => 
                `${s.name} - ${s.compact_days} ${s.compact_time}`
              ).join(', ');
              responseText = `Ближайшие занятия: ${scheduleText}`;
              actionResult = { type: 'schedule', data: schedule };
            } else {
              responseText = 'Расписание не найдено.';
            }
            break;

          default:
            responseText = 'Функция не реализована.';
        }
      } catch (error) {
        console.error('Function execution error:', error);
        responseText = 'Произошла ошибка при выполнении команды.';
      }
    }

    // Генерация голосового ответа
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: responseText,
        voice: 'nova',
        response_format: 'mp3',
      }),
    });

    if (!ttsResponse.ok) {
      console.error('TTS error:', await ttsResponse.text());
      // Продолжаем без голосового ответа
    }

    let base64Audio = null;
    if (ttsResponse.ok) {
      const audioBuffer = await ttsResponse.arrayBuffer();
      const uint8Array = new Uint8Array(audioBuffer);
      
      // Convert to base64 in chunks to prevent stack overflow
      const chunkSize = 8192;
      let base64String = '';
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        const chunkString = String.fromCharCode.apply(null, Array.from(chunk));
        base64String += btoa(chunkString);
      }
      
      base64Audio = base64String;
    }

    return new Response(JSON.stringify({
      success: true,
      transcription: userCommand,
      response: responseText,
      audioResponse: base64Audio,
      actionResult: actionResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Voice assistant error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});