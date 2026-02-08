import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Self-hosted configuration (manager_branches & profiles are stored there)
const SELF_HOSTED_URL = 'https://api.academyos.ru';
const SELF_HOSTED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Connect to SELF-HOSTED database (not Lovable Cloud)
    const supabase = createClient(SELF_HOSTED_URL, SELF_HOSTED_ANON_KEY)

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[get-user-branches] Fetching branches for user from SELF-HOSTED:', user_id)

    // 1. Try manager_branches table first (self-hosted primary table)
    const { data: managerBranches, error: mbError } = await supabase
      .from('manager_branches')
      .select('id, branch')
      .eq('manager_id', user_id)

    if (!mbError && managerBranches?.length > 0) {
      console.log('[get-user-branches] Found in manager_branches:', managerBranches.length)
      return new Response(
        JSON.stringify({ branches: managerBranches, source: 'manager_branches' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fallback: user_branches table
    const { data: userBranches, error: ubError } = await supabase
      .from('user_branches')
      .select('id, branch')
      .eq('user_id', user_id)

    if (!ubError && userBranches?.length > 0) {
      console.log('[get-user-branches] Found in user_branches:', userBranches.length)
      return new Response(
        JSON.stringify({ branches: userBranches, source: 'user_branches' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Fallback: profile.branch
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('branch')
      .eq('id', user_id)
      .single()

    if (!profileError && profile?.branch) {
      console.log('[get-user-branches] Found in profile.branch:', profile.branch)
      return new Response(
        JSON.stringify({ 
          branches: [{ id: 'profile-branch', branch: profile.branch }], 
          source: 'profile' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No branches found — user sees all
    console.log('[get-user-branches] No branches found for user, returning empty (user sees all)')
    return new Response(
      JSON.stringify({ branches: [], source: 'none' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[get-user-branches] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
