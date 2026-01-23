import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IMPROVEMENT_SYSTEM = `Вы — эксперт по улучшению интерактивных обучающих приложений.

ЗАДАЧА: Улучшить существующее HTML приложение согласно запросу пользователя.

ТРЕБОВАНИЯ:
1. Сохранить всю работающую функциональность
2. Добавить запрошенные улучшения
3. Сохранить self-contained структуру (никаких внешних зависимостей)
4. Обновить window.__GAME_META если нужно
5. Улучшить код, если видите проблемы

ВАЖНО:
- Отвечайте ТОЛЬКО улучшенным HTML кодом
- Код должен быть полностью рабочим
- Не используйте markdown блоки
- Сохраняйте стиль и дизайн оригинала`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { app_id, improvement_request, teacher_id } = await req.json();

    if (!app_id || !improvement_request || !teacher_id) {
      return new Response(
        JSON.stringify({ error: 'app_id, improvement_request, and teacher_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current app and latest version
    const { data: app } = await supabase
      .from('apps')
      .select('*, app_versions(*)')
      .eq('id', app_id)
      .single();

    if (!app) {
      return new Response(
        JSON.stringify({ error: 'App not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current HTML
    const latestVersion = app.app_versions.sort((a: any, b: any) => b.version - a.version)[0];
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('apps')
      .download(latestVersion.artifact_path);

    if (downloadError) throw downloadError;
    const currentHtml = await fileData.text();

    // Generate improved version
    const userPrompt = `
Текущий HTML код приложения:

${currentHtml}

Запрос на улучшение: ${improvement_request}

Пожалуйста, улучшите приложение согласно запросу, сохраняя всю работающую функциональность.
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
          { role: 'system', content: IMPROVEMENT_SYSTEM },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      
      if (response.status === 429) {
        throw new Error('Превышен лимит запросов к AI. Попробуйте позже.');
      } else if (response.status === 402) {
        throw new Error('Недостаточно средств на балансе Lovable AI.');
      }
      
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const aiData = await response.json();
    let improvedHtml = aiData.choices[0].message?.content || '';

    // Remove markdown code blocks if present
    improvedHtml = improvedHtml.replace(/```html\n?/g, '').replace(/```\n?/g, '');

    // Extract metadata
    const metaMatch = improvedHtml.match(/window\.__GAME_META\s*=\s*({[\s\S]*?});/);
    let meta = {};
    if (metaMatch) {
      try {
        meta = JSON.parse(metaMatch[1]);
      } catch (e) {
        console.error('Failed to parse meta:', e);
      }
    }

    // Increment version
    const newVersion = app.latest_version + 1;

    // Update app
    await supabase
      .from('apps')
      .update({ 
        latest_version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('id', app_id);

    // Save new HTML to storage
    const fileName = `${app_id}/${newVersion}/index.html`;
    const htmlBlob = new Blob([improvedHtml], { type: 'text/html; charset=utf-8' });
    const { error: uploadError } = await supabase.storage
      .from('apps')
      .upload(fileName, htmlBlob, {
        contentType: 'text/html; charset=utf-8',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('apps')
      .getPublicUrl(fileName);

    // Save version
    await supabase
      .from('app_versions')
      .insert({
        app_id,
        version: newVersion,
        prompt: { improvement_request },
        model: 'google/gemini-2.5-flash',
        artifact_path: fileName,
        preview_url: urlData.publicUrl,
        meta
      });

    return new Response(
      JSON.stringify({
        app_id,
        version: newVersion,
        preview_url: urlData.publicUrl,
        meta,
        message: 'App improved successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in improve-app:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
