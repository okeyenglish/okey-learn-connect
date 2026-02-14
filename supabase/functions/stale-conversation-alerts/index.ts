import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  getOrgAdminManagerUserIds,
  sendPushNotification,
} from "../_shared/types.ts";

/**
 * Stale Conversation Alerts
 * 
 * Checks for conversations stuck on specific stages (default: objection)
 * for longer than a configured threshold (default: 24h).
 * Sends push notifications to admins/managers.
 * 
 * Designed to run via pg_cron every hour.
 */

interface AlertConfig {
  enabled: boolean;
  stages: string[]; // stages to monitor, e.g. ['objection', 'follow_up']
  thresholdHours: number; // hours before alert fires
  cooldownHours: number; // don't re-alert within this window
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enabled: true,
  stages: ['objection', 'follow_up'],
  thresholdHours: 24,
  cooldownHours: 12,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SELF_HOSTED_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("[stale-conversation-alerts] Starting check...");

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name, settings");

    if (orgsError) {
      throw new Error(`Failed to fetch organizations: ${orgsError.message}`);
    }

    let totalAlerts = 0;

    for (const org of orgs || []) {
      // Parse alert config from org settings
      const settings = (org.settings as Record<string, unknown>) || {};
      const alertSettings = settings.staleConversationAlerts as Partial<AlertConfig> || {};
      
      const config: AlertConfig = {
        enabled: alertSettings.enabled ?? DEFAULT_ALERT_CONFIG.enabled,
        stages: alertSettings.stages ?? DEFAULT_ALERT_CONFIG.stages,
        thresholdHours: alertSettings.thresholdHours ?? DEFAULT_ALERT_CONFIG.thresholdHours,
        cooldownHours: alertSettings.cooldownHours ?? DEFAULT_ALERT_CONFIG.cooldownHours,
      };

      if (!config.enabled) {
        console.log(`[stale-conversation-alerts] Alerts disabled for org: ${org.name}`);
        continue;
      }

      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() - config.thresholdHours);

      // Find stuck conversations
      const { data: staleStates, error: statesError } = await supabase
        .from("conversation_states")
        .select("id, client_id, current_stage, stage_entered_at, confidence, metadata")
        .eq("organization_id", org.id)
        .in("current_stage", config.stages)
        .lt("stage_entered_at", thresholdDate.toISOString());

      if (statesError) {
        console.error(`[stale-conversation-alerts] Error fetching states for ${org.name}:`, statesError);
        continue;
      }

      if (!staleStates || staleStates.length === 0) {
        console.log(`[stale-conversation-alerts] No stale conversations for ${org.name}`);
        continue;
      }

      // Filter out recently alerted (cooldown)
      const cooldownDate = new Date();
      cooldownDate.setHours(cooldownDate.getHours() - config.cooldownHours);

      const toAlert = staleStates.filter((s) => {
        const meta = (s.metadata as Record<string, unknown>) || {};
        const lastAlerted = meta.last_stale_alert_at as string | undefined;
        if (!lastAlerted) return true;
        return new Date(lastAlerted) < cooldownDate;
      });

      if (toAlert.length === 0) {
        console.log(`[stale-conversation-alerts] All stale conversations in cooldown for ${org.name}`);
        continue;
      }

      // Get client names
      const clientIds = toAlert.map((s) => s.client_id);
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, phone")
        .in("id", clientIds);

      const clientMap = new Map((clients || []).map((c: any) => [c.id, c]));

      // Get admin/manager user IDs for this org
      const userIds = await getOrgAdminManagerUserIds(supabase, org.id);

      if (userIds.length === 0) {
        console.log(`[stale-conversation-alerts] No admins/managers for ${org.name}`);
        continue;
      }

      // Stage labels
      const STAGE_LABELS: Record<string, string> = {
        greeting: 'Приветствие',
        qualification: 'Квалификация',
        need_discovery: 'Выявление потребности',
        value_explanation: 'Презентация ценности',
        objection: 'Возражение',
        offer: 'Предложение',
        closing: 'Закрытие',
        follow_up: 'Follow-up',
      };

      // Send notifications
      for (const state of toAlert) {
        const client = clientMap.get(state.client_id) as any;
        const clientName = client?.name || client?.phone || 'Неизвестный клиент';
        const stageLabel = STAGE_LABELS[state.current_stage] || state.current_stage;
        const hoursStuck = Math.round(
          (Date.now() - new Date(state.stage_entered_at).getTime()) / (1000 * 60 * 60)
        );

        const payload = {
          title: `⚠️ Клиент застрял: ${stageLabel}`,
          body: `${clientName} на стадии «${stageLabel}» уже ${hoursStuck}ч. Требуется внимание!`,
          tag: `stale-${state.client_id}`,
          data: {
            type: 'stale_conversation',
            client_id: state.client_id,
            stage: state.current_stage,
            hours_stuck: String(hoursStuck),
          },
        };

        // Send push to all admins/managers
        for (const userId of userIds) {
          try {
            await sendPushNotification(supabase, {
              userId,
              payload,
            });
          } catch (err) {
            console.error(`[stale-conversation-alerts] Failed to notify user ${userId}:`, err);
          }
        }

        // Update metadata with alert timestamp
        const existingMeta = (state.metadata as Record<string, unknown>) || {};
        await supabase
          .from("conversation_states")
          .update({
            metadata: {
              ...existingMeta,
              last_stale_alert_at: new Date().toISOString(),
              stale_alert_count: ((existingMeta.stale_alert_count as number) || 0) + 1,
            },
          })
          .eq("id", state.id);

        totalAlerts++;
      }

      console.log(`[stale-conversation-alerts] Sent ${toAlert.length} alerts for ${org.name}`);
    }

    console.log(`[stale-conversation-alerts] Done. Total alerts: ${totalAlerts}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_alerts: totalAlerts,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[stale-conversation-alerts] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
