import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface LeadSource {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadStatus {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  is_success: boolean;
  is_failure: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name?: string;
  middle_name?: string;
  phone: string;
  email?: string;
  age?: number;
  subject?: string;
  level?: string;
  branch: string;
  preferred_time?: string;
  preferred_days?: string[];
  notes?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  lead_source_id?: string;
  status_id?: string;
  assigned_to?: string;
  converted_to_student_id?: string;
  created_at: string;
  updated_at: string;
  lead_source?: LeadSource;
  lead_status?: LeadStatus;
}

export interface LeadStatusHistory {
  id: string;
  lead_id: string;
  from_status_id?: string;
  to_status_id?: string;
  changed_by?: string;
  notes?: string;
  created_at: string;
  from_status?: LeadStatus;
  to_status?: LeadStatus;
}

// Хук для получения источников лидов
export const useLeadSources = () => {
  const { data: leadSources, isLoading, error } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as LeadSource[];
    },
  });

  return {
    leadSources: leadSources || [],
    isLoading,
    error,
  };
};

// Хук для получения статусов лидов
export const useLeadStatuses = () => {
  const { data: leadStatuses, isLoading, error } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as LeadStatus[];
    },
  });

  return {
    leadStatuses: leadStatuses || [],
    isLoading,
    error,
  };
};

// Хук для получения лидов
export const useLeads = (filters?: {
  status_id?: string;
  branch?: string;
  assigned_to?: string;
}) => {
  const { data: leads, isLoading, error } = useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          *,
          lead_source:lead_sources(id, name, is_active, created_at, updated_at),
          lead_status:lead_statuses(id, name, color, is_active, is_success, is_failure, sort_order, created_at, updated_at)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status_id) {
        query = query.eq('status_id', filters.status_id);
      }
      
      if (filters?.branch) {
        query = query.eq('branch', filters.branch);
      }
      
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Lead[];
    },
  });

  return {
    leads: leads || [],
    isLoading,
    error,
  };
};

// Хук для получения одного лида
export const useLead = (leadId: string) => {
  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          lead_source:lead_sources(id, name, is_active, created_at, updated_at),
          lead_status:lead_statuses(id, name, color, is_active, is_success, is_failure, sort_order, created_at, updated_at)  
        `)
        .eq('id', leadId)
        .single();
      
      if (error) throw error;
      return data as Lead;
    },
    enabled: !!leadId,
  });

  return {
    lead,
    isLoading,
    error,
  };
};

// Хук для создания лида
export const useCreateLead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};

// Хук для обновления лида
export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', data.id] });
    },
  });
};

// Хук для удаления лида
export const useDeleteLead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};

// Хук для получения истории статусов лида
export const useLeadStatusHistory = (leadId: string) => {
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['lead-status-history', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_status_history')
        .select(`
          *,
          from_status:lead_statuses!lead_status_history_from_status_id_fkey(name, color),
          to_status:lead_statuses!lead_status_history_to_status_id_fkey(name, color)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeadStatusHistory[];
    },
    enabled: !!leadId,
  });

  return {
    history: history || [],
    isLoading,
    error,
  };
};

// Хук для поиска дублей лидов
export const useSearchDuplicateLeads = () => {
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchDuplicates = async (phone: string) => {
    if (!phone.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          lead_source:lead_sources(id, name, is_active, created_at, updated_at),
          lead_status:lead_statuses(id, name, color, is_active, is_success, is_failure, sort_order, created_at, updated_at)
        `)
        .eq('phone', phone);

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
    searchResults,
    isSearching,
    searchDuplicates,
    clearSearch: () => setSearchResults([]),
  };
};

// Хук для статистики по лидам
export const useLeadsStats = (branch?: string) => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['leads-stats', branch],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          status_id,
          lead_status:lead_statuses(name, color, is_success, is_failure)
        `);

      if (branch) {
        query = query.eq('branch', branch);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Группируем статистику по статусам
      const statsMap = new Map();
      data.forEach((lead: any) => {
        const status = lead.lead_status;
        if (status) {
          if (statsMap.has(status.name)) {
            statsMap.set(status.name, {
              ...statsMap.get(status.name),
              count: statsMap.get(status.name).count + 1
            });
          } else {
            statsMap.set(status.name, {
              name: status.name,
              color: status.color,
              is_success: status.is_success,
              is_failure: status.is_failure,
              count: 1
            });
          }
        }
      });

      return Array.from(statsMap.values());
    },
  });

  return {
    stats: stats || [],
    isLoading,
    error,
  };
};