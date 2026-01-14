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
    reactionMessageData?: {
      messageId: string;
      reaction: string;
    };
  };
  status?: string;
  statusData?: {
    timestamp: number;
    idMessage: string;
    status: string;
  };
}

async function resolveOrganizationIdFromWebhook(webhook: GreenAPIWebhook): Promise<string | null> {
  const instanceId = webhook.instanceData?.idInstance;
  console.log('Resolving organization for instanceId:', instanceId);
  
  if (!instanceId) {
    console.error('No instanceId in webhook.instanceData:', JSON.stringify(webhook.instanceData));
    return null;
  }

  // Try to find by settings->>instanceId (string match)
  let { data, error } = await supabase
    .from('messenger_settings')
    .select('organization_id, settings')
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'greenapi')
    .not('organization_id', 'is', null)
    .eq('settings->>instanceId', instanceId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data && !error) {
    // Fallback: try with numeric instanceId (in case stored as number in JSON)
    const numericId = String(instanceId);
    console.log('No match with string, trying numeric instanceId:', numericId);
    
    const { data: data2, error: error2 } = await supabase
      .from('messenger_settings')
      .select('organization_id, settings')
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'greenapi')
      .not('organization_id', 'is', null)
      .order('updated_at', { ascending: false });
    
    if (error2) {
      console.error('Error fetching all messenger_settings:', error2);
    } else if (data2 && data2.length > 0) {
      // Manual search through settings
      for (const setting of data2) {
        const settingsObj = setting.settings as Record<string, unknown> | null;
        const storedInstanceId = settingsObj?.instanceId;
        console.log('Checking setting:', { org: setting.organization_id, storedInstanceId, targetInstanceId: instanceId });
        
        if (String(storedInstanceId) === String(instanceId)) {
          data = setting;
          console.log('Found match via manual search:', setting.organization_id);
          break;
        }
      }
    }
  }

  if (error) {
    console.error('Failed to resolve organization by instanceId:', { instanceId, error });
    return null;
  }

  if (!data) {
    console.warn('No organization found for instanceId:', instanceId);
    return null;
  }

  console.log('Resolved organization_id:', data.organization_id);
  return (data.organization_id as string | null) ?? null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const webhook: GreenAPIWebhook = await req.json()
    console.log('Received webhook:', JSON.stringify(webhook, null, 2))

    // Resolve organization_id from instanceId in webhook
    const organizationId = await resolveOrganizationIdFromWebhook(webhook)
    console.log('Resolved organization_id:', organizationId)

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
        await handleIncomingMessage(webhook, organizationId)
        break
      
      case 'outgoingMessageStatus':
        await handleMessageStatus(webhook)
        break
        
      case 'outgoingMessageReceived':
        await handleOutgoingMessage(webhook, organizationId)
        break
        
      case 'stateInstanceChanged':
        await handleStateChange(webhook)
        break
        
        case 'incomingCall':
        await handleIncomingCall(webhook, organizationId)
        break
        
      case 'incomingReaction':
        await handleIncomingReaction(webhook, organizationId)
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
        webhook_data: { error: (error as any)?.message },
        processed: false,
        error_message: (error as any)?.message
      })
    } catch (logError) {
      console.error('Error saving error log:', logError)
  }

  return new Response(JSON.stringify({ error: (error as any)?.message }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
  }
})

