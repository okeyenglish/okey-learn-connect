import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Получаем текущую настройку провайдера из БД
    const { data: providerData, error: providerError } = await supabase
      .rpc('get_ai_provider_setting');

    if (providerError) {
      console.error('Error getting AI provider:', providerError);
      throw providerError;
    }

    // Проверяем ENV переменную (приоритет выше БД)
    const envProvider = Deno.env.get('AI_PROVIDER');
    const provider = envProvider || providerData || 'gateway';

    // Проверяем доступность секретов для Vertex AI
    const hasVertexSecrets = !!(
      Deno.env.get('GCP_PROJECT_ID') &&
      Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON')
    );

    return new Response(
      JSON.stringify({
        provider,
        source: envProvider ? 'env' : 'database',
        hasVertexSecrets,
        availableProviders: [
          {
            value: 'gateway',
            label: 'Lovable AI Gateway',
            description: 'Google Gemini через Lovable (по умолчанию)',
            available: true
          },
          {
            value: 'vertex',
            label: 'Vertex AI Direct',
            description: 'Прямое подключение к Google Cloud Vertex AI',
            available: hasVertexSecrets
          }
        ]
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Get AI provider error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
