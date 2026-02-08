import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface StaffGroupChat {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  branch_id: string | null;
  branch_name: string | null;
  is_branch_group: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
  members?: StaffGroupMember[];
  last_message?: {
    content: string;
    created_at: string;
    sender_name?: string;
  } | null;
  unread_count?: number;
}

export interface StaffGroupMember {
  id: string;
  group_chat_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    branch?: string;
  };
}

/**
 * Hook to fetch all staff group chats the user is a member of
 * This replaces the old useInternalChats hook
 */
export const useStaffGroupChats = () => {
  const { user, profile } = useAuth();
  
  return useQuery({
    queryKey: ['staff-group-chats', user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.organization_id) return [];
      
      // Fetch ALL groups in the organization (for display in list)
      // Branch groups should be visible to everyone in the org
      const { data: allGroups, error: groupsError } = await supabase
        .from('staff_group_chats')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('is_branch_group', { ascending: false }) // Branch groups first
        .order('name', { ascending: true });
      
      if (groupsError) {
        console.error('[useStaffGroupChats] Error fetching groups:', groupsError);
        return [];
      }
      
      // Also get user's memberships to know which groups they're in
      const { data: memberships } = await supabase
        .from('staff_group_chat_members')
        .select('group_chat_id')
        .eq('user_id', user.id);
      
      const memberGroupIds = new Set((memberships || []).map(m => m.group_chat_id));
      
      // Mark groups user is a member of
      const groupsWithMembership = (allGroups || []).map(group => ({
        ...group,
        is_member: memberGroupIds.has(group.id),
      }));
      
      return groupsWithMembership as (StaffGroupChat & { is_member?: boolean })[];
    },
    enabled: !!user?.id && !!profile?.organization_id,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to fetch members of a specific group
 */
export const useStaffGroupMembers = (groupId: string) => {
  return useQuery({
    queryKey: ['staff-group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('staff_group_chat_members')
        .select(`
          *,
          profile:profiles(first_name, last_name, email, branch)
        `)
        .eq('group_chat_id', groupId)
        .order('joined_at', { ascending: true });
      
      if (error) {
        console.error('[useStaffGroupMembers] Error:', error);
        return [];
      }
      
      return (data || []) as StaffGroupMember[];
    },
    enabled: !!groupId,
  });
};

/**
 * Create a new staff group chat
 */
export const useCreateStaffGroupChat = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      branch_name?: string;
      is_branch_group?: boolean;
      member_ids: string[];
    }) => {
      if (!user?.id || !profile?.organization_id) {
        throw new Error('Требуется авторизация');
      }
      
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('staff_group_chats')
        .insert({
          name: data.name,
          description: data.description || null,
          organization_id: profile.organization_id,
          branch_name: data.branch_name || null,
          is_branch_group: data.is_branch_group || false,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (groupError) throw groupError;
      
      // Add creator as admin
      const membersToAdd = [
        { group_chat_id: group.id, user_id: user.id, role: 'admin' },
        ...data.member_ids.map(id => ({
          group_chat_id: group.id,
          user_id: id,
          role: 'member',
        })),
      ];
      
      const { error: membersError } = await supabase
        .from('staff_group_chat_members')
        .insert(membersToAdd);
      
      if (membersError) throw membersError;
      
      return group as StaffGroupChat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      toast.success('Группа создана');
    },
    onError: (error: any) => {
      console.error('[useCreateStaffGroupChat] Error:', error);
      toast.error(error.message || 'Ошибка создания группы');
    },
  });
};

/**
 * Add a member to a group
 */
export const useAddGroupMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { groupId: string; userId: string; role?: string }) => {
      const { error } = await supabase
        .from('staff_group_chat_members')
        .upsert({
          group_chat_id: data.groupId,
          user_id: data.userId,
          role: data.role || 'member',
        }, {
          onConflict: 'group_chat_id,user_id',
          ignoreDuplicates: true,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-group-members', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      toast.success('Участник добавлен');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка добавления участника');
    },
  });
};

/**
 * Remove a member from a group
 */
export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from('staff_group_chat_members')
        .delete()
        .eq('group_chat_id', data.groupId)
        .eq('user_id', data.userId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-group-members', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      toast.success('Участник удалён');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка удаления участника');
    },
  });
};

/**
 * Leave a group
 */
export const useLeaveGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user?.id) throw new Error('Требуется авторизация');
      
      const { error } = await supabase
        .from('staff_group_chat_members')
        .delete()
        .eq('group_chat_id', groupId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      toast.success('Вы покинули группу');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка выхода из группы');
    },
  });
};
