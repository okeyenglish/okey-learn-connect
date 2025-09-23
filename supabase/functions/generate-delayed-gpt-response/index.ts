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
    
    // Wait for the specified delay to collect all messages
    await new Promise(resolve => setTimeout(resolve, maxWaitTimeMs));
    
    // Get the latest unprocessed messages from the last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - maxWaitTimeMs);
    
    const { data: recentMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_outgoing', false)
      .gte('created_at', thirtySecondsAgo.toISOString())
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

    // Get conversation history for context (last 10 messages)
    const { data: contextMessages, error: contextError } = await supabase
      .from('chat_messages')
      .select('message_text, is_outgoing, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (contextError) {
      console.error('Error fetching context messages:', contextError);
      throw contextError;
    }

    // Prepare context for GPT
    const conversationContext = contextMessages
      ?.reverse()
      .map(msg => `${msg.is_outgoing ? 'Менеджер' : 'Клиент'}: ${msg.message_text}`)
      .join('\n') || '';

    const newMessages = recentMessages
      .map(msg => `Клиент: ${msg.message_text}`)
      .join('\n');

    // Generate GPT response
    const gptPrompt = `
Ты помощник менеджера в школе английского языка "OK English". 
Клиент: ${client.name} (${client.phone})

Контекст предыдущих сообщений:
${conversationContext}

Новые сообщения от клиента, которые нужно обработать:
${newMessages}

Создай профессиональный, дружелюбный ответ на русском языке. 
Учти все новые сообщения в одном связном ответе.
Будь вежливым, информативным и готовым помочь.
Если клиент задает вопросы о расписании, ценах или программах, предложи связаться с менеджером для детальной консультации.
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
          { role: 'system', content: 'Ты профессиональный менеджер школы английского языка.' },
          { role: 'user', content: gptPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
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
        messages_context: recentMessages,
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
      processedMessages: recentMessages.length
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