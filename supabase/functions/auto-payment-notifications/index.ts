import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors,
  type PaymentNotificationResponse 
} from '../_shared/types.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('🔔 Starting automatic payment notifications generation...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Вызываем функцию создания уведомлений
    const { data: result, error: notificationError } = await supabase
      .rpc('auto_create_payment_notifications');

    if (notificationError) {
      console.error('❌ Error creating notifications:', notificationError);
      throw notificationError;
    }

    console.log('✅ Notifications created successfully');

    // Получаем созданные уведомления за последние 5 минут
    const { data: recentNotifications, error: fetchError } = await supabase
      .from('payment_notifications')
      .select(`
        id,
        student_id,
        notification_type,
        estimated_days_left,
        students (
          first_name,
          last_name,
          phone
        )
      `)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .eq('is_sent', false);

    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError);
      throw fetchError;
    }

    const notificationsCreated = recentNotifications?.length || 0;
    const studentsNotified = recentNotifications?.map((n: any) => 
      `${n.students?.first_name} ${n.students?.last_name}`.trim()
    ) || [];

    console.log(`📊 Summary: ${notificationsCreated} notifications created for ${studentsNotified.length} students`);

    return successResponse({
      success: true,
      sent: notificationsCreated,
      skipped: 0,
      failed: 0,
    });

  } catch (error: unknown) {
    console.error('❌ Function error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
