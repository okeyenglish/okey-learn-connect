import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarkViewedRequest {
  action: 'mark' | 'get-unviewed-count';
  clientId?: string;
  callIds?: string[];
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
    
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Пользователь не авторизован' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: MarkViewedRequest = await req.json().catch(() => ({ action: 'get-unviewed-count' }));
    const { action, clientId, callIds } = body;

    console.log(`[mark-calls-viewed] Action: ${action}, clientId: ${clientId}, callIds count: ${callIds?.length || 0}`);

    if (action === 'mark' && callIds && callIds.length > 0) {
      // Mark specific calls as viewed
      const { error: updateError, count } = await supabase
        .from('call_logs')
        .update({ 
          is_viewed: true,
          viewed_at: new Date().toISOString(),
          viewed_by: user.id
        })
        .eq('organization_id', organizationId)
        .in('id', callIds);

      if (updateError) {
        console.error('[mark-calls-viewed] Update error:', updateError);
        throw updateError;
      }

      console.log(`[mark-calls-viewed] Marked ${count || callIds.length} calls as viewed`);

      return new Response(
        JSON.stringify({ success: true, markedCount: count || callIds.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-unviewed-count' && clientId) {
      // Get count of unviewed missed calls for a client
      // First try by client_id
      let { data: calls, error } = await supabase
        .from('call_logs')
        .select('id')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .eq('status', 'missed')
        .or('is_viewed.is.null,is_viewed.eq.false');

      if (error) throw error;

      // If no calls by client_id, try phone fallback
      if (!calls || calls.length === 0) {
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
          phones.push(...additionalPhones.map((p: { phone: string }) => p.phone).filter(Boolean));
        }

        if (phones.length > 0) {
          const normalizedPhones = phones.map(p => {
            const digits = (p.match(/\d+/g) || []).join('');
            return digits.length >= 10 ? digits.slice(-10) : digits;
          }).filter(p => p.length >= 10);

          if (normalizedPhones.length > 0) {
            const phoneConditions = normalizedPhones.map(p => `phone_number.ilike.%${p}%`).join(',');
            
            const { data: phoneCalls, error: phoneError } = await supabase
              .from('call_logs')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('status', 'missed')
              .or('is_viewed.is.null,is_viewed.eq.false')
              .or(phoneConditions);

            if (!phoneError && phoneCalls) {
              calls = phoneCalls;
            }
          }
        }
      }

      const unviewedCount = calls?.length || 0;
      const unviewedIds = calls?.map(c => c.id) || [];

      return new Response(
        JSON.stringify({ 
          success: true, 
          unviewedCount,
          unviewedIds
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Неверный запрос' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mark-calls-viewed] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
