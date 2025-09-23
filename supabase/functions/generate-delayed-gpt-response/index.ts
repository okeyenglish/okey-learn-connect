import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

    const windowStartISO = invokedAt.toISOString();
    const windowEndISO = new Date().toISOString();

    // Get the incoming messages collected during the quiet window
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

    // If manager has already replied after invocation, don't suggest anything
    const { data: managerReply, error: managerReplyError } = await supabase
      .from('chat_messages')
      .select('id, created_at')
      .eq('client_id', clientId)
      .eq('is_outgoing', true)
      .gte('created_at', windowStartISO)
      .lte('created_at', windowEndISO)
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

    // Check for ANY pending suggestion for this client to avoid duplicates
    const { data: existingPending, error: existingPendingError } = await supabase
      .from('pending_gpt_responses')
      .select('id, created_at')
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString()) // Not expired
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingPendingError) {
      console.error('Error checking existing pending suggestion:', existingPendingError);
      throw existingPendingError;
    }

    if (existingPending && existingPending.length > 0) {
      console.log('Pending suggestion already exists for this client. Skipping duplicate.');
      return new Response(JSON.stringify({ success: true, message: 'Pending suggestion already exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Double check - if a pending suggestion exists for this client in the last 5 minutes, skip
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentPending, error: recentPendingError } = await supabase
      .from('pending_gpt_responses')
      .select('id, created_at')
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentPendingError) {
      console.error('Error checking recent pending suggestions:', recentPendingError);
      throw recentPendingError;
    }

    if (recentPending && recentPending.length > 0) {
      console.log('Recent pending suggestion exists (last 5 minutes). Avoiding spam.');
      return new Response(JSON.stringify({ success: true, message: 'Recent pending suggestion exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
Ты менеджер школы английского языка "OK English". 
Клиент: ${client.name} (${client.phone})
${alreadyGreetedToday ? 'ВАЖНО: Сегодня уже здоровались с клиентом, НЕ здоровайся повторно!' : ''}

Контекст предыдущих сообщений:
${conversationContext}

Новые сообщения от клиента:
${newMessages}

Отвечай как обычный сотрудник школы, простым человеческим языком:
- НЕ подписывайся ("С уважением, команда OK English" и т.п.)
- Говори от первого лица как сотрудник школы
- Будь дружелюбным, но естественным
- Максимум 3-4 предложения
- Если уже здоровались сегодня - сразу к делу
- На конкретные вопросы давай конкретные ответы
- Предлагай связаться по телефону для деталей
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты обычный сотрудник школы английского языка. Отвечаешь естественно, по-человечески, как живой человек. Никаких формальностей и подписей.' },
          { role: 'user', content: gptPrompt }
        ],
        temperature: 0.4,
        max_tokens: 300,
      }),
    });

    const gptData = await response.json();
    
    if (gptData.error) {
      console.error('OpenAI API error:', gptData.error);
      throw new Error(`OpenAI API error: ${gptData.error.message}`);
    }

    const suggestedResponse = gptData.choices[0].message.content;
    console.log('Generated GPT response:', suggestedResponse);

    // Save the suggested response to pending_gpt_responses table
    const { data: pendingResponse, error: saveError } = await supabase
      .from('pending_gpt_responses')
      .insert({
        client_id: clientId,
        messages_context: processedMessages,
        suggested_response: suggestedResponse,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiry
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving pending response:', saveError);
      throw saveError;
    }

    console.log('Saved pending GPT response:', pendingResponse.id);

    return new Response(JSON.stringify({ 
      success: true, 
      pendingResponseId: pendingResponse.id,
      suggestedResponse: suggestedResponse,
      processedMessages: processedMessages.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-delayed-gpt-response:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});