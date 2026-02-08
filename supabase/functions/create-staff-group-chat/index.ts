// Edge Function: create-staff-group-chat
// Creates a custom staff group chat (not branch groups)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateGroupRequest {
  name: string;
  description?: string | null;
  organization_id: string;
  branch_name?: string | null;
  is_branch_group?: boolean;
  created_by: string;
  member_ids: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: CreateGroupRequest = await req.json()

    if (!body.name || !body.organization_id || !body.created_by) {
      return new Response(
        JSON.stringify({ error: 'name, organization_id and created_by are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[create-staff-group-chat] Creating group:', body.name, 'org:', body.organization_id)

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('staff_group_chats')
      .insert({
        name: body.name,
        description: body.description || null,
        organization_id: body.organization_id,
        branch_name: body.branch_name || null,
        is_branch_group: body.is_branch_group || false,
        created_by: body.created_by,
      })
      .select()
      .single()

    if (groupError || !group) {
      console.error('[create-staff-group-chat] Error creating group:', groupError)
      return new Response(
        JSON.stringify({ error: groupError?.message || 'Failed to create group' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[create-staff-group-chat] Group created:', group.id)

    // Add creator as admin
    const memberInserts = [
      { group_chat_id: group.id, user_id: body.created_by, role: 'admin' }
    ]

    // Add other members
    if (body.member_ids && body.member_ids.length > 0) {
      for (const memberId of body.member_ids) {
        if (memberId !== body.created_by) {
          memberInserts.push({
            group_chat_id: group.id,
            user_id: memberId,
            role: 'member'
          })
        }
      }
    }

    const { error: membersError } = await supabase
      .from('staff_group_chat_members')
      .insert(memberInserts)

    if (membersError) {
      console.error('[create-staff-group-chat] Error adding members:', membersError)
      // Don't fail - group is created, members can be added later
    } else {
      console.log('[create-staff-group-chat] Added', memberInserts.length, 'members')
    }

    return new Response(
      JSON.stringify({ group }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[create-staff-group-chat] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
