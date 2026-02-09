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

    console.log('[delete-staff-group-chat] Deleting group:', group_id)

    // 1. Delete all members
    const { error: membersError } = await supabase
      .from('staff_group_chat_members')
      .delete()
      .eq('group_chat_id', group_id)

    if (membersError) {
      console.error('[delete-staff-group-chat] Error deleting members:', membersError)
    }

    // 2. Delete all messages (internal_staff_messages with group_chat_id)
    const { error: messagesError } = await supabase
      .from('internal_staff_messages')
      .delete()
      .eq('group_chat_id', group_id)

    if (messagesError) {
      console.error('[delete-staff-group-chat] Error deleting messages:', messagesError)
    }

    // 3. Also delete from staff_group_messages if exists
    const { error: groupMsgError } = await supabase
      .from('staff_group_messages')
      .delete()
      .eq('group_chat_id', group_id)

    if (groupMsgError) {
      console.log('[delete-staff-group-chat] staff_group_messages delete (may not exist):', groupMsgError.message)
    }

    // 4. Delete the group chat itself
    const { error: groupError } = await supabase
      .from('staff_group_chats')
      .delete()
      .eq('id', group_id)

    if (groupError) {
      console.error('[delete-staff-group-chat] Error deleting group:', groupError)
      return new Response(
        JSON.stringify({ error: groupError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[delete-staff-group-chat] Group deleted successfully')

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[delete-staff-group-chat] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
