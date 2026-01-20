export interface QualityCheck {
  passed: boolean;
  details: {
    word_count: number;
    h1_count: number;
    h2_count: number;
    h3_count: number;
    internal_links: number;
    external_links: number;
    has_faq: boolean;
    has_cta: boolean;
    has_address?: boolean;
    has_schema: boolean;
    uniqueness?: number;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Проверяет качество HTML-контента перед публикацией
 * Использует браузерный DOMParser вместо jsdom
 */
export function checkContentQuality(
  html: string,
  minWords = 1200,
  isLocal = false
): QualityCheck {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root")!;
  const text = root.textContent?.trim() || "";
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  
  const h1Count = root.querySelectorAll("h1").length;
  const h2Count = root.querySelectorAll("h2").length;
  const h3Count = root.querySelectorAll("h3").length;
  const internalLinks = root.querySelectorAll('a[href^="/"]').length;
  const externalLinks = root.querySelectorAll('a[href^="http"]').length;
  
  const hasFAQ = !!root.querySelector('[itemtype*="FAQPage"]');
  const hasSchema = !!root.querySelector('[itemtype*="schema.org"]');
  const hasCTA = text.toLowerCase().includes('запис') || 
                  text.toLowerCase().includes('пробн') ||
                  text.toLowerCase().includes('звоните') ||
                  text.toLowerCase().includes('позвоните');
  
  const hasAddress = isLocal ? (
    text.toLowerCase().includes('адрес') && 
    text.toLowerCase().includes('метро')
  ) : true;
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Критичные ошибки
  if (words < minWords) {
    errors.push(`Недостаточно слов: ${words} < ${minWords}`);
  }
  if (h1Count !== 1) {
    errors.push(`H1 должно быть ровно 1, найдено: ${h1Count}`);
  }
  if (h2Count < 3) {
    errors.push(`Минимум 3 H2, найдено: ${h2Count}`);
  }
  if (internalLinks < 3) {
    errors.push(`Минимум 3 внутренние ссылки, найдено: ${internalLinks}`);
  }
  if (!hasFAQ) {
    errors.push('Отсутствует блок FAQ');
  }
  if (!hasCTA) {
    errors.push('Отсутствует призыв к действию (CTA)');
  }
  if (isLocal && !hasAddress) {
    errors.push('Локальная страница без адреса и метро');
  }
  
  // Предупреждения
  if (!hasSchema) {
    warnings.push('Отсутствует schema.org разметка');
  }
  if (h3Count < 2) {
    warnings.push('Рекомендуется больше H3 для структуры');
  }
  if (externalLinks > 5) {
    warnings.push('Слишком много внешних ссылок');
  }
  if (words < minWords * 1.2) {
    warnings.push('Объем близок к минимуму, рекомендуется больше');
  }
  
  const passed = errors.length === 0;
  
  return {
    passed,
    details: {
      word_count: words,
      h1_count: h1Count,
      h2_count: h2Count,
      h3_count: h3Count,
      internal_links: internalLinks,
      external_links: externalLinks,
      has_faq: hasFAQ,
      has_cta: hasCTA,
      has_address: isLocal ? hasAddress : undefined,
      has_schema: hasSchema
    },
    errors,
    warnings
  };
}

/**
 * Быстрая проверка уникальности через шинглы (n-граммы слов)
 */
export function checkUniqueness(html: string, existingContent: string[]): number {
  const shingleSize = 5;
  const newShingles = generateShingles(stripHtml(html), shingleSize);
  
  let maxSimilarity = 0;
  for (const existing of existingContent) {
    const existingShingles = generateShingles(stripHtml(existing), shingleSize);
    const similarity = jaccardSimilarity(newShingles, existingShingles);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }
  
  // Возвращаем процент уникальности (100% - максимальная похожесть)
  return Math.round((1 - maxSimilarity) * 100);
}

/**
 * Убирает HTML-теги и оставляет только текст
 */
function stripHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent || '';
}

/**
 * Генерирует шинглы (n-граммы) из текста
 */
function generateShingles(text: string, size: number): Set<string> {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const shingles = new Set<string>();
  
  for (let i = 0; i <= words.length - size; i++) {
    shingles.add(words.slice(i, i + size).join(' '));
  }
  
  return shingles;
}

/**
 * Вычисляет коэффициент Жаккара (пересечение / объединение)
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Валидирует внутренние ссылки в HTML
 */
export function validateInternalLinks(html: string, validRoutes: string[]): {
  valid: string[];
  invalid: string[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root")!;
  const links = Array.from(root.querySelectorAll('a[href^="/"]')) as HTMLAnchorElement[];
  
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;
    
    const route = href.split('?')[0].split('#')[0]; // Убираем query и hash
    
    if (validRoutes.includes(route)) {
      valid.push(route);
    } else {
      invalid.push(route);
    }
  }
  
  return { valid, invalid };
}
