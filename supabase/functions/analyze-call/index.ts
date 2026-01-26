import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../_shared/types.ts';

interface AnalyzeCallRequest {
  callId: string;
}

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

const SYSTEM_PROMPT = `Ты директор по продажам в школе английского языка с 15-летним опытом управления командой менеджеров. 
Твоя задача - оценить качество работы менеджера по звонку и дать конкретные рекомендации.

Оцени разговор по критериям от 1 до 10:

1. **Приветствие (greeting)**: Представился ли менеджер, назвал ли школу, был ли доброжелательный тон, вызвал ли расположение.

2. **Выявление потребностей (needs_identification)**: Задавал ли открытые вопросы, выяснил ли возраст ребенка, цели обучения, текущий уровень, ожидания родителей.

3. **Презентация услуг (product_presentation)**: Рассказал ли о форматах обучения, преимуществах школы, методике, квалификации преподавателей, ответил ли на вопросы клиента.

4. **Работа с возражениями (objection_handling)**: Как отвечал на сомнения о цене, времени, качестве, конкурентах. Использовал ли технику "да, и...", приводил ли аргументы.

5. **Закрытие (closing)**: Предложил ли конкретный следующий шаг (записаться на пробный урок, прийти на встречу), использовал ли альтернативный выбор, получил ли согласие.

КРИТИЧЕСКИ ВАЖНО: Если по итогу разговора нужно что-то сделать (перезвонить клиенту в определённое время, отправить расписание, уточнить наличие мест в группе, связаться с другим родителем, подготовить информацию) - ОБЯЗАТЕЛЬНО укажи это в action_items с приоритетом и примерным сроком.

Приоритеты:
- high: Нужно сделать сегодня/срочно (например, перезвонить в оговоренное время)
- medium: Нужно сделать в ближайшие 1-2 дня
- low: Можно сделать в течение недели

Будь конкретен и конструктивен. Отмечай и сильные стороны, и зоны роста. Резюме должно быть кратким (2-3 предложения), ключевые моменты - до 5 пунктов.`;

const EVALUATION_TOOL = {
  type: "function" as const,
  function: {
    name: "evaluate_call",
    description: "Оценить качество телефонного звонка менеджера по продажам",
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
          description: "Цель звонка (например: запись на пробный урок, консультация по курсам)"
        },
        call_result: { 
          type: "string",
          description: "Результат звонка (например: записан на пробный, отложил решение, отказ)"
        },
        key_points: { 
          type: "array", 
          items: { type: "string" }, 
          maxItems: 5,
          description: "Ключевые моменты разговора (возраст ребенка, интересы, предпочтения по времени)"
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
              deadline: { type: "string", description: "Срок выполнения (опционально)" }
            },
            required: ["task", "priority"]
          },
          description: "Задачи, которые нужно выполнить по итогам звонка"
        }
      },
      required: ["overall_score", "scores", "summary", "call_purpose", "call_result", "key_points", "strengths", "improvements", "action_items"]
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

async function analyzeWithGPT(transcription: string, openaiApiKey: string): Promise<AiCallEvaluation> {
  console.log('[analyze-call] Analyzing transcription with GPT-4o-mini...');
  
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
        { role: 'user', content: `Проанализируй следующую транскрипцию телефонного разговора менеджера с клиентом:\n\n${transcription}` }
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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      console.error('[analyze-call] OPENAI_API_KEY not configured');
      return errorResponse('OpenAI API key not configured', 500);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Get call log with recording URL
    const { data: callLog, error: fetchError } = await supabase
      .from('call_logs')
      .select('id, recording_url, transcription, ai_evaluation, duration_seconds, phone_number, direction, status')
      .eq('id', callId)
      .maybeSingle();
    
    if (fetchError || !callLog) {
      console.error('[analyze-call] Call not found:', fetchError);
      return errorResponse('Call log not found', 404);
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
    
    if (!callLog.recording_url) {
      console.log('[analyze-call] No recording URL for call:', callId);
      return errorResponse('No recording URL available', 400);
    }
    
    console.log('[analyze-call] Processing call with recording:', callLog.recording_url);
    
    // Step 1: Transcribe audio
    let transcription: string;
    if (callLog.transcription) {
      console.log('[analyze-call] Using existing transcription');
      transcription = callLog.transcription;
    } else {
      transcription = await transcribeAudio(callLog.recording_url, openaiApiKey);
      
      // Save transcription immediately
      await supabase
        .from('call_logs')
        .update({ transcription })
        .eq('id', callId);
      
      console.log('[analyze-call] Transcription saved');
    }
    
    if (!transcription || transcription.trim().length < 10) {
      console.log('[analyze-call] Transcription too short, skipping analysis');
      return errorResponse('Transcription too short for meaningful analysis', 400);
    }
    
    // Step 2: Analyze with GPT
    const evaluation = await analyzeWithGPT(transcription, openaiApiKey);
    
    // Step 3: Save evaluation
    const { error: updateError } = await supabase
      .from('call_logs')
      .update({ 
        ai_evaluation: evaluation,
        summary: evaluation.summary
      })
      .eq('id', callId);
    
    if (updateError) {
      console.error('[analyze-call] Error saving evaluation:', updateError);
      throw updateError;
    }
    
    console.log('[analyze-call] Analysis complete. Overall score:', evaluation.overall_score);
    console.log('[analyze-call] Action items:', evaluation.action_items.length);
    
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
