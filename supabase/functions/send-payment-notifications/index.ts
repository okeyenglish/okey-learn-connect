import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
  type PaymentNotificationRequest,
} from '../_shared/types.ts';

interface SendNotificationRequest {
  notification_id?: string;
  send_all?: boolean;
  delivery_method?: 'email' | 'sms' | 'telegram' | 'all';
}

interface NotificationData {
  id: string;
  student_id: string;
  notification_type: string;
  balance_hours: number;
  estimated_days_left: number;
  notification_date: string;
  students: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
  };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody: SendNotificationRequest = await req.json();
    const { notification_id, send_all = false, delivery_method = 'all' } = requestBody;

    console.log('📤 Starting notification send process...', { notification_id, send_all, delivery_method });

    // Получаем уведомления для отправки
    let query = supabase
      .from('payment_notifications')
      .select(`
        id,
        student_id,
        notification_type,
        balance_hours,
        estimated_days_left,
        notification_date,
        students (
          first_name,
          last_name,
          phone,
          email
        )
      `)
      .eq('is_sent', false);

    if (notification_id) {
      query = query.eq('id', notification_id);
    }

    const { data: notifications, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError);
      throw fetchError;
    }

    if (!notifications || notifications.length === 0) {
      console.log('ℹ️ No notifications to send');
      return successResponse({ 
        message: 'No notifications to send',
        sent_count: 0 
      });
    }

    console.log(`📨 Found ${notifications.length} notifications to send`);

    const sentNotifications: string[] = [];
    const failedNotifications: string[] = [];

    // Отправляем каждое уведомление
    for (const notification of notifications as NotificationData[]) {
      try {
        const studentName = `${notification.students.first_name} ${notification.students.last_name}`.trim();
        const message = generateNotificationMessage(notification);

        console.log(`📧 Sending notification to ${studentName}...`);

        // Здесь будет интеграция с сервисами отправки
        // Пока логируем сообщения
        if (delivery_method === 'email' || delivery_method === 'all') {
          console.log(`📧 EMAIL to ${notification.students.email}: ${message}`);
          // TODO: Интеграция с email сервисом (SendGrid, Resend, etc.)
        }

        if (delivery_method === 'sms' || delivery_method === 'all') {
          console.log(`📱 SMS to ${notification.students.phone}: ${message}`);
          // TODO: Интеграция с SMS сервисом (Twilio, SMS.ru, etc.)
        }

        if (delivery_method === 'telegram' || delivery_method === 'all') {
          console.log(`💬 TELEGRAM: ${message}`);
          // TODO: Интеграция с Telegram Bot API
        }

        // Помечаем уведомление как отправленное
        const { error: updateError } = await supabase
          .from('payment_notifications')
          .update({
            is_sent: true,
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`❌ Error updating notification ${notification.id}:`, updateError);
          failedNotifications.push(notification.id);
        } else {
          sentNotifications.push(notification.id);
          console.log(`✅ Notification ${notification.id} marked as sent`);
        }

      } catch (error) {
        console.error(`❌ Error sending notification ${notification.id}:`, error);
        failedNotifications.push(notification.id);
      }
    }

    console.log(`📊 Summary: ${sentNotifications.length} sent, ${failedNotifications.length} failed`);

    return successResponse({
      message: 'Notification send process completed',
      sent: sentNotifications.length,
      failed: failedNotifications.length,
      sent_ids: sentNotifications,
      failed_ids: failedNotifications,
    });

  } catch (error: unknown) {
    console.error('❌ Function error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});

function generateNotificationMessage(notification: NotificationData): string {
  const studentName = `${notification.students.first_name} ${notification.students.last_name}`.trim();
  const daysLeft = notification.estimated_days_left;
  const hoursLeft = notification.balance_hours.toFixed(1);

  switch (notification.notification_type) {
    case 'overdue':
      return `⚠️ Уважаемые родители ${studentName}! Баланс занятий исчерпан. Пожалуйста, пополните баланс для продолжения обучения.`;
    
    case 'payment_due':
      return `🔔 Уважаемые родители ${studentName}! Баланс занятий заканчивается через ${daysLeft} дн. (осталось ${hoursLeft} ч). Рекомендуем пополнить баланс.`;
    
    case 'low_balance':
      return `ℹ️ Уважаемые родители ${studentName}! У студента низкий баланс: ${hoursLeft} академ. часов (хватит на ~${daysLeft} дн.). Пожалуйста, подумайте о пополнении.`;
    
    default:
      return `Напоминание о балансе для ${studentName}`;
  }
}
