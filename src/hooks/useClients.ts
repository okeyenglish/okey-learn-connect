import { useState } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

/** DB row with joined relations */
interface ClientRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  avatar_url: string | null;
  telegram_avatar_url: string | null;
  whatsapp_avatar_url: string | null;
  max_avatar_url: string | null;
  is_active: boolean;
  branch: string | null;
  created_at: string;
  updated_at: string;
  client_branches?: { branch: string }[] | null;
  client_phone_numbers?: { phone: string; is_primary: boolean }[] | null;
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
            telegram_avatar_url, whatsapp_avatar_url, max_avatar_url,
            is_active, branch, created_at, updated_at,
            client_branches (branch),
            client_phone_numbers (phone, is_primary)
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

        return rows.map((client) => {
          // Get primary phone from client_phone_numbers if clients.phone is empty
          const primaryPhoneRecord = client.client_phone_numbers?.find((p) => p.is_primary);
          const effectivePhone = client.phone || primaryPhoneRecord?.phone || '';
          
          return {
            id: client.id,
            name: client.name || '',
            phone: effectivePhone,
            email: client.email ?? undefined,
            notes: client.notes ?? undefined,
            avatar_url: client.avatar_url ?? undefined,
            telegram_avatar_url: client.telegram_avatar_url ?? undefined,
            whatsapp_avatar_url: client.whatsapp_avatar_url ?? undefined,
            max_avatar_url: client.max_avatar_url ?? undefined,
            is_active: client.is_active,
            branch: client.branch ?? undefined,
            branches: client.client_branches?.map((b) => b.branch) || [],
            created_at: client.created_at,
            updated_at: client.updated_at,
          };
        });
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
        telegram_avatar_url: row.telegram_avatar_url ?? undefined,
        whatsapp_avatar_url: row.whatsapp_avatar_url ?? undefined,
        max_avatar_url: row.max_avatar_url ?? undefined,
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

export const useClientPhoneNumbers = (clientId: string) => {
  const { data: phoneNumbers, isLoading, error } = useQuery({
    queryKey: ['client-phones', clientId],
    queryFn: async (): Promise<ClientPhoneNumber[]> => {
      const { data, error } = await supabase
        .from('client_phone_numbers')
        .select('*')
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as ClientPhoneNumber[];
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
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['client', data.id] });
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
      // Normalize phone for search (remove +, spaces, brackets, dashes)
      const normalizedQuery = query.replace(/[\s\+\-\(\)]/g, '');
      const isPhoneSearch = /^\d{5,}$/.test(normalizedQuery);
      
      let clientIdsFromPhones: string[] = [];
      
      // If looks like phone - search in client_phone_numbers first
      if (isPhoneSearch) {
        const { data: phoneMatches } = await supabase
          .from('client_phone_numbers')
          .select('client_id')
          .ilike('phone', `%${normalizedQuery}%`)
          .limit(20);
        
        if (phoneMatches && phoneMatches.length > 0) {
          clientIdsFromPhones = phoneMatches.map(p => p.client_id);
        }
      }
      
      // Build the main query
      let queryBuilder = supabase
        .from('clients')
        .select(`
          *, 
          client_phone_numbers (phone, is_primary)
        `)
        .eq('is_active', true);
      
      if (clientIdsFromPhones.length > 0) {
        // Search by name/email OR by found IDs from phone numbers
        queryBuilder = queryBuilder.or(
          `name.ilike.%${query}%,email.ilike.%${query}%,id.in.(${clientIdsFromPhones.join(',')})`
        );
      } else {
        // Normal search by name, phone in clients, email
        queryBuilder = queryBuilder.or(
          `name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`
        );
      }
      
      const { data, error } = await queryBuilder.limit(20);

      if (error) throw error;
      
      const rows = (data || []) as unknown as ClientRow[];

      // Enrich with primary phone from client_phone_numbers if clients.phone is empty
      const enrichedData: Client[] = rows.map((client) => {
        const primaryPhone = client.client_phone_numbers?.find((p) => p.is_primary);
        return {
          id: client.id,
          name: client.name || '',
          phone: client.phone || primaryPhone?.phone || '',
          email: client.email ?? undefined,
          notes: client.notes ?? undefined,
          avatar_url: client.avatar_url ?? undefined,
          telegram_avatar_url: client.telegram_avatar_url ?? undefined,
          whatsapp_avatar_url: client.whatsapp_avatar_url ?? undefined,
          max_avatar_url: client.max_avatar_url ?? undefined,
          is_active: client.is_active,
          branch: client.branch ?? undefined,
          created_at: client.created_at,
          updated_at: client.updated_at,
        };
      });
      
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
