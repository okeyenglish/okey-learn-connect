import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  successResponse,
  createSelfHostedSupabaseClient,
} from '../_shared/types.ts';

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

interface TeamMetrics {
  total_conversations: number;
  total_converted: number;
  team_conversion_rate: number;
  avg_response_time: number;
  top_conversion_path: string[] | null;
  worst_loss_path: string[] | null;
  best_hour: number | null;
  worst_hour: number | null;
  active_managers: number;
  conversion_spread: number | null;
}

interface ManagerData {
  manager_id: string;
  manager_name: string;
  total_conversations: number;
  conversion_rate: number;
  avg_response_time: number;
  avg_first_response: number;
  most_used_path: string[] | null;
  best_path: string[] | null;
  peak_hour: number | null;
}

interface TopPath {
  stage_path: string[];
  total_conversations: number;
  converted: number;
  conversion_rate: number;
  avg_response_time: number;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSelfHostedSupabaseClient(createClient);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body = await req.json().catch(() => ({}));
    const organizationId = body.organization_id;
    const days = body.days || 30;
    const mode = body.mode || 'full'; // 'full' | 'insights_only' | 'coaching_only'

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organization_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[team-intelligence] Starting analysis for org=${organizationId}, days=${days}, mode=${mode}`);

    // ========================================
    // 1. Собираем данные
    // ========================================

    // Командные метрики
    const { data: teamMetrics, error: teamError } = await supabase
      .rpc('get_team_metrics', { p_organization_id: organizationId, p_days: days });

    if (teamError) {
      console.error('[team-intelligence] Error fetching team metrics:', teamError);
      throw new Error(`Failed to fetch team metrics: ${teamError.message}`);
    }

    const metrics: TeamMetrics | null = teamMetrics?.[0] || null;

    // Сравнение менеджеров
    const { data: managerComparison, error: managerError } = await supabase
      .rpc('get_manager_comparison', { p_organization_id: organizationId, p_days: days });

    if (managerError) {
      console.error('[team-intelligence] Error fetching manager comparison:', managerError);
      throw new Error(`Failed to fetch manager comparison: ${managerError.message}`);
    }

    const managers: ManagerData[] = managerComparison || [];

    // Топ путей
    const { data: topPaths, error: pathsError } = await supabase
      .rpc('get_top_conversation_paths', {
        p_organization_id: organizationId,
        p_days: days,
        p_limit: 15,
      });

    if (pathsError) {
      console.error('[team-intelligence] Error fetching top paths:', pathsError);
      throw new Error(`Failed to fetch top paths: ${pathsError.message}`);
    }

    const paths: TopPath[] = topPaths || [];

    // Последние инсайты (для контекста, чтобы не повторяться)
    const { data: recentInsights } = await supabase
      .from('team_insights')
      .select('title, insight_type, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!metrics || managers.length === 0) {
      console.log('[team-intelligence] Not enough data for analysis');
      return successResponse({
        status: 'skipped',
        reason: 'Not enough data for analysis',
        metrics_available: !!metrics,
        managers_count: managers.length,
      });
    }

    console.log(`[team-intelligence] Data collected: ${managers.length} managers, ${paths.length} paths`);

    // ========================================
    // 2. Генерируем инсайты команды
    // ========================================

    const results: { insights: number; coaching_tips: number } = { insights: 0, coaching_tips: 0 };

    if (mode === 'full' || mode === 'insights_only') {
      const insightsCount = await generateTeamInsights(
        supabase, LOVABLE_API_KEY, organizationId, days,
        metrics, managers, paths, recentInsights || []
      );
      results.insights = insightsCount;
    }

    // ========================================
    // 3. Генерируем персональные coaching tips
    // ========================================

    if (mode === 'full' || mode === 'coaching_only') {
      const coachingCount = await generateCoachingTips(
        supabase, LOVABLE_API_KEY, organizationId, days,
        metrics, managers, paths
      );
      results.coaching_tips = coachingCount;
    }

    console.log(`[team-intelligence] Done: ${results.insights} insights, ${results.coaching_tips} coaching tips`);

    return successResponse({
      status: 'completed',
      ...results,
      period_days: days,
      managers_analyzed: managers.length,
    });

  } catch (error) {
    console.error('[team-intelligence] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ========================================
// AI: Генерация командных инсайтов
// ========================================

async function generateTeamInsights(
  supabase: any,
  apiKey: string,
  organizationId: string,
  days: number,
  metrics: TeamMetrics,
  managers: ManagerData[],
  paths: TopPath[],
  recentInsights: any[]
): Promise<number> {
  const systemPrompt = `You are a Team Intelligence AI analyst for an education CRM system (language school).
You analyze team communication patterns and generate actionable insights.

IMPORTANT:
- All output MUST be in Russian language
- Be specific with numbers and percentages
- Focus on actionable recommendations
- Don't repeat insights that were already generated recently

Available insight types:
- path_efficiency: efficiency of conversation paths
- timing_pattern: time-based patterns
- team_bottleneck: team bottlenecks
- behavior_drift: behavior changes
- conversion_driver: what drives conversions
- loss_pattern: patterns leading to lost clients
- best_practice: best practices from data
- anomaly: unusual patterns

Severity levels: info, warning, critical, opportunity`;

  const userPrompt = `Analyze the following team data for the last ${days} days and generate 3-5 insights.

## Team Metrics
- Total conversations: ${metrics.total_conversations}
- Converted: ${metrics.total_converted} (${metrics.team_conversion_rate}%)
- Avg response time: ${metrics.avg_response_time}s
- Best conversion path: ${JSON.stringify(metrics.top_conversion_path)}
- Worst loss path: ${JSON.stringify(metrics.worst_loss_path)}
- Best hour: ${metrics.best_hour}:00
- Worst hour: ${metrics.worst_hour}:00
- Active managers: ${metrics.active_managers}
- Conversion spread (std dev): ${metrics.conversion_spread}%

## Manager Performance
${managers.map(m => `- ${m.manager_name}: ${m.total_conversations} conversations, ${m.conversion_rate}% conversion, avg response ${m.avg_response_time}s, first response ${m.avg_first_response}s, peak hour ${m.peak_hour}:00, best path: ${JSON.stringify(m.best_path)}`).join('\n')}

## Top Conversation Paths
${paths.map(p => `- ${JSON.stringify(p.stage_path)}: ${p.total_conversations} convs, ${p.conversion_rate}% conversion, avg response ${p.avg_response_time}s`).join('\n')}

## Recently Generated Insights (avoid repeating)
${recentInsights.map(i => `- [${i.insight_type}] ${i.title}`).join('\n') || 'None'}

Return insights using the suggest_insights tool.`;

  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'suggest_insights',
          description: 'Return team insights based on analysis',
          parameters: {
            type: 'object',
            properties: {
              insights: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    insight_type: {
                      type: 'string',
                      enum: ['path_efficiency', 'timing_pattern', 'team_bottleneck', 'behavior_drift', 'conversion_driver', 'loss_pattern', 'best_practice', 'anomaly'],
                    },
                    severity: { type: 'string', enum: ['info', 'warning', 'critical', 'opportunity'] },
                    title: { type: 'string', description: 'Short title in Russian' },
                    description: { type: 'string', description: 'Detailed description in Russian' },
                    recommendation: { type: 'string', description: 'Actionable recommendation in Russian' },
                    potential_impact_pct: { type: 'number', description: 'Estimated conversion improvement %' },
                    confidence: { type: 'number', description: 'Confidence 0-100' },
                    affected_manager_names: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['insight_type', 'severity', 'title', 'description', 'recommendation', 'confidence'],
                  additionalProperties: false,
                },
              },
            },
            required: ['insights'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'suggest_insights' } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[team-intelligence] AI error (insights): ${response.status}`, errorText);
    return 0;
  }

  const aiResult = await response.json();
  const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    console.error('[team-intelligence] No tool call in AI response');
    return 0;
  }

  let parsed: { insights: any[] };
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch (e) {
    console.error('[team-intelligence] Failed to parse AI response:', e);
    return 0;
  }

  // Маппинг имён менеджеров → UUID
  const managerNameMap = new Map(managers.map(m => [m.manager_name, m.manager_id]));

  let insertedCount = 0;
  const today = new Date();
  const periodStart = new Date(today);
  periodStart.setDate(periodStart.getDate() - days);

  for (const insight of parsed.insights) {
    const affectedManagerIds = (insight.affected_manager_names || [])
      .map((name: string) => managerNameMap.get(name))
      .filter(Boolean);

    const { error } = await supabase.from('team_insights').insert({
      organization_id: organizationId,
      insight_type: insight.insight_type,
      severity: insight.severity,
      title: insight.title,
      description: insight.description,
      recommendation: insight.recommendation,
      potential_impact_pct: insight.potential_impact_pct || null,
      confidence: insight.confidence,
      affected_managers: affectedManagerIds.length > 0 ? affectedManagerIds : null,
      evidence: {
        team_conversion_rate: metrics.team_conversion_rate,
        managers_count: managers.length,
        period_days: days,
      },
      period_start: periodStart.toISOString().split('T')[0],
      period_end: today.toISOString().split('T')[0],
      status: 'active',
    });

    if (error) {
      console.error('[team-intelligence] Error inserting insight:', error);
    } else {
      insertedCount++;
    }
  }

  return insertedCount;
}

