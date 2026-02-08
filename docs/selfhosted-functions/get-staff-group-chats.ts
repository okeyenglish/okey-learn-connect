// Edge Function: get-staff-group-chats
// Deploy to self-hosted Supabase at api.academyos.ru
// This function fetches all staff group chats for a user's organization

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { organization_id, user_id } = await req.json()

    if (!organization_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[get-staff-group-chats] Fetching groups for org:', organization_id, 'user:', user_id)

    // Fetch all groups in the organization
    const { data: allGroups, error: groupsError } = await supabase
      .from('staff_group_chats')
      .select('*')
      .eq('organization_id', organization_id)
      .order('is_branch_group', { ascending: false })
      .order('name', { ascending: true })

    if (groupsError) {
      console.error('[get-staff-group-chats] Error fetching groups:', groupsError)
      return new Response(
        JSON.stringify({ error: groupsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's memberships
    const { data: memberships } = await supabase
      .from('staff_group_chat_members')
      .select('group_chat_id')
      .eq('user_id', user_id)

    const memberGroupIds = new Set((memberships || []).map((m: { group_chat_id: string }) => m.group_chat_id))

    // Get member counts for each group
    const groupIds = (allGroups || []).map((g: { id: string }) => g.id)
    
    let memberCounts: Record<string, number> = {}
    if (groupIds.length > 0) {
      const { data: counts } = await supabase
        .from('staff_group_chat_members')
        .select('group_chat_id')
        .in('group_chat_id', groupIds)
      
      if (counts) {
        counts.forEach((c: { group_chat_id: string }) => {
          memberCounts[c.group_chat_id] = (memberCounts[c.group_chat_id] || 0) + 1
        })
      }
    }

    // Mark groups with membership status and member count
    const groupsWithMembership = (allGroups || []).map((group: { id: string }) => ({
      ...group,
      is_member: memberGroupIds.has(group.id),
      member_count: memberCounts[group.id] || 0,
    }))

    console.log('[get-staff-group-chats] Found', groupsWithMembership.length, 'groups')

    return new Response(
      JSON.stringify({ groups: groupsWithMembership }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[get-staff-group-chats] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
