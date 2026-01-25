import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for missed SLAs
    const { data: missedSLAs, error } = await supabase
      .from("sla_metrics")
      .select("*")
      .is("is_met", null)
      .lt("target_time", new Date().toISOString());

    if (error) throw error;

    console.log(`Found ${missedSLAs?.length || 0} missed SLAs`);

    // Update missed SLAs
    if (missedSLAs && missedSLAs.length > 0) {
      for (const sla of missedSLAs) {
        const delayMinutes = Math.floor(
          (Date.now() - new Date(sla.target_time).getTime()) / 1000 / 60
        );

        await supabase
          .from("sla_metrics")
          .update({
            is_met: false,
            delay_minutes: delayMinutes,
            actual_time: new Date().toISOString(),
          })
          .eq("id", sla.id);

        // Publish event for missed SLA
        await supabase.rpc("publish_event", {
          p_event_type: "sla.missed",
          p_aggregate_type: sla.entity_type,
          p_aggregate_id: sla.entity_id,
          p_payload: {
            metric_type: sla.metric_type,
            delay_minutes: delayMinutes,
            target_time: sla.target_time,
          },
          p_organization_id: sla.organization_id,
        });
      }
    }

    // Check for upcoming payment reminders (D-3, D-1)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const { data: upcomingPayments } = await supabase
      .from("payments")
      .select("*, students(*)")
      .eq("status", "pending")
      .or(`due_date.eq.${threeDaysFromNow.toISOString().split('T')[0]},due_date.eq.${oneDayFromNow.toISOString().split('T')[0]}`);

    if (upcomingPayments) {
      for (const payment of upcomingPayments) {
        await supabase.rpc("publish_event", {
          p_event_type: "payment.reminder",
          p_aggregate_type: "payment",
          p_aggregate_id: payment.id,
          p_payload: {
            student_id: payment.student_id,
            amount: payment.amount,
            due_date: payment.due_date,
          },
          p_organization_id: payment.organization_id,
        });
      }
    }

    return successResponse({
      success: true,
      missed_slas: missedSLAs?.length || 0,
      payment_reminders: upcomingPayments?.length || 0,
    });

  } catch (error: unknown) {
    console.error("Error in SLA monitor:", error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
