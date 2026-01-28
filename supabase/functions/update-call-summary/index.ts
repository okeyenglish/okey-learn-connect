import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionItem {
  task: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
}

interface RequestBody {
  callId: string;
  summary: string | null;
  agreements: string | null;
  manual_action_items: ActionItem[] | null;
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

    const { callId, summary, agreements, manual_action_items } = await req.json() as RequestBody;

    if (!callId) {
      return new Response(
        JSON.stringify({ error: 'callId обязателен' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify call belongs to organization
    const { data: existingCall, error: checkError } = await supabase
      .from('call_logs')
      .select('id')
      .eq('id', callId)
      .eq('organization_id', organizationId)
      .single();

    if (checkError || !existingCall) {
      return new Response(
        JSON.stringify({ error: 'Звонок не найден' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update call with summary, agreements, and action items
    const { error: updateError } = await supabase
      .from('call_logs')
      .update({ 
        summary,
        agreements,
        manual_action_items,
        updated_at: new Date().toISOString()
      })
      .eq('id', callId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[update-call-summary] Updated call ${callId} with summary, agreements, and ${manual_action_items?.length || 0} tasks`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[update-call-summary] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
