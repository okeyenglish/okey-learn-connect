import { type WordstatData } from './wordstatAnalyzer';

/**
 * Определяет тип ключевого запроса на основе частоты и конкуренции
 */
export function getKeywordType(
  wordstatData: WordstatData | null | undefined
): 'narrow' | 'wide' | 'medium' {
  if (!wordstatData) return 'medium';
  
  const freq = wordstatData.shows;
  const competition = wordstatData.competition;
  
  // Узкие: низкая частота (<1000) + любая конкуренция
  if (freq < 1000) return 'narrow';
  
  // Широкие: высокая частота (>5000) + высокая конкуренция
  if (freq > 5000 && competition === 'HIGH') return 'wide';
  
  return 'medium';
}

/**
 * Рассчитывает прогресс оптимизации страницы
 */
export function calculateOptimizationProgress(pageData: {
  hasAnalysis: boolean;
  wordstatCoverage: number; // % запросов с данными Wordstat
  hasContent: boolean;
  hasGscData: boolean;
}): number {
  let score = 0;
  if (pageData.hasAnalysis) score += 25;
  if (pageData.wordstatCoverage > 80) score += 25;
  if (pageData.hasContent) score += 25;
  if (pageData.hasGscData) score += 25;
  return score;
}

/**
 * Возвращает цвет для типа запроса
 */
export function getKeywordTypeColor(type: 'narrow' | 'wide' | 'medium'): string {
  switch (type) {
    case 'narrow': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'wide': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  }
}

/**
 * Возвращает emoji для типа запроса
 */
export function getKeywordTypeEmoji(type: 'narrow' | 'wide' | 'medium'): string {
  switch (type) {
    case 'narrow': return '🎯';
    case 'wide': return '🌐';
    default: return '📊';
  }
}

/**
 * Возвращает статус страницы на основе прогресса
 */
export function getPageStatus(progress: number): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive';
  color: string;
} {
  if (progress >= 75) {
    return {
      label: 'Оптимизирована',
      variant: 'default',
      color: 'text-green-600 dark:text-green-400'
    };
  } else if (progress >= 40) {
    return {
      label: 'В работе',
      variant: 'secondary',
      color: 'text-yellow-600 dark:text-yellow-400'
    };
  } else {
    return {
      label: 'Требует внимания',
      variant: 'destructive',
      color: 'text-red-600 dark:text-red-400'
    };
  }
}
