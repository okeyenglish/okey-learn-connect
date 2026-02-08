// Edge Function: add-staff-group-member
// Deploy to self-hosted Supabase at api.academyos.ru
// Adds a member to a staff group chat

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

    const { group_id, user_id, role = 'member' } = await req.json()

    if (!group_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'group_id and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[add-staff-group-member] Adding user:', user_id, 'to group:', group_id)

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('staff_group_chats')
      .select('id, name')
      .eq('id', group_id)
      .single()

    if (groupError || !group) {
      return new Response(
        JSON.stringify({ error: 'Group not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add member (upsert to handle duplicates gracefully)
    const { error: memberError } = await supabase
      .from('staff_group_chat_members')
      .upsert({
        group_chat_id: group_id,
        user_id: user_id,
        role: role,
      }, {
        onConflict: 'group_chat_id,user_id',
        ignoreDuplicates: true,
      })

    if (memberError) {
      console.error('[add-staff-group-member] Error adding member:', memberError)
      return new Response(
        JSON.stringify({ error: memberError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[add-staff-group-member] Member added successfully')

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[add-staff-group-member] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
