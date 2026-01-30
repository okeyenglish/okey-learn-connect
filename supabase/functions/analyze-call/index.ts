import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
  getOpenAIApiKey,
  getOrganizationIdFromUser,
} from '../_shared/types.ts';

interface AnalyzeCallRequest {
  callId: string;
}

// Автоматические теги для категоризации звонков
type CallTag = 
  | 'hot_lead'           // Горячий лид - готов записаться
  | 'warm_lead'          // Тёплый лид - интересуется, но не готов
  | 'cold_lead'          // Холодный лид - низкий интерес
  | 'callback_requested' // Клиент просил перезвонить
  | 'price_objection'    // Возражение по цене
  | 'time_objection'     // Нет времени/неудобное расписание
  | 'competitor_mention' // Упоминал конкурентов
  | 'complaint'          // Жалоба/негатив
  | 'trial_booked'       // Записан на пробный урок
  | 'info_request'       // Запрос информации
  | 'wrong_number'       // Ошибочный номер
  | 'spam_robot'         // Спам/робот
  | 'no_contact'         // Не удалось связаться
  | 'short_call'         // Короткий звонок (< 30 сек)
  | 'dropped_call'       // Сброшен/прерван
  | 'positive_feedback'  // Положительный отзыв
  | 'existing_client'    // Действующий клиент
  | 'renewal_interest'   // Интерес к продлению
  | 'group_inquiry'      // Запрос по групповым занятиям
  | 'individual_inquiry' // Запрос по индивидуальным
  | 'adult_student'      // Взрослый ученик
  | 'child_student'      // Ребёнок
  | 'urgent';            // Срочный вопрос

interface AiCallEvaluation {
  overall_score: number;
  scores: {
    greeting: number;
    needs_identification: number;
    product_presentation: number;
    objection_handling: number;
    closing: number;
  };
  summary: string;
  call_purpose: string;
  call_result: string;
  call_outcome: 'success' | 'partial' | 'failed' | 'neutral'; // Результат звонка
  tags: CallTag[];                // Автоматические теги
  sentiment: 'positive' | 'neutral' | 'negative'; // Настроение клиента
  lead_temperature: 'hot' | 'warm' | 'cold' | 'none'; // Температура лида
  recommended_action: string;     // Рекомендуемое следующее действие
  hangup_analysis?: string;       // Анализ причины завершения (для коротких звонков)
  key_points: string[];
  strengths: string[];
  improvements: string[];
  action_items: {
    task: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: string;
  }[];
  analyzed_at: string;
  model_used: string;
}

// Маппинг hangup_cause на понятные описания
const HANGUP_CAUSE_MAP: Record<string, string> = {
  'UNALLOCATED_NUMBER': 'Несуществующий номер',
  'NO_ROUTE_TRANSIT_NET': 'Нет транзитного маршрута',
  'NO_ROUTE_DESTINATION': 'Нет заданного маршрута',
  'CHANNEL_UNACCEPTABLE': 'Отказ не принят',
  'NORMAL_CLEARING': 'Нормальное завершение звонка',
  'USER_BUSY': 'Абонент занят',
  'NO_USER_RESPONSE': 'Абонент не ответил',
  'NO_ANSWER': 'Нет ответа',
  'SUBSCRIBER_ABSENT': 'Абонент не в сети',
  'CALL_REJECTED': 'Вызов отклонен',
  'NUMBER_CHANGED': 'Номер изменился',
  'REDIRECTION_TO_NEW_DESTINATION': 'Вызов переадресован',
  'EXCHANGE_ROUTING_ERROR': 'Ошибка оператора',
  'DESTINATION_OUT_OF_ORDER': 'Нет заданного маршрута',
  'INVALID_NUMBER_FORMAT': 'Ошибка в номере',
  'ORIGINATOR_CANCEL': 'Вызов отменен',
  'MANAGER_REQUEST': 'Завершен через API',
  'BLIND_TRANSFER': 'Безусловный перевод',
  'ATTENDED_TRANSFER': 'Условный перевод',
  'PICKED_OFF': 'Перехвачен',
  'USER_NOT_REGISTERED': 'Абонент не зарегистрирован',
  'PROGRESS_TIMEOUT': 'Время ожидания вышло',
  'GATEWAY_DOWN': 'Внешний номер не зарегистрирован',
};

