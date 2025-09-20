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

    let deleteSuccess = false
    let deleteError = null

    // Попытка удалить старое сообщение (если есть green_api_message_id)
    if (messageData.green_api_message_id) {
      try {
        const deleteResponse = await fetch(
          `${greenApiUrl}/waInstance${greenApiInstance}/deleteMessage/${greenApiToken}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idMessage: messageData.green_api_message_id
            })
          }
        )

        const deleteResult: GreenAPIResponse = await deleteResponse.json()
        console.log('Delete message response:', deleteResult)
        
        if (deleteResponse.ok && !deleteResult.error) {
          deleteSuccess = true
          console.log('Message deleted successfully')
        } else {
          deleteError = deleteResult.error || 'Failed to delete message'
          console.log('Failed to delete message:', deleteError)
        }
      } catch (error) {
        deleteError = `Delete failed: ${error.message}`
        console.log('Delete request failed:', error)
      }
    }

    // Определяем chatId для отправки нового сообщения
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

    // Отправляем новое сообщение
    try {
      const sendResponse = await fetch(
        `${greenApiUrl}/waInstance${greenApiInstance}/sendMessage/${greenApiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: chatId,
            message: newMessage
          })
        }
      )

      const sendResult: GreenAPIResponse = await sendResponse.json()
      console.log('Send message response:', sendResult)

      if (sendResponse.ok && sendResult.idMessage) {
        // Обновляем сообщение в базе данных
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ 
            message_text: newMessage,
            green_api_message_id: sendResult.idMessage
          })
          .eq('id', messageId)

        if (updateError) {
          console.error('Error updating message in database:', updateError)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            messageId: sendResult.idMessage,
            deleteSuccess,
            deleteError: deleteSuccess ? null : deleteError
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        throw new Error(sendResult.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending new message:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to send new message: ${error.message}`,
          deleteSuccess,
          deleteError
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