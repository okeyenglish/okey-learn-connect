import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallLogsRequest {
  action: 'list' | 'get' | 'history' | 'search';
  clientId?: string;
  callId?: string;
  phoneNumber?: string;
  limit?: number;
  offset?: number;
  filters?: {
    status?: string;
    direction?: string;
    dateFrom?: string;
    dateTo?: string;
    managerId?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Необходима авторизация' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's token for RLS
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and get organization
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Пользователь не авторизован' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Организация не найдена' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;
    
    // Use service role client for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CallLogsRequest = await req.json().catch(() => ({ action: 'list' }));
    const { action = 'list', clientId, callId, phoneNumber, limit = 100, offset = 0, filters } = body;

    console.log(`[get-call-logs] Action: ${action}, org: ${organizationId}, clientId: ${clientId}, phone: ${phoneNumber}`);

    // Search by phone number action
    if (action === 'search' && phoneNumber) {
      const digits = phoneNumber.replace(/\D/g, '');
      const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
      
      console.log('[get-call-logs] Searching calls by phone:', last10);
      
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .ilike('phone_number', `%${last10}%`)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(
        JSON.stringify({ 
          success: true, 
          calls: data || [], 
          total: data?.length || 0,
          searchedPhone: last10
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get' && callId) {
      // Get single call with details
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', callId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, call: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'history' && clientId) {
      // Get call history for a client - first try by client_id
      let { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // If no calls found by client_id, try fallback search by phone number
      if (!data || data.length === 0) {
        console.log('[get-call-logs] No calls by client_id, trying phone fallback');
        
        // Get client's phone numbers
        const { data: client } = await supabase
          .from('clients')
          .select('phone')
          .eq('id', clientId)
          .single();
        
        const { data: additionalPhones } = await supabase
          .from('client_phone_numbers')
          .select('phone')
          .eq('client_id', clientId);
        
        const phones: string[] = [];
        if (client?.phone) phones.push(client.phone);
        if (additionalPhones) {
          phones.push(...additionalPhones.map(p => p.phone).filter(Boolean));
        }
        
        if (phones.length > 0) {
          // Normalize phones for search (extract last 10 digits)
          const normalizedPhones = phones.map(p => {
            const digits = (p.match(/\d+/g) || []).join('');
            return digits.length >= 10 ? digits.slice(-10) : digits;
          }).filter(p => p.length >= 10);
          
          console.log('[get-call-logs] Searching calls by phones:', normalizedPhones);
          
          if (normalizedPhones.length > 0) {
            // Build OR conditions for phone matching
            const phoneConditions = normalizedPhones.map(p => `phone_number.ilike.%${p}%`).join(',');
            
            const { data: phoneData, error: phoneError } = await supabase
              .from('call_logs')
              .select('*')
              .eq('organization_id', organizationId)
              .or(phoneConditions)
              .order('started_at', { ascending: false })
              .limit(limit);
            
            if (!phoneError && phoneData && phoneData.length > 0) {
              data = phoneData;
              console.log('[get-call-logs] Found', phoneData.length, 'calls by phone fallback');
              
              // Optionally: update these call_logs to link them to the client
              const callIds = phoneData.filter(c => !c.client_id).map(c => c.id);
              if (callIds.length > 0) {
                console.log('[get-call-logs] Linking', callIds.length, 'orphan calls to client:', clientId);
                await supabase
                  .from('call_logs')
                  .update({ client_id: clientId })
                  .in('id', callIds);
              }
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, calls: data || [], total: data?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: list all calls with filters
    let query = supabase
      .from('call_logs')
      .select('*, clients(id, name, phone)', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.direction) {
      query = query.eq('direction', filters.direction);
    }
    if (filters?.managerId) {
      query = query.eq('manager_id', filters.managerId);
    }
    if (filters?.dateFrom) {
      query = query.gte('started_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('started_at', filters.dateTo);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        calls: data || [], 
        total: count || 0,
        limit,
        offset 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-call-logs] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