const SYSTEM_PROMPT = `Ты директор по продажам в школе английского языка O'KEY English с 15-летним опытом.
Твоя задача - комплексно оценить звонок и дать чёткие рекомендации.

## ОЦЕНКА ПО КРИТЕРИЯМ (1-10):

1. **Приветствие (greeting)**: 
   - 9-10: Идеальное представление, тёплый тон, вызвал доверие
   - 7-8: Хорошее приветствие, назвал себя и школу
   - 5-6: Формальное приветствие без энтузиазма
   - 3-4: Не представился полностью или сухой тон
   - 1-2: Не представился, грубый тон

2. **Выявление потребностей (needs_identification)**: 
   - 9-10: Открытые вопросы, понял цели, возраст, уровень, ожидания
   - 7-8: Выяснил основное, но упустил детали
   - 5-6: Задал пару вопросов, но не глубоко
   - 3-4: Почти не спрашивал, сразу перешёл к презентации
   - 1-2: Вообще не выяснял потребности

3. **Презентация услуг (product_presentation)**: 
   - 9-10: Подробно рассказал о преимуществах, методике, адаптировал под потребности
   - 7-8: Хорошо презентовал основные услуги
   - 5-6: Стандартная презентация без персонализации
   - 3-4: Поверхностно, много упущено
   - 1-2: Не презентовал вообще

4. **Работа с возражениями (objection_handling)**: 
   - 9-10: Профессионально обработал все возражения, убедил
   - 7-8: Хорошо ответил на большинство сомнений
   - 5-6: Частично обработал, но не убедил
   - 3-4: Игнорировал или плохо отвечал на возражения
   - 1-2: Возражения остались без ответа, клиент недоволен

5. **Закрытие (closing)**: 
   - 9-10: Чёткий призыв к действию, получил согласие, назначил дату
   - 7-8: Предложил следующий шаг, но без конкретики
   - 5-6: Слабый призыв к действию
   - 3-4: Не пытался закрыть сделку
   - 1-2: Завершил разговор без результата

## АВТОМАТИЧЕСКИЕ ТЕГИ (tags):
Выбери ВСЕ подходящие теги из списка:
- hot_lead: готов записаться сейчас
- warm_lead: интересуется, думает
- cold_lead: низкий интерес
- callback_requested: просил перезвонить
- price_objection: возражал по цене
- time_objection: неудобное время/расписание
- competitor_mention: упоминал другие школы
- complaint: жалоба/негатив
- trial_booked: записался на пробный урок
- info_request: просто узнавал информацию
- wrong_number: ошибочный номер
- spam_robot: спам/автообзвон
- no_contact: не удалось связаться
- short_call: короткий звонок < 30 сек
- dropped_call: сброшен/прерван
- positive_feedback: похвалил школу
- existing_client: уже ученик школы
- renewal_interest: хочет продлить обучение
- group_inquiry: интересуют группы
- individual_inquiry: интересуют индивидуальные
- adult_student: взрослый ученик
- child_student: ребёнок
- urgent: срочный вопрос

## НАСТРОЕНИЕ КЛИЕНТА (sentiment):
- positive: доброжелательный, заинтересованный, благодарный
- neutral: спокойный, деловой
- negative: раздражённый, недовольный, агрессивный

## ТЕМПЕРАТУРА ЛИДА (lead_temperature):
- hot: готов купить сейчас, высокий интерес
- warm: интересуется, но нужно время/информация
- cold: низкий интерес, скорее всего не купит
- none: не лид (спам, ошибка, существующий клиент)

## РЕЗУЛЬТАТ ЗВОНКА (call_outcome):
- success: цель достигнута (записан, решил вопрос)
- partial: частичный успех (заинтересован, обещал подумать)
- failed: неудача (отказ, негатив, не связались)
- neutral: информационный звонок без продажи

## РЕКОМЕНДУЕМОЕ ДЕЙСТВИЕ (recommended_action):
Одно конкретное действие: "Перезвонить через 2 дня", "Отправить расписание в WhatsApp", "Передать руководителю" и т.д.

## АНАЛИЗ ЗАВЕРШЕНИЯ (hangup_analysis):
Если звонок был коротким или не состоялся, объясни причину и дай рекомендацию.

## ЗАДАЧИ (action_items):
КРИТИЧЕСКИ ВАЖНО! Если нужно что-то сделать:
- high: сегодня/срочно (перезвонить в назначенное время)
- medium: 1-2 дня
- low: в течение недели

Будь конкретен. Резюме = 2-3 предложения. Ключевые моменты ≤ 5 пунктов.`;

