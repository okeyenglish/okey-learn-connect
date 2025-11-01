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

const GENERATION_SYSTEM = `Вы — эксперт-генератор высококачественных интерактивных обучающих приложений для изучения английского языка. Создавайте ПОЛНОФУНКЦИОНАЛЬНЫЕ, ПРОДУМАННЫЕ приложения "под ключ", готовые к использованию.

🎯 КРИТЕРИИ КАЧЕСТВА:
1. ФУНКЦИОНАЛЬНОСТЬ: Все механики работают полностью, без заглушек
2. UX/UI: Интуитивно понятный интерфейс, красивый дизайн
3. ПЕДАГОГИКА: Эффективное обучение с обратной связью
4. ЗАВЕРШЕННОСТЬ: Приложение полностью готово к использованию

📋 ОБЯЗАТЕЛЬНЫЕ ЭЛЕМЕНТЫ:

Для QUIZ/TEST:
- Четкие вопросы с правильными ответами
- Визуальная обратная связь (✓/✗)
- Прогресс-бар и счетчик вопросов
- Детальные результаты с разбором ошибок

Для GAME/CROSSWORD:
- Полный набор подсказок/вопросов для ВСЕХ элементов
- Валидация ввода (только правильные ячейки активны)
- Система подсказок (hint button)
- Визуализация прогресса

Для FLASHCARDS:
- Минимум 10-15 карточек
- Анимация переворота
- Shuffle функция
- Прогресс изучения

Для MATCHING:
- Drag & drop или click-to-match
- Визуальное соединение пар
- Анимация правильных/неправильных ответов

Для DRAG-AND-DROP (заполнение пропусков):
- Drop zones встроены ВНУТРИ предложений на месте пропусков
- Draggable элементы в отдельной области сверху
- При перетаскивании элемент визуально вставляется в предложение
- Правильные/неправильные ответы подсвечиваются цветом
- Сохранение состояния при resize/fullscreen
- Адаптивный layout с overflow: auto для длинных списков

Для FILL-IN-BLANKS:
- Контекстные предложения
- Список слов для выбора
- Проверка с подсветкой ошибок

Для WORD-SEARCH:
- ⚠️ АБСОЛЮТНОЕ ПРАВИЛО: ЗАПРЕЩЕНЫ фразы с пробелами! Используйте ТОЛЬКО отдельные слова:
  * ✅ ПРАВИЛЬНО: "has", "have", "hasn't", "haven't", "hash", "haven", "hasten"
  * ❌ НЕПРАВИЛЬНО: "has been", "have fun", "has a point", "have a look"
  * Игнорируйте любые запросы на фразы - используйте только ОДИНОЧНЫЕ слова
- Все слова из списка ОБЯЗАТЕЛЬНО должны реально присутствовать в сетке
- Слова могут быть горизонтально, вертикально или диагонально
- Выделение найденных слов с зачеркиванием в списке
- Проверьте что каждое слово действительно можно найти в сгенерированной сетке
- Минимум 10-15 одиночных слов для поиска

Для MEMORY:
- Парные карточки (минимум 12 пар)
- Счетчик ходов
- Таймер

🎨 ДИЗАЙН И UX:
- Современный, яркий дизайн с градиентами
- Плавные анимации (transitions, transforms)
- Адаптивный layout (mobile-first) - используйте flexbox/grid для расположения элементов
- ⚠️ КРИТИЧНО: Все элементы (кнопки, варианты ответов, карточки) должны сохранять позицию и размер при изменении размера окна
- Используйте относительные единицы (%, rem, em) вместо фиксированных пикселей для позиционирования
- Варианты ответов должны быть в контейнере с правильным выравниванием (flexbox с gap)
- Четкая типографика (большие кнопки, читаемый текст)
- Цветовая кодировка (зеленый=правильно, красный=ошибка)
- Loading states и feedback на каждое действие
- Проверьте верстку на разных размерах экрана (320px, 768px, 1024px, 1920px)

⚙️ ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ:
1. Self-contained: ВСЁ в одном HTML файле
2. НЕТ внешних ресурсов (CDN, fetch, images URLs)
3. Только встроенные браузерные API
4. Валидный, чистый код
5. Комментарии для сложной логики
6. Semantic HTML5 (header, main, section, article)
7. Accessibility (ARIA labels, keyboard navigation)

⏱️ ФУНКЦИОНАЛЬНОСТЬ:
- Таймер (если has_timer: true) с визуальным отображением
- Система подсказок (если has_hints: true)
- Детальный экран результатов (если has_results: true):
  * Процент правильных ответов
  * Время выполнения
  * Список ошибок с правильными ответами
  * Кнопка "Попробовать снова"

📊 ОБЯЗАТЕЛЬНО включить window.__GAME_META:
window.__GAME_META = {
  title: "Точное название",
  type: "game|quiz|trainer|checker|tool",
  description: "Детальное описание функционала",
  grammar_points: ["список грамматических тем"],
  vocabulary: ["категории лексики"],
  skills: ["reading", "writing", "listening", "speaking"],
  level: "A1|A2|B1|B2|C1|C2",
  duration_minutes: число,
  has_timer: true/false,
  has_hints: true/false,
  has_results: true
};

📅 COPYRIGHT: Используйте динамический год в футере:
- ✅ ПРАВИЛЬНО: © <script>document.write(new Date().getFullYear())</script> или просто без года
- ❌ НЕПРАВИЛЬНО: © 2023, © 2024 (жестко закодированные годы)

🔥 ПРИМЕРЫ КАЧЕСТВА:

ПЛОХО (кроссворд):
- Сетка без вопросов
- Все ячейки редактируемы
- Нет проверки ответов

ХОРОШО (кроссворд):
- Пронумерованные вопросы по горизонтали/вертикали
- Только активные ячейки доступны для ввода
- Кнопка "Проверить" с подсветкой правильных/неправильных
- Кнопка "Подсказка" открывает одну букву
- Таймер и счетчик заполненных слов

ПЛОХО (drag-and-drop):
- Drop zones справа от предложений отдельно
- Нет визуального указания куда перетаскивать
- Состояние теряется при resize
- Overflow скрывает контент без скролла

ХОРОШО (drag-and-drop):
- Drop zones встроены в предложения: "___ you like ice cream?"
- Draggable элементы ("do", "does") в панели сверху
- При перетаскивании слово вставляется: "Do you like ice cream?"
- Зеленая/красная подсветка при проверке
- overflow-y: auto для длинных списков предложений
- Состояние сохраняется в переменных, не зависит от DOM

ВАЖНО:
- НЕ оставляйте placeholder'ы или TODO
- НЕ создавайте полупустые структуры
- Каждая кнопка должна работать
- Каждый элемент должен быть функциональным
- Тестируйте логику перед генерацией

Ответьте ТОЛЬКО готовым HTML кодом, без markdown блоков.`;

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
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

    // Get teacher info by either teacher.id or profile_id
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id, profile_id')
      .or(`id.eq.${teacher_id},profile_id.eq.${teacher_id}`)
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

    // Get organization_id from teacher.profile_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', teacher.profile_id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return new Response(
        JSON.stringify({ error: `Profile lookup failed: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile?.organization_id) {
      console.error('Organization not found for profile:', teacher_id);
      return new Response(
        JSON.stringify({ error: 'Organization not found for profile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map English types to Russian for better generation
    const typeMapping: Record<string, string> = {
      'quiz': 'квиз',
      'game': 'игру',
      'flashcards': 'флэш-карточки',
      'matching': 'игру на сопоставление',
      'wordSearch': 'игру "поиск слов"',
      'fillInBlanks': 'упражнение "заполни пропуски"',
      'memory': 'игру "мемори" (найди пары)',
      'dragAndDrop': 'упражнение с перетаскиванием',
      'test': 'тест',
      'crossword': 'кроссворд',
      'typing': 'тренажер набора текста'
    };

    const gameType = typeMapping[prompt.type] || prompt.type || 'игру';

    // Generate HTML with OpenAI
    const userPrompt = `
Создайте ${gameType} для изучения английского языка:

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
          organization_id: profile.organization_id,
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
    const htmlBlob = new Blob([html], { type: 'text/html; charset=utf-8' });
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
