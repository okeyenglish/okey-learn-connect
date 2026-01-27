import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/typedClient";
import { useAuth } from "@/hooks/useAuth";

interface SharedTeacherChatState {
  teacher_id: string;
  is_pinned: boolean;
  user_id: string;
  pinned_by_others: boolean;
  pinned_by_user_name?: string;
}

/**
 * Hook to get shared teacher chat states - shows if a teacher is "in work" by other users
 */
export const useSharedTeacherChatStates = (teacherIds: string[] = []) => {
  const [sharedStates, setSharedStates] = useState<Record<string, SharedTeacherChatState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  // Stabilize teacherIds to prevent infinite loops
  const teacherIdsKey = useMemo(() => {
    if (!teacherIds || teacherIds.length === 0) return '';
    return [...teacherIds].sort().join(',');
  }, [teacherIds]);
  
  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSharedStates = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const currentTeacherIds = teacherIdsKey ? teacherIdsKey.split(',') : [];
    
    if (currentTeacherIds.length === 0) {
      setSharedStates({});
      setIsLoading(false);
      return;
    }

    try {
      const CHUNK_SIZE = 100;
      const myStatesMap = new Map<string, boolean>();
      const allPinsMap = new Map<string, { user_id: string; user_name: string }[]>();

      // Fetch my states - chunked
      for (let i = 0; i < currentTeacherIds.length; i += CHUNK_SIZE) {
        const chunk = currentTeacherIds.slice(i, i + CHUNK_SIZE);
        
        const { data: myStates, error: myStatesError } = await supabase
          .from('teacher_chat_states')
          .select('teacher_id, is_pinned')
          .eq('user_id', user.id)
          .eq('is_pinned', true)
          .in('teacher_id', chunk);

        if (myStatesError) {
          console.error('Error fetching my teacher chat states chunk:', myStatesError);
          continue;
        }

        (myStates || []).forEach((state: { teacher_id: string; is_pinned: boolean }) => {
          myStatesMap.set(state.teacher_id, state.is_pinned);
        });
      }

      // Fetch all pins with user names - chunked
      for (let i = 0; i < currentTeacherIds.length; i += CHUNK_SIZE) {
        const chunk = currentTeacherIds.slice(i, i + CHUNK_SIZE);
        
        const { data: allPins, error: allPinsError } = await supabase
          .from('teacher_chat_states')
          .select('teacher_id, user_id, profiles:user_id(first_name, last_name)')
          .eq('is_pinned', true)
          .in('teacher_id', chunk);

        if (allPinsError) {
          console.error('Error fetching all teacher pins chunk:', allPinsError);
          continue;
        }

        (allPins || []).forEach((pin) => {
          const existing = allPinsMap.get(pin.teacher_id) || [];
          // profiles can be array or object depending on relationship
          const profile = Array.isArray(pin.profiles) ? pin.profiles[0] : pin.profiles;
          const userName = profile ? 
            `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Пользователь' :
            'Пользователь';
          existing.push({ user_id: pin.user_id, user_name: userName });
          allPinsMap.set(pin.teacher_id, existing);
        });
      }

      // Build final state map
      const statesMap: Record<string, SharedTeacherChatState> = {};
      currentTeacherIds.forEach((teacherId) => {
        const isPinnedByMe = myStatesMap.get(teacherId) || false;
        const allPins = allPinsMap.get(teacherId) || [];
        const otherPins = allPins.filter(p => p.user_id !== user.id);
        const pinnedByOthers = otherPins.length > 0;
        const pinnedByUserName = otherPins[0]?.user_name || '';

        statesMap[teacherId] = {
          teacher_id: teacherId,
          is_pinned: isPinnedByMe,
          user_id: isPinnedByMe ? user.id : '',
          pinned_by_others: pinnedByOthers,
          pinned_by_user_name: pinnedByUserName
        };
      });

      setSharedStates(statesMap);
    } catch (error) {
      console.error('Error in fetchSharedTeacherStates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, teacherIdsKey]);
  
  const debouncedFetch = useCallback(() => {
    if (debouncedFetchRef.current) {
      clearTimeout(debouncedFetchRef.current);
    }
    debouncedFetchRef.current = setTimeout(() => {
      fetchSharedStates();
    }, 2000);
  }, [fetchSharedStates]);

  useEffect(() => {
    if (!user?.id || !teacherIdsKey) {
      setIsLoading(false);
      return;
    }

    fetchSharedStates();

    // Subscribe to changes
    const changesChannel = supabase
      .channel('shared-teacher-chat-states-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'teacher_chat_states' }, 
        () => {
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
      }
      supabase.removeChannel(changesChannel);
    };
  }, [user?.id, teacherIdsKey, fetchSharedStates, debouncedFetch]);

  const isInWorkByOthers = useCallback((teacherId: string): boolean => {
    const state = sharedStates[teacherId];
    return state ? state.pinned_by_others && !state.is_pinned : false;
  }, [sharedStates]);

  const isPinnedByCurrentUser = useCallback((teacherId: string): boolean => {
    const state = sharedStates[teacherId];
    return state ? state.is_pinned : false;
  }, [sharedStates]);

  const isPinnedByAnyone = useCallback((teacherId: string): boolean => {
    const state = sharedStates[teacherId];
    return state ? (state.is_pinned || state.pinned_by_others) : false;
  }, [sharedStates]);

  const getPinnedByUserName = useCallback((teacherId: string): string => {
    const state = sharedStates[teacherId];
    return state?.pinned_by_user_name || '';
  }, [sharedStates]);

  return {
    isInWorkByOthers,
    isPinnedByCurrentUser,
    isPinnedByAnyone,
    getPinnedByUserName,
    isLoading
  };
};

export default useSharedTeacherChatStates;
