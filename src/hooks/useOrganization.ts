import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: string;
  plan_type: string;
  settings: Record<string, unknown> | null;
  branding: Record<string, unknown> | null;
  max_students: number | null;
  max_users: number | null;
  max_branches: number | null;
  created_at: string;
  updated_at: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

export interface OrganizationBranch {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  working_hours: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useOrganization = () => {
  const { profile } = useAuth();

  const { data: organization, isLoading: organizationLoading } = useQuery({
    queryKey: ['organization', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (error) throw error;
      return data as Organization;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['organization-branches', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('organization_branches')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Удаление дубликатов по названию (оставляем первую запись)
      const uniqueBranches = ((data || []) as OrganizationBranch[]).reduce((acc, branch) => {
        const existing = acc.find(b => b.name === branch.name);
        if (!existing) acc.push(branch);
        return acc;
      }, [] as OrganizationBranch[]);
      
      return uniqueBranches;
    },
    enabled: !!profile?.organization_id,
  });

  const getBranchById = (branchId: string) => {
    return branches.find(b => b.id === branchId);
  };

  const getBranchByName = (branchName: string) => {
    return branches.find(b => b.name === branchName);
  };

  const getBranchNames = () => {
    return branches.map(b => b.name);
  };

  const getBranchesForSelect = () => {
    return branches.map(b => ({
      value: b.name,
      label: b.name,
      address: b.address || '',
    }));
  };

  return {
    organization,
    organizationId: profile?.organization_id,
    branches,
    isLoading: organizationLoading || branchesLoading,
    getBranchById,
    getBranchByName,
    getBranchNames,
    getBranchesForSelect,
  };
};
