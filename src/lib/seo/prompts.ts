import { branches } from '@/lib/branches';

/**
 * Промпт для генерации идей контента на основе кластера запросов
 */
export const SCHOOL_IDEAS_PROMPT = (
  head: string,
  intent: string,
  phrases: string[],
  existingPages: string[]
) => `
Ты — SEO-стратег школы английского языка O'KEY ENGLISH.

ФИЛИАЛЫ: ${branches.map(b => `${b.name} (${b.metro})`).join(', ')}

КЛАСТЕР: "${head}"
ИНТЕНТ: ${intent}
КЛЮЧЕВЫЕ ФРАЗЫ (топ-50): ${phrases.slice(0, 50).join(', ')}

СУЩЕСТВУЮЩИЕ СТРАНИЦЫ (не дублировать):
${existingPages.slice(0, 50).join('\n')}

ЗАДАЧА: Предложи 3-5 идей контента, которые раскроют кластер БЕЗ дублирования.

ТИПЫ страниц:
- **article**: Информационная статья (методики, советы, гайды)
- **landing**: Продающая страница (конкретная программа/курс)
- **local**: Локальная страница филиала с гео-привязкой
- **faq**: Подробный FAQ по теме
- **compare**: Сравнение программ/форматов/возрастов
- **hub**: Агрегатор/каталог (сводка курсов для определенной категории)

ДЛЯ LOCAL-типа:
- Создай варианты ТОЛЬКО для релевантных филиалов (не для всех 9!)
- Учти специфику локации: метро, район, соседние районы
- URL формат: /branches/{branch_id}/{тема}
- Обязательно: адрес, метро, расписание, контакты филиала
- Уникальность: разные кейсы/примеры/особенности для каждого филиала

ФОРМАТ ОТВЕТА (строго JSON):
[
  {
    "type": "article" | "landing" | "local" | "faq" | "compare" | "hub",
    "title": "SEO-заголовок до 60 символов с ключом",
    "h1": "Главный заголовок страницы",
    "route": "/путь-к-странице",
    "branch": null | "kotelniki" | "novokosino" | ...,
    "meta": {
      "description": "Мета-описание до 160 символов",
      "keywords": ["ключ1", "ключ2", "ключ3"]
    },
    "outline": [
      {"level": "h2", "heading": "Заголовок секции"},
      {"level": "h3", "heading": "Подсекция"}
    ],
    "internalLinks": [
      {"anchor": "программа Super Safari", "url": "/programs/super-safari"},
      {"anchor": "цены на обучение", "url": "/pricing"}
    ],
    "faqPreview": [
      {"q": "Вопрос?", "a": "Краткий ответ"}
    ],
    "schema": "Article" | "FAQPage" | "LocalBusiness"
  }
]

ТРЕБОВАНИЯ:
- Естественный язык, БЕЗ переоптимизации
- Уникальные URL (проверь против существующих!)
- Для локальных: разные углы/фокусы по филиалам
- Минимум 3 внутренние ссылки на реальные страницы
- CTA в каждой идее

Ответ ТОЛЬКО JSON-массив, без обертки \`\`\`json.
`;

/**
 * Промпт для создания детального ТЗ на основе идеи контента
 */
export const SCHOOL_BRIEF_PROMPT = (
  idea: any,
  existingPages: string[],
  similarContent: string[]
) => `
Ты — главный редактор O'KEY ENGLISH SCHOOL.

ИДЕЯ КОНТЕНТА:
${JSON.stringify(idea, null, 2)}

СУЩЕСТВУЮЩИЕ СТРАНИЦЫ ДЛЯ ССЫЛОК:
${existingPages.slice(0, 30).join(', ')}

ПОХОЖИЙ КОНТЕНТ (избегай дублирования):
${similarContent.slice(0, 3).join('\n---\n')}

ЗАДАЧА: Создай детальное ТЗ для автора.

ФОРМАТ ОТВЕТА (строго JSON):
{
  "h1": "Главный заголовок (точно как в идее)",
  "title": "SEO-title до 60 символов",
  "description": "Meta description до 160 символов",
  "outline": [
    {
      "level": "h2",
      "heading": "Заголовок секции",
      "content": "Краткие тезисы (3-5 предложений)",
      "subsections": [
        {
          "level": "h3",
          "heading": "Подсекция",
          "content": "Тезисы"
        }
      ]
    }
  ],
  "faq": [
    {
      "question": "Популярный вопрос?",
      "answer": "Развернутый ответ 3-5 предложений"
    }
  ],
  "schema": {
    "@context": "https://schema.org",
    "@type": "${idea.schema || 'Article'}",
    "headline": "Заголовок статьи",
    "description": "Описание",
    "author": {
      "@type": "Organization",
      "name": "O'KEY ENGLISH"
    },
    "publisher": {
      "@type": "Organization",
      "name": "O'KEY ENGLISH",
      "logo": {
        "@type": "ImageObject",
        "url": "https://okeyenglish.ru/logo.png"
      }
    }
  },
  "internalLinks": [
    {
      "anchor": "анкор текст",
      "url": "/реальный-путь",
      "context": "в какой секции использовать"
    }
  ],
  "localInfo": ${idea.branch ? `{
    "address": "Полный адрес филиала",
    "metro": "Метро",
    "workingHours": "Пн-Пт 9:00-21:00",
    "features": ["Особенность 1", "Особенность 2"],
    "phone": "+7 (499) 707-35-35"
  }` : 'null'},
  "minWords": 1500,
  "callToAction": "Запишитесь на бесплатный пробный урок",
  "media": [
    {
      "type": "table" | "list" | "image",
      "caption": "Описание",
      "placement": "после секции H2..."
    }
  ]
}

ТРЕБОВАНИЯ:
- Объем outline: минимум 5 H2-секций
- FAQ: 7-10 вопросов
- Внутренние ссылки: 5-7 штук, органично в тексте
- Для локальных страниц: обязателен блок с контактами филиала
- Уникальность: НЕ копируй структуру похожего контента
- Тон: экспертный, дружелюбный, простой
- Упоминай преимущества O'KEY: Cambridge, лицензия, материнский капитал

Ответ ТОЛЬКО JSON, без обертки.
`;

