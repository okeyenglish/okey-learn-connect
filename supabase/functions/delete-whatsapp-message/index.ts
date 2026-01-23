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

    // Получаем информацию о сообщении из базы данных
    const { data: messageData, error: fetchError } = await supabase
      .from('chat_messages')
      .select('external_message_id, client_id')
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

    if (!messageData.external_message_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'No external message ID found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
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

    // Удаляем сообщение через Green API
    try {
      const deleteResponse = await fetch(
        `${greenApiUrl}/waInstance${greenApiInstance}/deleteMessage/${greenApiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: chatId,
            idMessage: messageData.external_message_id,
            onlySenderDelete: onlySenderDelete
          })
        }
      )

      console.log('Delete response status:', deleteResponse.status)
      
      let deleteResult: GreenAPIResponse = {}
      
      // Проверяем, есть ли контент в ответе
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
        // Успешный статус (200-299), независимо от содержимого ответа
        
        // Помечаем сообщение как удаленное в базе данных
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ 
            message_text: '[Сообщение удалено]',
            external_message_id: null
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
        // Если статус не успешный, используем текст ошибки или общее сообщение
        const errorMessage = deleteResult.error || responseText || 'Failed to delete message'
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      const message = (error as any)?.message ?? 'Failed to delete message'
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
    const message = (error as any)?.message ?? 'Unexpected error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})