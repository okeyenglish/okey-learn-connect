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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing configuration" }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Контент для индексации (основные разделы сайта)
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
        url: "/branches",
        title: "Филиалы O'KEY ENGLISH",
        content: `Филиалы школы O'KEY ENGLISH в Москве:
        
        Котельники - ул. Новая, 6. Современные классы, удобное расположение рядом с метро.
        Люберцы 1 - Октябрский проспект, 151. Просторные аудитории, парковка.
        Люберцы 2 - ул. 3-е Почтовое отделение, 90. Уютная атмосфера для обучения.
        Мытищи - ул. Мира, 2/22. Новое оборудование, центр города.
        Новокосино - Суздальская ул., 18к1. Рядом с метро, комфортные условия.
        Окская - Окская ул., 5. Тихое место для концентрации на учебе.
        Солнцево - Солнцевский пр-т, 25. Большие классы, современное оснащение.
        Стахановская - ул. Стахановская, 24. Удобная транспортная доступность.
        Онлайн - дистанционное обучение с живым преподавателем.
        
        Все филиалы оборудованы интерактивными досками, имеют библиотеки, зоны отдыха.`
      },
      {
        url: "/teachers",
        title: "Преподаватели",
        content: `Преподаватели O'KEY ENGLISH - это команда профессионалов:
        
        - Высшее педагогическое или лингвистическое образование
        - Международные сертификаты CELTA, TESOL, TKT
        - Опыт работы от 3 лет
        - Регулярное повышение квалификации
        - Знание современных методик преподавания
        
        Наши преподаватели умеют работать с детьми и взрослыми, создают дружелюбную атмосферу на уроках, мотивируют студентов изучать язык.
        
        Мужчины и женщины преподаватели, носители языка и русскоязычные специалисты. Индивидуальный подход к каждому студенту.`
      },
      {
        url: "/pricing",
        title: "Цены и стоимость обучения",
        content: `Стоимость обучения в O'KEY ENGLISH:
        
        Групповые занятия:
        - 8 занятий в месяц: от 6400 рублей
        - 12 занятий в месяц: от 9600 рублей
        - Безлимитные занятия: от 12000 рублей
        
        Индивидуальные занятия:
        - 1 урок: от 1200 рублей
        - Пакет из 8 уроков: от 9600 рублей
        
        Онлайн обучение:
        - Групповые: скидка 20%
        - Индивидуальные: от 1000 рублей за урок
        
        Дополнительные услуги:
        - Тестирование уровня: бесплатно
        - Учебные материалы: включены в стоимость
        - Сертификат по окончании: бесплатно
        
        Скидки: семейная скидка 10%, корпоративным клиентам, при оплате за полгода.`
      },
      {
        url: "/about",
        title: "О школе O'KEY ENGLISH",
        content: `О школе английского языка O'KEY ENGLISH:
        
        Работаем с 2015 года. За это время обучили более 5000 студентов.
        
        Наша миссия - сделать изучение английского языка доступным, эффективным и увлекательным для каждого.
        
        Преимущества:
        - Проверенные методики Cambridge
        - Квалифицированные преподаватели
        - Небольшие группы до 8 человек
        - Современное оборудование
        - Гибкое расписание
        - Удобные локации
        
        Мы используем коммуникативный подход, который помогает быстро преодолеть языковой барьер и начать говорить на английском.
        
        Регулярные мероприятия: разговорные клубы, тематические вечера, конкурсы для студентов.`
      },
      {
        url: "/contacts",
        title: "Контакты O'KEY ENGLISH",
        content: `Контактная информация O'KEY ENGLISH:
        
        Телефон: +7 (495) 123-45-67
        Email: info@okeyenglish.ru
        Сайт: www.okeyenglish.ru
        
        Социальные сети:
        WhatsApp: +79000000000
        Telegram: @okeyenglish_support
        Instagram: @okey_english_school
        VKontakte: vk.com/okeyenglish
        
        Часы работы:
        Понедельник-Пятница: 10:00-21:00
        Суббота-Воскресенье: 10:00-18:00
        
        Центральный офис: г. Москва, ул. Примерная, д. 1
        
        Для записи на пробный урок обращайтесь по телефону или через мессенджеры. Наши менеджеры онлайн и готовы ответить на все вопросы.`
      }
    ];

    console.log('Starting content indexing...');
    let processed = 0;

    for (const item of siteContent) {
      console.log(`Processing: ${item.title}`);
      
      // Создаем эмбеддинг для контента
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

      if (!embRes.ok) {
        console.error(`Failed to create embedding for ${item.title}`);
        continue;
      }

      const embJson = await embRes.json();
      const embedding = embJson.data?.[0]?.embedding;

      if (!embedding) {
        console.error(`No embedding received for ${item.title}`);
        continue;
      }

      // Сохраняем в базу данных
      const { error } = await supabase
        .from('docs')
        .upsert({
          url: item.url,
          title: item.title,
          content: item.content,
          embedding: embedding,
          tokens: item.content.length / 4 // примерная оценка токенов
        }, {
          onConflict: 'url'
        });

      if (error) {
        console.error(`Error saving ${item.title}:`, error);
      } else {
        console.log(`Successfully indexed: ${item.title}`);
        processed++;
      }
    }

    console.log(`Indexing completed. Processed ${processed} items.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Проиндексировано ${processed} страниц из ${siteContent.length}`,
        processed 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Indexing error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || "Server error" }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});