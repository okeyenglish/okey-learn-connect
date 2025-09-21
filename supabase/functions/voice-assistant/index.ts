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
    const { audio, command, userId, context } = await req.json();
    
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
        console.log('Processing audio, base64 length:', audio.length);
        
        // Process base64 directly without chunking for now to isolate the issue
        let binaryAudio: Uint8Array;
        
        try {
          const binaryString = atob(audio);
          binaryAudio = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            binaryAudio[i] = binaryString.charCodeAt(i);
          }
          console.log('Audio converted successfully, size:', binaryAudio.length);
        } catch (decodeError) {
          console.error('Base64 decode error:', decodeError);
          throw new Error('Неверный формат аудио данных');
        }

        const formData = new FormData();
        const blob = new Blob([binaryAudio], { type: 'audio/webm' });
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'ru');

        console.log('Sending to OpenAI Whisper API...');
        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
          },
          body: formData,
        });

        console.log('Whisper response status:', transcriptionResponse.status);
        
        if (!transcriptionResponse.ok) {
          const errorText = await transcriptionResponse.text();
          console.error('Transcription error response:', errorText);
          throw new Error(`Ошибка транскрипции: ${transcriptionResponse.status}`);
        }

        const transcription = await transcriptionResponse.json();
        userCommand = transcription.text;
        console.log('Transcribed command:', userCommand);
        
        if (!userCommand || userCommand.trim().length === 0) {
          throw new Error('Пустая команда после транскрипции');
        }
      } catch (error) {
        console.error('Audio processing error details:', error);
        if (error.message.includes('транскрипции') || error.message.includes('формат')) {
          throw error;
        }
        throw new Error('Ошибка обработки аудио: ' + error.message);
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
    let contextInfo = '';
    if (context) {
      contextInfo = `\nКонтекст текущего сеанса:
- Текущая страница: ${context.currentPage}
- Активный клиент: ${context.activeClientName || 'не выбран'}
- Тип активного чата: ${context.activeChatType || 'нет'}
- ID активного клиента: ${context.activeClientId || 'нет'}`;
    }

    const systemPrompt = `Ты голосовой ассистент CRM системы английской школы "O'KEY ENGLISH". 
Ты помогаешь менеджерам управлять клиентами, преподавателями и задачами.

Информация о пользователе:
- Имя: ${userProfile?.first_name || 'Не указано'} ${userProfile?.last_name || ''}
- Email: ${userProfile?.email}
- Роль: ${userRole?.role}
- Филиал: ${userProfile?.branch}${contextInfo}

ПРИОРИТЕТЫ ФУНКЦИЙ:
1. "поставь задачу", "создай задачу", "напомни" = create_task (НЕ search_clients!)
2. "найди клиента", "покажи клиента" = search_clients  
3. "отправь сообщение", "напиши" = send_message

ПРИМЕРЫ ПАРСИНГА КОМАНД:
✅ "Поставь задачу на завтра на клиента Даниила написать ему сообщение"
   → create_task: {title: "написать сообщение", clientName: "Даниил", dueDate: "2025-09-22"}

✅ "Создай задачу позвонить Марии в понедельник в 15:00"  
   → create_task: {title: "позвонить", clientName: "Мария", dueDate: "2025-09-23", dueTime: "15:00"}

✅ "Напомни завтра в 12 часов проверить оплату у Петрова"
   → create_task: {title: "проверить оплату", clientName: "Петров", dueDate: "2025-09-22", dueTime: "12:00"}

❌ НЕ ДЕЛАЙ: "поставь задачу на клиента Иван" → search_clients (НЕПРАВИЛЬНО!)

ПАРСИНГ ДАТА/ВРЕМЯ:
- "завтра" = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- "послезавтра" = ${new Date(Date.now() + 172800000).toISOString().split('T')[0]} 
- "в понедельник" = дата ближайшего понедельника
- "в 12 часов", "на 12:00", "в полдень" = "12:00"
- "в 9 утра" = "09:00", "в 3 дня" = "15:00"

Доступные функции:
- create_task: создание задач (основная для команд "поставь задачу")
- search_clients: только для поиска клиентов
- send_message: отправка сообщений
- get_tasks: просмотр задач
- search_teachers: поиск преподавателей

ВАЖНО: Если команда содержит "поставь задачу" или "создай задачу" - ВСЕГДА используй create_task, даже если упоминается клиент!

Всегда отвечай дружелюбно и профессионально на русском языке.

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
            description: { type: "string", description: "Описание задачи" },
            clientName: { type: "string", description: "Имя клиента (опционально)" },
            priority: { type: "string", enum: ["low", "medium", "high"], description: "Приоритет задачи" },
            dueDate: { type: "string", description: "Срок выполнения в формате YYYY-MM-DD (опционально)" },
            dueTime: { type: "string", description: "Время выполнения в формате HH:MM (опционально)" }
          },
          required: ["title"]
        }
      },
      {
        name: "get_tasks",
        description: "Получить список задач",
        parameters: {
          type: "object",
          properties: {
            filter: { 
              type: "string", 
              enum: ["today", "overdue", "pending", "completed", "all"], 
              description: "Фильтр задач" 
            },
            clientName: { type: "string", description: "Имя клиента для фильтрации (опционально)" }
          },
          required: ["filter"]
        }
      },
      {
        name: "update_task",
        description: "Обновить статус задачи",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "ID задачи" },
            status: { type: "string", enum: ["pending", "completed", "cancelled"], description: "Новый статус" },
            title: { type: "string", description: "Новый заголовок (опционально)" }
          },
          required: ["taskId", "status"]
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
        description: "Управление чатом (закрепление, архивирование, отметка прочитанным, открыть чат)",
        parameters: {
          type: "object",
          properties: {
            clientName: { type: "string", description: "Имя клиента" },
            action: { type: "string", enum: ["pin", "archive", "mark_read", "open"], description: "Действие" }
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
            date: { type: "string", description: "Дата в формате YYYY-MM-DD (опционalno)" },
            branch: { type: "string", description: "Филиал для фильтрации (опционально)" }
          }
        }
      },
      {
        name: "get_client_info",
        description: "Получить подробную информацию о клиенте",
        parameters: {
          type: "object",
          properties: {
            clientName: { type: "string", description: "Имя клиента" }
          },
          required: ["clientName"]
        }
      },
      {
        name: "open_modal",
        description: "Открыть модальное окно в CRM",
        parameters: {
          type: "object",
          properties: {
            modalType: { 
              type: "string", 
              enum: ["add_client", "add_teacher", "add_student", "add_task", "profile", "student_profile"],
              description: "Тип модального окна" 
            },
            clientId: { type: "string", description: "ID клиента (для профиля)" }
          },
          required: ["modalType"]
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
              .select('id, name, phone, email, branch, notes, last_message_at')
              .ilike('name', `%${functionArgs.query}%`)
              .order('last_message_at', { ascending: false })
              .limit(10);
            
            if (clients && clients.length > 0) {
              const clientsList = clients.map(c => `${c.name} (${c.branch})`).join(', ');
              responseText = `Найдены клиенты: ${clientsList}`;
              actionResult = { type: 'clients', data: clients };
            } else {
              responseText = `Клиенты с именем "${functionArgs.query}" не найдены.`;
            }
            break;

          case 'send_message':
            // Поиск клиента - используем активного, если не указан в команде
            let targetClientName = functionArgs.clientName;
            if (!targetClientName && context?.activeClientName) {
              targetClientName = context.activeClientName;
              console.log('Using active client from context:', targetClientName);
            }

            if (!targetClientName) {
              responseText = 'Не указан клиент для отправки сообщения.';
              break;
            }

            const { data: client } = await supabase
              .from('clients')
              .select('*')
              .ilike('name', `%${targetClientName}%`)
              .maybeSingle();

            if (client && client.phone) {
              // Отправка сообщения через WhatsApp с правильными параметрами
              const { error } = await supabase.functions.invoke('whatsapp-send', {
                body: {
                  clientId: client.id,
                  phoneNumber: client.phone,
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
              responseText = `Клиент "${targetClientName}" не найден или у него нет номера телефона.`;
            }
            break;

          case 'create_task':
            // Найдем клиента если указан, иначе используем активного из контекста
            let clientForTask = null;
            let taskClientName = functionArgs.clientName;
            
            // Приоритет: сначала используем activeClientId из контекста (точное совпадение),
            // потом activeClientName, и только потом клиента по имени из команды
            if (!taskClientName && context?.activeClientId) {
              console.log('Using active client ID from context:', context.activeClientId);
              const { data: foundClient } = await supabase
                .from('clients')
                .select('id, name')
                .eq('id', context.activeClientId)
                .eq('is_active', true)
                .maybeSingle();
              
              if (foundClient) {
                clientForTask = foundClient;
                console.log('Found active client:', foundClient.name);
              }
            } else if (!taskClientName && context?.activeClientName) {
              taskClientName = context.activeClientName;
              console.log('Using active client name from context for task:', taskClientName);
            }
            
            // Поиск по имени только если не нашли по ID
            if (!clientForTask && taskClientName) {
              const { data: foundClient } = await supabase
                .from('clients')
                .select('id, name')
                .eq('is_active', true)
                .not('name', 'ilike', 'Преподаватель:%')
                .not('name', 'ilike', 'Teacher:%')
                .not('name', 'ilike', 'Чат педагогов - %')
                .not('name', 'ilike', 'Корпоративный чат - %')
                .ilike('name', `%${taskClientName}%`)
                .maybeSingle();
              clientForTask = foundClient;
            }

            const taskData: any = {
              title: functionArgs.title,
              description: functionArgs.description || '',
              status: 'active',
              priority: functionArgs.priority || 'medium',
              due_date: functionArgs.dueDate || null,
              due_time: functionArgs.dueTime || null,
              branch: userProfile?.branch || 'Окская',
              responsible: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || userProfile?.email || 'Менеджер'
            };

            // Добавляем client_id только если клиент найден
            if (clientForTask) {
              taskData.client_id = clientForTask.id;
            }

            const { data: inserted, error: taskError } = await supabase
              .from('tasks')
              .insert(taskData)
              .select('id')
              .single();

            if (taskError) {
              console.error('Task creation error:', taskError);
              responseText = 'Ошибка при создании задачи.';
            } else {
              const timeInfo = functionArgs.dueTime ? ` на ${functionArgs.dueTime}` : '';
              const dateInfo = functionArgs.dueDate ? ` на ${functionArgs.dueDate}` : '';
              responseText = `Задача "${functionArgs.title}"${dateInfo}${timeInfo} создана${clientForTask ? ` для клиента ${clientForTask.name}` : ''}.`;
              actionResult = { type: 'task_created', title: functionArgs.title, clientName: clientForTask?.name };
            }
            break;

          case 'get_tasks':
            // Фильтрация задач по ответственному текущему пользователю (без привязки к филиалу)
            const userBranch = userProfile?.branch || 'Окская';
            const userFullName = `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim();
            const reversedName = `${userProfile?.last_name || ''} ${userProfile?.first_name || ''}`.trim();
            const email = userProfile?.email || '';
            
            let tasksQuery = supabase
              .from('tasks')
              .select('id, title, description, status, priority, due_date, created_at, client_id, responsible');

            // Показываем задачи только текущего пользователя (ответственного)
            const orFilters = [
              userFullName ? `responsible.ilike.%${userFullName}%` : null,
              reversedName && reversedName !== userFullName ? `responsible.ilike.%${reversedName}%` : null,
              email ? `responsible.ilike.%${email}%` : null,
            ].filter(Boolean).join(',');
            if (orFilters) {
              tasksQuery = tasksQuery.or(orFilters);
            }

            // Применяем фильтры по статусу/датам
            const today = new Date().toISOString().split('T')[0];
            switch (functionArgs.filter) {
              case 'today':
                tasksQuery = tasksQuery.eq('due_date', today).eq('status', 'active');
                break;
              case 'overdue':
                tasksQuery = tasksQuery.lt('due_date', today).eq('status', 'active');
                break;
              case 'pending':
              case 'all':
                tasksQuery = tasksQuery.eq('status', 'active');
                break;
              case 'completed':
                tasksQuery = tasksQuery.eq('status', 'completed');
                break;
            }

            // Опциональная фильтрация по клиенту без join'а
            if (functionArgs.clientName) {
              const { data: nameClients } = await supabase
                .from('clients')
                .select('id')
                .ilike('name', `%${functionArgs.clientName}%`)
                .limit(50);
              const ids = (nameClients || []).map(c => c.id);
              if (ids.length > 0) {
                tasksQuery = tasksQuery.in('client_id', ids);
              } else {
                // Если клиентов по имени нет — вернем пустой список
                tasksQuery = tasksQuery.in('client_id', ['00000000-0000-0000-0000-000000000000']);
              }
            }

            const { data: tasks, error: tasksError } = await tasksQuery
              .order('created_at', { ascending: false })
              .limit(20);

            console.log('Tasks query result:', { tasksCount: tasks?.length || 0, tasksError, userFullName, filter: functionArgs.filter });

            if (tasks && tasks.length > 0) {
              let filterText = '';
              switch (functionArgs.filter) {
                case 'today': filterText = 'на сегодня'; break;
                case 'overdue': filterText = 'просроченные'; break;
                case 'pending': filterText = 'активные'; break;
                case 'completed': filterText = 'выполненные'; break;
                default: filterText = 'все';
              }
              
              const tasksText = tasks.slice(0, 5).map(t => {
                const date = t.due_date ? ` (к ${t.due_date})` : '';
                const statusText = t.status === 'active' ? 'активна' : (t.status === 'completed' ? 'выполнена' : t.status);
                const responsible = t.responsible ? ` — ${t.responsible}` : '';
                return `"${t.title}"${date}${responsible} — ${statusText}`;
              }).join(', ');
              responseText = `Найдены задачи (${filterText}): ${tasksText}${tasks.length > 5 ? ` и ещё ${tasks.length - 5}` : ''}.`;
              actionResult = { type: 'tasks', data: tasks, filter: functionArgs.filter };
            } else {
              responseText = `Задач${functionArgs.filter ? ` (${functionArgs.filter})` : ''} не найдено для ${userFullName || 'текущего пользователя'}.`;
            }
            break;

          case 'update_task':
            const { error: updateError } = await supabase
              .from('tasks')
              .update({ 
                status: functionArgs.status,
                ...(functionArgs.title && { title: functionArgs.title })
              })
              .eq('id', functionArgs.taskId);

            if (updateError) {
              responseText = 'Ошибка при обновлении задачи.';
            } else {
              responseText = `Задача ${functionArgs.status === 'completed' ? 'выполнена' : 'обновлена'}.`;
              actionResult = { type: 'task_updated', status: functionArgs.status };
            }
            break;

          case 'search_teachers':
            const { data: teachers } = await supabase
              .from('clients')
              .select('id, name, phone, email, branch')
              .or('name.ilike.%преподаватель:%,name.ilike.%teacher:%')
              .ilike('name', `%${functionArgs.query}%`)
              .limit(10);
            
            if (teachers && teachers.length > 0) {
              const teachersList = teachers.map(t => t.name.replace(/^(преподаватель:|teacher:)/i, '')).join(', ');
              responseText = `Найдены преподаватели: ${teachersList}`;
              actionResult = { type: 'teachers', data: teachers };
            } else {
              responseText = `Преподаватели с именем "${functionArgs.query}" не найдены.`;
            }
            break;

          case 'manage_chat':
            // Поиск клиента для управления чатом - используем активного, если не указан
            let chatClientName = functionArgs.clientName;
            if (!chatClientName && context?.activeClientName) {
              chatClientName = context.activeClientName;
              console.log('Using active client from context for chat management:', chatClientName);
            }

            if (!chatClientName) {
              responseText = 'Не указан клиент для управления чатом.';
              break;
            }

            const { data: chatClient } = await supabase
              .from('clients')
              .select('*')
              .ilike('name', `%${chatClientName}%`)
              .maybeSingle();

            if (chatClient) {
              const chatAction = functionArgs.action;
              
              if (chatAction === 'open') {
                responseText = `Открываю чат с ${chatClient.name}.`;
                actionResult = { 
                  type: 'chat_opened', 
                  clientName: chatClient.name, 
                  clientId: chatClient.id,
                  action: 'open'
                };
              } else {
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
              }
            } else {
              responseText = `Клиент "${chatClientName}" не найден.`;
            }
            break;

          case 'get_schedule':
            let scheduleQuery = supabase.rpc('get_public_schedule');
            
            if (functionArgs.branch) {
              scheduleQuery = supabase.rpc('get_public_schedule', { branch_name: functionArgs.branch });
            }
            
            const { data: schedule } = await scheduleQuery.limit(20);
            
            if (schedule && schedule.length > 0) {
              const scheduleText = schedule.slice(0, 5).map(s => 
                `${s.name} (${s.office_name}) - ${s.compact_days} ${s.compact_time}`
              ).join(', ');
              responseText = `Расписание${functionArgs.branch ? ` для ${functionArgs.branch}` : ''}: ${scheduleText}${schedule.length > 5 ? ` и ещё ${schedule.length - 5} занятий` : ''}`;
              actionResult = { type: 'schedule', data: schedule };
            } else {
              responseText = 'Расписание не найдено.';
            }
            break;

          case 'get_client_info':
            // Получаем информацию о клиенте - используем активного, если не указан
            let infoClientName = functionArgs.clientName;
            if (!infoClientName && context?.activeClientName) {
              infoClientName = context.activeClientName;
              console.log('Using active client from context for info:', infoClientName);
            }

            if (!infoClientName) {
              responseText = 'Не указан клиент для получения информации.';
              break;
            }

            const { data: clientInfo } = await supabase
              .from('clients')
              .select(`
                id, name, phone, email, branch, notes, last_message_at, created_at,
                students(name, age, status),
                student_courses(course_name, start_date, end_date, is_active)
              `)
              .ilike('name', `%${infoClientName}%`)
              .maybeSingle();

            if (clientInfo) {
              let info = `Клиент: ${clientInfo.name}\nФилиал: ${clientInfo.branch}`;
              if (clientInfo.phone) info += `\nТелефон: ${clientInfo.phone}`;
              if (clientInfo.email) info += `\nEmail: ${clientInfo.email}`;
              if (clientInfo.students?.length) {
                info += `\nСтуденты: ${clientInfo.students.map(s => `${s.name} (${s.age} лет)`).join(', ')}`;
              }
              if (clientInfo.notes) info += `\nЗаметки: ${clientInfo.notes}`;
              
              responseText = info;
              actionResult = { type: 'client_info', data: clientInfo };
            } else {
              responseText = `Информация о клиенте "${infoClientName}" не найдена.`;
            }
            break;

          case 'open_modal':
            responseText = `Открываю окно ${functionArgs.modalType === 'add_client' ? 'добавления клиента' : 
                                            functionArgs.modalType === 'add_teacher' ? 'добавления преподавателя' :
                                            functionArgs.modalType === 'add_student' ? 'добавления студента' :
                                            functionArgs.modalType === 'add_task' ? 'создания задачи' :
                                            functionArgs.modalType === 'profile' ? 'профиля клиента' :
                                            'профиля студента'}.`;
            actionResult = { 
              type: 'modal_opened', 
              modalType: functionArgs.modalType,
              clientId: functionArgs.clientId
            };
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
    let base64Audio = null;
    try {
      console.log('Generating TTS for response:', responseText);
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

      console.log('TTS response status:', ttsResponse.status);
      
      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.arrayBuffer();
        const uint8Array = new Uint8Array(audioBuffer);
        
        // Convert to base64 safely
        const chunkSize = 8192;
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        base64Audio = btoa(binaryString);
        console.log('TTS audio generated successfully, base64 length:', base64Audio.length);
      } else {
        const errorText = await ttsResponse.text();
        console.error('TTS error response:', errorText);
      }
    } catch (ttsError) {
      console.error('TTS generation error:', ttsError);
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