const EVALUATION_TOOL = {
  type: "function" as const,
  function: {
    name: "evaluate_call",
    description: "Комплексная оценка телефонного звонка с тегами, скорингом и рекомендациями",
    parameters: {
      type: "object",
      properties: {
        overall_score: { 
          type: "number", 
          minimum: 1, 
          maximum: 10,
          description: "Общая оценка звонка от 1 до 10"
        },
        scores: {
          type: "object",
          properties: {
            greeting: { type: "number", minimum: 1, maximum: 10 },
            needs_identification: { type: "number", minimum: 1, maximum: 10 },
            product_presentation: { type: "number", minimum: 1, maximum: 10 },
            objection_handling: { type: "number", minimum: 1, maximum: 10 },
            closing: { type: "number", minimum: 1, maximum: 10 }
          },
          required: ["greeting", "needs_identification", "product_presentation", "objection_handling", "closing"]
        },
        summary: { 
          type: "string", 
          maxLength: 300,
          description: "Краткое резюме разговора в 2-3 предложениях"
        },
        call_purpose: { 
          type: "string",
          description: "Цель звонка"
        },
        call_result: { 
          type: "string",
          description: "Результат звонка"
        },
        call_outcome: {
          type: "string",
          enum: ["success", "partial", "failed", "neutral"],
          description: "Статус результата: success=цель достигнута, partial=частично, failed=неудача, neutral=информационный"
        },
        tags: {
          type: "array",
          items: { 
            type: "string",
            enum: [
              "hot_lead", "warm_lead", "cold_lead", "callback_requested",
              "price_objection", "time_objection", "competitor_mention", "complaint",
              "trial_booked", "info_request", "wrong_number", "spam_robot",
              "no_contact", "short_call", "dropped_call", "positive_feedback",
              "existing_client", "renewal_interest", "group_inquiry", "individual_inquiry",
              "adult_student", "child_student", "urgent"
            ]
          },
          description: "Автоматические теги для категоризации звонка"
        },
        sentiment: {
          type: "string",
          enum: ["positive", "neutral", "negative"],
          description: "Настроение клиента во время разговора"
        },
        lead_temperature: {
          type: "string",
          enum: ["hot", "warm", "cold", "none"],
          description: "Температура лида"
        },
        recommended_action: {
          type: "string",
          description: "Одно конкретное рекомендуемое действие"
        },
        hangup_analysis: {
          type: "string",
          description: "Анализ причины завершения звонка (особенно для коротких/неотвеченных)"
        },
        key_points: { 
          type: "array", 
          items: { type: "string" }, 
          maxItems: 5,
          description: "Ключевые моменты разговора"
        },
        strengths: { 
          type: "array", 
          items: { type: "string" }, 
          maxItems: 3,
          description: "Что менеджер сделал хорошо"
        },
        improvements: { 
          type: "array", 
          items: { type: "string" }, 
          maxItems: 3,
          description: "Что можно улучшить"
        },
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              task: { type: "string", description: "Что нужно сделать" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              deadline: { type: "string", description: "Срок выполнения" }
            },
            required: ["task", "priority"]
          },
          description: "Задачи по итогам звонка"
        }
      },
      required: [
        "overall_score", "scores", "summary", "call_purpose", "call_result",
        "call_outcome", "tags", "sentiment", "lead_temperature", "recommended_action",
        "key_points", "strengths", "improvements", "action_items"
      ]
    }
  }
};

