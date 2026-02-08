// Edge Function: init-branch-groups
// One-time migration to create branch groups and add existing employees
// Run this once after deploying to self-hosted server

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

    const { organization_id, dry_run = true } = await req.json()

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[init-branch-groups] Starting for org:', organization_id, 'dry_run:', dry_run)

    // 1. Get all unique branches from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, branch, first_name, last_name')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .not('branch', 'is', null)

    if (profilesError) {
      console.error('[init-branch-groups] Error fetching profiles:', profilesError)
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group employees by branch
    const branchMap: Record<string, Array<{ id: string; first_name: string; last_name: string }>> = {}
    
    for (const profile of (profiles || [])) {
      if (profile.branch) {
        if (!branchMap[profile.branch]) {
          branchMap[profile.branch] = []
        }
        branchMap[profile.branch].push({
          id: profile.id,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
        })
      }
    }

    const branches = Object.keys(branchMap)
    console.log('[init-branch-groups] Found', branches.length, 'unique branches:', branches)

    // 2. Get existing branch groups
    const { data: existingGroups } = await supabase
      .from('staff_group_chats')
      .select('id, branch_name')
      .eq('organization_id', organization_id)
      .eq('is_branch_group', true)

    const existingBranches = new Set((existingGroups || []).map((g: { branch_name: string }) => g.branch_name))
    console.log('[init-branch-groups] Existing branch groups:', Array.from(existingBranches))

    const results = {
      branches_processed: branches.length,
      groups_created: 0,
      groups_skipped: 0,
      members_added: 0,
      members_skipped: 0,
      details: [] as Array<{ branch: string; action: string; members: number }>,
    }

    // 3. Create groups and add members
    for (const branch of branches) {
      const employees = branchMap[branch]
      
      if (existingBranches.has(branch)) {
        // Group exists - just add missing members
        const existingGroup = existingGroups?.find((g: { branch_name: string }) => g.branch_name === branch)
        
        if (existingGroup) {
          // Get current members
          const { data: currentMembers } = await supabase
            .from('staff_group_chat_members')
            .select('user_id')
            .eq('group_chat_id', existingGroup.id)

          const currentMemberIds = new Set((currentMembers || []).map((m: { user_id: string }) => m.user_id))
          const newMembers = employees.filter(e => !currentMemberIds.has(e.id))

          if (!dry_run && newMembers.length > 0) {
            const memberInserts = newMembers.map(e => ({
              group_chat_id: existingGroup.id,
              user_id: e.id,
              role: 'member',
            }))

            const { error: insertError } = await supabase
              .from('staff_group_chat_members')
              .insert(memberInserts)

            if (!insertError) {
              results.members_added += newMembers.length
            }
          } else {
            results.members_skipped += employees.length - newMembers.length
          }

          results.groups_skipped++
          results.details.push({
            branch,
            action: 'existing',
            members: newMembers.length,
          })
        }
      } else {
        // Create new group
        if (!dry_run) {
          const { data: newGroup, error: groupError } = await supabase
            .from('staff_group_chats')
            .insert({
              name: `Команда ${branch}`,
              description: `Общий чат сотрудников филиала ${branch}`,
              organization_id: organization_id,
              branch_name: branch,
              is_branch_group: true,
            })
            .select('id')
            .single()

          if (groupError || !newGroup) {
            console.error('[init-branch-groups] Error creating group for', branch, ':', groupError)
            continue
          }

          // Add all employees as members
          const memberInserts = employees.map(e => ({
            group_chat_id: newGroup.id,
            user_id: e.id,
            role: 'member',
          }))

          const { error: membersError } = await supabase
            .from('staff_group_chat_members')
            .insert(memberInserts)

          if (!membersError) {
            results.members_added += employees.length
          }
        }

        results.groups_created++
        results.details.push({
          branch,
          action: 'created',
          members: employees.length,
        })
      }
    }

    console.log('[init-branch-groups] Results:', results)

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        results,
        message: dry_run 
          ? 'Dry run complete. Set dry_run=false to execute changes.' 
          : 'Migration complete.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[init-branch-groups] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
