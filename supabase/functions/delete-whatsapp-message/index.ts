import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteMessageRequest {
  messageId: string
  clientId: string
  onlySenderDelete?: boolean
}

interface GreenAPIResponse {
  error?: string
}

interface GreenApiSettings {
  instanceId: string
  apiToken: string
  apiUrl: string
}

async function getGreenApiSettings(supabase: ReturnType<typeof createClient>, organizationId: string): Promise<GreenApiSettings | null> {
  // 1. First try messenger_integrations (priority)
  const { data: integration } = await supabase
    .from('messenger_integrations')
    .select('id, settings, is_primary')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'green_api')
    .eq('is_enabled', true)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integration?.settings) {
    const settings = integration.settings as Record<string, unknown>
    if (settings.instanceId && settings.apiToken) {
      return {
        instanceId: String(settings.instanceId),
        apiToken: String(settings.apiToken),
        apiUrl: String(settings.apiUrl || 'https://api.green-api.com'),
      }
    }
  }

  // 2. Fallback to messenger_settings
  const { data: legacySettings } = await supabase
    .from('messenger_settings')
    .select('settings, is_enabled')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .maybeSingle()

  if (legacySettings?.is_enabled && legacySettings?.settings) {
    const settings = legacySettings.settings as Record<string, unknown>
    if (settings.instanceId && settings.apiToken) {
      return {
        instanceId: String(settings.instanceId),
        apiToken: String(settings.apiToken),
        apiUrl: String(settings.apiUrl || 'https://api.green-api.com'),
      }
    }
  }

  return null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { messageId, clientId, onlySenderDelete = false }: DeleteMessageRequest = await req.json()

    console.log('Deleting message:', { messageId, clientId, onlySenderDelete })

    // Get message info including organization_id
    const { data: messageData, error: fetchError } = await supabase
      .from('chat_messages')
      .select('external_id, client_id, organization_id')
      .eq('id', messageId)
      .single()

    if (fetchError || !messageData) {
      console.error('Error fetching message:', fetchError)
      return new Response(
        JSON.stringify({ success: false, error: 'Message not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    const organizationId = messageData.organization_id
    if (!organizationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization not found for message' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    if (!messageData.external_id) {
      // Mark as deleted in database only
      console.log('No external_id, marking as deleted in database only')
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ 
          content: '[Сообщение удалено]',
          external_id: null
        })
        .eq('id', messageId)

      if (updateError) {
        console.error('Error updating message in database:', updateError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update message in database' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Message marked as deleted in database',
          localOnly: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get client data for WhatsApp chatId
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('whatsapp_id, phone')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData) {
      console.error('Error fetching client:', clientError)
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Determine chatId
    let chatId = clientData.whatsapp_id
    if (!chatId && clientData.phone) {
      const cleanPhone = clientData.phone.replace(/[^\d]/g, '')
      chatId = `${cleanPhone}@c.us`
    }

    if (!chatId) {
      return new Response(
        JSON.stringify({ success: false, error: 'No WhatsApp chat ID available' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Get GreenAPI settings from database
    const greenApiSettings = await getGreenApiSettings(supabase, organizationId)

    if (!greenApiSettings) {
      console.error('Green API settings not found for organization:', organizationId)
      return new Response(
        JSON.stringify({ success: false, error: 'Green API not configured for this organization' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('Using GreenAPI instance:', greenApiSettings.instanceId)

    // Delete message via Green API
    try {
      const deleteResponse = await fetch(
        `${greenApiSettings.apiUrl}/waInstance${greenApiSettings.instanceId}/deleteMessage/${greenApiSettings.apiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: chatId,
            idMessage: messageData.external_id,
            onlySenderDelete: onlySenderDelete
          })
        }
      )

      console.log('Delete response status:', deleteResponse.status)
      
      let deleteResult: GreenAPIResponse = {}
      
      const responseText = await deleteResponse.text()
      console.log('Delete message response text:', responseText)
      
      if (responseText && responseText.trim()) {
        try {
          deleteResult = JSON.parse(responseText)
        } catch (parseError) {
          console.log('Failed to parse response as JSON:', parseError)
          deleteResult = {}
        }
      }

      console.log('Delete message response:', deleteResult)

      if (deleteResponse.ok) {
        // Mark message as deleted in database
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ 
            content: '[Сообщение удалено]',
            external_id: null
          })
          .eq('id', messageId)

        if (updateError) {
          console.error('Error updating message in database:', updateError)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Message deleted successfully'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        const errorMessage = deleteResult.error || responseText || 'Failed to delete message'
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      const message = (error as Error)?.message ?? 'Failed to delete message'
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to delete message: ${message}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    const message = (error as Error)?.message ?? 'Unexpected error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
