import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

async function fetchGroupsDirectly(organizationId: string): Promise<StaffGroupChat[]> {
  const { data, error } = await (supabase as any)
    .from('staff_group_chats')
    .select('id, name, description, organization_id, branch_id, branch_name, is_branch_group, created_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('is_branch_group', { ascending: false })
    .order('branch_name', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[useStaffGroupChats] Direct fetch error:', error);
    return [];
  }

  return (data || []) as StaffGroupChat[];
}

export const useStaffGroupChats = () => {
  const { user, profile } = useAuth();

  // NOTE:
  // Staff group chats are currently stored/served via the external self-hosted backend.
  // That backend uses its own single-tenant organization id (DEFAULT_ORGANIZATION_ID).
  // Using the Lovable Cloud profile.organization_id here causes "0 groups" even when groups exist.
  const selfHostedOrganizationId = DEFAULT_ORGANIZATION_ID;

  // Fallback path (direct DB query) is only useful if the tables exist in this backend.
  // In that case, we expect organization_id to match the user's profile organization_id.
  const directOrganizationId = profile?.organization_id ?? DEFAULT_ORGANIZATION_ID;

  return useQuery({
    queryKey: ['staff-group-chats', selfHostedOrganizationId, user?.id],
    queryFn: async () => {
      console.log('[useStaffGroupChats] Fetching groups...', {
        userId: user?.id,
        profileOrgId: profile?.organization_id,
        selfHostedOrgId: selfHostedOrganizationId,
        directOrgId: directOrganizationId,
      });

      if (!user?.id) {
        console.log('[useStaffGroupChats] Missing user:', { userId: user?.id });
        return [];
      }

      // 1) Primary: self-hosted function
      const response = await selfHostedPost<{ groups: StaffGroupChat[] }>('get-staff-group-chats', {
        organization_id: selfHostedOrganizationId,
        user_id: user.id,
      });

      console.log('[useStaffGroupChats] Response:', {
        success: response.success,
        groupCount: response.data?.groups?.length || 0,
        error: response.error,
        status: (response as any).status,
      });

      // 2) Fallback: if function unavailable/returns empty — try reading tables directly (if they exist)
      if (!response.success || (response.data?.groups?.length || 0) === 0) {
        const directGroups = await fetchGroupsDirectly(directOrganizationId);
        if (directGroups.length > 0) return directGroups;

        if (!response.success) {
          console.error('[useStaffGroupChats] Error:', response.error);
          toast.error(`Не удалось загрузить группы: ${response.error || 'Ошибка сервера'}`);
        }

        return directGroups;
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
  const { user } = useAuth();

  // Self-hosted backend uses a single-tenant org id
  const selfHostedOrganizationId = DEFAULT_ORGANIZATION_ID;

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
        organization_id: selfHostedOrganizationId,
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
 * Delete a staff group chat (admin only)
 */
export const useDeleteStaffGroupChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const response = await selfHostedPost('delete-staff-group-chat', {
        group_id: groupId,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete group');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      toast.success('Группа удалена');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Ошибка удаления группы');
    },
  });
};

/**
 * Rename a staff group chat
 */
export const useRenameStaffGroupChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { groupId: string; name: string }) => {
      const response = await selfHostedPost('update-staff-group-chat', {
        group_id: data.groupId,
        name: data.name,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to rename group');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-group-chats'] });
      toast.success('Группа переименована');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Ошибка переименования группы');
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
