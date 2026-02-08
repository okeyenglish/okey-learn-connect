import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { selfHostedPost } from '@/lib/selfHostedApi';
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
  is_member?: boolean;
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
 * Hook to fetch all staff group chats in the organization
 * Uses self-hosted API since tables are on self-hosted Supabase
 */
// Default organization ID for the main organization (self-hosted)
const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

export const useStaffGroupChats = () => {
  const { user, profile } = useAuth();
  
  // Use profile's organization_id with fallback to default
  const organizationId = profile?.organization_id ?? DEFAULT_ORGANIZATION_ID;
  
  return useQuery({
    queryKey: ['staff-group-chats', organizationId, user?.id],
    queryFn: async () => {
      console.log('[useStaffGroupChats] Fetching groups...', {
        userId: user?.id,
        profileOrgId: profile?.organization_id,
        effectiveOrgId: organizationId,
      });
      
      if (!user?.id) {
        console.log('[useStaffGroupChats] Missing user:', { userId: user?.id });
        return [];
      }
      
      const response = await selfHostedPost<{ groups: StaffGroupChat[] }>('get-staff-group-chats', {
        organization_id: organizationId,
        user_id: user.id,
      });
      
      console.log('[useStaffGroupChats] Response:', {
        success: response.success,
        groupCount: response.data?.groups?.length || 0,
        error: response.error,
        status: (response as any).status,
      });
      
      if (!response.success) {
        console.error('[useStaffGroupChats] Error:', response.error);
        toast.error(`Не удалось загрузить группы: ${response.error || 'Ошибка сервера'}`);
        return [];
      }
      
      return response.data?.groups || [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
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
      
      const response = await selfHostedPost<{ members: StaffGroupMember[] }>('get-staff-group-members', {
        group_id: groupId,
      });
      
      if (!response.success) {
        console.error('[useStaffGroupMembers] Error:', response.error);
        return [];
      }
      
      return response.data?.members || [];
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
  
  // Use same logic as useStaffGroupChats for consistency
  const organizationId = profile?.organization_id ?? DEFAULT_ORGANIZATION_ID;
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      branch_name?: string;
      is_branch_group?: boolean;
      member_ids: string[];
    }) => {
      if (!user?.id) {
        throw new Error('Требуется авторизация');
      }
      
      const response = await selfHostedPost<{ group: StaffGroupChat }>('create-staff-group-chat', {
        name: data.name,
        description: data.description || null,
        organization_id: organizationId,
        branch_name: data.branch_name || null,
        is_branch_group: data.is_branch_group || false,
        created_by: user.id,
        member_ids: data.member_ids,
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create group');
      }
      
      return response.data?.group as StaffGroupChat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      toast.success('Группа создана');
    },
    onError: (error: Error) => {
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
      const response = await selfHostedPost('add-staff-group-member', {
        group_id: data.groupId,
        user_id: data.userId,
        role: data.role || 'member',
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to add member');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-group-members', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      toast.success('Участник добавлен');
    },
    onError: (error: Error) => {
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
      const response = await selfHostedPost('remove-staff-group-member', {
        group_id: data.groupId,
        user_id: data.userId,
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to remove member');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-group-members', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      toast.success('Участник удалён');
    },
    onError: (error: Error) => {
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
      
      const response = await selfHostedPost('remove-staff-group-member', {
        group_id: groupId,
        user_id: user.id,
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to leave group');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      toast.success('Вы покинули группу');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Ошибка выхода из группы');
    },
  });
};
