import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';

export interface ForwardClient {
  id: string;
  name: string;
  phone: string | null;
  branch: string | null;
  telegram_user_id: string | null;
  whatsapp_id: string | null;
}

export interface ForwardTeacher {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  branch: string | null;
}

export const useForwardClients = (search: string, enabled: boolean) => {
  const { profile } = useAuth();
  const debouncedSearch = useDebounce(search, 300);

  return useQuery({
    queryKey: ['forward-clients', debouncedSearch, profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      let query = supabase
        .from('clients')
        .select('id, name, phone, branch, telegram_user_id, whatsapp_id, first_name, last_name')
        .eq('organization_id', profile.organization_id)
        .order('name')
        .limit(50);

      if (debouncedSearch.trim()) {
        const q = `%${debouncedSearch.trim()}%`;
        query = query.or(`name.ilike.${q},phone.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching clients for forward:', error);
        return [];
      }

      return (data || []).map(c => ({
        id: c.id,
        name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Без имени',
        phone: c.phone,
        branch: c.branch,
        telegram_user_id: c.telegram_user_id,
        whatsapp_id: c.whatsapp_id,
      })) as ForwardClient[];
    },
    enabled: enabled && !!profile?.organization_id,
    staleTime: 30_000,
  });
};

export const useForwardTeachers = (search: string, enabled: boolean) => {
  const { profile } = useAuth();
  const debouncedSearch = useDebounce(search, 300);

  return useQuery({
    queryKey: ['forward-teachers', debouncedSearch, profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      let query = supabase
        .from('teachers')
        .select('id, first_name, last_name, phone, branch')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('first_name')
        .limit(50);

      if (debouncedSearch.trim()) {
        const q = `%${debouncedSearch.trim()}%`;
        query = query.or(`first_name.ilike.${q},last_name.ilike.${q},phone.ilike.${q}`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching teachers for forward:', error);
        return [];
      }

      return (data || []) as ForwardTeacher[];
    },
    enabled: enabled && !!profile?.organization_id,
    staleTime: 30_000,
  });
};
