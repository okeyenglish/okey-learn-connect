// Edge Function: add-employee-to-branch-groups
// Deploy to self-hosted Supabase at api.academyos.ru
// Adds an employee to their branch group(s)
// Called from complete-employee-onboarding on Lovable Cloud

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AddEmployeeRequest {
  user_id: string;
  organization_id: string;
  branch?: string | null;
  allowed_branches?: string[] | null;
  position?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: AddEmployeeRequest = await req.json()

    if (!body.user_id || !body.organization_id) {
      return new Response(
        JSON.stringify({ error: 'user_id and organization_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[add-employee-to-branch-groups] Processing user:', body.user_id)

    // Collect all branches
    const branches: string[] = []
    
    if (body.branch) {
      branches.push(body.branch)
    }
    
    if (body.allowed_branches && Array.isArray(body.allowed_branches)) {
      for (const b of body.allowed_branches) {
        if (b && !branches.includes(b)) {
          branches.push(b)
        }
      }
    }

    if (branches.length === 0) {
      console.log('[add-employee-to-branch-groups] No branches to process')
      return new Response(
        JSON.stringify({ success: true, groups_added: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[add-employee-to-branch-groups] Branches:', branches)

    let groupsAdded = 0

    for (const branchName of branches) {
      // Find or create branch group
      let { data: existingGroup } = await supabase
        .from('staff_group_chats')
        .select('id')
        .eq('organization_id', body.organization_id)
        .eq('branch_name', branchName)
        .eq('is_branch_group', true)
        .maybeSingle()

      let groupId: string

      if (existingGroup) {
        groupId = existingGroup.id
        console.log(`[add-employee-to-branch-groups] Found group for ${branchName}:`, groupId)
      } else {
        // Create new branch group
        const { data: newGroup, error: createError } = await supabase
          .from('staff_group_chats')
          .insert({
            name: `Команда ${branchName}`,
            description: `Общий чат сотрудников филиала ${branchName}`,
            organization_id: body.organization_id,
            branch_name: branchName,
            is_branch_group: true,
          })
          .select('id')
          .single()

        if (createError || !newGroup) {
          console.error(`[add-employee-to-branch-groups] Failed to create group for ${branchName}:`, createError)
          continue
        }

        groupId = newGroup.id
        console.log(`[add-employee-to-branch-groups] Created group for ${branchName}:`, groupId)
      }

      // Add member
      const role = body.position === 'branch_manager' ? 'admin' : 'member'
      
      const { error: memberError } = await supabase
        .from('staff_group_chat_members')
        .upsert({
          group_chat_id: groupId,
          user_id: body.user_id,
          role: role,
        }, {
          onConflict: 'group_chat_id,user_id',
          ignoreDuplicates: true,
        })

      if (memberError) {
        console.error(`[add-employee-to-branch-groups] Failed to add member:`, memberError)
      } else {
        groupsAdded++
        console.log(`[add-employee-to-branch-groups] Added to group ${groupId}`)
      }
    }

    return new Response(
      JSON.stringify({ success: true, groups_added: groupsAdded }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[add-employee-to-branch-groups] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
