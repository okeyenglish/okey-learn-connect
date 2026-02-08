// Edge Function: init-branch-groups (v2)
// Deploy to self-hosted Supabase at api.academyos.ru
// Creates branch groups from organization_branches table
// and adds ALL employees to ALL groups

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

    console.log('[init-branch-groups] Starting v2 for org:', organization_id, 'dry_run:', dry_run)

    // 1. Get all branches from organization_branches table (NOT from profiles.branch!)
    const { data: branches, error: branchesError } = await supabase
      .from('organization_branches')
      .select('id, name')
      .eq('organization_id', organization_id)
      .eq('is_active', true)

    if (branchesError) {
      console.error('[init-branch-groups] Error fetching organization_branches:', branchesError)
      return new Response(
        JSON.stringify({ error: branchesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!branches || branches.length === 0) {
      console.log('[init-branch-groups] No active branches found in organization_branches')
      return new Response(
        JSON.stringify({ 
          success: true, 
          dry_run,
          results: { branches_found: 0, groups_created: 0, members_added: 0 },
          message: 'No active branches found in organization_branches table'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[init-branch-groups] Found', branches.length, 'branches:', branches.map(b => b.name))

    // 2. Get ALL active employees from profiles
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('organization_id', organization_id)
      .eq('is_active', true)

    if (employeesError) {
      console.error('[init-branch-groups] Error fetching profiles:', employeesError)
      return new Response(
        JSON.stringify({ error: employeesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[init-branch-groups] Found', employees?.length || 0, 'active employees')

    // 3. Get existing branch groups
    const { data: existingGroups } = await supabase
      .from('staff_group_chats')
      .select('id, branch_name')
      .eq('organization_id', organization_id)
      .eq('is_branch_group', true)

    const existingBranchNames = new Set((existingGroups || []).map((g: { branch_name: string }) => g.branch_name))
    console.log('[init-branch-groups] Existing branch groups:', Array.from(existingBranchNames))

    const results = {
      branches_found: branches.length,
      employees_found: employees?.length || 0,
      groups_created: 0,
      groups_existing: 0,
      members_added: 0,
      members_skipped: 0,
      details: [] as Array<{ branch: string; action: string; members_added: number }>,
    }

    // 4. Process each branch - create group if needed and add ALL employees
    for (const branch of branches) {
      let groupId: string

      if (existingBranchNames.has(branch.name)) {
        // Group already exists
        const existingGroup = existingGroups?.find((g: { branch_name: string }) => g.branch_name === branch.name)
        if (!existingGroup) continue
        
        groupId = existingGroup.id
        results.groups_existing++
        console.log('[init-branch-groups] Group already exists for:', branch.name)
      } else {
        // Create new group
        if (!dry_run) {
          const { data: newGroup, error: groupError } = await supabase
            .from('staff_group_chats')
            .insert({
              name: `Команда ${branch.name}`,
              description: `Общий чат сотрудников филиала ${branch.name}`,
              organization_id: organization_id,
              branch_name: branch.name,
              is_branch_group: true,
            })
            .select('id')
            .single()

          if (groupError || !newGroup) {
            console.error('[init-branch-groups] Error creating group for', branch.name, ':', groupError)
            continue
          }
          groupId = newGroup.id
          console.log('[init-branch-groups] Created group for:', branch.name, 'id:', groupId)
        } else {
          groupId = 'dry-run-id'
        }
        results.groups_created++
      }

      // 5. Add ALL employees to this group
      if (!dry_run && employees && employees.length > 0) {
        // Get current members of this group
        const { data: currentMembers } = await supabase
          .from('staff_group_chat_members')
          .select('user_id')
          .eq('group_chat_id', groupId)

        const currentMemberIds = new Set((currentMembers || []).map((m: { user_id: string }) => m.user_id))
        
        // Filter employees who are not yet members
        const newMembers = employees.filter(e => !currentMemberIds.has(e.id))

        if (newMembers.length > 0) {
          const memberInserts = newMembers.map(e => ({
            group_chat_id: groupId,
            user_id: e.id,
            role: 'member',
          }))

          const { error: membersError } = await supabase
            .from('staff_group_chat_members')
            .insert(memberInserts)

          if (!membersError) {
            results.members_added += newMembers.length
            console.log('[init-branch-groups] Added', newMembers.length, 'members to group:', branch.name)
          } else {
            console.error('[init-branch-groups] Error adding members to', branch.name, ':', membersError)
          }
        }

        results.members_skipped += currentMemberIds.size

        results.details.push({
          branch: branch.name,
          action: existingBranchNames.has(branch.name) ? 'existing' : 'created',
          members_added: newMembers.length,
        })
      } else if (dry_run) {
        results.details.push({
          branch: branch.name,
          action: existingBranchNames.has(branch.name) ? 'would_skip' : 'would_create',
          members_added: employees?.length || 0,
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
          : 'Migration complete. All employees added to all branch groups.',
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
