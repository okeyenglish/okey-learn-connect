import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';

interface TeacherPinRow {
  teacher_id: string;
  is_pinned: boolean;
}

const CACHE_KEY = 'pinned-teacher-chats-cache';

// Get cached pinned IDs from localStorage for instant display
const getCachedPinnedIds = (userId: string | undefined): Set<string> => {
  if (!userId) return new Set();
  try {
    const stored = localStorage.getItem(`${CACHE_KEY}-${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Set(Array.isArray(parsed) ? parsed : []);
    }
  } catch (e) {
    console.error('Error loading cached pinned teachers:', e);
  }
  return new Set();
};

// Save to localStorage cache
const saveCachedPinnedIds = (userId: string, pinnedIds: Set<string>) => {
  try {
    localStorage.setItem(`${CACHE_KEY}-${userId}`, JSON.stringify([...pinnedIds]));
  } catch (e) {
    console.error('Error saving cached pinned teachers:', e);
  }
};

/**
 * Hook to manage teacher chat pinned states per user, stored in DB.
 * Uses localStorage as a cache for instant display, with DB as source of truth.
 */
export const useTeacherPinnedDB = () => {
  const { user } = useAuth();
  
  // Initialize from localStorage cache for instant display
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => 
    getCachedPinnedIds(user?.id)
  );
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  // Load pinned teachers from database
  const loadPinnedTeachers = useCallback(async () => {
    if (!user) {
      setPinnedIds(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('teacher_chat_states')
        .select('teacher_id, is_pinned')
        .eq('user_id', user.id)
        .eq('is_pinned', true);

      if (error) {
        console.error('Error loading pinned teachers:', error);
        // Table might not exist yet, keep cache
        setLoading(false);
        return;
      }

      const rows = (data || []) as TeacherPinRow[];
      const newPinnedIds = new Set(rows.map(r => r.teacher_id));
      
      // Update state and cache
      setPinnedIds(newPinnedIds);
      saveCachedPinnedIds(user.id, newPinnedIds);
      initialLoadDone.current = true;
    } catch (error) {
      console.error('Error loading pinned teachers:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update from cache when user changes
  useEffect(() => {
    if (user?.id) {
      const cached = getCachedPinnedIds(user.id);
      if (cached.size > 0) {
        setPinnedIds(cached);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    loadPinnedTeachers();

    // Subscribe to realtime changes
    if (user) {
      const channel = supabase
        .channel(`teacher-pinned-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'teacher_chat_states',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Teacher pin state change:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newState = payload.new as TeacherPinRow;
              setPinnedIds(prev => {
                const newSet = new Set(prev);
                if (newState.is_pinned) {
                  newSet.add(newState.teacher_id);
                } else {
                  newSet.delete(newState.teacher_id);
                }
                // Update cache
                if (user.id) saveCachedPinnedIds(user.id, newSet);
                return newSet;
              });
            } else if (payload.eventType === 'DELETE') {
              const oldState = payload.old as TeacherPinRow;
              setPinnedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(oldState.teacher_id);
                // Update cache
                if (user.id) saveCachedPinnedIds(user.id, newSet);
                return newSet;
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadPinnedTeachers, user]);

  // Toggle pin state for a teacher
  const togglePin = useCallback(async (teacherId: string): Promise<boolean> => {
    if (!user) return false;

    const isPinned = pinnedIds.has(teacherId);
    const newPinnedState = !isPinned;

    // Optimistic update FIRST for instant UI feedback
    setPinnedIds(prev => {
      const newSet = new Set(prev);
      if (newPinnedState) {
        newSet.add(teacherId);
      } else {
        newSet.delete(teacherId);
      }
      // Update cache immediately
      saveCachedPinnedIds(user.id, newSet);
      return newSet;
    });

    try {
      const { error } = await supabase
        .from('teacher_chat_states')
        .upsert({
          user_id: user.id,
          teacher_id: teacherId,
          is_pinned: newPinnedState
        }, {
          onConflict: 'user_id,teacher_id'
        });

      if (error) {
        console.error('Error toggling teacher pin:', error);
        // Rollback on error
        setPinnedIds(prev => {
          const newSet = new Set(prev);
          if (isPinned) {
            newSet.add(teacherId);
          } else {
            newSet.delete(teacherId);
          }
          saveCachedPinnedIds(user.id, newSet);
          return newSet;
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error toggling teacher pin:', error);
      return false;
    }
  }, [user, pinnedIds]);

  // Check if a teacher is pinned
  const isPinned = useCallback((teacherId: string): boolean => {
    return pinnedIds.has(teacherId);
  }, [pinnedIds]);

  // Get pin counts for compatibility with existing components
  const getPinCounts = useCallback((): Record<string, number> => {
    const counts: Record<string, number> = {};
    pinnedIds.forEach(id => {
      counts[id] = 1;
    });
    return counts;
  }, [pinnedIds]);

  return {
    pinnedIds,
    loading,
    togglePin,
    isPinned,
    getPinCounts,
    refetch: loadPinnedTeachers
  };
};
