import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  avatar_url?: string;
  is_active: boolean;
  branch?: string;
  branches?: string[]; // Multiple branches
  created_at: string;
  updated_at: string;
}

export interface ClientPhoneNumber {
  id: string;
  client_id: string;
  phone: string;
  phone_type: string;
  is_primary: boolean;
  is_whatsapp_enabled: boolean;
  is_telegram_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useClients = () => {
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log('Fetching clients...', { userId: supabase.auth.getUser() });
      try {
        const { data, error } = await supabase
          .from('clients')
          .select(`
            *,
            client_branches (
              branch
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Clients fetch error:', error);
          throw error;
        }
        console.log('Clients fetched successfully:', data?.length);
        
        return (data || []).map(client => ({
          ...client,
          branches: client.client_branches?.map((b: any) => b.branch) || [],
        })) as Client[];
      } catch (err) {
        console.error('Client fetch failed:', err);
        throw err;
      }
    },
  });

  return {
    clients: clients || [],
    isLoading,
    error,
  };
};

export const useClient = (clientId: string) => {
  const { data: client, isLoading, error } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      return data as Client;
    },
    enabled: !!clientId,
  });

  return {
    client,
    isLoading,
    error,
  };
};

export const useClientPhoneNumbers = (clientId: string) => {
  const { data: phoneNumbers, isLoading, error } = useQuery({
    queryKey: ['client-phones', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_phone_numbers')
        .select('*')
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false });
      
      if (error) throw error;
      return data as ClientPhoneNumber[];
    },
    enabled: !!clientId,
  });

  return {
    phoneNumbers: phoneNumbers || [],
    isLoading,
    error,
  };
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
      const orgId = await getCurrentOrganizationId();
      
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...clientData, organization_id: orgId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', data.id] });
    },
  });
};

export const useSearchClients = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchClients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchQuery('');
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchQuery,
    searchResults,
    isSearching,
    searchClients,
    clearSearch: () => {
      setSearchQuery('');
      setSearchResults([]);
    },
  };
};