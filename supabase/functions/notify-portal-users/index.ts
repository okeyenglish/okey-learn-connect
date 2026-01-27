import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UnreadMessage {
  client_id: string;
  client_name: string;
  client_phone: string;
  unread_count: number;
  last_message: string;
  last_message_at: string;
  organization_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[notify-portal-users] Starting notification check...');

    // Get clients with portal enabled who have unread outgoing messages (from school)
    // and haven't been notified in the last 30 minutes
    const { data: unreadData, error: queryError } = await supabase.rpc(
      'get_portal_unread_notifications'
    );

    if (queryError) {
      // If RPC doesn't exist, fallback to direct query
      console.log('[notify-portal-users] RPC not found, using direct query');
      
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          phone,
          organization_id,
          portal_enabled,
          last_notification_at
        `)
        .eq('portal_enabled', true)
        .not('phone', 'is', null);

      if (clientsError) {
        throw clientsError;
      }

      const notificationsToSend: UnreadMessage[] = [];

      for (const client of clients || []) {
        // Check if we've notified recently (within 30 min)
        if (client.last_notification_at) {
          const lastNotif = new Date(client.last_notification_at);
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
          if (lastNotif > thirtyMinAgo) {
            continue;
          }
        }

        // Get unread messages count (outgoing messages from school that are unread)
        const { data: unreadMessages, error: msgError } = await supabase
          .from('chat_messages')
          .select('id, content, created_at')
          .eq('client_id', client.id)
          .eq('direction', 'outgoing')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5);

        if (msgError || !unreadMessages?.length) {
          continue;
        }

        notificationsToSend.push({
          client_id: client.id,
          client_name: client.name || 'Клиент',
          client_phone: client.phone,
          unread_count: unreadMessages.length,
          last_message: unreadMessages[0]?.content || '',
          last_message_at: unreadMessages[0]?.created_at,
          organization_id: client.organization_id
        });
      }

      console.log(`[notify-portal-users] Found ${notificationsToSend.length} clients to notify`);

      let sentCount = 0;
      let failedCount = 0;

      for (const notification of notificationsToSend) {
        try {
          // Get organization name
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', notification.organization_id)
            .single();

          const schoolName = org?.name || 'школы';
          const messagePreview = notification.last_message.length > 100 
            ? notification.last_message.substring(0, 100) + '...'
            : notification.last_message;

          const notificationText = notification.unread_count === 1
            ? `📬 Новое сообщение от ${schoolName}:\n\n"${messagePreview}"\n\nОткройте личный кабинет для просмотра.`
            : `📬 У вас ${notification.unread_count} новых сообщений от ${schoolName}.\n\nПоследнее: "${messagePreview}"\n\nОткройте личный кабинет для просмотра.`;

          // Try to send via WhatsApp
          const wppResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              phone: notification.client_phone,
              message: notificationText,
              organization_id: notification.organization_id
            })
          });

          const wppResult = await wppResponse.json();

          if (wppResult.success) {
            // Update last notification time
            await supabase
              .from('clients')
              .update({ last_notification_at: new Date().toISOString() })
              .eq('id', notification.client_id);

            sentCount++;
            console.log(`[notify-portal-users] Sent notification to ${notification.client_phone}`);
          } else {
            failedCount++;
            console.error(`[notify-portal-users] Failed to send to ${notification.client_phone}:`, wppResult);
          }
        } catch (sendError) {
          failedCount++;
          console.error(`[notify-portal-users] Error sending notification:`, sendError);
        }
      }

      console.log(`[notify-portal-users] Completed: ${sentCount} sent, ${failedCount} failed`);

      return new Response(
        JSON.stringify({
          success: true,
          checked: clients?.length || 0,
          notifications_sent: sentCount,
          failed: failedCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If RPC exists, use its results
    const notifications = unreadData || [];
    console.log(`[notify-portal-users] RPC returned ${notifications.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_count: notifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-portal-users] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