async function handleIncomingMessage(webhook: GreenAPIWebhook, organizationId: string | null) {
  const { senderData, messageData, idMessage } = webhook
  
  if (!senderData || !messageData) {
    console.log('Missing sender or message data')
    return
  }

  if (!organizationId) {
    console.error('Cannot process incoming message: organization_id not resolved from instanceId')
    throw new Error('Organization not found for this WhatsApp instance')
  }

  const chatId = senderData.chatId
  const phoneNumber = extractPhoneFromChatId(chatId)
  
  // Находим или создаем клиента
  let client = await findOrCreateClient(phoneNumber, senderData.senderName || senderData.sender, organizationId)
  
  // Определяем тип и содержимое сообщения
  let messageText = ''
  let fileUrl = null
  let fileName = null
  let fileType = null

  switch (messageData.typeMessage) {
    case 'textMessage':
      messageText = messageData.textMessageData?.textMessage || ''
      break
      
    case 'reactionMessage':
      // Обработка эмодзи реакций от клиентов
      await handleReactionMessage(webhook, client)
      return
      
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
      
      // For media files, we need to call downloadFile API to get the real URL
      if (messageData.fileMessageData?.downloadUrl) {
        try {
          console.log('Getting download URL for media file:', idMessage);
          const { data: downloadResult, error: downloadError } = await supabase.functions.invoke('download-whatsapp-file', {
            body: { 
              chatId: chatId,
              idMessage: idMessage 
            }
          });

          if (downloadError) {
            console.error('Error getting download URL:', downloadError);
            fileUrl = messageData.fileMessageData.downloadUrl; // fallback to original
          } else if (downloadResult?.downloadUrl) {
            fileUrl = downloadResult.downloadUrl;
            console.log('Got real download URL:', fileUrl);
          } else {
            fileUrl = messageData.fileMessageData.downloadUrl; // fallback to original
          }
        } catch (error) {
          console.error('Error calling download-whatsapp-file:', error);
          fileUrl = messageData.fileMessageData.downloadUrl; // fallback to original
        }
      } else {
        fileUrl = messageData.fileMessageData?.downloadUrl;
      }
      
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
    organization_id: organizationId,
    message_text: messageText,
    message_type: 'client',
    messenger_type: 'whatsapp',
    message_status: 'delivered',
    external_message_id: idMessage,
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
  
  // Trigger delayed GPT response generation only if there's no active processing
  console.log('Checking for existing GPT processing for client:', client.id);
  
  // Check if there's already an active response being processed for this client
  const { data: existingProcessing } = await supabase
    .from('pending_gpt_responses')
    .select('id, status, created_at')
    .eq('client_id', client.id)
    .in('status', ['pending', 'processing'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (existingProcessing && existingProcessing.length > 0) {
    console.log('Already processing GPT response for this client, skipping:', existingProcessing[0]);
    return new Response('OK - Already processing', { status: 200 });
  }
  
  // Use setTimeout with minimal delay to avoid blocking webhook
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
  }, 500); // 0.5 second delay to allow webhook to respond first
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
    .eq('external_message_id', messageId)

  if (error) {
    console.error('Error updating message status:', error)
    // Don't throw - status update failure shouldn't break the webhook
  }

  console.log(`Updated message ${messageId} status to ${status}`)
}

async function handleOutgoingMessage(webhook: GreenAPIWebhook, organizationId: string | null) {
  // Сообщения, отправленные с телефона - синхронизируем их в CRM
  const { senderData, messageData, idMessage } = webhook
  
  if (!senderData || !messageData) {
    console.log('Missing sender or message data in outgoing message')
    return
  }

  if (!organizationId) {
    console.error('Cannot process outgoing message: organization_id not resolved')
    return
  }

  const chatId = senderData.chatId
  const phoneNumber = extractPhoneFromChatId(chatId)
  
  // Находим или создаем клиента
  let client = await findOrCreateClient(phoneNumber, senderData.chatName, organizationId)
  
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
    organization_id: organizationId,
    message_text: messageText,
    message_type: 'manager',
    messenger_type: 'whatsapp',
    message_status: 'sent',
    external_message_id: idMessage,
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

async function handleIncomingCall(webhook: GreenAPIWebhook, organizationId: string | null) {
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
      organization_id: client.organization_id || organizationId,
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

// Normalize phone number to digits only for consistent matching
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

async function findOrCreateClient(phoneNumber: string, displayName: string | undefined, organizationId: string) {
  const normalizedPhone = normalizePhone(phoneNumber);
  console.log('findOrCreateClient: searching for phone', { phoneNumber, normalizedPhone, organizationId });

  // Try multiple phone formats for matching
  const phoneVariants = [
    phoneNumber,                                    // original: +79876543210
    `+${normalizedPhone}`,                          // +79876543210
    normalizedPhone,                                // 79876543210
    normalizedPhone.replace(/^7/, '8'),             // 89876543210 (Russian alt)
    normalizedPhone.replace(/^8/, '7'),             // if stored with 8, convert to 7
  ];
  
  // Remove duplicates
  const uniqueVariants = [...new Set(phoneVariants.filter(Boolean))];
  console.log('Searching with phone variants:', uniqueVariants);

  // Search in clients table by phone column
  const { data: existingClients } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', organizationId)
    .in('phone', uniqueVariants);

  let existingClient = existingClients?.[0] || null;

  // If not found in clients.phone, search in client_phone_numbers table
  if (!existingClient) {
    console.log('Not found in clients.phone, searching in client_phone_numbers...');
    const { data: phoneRecords } = await supabase
      .from('client_phone_numbers')
      .select('client_id, phone')
      .in('phone', uniqueVariants);

    if (phoneRecords && phoneRecords.length > 0) {
      const clientIds = [...new Set(phoneRecords.map(r => r.client_id))];
      console.log('Found client_ids in client_phone_numbers:', clientIds);
      
      // Get the client and verify it belongs to this organization
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .in('id', clientIds)
        .limit(1);
      
      existingClient = clients?.[0] || null;
    }
  }

  if (existingClient) {
    console.log('Found existing client:', existingClient.id, existingClient.name);
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

  console.log('Client not found, creating new client for phone:', phoneNumber);

  // Если не найден, создаем нового клиента
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      name: displayName || phoneNumber,
      phone: phoneNumber,
      organization_id: organizationId,
      notes: 'Автоматически создан из WhatsApp',
      whatsapp_chat_id: `${normalizedPhone}@c.us`
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating client:', error)
    throw error
  }

  console.log(`Created new client: ${newClient.name} (${phoneNumber}) with id ${newClient.id}`)

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

async function handleReactionMessage(webhook: GreenAPIWebhook, client: any) {
  const { senderData, messageData, idMessage } = webhook
  
  if (!messageData) {
    console.log('Missing reaction message data')
    return
  }

  // Реакции приходят в формате reactionMessage с данными в extendedTextMessageData и quotedMessage
  const reaction = (messageData as any).extendedTextMessageData?.text
  const originalMessageId = (messageData as any)?.quotedMessage?.stanzaId
  
  if (!originalMessageId) {
    console.log('Missing original message ID in reaction')
    return
  }
  
  try {
    // Находим оригинальное сообщение по external_message_id
    const { data: originalMessage, error: messageError } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('external_message_id', originalMessageId)
      .single()

    if (messageError || !originalMessage) {
      console.log('Original message not found for reaction:', originalMessageId)
      return
    }

    // Проверяем, есть ли уже реакция от этого клиента на это сообщение
    const { data: existingReaction, error: existingError } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', originalMessage.id)
      .eq('client_id', client.id)
      .single()

    if (reaction && reaction.trim() !== '') {
      // Добавляем или обновляем реакцию
      if (existingReaction) {
        // Обновляем существующую реакцию
        const { error: updateError } = await supabase
          .from('message_reactions')
          .update({
            emoji: reaction,
            whatsapp_reaction_id: idMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReaction.id)

        if (updateError) {
          console.error('Error updating reaction:', updateError)
        } else {
          console.log(`Updated reaction ${reaction} for client ${client.id} on message ${originalMessage.id}`)
        }
      } else {
        // Добавляем новую реакцию
        const { error: insertError } = await supabase
          .from('message_reactions')
          .insert({
            message_id: originalMessage.id,
            client_id: client.id,
            emoji: reaction,
            whatsapp_reaction_id: idMessage
          })

        if (insertError) {
          console.error('Error adding reaction:', insertError)
        } else {
          console.log(`Added reaction ${reaction} for client ${client.id} on message ${originalMessage.id}`)
        }
      }
    } else {
      // Пустая реакция означает удаление
      if (existingReaction) {
        const { error: deleteError } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id)

        if (deleteError) {
          console.error('Error removing reaction:', deleteError)
        } else {
          console.log(`Removed reaction for client ${client.id} on message ${originalMessage.id}`)
        }
      }
    }
  } catch (error) {
    console.error('Error handling reaction message:', error)
  }
}

async function handleIncomingReaction(webhook: GreenAPIWebhook, organizationId: string | null) {
  const { senderData, messageData } = webhook
  
  if (!senderData || !messageData?.reactionMessageData) {
    console.log('Missing sender or reaction data')
    return
  }

  if (!organizationId) {
    console.log('Missing organizationId for reaction, skipping')
    return
  }

  const chatId = senderData.chatId
  const phoneNumber = extractPhoneFromChatId(chatId)
  
  // Находим клиента
  const client = await findOrCreateClient(phoneNumber, senderData.senderName || senderData.sender, organizationId)
  
  if (client) {
    await handleReactionMessage(webhook, client)
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