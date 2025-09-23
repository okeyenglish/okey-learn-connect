import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Создаем клиент Supabase с service role для полного доступа
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface GreenAPIWebhook {
  typeWebhook: string;
  instanceData: {
    idInstance: string;
    wid: string;
    typeInstance: string;
  };
  timestamp: number;
  idMessage?: string;
  senderData?: {
    chatId: string;
    chatName?: string;
    sender: string;
    senderName?: string;
  };
  messageData?: {
    typeMessage: string;
    textMessageData?: {
      textMessage: string;
    };
    fileMessageData?: {
      downloadUrl: string;
      caption?: string;
      fileName?: string;
      jpegThumbnail?: string;
      mimeType?: string;
    };
    extendedTextMessageData?: {
      text: string;
      stanzaId?: string;
      participant?: string;
    };
  };
  status?: string;
  statusData?: {
    timestamp: number;
    idMessage: string;
    status: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const webhook: GreenAPIWebhook = await req.json()
    console.log('Received webhook:', JSON.stringify(webhook, null, 2))

    // Сохраняем webhook в лог для отладки
    await supabase.from('webhook_logs').insert({
      messenger_type: 'whatsapp',
      event_type: webhook.typeWebhook,
      webhook_data: webhook,
      processed: false
    })

    // Обрабатываем разные типы webhook событий
    switch (webhook.typeWebhook) {
      case 'incomingMessageReceived':
        await handleIncomingMessage(webhook)
        break
      
      case 'outgoingMessageStatus':
        await handleMessageStatus(webhook)
        break
        
      case 'outgoingMessageReceived':
        await handleOutgoingMessage(webhook)
        break
        
      case 'stateInstanceChanged':
        await handleStateChange(webhook)
        break
        
      case 'incomingCall':
        await handleIncomingCall(webhook)
        break
        
      default:
        console.log(`Unhandled webhook type: ${webhook.typeWebhook}`)
    }

    // Отмечаем webhook как обработанный
    await supabase
      .from('webhook_logs')
      .update({ processed: true })
      .eq('webhook_data->instanceData->>idInstance', webhook.instanceData?.idInstance)
      .eq('webhook_data->>typeWebhook', webhook.typeWebhook)
      .eq('webhook_data->>timestamp', webhook.timestamp)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    
    // Сохраняем ошибку в лог
    try {
      await supabase.from('webhook_logs').insert({
        messenger_type: 'whatsapp',
        event_type: 'error',
        webhook_data: { error: error.message },
        processed: false,
        error_message: error.message
      })
    } catch (logError) {
      console.error('Error saving error log:', logError)
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleIncomingMessage(webhook: GreenAPIWebhook) {
  const { senderData, messageData, idMessage } = webhook
  
  if (!senderData || !messageData) {
    console.log('Missing sender or message data')
    return
  }

  const chatId = senderData.chatId
  const phoneNumber = extractPhoneFromChatId(chatId)
  
  // Находим или создаем клиента
  let client = await findOrCreateClient(phoneNumber, senderData.senderName || senderData.sender)
  
  // Определяем тип и содержимое сообщения
  let messageText = ''
  let fileUrl = null
  let fileName = null
  let fileType = null

  switch (messageData.typeMessage) {
    case 'textMessage':
      messageText = messageData.textMessageData?.textMessage || ''
      break
    case 'imageMessage':
    case 'videoMessage':
    case 'documentMessage':
    case 'audioMessage':
      // Определяем более специфичный текст сообщения в зависимости от типа
      if (messageData.typeMessage === 'imageMessage') {
        messageText = messageData.fileMessageData?.caption || '📷 Изображение'
      } else if (messageData.typeMessage === 'videoMessage') {
        messageText = messageData.fileMessageData?.caption || '🎥 Видео'
      } else if (messageData.typeMessage === 'audioMessage') {
        // Проверяем, голосовое сообщение это или обычный аудиофайл
        const mimeType = messageData.fileMessageData?.mimeType
        if (mimeType && (mimeType.includes('ogg') || mimeType.includes('opus'))) {
          messageText = '🎙️ Голосовое сообщение'
        } else {
          messageText = messageData.fileMessageData?.caption || '🎵 Аудиофайл'
        }
      } else if (messageData.typeMessage === 'documentMessage') {
        messageText = messageData.fileMessageData?.caption || `📄 ${messageData.fileMessageData?.fileName || 'Документ'}`
      } else {
        messageText = messageData.fileMessageData?.caption || '[Файл]'
      }
      fileUrl = messageData.fileMessageData?.downloadUrl
      fileName = messageData.fileMessageData?.fileName
      fileType = messageData.fileMessageData?.mimeType
      break
    case 'extendedTextMessage':
      messageText = messageData.extendedTextMessageData?.text || ''
      break
    default:
      messageText = `[${messageData.typeMessage}]`
  }

  // Сохраняем сообщение в базу данных
  const { error } = await supabase.from('chat_messages').insert({
    client_id: client.id,
    message_text: messageText,
    message_type: 'client',
    messenger_type: 'whatsapp',
    message_status: 'delivered',
    green_api_message_id: idMessage,
    is_outgoing: false,
    is_read: false,
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType,
    created_at: new Date(webhook.timestamp * 1000).toISOString()
  })

  if (error) {
    console.error('Error saving incoming message:', error)
    throw error
  }

  // Обновляем время последнего сообщения у клиента
  await supabase
    .from('clients')
    .update({ 
      last_message_at: new Date(webhook.timestamp * 1000).toISOString(),
      whatsapp_chat_id: chatId
    })
    .eq('id', client.id)

  console.log(`Saved incoming message from ${phoneNumber}: ${messageText}`)
  
  // Trigger delayed GPT response generation (30 seconds delay)
  console.log('Triggering delayed GPT response for client:', client.id);
  
  // Use background task to avoid blocking the webhook response
  setTimeout(async () => {
    try {
      const { data: gptResult, error: gptError } = await supabase.functions.invoke('generate-delayed-gpt-response', {
        body: { 
          clientId: client.id,
          maxWaitTimeMs: 30000 // 30 seconds
        }
      });

      if (gptError) {
        console.error('Error generating delayed GPT response:', gptError);
      } else {
        console.log('Delayed GPT response generated:', gptResult);
      }
    } catch (error) {
      console.error('Error triggering delayed GPT response:', error);
    }
  }, 1000); // Small delay to allow webhook to respond first
}

async function handleMessageStatus(webhook: GreenAPIWebhook) {
  const { statusData } = webhook
  
  if (!statusData) {
    console.log('Missing status data')
    return
  }

  const messageId = statusData.idMessage
  const status = statusData.status

  // Обновляем статус сообщения в базе данных
  const { error } = await supabase
    .from('chat_messages')
    .update({ 
      message_status: status as any // Приводим к типу message_status
    })
    .eq('green_api_message_id', messageId)

  if (error) {
    console.error('Error updating message status:', error)
    throw error
  }

  console.log(`Updated message ${messageId} status to ${status}`)
}

async function handleOutgoingMessage(webhook: GreenAPIWebhook) {
  // Сообщения, отправленные с телефона - синхронизируем их в CRM
  const { senderData, messageData, idMessage } = webhook
  
  if (!senderData || !messageData) {
    console.log('Missing sender or message data in outgoing message')
    return
  }

  const chatId = senderData.chatId
  const phoneNumber = extractPhoneFromChatId(chatId)
  
  // Находим или создаем клиента
  let client = await findOrCreateClient(phoneNumber, senderData.chatName)
  
  let messageText = ''
  switch (messageData.typeMessage) {
    case 'textMessage':
      messageText = messageData.textMessageData?.textMessage || ''
      break
    case 'extendedTextMessage':
      messageText = messageData.extendedTextMessageData?.text || ''
      break
    default:
      messageText = `[${messageData.typeMessage}]`
  }

  // Сохраняем сообщение как исходящее от менеджера
  const { error } = await supabase.from('chat_messages').insert({
    client_id: client.id,
    message_text: messageText,
    message_type: 'manager',
    messenger_type: 'whatsapp',
    message_status: 'sent',
    green_api_message_id: idMessage,
    is_outgoing: true,
    is_read: true,
    created_at: new Date(webhook.timestamp * 1000).toISOString()
  })

  if (error) {
    console.error('Error saving outgoing message:', error)
    throw error
  }

  console.log(`Saved outgoing message to ${phoneNumber}: ${messageText}`)
}

async function handleStateChange(webhook: GreenAPIWebhook) {
  // Обработка изменения состояния инстанса (авторизация, отключение и т.д.)
  console.log('State change:', webhook)
  
  // Можно сохранить состояние в настройках мессенджера
  const state = (webhook as any).stateInstance
  
  await supabase
    .from('messenger_settings')
    .upsert({
      messenger_type: 'whatsapp',
      settings: {
        instance_state: state,
        last_state_change: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    })
}

async function handleIncomingCall(webhook: GreenAPIWebhook) {
  // Обработка входящих звонков
  const callData = (webhook as any)
  const phoneNumber = extractPhoneFromChatId(callData.from)
  
  // Находим клиента
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phoneNumber)
    .single()

  if (client) {
    // Сохраняем уведомление о звонке
    await supabase.from('chat_messages').insert({
      client_id: client.id,
      message_text: `📞 Входящий звонок (${callData.status || 'unknown'})`,
      message_type: 'system',
      messenger_type: 'whatsapp',
      message_status: 'delivered',
      is_outgoing: false,
      is_read: false,
      call_duration: callData.status === 'pickUp' ? '0' : null,
      created_at: new Date(webhook.timestamp * 1000).toISOString()
    })
    
    console.log(`Recorded call from ${phoneNumber} with status ${callData.status}`)
  }
}

async function findOrCreateClient(phoneNumber: string, displayName?: string) {
  // Сначала ищем клиента по номеру телефона
  const { data: existingClient } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phoneNumber)
    .single()

  if (existingClient) {
    // Если у клиента нет аватарки, попробуем получить её из WhatsApp
    if (!existingClient.avatar_url) {
      const avatarUrl = await fetchAndSaveAvatar(phoneNumber, existingClient.id)
      if (avatarUrl) {
        await supabase
          .from('clients')
          .update({ avatar_url: avatarUrl })
          .eq('id', existingClient.id)
        existingClient.avatar_url = avatarUrl
      }
    }
    return existingClient
  }

  // Если не найден, создаем нового клиента
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      name: displayName || phoneNumber,
      phone: phoneNumber,
      notes: 'Автоматически создан из WhatsApp',
      whatsapp_chat_id: `${phoneNumber.replace('+', '')}@c.us`
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating client:', error)
    throw error
  }

  console.log(`Created new client: ${newClient.name} (${phoneNumber})`)

  // Пытаемся получить аватарку для нового клиента
  const avatarUrl = await fetchAndSaveAvatar(phoneNumber, newClient.id)
  if (avatarUrl) {
    await supabase
      .from('clients')
      .update({ avatar_url: avatarUrl })
      .eq('id', newClient.id)
    newClient.avatar_url = avatarUrl
  }

  return newClient
}

async function fetchAndSaveAvatar(phoneNumber: string, clientId: string): Promise<string | null> {
  try {
    const greenApiId = Deno.env.get('GREEN_API_ID_INSTANCE')
    const greenApiToken = Deno.env.get('GREEN_API_TOKEN_INSTANCE')
    const greenApiUrl = Deno.env.get('GREEN_API_URL')

    if (!greenApiId || !greenApiToken || !greenApiUrl) {
      console.log('Green API credentials not configured')
      return null
    }

    // Формируем chatId
    const chatId = `${phoneNumber.replace('+', '')}@c.us`
    
    // Получаем информацию о контакте через Green API
    const contactInfoUrl = `${greenApiUrl}/waInstance${greenApiId}/getContactInfo/${greenApiToken}`
    
    console.log(`Fetching contact info for ${chatId}`)
    
    const contactResponse = await fetch(contactInfoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatId })
    })

    if (!contactResponse.ok) {
      console.log(`Failed to get contact info: ${contactResponse.status}`)
      return null
    }

    const contactData = await contactResponse.json()
    
    if (!contactData.avatar) {
      console.log(`No avatar found for ${phoneNumber}`)
      return null
    }

    // Скачиваем аватарку
    console.log(`Downloading avatar from: ${contactData.avatar}`)
    
    const avatarResponse = await fetch(contactData.avatar)
    if (!avatarResponse.ok) {
      console.log(`Failed to download avatar: ${avatarResponse.status}`)
      return null
    }

    const avatarBlob = await avatarResponse.arrayBuffer()
    const fileName = `avatar_${clientId}_${Date.now()}.jpg`
    
    // Сохраняем в Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarBlob, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return null
    }

    // Возвращаем публичный URL
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    console.log(`Avatar saved for ${phoneNumber}: ${publicUrlData.publicUrl}`)
    return publicUrlData.publicUrl

  } catch (error) {
    console.error('Error fetching avatar:', error)
    return null
  }
}

function extractPhoneFromChatId(chatId: string): string {
  // Извлекаем номер телефона из chatId вида "79876543210@c.us"
  const match = chatId.match(/^(\d+)@c\.us$/)
  if (match) {
    const phoneNumber = match[1]
    // Добавляем + для российских номеров
    if (phoneNumber.startsWith('7') && phoneNumber.length === 11) {
      return `+${phoneNumber}`
    }
    return `+${phoneNumber}`
  }
  return chatId // Возвращаем как есть, если не удалось распарсить
}