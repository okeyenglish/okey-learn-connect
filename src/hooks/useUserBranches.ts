import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserBranch {
  id: string;
  user_id: string;
  branch: string;
  created_at: string;
}

export interface UserWithBranches {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  branches: string[];
}

// Available branches in the system
export const AVAILABLE_BRANCHES = [
  'Окская',
  'Котельники',
  'Стахановская',
  'Новокосино',
  'Мытищи',
  'Солнцево',
  'Люберцы',
  'Красная Горка',
  'Онлайн',
];

export const useUserBranches = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with their assigned branches
  const { data: usersWithBranches, isLoading } = useQuery({
    queryKey: ['user-branches-management'],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .order('email');

      if (profilesError) throw profilesError;

      // Fetch all user_branches (using raw query since table might not be in types)
      const { data: branches, error: branchesError } = await (supabase as any)
        .from('user_branches')
        .select('id, user_id, branch, created_at');

      if (branchesError) {
        console.warn('user_branches table may not exist:', branchesError);
        // Return profiles without branches if table doesn't exist
        return (profiles || []).map((p: any) => ({
          id: p.id,
          email: p.email || '',
          first_name: p.first_name,
          last_name: p.last_name,
          branches: [],
        }));
      }

      // Group branches by user
      const branchMap = new Map<string, string[]>();
      for (const b of branches || []) {
        const existing = branchMap.get(b.user_id) || [];
        existing.push(b.branch);
        branchMap.set(b.user_id, existing);
      }

      // Combine data
      return (profiles || []).map((p: any) => ({
        id: p.id,
        email: p.email || '',
        first_name: p.first_name,
        last_name: p.last_name,
        branches: branchMap.get(p.id) || [],
      })) as UserWithBranches[];
    },
    staleTime: 30000,
  });

  // Add branch to user
  const addBranchMutation = useMutation({
    mutationFn: async ({ userId, branch }: { userId: string; branch: string }) => {
      const { data, error } = await (supabase as any)
        .from('user_branches')
        .insert({ user_id: userId, branch })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-branches-management'] });
      toast({
        title: 'Филиал добавлен',
        description: 'Доступ к филиалу успешно добавлен',
      });
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast({
          title: 'Филиал уже добавлен',
          description: 'У пользователя уже есть доступ к этому филиалу',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось добавить филиал',
          variant: 'destructive',
        });
      }
    },
  });

  // Remove branch from user
  const removeBranchMutation = useMutation({
    mutationFn: async ({ userId, branch }: { userId: string; branch: string }) => {
      const { error } = await (supabase as any)
        .from('user_branches')
        .delete()
        .eq('user_id', userId)
        .eq('branch', branch);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-branches-management'] });
      toast({
        title: 'Филиал удалён',
        description: 'Доступ к филиалу успешно удалён',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить филиал',
        variant: 'destructive',
      });
    },
  });

  // Set all branches for user (replace existing)
  const setBranchesMutation = useMutation({
    mutationFn: async ({ userId, branches }: { userId: string; branches: string[] }) => {
      // Delete all existing branches
      await (supabase as any)
        .from('user_branches')
        .delete()
        .eq('user_id', userId);

      // Insert new branches
      if (branches.length > 0) {
        const { error } = await (supabase as any)
          .from('user_branches')
          .insert(branches.map(branch => ({ user_id: userId, branch })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-branches-management'] });
      toast({
        title: 'Филиалы обновлены',
        description: 'Доступ к филиалам успешно обновлён',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить филиалы',
        variant: 'destructive',
      });
    },
  });

  return {
    usersWithBranches: usersWithBranches || [],
    isLoading,
    addBranch: addBranchMutation.mutate,
    removeBranch: removeBranchMutation.mutate,
    setBranches: setBranchesMutation.mutate,
    isUpdating: addBranchMutation.isPending || removeBranchMutation.isPending || setBranchesMutation.isPending,
  };
};
