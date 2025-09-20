import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EditMessageRequest {
  messageId: string
  newMessage: string
  clientId: string
}

interface GreenAPIResponse {
  idMessage?: string
  stateInstance?: string
  error?: string
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

    const { messageId, newMessage, clientId }: EditMessageRequest = await req.json()

    console.log('Editing message:', { messageId, newMessage, clientId })

    // Получаем информацию о сообщении из базы данных
    const { data: messageData, error: fetchError } = await supabase
      .from('chat_messages')
      .select('green_api_message_id, client_id')
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

    // Получаем данные клиента для WhatsApp chatId
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('whatsapp_chat_id, phone')
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

    // Определяем chatId
    let chatId = clientData.whatsapp_chat_id
    if (!chatId && clientData.phone) {
      // Создаем chatId из номера телефона если нет сохраненного
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

    if (!messageData.green_api_message_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'No Green API message ID found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    const greenApiUrl = Deno.env.get('GREEN_API_URL')
    const greenApiToken = Deno.env.get('GREEN_API_TOKEN_INSTANCE')
    const greenApiInstance = Deno.env.get('GREEN_API_ID_INSTANCE')

    if (!greenApiUrl || !greenApiToken || !greenApiInstance) {
      console.error('Green API credentials not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Green API not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Используем метод editMessage
    try {
      const editResponse = await fetch(
        `${greenApiUrl}/waInstance${greenApiInstance}/editMessage/${greenApiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: chatId,
            idMessage: messageData.green_api_message_id,
            message: newMessage
          })
        }
      )

      const editResult: GreenAPIResponse = await editResponse.json()
      console.log('Edit message response:', editResult)

      if (editResponse.ok && editResult.idMessage) {
        // Обновляем сообщение в базе данных
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ 
            message_text: newMessage,
            green_api_message_id: editResult.idMessage
          })
          .eq('id', messageId)

        if (updateError) {
          console.error('Error updating message in database:', updateError)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            messageId: editResult.idMessage
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        throw new Error(editResult.error || 'Failed to edit message')
      }
    } catch (error) {
      console.error('Error editing message:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to edit message: ${error.message}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})