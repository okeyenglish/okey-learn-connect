import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useOrganization } from '@/hooks/useOrganization';

interface SearchResult {
  id: string;
  client_id: string;
  message_text: string;
  created_at: string;
  messenger_type: string | null;
  is_outgoing: boolean | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  client_name?: string;
}

/** DB row for message with client join */
interface MessageRow {
  id: string;
  client_id: string;
  message_text: string;
  created_at: string;
  messenger_type: string | null;
  is_outgoing: boolean | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  clients?: { name: string | null } | null;
}

interface UseMessageSearchOptions {
  clientId?: string;
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
}

/**
 * Optimized hook for searching messages
 * - Debounced search to reduce API calls
 * - Client-side caching of recent searches
 * - Highlights matching text
 * - Supports search within specific client or all chats
 */
export const useMessageSearch = (options: UseMessageSearchOptions = {}) => {
  const {
    clientId,
    debounceMs = 300,
    minQueryLength = 2,
    limit = 50,
  } = options;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { organizationId } = useOrganization();

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs]);

  // Search query
  const searchQuery = useQuery({
    queryKey: ['message-search', debouncedQuery, clientId, organizationId],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
        return [];
      }

      const startTime = performance.now();
      console.log(`[useMessageSearch] Searching for "${debouncedQuery}"...`);

      let queryBuilder = supabase
        .from('chat_messages')
        .select(`
          id,
          client_id,
          message_text,
          created_at,
          messenger_type,
          is_outgoing,
          file_url,
          file_name,
          file_type,
          clients!inner(name)
        `)
        .ilike('message_text', `%${debouncedQuery}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (clientId) {
        queryBuilder = queryBuilder.eq('client_id', clientId);
      }

      if (organizationId) {
        queryBuilder = queryBuilder.eq('organization_id', organizationId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('[useMessageSearch] Search error:', error);
        throw error;
      }

      const rows = (data || []) as unknown as MessageRow[];

      const results: SearchResult[] = rows.map((msg) => ({
        id: msg.id,
        client_id: msg.client_id,
        message_text: msg.message_text,
        created_at: msg.created_at,
        messenger_type: msg.messenger_type,
        is_outgoing: msg.is_outgoing,
        file_url: msg.file_url,
        file_name: msg.file_name,
        file_type: msg.file_type,
        client_name: msg.clients?.name ?? undefined,
      }));

      console.log(`[useMessageSearch] Found ${results.length} results in ${(performance.now() - startTime).toFixed(2)}ms`);
      return results;
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= minQueryLength,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
  });

  // Highlight matching text
  const highlightMatch = useCallback((text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm || searchTerm.length < minQueryLength) {
      return text;
    }

    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {part}
          </mark>
        );
      }
      return part;
    });
  }, [minQueryLength]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    setQuery,
    results: searchQuery.data || [],
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    error: searchQuery.error,
    highlightMatch,
    clearSearch,
    isSearching: !!debouncedQuery && debouncedQuery.length >= minQueryLength,
  };
};

// Helper to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Hook for in-memory filtering of already loaded messages
 * Use this for filtering messages that are already in memory
 */
export const useLocalMessageFilter = <T extends { message?: string; message_text?: string }>(
  messages: T[],
  searchQuery: string,
  minQueryLength = 2
) => {
  return useMemo(() => {
    if (!searchQuery || searchQuery.length < minQueryLength) {
      return messages;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return messages.filter(msg => {
      const text = msg.message || msg.message_text || '';
      return text.toLowerCase().includes(lowerQuery);
    });
  }, [messages, searchQuery, minQueryLength]);
};

export default useMessageSearch;
