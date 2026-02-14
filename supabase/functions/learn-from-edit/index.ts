import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  handleCors,
  errorResponse,
  successResponse
} from '../_shared/types.ts';

/**
 * When a manager edits an AI response before sending,
 * save the original + edited version as a high-quality training example.
 */

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) return errorResponse('Service not configured', 500);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return errorResponse('Unauthorized', 401);
    }

    const userId = claimsData.claims.sub;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { originalResponse, editedResponse, clientMessage, clientId, conversationContext } = body;

    if (!originalResponse || !editedResponse) {
      return errorResponse('originalResponse and editedResponse required', 400);
    }

    // Only learn if the edit is meaningful (>20% different)
    const similarity = calculateSimilarity(originalResponse, editedResponse);
    if (similarity > 0.9) {
      return successResponse({ saved: false, reason: 'Edit too minor' });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.organization_id) {
      return errorResponse('Organization not found', 400);
    }

    // Create embedding for the edited example
    let embedding: number[] | null = null;
    try {
      const embRes = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: `${clientMessage || ''} ${editedResponse}`.slice(0, 2000),
        }),
      });

      if (embRes.ok) {
        const embData = await embRes.json();
        embedding = embData.data?.[0]?.embedding || null;
      }
    } catch (err) {
      console.warn('[learn-from-edit] Embedding failed:', err);
    }

    // Save to edited_examples table
    const { error: insertError } = await supabase
      .from('edited_examples')
      .insert({
        organization_id: profile.organization_id,
        user_id: userId,
        client_id: clientId || null,
        original_ai_response: originalResponse,
        edited_response: editedResponse,
        client_message: clientMessage || null,
        conversation_context: conversationContext || null,
        embedding: embedding ? `[${embedding.join(',')}]` : null,
        quality_boost: 1.0,
      });

    if (insertError) {
      console.error('[learn-from-edit] Insert error:', insertError);
      return errorResponse('Failed to save', 500);
    }

    console.log(`[learn-from-edit] Saved edited example from user ${userId}, similarity=${similarity.toFixed(2)}`);
    return successResponse({ saved: true, similarity });

  } catch (error) {
    console.error('[learn-from-edit] Error:', error);
    return errorResponse('Server error', 500);
  }
});

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 1 : intersection / union;
}
