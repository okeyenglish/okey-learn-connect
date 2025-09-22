import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  avatar_url?: string;
  is_active: boolean;
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
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .not('name', 'ilike', 'Преподаватель:%')
        .not('name', 'ilike', 'Teacher:%')
        .not('name', 'ilike', 'Чат педагогов - %')
        .not('name', 'ilike', 'Корпоративный чат - %')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Client[];
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
    mutationFn: async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
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
        .not('name', 'ilike', 'Преподаватель:%')
        .not('name', 'ilike', 'Teacher:%')
        .not('name', 'ilike', 'Чат педагогов - %')
        .not('name', 'ilike', 'Корпоративный чат - %')
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