/**
 * Промпт для генерации финального HTML-контента
 */
export const SCHOOL_ARTICLE_PROMPT = (brief: any) => `
Ты — автор контента школы английского O'KEY ENGLISH.

ТЗ:
${JSON.stringify(brief, null, 2)}

ЗАДАЧА: Напиши HTML-фрагмент статьи (ТОЛЬКО содержимое, без <html>, <head>, <body>).

ТРЕБОВАНИЯ:
- H1 один раз в самом начале
- Структура строго по outline
- Объем: не менее ${brief.minWords || 1500} слов
- Абзацы по 3-5 предложений
- Списки (ul/ol) где уместно
- Таблицы если указаны в media
- Естественный стиль, БЕЗ воды и кликбейта
- Ключевые фразы органично, БЕЗ переспама
- FAQ в конце с schema.org разметкой
- Внутренние ссылки из brief.internalLinks естественно в тексте
- CTA-блок в конце

${brief.localInfo ? `
ЛОКАЛЬНАЯ СТРАНИЦА - ОБЯЗАТЕЛЬНО:
- Блок "Как добраться" с адресом и метро
- Расписание работы филиала
- Уникальные особенности именно этого филиала
- Упоминание района/локации 2-3 раза
- Ссылки на расписание и контакты филиала
` : ''}

СТРУКТУРА:
<article class="seo-content">
  <h1>${brief.h1}</h1>
  
  <div class="intro">
    <p>Вводный абзац с ключевым запросом. Зацепка для читателя. Обещание пользы от статьи.</p>
  </div>
  
  ${brief.outline.map((section: any, idx: number) => `
  <section class="content-section">
    <h2>${section.heading}</h2>
    <p>${section.content}</p>
    
    <p>Разверни тезисы в 2-3 абзаца. Добавь конкретные примеры из практики O'KEY ENGLISH. 
    Используй цифры, факты, результаты студентов. Пиши понятно для родителей.</p>
    
    ${section.subsections?.map((sub: any) => `
    <h3>${sub.heading}</h3>
    <p>${sub.content}</p>
    
    <p>Разверни подсекцию. Добавь списки или примеры:</p>
    <ul>
      <li>Конкретный пункт 1</li>
      <li>Конкретный пункт 2</li>
      <li>Конкретный пункт 3</li>
    </ul>
    `).join('') || ''}
    
    ${idx === 2 && brief.internalLinks.length > 0 ? `
    <p>Рекомендуем также ознакомиться с <a href="${brief.internalLinks[0].url}">${brief.internalLinks[0].anchor}</a>, 
    где мы подробно рассказываем о программах обучения.</p>
    ` : ''}
  </section>
  `).join('\n')}
  
  ${brief.localInfo ? `
  <section class="local-info">
    <h2>Как добраться в наш филиал</h2>
    <div class="info-block">
      <p><strong>📍 Адрес:</strong> ${brief.localInfo.address}</p>
      <p><strong>🚇 Метро:</strong> ${brief.localInfo.metro}</p>
      <p><strong>🕐 Режим работы:</strong> ${brief.localInfo.workingHours}</p>
      <p><strong>📞 Телефон:</strong> ${brief.localInfo.phone}</p>
    </div>
    
    <p>Наш филиал удобно расположен рядом с метро. Мы работаем для вас каждый день, 
    предлагая гибкое расписание для детей и взрослых. Первое занятие — бесплатно!</p>
    
    ${brief.localInfo.features ? `
    <h3>Особенности филиала</h3>
    <ul>
      ${brief.localInfo.features.map((f: string) => `<li>${f}</li>`).join('\n      ')}
    </ul>
    ` : ''}
  </section>
  ` : ''}
  
  <section class="faq" itemscope itemtype="https://schema.org/FAQPage">
    <h2>Часто задаваемые вопросы</h2>
    
    ${brief.faq.map((item: any) => `
    <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 itemprop="name">${item.question}</h3>
      <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">${item.answer}</p>
      </div>
    </div>
    `).join('\n    ')}
  </section>
  
  <div class="cta-block">
    <h2>${brief.callToAction}</h2>
    <p>Не упустите возможность начать обучение в одной из лучших школ английского языка. 
    Мы используем Кембриджские учебники, имеем образовательную лицензию, 
    и вы можете оплатить обучение материнским капиталом.</p>
    
    <div class="cta-buttons">
      <a href="/contacts" class="btn btn-primary">Записаться на пробный урок</a>
      <a href="tel:+74997073535" class="btn btn-secondary">Позвонить: +7 (499) 707-35-35</a>
    </div>
    
    ${brief.internalLinks.length > 1 ? `
    <p class="additional-links">
      Также читайте: 
      ${brief.internalLinks.slice(1, 4).map((link: any) => 
        `<a href="${link.url}">${link.anchor}</a>`
      ).join(', ')}
    </p>
    ` : ''}
  </div>
</article>

СТИЛЬ:
- Пиши как опытный преподаватель, который объясняет родителям
- Используй примеры из практики O'KEY ENGLISH
- Упоминай конкретные программы: Super Safari, Kid's Box, Prepare, Empower
- Упоминай методику (коммуникативная, Cambridge)
- Избегай общих фраз типа "как известно", "в наше время"
- Конкретика: цифры, факты, результаты студентов
- Дружелюбный тон, но экспертный
- Абзацы 3-5 предложений для удобства чтения

ВАЖНО:
- НЕ используй markdown
- Чистый HTML без классов кроме семантических
- Все ссылки должны быть валидными (из brief.internalLinks)
- FAQ обязательно с микроразметкой schema.org
- CTA в конце обязателен

Ответ ТОЛЬКО HTML-код статьи, без обертки \`\`\`html.
`;

