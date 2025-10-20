import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, audio, consultantType, systemPrompt } = await req.json();
    
    if (!consultantType) {
      throw new Error('consultantType is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let userMessage = message;

    // Если есть аудио, сначала транскрибируем его с помощью OpenAI Whisper
    if (audio) {
      try {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY is not configured');
        }

        const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
        const formData = new FormData();
        const blob = new Blob([binaryAudio], { type: 'audio/webm' });
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');

        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: formData,
        });

        if (!transcriptionResponse.ok) {
          const errorText = await transcriptionResponse.text();
          console.error('Transcription error:', transcriptionResponse.status, errorText);
          throw new Error(`Transcription error: ${transcriptionResponse.status}`);
        }

        const transcription = await transcriptionResponse.json();
        userMessage = transcription.text;
        console.log('Transcribed text:', userMessage);
      } catch (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        throw new Error('Ошибка распознавания речи');
      }
    }

    if (!userMessage) {
      throw new Error('No message or audio provided');
    }

    // Вызов Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'Ты опытный консультант. Отвечай профессионально и по делу.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Извините, не могу ответить на этот вопрос.';

    return new Response(
      JSON.stringify({ 
        success: true,
        response: aiResponse,
        transcription: audio ? userMessage : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in ai-consultant function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});