// Stop Salebot import edge function
// Public endpoint to force-stop ongoing Salebot chat import by flipping is_running flag

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env variables');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Try to find a progress row
    const { data: progress, error: selectError } = await supabase
      .from('salebot_import_progress')
      .select('id, is_running, current_offset, total_clients_processed, total_imported, total_messages_imported')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error('Select error:', selectError);
      return new Response(JSON.stringify({ error: selectError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!progress) {
      return new Response(JSON.stringify({ ok: true, message: 'Нет активного процесса импорта' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Parse body to check for force_reset mode
    let forceReset = false;
    try {
      const body = await req.json();
      forceReset = body?.force_reset === true;
    } catch {
      // No body or invalid JSON - that's OK
    }

    // If force_reset, completely reset all flags
    const updateData = forceReset 
      ? { 
          is_running: false, 
          is_paused: false, 
          requires_manual_restart: false,
          resync_mode: false,
          fill_ids_mode: false,
          updated_at: new Date().toISOString()
        }
      : { 
          is_running: false, 
          is_paused: true,
          updated_at: new Date().toISOString()
        };

    const { data: updated, error: updateError } = await supabase
      .from('salebot_import_progress')
      .update(updateData)
      .eq('id', progress.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const message = forceReset 
      ? 'Импорт Salebot принудительно сброшен (все флаги очищены)'
      : 'Импорт Salebot остановлен';

    console.log(`✅ ${message}:`, updated);

    return new Response(
      JSON.stringify({ ok: true, message, progress: updated, forceReset }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