// ========================================
// AI: Генерация персональных coaching tips
// ========================================

async function generateCoachingTips(
  supabase: any,
  apiKey: string,
  organizationId: string,
  days: number,
  metrics: TeamMetrics,
  managers: ManagerData[],
  paths: TopPath[]
): Promise<number> {
  let totalTips = 0;

  // Генерируем tips для каждого менеджера
  for (const manager of managers) {
    if (manager.total_conversations < 3) continue; // слишком мало данных

    const tips = await generateManagerCoachingTips(
      supabase, apiKey, organizationId, days, metrics, manager, managers, paths
    );
    totalTips += tips;

    // Небольшая пауза между запросами чтобы не hit rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return totalTips;
}

async function generateManagerCoachingTips(
  supabase: any,
  apiKey: string,
  organizationId: string,
  days: number,
  teamMetrics: TeamMetrics,
  manager: ManagerData,
  allManagers: ManagerData[],
  paths: TopPath[]
): Promise<number> {
  // Найти лучшего менеджера для сравнения
  const bestManager = allManagers.reduce((best, m) =>
    m.conversion_rate > best.conversion_rate ? m : best, allManagers[0]);

  const systemPrompt = `You are an AI Coach for a language school CRM.
You provide personalized, constructive coaching tips to managers based on their performance data.

RULES:
- All output in Russian
- Be encouraging but specific
- Focus on 1-2 most impactful improvements
- Reference specific numbers
- Compare with team average, not named individuals
- Categories: speed, qualification, objection, closing, follow_up, tone, timing, general`;

  const userPrompt = `Generate 1-2 coaching tips for this manager.

## Manager: ${manager.manager_name}
- Conversations: ${manager.total_conversations}
- Conversion rate: ${manager.conversion_rate}% (team avg: ${teamMetrics.team_conversion_rate}%)
- Avg response time: ${manager.avg_response_time}s (team best: ${Math.min(...allManagers.map(m => m.avg_response_time))}s)
- First response: ${manager.avg_first_response}s
- Peak hour: ${manager.peak_hour}:00
- Most used path: ${JSON.stringify(manager.most_used_path)}
- Best path: ${JSON.stringify(manager.best_path)}

## Team Context
- Team avg conversion: ${teamMetrics.team_conversion_rate}%
- Best conversion rate: ${bestManager.conversion_rate}%
- Best converting path: ${JSON.stringify(teamMetrics.top_conversion_path)}
- Worst loss path: ${JSON.stringify(teamMetrics.worst_loss_path)}

Return tips using the suggest_coaching tool.`;

  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'suggest_coaching',
          description: 'Return coaching tips for the manager',
          parameters: {
            type: 'object',
            properties: {
              tips: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'string',
                      enum: ['speed', 'qualification', 'objection', 'closing', 'follow_up', 'tone', 'timing', 'general'],
                    },
                    title: { type: 'string', description: 'Short title in Russian' },
                    tip: { type: 'string', description: 'Detailed tip text in Russian' },
                    example_good: { type: 'string', description: 'Example of good behavior in Russian' },
                    example_bad: { type: 'string', description: 'Example of bad behavior in Russian (anonymized)' },
                    comparison_with: { type: 'string', enum: ['team_avg', 'top_performer', 'own_history'] },
                    metric_current: { type: 'number' },
                    metric_target: { type: 'number' },
                  },
                  required: ['category', 'title', 'tip', 'comparison_with'],
                  additionalProperties: false,
                },
              },
            },
            required: ['tips'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'suggest_coaching' } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[team-intelligence] AI error (coaching ${manager.manager_name}): ${response.status}`, errorText);
    return 0;
  }

  const aiResult = await response.json();
  const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    console.error(`[team-intelligence] No tool call for manager ${manager.manager_name}`);
    return 0;
  }

  let parsed: { tips: any[] };
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch (e) {
    console.error('[team-intelligence] Failed to parse coaching response:', e);
    return 0;
  }

  let insertedCount = 0;

  for (const tip of parsed.tips) {
    const { error } = await supabase.from('manager_coaching_tips').insert({
      organization_id: organizationId,
      manager_id: manager.manager_id,
      category: tip.category,
      title: tip.title,
      tip: tip.tip,
      example_good: tip.example_good || null,
      example_bad: tip.example_bad || null,
      comparison_with: tip.comparison_with,
      metric_current: tip.metric_current || null,
      metric_target: tip.metric_target || null,
      based_on: {
        period_days: days,
        manager_conversations: manager.total_conversations,
        manager_conversion: manager.conversion_rate,
        team_avg_conversion: teamMetrics.team_conversion_rate,
      },
      status: 'pending',
    });

    if (error) {
      console.error('[team-intelligence] Error inserting coaching tip:', error);
    } else {
      insertedCount++;
    }
  }

  return insertedCount;
}
