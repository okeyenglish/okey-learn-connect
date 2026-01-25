import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  type AIChatResponse 
} from '../_shared/types.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, audio, consultantType, systemPrompt, organizationId } = await req.json();
    
    if (!consultantType) {
      throw new Error('consultantType is required');
    }

    if (!organizationId) {
      throw new Error('organizationId is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userMessage = message;

    // Если есть аудио, сначала транскрибируем его с помощью OpenAI Whisper
    if (audio) {
      try {
        // Получаем OpenAI API Key из настроек организации
        const { data: aiSettings } = await supabase
          .from('messenger_settings')
          .select('settings')
          .eq('organization_id', organizationId)
          .eq('messenger_type', 'openai')
          .maybeSingle();

        const openaiApiKey = aiSettings?.settings?.openaiApiKey || Deno.env.get('OPENAI_API_KEY');
        
        if (!openaiApiKey) {
          throw new Error('OpenAI API key not configured for transcription');
        }

        const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
        const formData = new FormData();
        const blob = new Blob([binaryAudio], { type: 'audio/webm' });
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');

        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
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

    const response: AIChatResponse = { 
      success: true,
      response: aiResponse,
    };
    
    if (audio) {
      (response as AIChatResponse & { transcription?: string }).transcription = userMessage;
    }
    
    return successResponse(response);

  } catch (error: unknown) {
    console.error('Error in ai-consultant function:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
