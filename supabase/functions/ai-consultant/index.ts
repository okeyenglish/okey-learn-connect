import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { 
  corsHeaders, 
  handleCors,
  successResponse, 
  errorResponse,
  getErrorMessage,
  type AIChatRequest,
  type AIChatResponse,
} from '../_shared/types.ts';

interface ConsultantRequest extends AIChatRequest {
  consultantType: string;
  organizationId: string;
  audio?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json() as ConsultantRequest;
    const { message, audio, consultantType, systemPrompt, organizationId } = body;
    
    if (!consultantType) {
      return errorResponse('consultantType is required', 400);
    }

    if (!organizationId) {
      return errorResponse('organizationId is required', 400);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return errorResponse('LOVABLE_API_KEY is not configured', 500);
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

        const openaiApiKey = (aiSettings?.settings as Record<string, unknown>)?.openaiApiKey || Deno.env.get('OPENAI_API_KEY');
        
        if (!openaiApiKey) {
          return errorResponse('OpenAI API key not configured for transcription', 400);
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
          return errorResponse(`Transcription error: ${transcriptionResponse.status}`, 500);
        }

        const transcription = await transcriptionResponse.json();
        userMessage = transcription.text;
        console.log('Transcribed text:', userMessage);
      } catch (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        return errorResponse('Ошибка распознавания речи', 500);
      }
    }

    if (!userMessage) {
      return errorResponse('No message or audio provided', 400);
    }

    // Вызов Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return errorResponse('Rate limits exceeded, please try again later.', 429);
      }
      if (aiResponse.status === 402) {
        return errorResponse('Payment required, please add funds to your Lovable AI workspace.', 402);
      }
      
      return errorResponse(`AI Gateway error: ${aiResponse.status}`, 500);
    }

    const data = await aiResponse.json();
    const responseText = data.choices?.[0]?.message?.content || 'Извините, не могу ответить на этот вопрос.';

    const result: AIChatResponse = { 
      success: true,
      response: responseText,
    };
    
    if (audio) {
      (result as AIChatResponse & { transcription?: string }).transcription = userMessage;
    }
    
    return successResponse(result);

  } catch (error: unknown) {
    console.error('Error in ai-consultant function:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
