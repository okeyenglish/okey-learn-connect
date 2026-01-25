import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

export interface UnifiedSearchResult {
  clientId: string;
  matchType: 'phone' | 'name' | 'message';
  messengerType: 'whatsapp' | 'telegram' | 'max' | null;
}

/**
 * Unified CRM search hook - заменяет 3 отдельных хука:
 * - useClientIdsByPhoneSearch
 * - useClientNameSearch  
 * - useMessageContentSearch
 * 
 * Преимущества:
 * - 1 RPC вызов вместо 3
 * - Единый debounce 200ms
 * - Меньше нагрузки на БД
 */
export const useUnifiedSearch = (query: string) => {
  const trimmedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(trimmedQuery);
  
  // Единый debounce 200ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  // Минимум 2 символа для поиска
  const enabled = debouncedQuery.length >= 2;

  const queryResult = useQuery({
    queryKey: ['unified-crm-search', debouncedQuery],
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<UnifiedSearchResult[]> => {
      const startTime = performance.now();
      console.log(`[useUnifiedSearch] Starting unified search for: "${debouncedQuery}"`);
      
      const orgId = await getCurrentOrganizationId();

      const { data, error } = await supabase.rpc('unified_crm_search', {
        p_org_id: orgId || '',
        p_query: debouncedQuery,
        p_limit: 50
      });

      const duration = (performance.now() - startTime).toFixed(0);

      if (error) {
        console.error('[useUnifiedSearch] RPC error:', error);
        throw error;
      }

      // Parse JSON result
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const rows = Array.isArray(parsed) ? parsed : [];
      
      const results: UnifiedSearchResult[] = rows.map((row: { client_id: string; match_type: string; messenger_type: string | null }) => ({
        clientId: row.client_id,
        matchType: row.match_type as 'phone' | 'name' | 'message',
        messengerType: row.messenger_type as 'whatsapp' | 'telegram' | 'max' | null
      }));

      console.log(`[useUnifiedSearch] Found ${results.length} results in ${duration}ms`);
      return results;
    },
  });

  // Группируем результаты по типу совпадения
  const { phoneIds, nameIds, messageIds, messengerTypeMap } = useMemo(() => {
    const phoneIds: string[] = [];
    const nameIds: string[] = [];
    const messageIds: string[] = [];
    const messengerTypeMap = new Map<string, 'whatsapp' | 'telegram' | 'max' | null>();

    (queryResult.data || []).forEach(result => {
      switch (result.matchType) {
        case 'phone':
          phoneIds.push(result.clientId);
          break;
        case 'name':
          nameIds.push(result.clientId);
          break;
        case 'message':
          messageIds.push(result.clientId);
          messengerTypeMap.set(result.clientId, result.messengerType);
          break;
      }
    });

    return { phoneIds, nameIds, messageIds, messengerTypeMap };
  }, [queryResult.data]);

  // Все уникальные client IDs
  const allClientIds = useMemo(() => {
    const ids = new Set<string>();
    (queryResult.data || []).forEach(r => ids.add(r.clientId));
    return Array.from(ids);
  }, [queryResult.data]);

  return {
    // Основные данные
    data: queryResult.data || [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error,
    
    // Группированные ID для совместимости
    phoneIds,
    nameIds,
    messageIds,
    allClientIds,
    
    // Messenger type lookup
    messengerTypeMap,
    getMessengerType: (clientId: string) => messengerTypeMap.get(clientId) || null,
    
    // Мета
    isSearchActive: debouncedQuery.length >= 2,
    searchQuery: debouncedQuery,
  };
};
