import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DialogueMessage {
  role: 'manager' | 'client';
  content: string;
  timestamp: string;
}

interface DialogueExample {
  id: string;
  scenario_type: string;
  outcome: string;
  quality_score: number;
  context_summary: string;
  example_messages: DialogueMessage[];
  key_phrases: string[];
  created_at: string;
  client_name?: string;
  message_count?: number;
  // Новые поля
  intent?: string | null;
  issue?: string | null;
  confidence_score?: number;
  client_stage?: string;
}

interface RequestBody {
  scenario_type?: string;
  outcome?: string;
  intent?: string;
  issue?: string;
  min_quality?: number;
  limit?: number;
  offset?: number;
  sort_by?: 'quality_score' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Необходима авторизация' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: RequestBody = req.method === 'POST' ? await req.json() : {};
    const {
      scenario_type,
      outcome,
      intent,
      issue,
      min_quality = 4,
      limit = 50,
      offset = 0,
      sort_by = 'quality_score',
      sort_order = 'desc'
    } = body;

    console.log('[get-successful-dialogues] Request params:', {
      scenario_type,
      outcome,
      intent,
      issue,
      min_quality,
      limit,
      offset,
      sort_by,
      sort_order
    });

    // Build query for successful dialogues
    let query = supabase
      .from('conversation_examples')
      .select('*', { count: 'exact' })
      .eq('approved', true)
      .gte('quality_score', min_quality);

    // Apply filters
    if (scenario_type && scenario_type !== 'all') {
      query = query.eq('scenario_type', scenario_type);
    }

    if (outcome && outcome !== 'all') {
      query = query.eq('outcome', outcome);
    }

    if (intent && intent !== 'all') {
      query = query.eq('intent', intent);
    }

    if (issue && issue !== 'all') {
      query = query.eq('issue', issue);
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: dialogues, error: dialoguesError, count } = await query;

    if (dialoguesError) {
      console.error('[get-successful-dialogues] Query error:', dialoguesError);
      return new Response(
        JSON.stringify({ error: 'Ошибка получения диалогов', details: dialoguesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all approved dialogues for aggregation
    const { data: allApproved } = await supabase
      .from('conversation_examples')
      .select('scenario_type, outcome, intent, issue')
      .eq('approved', true)
      .gte('quality_score', min_quality);

    // Aggregate by various fields
    const byScenario: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    const byIntent: Record<string, number> = {};
    const byIssue: Record<string, number> = {};

    if (allApproved) {
      allApproved.forEach((item: { scenario_type?: string; outcome?: string; intent?: string; issue?: string }) => {
        // Scenario
        const scenario = item.scenario_type || 'unknown';
        byScenario[scenario] = (byScenario[scenario] || 0) + 1;
        
        // Outcome
        const outc = item.outcome || 'unknown';
        byOutcome[outc] = (byOutcome[outc] || 0) + 1;
        
        // Intent
        if (item.intent && item.intent !== 'unknown') {
          byIntent[item.intent] = (byIntent[item.intent] || 0) + 1;
        }
        
        // Issue
        if (item.issue) {
          byIssue[item.issue] = (byIssue[item.issue] || 0) + 1;
        }
      });
    }

    // Transform dialogues to response format
    const transformedDialogues: DialogueExample[] = (dialogues || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      scenario_type: d.scenario_type as string || 'unknown',
      outcome: d.outcome as string || 'unknown',
      quality_score: d.quality_score as number || 0,
      context_summary: d.context_summary as string || d.summary as string || '',
      example_messages: (d.example_messages as DialogueMessage[]) || (d.messages as DialogueMessage[]) || [],
      key_phrases: (d.key_phrases as string[]) || [],
      created_at: d.created_at as string,
      message_count: Array.isArray(d.example_messages) 
        ? d.example_messages.length 
        : (Array.isArray(d.messages) ? (d.messages as unknown[]).length : 0),
      // Новые поля
      intent: d.intent as string | null,
      issue: d.issue as string | null,
      confidence_score: d.confidence_score as number | undefined,
      client_stage: d.client_stage as string | undefined
    }));

    console.log(`[get-successful-dialogues] Found ${transformedDialogues.length} dialogues (total: ${count})`);

    return new Response(
      JSON.stringify({
        success: true,
        dialogues: transformedDialogues,
        total: count || 0,
        byScenario,
        byOutcome,
        byIntent,
        byIssue,
        pagination: {
          offset,
          limit,
          hasMore: count ? offset + limit < count : false
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-successful-dialogues] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Внутренняя ошибка сервера', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
