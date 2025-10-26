import { supabase } from '@/integrations/supabase/client';

/**
 * Интерфейс данных Wordstat
 */
export interface WordstatData {
  keyword: string;
  shows: number; // Количество показов в месяц
  competition: 'LOW' | 'MEDIUM' | 'HIGH'; // Конкуренция
  relatedKeywords?: Array<{
    keyword: string;
    shows: number;
  }>;
}

/**
 * Получает статистику по ключевому слову из Wordstat
 */
export async function getWordstatData(
  keyword: string,
  regionIds?: number[]
): Promise<WordstatData | null> {
  try {
    const { data, error } = await supabase.functions.invoke('seo-wordstat', {
      body: { 
        keyword,
        regionIds: regionIds || [225] // 225 = Россия по умолчанию
      }
    });

    if (error) {
      console.error('Wordstat error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch wordstat data:', error);
    return null;
  }
}

/**
 * Получает статистику для множества ключевых слов (батч)
 */
export async function getWordstatBatch(
  keywords: string[],
  regionIds?: number[]
): Promise<Map<string, WordstatData>> {
  const results = new Map<string, WordstatData>();
  
  // Яндекс.Директ API позволяет обрабатывать до 10 запросов за раз
  const batchSize = 10;
  
  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    
    const { data, error } = await supabase.functions.invoke('seo-wordstat', {
      body: { 
        keywords: batch,
        regionIds: regionIds || [225]
      }
    });

    if (!error && data) {
      Object.entries(data).forEach(([kw, stats]) => {
        results.set(kw, stats as WordstatData);
      });
    }
  }
  
  return results;
}

/**
 * Определяет сложность продвижения на основе показов и конкуренции
 */
export function calculateSEODifficulty(wordstatData: WordstatData): {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
  score: number; // 0-100
  recommendation: string;
} {
  const { shows, competition } = wordstatData;
  
  // Базовая оценка на основе частотности
  let frequencyScore = 0;
  if (shows < 1000) frequencyScore = 10;
  else if (shows < 5000) frequencyScore = 25;
  else if (shows < 10000) frequencyScore = 40;
  else if (shows < 50000) frequencyScore = 60;
  else if (shows < 100000) frequencyScore = 75;
  else frequencyScore = 90;
  
  // Оценка конкуренции
  const competitionScore = {
    'LOW': 10,
    'MEDIUM': 40,
    'HIGH': 80
  }[competition];
  
  // Итоговая оценка (средневзвешенное)
  const score = Math.round(frequencyScore * 0.4 + competitionScore * 0.6);
  
  let difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
  let recommendation: string;
  
  if (score < 25) {
    difficulty = 'EASY';
    recommendation = 'Отличная возможность для быстрого роста';
  } else if (score < 50) {
    difficulty = 'MEDIUM';
    recommendation = 'Средняя сложность, требует качественного контента';
  } else if (score < 75) {
    difficulty = 'HARD';
    recommendation = 'Высокая конкуренция, нужна сильная оптимизация';
  } else {
    difficulty = 'VERY_HARD';
    recommendation = 'Очень высокая конкуренция, долгосрочная стратегия';
  }
  
  return { difficulty, score, recommendation };
}

/**
 * Анализирует потенциал ключевого слова
 */
export function analyzeKeywordPotential(wordstatData: WordstatData): {
  isPriority: boolean;
  reason: string;
  traffic_potential: 'LOW' | 'MEDIUM' | 'HIGH';
} {
  const { shows, competition } = wordstatData;
  const difficulty = calculateSEODifficulty(wordstatData);
  
  // Низкочастотные с низкой конкуренцией - приоритетные
  if (shows < 5000 && competition === 'LOW') {
    return {
      isPriority: true,
      reason: 'Низкая конкуренция при достаточной частотности',
      traffic_potential: 'MEDIUM'
    };
  }
  
  // Среднечастотные с низкой/средней конкуренцией
  if (shows >= 5000 && shows < 50000 && competition !== 'HIGH') {
    return {
      isPriority: true,
      reason: 'Хорошее соотношение частотности и конкуренции',
      traffic_potential: 'HIGH'
    };
  }
  
  // Высокочастотные - всегда интересны, но сложны
  if (shows >= 50000) {
    return {
      isPriority: difficulty.score < 70,
      reason: difficulty.score < 70 
        ? 'Высокий трафик при приемлемой конкуренции'
        : 'Высокий трафик, но очень высокая конкуренция',
      traffic_potential: 'HIGH'
    };
  }
  
  // Остальные - низкий приоритет
  return {
    isPriority: false,
    reason: 'Низкая частотность или высокая конкуренция',
    traffic_potential: 'LOW'
  };
}
