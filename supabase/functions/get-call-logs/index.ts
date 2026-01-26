import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallLogsRequest {
  action: 'list' | 'get' | 'history';
  clientId?: string;
  callId?: string;
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
    const { action = 'list', clientId, callId, limit = 100, offset = 0, filters } = body;

    console.log(`[get-call-logs] Action: ${action}, org: ${organizationId}, clientId: ${clientId}`);

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
      // Get call history for a client
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

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
