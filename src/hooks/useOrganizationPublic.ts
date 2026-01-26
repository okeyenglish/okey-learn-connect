import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  settings: {
    logo_url?: string;
    primary_color?: string;
    description?: string;
    phone?: string;
    email?: string;
    website?: string;
    social_links?: {
      vk?: string;
      telegram?: string;
      whatsapp?: string;
      instagram?: string;
    };
  } | null;
}

export const useOrganizationBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['public-organization', slug],
    queryFn: async (): Promise<PublicOrganization | null> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, settings')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Error fetching organization by slug:', error);
        return null;
      }

      return data as PublicOrganization;
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });
};

export const useOrganizationBranches = (organizationId: string) => {
  return useQuery({
    queryKey: ['org-public-branches', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_branches')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching organization branches:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
};
