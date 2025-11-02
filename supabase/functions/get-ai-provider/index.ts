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

    // Получаем authorization header для определения пользователя
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Создаем клиент с токеном пользователя для получения user_id
    const token = authHeader.replace('Bearer ', '');
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Получаем organization_id пользователя
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    let providerData = 'gateway'; // default

    if (profile?.organization_id) {
      // Получаем настройку AI провайдера из БД
      const { data: settingData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('organization_id', profile.organization_id)
        .eq('setting_key', 'ai_provider')
        .maybeSingle();

      if (settingData?.setting_value) {
        providerData = (settingData.setting_value as any).provider || 'gateway';
      }
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
