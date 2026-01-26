import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';

interface TeacherPinState {
  teacherId: string;
  isPinned: boolean;
}

interface TeacherPinRow {
  teacher_id: string;
  is_pinned: boolean;
}

/**
 * Hook to manage teacher chat pinned states per user, stored in DB.
 * Each user has their own pinned state for each teacher chat.
 */
export const useTeacherPinnedDB = () => {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
        // Table might not exist yet, fail gracefully
        setPinnedIds(new Set());
        setLoading(false);
        return;
      }

      const rows = (data || []) as TeacherPinRow[];
      setPinnedIds(new Set(rows.map(r => r.teacher_id)));
    } catch (error) {
      console.error('Error loading pinned teachers:', error);
      setPinnedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [user]);

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
                return newSet;
              });
            } else if (payload.eventType === 'DELETE') {
              const oldState = payload.old as TeacherPinRow;
              setPinnedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(oldState.teacher_id);
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
        return false;
      }

      // Optimistic update
      setPinnedIds(prev => {
        const newSet = new Set(prev);
        if (newPinnedState) {
          newSet.add(teacherId);
        } else {
          newSet.delete(teacherId);
        }
        return newSet;
      });

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
