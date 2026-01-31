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
  example_messages: string;
  key_phrases: string[];
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

    // Step 1: Generate embedding for the query
    let queryEmbedding: number[] | null = null;
    
    if (openaiKey) {
      try {
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: query,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          queryEmbedding = embeddingData.data[0].embedding;
          console.log('[semantic-search] Generated query embedding');
        } else {
          console.warn('[semantic-search] Failed to generate embedding, falling back to text search');
        }
      } catch (e) {
        console.warn('[semantic-search] Embedding error, falling back to text search:', e);
      }
    }

    let results: SearchResult[] = [];

    // Step 2: Search with embedding (vector similarity) or fallback to text search
    if (queryEmbedding) {
      // Use RPC for vector similarity search
      const { data, error } = await supabase.rpc('search_conversation_examples', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: limit,
        filter_scenario: scenario || null,
        filter_min_quality: minQuality || null,
      });

      if (error) {
        console.error('[semantic-search] Vector search error:', error);
        // Fall back to text search
      } else if (data) {
        results = data;
        console.log(`[semantic-search] Vector search found ${results.length} results`);
      }
    }

    // Fallback: Text-based search if vector search failed or no embedding
    if (results.length === 0) {
      console.log('[semantic-search] Using text-based fallback search');
      
      let queryBuilder = supabase
        .from('conversation_examples')
        .select('id, scenario_type, quality_score, outcome, context_summary, example_messages, key_phrases, created_at')
        .or(`context_summary.ilike.%${query}%,example_messages.ilike.%${query}%`)
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
        console.error('[semantic-search] Text search error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      results = (data || []).map((item: any) => ({
        ...item,
        similarity: 0.5, // Placeholder for text search
      }));
    }

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
