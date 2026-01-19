import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WAPPI_BASE_URL = 'https://wappi.pro'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface DeleteMessageRequest {
  messageId: string;
  clientId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messageId, clientId } = await req.json() as DeleteMessageRequest

    if (!messageId || !clientId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'messageId and clientId are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get message details
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, external_message_id, client_id, organization_id')
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Message not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get Wappi credentials for the organization
    const { data: settings, error: settingsError } = await supabase
      .from('messenger_settings')
      .select('settings')
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wappi')
      .eq('organization_id', message.organization_id)
      .eq('is_enabled', true)
      .single()

    if (settingsError || !settings) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wappi settings not found'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const wappiSettings = settings.settings as any
    const profileId = wappiSettings?.wappiProfileId
    const apiToken = wappiSettings?.wappiApiToken

    if (!profileId || !apiToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing Wappi credentials'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If no external_message_id, just mark as deleted in database
    if (!message.external_message_id) {
      console.log('No external_message_id, marking as deleted in database only')
      
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ 
          message_text: '[Сообщение удалено]',
          message_status: 'deleted'
        })
        .eq('id', messageId)

      if (updateError) {
        throw updateError
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Message marked as deleted in database'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call Wappi API to delete message
    const url = `${WAPPI_BASE_URL}/api/sync/message/delete?profile_id=${profileId}`

    console.log('Deleting message via Wappi:', message.external_message_id)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message_id: message.external_message_id
      })
    })

    const text = await response.text()
    let result: any

    try {
      result = JSON.parse(text)
    } catch {
      console.error('Wappi returned non-JSON response:', text.substring(0, 200))
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid response from Wappi API'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Wappi delete response:', result)

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: result.description || result.message || 'Failed to delete message'
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark message as deleted in database
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ 
        message_text: '[Сообщение удалено]',
        message_status: 'deleted'
      })
      .eq('id', messageId)

    if (updateError) {
      console.error('Error updating message in database:', updateError)
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Message deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error deleting message via Wappi:', error)

    return new Response(JSON.stringify({
      success: false,
      error: (error as any)?.message ?? 'Server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
