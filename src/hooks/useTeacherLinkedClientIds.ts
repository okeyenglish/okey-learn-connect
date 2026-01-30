import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useMemo } from 'react';

/**
 * Hook to get all client IDs that are linked to teachers via teacher_client_links.
 * These clients should appear in the "Teachers" folder instead of the main clients list.
 */
export const useTeacherLinkedClientIds = () => {
  const { data: linkedClientIds = [], isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-linked-client-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_client_links')
        .select('client_id');
      
      if (error) {
        console.warn('[useTeacherLinkedClientIds] Error fetching links:', error.message);
        return [];
      }
      
      // Return unique client IDs
      const ids = (data || [])
        .map((link: { client_id: string }) => link.client_id)
        .filter(Boolean);
      
      return [...new Set(ids)];
    },
    staleTime: 60000, // 1 minute - links don't change often
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Create a Set for fast O(1) lookups
  const linkedClientIdsSet = useMemo(
    () => new Set(linkedClientIds),
    [linkedClientIds]
  );

  // Helper to check if a client is linked to a teacher
  const isClientLinkedToTeacher = (clientId: string): boolean => {
    return linkedClientIdsSet.has(clientId);
  };

  return {
    linkedClientIds,
    linkedClientIdsSet,
    isClientLinkedToTeacher,
    isLoading,
    error,
    refetch,
  };
};

export default useTeacherLinkedClientIds;
