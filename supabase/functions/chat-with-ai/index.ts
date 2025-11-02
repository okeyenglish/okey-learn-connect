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
    const { data: orgKey } = await supabaseClient
      .from('ai_provider_keys')
      .select('key_value, limit_remaining')
      .eq('organization_id', profile.organization_id)
      .eq('provider', 'openrouter')
      .eq('status', 'active')
      .single();

    if (orgKey && orgKey.limit_remaining > 0) {
      apiKey = orgKey.key_value;
    } else {
      // Try teacher key
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
        }
      }
    }

    if (!apiKey) {
      throw new Error('No active API key available. Please contact support.');
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
