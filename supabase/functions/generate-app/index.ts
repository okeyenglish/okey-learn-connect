import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENERATION_SYSTEM = `Вы — генератор интерактивных обучающих мини-приложений для изучения английского языка.

ЗАДАЧА: Создать полностью самостоятельное HTML приложение (game/trainer/checker/tool).

ТРЕБОВАНИЯ К HTML:
1. Self-contained: все стили, скрипты и данные внутри одного файла
2. Никаких внешних CDN, fetch запросов, WebSocket или внешних ресурсов
3. Адаптивный дизайн (mobile-first)
4. Яркий, привлекательный UI с плавными анимациями
5. Доступность (aria-labels, semantic HTML)
6. Обязательно включить window.__GAME_META объект с метаданными

СТРУКТУРА window.__GAME_META:
window.__GAME_META = {
  title: "Название приложения",
  type: "game", // или "trainer", "checker", "tool"
  description: "Краткое описание",
  grammar_points: ["present simple", "do/does"],
  vocabulary: ["daily routines", "hobbies"],
  skills: ["speaking", "reading", "writing", "listening"],
  level: "A1",
  duration_minutes: 10,
  has_timer: true,
  has_hints: false,
  has_results: true
};

ВАЖНО:
- Используйте только встроенные браузерные API
- Код должен быть чистым и понятным
- Добавьте инструкции для преподавателя в начале
- Включите простую статистику/результаты в конце игры

Ответьте ТОЛЬКО HTML кодом, без markdown блоков.`;

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: text.slice(0, 8000)
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}

function extractMeta(html: string): any {
  const metaMatch = html.match(/window\.__GAME_META\s*=\s*({[\s\S]*?});/);
  if (metaMatch) {
    try {
      return JSON.parse(metaMatch[1]);
    } catch (e) {
      console.error('Failed to parse meta:', e);
    }
  }
  return {};
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teacher_id, prompt, app_id } = await req.json();
    console.log('Generate app request:', { teacher_id, prompt, app_id });

    if (!teacher_id || !prompt) {
      console.error('Missing required fields:', { teacher_id, prompt });
      return new Response(
        JSON.stringify({ error: 'teacher_id and prompt are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get teacher info
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('profile_id', teacher_id)
      .maybeSingle();

    if (teacherError) {
      console.error('Teacher lookup error:', teacherError);
      return new Response(
        JSON.stringify({ error: `Teacher lookup failed: ${teacherError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!teacher) {
      console.error('Teacher not found for profile_id:', teacher_id);
      return new Response(
        JSON.stringify({ error: 'Teacher profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate HTML with OpenAI
    const userPrompt = `
Создайте ${prompt.type || 'game'} для изучения английского языка:

Название: ${prompt.title || 'Educational App'}
Уровень: ${prompt.level || 'A1-B1'}
Длительность: ${prompt.duration || 10} минут
Описание: ${prompt.brief}

Дополнительные требования:
${prompt.features ? prompt.features.map((f: string) => `- ${f}`).join('\n') : ''}

Сделайте приложение интересным, интерактивным и полезным для практики английского языка.
`;

    console.log('Calling OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: GENERATION_SYSTEM },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    let html = aiData.choices[0].message?.content || '';
    console.log('Generated HTML length:', html.length);

    // Remove markdown code blocks if present
    html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '');

    // Extract metadata
    const meta = extractMeta(html);

    // Create or update app
    let appData;
    let version = 1;

    if (app_id) {
      // Update existing app
      const { data: existingApp } = await supabase
        .from('apps')
        .select('latest_version')
        .eq('id', app_id)
        .single();

      version = (existingApp?.latest_version || 0) + 1;

      await supabase
        .from('apps')
        .update({ 
          latest_version: version,
          updated_at: new Date().toISOString()
        })
        .eq('id', app_id);

      appData = { id: app_id };
    } else {
      // Create new app
      const title = meta.title || prompt.title || 'Untitled App';
      const description = prompt.description || meta.description || prompt.brief || 'No description provided';
      const embedding = await getEmbedding(`${title} ${description}`);

      const { data: newApp, error: appError } = await supabase
        .from('apps')
        .insert({
          author_id: teacher.id,
          title,
          kind: prompt.type || 'game',
          description,
          level: prompt.level || meta.level || 'A1',
          status: 'draft',
          embedding
        })
        .select()
        .single();

      if (appError) throw appError;
      appData = newApp;
    }

    // Save HTML to storage
    const fileName = `${appData.id}/${version}/index.html`;
    const { error: uploadError } = await supabase.storage
      .from('apps')
      .upload(fileName, html, {
        contentType: 'text/html',
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
        app_id: appData.id,
        version,
        prompt,
        model: 'gpt-4o',
        artifact_path: fileName,
        preview_url: urlData.publicUrl,
        meta
      });

    return new Response(
      JSON.stringify({
        app_id: appData.id,
        version,
        preview_url: urlData.publicUrl,
        meta
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-app:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
