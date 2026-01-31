import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScenarioStats {
  scenario: string;
  count: number;
  avgQuality: number;
  conversions: number;
  conversionRate: number;
}

interface LowQualityExample {
  id: string;
  scenario: string;
  quality: number;
  summary: string;
  outcome: string;
  created_at: string;
}

interface AnalyticsResponse {
  total: number;
  avgQuality: number;
  approvedCount: number;
  approvedRate: number;
  conversionRate: number;
  byScenario: ScenarioStats[];
  byOutcome: Record<string, number>;
  qualityDistribution: Record<string, number>;
  lowQualityExamples: LowQualityExample[];
  dailyTrends: Array<{
    date: string;
    count: number;
    avgQuality: number;
    conversions: number;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[conversation-analytics] Fetching analytics data...');

    // Fetch all conversation examples
    const { data: examples, error } = await supabase
      .from('conversation_examples')
      .select('id, scenario_type, quality_score, outcome, approved, context_summary, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[conversation-analytics] DB error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!examples || examples.length === 0) {
      return new Response(
        JSON.stringify({
          total: 0,
          avgQuality: 0,
          approvedCount: 0,
          approvedRate: 0,
          conversionRate: 0,
          byScenario: [],
          byOutcome: {},
          qualityDistribution: {},
          lowQualityExamples: [],
          dailyTrends: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[conversation-analytics] Processing ${examples.length} examples`);

    // Calculate basic metrics
    const total = examples.length;
    const avgQuality = examples.reduce((sum, e) => sum + (e.quality_score || 0), 0) / total;
    const approvedCount = examples.filter(e => e.approved).length;
    const approvedRate = (approvedCount / total) * 100;
    const conversions = examples.filter(e => e.outcome === 'converted').length;
    const conversionRate = (conversions / total) * 100;

    // Group by scenario
    const scenarioMap = new Map<string, { count: number; qualitySum: number; conversions: number }>();
    
    for (const ex of examples) {
      const scenario = ex.scenario_type || 'unknown';
      const current = scenarioMap.get(scenario) || { count: 0, qualitySum: 0, conversions: 0 };
      current.count++;
      current.qualitySum += ex.quality_score || 0;
      if (ex.outcome === 'converted') current.conversions++;
      scenarioMap.set(scenario, current);
    }

    const byScenario: ScenarioStats[] = Array.from(scenarioMap.entries())
      .map(([scenario, stats]) => ({
        scenario,
        count: stats.count,
        avgQuality: stats.qualitySum / stats.count,
        conversions: stats.conversions,
        conversionRate: (stats.conversions / stats.count) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Group by outcome
    const byOutcome: Record<string, number> = {};
    for (const ex of examples) {
      const outcome = ex.outcome || 'unknown';
      byOutcome[outcome] = (byOutcome[outcome] || 0) + 1;
    }

    // Quality distribution
    const qualityDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const ex of examples) {
      const q = Math.round(ex.quality_score || 0);
      if (q >= 1 && q <= 5) {
        qualityDistribution[String(q)]++;
      }
    }

    // Low quality examples (quality < 3)
    const lowQualityExamples: LowQualityExample[] = examples
      .filter(e => (e.quality_score || 0) < 3)
      .slice(0, 20)
      .map(e => ({
        id: e.id,
        scenario: e.scenario_type || 'unknown',
        quality: e.quality_score || 0,
        summary: e.context_summary || '',
        outcome: e.outcome || 'unknown',
        created_at: e.created_at,
      }));

    // Daily trends (last 30 days)
    const dailyMap = new Map<string, { count: number; qualitySum: number; conversions: number }>();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const ex of examples) {
      const date = new Date(ex.created_at);
      if (date >= thirtyDaysAgo) {
        const dateKey = date.toISOString().split('T')[0];
        const current = dailyMap.get(dateKey) || { count: 0, qualitySum: 0, conversions: 0 };
        current.count++;
        current.qualitySum += ex.quality_score || 0;
        if (ex.outcome === 'converted') current.conversions++;
        dailyMap.set(dateKey, current);
      }
    }

    const dailyTrends = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        avgQuality: stats.qualitySum / stats.count,
        conversions: stats.conversions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const response: AnalyticsResponse = {
      total,
      avgQuality: Math.round(avgQuality * 100) / 100,
      approvedCount,
      approvedRate: Math.round(approvedRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      byScenario,
      byOutcome,
      qualityDistribution,
      lowQualityExamples,
      dailyTrends,
    };

    console.log('[conversation-analytics] Analytics computed successfully');

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[conversation-analytics] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
