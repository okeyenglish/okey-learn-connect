import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationResponse {
  notifications_created: number;
  students_notified: string[];
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const response: NotificationResponse = {
      notifications_created: notificationsCreated,
      students_notified: studentsNotified,
      errors: [],
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        notifications_created: 0,
        students_notified: [],
        errors: [error.message]
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
