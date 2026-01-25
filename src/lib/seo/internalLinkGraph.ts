import { supabase } from '@/integrations/supabase/typedClient';

export interface InternalLink {
  route: string;
  anchor: string;
  type?: 'contextual' | 'navigation' | 'footer' | 'sidebar';
}

/**
 * Обновляет граф внутренних ссылок для страницы
 */
export async function updateInternalLinks(
  fromRoute: string,
  toLinks: InternalLink[]
) {
  if (toLinks.length === 0) return;
  
  const inserts = toLinks.map(link => ({
    from_route: fromRoute,
    to_route: link.route,
    anchor: link.anchor,
    link_type: link.type || 'contextual'
  }));
  
  const { error } = await (supabase.from('internal_link_graph' as any) as any)
    .upsert(inserts, { 
      onConflict: 'from_route,to_route,anchor',
      ignoreDuplicates: false 
    });
  
  if (error) {
    console.error('Failed to update internal links:', error);
    throw error;
  }
}

/**
 * Предлагает релевантные внутренние ссылки для контента
 */
export async function suggestInternalLinks(
  currentRoute: string,
  topic: string,
  branch?: string,
  limit = 7
): Promise<Array<{ route: string; anchor: string; relevance: number }>> {
  // Получаем опубликованные страницы
  let query = (supabase.from('content_ideas' as any) as any)
    .select('route, title, meta, branch, idea_type')
    .eq('status', 'published')
    .neq('route', currentRoute)
    .limit(limit * 3); // Берем больше для фильтрации
  
  // Для локальных страниц приоритет страницам того же филиала
  if (branch) {
    query = query.or(`branch.eq.${branch},branch.is.null`);
  }
  
  const { data: pages } = await query;
  
  if (!pages || pages.length === 0) return [];
  
  // Простая эвристика релевантности
  const topicWords = new Set(topic.toLowerCase().split(/\s+/));
  
  const scored = (pages as any[]).map((page: any) => {
    const titleWords = new Set(String(page.title || '').toLowerCase().split(/\s+/));
    const overlap = [...titleWords].filter(w => topicWords.has(w)).length;
    
    // Бонус для страниц того же филиала
    const branchBonus = (branch && page.branch === branch) ? 0.3 : 0;
    
    // Бонус для hub и category страниц
    const typeBonus = ['hub', 'category'].includes(page.idea_type) ? 0.2 : 0;
    
    const relevance = (overlap / Math.max(titleWords.size, topicWords.size)) + branchBonus + typeBonus;
    
    return {
      route: page.route as string,
      anchor: page.title as string,
      relevance: Math.min(relevance, 1.0)
    };
  });
  
  // Сортируем по релевантности и возвращаем топ
  return scored
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * Находит hub-страницы (каталоги, категории) для перелинковки
 */
export async function findHubPages(branch?: string): Promise<string[]> {
  let query = (supabase.from('content_ideas' as any) as any)
    .select('route')
    .eq('status', 'published')
    .in('idea_type', ['hub', 'category'])
    .limit(15);
  
  if (branch) {
    query = query.or(`branch.eq.${branch},branch.is.null`);
  }
  
  const { data } = await query;
  return (data as any[])?.map((p: any) => p.route as string) || [];
}

/**
 * Получает список входящих ссылок на страницу
 */
export async function getIncomingLinks(
  route: string
): Promise<Array<{ from_route: string; anchor: string; strength: number }>> {
  const { data, error } = await (supabase.from('internal_link_graph' as any) as any)
    .select('from_route, anchor, strength')
    .eq('to_route', route)
    .order('strength', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('Error fetching incoming links:', error);
    return [];
  }
  
  return (data || []) as Array<{ from_route: string; anchor: string; strength: number }>;
}

/**
 * Получает список исходящих ссылок со страницы
 */
export async function getOutgoingLinks(
  route: string
): Promise<Array<{ to_route: string; anchor: string; link_type: string }>> {
  const { data, error } = await (supabase.from('internal_link_graph' as any) as any)
    .select('to_route, anchor, link_type')
    .eq('from_route', route)
    .order('created_at', { ascending: false })
    .limit(30);
  
  if (error) {
    console.error('Error fetching outgoing links:', error);
    return [];
  }
  
  return (data || []) as Array<{ to_route: string; anchor: string; link_type: string }>;
}

/**
 * Пересчитывает силу ссылок на основе PageRank-подобного алгоритма
 */
export async function recalculateLinkStrength() {
  // Получаем все ссылки
  const { data: links } = await (supabase.from('internal_link_graph' as any) as any)
    .select('from_route, to_route');
  
  if (!links) return;
  
  // Простой подсчет: чем больше ссылок на страницу, тем выше strength
  const incomingCounts: Record<string, number> = {};
  
  for (const link of (links as any[])) {
    incomingCounts[link.to_route] = (incomingCounts[link.to_route] || 0) + 1;
  }
  
  // Обновляем strength (нормализуем от 0 до 1)
  const maxIncoming = Math.max(...Object.values(incomingCounts), 1);
  
  for (const link of (links as any[])) {
    const strength = Math.min((incomingCounts[link.to_route] || 1) / maxIncoming, 1.0);
    
    await (supabase.from('internal_link_graph' as any) as any)
      .update({ strength: Number(strength.toFixed(2)) })
      .eq('from_route', link.from_route)
      .eq('to_route', link.to_route);
  }
}

/**
 * Находит "сиротские" страницы без входящих ссылок
 */
export async function findOrphanPages(): Promise<string[]> {
  // Получаем все опубликованные страницы
  const { data: allPages } = await (supabase.from('content_ideas' as any) as any)
    .select('route')
    .eq('status', 'published');
  
  if (!allPages) return [];
  
  // Получаем все целевые маршруты из графа
  const { data: linkedPages } = await (supabase.from('internal_link_graph' as any) as any)
    .select('to_route');
  
  const linkedRoutes = new Set((linkedPages as any[])?.map((p: any) => p.to_route) || []);
  
  // Находим страницы без входящих ссылок
  return (allPages as any[])
    .filter((page: any) => !linkedRoutes.has(page.route))
    .map((page: any) => page.route as string);
}
