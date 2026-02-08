import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';

export interface StaffBranchGroup {
  id: string;
  name: string;
  description: string | null;
  branch_name: string | null;
  is_branch_group: boolean;
  member_count?: number;
}

/**
 * Hook to fetch staff group chats that the current user is a member of
 * This includes branch-based groups created automatically on employee onboarding
 */
export const useStaffBranchGroups = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['staff-branch-groups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get the groups the user is a member of
      const { data: memberships, error: memberError } = await supabase
        .from('staff_group_chat_members')
        .select('group_chat_id')
        .eq('user_id', user.id);
      
      if (memberError) {
        console.error('[useStaffBranchGroups] Error fetching memberships:', memberError);
        return [];
      }
      
      if (!memberships || memberships.length === 0) {
        return [];
      }
      
      const groupIds = memberships.map(m => m.group_chat_id);
      
      // Then fetch the group details
      const { data: groups, error: groupsError } = await supabase
        .from('staff_group_chats')
        .select('*')
        .in('id', groupIds)
        .order('name');
      
      if (groupsError) {
        console.error('[useStaffBranchGroups] Error fetching groups:', groupsError);
        return [];
      }
      
      return (groups || []) as StaffBranchGroup[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
