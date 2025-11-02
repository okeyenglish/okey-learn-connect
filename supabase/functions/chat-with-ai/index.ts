// Chat with AI using organization/teacher-specific OpenRouter keys
// This edge function routes requests through the appropriate key

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-requested-with, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { messages, model = 'google/gemini-2.0-flash-exp:free' } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Get user's organization
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('User has no organization');
    }

    // Try to get organization key first
    let apiKey: string | null = null;
    let shouldChargeBalance = false;
    const { data: orgKey } = await supabaseClient
      .from('ai_provider_keys')
      .select('key_value, limit_remaining')
      .eq('organization_id', profile.organization_id)
      .eq('provider', 'openrouter')
      .eq('status', 'active')
      .single();

    if (orgKey && orgKey.limit_remaining > 0) {
      apiKey = orgKey.key_value;
      shouldChargeBalance = false;
    } else if (orgKey) {
      // Free limit exhausted, check if org has balance
      const { data: orgBalance } = await supabaseClient
        .from('organization_balances')
        .select('balance')
        .eq('organization_id', profile.organization_id)
        .single();

      if (orgBalance && orgBalance.balance > 0) {
        apiKey = orgKey.key_value;
        shouldChargeBalance = true;
      } else {
        // Try teacher key as fallback
        const { data: teacher } = await supabaseClient
          .from('teachers')
          .select('id')
          .eq('profile_id', user.id)
          .single();

        if (teacher) {
          const { data: teacherKey } = await supabaseClient
            .from('ai_provider_keys')
            .select('key_value, limit_remaining')
            .eq('teacher_id', teacher.id)
            .eq('provider', 'openrouter')
            .eq('status', 'active')
            .single();

          if (teacherKey && teacherKey.limit_remaining > 0) {
            apiKey = teacherKey.key_value;
            shouldChargeBalance = false;
          }
        }
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'No active API key available. Please top up your organization balance or contact support.',
          code: 'INSUFFICIENT_BALANCE'
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Make request to OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('VITE_SITE_BASE_URL') ?? 'https://okeyenglish.ru',
        'X-Title': 'OKEY English CRM',
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${errorText}`);
    }

    const data = await response.json();

    // If we used paid balance, charge the organization
    if (shouldChargeBalance) {
      const { data: charged, error: chargeError } = await supabaseClient
        .rpc('charge_ai_usage', {
          p_organization_id: profile.organization_id,
          p_provider: 'openrouter',
          p_model: model,
          p_requests_count: 1,
          p_metadata: {
            tokens: data.usage || {},
            model: model,
            user_id: user.id
          }
        });

      if (chargeError || !charged) {
        console.error('Failed to charge balance:', chargeError);
        // Still return the response, but log the error
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-with-ai:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
