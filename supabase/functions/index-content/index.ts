import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== STARTING CONTENT INDEXING ===');
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:');
    console.log('- OPENAI_API_KEY:', !!OPENAI_API_KEY);
    console.log('- SUPABASE_URL:', !!SUPABASE_URL);
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: "Missing configuration" }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Полный контент сайта для индексации
    const siteContent = [
      {
        url: "/",
        title: "Главная страница O'KEY ENGLISH",
        content: `O'KEY ENGLISH - школа английского языка в Москве. Мы предлагаем курсы английского языка для детей и взрослых. 
        Наши программы: Kids Box для детей 4-7 лет, Super Safari для малышей 3-6 лет, Prepare для подростков 11-17 лет, Empower для взрослых.
        9 филиалов в Москве: Котельники, Люберцы, Мытищи, Новокосино, Окская, Солнцево, Стахановская, онлайн обучение.
        Квалифицированные преподаватели, современные методики, индивидуальный подход.`
      },
      {
        url: "/courses",
        title: "Курсы английского языка",
        content: `Курсы английского в O'KEY ENGLISH:
        Kids Box (4-7 лет) - основная программа для дошкольников и младших школьников. Игровая форма обучения, развитие всех языковых навыков.
        Super Safari (3-6 лет) - программа для самых маленьких. Веселые уроки с песнями, играми и творчеством.
        Prepare (11-17 лет) - курс для подростков с подготовкой к международным экзаменам. Современные темы, развитие критического мышления.
        Empower (взрослые) - курс для взрослых студентов. Практическая направленность, бизнес-английский, подготовка к IELTS/TOEFL.
        Все курсы включают: учебные материалы Cambridge, интерактивные занятия, контроль прогресса, сертификаты.`
      },
      {
        url: "/programs",
        title: "Программы обучения",
        content: `Программы O'KEY ENGLISH разработаны для разных возрастных групп:
        - Super Safari: для детей 3-6 лет, игровая методика
        - Kids Box: для детей 4-7 лет, базовый английский
        - Prepare: для подростков 11-17 лет, подготовка к экзаменам
        - Empower: для взрослых, практический английский`
      },
      {
        url: "/programs/supersafari",
        title: "Super Safari - для детей 3-6 лет",
        content: `Super Safari - программа для самых маленьких студентов (3-6 лет).
        Особенности: игровая форма, песни, танцы, творчество, развитие моторики.
        Результат: базовые слова, понимание команд, любовь к английскому.
        Длительность урока: 30-45 минут. Группы до 6 человек.`
      },
      {
        url: "/programs/kidsbox",
        title: "Kids Box - для детей 4-7 лет",
        content: `Kids Box - основная программа для дошкольников и младших школьников (4-7 лет).
        Включает: чтение, письмо, говорение, аудирование. Учебники Cambridge.
        Уровни: Starter, Level 1-6. Подготовка к школе.
        Группы до 8 человек, длительность урока 45-60 минут.`
      },
      {
        url: "/programs/prepare",
        title: "Prepare - для подростков 11-17 лет",
        content: `Prepare - курс для подростков 11-17 лет с подготовкой к международным экзаменам.
        Уровни: A1-C1. Подготовка к ОГЭ, ЕГЭ, Cambridge экзаменам.
        Современные темы, критическое мышление, проектная работа.
        Группы до 10 человек, урок 90 минут.`
      },
      {
        url: "/programs/empower",
        title: "Empower - для взрослых",
        content: `Empower - курс для взрослых студентов от 18 лет.
        Направления: общий английский, бизнес-английский, подготовка к IELTS/TOEFL.
        Практическая направленность, реальные ситуации общения.
        Гибкое расписание, группы и индивидуальные занятия.`
      },
      {
        url: "/branches",
        title: "Филиалы O'KEY ENGLISH",
        content: `9 филиалов O'KEY ENGLISH в Москве:
        Котельники, Люберцы (2 филиала), Мытищи, Новокосино, Окская, Солнцево, Стахановская, Онлайн.
        Все филиалы оборудованы современной техникой, имеют удобное расположение рядом с метро.`
      },
      {
        url: "/branches/kotelniki",
        title: "Филиал в Котельниках",
        content: `Филиал O'KEY ENGLISH в Котельниках. Адрес: 2-й Покровский проезд, 14к2.
        Рядом с метро Котельники. Современные классы, интерактивные доски.
        Программы: все возрасты от 3 до взрослых. Удобная парковка.`
      },
      {
        url: "/branches/novokosino",
        title: "Филиал в Новокосино",
        content: `Филиал O'KEY ENGLISH в Новокосино. Адрес: Суздальская ул., 18к1.
        Рядом с метро Новокосино. Просторные аудитории, библиотека.
        Все программы, группы и индивидуальные занятия.`
      },
      {
        url: "/branches/okskaya",
        title: "Филиал на Окской",
        content: `Филиал O'KEY ENGLISH на Окской. Адрес: Окская ул., 5.
        Тихое место для концентрации на учебе. Современное оборудование.
        Специализация: детские программы и подготовка к экзаменам.`
      },
      {
        url: "/branches/stakhanovskaya", 
        title: "Филиал на Стахановской",
        content: `Филиал O'KEY ENGLISH на Стахановской. Адрес: ул. Стахановская, 24.
        Удобная транспортная доступность. Большие классы.
        Все программы, корпоративное обучение.`
      },
      {
        url: "/branches/solntsevo",
        title: "Филиал в Солнцево",
        content: `Филиал O'KEY ENGLISH в Солнцево. Адрес: Солнцевский пр-т, 25.
        Современное оснащение, зоны отдыха. Парковка.
        Специализация: взрослые программы и бизнес-английский.`
      },
      {
        url: "/branches/mytishchi",
        title: "Филиал в Мытищах",
        content: `Филиал O'KEY ENGLISH в Мытищах. Адрес: ул. Мира, 2/22.
        Центр города, новое оборудование. Интерактивные классы.
        Все возрастные программы, подготовка к экзаменам.`
      },
      {
        url: "/branches/lyubertsy-1",
        title: "Филиал Люберцы-1",
        content: `Филиал O'KEY ENGLISH Люберцы-1. Адрес: Октябрский проспект, 151.
        Просторные аудитории, удобная парковка. Библиотека.
        Семейное обучение, скидки для семей.`
      },
      {
        url: "/branches/lyubertsy-2",
        title: "Филиал Люберцы-2 (Красная горка)",
        content: `Филиал O'KEY ENGLISH Люберцы-2 (Красная горка). Адрес: ул. 3-е Почтовое отделение, 90.
        Уютная атмосфера, небольшие группы. Индивидуальный подход.
        Специализация: детские программы Super Safari и Kids Box.`
      },
      {
        url: "/branches/online",
        title: "Онлайн обучение",
        content: `Онлайн обучение в O'KEY ENGLISH. Дистанционные занятия с живым преподавателем.
        Платформы: Zoom, Skype. Интерактивные материалы.
        Скидка 20% на групповые занятия. Гибкое расписание.
        Все программы доступны онлайн.`
      },
      {
        url: "/teachers",
        title: "Преподаватели O'KEY ENGLISH",
        content: `Команда преподавателей O'KEY ENGLISH:
        - Высшее педагогическое образование
        - Сертификаты CELTA, TESOL, TKT
        - Опыт работы от 3 лет
        - Носители языка и русскоязычные специалисты
        - Регулярное повышение квалификации
        Создают дружелюбную атмосферу, мотивируют студентов.`
      },
      {
        url: "/pricing",
        title: "Цены на обучение",
        content: `Стоимость обучения в O'KEY ENGLISH:
        Групповые занятия: от 800 руб/урок (8 занятий - 6400 руб, 12 занятий - 9600 руб)
        Индивидуальные: от 1200 руб/урок (пакет 8 уроков - 9600 руб)
        Онлайн: скидка 20%, индивидуальные от 1000 руб
        Включено: материалы, тестирование, сертификат
        Скидки: семейная 10%, корпоративная, при оплате за полгода`
      },
      {
        url: "/about",
        title: "О школе O'KEY ENGLISH",
        content: `O'KEY ENGLISH работает с 2015 года. Обучили более 5000 студентов.
        Миссия: сделать английский доступным и увлекательным.
        Преимущества: современные методики, интерактивность, индивидуальный подход, удобное расписание, квалифицированные преподаватели, доступные цены.
        Коммуникативная методика для быстрого результата.`
      },
      {
        url: "/contacts",
        title: "Контакты O'KEY ENGLISH",
        content: `Контакты школы O'KEY ENGLISH:
        Телефон: +7 (499) 707-35-35
        Email: info@okeyenglish.ru
        WhatsApp: +7 (993) 707-35-53
        Telegram: @okeyenglish_support
        Часы работы: Пн-Пт 10:00-21:00, Сб-Вс 10:00-18:00
        Запись на пробный урок по телефону или в мессенджерах.`
      },
      {
        url: "/faq",
        title: "Часто задаваемые вопросы",
        content: `Часто задаваемые вопросы:
        - Как записаться? По телефону или онлайн
        - Есть ли пробный урок? Да, бесплатно
        - Сколько человек в группе? 4-10 в зависимости от возраста
        - Можно ли заморозить обучение? Да, до 2 недель
        - Есть ли скидки? Семейные, корпоративные, при предоплате
        - Выдается ли сертификат? Да, по окончании курса`
      },
      {
        url: "/reviews", 
        title: "Отзывы о школе",
        content: `Отзывы студентов O'KEY ENGLISH:
        Родители отмечают: дружелюбная атмосфера, быстрый прогресс детей, удобное расположение.
        Взрослые студенты: практическая направленность, профессиональные преподаватели, гибкое расписание.
        Рейтинг школы 4.8/5. Более 90% студентов рекомендуют школу друзьям.`
      },
      {
        url: "/test",
        title: "Тестирование уровня английского",
        content: `Бесплатное тестирование уровня английского в O'KEY ENGLISH.
        Определяем уровень от Beginner до Advanced.
        Тест включает: грамматику, лексику, аудирование, говорение.
        По результатам подбираем подходящую группу и программу.
        Тестирование онлайн или в любом филиале.`
      }
    ];

    console.log(`Processing ${siteContent.length} items`);
    let processed = 0;
    const errors = [];

    for (let i = 0; i < siteContent.length; i++) {
      const item = siteContent[i];
      console.log(`\n--- Processing item ${i + 1}/${siteContent.length}: ${item.title} ---`);
      
      try {
        // Шаг 1: Создание embedding
        console.log('Step 1: Creating embedding...');
        const embRes = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: item.content,
          }),
        });

        console.log('OpenAI API response status:', embRes.status);
        
        if (!embRes.ok) {
          const errorText = await embRes.text();
          console.error(`OpenAI API error for ${item.title}:`, errorText);
          errors.push(`${item.title}: OpenAI API error - ${errorText}`);
          continue;
        }

        const embJson = await embRes.json();
        console.log('Embedding response received, data length:', embJson.data?.length);
        
        const embedding = embJson.data?.[0]?.embedding;

        if (!embedding) {
          console.error(`No embedding in response for ${item.title}`);
          errors.push(`${item.title}: No embedding in response`);
          continue;
        }

        console.log('Embedding created successfully, vector length:', embedding.length);

        // Шаг 2: Сохранение в базу
        console.log('Step 2: Saving to database...');
        const { data, error } = await supabase
          .from('docs')
          .upsert({
            url: item.url,
            title: item.title,
            content: item.content,
            embedding: embedding,
            tokens: Math.ceil(item.content.length / 4)
          }, {
            onConflict: 'url'
          });

        if (error) {
          console.error(`Database error for ${item.title}:`, error);
          errors.push(`${item.title}: Database error - ${error.message}`);
        } else {
          console.log(`✅ Successfully saved: ${item.title}`);
          processed++;
        }
        
        // Небольшая задержка
        if (i < siteContent.length - 1) {
          console.log('Waiting 500ms before next item...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (itemError) {
        console.error(`Unexpected error processing ${item.title}:`, itemError);
        errors.push(`${item.title}: Unexpected error - ${itemError.message}`);
      }
    }

    console.log('\n=== INDEXING COMPLETED ===');
    console.log(`Successfully processed: ${processed}/${siteContent.length}`);
    console.log('Errors:', errors);

    return new Response(
      JSON.stringify({ 
        success: processed > 0, 
        message: `Проиндексировано ${processed} страниц из ${siteContent.length}`,
        processed,
        total: siteContent.length,
        errors
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== FATAL ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || "Unknown server error",
        stack: error?.stack 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});