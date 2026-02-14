import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  successResponse,
  createSelfHostedSupabaseClient,
} from '../_shared/types.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSelfHostedSupabaseClient(createClient);
    const body = await req.json().catch(() => ({}));
    const organizationId = body.organization_id;
    const days = body.days || 30;
    const mode = body.mode || 'all'; // 'all' | 'distribution' | 'trends' | 'top_messages'

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organization_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceDateStr = sinceDate.toISOString();

    const result: Record<string, any> = {};

    // 1. Intent distribution (pie chart data)
    if (mode === 'all' || mode === 'distribution') {
      const { data: events, error } = await supabase
        .from('team_behavior_events')
        .select('client_intent')
        .eq('organization_id', organizationId)
        .eq('is_incoming', true)
        .not('client_intent', 'is', null)
        .gte('created_at', sinceDateStr);

      if (error) {
        console.error('[get-client-intents] distribution error:', error);
      } else {
        const intentCounts: Record<string, number> = {};
        for (const e of (events || [])) {
          const intent = e.client_intent || 'unknown';
          intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        }
        result.distribution = Object.entries(intentCounts)
          .map(([intent, count]) => ({ intent, count }))
          .sort((a, b) => b.count - a.count);
        result.total_incoming = events?.length || 0;
      }
    }

    // 2. Daily trends (line chart data)
    if (mode === 'all' || mode === 'trends') {
      const { data: events, error } = await supabase
        .from('team_behavior_events')
        .select('client_intent, created_at')
        .eq('organization_id', organizationId)
        .eq('is_incoming', true)
        .not('client_intent', 'is', null)
        .gte('created_at', sinceDateStr)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[get-client-intents] trends error:', error);
      } else {
        // Group by date and intent
        const dayMap = new Map<string, Record<string, number>>();
        for (const e of (events || [])) {
          const day = e.created_at.split('T')[0];
          if (!dayMap.has(day)) dayMap.set(day, {});
          const intents = dayMap.get(day)!;
          const intent = e.client_intent || 'unknown';
          intents[intent] = (intents[intent] || 0) + 1;
        }

        result.trends = Array.from(dayMap.entries()).map(([date, intents]) => ({
          date,
          ...intents,
          total: Object.values(intents).reduce((s, v) => s + v, 0),
        }));
      }
    }

    // 3. Top incoming messages by intent (sample messages)
    if (mode === 'all' || mode === 'top_messages') {
      // Get recent incoming messages with intents from chat_messages via behavior events
      const { data: events, error } = await supabase
        .from('team_behavior_events')
        .select('client_intent, metadata, created_at, client_id')
        .eq('organization_id', organizationId)
        .eq('is_incoming', true)
        .not('client_intent', 'is', null)
        .gte('created_at', sinceDateStr)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[get-client-intents] top_messages error:', error);
      } else {
        // Group messages by intent, take top 5 per intent
        const intentMessages: Record<string, Array<{ text: string; date: string; client_id: string }>> = {};
        for (const e of (events || [])) {
          const intent = e.client_intent;
          if (!intentMessages[intent]) intentMessages[intent] = [];
          if (intentMessages[intent].length < 5) {
            // Try to get message text from metadata
            const text = e.metadata?.message_preview || e.metadata?.content_preview || '';
            intentMessages[intent].push({
              text: text.slice(0, 200),
              date: e.created_at,
              client_id: e.client_id,
            });
          }
        }
        result.top_messages = intentMessages;
      }
    }

    // 4. Intent conversion correlation
    if (mode === 'all') {
      const { data: events, error } = await supabase
        .from('team_behavior_events')
        .select('client_intent, outcome')
        .eq('organization_id', organizationId)
        .eq('is_incoming', true)
        .not('client_intent', 'is', null)
        .not('outcome', 'is', null)
        .gte('created_at', sinceDateStr);

      if (error) {
        console.error('[get-client-intents] conversion error:', error);
      } else {
        const intentOutcomes: Record<string, { total: number; converted: number }> = {};
        for (const e of (events || [])) {
          const intent = e.client_intent;
          if (!intentOutcomes[intent]) intentOutcomes[intent] = { total: 0, converted: 0 };
          intentOutcomes[intent].total++;
          if (e.outcome === 'converted' || e.outcome === 'trial_booked') {
            intentOutcomes[intent].converted++;
          }
        }
        result.intent_conversion = Object.entries(intentOutcomes)
          .map(([intent, data]) => ({
            intent,
            total: data.total,
            converted: data.converted,
            conversion_rate: data.total > 0 ? data.converted / data.total : 0,
          }))
          .sort((a, b) => b.total - a.total);
      }
    }

    return successResponse(result);
  } catch (error) {
    console.error('[get-client-intents] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
