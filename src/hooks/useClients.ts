import { useState } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SELF_HOSTED_URL, SELF_HOSTED_ANON_KEY, getAuthToken } from '@/lib/selfHostedApi';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  avatar_url?: string;
  telegram_avatar_url?: string;
  whatsapp_avatar_url?: string;
  max_avatar_url?: string;
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
  // Messenger chat IDs
  whatsapp_chat_id?: string | null;
  telegram_chat_id?: string | null;
  telegram_user_id?: number | null;
  max_chat_id?: string | null;
  max_user_id?: number | null;
  // Messenger avatars
  whatsapp_avatar_url?: string | null;
  telegram_avatar_url?: string | null;
  max_avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

/** DB row - self-hosted schema only has avatar_url (no messenger-specific avatars) */
interface ClientRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  avatar_url: string | null;
  is_active: boolean;
  branch: string | null;
  created_at: string;
  updated_at: string;
}

export const useClients = (enabled: boolean = true) => {
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    enabled,
    staleTime: 60000, // Cache for 1 minute to reduce DB load
    gcTime: 300000, // Keep in cache for 5 minutes
    queryFn: async (): Promise<Client[]> => {
      console.log('Fetching clients...');
      try {
        // OPTIMIZED: Limited query to prevent timeout on large datasets (27K+ clients)
        // Use useSearchClients for full search functionality
        const { data, error } = await supabase
          .from('clients')
          .select(`
            id, name, phone, email, notes, avatar_url, 
            is_active, branch, created_at, updated_at
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(500); // Prevent timeout - use search for more
        
        if (error) {
          console.error('Clients fetch error:', error);
          throw error;
        }
        console.log('Clients fetched successfully:', data?.length);
        
        const rows = (data || []) as unknown as ClientRow[];

        return rows.map((client) => ({
          id: client.id,
          name: client.name || '',
          phone: client.phone || '',
          email: client.email ?? undefined,
          notes: client.notes ?? undefined,
          avatar_url: client.avatar_url ?? undefined,
          // Self-hosted schema doesn't have messenger-specific avatars
          telegram_avatar_url: undefined,
          whatsapp_avatar_url: undefined,
          max_avatar_url: undefined,
          is_active: client.is_active,
          branch: client.branch ?? undefined,
          branches: [], // Self-hosted schema doesn't have client_branches
          created_at: client.created_at,
          updated_at: client.updated_at,
        }));
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
    queryFn: async (): Promise<Client | null> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as ClientRow;
      return {
        id: row.id,
        name: row.name || '',
        phone: row.phone || '',
        email: row.email ?? undefined,
        notes: row.notes ?? undefined,
        avatar_url: row.avatar_url ?? undefined,
        // Self-hosted schema doesn't have messenger-specific avatars
        telegram_avatar_url: undefined,
        whatsapp_avatar_url: undefined,
        max_avatar_url: undefined,
        is_active: row.is_active,
        branch: row.branch ?? undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    },
    enabled: !!clientId,
  });

  return {
    client,
    isLoading,
    error,
  };
};

// Self-hosted schema doesn't have client_phone_numbers table
// Return empty array to maintain interface compatibility
export const useClientPhoneNumbers = (clientId: string) => {
  return {
    phoneNumbers: [] as ClientPhoneNumber[],
    isLoading: false,
    error: null,
  };
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
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
      // Use self-hosted Supabase since clients are stored there
      const token = await getAuthToken();
      
      const response = await fetch(`${SELF_HOSTED_URL}/rest/v1/clients?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SELF_HOSTED_ANON_KEY,
          'Authorization': `Bearer ${token || SELF_HOSTED_ANON_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useUpdateClient] Failed to update client:', errorText);
        throw new Error(`Failed to update client: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[useUpdateClient] Client updated:', data);
      return data[0] || data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['client', data.id] });
        queryClient.invalidateQueries({ queryKey: ['family-group', data.id] });
      }
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
      // Self-hosted schema: search directly in clients table (no client_phone_numbers)
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, email, notes, avatar_url, is_active, branch, created_at, updated_at')
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      
      const rows = (data || []) as unknown as ClientRow[];

      const enrichedData: Client[] = rows.map((client) => ({
        id: client.id,
        name: client.name || '',
        phone: client.phone || '',
        email: client.email ?? undefined,
        notes: client.notes ?? undefined,
        avatar_url: client.avatar_url ?? undefined,
        // Self-hosted schema doesn't have messenger-specific avatars
        telegram_avatar_url: undefined,
        whatsapp_avatar_url: undefined,
        max_avatar_url: undefined,
        is_active: client.is_active,
        branch: client.branch ?? undefined,
        created_at: client.created_at,
        updated_at: client.updated_at,
      }));
      
      setSearchResults(enrichedData);
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