async function transcribeAudio(audioUrl: string, openaiApiKey: string): Promise<string> {
  console.log('[analyze-call] Downloading audio from:', audioUrl);
  
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
  }
  
  const audioBlob = await audioResponse.blob();
  console.log('[analyze-call] Downloaded audio, size:', audioBlob.size, 'bytes');
  
  if (audioBlob.size === 0) {
    throw new Error('Downloaded audio is empty');
  }
  
  // Determine file extension from URL or content type
  const contentType = audioResponse.headers.get('content-type') || '';
  let extension = 'mp3';
  if (contentType.includes('wav')) extension = 'wav';
  else if (contentType.includes('ogg')) extension = 'ogg';
  else if (contentType.includes('webm')) extension = 'webm';
  else if (audioUrl.includes('.wav')) extension = 'wav';
  else if (audioUrl.includes('.ogg')) extension = 'ogg';
  
  const formData = new FormData();
  formData.append('file', audioBlob, `audio.${extension}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ru');
  formData.append('response_format', 'text');
  
  console.log('[analyze-call] Sending to Whisper API...');
  
  const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: formData,
  });
  
  if (!whisperResponse.ok) {
    const errorText = await whisperResponse.text();
    console.error('[analyze-call] Whisper API error:', errorText);
    throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
  }
  
  const transcription = await whisperResponse.text();
  console.log('[analyze-call] Transcription length:', transcription.length, 'chars');
  
  return transcription;
}

interface CallContext {
  transcription: string;
  duration_seconds?: number;
  direction?: string;
  status?: string;
  hangup_cause?: string;
}

async function analyzeWithGPT(context: CallContext, openaiApiKey: string): Promise<AiCallEvaluation> {
  console.log('[analyze-call] Analyzing with GPT-4o-mini...');
  
  // Build context message
  let userMessage = `Проанализируй следующий телефонный звонок:\n\n`;
  
  // Add call metadata
  const metadata: string[] = [];
  if (context.duration_seconds !== undefined) {
    metadata.push(`Длительность: ${context.duration_seconds} сек`);
  }
  if (context.direction) {
    metadata.push(`Направление: ${context.direction === 'incoming' ? 'входящий' : 'исходящий'}`);
  }
  if (context.status) {
    metadata.push(`Статус: ${context.status}`);
  }
  if (context.hangup_cause) {
    const causeDescription = HANGUP_CAUSE_MAP[context.hangup_cause] || context.hangup_cause;
    metadata.push(`Причина завершения: ${causeDescription} (${context.hangup_cause})`);
  }
  
  if (metadata.length > 0) {
    userMessage += `**Метаданные звонка:**\n${metadata.join('\n')}\n\n`;
  }
  
  // Add special instructions for short/failed calls
  if (context.duration_seconds !== undefined && context.duration_seconds < 30) {
    userMessage += `**ВАЖНО:** Это короткий звонок (< 30 сек). Учти причину завершения при анализе. Если нет транскрипции или она пустая - определи теги и рекомендации на основе метаданных.\n\n`;
  }
  
  userMessage += `**Транскрипция:**\n${context.transcription || '(транскрипция отсутствует)'}`;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      tools: [EVALUATION_TOOL],
      tool_choice: { type: 'function', function: { name: 'evaluate_call' } },
      temperature: 0.3,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[analyze-call] GPT API error:', errorText);
    throw new Error(`GPT API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log('[analyze-call] GPT response received');
  
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== 'evaluate_call') {
    console.error('[analyze-call] Unexpected GPT response:', JSON.stringify(data));
    throw new Error('GPT did not return expected tool call');
  }
  
  const evaluation = JSON.parse(toolCall.function.arguments);
  
  return {
    ...evaluation,
    analyzed_at: new Date().toISOString(),
    model_used: 'gpt-4o-mini'
  };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { callId } = await req.json() as AnalyzeCallRequest;
    
    if (!callId) {
      return errorResponse('callId is required', 400);
    }
    
    console.log('[analyze-call] Starting analysis for call:', callId);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Multi-tenant: derive organization from the authenticated user
    const authHeader = req.headers.get('Authorization');
    const organizationId = await getOrganizationIdFromUser(supabase, authHeader);
    if (!organizationId) {
      console.warn('[analyze-call] Unauthorized: cannot resolve organizationId from user');
      return errorResponse('Unauthorized', 401);
    }
    
    // Get OpenAI API key from DB (messenger_settings) for this organization
    // (env is only a fallback for legacy mode)
    const openaiApiKey = await getOpenAIApiKey(supabase, organizationId);
    
    if (!openaiApiKey) {
      console.error('[analyze-call] OpenAI API key not configured');
      return errorResponse('OpenAI API key not configured. Please set up in AI settings or add OPENAI_API_KEY to environment.', 500);
    }
    
    // Get call log with recording URL and hangup_cause
    const { data: callLog, error: fetchError } = await supabase
      .from('call_logs')
      .select('id, organization_id, recording_url, transcription, ai_evaluation, duration_seconds, phone_number, direction, status, hangup_cause')
      .eq('id', callId)
      .maybeSingle();
    
    if (fetchError || !callLog) {
      console.error('[analyze-call] Call not found:', fetchError);
      return errorResponse('Call log not found', 404);
    }

    // Tenant isolation guard
    if (callLog.organization_id && callLog.organization_id !== organizationId) {
      console.warn('[analyze-call] Forbidden: call organization mismatch', {
        callId,
        callOrg: callLog.organization_id,
        userOrg: organizationId,
      });
      return errorResponse('Forbidden', 403);
    }
    
    // Check if already analyzed
    if (callLog.ai_evaluation) {
      console.log('[analyze-call] Call already analyzed, skipping');
      return successResponse({ 
        success: true, 
        message: 'Already analyzed',
        callId,
        evaluation: callLog.ai_evaluation
      } as unknown as Record<string, unknown>);
    }
    
    // For very short calls without recording, we can still analyze based on metadata
    const hasRecording = !!callLog.recording_url;
    const isShortCall = callLog.duration_seconds !== null && callLog.duration_seconds < 30;
    
    console.log('[analyze-call] Call info: hasRecording=', hasRecording, 'duration=', callLog.duration_seconds, 'hangup_cause=', callLog.hangup_cause);
    
    // Step 1: Transcribe audio (if available)
    let transcription: string = '';
    
    if (hasRecording) {
      if (callLog.transcription) {
        console.log('[analyze-call] Using existing transcription');
        transcription = callLog.transcription;
      } else {
        try {
          transcription = await transcribeAudio(callLog.recording_url!, openaiApiKey);
          
          // Save transcription immediately
          await supabase
            .from('call_logs')
            .update({ transcription })
            .eq('id', callId);
          
          console.log('[analyze-call] Transcription saved');
        } catch (transcribeError) {
          console.error('[analyze-call] Transcription failed:', transcribeError);
          // Continue with empty transcription for metadata-based analysis
        }
      }
    }
    
    // If no transcription and not a short call, skip analysis
    if (!transcription && !isShortCall && !callLog.hangup_cause) {
      console.log('[analyze-call] No transcription and no metadata for analysis');
      return errorResponse('No recording or metadata available for analysis', 400);
    }
    
    // Step 2: Analyze with GPT
    const context: CallContext = {
      transcription,
      duration_seconds: callLog.duration_seconds ?? undefined,
      direction: callLog.direction ?? undefined,
      status: callLog.status ?? undefined,
      hangup_cause: callLog.hangup_cause ?? undefined,
    };
    
    const evaluation = await analyzeWithGPT(context, openaiApiKey);
    
    // Step 3: Save evaluation with tags
    const { error: updateError } = await supabase
      .from('call_logs')
      .update({ 
        ai_evaluation: evaluation,
        summary: evaluation.summary,
        tags: evaluation.tags || [],
      })
      .eq('id', callId);
    
    if (updateError) {
      console.error('[analyze-call] Error saving evaluation:', updateError);
      throw updateError;
    }
    
    console.log('[analyze-call] Analysis complete. Overall score:', evaluation.overall_score);
    console.log('[analyze-call] Tags:', evaluation.tags);
    console.log('[analyze-call] Lead temperature:', evaluation.lead_temperature);
    console.log('[analyze-call] Action items:', evaluation.action_items?.length || 0);
    
    // Step 4: Create notifications for action items
    if (evaluation.action_items && evaluation.action_items.length > 0) {
      console.log('[analyze-call] Creating notifications for action items');
      
      // Get call details for notification context
      const { data: fullCallLog } = await supabase
        .from('call_logs')
        .select('phone_number, organization_id, employee_id')
        .eq('id', callId)
        .maybeSingle();
      
      if (fullCallLog?.organization_id) {
        // Get managers to notify
        const { data: managers } = await supabase
          .from('profiles')
          .select('id')
          .eq('organization_id', fullCallLog.organization_id)
          .limit(5);
        
        if (managers && managers.length > 0) {
          const notifications = [];
          
          for (const actionItem of evaluation.action_items) {
            const priorityEmoji = actionItem.priority === 'high' ? '🔴' : 
                                  actionItem.priority === 'medium' ? '🟠' : '🔵';
            
            // If there's a specific employee, notify them; otherwise notify managers
            const recipientId = fullCallLog.employee_id || managers[0].id;
            
            notifications.push({
              recipient_id: recipientId,
              recipient_type: 'employee',
              title: `${priorityEmoji} Задача по звонку`,
              message: `${actionItem.task}${actionItem.deadline ? ` (срок: ${actionItem.deadline})` : ''}`,
              notification_type: 'call_action_item',
              status: 'pending',
              delivery_method: ['in_app', 'push'],
              priority: actionItem.priority,
              metadata: {
                call_id: callId,
                phone_number: fullCallLog.phone_number,
                action_item: actionItem,
                evaluation_summary: evaluation.summary
              }
            });
          }
          
          if (notifications.length > 0) {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert(notifications);
            
            if (notifError) {
              console.error('[analyze-call] Error creating notifications:', notifError);
            } else {
              console.log('[analyze-call] Created', notifications.length, 'notifications');
            }
          }
        }
      }
    }
    
    return successResponse({
      success: true,
      callId,
      evaluation,
      transcriptionLength: transcription.length
    } as unknown as Record<string, unknown>);
    
  } catch (error: unknown) {
    console.error('[analyze-call] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
