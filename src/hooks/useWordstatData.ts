import { useQuery } from '@tanstack/react-query';
import { getWordstatData, type WordstatData } from '@/lib/seo/wordstatAnalyzer';

/**
 * Хук для загрузки данных Wordstat по ключевому слову
 */
export function useWordstatData(keyword: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['wordstat', keyword],
    queryFn: () => getWordstatData(keyword!),
    enabled: enabled && !!keyword,
    staleTime: 1000 * 60 * 60, // 1 час - данные по запросам меняются не часто
    gcTime: 1000 * 60 * 60 * 24, // 24 часа
  });
}
