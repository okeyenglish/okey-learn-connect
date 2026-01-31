import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  id: string;
  scenario_type: string;
  quality_score: number;
  outcome: string;
  context_summary: string;
  created_at: string;
  similarity: number;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  count: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, scenario, minQuality, limit = 10 } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 3 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[semantic-search] Query: "${query}", scenario: ${scenario || 'all'}, minQuality: ${minQuality || 'any'}`);

    // Text-based search (safe columns only)
    // Note: Vector search requires the RPC function to be created on self-hosted DB
    console.log('[semantic-search] Using text-based search');
    
    let queryBuilder = supabase
      .from('conversation_examples')
      .select('id, scenario_type, quality_score, outcome, context_summary, created_at')
      .or(`context_summary.ilike.%${query}%`)
      .order('quality_score', { ascending: false })
      .limit(limit);

    if (scenario) {
      queryBuilder = queryBuilder.eq('scenario_type', scenario);
    }
    if (minQuality) {
      queryBuilder = queryBuilder.gte('quality_score', minQuality);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[semantic-search] Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }

    const results: SearchResult[] = (data || []).map((item: any) => ({
      id: item.id,
      scenario_type: item.scenario_type || 'unknown',
      quality_score: item.quality_score || 0,
      outcome: item.outcome || 'unknown',
      context_summary: item.context_summary || '',
      created_at: item.created_at,
      similarity: 0.5, // Placeholder for text search
    }));

    const response: SearchResponse = {
      results,
      query,
      count: results.length,
    };

    console.log(`[semantic-search] Returning ${results.length} results`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[semantic-search] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
