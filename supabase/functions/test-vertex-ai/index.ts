import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAIAdapter } from "../_shared/ai-adapter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, test_type = 'text', provider } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Создаем адаптер (автоматически выбирается из ENV или можно указать явно)
    const adapter = createAIAdapter(provider ? { provider } : undefined);
    
    console.log('Using AI provider:', Deno.env.get('AI_PROVIDER') || 'gateway');
    console.log('Test type:', test_type);

    let result;

    switch (test_type) {
      case 'text':
        // Тест генерации текста
        result = await adapter.generateText({
          prompt,
          systemPrompt: 'Вы полезный AI ассистент. Отвечайте кратко и по делу.',
          maxTokens: 500
        });
        break;

      case 'image':
        // Тест генерации изображения
        result = await adapter.generateImage({
          prompt,
          width: 1024,
          height: 1024
        });
        break;

      case 'embedding':
        // Тест генерации эмбеддингов
        result = await adapter.generateEmbedding(prompt);
        break;

      default:
        throw new Error(`Unknown test type: ${test_type}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        provider: Deno.env.get('AI_PROVIDER') || 'gateway',
        test_type,
        result,
        prompt
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Test Vertex AI error:', error);
    
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let status = 500;

    // Обработка специфичных ошибок
    if (errorMessage.includes('GCP_PROJECT_ID')) {
      errorMessage = 'GCP_PROJECT_ID не настроен. Добавьте секрет в настройках Supabase.';
      status = 500;
    } else if (errorMessage.includes('GOOGLE_APPLICATION_CREDENTIALS_JSON')) {
      errorMessage = 'GOOGLE_APPLICATION_CREDENTIALS_JSON не настроен. Добавьте секрет в настройках Supabase.';
      status = 500;
    } else if (errorMessage.includes('LOVABLE_API_KEY')) {
      errorMessage = 'LOVABLE_API_KEY не настроен для gateway провайдера.';
      status = 500;
    } else if (errorMessage.includes('OAuth')) {
      errorMessage = 'Ошибка OAuth аутентификации с Google Cloud. Проверьте GOOGLE_APPLICATION_CREDENTIALS_JSON.';
      status = 401;
    } else if (errorMessage.includes('429')) {
      errorMessage = 'Превышен лимит запросов к AI API.';
      status = 429;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status
      }
    );
  }
});
