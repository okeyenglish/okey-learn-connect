import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { corsHeaders } from '../_shared/types.ts';

/**
 * Auto-index conversations that have "cooled down" (24h+ inactive, 5+ messages).
 * Called by cron job, no JWT required.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const cooldownHours = body.cooldownHours || 24;
    const minMessages = body.minMessages || 5;
    const maxBatch = body.maxBatch || 20;

    console.log(`[auto-index] Starting: cooldown=${cooldownHours}h, minMessages=${minMessages}, maxBatch=${maxBatch}`);

    // Find clients with recent conversations that have cooled down
    const cooldownDate = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
    const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days

    // Get all messages from last 30 days to find eligible conversations
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('client_id, created_at')
      .gte('created_at', recentDate)
      .order('created_at', { ascending: false });

    if (msgError) {
      console.error('[auto-index] Messages query error:', msgError);
      return new Response(
        JSON.stringify({ success: false, error: msgError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by client, find those with enough messages and last message before cooldown
    const clientStats = new Map<string, { count: number; lastMessage: string }>();
    for (const msg of messages || []) {
      if (!msg.client_id) continue;
      const existing = clientStats.get(msg.client_id);
      if (!existing) {
        clientStats.set(msg.client_id, { count: 1, lastMessage: msg.created_at });
      } else {
        existing.count++;
        if (msg.created_at > existing.lastMessage) {
          existing.lastMessage = msg.created_at;
        }
      }
    }

    // Filter: enough messages AND cooled down
    const eligibleClients = Array.from(clientStats.entries())
      .filter(([_, stats]) => stats.count >= minMessages && stats.lastMessage < cooldownDate);

    // Exclude already indexed clients
    const clientIds = eligibleClients.map(([id]) => id).slice(0, maxBatch * 2);
    
    if (clientIds.length === 0) {
      console.log('[auto-index] No eligible conversations found');
      return new Response(
        JSON.stringify({ success: true, indexed: 0, message: 'No eligible conversations' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: alreadyIndexed } = await supabase
      .from('conversation_examples')
      .select('source_client_id')
      .in('source_client_id', clientIds);

    const indexedSet = new Set((alreadyIndexed || []).map((r: any) => r.source_client_id));
    const toIndex = eligibleClients
      .filter(([id]) => !indexedSet.has(id))
      .slice(0, maxBatch);

    console.log(`[auto-index] Found ${eligibleClients.length} eligible, ${indexedSet.size} already indexed, ${toIndex.length} to process`);

    if (toIndex.length === 0) {
      return new Response(
        JSON.stringify({ success: true, indexed: 0, message: 'All eligible conversations already indexed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the existing index-conversations function for each client
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || supabaseServiceKey;
    let indexed = 0;
    let errors = 0;

    for (const [clientId] of toIndex) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/index-conversations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId,
            daysBack: 30,
            minMessages,
            maxConversations: 1,
            minQuality: 3,
            dryRun: false,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.indexed > 0) {
            indexed++;
            console.log(`[auto-index] Successfully indexed client ${clientId}`);
          }
        } else {
          const text = await response.text();
          console.warn(`[auto-index] Failed for ${clientId}: ${response.status} ${text}`);
          errors++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`[auto-index] Error for ${clientId}:`, err);
        errors++;
      }
    }

    console.log(`[auto-index] Complete: ${indexed} indexed, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, indexed, errors, total: toIndex.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[auto-index] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
