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
  searchMethod: 'vector' | 'text';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, scenario, minQuality, limit = 10, similarityThreshold = 0.3 } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 3 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[semantic-search] Query: "${query}", scenario: ${scenario || 'all'}, minQuality: ${minQuality || 'any'}`);

    let results: SearchResult[] = [];
    let searchMethod: 'vector' | 'text' = 'text';

    // Try vector search first using embeddings
    const apiKey = openaiKey || lovableKey;
    if (apiKey) {
      try {
        console.log('[semantic-search] Creating embedding for vector search...');
        const embeddingUrl = openaiKey 
          ? 'https://api.openai.com/v1/embeddings'
          : 'https://ai.gateway.lovable.dev/v1/embeddings';
        
        const embRes = await fetch(embeddingUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: query.slice(0, 2000),
          }),
        });

        if (embRes.ok) {
          const embJson = await embRes.json();
          const embedding = embJson.data?.[0]?.embedding;

          if (embedding) {
            const { data: vectorResults, error: vectorError } = await supabase
              .rpc('match_conversations', {
                query_embedding: `[${embedding.join(',')}]`,
                p_scenario_type: scenario || null,
                match_count: limit
              });

            if (!vectorError && vectorResults?.length) {
              searchMethod = 'vector';
              results = vectorResults
                .filter((item: any) => item.similarity >= similarityThreshold)
                .filter((item: any) => !minQuality || item.quality_score >= minQuality)
                .map((item: any) => ({
                  id: item.id,
                  scenario_type: item.scenario_type || 'unknown',
                  quality_score: item.quality_score || 0,
                  outcome: item.outcome || 'unknown',
                  context_summary: item.context_summary || '',
                  created_at: item.created_at,
                  similarity: item.similarity || 0,
                }));
              console.log(`[semantic-search] Vector search returned ${results.length} results`);
            } else if (vectorError) {
              console.warn('[semantic-search] Vector search RPC error:', vectorError.message);
            }
          }
        }
      } catch (embError) {
        console.warn('[semantic-search] Embedding/vector search failed, falling back to text:', embError);
      }
    }

    // Fallback to text search if vector search didn't work
    if (results.length === 0 && searchMethod === 'text') {
      console.log('[semantic-search] Using text-based search fallback');
      
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

      results = (data || []).map((item: any) => ({
        id: item.id,
        scenario_type: item.scenario_type || 'unknown',
        quality_score: item.quality_score || 0,
        outcome: item.outcome || 'unknown',
        context_summary: item.context_summary || '',
        created_at: item.created_at,
        similarity: 0.5,
      }));
    }

    const response: SearchResponse = {
      results,
      query,
      count: results.length,
      searchMethod,
    };

    console.log(`[semantic-search] Returning ${results.length} results via ${searchMethod}`);

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
