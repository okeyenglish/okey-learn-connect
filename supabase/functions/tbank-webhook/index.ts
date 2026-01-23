import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TBankNotification {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Status: string;
  PaymentId: number;
  ErrorCode: string;
  Amount: number;
  CardId?: number;
  Pan?: string;
  ExpDate?: string;
  Token: string;
  RebillId?: number;
}

// Верификация токена от Т-Банка
async function verifyToken(data: Record<string, any>, password: string, receivedToken: string): Promise<boolean> {
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const notification: TBankNotification = await req.json();

    console.log('Received T-Bank webhook:', notification);

    // Находим онлайн-платеж по OrderId
    const { data: onlinePayment, error: findError } = await supabase
      .from('online_payments')
      .select('*, terminal:payment_terminals(*)')
      .eq('order_id', notification.OrderId)
      .single();

    if (findError || !onlinePayment) {
      console.error('Online payment not found:', notification.OrderId);
      // Т-Банк требует ответ OK даже при ошибке
      return new Response('OK', { headers: corsHeaders });
    }

    // Проверяем токен
    const isValidToken = await verifyToken(
      notification as any,
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
        error_code: notification.ErrorCode !== '0' ? notification.ErrorCode : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', onlinePayment.id);

    if (updateError) {
      console.error('Failed to update online payment:', updateError);
    }

    // Если платеж подтвержден, создаем запись в payments
    if (notification.Status === 'CONFIRMED' && notification.Success) {
      console.log('Payment confirmed, creating payment record for student:', onlinePayment.student_id);

      // Создаем платеж в основной таблице payments
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          student_id: onlinePayment.student_id,
          amount: onlinePayment.amount / 100, // конвертируем копейки в рубли
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
    }

    // Т-Банк ожидает ответ "OK"
    return new Response('OK', { headers: corsHeaders });

  } catch (error) {
    console.error('Error in tbank-webhook:', error);
    // Т-Банк требует ответ OK даже при ошибке
    return new Response('OK', { headers: corsHeaders });
  }
});
