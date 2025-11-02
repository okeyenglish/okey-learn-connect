import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface ProcessDelayedMessageParams {
  clientId: string;
  maxWaitTimeMs?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, maxWaitTimeMs = 30000 }: ProcessDelayedMessageParams = await req.json();
    
    console.log(`Starting delayed GPT response processing for client: ${clientId}`);
    
    // Wait until there is 30 seconds of silence (restart timer on new messages)
    const quietPeriodMs = maxWaitTimeMs;
    const invokedAt = new Date();
    let lastIncomingAt: number | null = null;
    let safetyDeadline = Date.now() + 2 * 60 * 1000; // safety cap: 2 minutes

    while (Date.now() < safetyDeadline) {
      // Get the latest incoming (client) message timestamp
      const { data: latestIncoming, error: latestIncomingError } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('client_id', clientId)
        .eq('is_outgoing', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (latestIncomingError) {
        console.error('Error fetching latest incoming message:', latestIncomingError);
        throw latestIncomingError;
      }

      if (!latestIncoming || latestIncoming.length === 0) {
        // No incoming messages at all – wait once and proceed
        await new Promise((r) => setTimeout(r, quietPeriodMs));
        break;
      }

      lastIncomingAt = new Date(latestIncoming[0].created_at as string).getTime();
      const silenceFor = Date.now() - lastIncomingAt;
      if (silenceFor >= quietPeriodMs) {
        // Quiet period achieved
        break;
      }

      // Sleep only the remaining time (up to 5s chunks)
      const sleepMs = Math.min(quietPeriodMs - silenceFor, 5000);
      await new Promise((r) => setTimeout(r, sleepMs));
    }

    // Use a window that starts from 1 minute before function invocation
    // This ensures we catch all messages that came in recently, including those
    // that triggered this function call
    const windowStartISO = new Date(invokedAt.getTime() - 60 * 1000).toISOString(); // 1 minute back
    const windowEndISO = new Date().toISOString();

    // Get all incoming messages from the window to process them as a batch
    const { data: recentMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_outgoing', false)
      .gte('created_at', windowStartISO)
      .lte('created_at', windowEndISO)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching recent messages:', messagesError);
      throw messagesError;
    }

    if (!recentMessages || recentMessages.length === 0) {
      console.log('No recent messages found for processing');
      return new Response(JSON.stringify({ success: false, message: 'No messages to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${recentMessages.length} recent messages to process`);

    // Process audio messages - transcribe them if needed
    const processedMessages = [];
    for (const message of recentMessages) {
      let messageText = message.message_text;
      
      // Check if this is an audio message and needs transcription
      if ((message.file_type === 'audio' || message.message_type === 'audioMessage' || message.message_type === 'pttMessage') && message.file_url) {
        console.log(`Transcribing audio message: ${message.id}`);
        
        try {
          // Call transcribe-audio function
          const transcriptionResponse = await supabase.functions.invoke('transcribe-audio', {
            body: { audioUrl: message.file_url }
          });
          
          if (transcriptionResponse.data?.text) {
            messageText = `[Аудиосообщение] ${transcriptionResponse.data.text}`;
            console.log(`Successfully transcribed audio: ${transcriptionResponse.data.text}`);
          } else {
            messageText = '[Аудиосообщение - не удалось распознать речь]';
            console.log('Audio transcription failed or returned empty text');
          }
        } catch (transcriptionError) {
          console.error('Error transcribing audio:', transcriptionError);
          messageText = '[Аудиосообщение - ошибка распознавания речи]';
        }
      }
      
      processedMessages.push({
        ...message,
        message_text: messageText
      });
    }

    // If manager has already replied after the recent messages, don't suggest anything
    // Check for manager replies after the most recent client message
    let checkFromTime = windowStartISO;
    if (recentMessages && recentMessages.length > 0) {
      // Use the time of the most recent client message as starting point
      const mostRecentMessage = recentMessages[recentMessages.length - 1];
      checkFromTime = mostRecentMessage.created_at;
    }
    
    const { data: managerReply, error: managerReplyError } = await supabase
      .from('chat_messages')
      .select('id, created_at')
      .eq('client_id', clientId)
      .eq('is_outgoing', true)
      .gte('created_at', checkFromTime)
      .order('created_at', { ascending: false })
      .limit(1);

    if (managerReplyError) {
      console.error('Error checking manager reply:', managerReplyError);
      throw managerReplyError;
    }

    if (managerReply && managerReply.length > 0) {
      console.log('Manager has replied during the waiting window. Skipping suggestion.');
      return new Response(JSON.stringify({ success: false, message: 'Manager replied, skipping suggestion' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use atomic check-and-create to prevent race conditions
    // First check if there's already a pending response being processed
    const { data: existingPending } = await supabase
      .from('pending_gpt_responses')
      .select('id, status, created_at')
      .eq('client_id', clientId)
      .in('status', ['pending', 'processing'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (existingPending && existingPending.length > 0) {
      const existingResponse = existingPending[0];
      const timeSinceCreated = Date.now() - new Date(existingResponse.created_at).getTime();
      
      // If created less than 2 minutes ago, skip to prevent duplicates
      if (timeSinceCreated < 2 * 60 * 1000) {
        console.log('Another pending response exists (created less than 2 min ago), skipping to prevent duplicates:', existingResponse);
        return new Response(JSON.stringify({ success: false, message: 'Already processing response for this client' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Clean up old expired responses
        console.log('Cleaning up expired response:', existingResponse.id);
        await supabase
          .from('pending_gpt_responses')
          .delete()
          .eq('id', existingResponse.id);
      }
    }
    
    try {
      // Try to insert a pending response with atomic check
      const { data: insertResult, error: insertError } = await supabase
        .from('pending_gpt_responses')
        .insert({
          client_id: clientId,
          suggested_response: 'PROCESSING...',
          messages_context: processedMessages,
          original_response: 'PROCESSING...',
          status: 'processing' // Use 'processing' to indicate active work
        })
        .select('id')
        .single();

      if (insertError) {
        console.log('Failed to insert pending response, likely duplicate:', insertError);
        return new Response(JSON.stringify({ success: false, message: 'Duplicate processing prevented' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pendingResponseId = insertResult.id;
      console.log('Created pending response with ID:', pendingResponseId);

      // Get client info for context
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('name, phone')
        .eq('id', clientId)
        .single();

      if (clientError) {
        console.error('Error fetching client:', clientError);
        throw clientError;
      }

    // Get conversation history for context (last 20 messages)
    const { data: contextMessages, error: contextError } = await supabase
      .from('chat_messages')
      .select('message_text, is_outgoing, created_at, file_type, message_type, file_url')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (contextError) {
      console.error('Error fetching context messages:', contextError);
      throw contextError;
    }

    // Process context messages for audio transcription too
    const processedContextMessages = [];
    for (const message of contextMessages || []) {
      let messageText = message.message_text;
      
      // Only transcribe incoming audio messages for context
      if (!message.is_outgoing && (message.file_type === 'audio' || message.message_type === 'audioMessage' || message.message_type === 'pttMessage') && message.file_url) {
        try {
          const transcriptionResponse = await supabase.functions.invoke('transcribe-audio', {
            body: { audioUrl: message.file_url }
          });
          
          if (transcriptionResponse.data?.text) {
            messageText = `[Аудиосообщение] ${transcriptionResponse.data.text}`;
          } else {
            messageText = '[Аудиосообщение]';
          }
        } catch (transcriptionError) {
          console.error('Error transcribing context audio:', transcriptionError);
          messageText = '[Аудиосообщение]';
        }
      }
      
      processedContextMessages.push({
        ...message,
        message_text: messageText
      });
    }

    // Check if we already greeted today
    const today = new Date().toDateString();
    const todaysMessages = processedContextMessages?.filter(msg => {
      const msgDate = new Date(msg.created_at).toDateString();
      return msgDate === today && msg.is_outgoing;
    }) || [];
    
    const alreadyGreetedToday = todaysMessages.some(msg => 
      msg.message_text.toLowerCase().includes('привет') || 
      msg.message_text.toLowerCase().includes('здравствуйте') ||
      msg.message_text.toLowerCase().includes('добрый') ||
      msg.message_text.toLowerCase().includes('доброе')
    );

    // Prepare context for GPT
    const conversationContext = processedContextMessages
      ?.reverse()
      .map(msg => `${msg.is_outgoing ? 'Менеджер' : 'Клиент'}: ${msg.message_text}`)
      .join('\n') || '';

    const newMessages = processedMessages
      .map(msg => `Клиент: ${msg.message_text}`)
      .join('\n');

    // Generate GPT response
    const gptPrompt = `
Вы менеджер школы английского языка "O'KEY ENGLISH". 
Клиент: ${client.name} (${client.phone})
${alreadyGreetedToday ? 'ВАЖНО: Сегодня уже здоровались с клиентом, НЕ здоровайтесь повторно!' : ''}

Контекст предыдущих сообщений:
${conversationContext}

Новые сообщения от клиента:
${newMessages}

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:
1. ВСЕГДА обращайтесь к клиенту на "ВЫ" - никогда не используйте "ты", "тебя", "твой"
2. Используйте только: "Вы", "Вас", "Ваш", "Вашего", "Вашей", "Вами"
3. Вы менеджер школы английского языка O'KEY ENGLISH - общайтесь профессионально
4. НЕ комментируйте факт получения голосовых сообщений/изображений - отвечайте на содержание
5. Предлагайте конкретные программы: Kids Box (3-12 лет), Prepare (12-17 лет), Super Safari (3-6 лет), Empower (взрослые)
6. Обязательно упоминайте бесплатное пробное занятие
7. Предлагайте связаться по телефону для подробностей
8. ОДИН четкий ответ максимум 3-4 предложения
9. НЕ подписывайтесь ("С уважением" и т.п.)
10. Если уже здоровались - сразу к делу
11. На конкретные вопросы давайте конкретные ответы

ПРИМЕРЫ ПРАВИЛЬНОГО ОБРАЩЕНИЯ:
❌ НЕПРАВИЛЬНО: "Курс для детей 7 лет у нас подходит тебе"
✅ ПРАВИЛЬНО: "Курс для детей 7 лет подойдет Вашему ребенку"

❌ НЕПРАВИЛЬНО: "Если у тебя есть вопросы"
✅ ПРАВИЛЬНО: "Если у Вас есть вопросы"

Дайте ОДИН профессиональный ответ от менеджера школы O'KEY ENGLISH на "ВЫ".
`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Вы профессиональный менеджер школы английского языка O\'KEY ENGLISH. КРИТИЧЕСКИ ВАЖНО: ВСЕГДА обращайтесь к клиентам на "ВЫ" - никогда не используйте "ты", "тебя", "твой". Только "Вы", "Вас", "Ваш". Общайтесь кратко и по делу. Предлагайте конкретные решения.' },
          { role: 'user', content: gptPrompt }
        ],
        max_completion_tokens: 200,
      }),
    });

    const gptData = await response.json();
    
    if (gptData.error) {
      console.error('AI Gateway error:', gptData.error);
      throw new Error(`AI Gateway error: ${gptData.error.message}`);
    }
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Превышен лимит запросов к AI. Попробуйте позже.');
      } else if (response.status === 402) {
        throw new Error('Недостаточно средств на балансе Lovable AI.');
      }
    }

    const suggestedResponse = gptData.choices[0].message.content;
    console.log('Generated GPT response:', suggestedResponse);

    // Update the existing pending response with the actual GPT result
    const { data: updatedResponse, error: updateError } = await supabase
      .from('pending_gpt_responses')
      .update({
        suggested_response: suggestedResponse,
        original_response: suggestedResponse,
        status: 'pending', // Change back to pending for user approval
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiry
      })
      .eq('id', pendingResponseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating pending response:', updateError);
      throw updateError;
    }

    console.log('Updated pending GPT response:', pendingResponseId);

    return new Response(JSON.stringify({ 
      success: true, 
      pendingResponseId: pendingResponseId,
      suggestedResponse: suggestedResponse,
      processedMessages: processedMessages.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    } catch (error) {
      console.error('Error in inner try block:', error);
      const message = (error as any)?.message ?? 'Server error';
      return new Response(JSON.stringify({ 
        success: false, 
        error: message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-delayed-gpt-response:', error);
    const message = (error as any)?.message ?? 'Server error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});