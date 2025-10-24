import { supabase } from '@/integrations/supabase/client';

/**
 * Создает SEO-friendly slug из текста
 */
export function makeSlug(head: string, branch?: string): string {
  const core = head
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
  
  return branch ? `${core}-${branch.toLowerCase()}` : core;
}

/**
 * Гарантирует уникальность slug, добавляя счетчик при необходимости
 */
export async function ensureUniqueSlug(
  baseSlug: string, 
  excludeId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const query = supabase
      .from('kw_clusters')
      .select('id')
      .eq('slug', slug)
      .limit(1);
    
    if (excludeId) {
      query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error || !data || data.length === 0) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Проверяет наличие похожих routes для предотвращения дублей
 */
export async function checkSimilarRoutes(
  route: string, 
  threshold = 0.3
): Promise<Array<{ route: string; similarity: number }>> {
  const { data, error } = await supabase.rpc('find_similar_routes', {
    p_route: route,
    p_threshold: threshold
  });
  
  if (error) {
    console.error('Error checking similar routes:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Генерирует уникальный route для content_ideas с проверкой дублей
 */
export async function generateUniqueRoute(
  basePath: string,
  title: string,
  branch?: string
): Promise<string> {
  const slug = makeSlug(title, branch);
  const fullRoute = `${basePath}/${slug}`;
  
  // Проверяем похожие routes
  const similar = await checkSimilarRoutes(fullRoute, 0.4);
  
  if (similar.length === 0) {
    return fullRoute;
  }
  
  // Если есть похожие, добавляем счетчик
  let counter = 1;
  let uniqueRoute = fullRoute;
  
  while (true) {
    const { data } = await supabase
      .from('content_ideas')
      .select('id')
      .eq('route', uniqueRoute)
      .limit(1);
    
    if (!data || data.length === 0) {
      return uniqueRoute;
    }
    
    uniqueRoute = `${fullRoute}-${counter}`;
    counter++;
  }
}
