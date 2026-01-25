import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors,
  type TranscriptionRequest,
  type TranscriptionResponse 
} from '../_shared/types.ts';

// Extended request with organizationId
interface TranscribeAudioRequest extends TranscriptionRequest {
  organizationId: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json() as TranscribeAudioRequest;
    const { audioUrl, organizationId } = body;
    
    if (!audioUrl) {
      return errorResponse('No audio URL provided', 400);
    }

    if (!organizationId) {
      return errorResponse('organizationId is required', 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Получаем OpenAI API Key из настроек организации
    const { data: aiSettings } = await supabase
      .from('messenger_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'openai')
      .maybeSingle();

    const openaiApiKey = aiSettings?.settings?.openaiApiKey || Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      return errorResponse('OpenAI API key not configured for this organization', 400);
    }

    console.log('Transcribing audio from URL:', audioUrl);

    // Download the audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return errorResponse(`Failed to download audio: ${audioResponse.status}`, 500);
    }

    const audioBlob = await audioResponse.blob();
    console.log('Downloaded audio blob, size:', audioBlob.size);

    // Prepare form data for OpenAI API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ru'); // Russian language for better accuracy

    // Send to OpenAI Whisper API
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('OpenAI API error:', errorText);
      return errorResponse(`OpenAI API error: ${transcriptionResponse.status} - ${errorText}`, 500);
    }

    const transcriptionResult = await transcriptionResponse.json();
    console.log('Transcription result:', transcriptionResult);

    const response: TranscriptionResponse = { 
      success: true,
      text: transcriptionResult.text,
    };
    
    return successResponse(response as unknown as Record<string, unknown>);

  } catch (error: unknown) {
    console.error('Transcription error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
