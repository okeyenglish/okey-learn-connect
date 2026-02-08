import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  successResponse,
  getErrorMessage,
  type TBankWebhookPayload,
} from '../_shared/types.ts';

// Верификация токена от Т-Банка
async function verifyToken(data: Record<string, unknown>, password: string, receivedToken: string): Promise<boolean> {
  // Исключаем поля, которые не участвуют в подписи
  const excludeFields = ['Token', 'Receipt', 'DATA'];
  const pairs: Record<string, string> = { Password: password };
  
  for (const [key, value] of Object.entries(data)) {
    if (!excludeFields.includes(key) && value !== undefined && value !== null) {
      pairs[key] = String(value);
    }
  }
  
  const sortedKeys = Object.keys(pairs).sort();
  const concatenated = sortedKeys.map(key => pairs[key]).join('');
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(concatenated);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const calculatedToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return calculatedToken.toLowerCase() === receivedToken.toLowerCase();
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const notification = await req.json() as TBankWebhookPayload;

    console.log('Received T-Bank webhook:', notification);

    // Шаг 1: Логируем входящий вебхук в webhook_logs для диагностики
    const logEntry = {
      messenger_type: 'tbank',
      event_type: notification.Status || 'unknown',
      webhook_data: notification,
      processed: false,
    };
    
    supabase.from('webhook_logs').insert(logEntry).then(({ error }) => {
      if (error) console.error('Failed to log webhook:', error);
      else console.log('Webhook logged to webhook_logs');
    });

    // Находим онлайн-платеж по OrderId (включая source_messenger_type)
    const { data: onlinePayment, error: findError } = await supabase
      .from('online_payments')
      .select('*, terminal:payment_terminals(*), source_messenger_type')
      .eq('order_id', notification.OrderId)
      .single();

    if (findError || !onlinePayment) {
      console.error('Online payment not found:', notification.OrderId);
      // Т-Банк требует ответ OK даже при ошибке
      return new Response('OK', { headers: corsHeaders });
    }

    // Проверяем токен
    const isValidToken = await verifyToken(
      notification as unknown as Record<string, unknown>,
      onlinePayment.terminal.terminal_password,
      notification.Token
    );

    if (!isValidToken) {
      console.error('Invalid token for order:', notification.OrderId);
      return new Response('OK', { headers: corsHeaders });
    }

    // Обновляем статус онлайн-платежа
    const { error: updateError } = await supabase
      .from('online_payments')
      .update({
        status: notification.Status,
        tbank_payment_id: String(notification.PaymentId),
        notification_data: notification,
        error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', onlinePayment.id);

    if (updateError) {
      console.error('Failed to update online payment:', updateError);
    }

    // Если платеж подтвержден, создаем запись в payments и сообщение в чат
    if (notification.Status === 'CONFIRMED' && notification.Success) {
      console.log('Payment confirmed, creating payment record for student:', onlinePayment.student_id);

      const amountRub = onlinePayment.amount / 100; // конвертируем копейки в рубли

      // Создаем платеж в основной таблице payments
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          student_id: onlinePayment.student_id,
          amount: amountRub,
          payment_method: 'online',
          payment_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          notes: `Онлайн-оплата Т-Банк. OrderId: ${notification.OrderId}`,
          provider_transaction_id: String(notification.PaymentId),
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Failed to create payment:', paymentError);
      } else {
        // Связываем онлайн-платеж с платежом
        await supabase
          .from('online_payments')
          .update({ payment_id: payment.id })
          .eq('id', onlinePayment.id);

        console.log('Payment created successfully:', payment.id);
      }

      // Шаг 2: Создаём системное сообщение в чате и отправляем реальное сообщение клиенту
      if (onlinePayment.client_id && onlinePayment.organization_id) {
        console.log('Creating chat message and sending notification for client:', onlinePayment.client_id);

        const messengerType = onlinePayment.source_messenger_type || 'whatsapp';
        console.log('Using messenger_type:', messengerType);

        // Создаём системное сообщение для отображения в CRM
        const { error: chatError } = await supabase.from('chat_messages').insert({
          client_id: onlinePayment.client_id,
          organization_id: onlinePayment.organization_id,
          message_text: `tbank_success ${amountRub}`,
          message_type: 'system',
          is_outgoing: false,
          is_read: false,
          messenger_type: messengerType,
        });

        if (chatError) {
          console.error('Failed to create chat message:', chatError);
        } else {
          console.log('Chat message created for payment confirmation');

          // Обновляем last_message_at у клиента чтобы он "поднялся" в списке
          const { error: clientUpdateError } = await supabase
            .from('clients')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', onlinePayment.client_id);

          if (clientUpdateError) {
            console.error('Failed to update client last_message_at:', clientUpdateError);
          }
        }

        // Шаг 3: Отправляем реальное сообщение клиенту через мессенджер
        const thankYouMessage = `Оплата на сумму ${amountRub.toLocaleString('ru-RU')}₽ прошла успешно! Большое спасибо.`;
        
        // Используем SELF_HOSTED_URL или SUPABASE_URL для вызова Edge Functions
        const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || supabaseUrl;
        
        try {
          if (messengerType === 'whatsapp') {
            // Получаем телефон клиента для отправки
            const { data: clientData } = await supabase
              .from('clients')
              .select('phone')
              .eq('id', onlinePayment.client_id)
              .single();
            
            if (clientData?.phone) {
              console.log('Sending WhatsApp message to client:', clientData.phone);
              
              // Вызываем Edge Function напрямую через HTTP (для self-hosted совместимости)
              const sendResponse = await fetch(`${selfHostedUrl}/functions/v1/wpp-send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  phone: clientData.phone,
                  message: thankYouMessage,
                  client_id: onlinePayment.client_id,
                  organization_id: onlinePayment.organization_id,
                }),
              });
              
              if (!sendResponse.ok) {
                const errorText = await sendResponse.text();
                console.error('Failed to send WhatsApp message:', sendResponse.status, errorText);
              } else {
                console.log('WhatsApp thank you message sent successfully');
              }
            }
          } else if (messengerType === 'telegram') {
            // Получаем telegram_user_id клиента
            const { data: clientData } = await supabase
              .from('clients')
              .select('telegram_user_id')
              .eq('id', onlinePayment.client_id)
              .single();
            
            if (clientData?.telegram_user_id) {
              console.log('Sending Telegram message to client:', clientData.telegram_user_id);
              
              const sendResponse = await fetch(`${selfHostedUrl}/functions/v1/telegram-send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  chat_id: clientData.telegram_user_id,
                  message: thankYouMessage,
                  client_id: onlinePayment.client_id,
                  organization_id: onlinePayment.organization_id,
                }),
              });
              
              if (!sendResponse.ok) {
                const errorText = await sendResponse.text();
                console.error('Failed to send Telegram message:', sendResponse.status, errorText);
              } else {
                console.log('Telegram thank you message sent successfully');
              }
            }
          }
          // MAX messenger can be added similarly if needed
        } catch (sendErr) {
          console.error('Error sending thank you message:', sendErr);
        }
      } else {
        console.log('No client_id on online_payment, skipping chat message');
      }

      // Помечаем webhook_logs как обработанный
      supabase
        .from('webhook_logs')
        .update({ processed: true })
        .eq('messenger_type', 'tbank')
        .eq('webhook_data->>OrderId', notification.OrderId)
        .then(({ error }) => {
          if (error) console.error('Failed to mark webhook as processed:', error);
        });
    }

    // Т-Банк ожидает ответ "OK"
    return new Response('OK', { headers: corsHeaders });

  } catch (error: unknown) {
    console.error('Error in tbank-webhook:', error);
    // Т-Банк требует ответ OK даже при ошибке
    return new Response('OK', { headers: corsHeaders });
  }
});
