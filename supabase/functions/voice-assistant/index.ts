import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// Timezone helpers
function formatMoscowDate(offsetDays: number = 0) {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const msk = new Date(utc + 3 * 60 * 60000 + offsetDays * 86400000);
  const y = msk.getFullYear();
  const m = String(msk.getMonth() + 1).padStart(2, '0');
  const d = String(msk.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

ПАРСИНГ ДАТА/ВРЕМЯ (часовой пояс: Европа/Москва):
- "сегодня" = ${formatMoscowDate(0)}
- "завтра" = ${formatMoscowDate(1)}
- "послезавтра" = ${formatMoscowDate(2)}
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
            date: { type: "string", description: "Дата в формате YYYY-MM-DD (опционално)" },
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

    // Если GPT вызвал функции, выполняем их все
    if (message.tool_calls && message.tool_calls.length > 0) {
      const executedActions = [];
      
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        console.log('Function call:', functionName, functionArgs);

        try {
          let singleResult = null;
          
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
                singleResult = { 
                  type: 'search_clients', 
                  text: `Найдены клиенты: ${clientsList}`,
                  data: clients 
                };
              } else {
                singleResult = { 
                  type: 'search_clients', 
                  text: `Клиенты с именем "${functionArgs.query}" не найдены.` 
                };
              }
              break;

            case 'send_message':
              // Поиск клиента: приоритет ID активного чата, затем имя из команды/контекста
              let client: any = null;

              if (!functionArgs.clientName && context?.activeClientId) {
                const { data: byId } = await supabase
                  .from('clients')
                  .select('*')
                  .eq('id', context.activeClientId)
                  .eq('is_active', true)
                  .maybeSingle();
                if (byId) {
                  client = byId;
                  console.log('Using active client by ID for send_message:', byId.name);
                }
              }

              if (!client) {
                const targetClientName = functionArgs.clientName || context?.activeClientName;
                if (!targetClientName) {
                  singleResult = { type: 'send_message', text: 'Не указан клиент для отправки сообщения.' };
                  break;
                }

                const { data: byName } = await supabase
                  .from('clients')
                  .select('*')
                  .eq('is_active', true)
                  .not('name', 'ilike', 'Преподаватель:%')
                  .not('name', 'ilike', 'Teacher:%')
                  .not('name', 'ilike', 'Чат педагогов - %')
                  .not('name', 'ilike', 'Корпоративный чат - %')
                  .ilike('name', `%${targetClientName}%`)
                  .maybeSingle();
                client = byName;
              }

              if (client && client.phone) {
                const { error } = await supabase.functions.invoke('whatsapp-send', {
                  body: {
                    clientId: client.id,
                    phoneNumber: client.phone,
                    message: functionArgs.message
                  }
                });

                if (error) {
                  console.error('WhatsApp send error:', error);
                  singleResult = { type: 'send_message', text: `Ошибка при отправке сообщения клиенту ${client.name}.` };
                } else {
                  singleResult = { 
                    type: 'send_message', 
                    text: `Сообщение "${functionArgs.message}" отправлено клиенту ${client.name}.`,
                    clientName: client.name 
                  };
                }
              } else {
                singleResult = { type: 'send_message', text: 'Клиент не найден или у него нет номера телефона.' };
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
              }

              // Если не нашли по ID и имя не задано — берем имя из контекста
              if (!clientForTask && !taskClientName && context?.activeClientName) {
                taskClientName = context.activeClientName;
                console.log('Falling back to active client name from context for task:', taskClientName);
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

              const inferredDueDate = functionArgs.dueDate
                ? functionArgs.dueDate
                : /сегодня/i.test(userCommand) ? formatMoscowDate(0)
                : /завтра/i.test(userCommand) ? formatMoscowDate(1)
                : /послезавтра/i.test(userCommand) ? formatMoscowDate(2)
                : null;

              const taskData: any = {
                title: functionArgs.title,
                description: functionArgs.description || '',
                status: 'active',
                priority: functionArgs.priority || 'medium',
                due_date: inferredDueDate,
                due_time: functionArgs.dueTime || null,
                branch: userProfile?.branch || 'Окская',
                responsible: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || userProfile?.email || 'Менеджер'
              };

              // Привязываем client_id: приоритет ЯВНО указанного клиента из команды/распознавания,
              // затем активного чата из контекста
              if (clientForTask) {
                taskData.client_id = clientForTask.id;
              } else if (context?.activeClientId) {
                taskData.client_id = context.activeClientId;
              }

              const { data: inserted, error: taskError } = await supabase
                .from('tasks')
                .insert(taskData)
                .select('id')
                .single();

              if (taskError) {
                console.error('Task creation error:', taskError);
                singleResult = { type: 'create_task', text: 'Ошибка при создании задачи.' };
              } else {
                const timeInfo = functionArgs.dueTime ? ` на ${functionArgs.dueTime}` : '';
                const dateInfo = inferredDueDate ? ` на ${inferredDueDate}` : '';
                const nameForText = clientForTask?.name || context?.activeClientName;
                singleResult = { 
                  type: 'create_task', 
                  text: `Задача "${functionArgs.title}"${dateInfo}${timeInfo} создана${nameForText ? ` для клиента ${nameForText}` : ''}.`,
                  title: functionArgs.title, 
                  clientName: nameForText,
                  dueDate: inferredDueDate
                };
              }
              break;

            case 'get_tasks':
              // Фильтрация задач по ответственному текущему пользователю (без привязки к филиалу)
              const userBranch = userProfile?.branch || 'Окская';
              const userFullName = `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim();
              const reversedName = `${userProfile?.last_name || ''} ${userProfile?.first_name || ''}`.trim();
              const userEmail = userProfile?.email || '';

              let taskFilter = supabase
                .from('tasks')
                .select(`
                  id, title, description, status, priority, due_date, due_time, 
                  created_at, updated_at, responsible, branch,
                  clients(name, phone, email)
                `)
                .eq('status', 'active');

              // Фильтрация по ответственному
              if (userFullName) {
                taskFilter = taskFilter.or(`responsible.ilike.%${userFullName}%,responsible.ilike.%${reversedName}%`);
              } else if (userEmail) {
                taskFilter = taskFilter.ilike('responsible', `%${userEmail}%`);
              }

              // Сортировка по дате и времени
              taskFilter = taskFilter.order('due_date', { ascending: true, nullsLast: true })
                                  .order('due_time', { ascending: true, nullsLast: true })
                                  .limit(20);

              const { data: tasks } = await taskFilter;
              
              if (tasks && tasks.length > 0) {
                const tasksText = tasks.map(t => {
                  const client = t.clients ? ` для ${t.clients.name}` : '';
                  const dueInfo = t.due_date ? ` до ${t.due_date}` : '';
                  const timeInfo = t.due_time ? ` в ${t.due_time}` : '';
                  return `"${t.title}"${client}${dueInfo}${timeInfo}`;
                }).join(', ');
                singleResult = { 
                  type: 'tasks', 
                  text: `Ваши активные задачи: ${tasksText}`,
                  data: tasks 
                };
              } else {
                singleResult = { type: 'tasks', text: 'У вас нет активных задач.' };
              }
              break;

            case 'get_schedule':
              const todayDate = formatMoscowDate(0);
              const { data: scheduleData } = await supabase
                .from('schedule')
                .select(`
                  id, day_of_week, time_start, time_end, student_name, 
                  student_age, branch, course_name, teacher_name, 
                  student_phone, date
                `)
                .eq('date', todayDate)
                .eq('branch', userProfile?.branch || 'Окская')
                .order('time_start');

              if (scheduleData && scheduleData.length > 0) {
                const scheduleText = scheduleData.map(s => 
                  `${s.time_start}-${s.time_end}: ${s.student_name} (${s.course_name})`
                ).join(', ');
                singleResult = { 
                  type: 'schedule', 
                  text: `Расписание на сегодня: ${scheduleText}`,
                  data: scheduleData 
                };
              } else {
                singleResult = { type: 'schedule', text: 'Расписание не найдено.' };
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
                singleResult = { type: 'client_info', text: 'Не указан клиент для получения информации.' };
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
                
                singleResult = { 
                  type: 'client_info', 
                  text: info,
                  data: clientInfo 
                };
              } else {
                singleResult = { type: 'client_info', text: `Информация о клиенте "${infoClientName}" не найдена.` };
              }
              break;

            case 'open_modal':
              singleResult = { 
                type: 'modal_opened',
                text: `Открываю окно ${functionArgs.modalType === 'add_client' ? 'добавления клиента' : 
                                             functionArgs.modalType === 'add_teacher' ? 'добавления преподавателя' :
                                             functionArgs.modalType === 'add_student' ? 'добавления студента' :
                                             functionArgs.modalType === 'add_task' ? 'создания задачи' :
                                             functionArgs.modalType === 'profile' ? 'профиля клиента' :
                                             'профиля студента'}.`,
                modalType: functionArgs.modalType,
                clientId: functionArgs.clientId
              };
              break;

            default:
              singleResult = { type: 'unknown', text: 'Функция не реализована.' };
          }
          
          if (singleResult) {
            executedActions.push(singleResult);
          }
          
        } catch (error) {
          console.error('Function execution error:', error);
          executedActions.push({ type: 'error', text: 'Произошла ошибка при выполнении команды.' });
        }
      }
      
      // Объединяем результаты всех действий
      if (executedActions.length > 0) {
        // Генерируем общий ответ на основе всех выполненных действий
        const taskActions = executedActions.filter(action => action.type === 'create_task');
        
        if (taskActions.length > 1) {
          // Если создано несколько задач
          const taskTitles = taskActions.map(action => `"${action.title}"`).join(', ');
          const firstDueDate = taskActions[0]?.dueDate || null;
          const dateInfo = firstDueDate ? ` на ${firstDueDate}` : '';
          const clientInfo = taskActions[0]?.clientName ? ` для клиента ${taskActions[0].clientName}` : '';
          responseText = `Создано ${taskActions.length} задач${dateInfo}${clientInfo}: ${taskTitles}.`;
          actionResult = { 
            type: 'multiple_tasks_created', 
            count: taskActions.length,
            tasks: taskActions.map(t => ({ title: t.title, clientName: t.clientName }))
          };
        } else {
          // Если одно действие или разные действия
          responseText = executedActions.map(action => action.text).join(' ');
          actionResult = executedActions.length === 1 ? 
            { type: executedActions[0].type, ...executedActions[0] } : 
            { type: 'multiple_actions', actions: executedActions };
        }
      }
    }

    // Fallback: если инструмент не выбран моделью, но команда про задачу — создадим задачу для активного клиента
    if ((!message.tool_calls || message.tool_calls.length === 0) && /задач|постав(ь|те)|созда(й|йте)/i.test(userCommand)) {
      try {
        let inferredTitle = 'задача';
        if (/позвон/i.test(userCommand)) inferredTitle = 'позвонить';
        else if (/связ/i.test(userCommand)) inferredTitle = 'связаться';
        else if (/напис/i.test(userCommand)) inferredTitle = 'написать';

        // Простая вычитка срока: сегодня/завтра
        // Используем часовой пояс Москва для корректной даты
        let dueDate: string | null = null;
        if (/завтра/i.test(userCommand)) {
          dueDate = formatMoscowDate(1);
        } else if (/сегодня/i.test(userCommand)) {
          dueDate = formatMoscowDate(0);
        } else if (/послезавтра/i.test(userCommand)) {
          dueDate = formatMoscowDate(2);
        }

        // Попробуем распознать время формата HH:MM
        let dueTime: string | null = null;
        const timeMatch = userCommand.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
        if (timeMatch) {
          dueTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
        } else if (/после часа/i.test(userCommand)) {
          dueTime = '13:00';
        }

        // Принудительно используем активного клиента из контекста, если есть
        let clientForTask = null;
        if (context?.activeClientId) {
          const { data: c } = await supabase
            .from('clients')
            .select('id, name')
            .eq('id', context.activeClientId)
            .eq('is_active', true)
            .maybeSingle();
          clientForTask = c;
        }
        if (!clientForTask && context?.activeClientName) {
          const { data: c } = await supabase
            .from('clients')
            .select('id, name')
            .eq('is_active', true)
            .ilike('name', `%${context.activeClientName}%`)
            .maybeSingle();
          clientForTask = c;
        }

        const taskData: any = {
          title: inferredTitle,
          description: '',
          status: 'active',
          priority: 'medium',
          due_date: dueDate,
          due_time: dueTime,
          branch: userProfile?.branch || 'Окская',
          responsible: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || userProfile?.email || 'Менеджер'
        };
        // Привязываем client_id: приоритет активного чата (даже если демо-ID), затем найденный клиент
        if (context?.activeClientId) {
          taskData.client_id = context.activeClientId;
        } else if (clientForTask) {
          taskData.client_id = clientForTask.id;
        }

        const { error: fallbackTaskError } = await supabase
          .from('tasks')
          .insert(taskData);

        if (!fallbackTaskError) {
          responseText = `Задача "${taskData.title}"${dueDate ? ` на ${dueDate}` : ''}${dueTime ? ` в ${dueTime}` : ''} создана${clientForTask ? ` для клиента ${clientForTask.name}` : ''}.`;
          actionResult = { type: 'task_created', title: taskData.title, clientName: clientForTask?.name };
        }
      } catch (fbErr) {
        console.error('Fallback create_task error:', fbErr);
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