/**
 * Промпт для реоптимизации слабых страниц
 */
export const REOPTIMIZE_PROMPT = (
  originalBrief: any,
  currentMetrics: any,
  feedback: string[]
) => `
Ты — SEO-редактор школы английского O'KEY ENGLISH.

ИСХОДНОЕ ТЗ:
${JSON.stringify(originalBrief, null, 2)}

ТЕКУЩИЕ МЕТРИКИ:
- Средняя позиция: ${currentMetrics.avg_position}
- CTR: ${currentMetrics.ctr}%
- Показатель отказов: ${currentMetrics.bounce_rate}%
- Время на странице: ${currentMetrics.time_on_page}с

ПРОБЛЕМЫ:
${feedback.join('\n')}

ЗАДАЧА: Улучши ТЗ для повышения показателей.

СТРАТЕГИИ УЛУЧШЕНИЯ:
1. **Низкая позиция (>15)**: Добавь больше ключевых фраз, расширь контент, улучши структуру
2. **Низкий CTR (<2%)**: Улучши title и description, сделай их более привлекательными
3. **Высокий отказ (>60%)**: Добавь интерактива, улучши первый экран, усиль CTA
4. **Мало времени (<60с)**: Добавь примеры, кейсы, таблицы, расширь FAQ

КОНКРЕТНЫЕ УЛУЧШЕНИЯ:
- Добавь 2-3 новые H2-секции с примерами
- Расширь FAQ до 10-12 вопросов
- Добавь сравнительную таблицу (если уместно)
- Усиль первый абзац (зацепка + польза)
- Добавь 3-5 новых внутренних ссылок
- Включи больше цифр и конкретики
- Добавь реальные отзывы/кейсы студентов O'KEY

ФОРМАТ: Верни обновленный JSON brief в том же формате, что и исходный.

Ответ ТОЛЬКО JSON, без обертки.
`;

/**
 * Вспомогательная функция для получения информации о филиале
 */
export function getBranchInfo(branchId: string) {
  const branch = branches.find(b => b.id === branchId);
  if (!branch) return null;
  
  return {
    name: branch.name,
    address: branch.address,
    metro: branch.metro,
    phone: '+7 (499) 707-35-35',
    workingHours: 'Пн-Пт 9:00-21:00, Сб-Вс 10:00-18:00',
    features: [
      'Лицензия на образовательную деятельность',
      'Кембриджские учебники',
      'Оплата материнским капиталом',
      'Бесплатный пробный урок',
      'Небольшие группы до 8 человек'
    ]
  };
}
