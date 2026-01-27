import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PortalSettings {
  notification_frequency?: 'instant' | '15min' | 'hourly' | 'daily' | 'disabled';
  whatsapp_notifications?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  push_subscription?: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
}

interface ClientWithSettings {
  id: string;
  name: string | null;
  first_name: string | null;
  phone: string | null;
  organization_id: string;
  portal_enabled: boolean;
  portal_settings: PortalSettings | null;
  last_notification_at: string | null;
}

// Get notification interval in minutes based on frequency setting
function getIntervalMinutes(frequency: string | undefined): number {
  switch (frequency) {
    case 'instant': return 5; // 5 min anti-spam
    case '15min': return 15;
    case 'hourly': return 60;
    case 'daily': return 1440; // 24 hours
    case 'disabled': return -1; // Never
    default: return 15;
  }
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

    // Get clients with portal enabled
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        first_name,
        phone,
        organization_id,
        portal_enabled,
        portal_settings,
        last_notification_at
      `)
      .eq('portal_enabled', true);

    if (clientsError) {
      throw clientsError;
    }

    console.log(`[notify-portal-users] Found ${clients?.length || 0} portal users`);

    const notificationsToSend: (ClientWithSettings & { unread_count: number; last_message: string })[] = [];
    const now = new Date();

    for (const client of (clients as ClientWithSettings[]) || []) {
      const settings = client.portal_settings || {};
      const frequency = settings.notification_frequency || '15min';
      
      // Skip if notifications disabled
      if (frequency === 'disabled') {
        continue;
      }

      // Skip if no notification channels enabled
      const hasWhatsApp = settings.whatsapp_notifications !== false && client.phone;
      const hasPush = settings.push_notifications && settings.push_subscription?.endpoint;
      
      if (!hasWhatsApp && !hasPush) {
        continue;
      }

      const intervalMinutes = getIntervalMinutes(frequency);
      
      // Check if enough time has passed since last notification
      if (client.last_notification_at) {
        const lastNotif = new Date(client.last_notification_at);
        const minutesSinceLastNotif = (now.getTime() - lastNotif.getTime()) / (1000 * 60);
        
        if (minutesSinceLastNotif < intervalMinutes) {
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
        ...client,
        unread_count: unreadMessages.length,
        last_message: unreadMessages[0]?.content || '',
      });
    }

    console.log(`[notify-portal-users] ${notificationsToSend.length} clients need notifications`);

    let whatsappSent = 0;
    let pushSent = 0;
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
        const unreadCount = notification.unread_count;
        const lastMessage = notification.last_message;
        
        const messagePreview = lastMessage.length > 100 
          ? lastMessage.substring(0, 100) + '...'
          : lastMessage;

        // Get sender name from the last unread message
        const { data: lastMsgData } = await supabase
          .from('chat_messages')
          .select('sender_name')
          .eq('client_id', notification.id)
          .eq('direction', 'outgoing')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const senderName = lastMsgData?.sender_name || schoolName;

        // Format: "Имя Отправителя" as title, message text as body
        const notificationTitle = unreadCount === 1
          ? senderName
          : `${senderName} и ещё ${unreadCount - 1}`;

        const notificationBody = messagePreview;

        const notificationText = unreadCount === 1
          ? `📬 Новое сообщение от ${schoolName}:\n\n"${messagePreview}"\n\nОткройте личный кабинет для просмотра.`
          : `📬 У вас ${unreadCount} новых сообщений от ${schoolName}.\n\nПоследнее: "${messagePreview}"\n\nОткройте личный кабинет для просмотра.`;

        const settings = notification.portal_settings || {};
        let notificationSent = false;

        // Send Push notification if enabled
        if (settings.push_notifications && settings.push_subscription?.endpoint) {
          try {
            const pushResponse = await fetch(`${supabaseUrl}/functions/v1/portal-push-send`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                client_id: notification.id,
                title: notificationTitle,
                body: notificationBody,
                url: '/parent-portal',
              })
            });

            const pushResult = await pushResponse.json();
            if (pushResult.success) {
              pushSent++;
              notificationSent = true;
              console.log(`[notify-portal-users] Push sent to ${notification.id}`);
            }
          } catch (pushError) {
            console.error(`[notify-portal-users] Push failed:`, pushError);
          }
        }

        // Send via WhatsApp if enabled
        if (settings.whatsapp_notifications !== false && notification.phone) {
          try {
            const wppResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                phone: notification.phone,
                message: notificationText,
                organization_id: notification.organization_id
              })
            });

            const wppResult = await wppResponse.json();
            if (wppResult.success) {
              whatsappSent++;
              notificationSent = true;
              console.log(`[notify-portal-users] WhatsApp sent to ${notification.phone}`);
            }
          } catch (wppError) {
            console.error(`[notify-portal-users] WhatsApp failed:`, wppError);
          }
        }

        // Update last notification time if any notification was sent
        if (notificationSent) {
          await supabase
            .from('clients')
            .update({ last_notification_at: now.toISOString() })
            .eq('id', notification.id);
        } else {
          failedCount++;
        }
      } catch (sendError) {
        failedCount++;
        console.error(`[notify-portal-users] Error:`, sendError);
      }
    }

    console.log(`[notify-portal-users] Done: WhatsApp=${whatsappSent}, Push=${pushSent}, Failed=${failedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: clients?.length || 0,
        whatsapp_sent: whatsappSent,
        push_sent: pushSent,
        failed: failedCount
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
