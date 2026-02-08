// Edge Function: get-staff-group-members
// Deploy to self-hosted Supabase at api.academyos.ru
// Fetches all members of a specific staff group chat

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { group_id } = await req.json()

    if (!group_id) {
      return new Response(
        JSON.stringify({ error: 'group_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[get-staff-group-members] Fetching members for group:', group_id)

    // Fetch members with their profile info
    const { data: members, error: membersError } = await supabase
      .from('staff_group_chat_members')
      .select('*')
      .eq('group_chat_id', group_id)
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('[get-staff-group-members] Error fetching members:', membersError)
      return new Response(
        JSON.stringify({ error: membersError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get profile info for each member
    const userIds = (members || []).map((m: { user_id: string }) => m.user_id)
    
    let profiles: Record<string, { first_name?: string; last_name?: string; email?: string; branch?: string }> = {}
    
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, branch')
        .in('id', userIds)

      if (profileData) {
        profileData.forEach((p: { id: string; first_name?: string; last_name?: string; email?: string; branch?: string }) => {
          profiles[p.id] = {
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
            branch: p.branch,
          }
        })
      }
    }

    // Combine members with profile data
    const membersWithProfiles = (members || []).map((member: { user_id: string }) => ({
      ...member,
      profile: profiles[member.user_id] || null,
    }))

    console.log('[get-staff-group-members] Found', membersWithProfiles.length, 'members')

    return new Response(
      JSON.stringify({ members: membersWithProfiles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[get-staff-group-members] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
