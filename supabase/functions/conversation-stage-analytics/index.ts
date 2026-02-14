import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SELF_HOSTED_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get org
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse period
    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "30d";
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString();

    // ── Funnel: count conversations per stage ──
    const { data: statesRaw } = await supabase
      .from("conversation_states")
      .select("current_stage, confidence, updated_at, client_id")
      .eq("organization_id", orgId)
      .gte("updated_at", sinceISO);

    const states = statesRaw || [];

    // Get stages config for ordering
    const { data: stagesConfig } = await supabase
      .from("conversation_stages")
      .select("stage_key, label, sort_order")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("sort_order");

    const orderedStages = (stagesConfig || []).map((s: any) => s.stage_key);
    if (orderedStages.length === 0) {
      // Default stages
      orderedStages.push(
        "greeting", "qualification", "need_discovery", "value_explanation",
        "objection", "offer", "closing", "follow_up"
      );
    }

    // Count per stage
    const stageCounts: Record<string, number> = {};
    for (const s of states) {
      stageCounts[s.current_stage] = (stageCounts[s.current_stage] || 0) + 1;
    }

    const totalConversations = states.length;
    const firstStageCount = stageCounts[orderedStages[0]] || totalConversations || 1;

    const funnel = orderedStages.map((stage: string, i: number) => {
      const count = stageCounts[stage] || 0;
      const percentage = totalConversations > 0 ? (count / firstStageCount) * 100 : 0;
      const prevCount = i > 0 ? (stageCounts[orderedStages[i - 1]] || 0) : count;
      const dropOff = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;
      return {
        stage,
        count,
        percentage,
        avg_duration_min: 0, // Would need timestamp tracking per stage
        drop_off_rate: Math.max(0, dropOff),
      };
    });

    // ── Transitions ──
    const { data: transitionsRaw } = await supabase
      .from("conversation_stage_transitions")
      .select("from_stage, to_stage, confidence")
      .eq("organization_id", orgId)
      .gte("created_at", sinceISO);

    const transMap = new Map<string, { count: number; totalConf: number }>();
    for (const t of transitionsRaw || []) {
      const key = `${t.from_stage}→${t.to_stage}`;
      const existing = transMap.get(key) || { count: 0, totalConf: 0 };
      existing.count++;
      existing.totalConf += (t.confidence || 0);
      transMap.set(key, existing);
    }

    const transitions = Array.from(transMap.entries())
      .map(([key, val]) => {
        const [from_stage, to_stage] = key.split("→");
        return {
          from_stage,
          to_stage,
          count: val.count,
          avg_confidence: val.count > 0 ? val.totalConf / val.count : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // ── NBA Effectiveness ──
    const { data: nbaRaw } = await supabase
      .from("next_best_actions")
      .select("action_type, action_label, stage_key, success_rate, priority")
      .eq("organization_id", orgId)
      .eq("is_active", true);

    const nba_effectiveness = (nbaRaw || []).map((n: any) => ({
      action_type: n.action_type,
      action_label: n.action_label,
      times_shown: 0,
      times_used: 0,
      success_rate: (n.success_rate || 0) * 100,
      stage: n.stage_key,
    }));

    // ── Top paths (from action_outcomes) ──
    const { data: outcomesRaw } = await supabase
      .from("conversation_action_outcomes")
      .select("client_id, stage_at_action, action_type, led_to_conversion")
      .eq("organization_id", orgId)
      .eq("led_to_conversion", true)
      .gte("created_at", sinceISO)
      .limit(500);

    // Group by client to find paths
    const clientPaths = new Map<string, string[]>();
    for (const o of outcomesRaw || []) {
      if (!clientPaths.has(o.client_id)) {
        clientPaths.set(o.client_id, []);
      }
      clientPaths.get(o.client_id)!.push(o.stage_at_action);
    }

    // Aggregate paths
    const pathCounts = new Map<string, { count: number }>();
    for (const [_, path] of clientPaths) {
      // Deduplicate consecutive stages
      const deduped = path.filter((s, i) => i === 0 || s !== path[i - 1]);
      const key = deduped.join("→");
      const existing = pathCounts.get(key) || { count: 0 };
      existing.count++;
      pathCounts.set(key, existing);
    }

    const top_paths = Array.from(pathCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([pathStr, val]) => ({
        manager_name: `${val.count} диалогов`,
        path: pathStr.split("→"),
        conversion_rate: 100,
        avg_deal_time_hours: 0,
      }));

    // ── Period stats ──
    const uniqueClients = new Set(states.map((s) => s.client_id)).size;
    const closingCount = stageCounts["closing"] || 0;
    const conversionRate = uniqueClients > 0 ? (closingCount / uniqueClients) * 100 : 0;
    const hesitationCount = stageCounts["objection"] || 0;
    const hesitationRate = uniqueClients > 0 ? (hesitationCount / uniqueClients) * 100 : 0;

    const period_stats = {
      total_conversations: uniqueClients,
      avg_stages_per_deal: uniqueClients > 0 ? states.length / uniqueClients : 0,
      avg_time_to_close_hours: 0,
      conversion_rate: conversionRate,
      hesitation_rate: hesitationRate,
    };

    // ── Daily distribution ──
    const dailyMap = new Map<string, Record<string, number>>();
    for (const s of states) {
      const day = s.updated_at.substring(0, 10);
      if (!dailyMap.has(day)) {
        dailyMap.set(day, {});
      }
      const dayData = dailyMap.get(day)!;
      dayData[s.current_stage] = (dayData[s.current_stage] || 0) + 1;
    }

    const daily_stage_distribution = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stages]) => ({ date, ...stages }));

    return new Response(
      JSON.stringify({
        funnel,
        transitions,
        nba_effectiveness,
        top_paths,
        period_stats,
        daily_stage_distribution,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[conversation-stage-analytics] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
