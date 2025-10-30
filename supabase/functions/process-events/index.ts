import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Process pending events
    const { data: events, error: processError } = await supabase.rpc("process_pending_events", {
      p_limit: 100,
    });

    if (processError) throw processError;

    console.log(`Processed ${events?.length || 0} events`);

    // Handle each event based on its type
    if (events && events.length > 0) {
      for (const event of events) {
        try {
          await handleEvent(supabase, event);

          // Mark as processed
          await supabase
            .from("event_bus")
            .update({ 
              status: "processed",
              processed_at: new Date().toISOString()
            })
            .eq("id", event.event_id);

        } catch (error) {
          console.error(`Failed to handle event ${event.event_id}:`, error);

          // Mark as failed and increment retry count
          await supabase
            .from("event_bus")
            .update({ 
              status: "failed",
              error_message: error.message,
              retry_count: supabase.sql`retry_count + 1`
            })
            .eq("id", event.event_id);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: events?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing events:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function handleEvent(supabase: any, event: any) {
  console.log(`Handling event: ${event.event_type} for ${event.aggregate_type}`);

  switch (event.event_type) {
    case "payment.reminder":
      await sendPaymentReminder(supabase, event);
      break;
    
    case "lead.created":
      await notifyLeadCreated(supabase, event);
      break;
    
    case "attendance.overdue":
      await notifyAttendanceOverdue(supabase, event);
      break;
    
    case "lesson.completed":
      await processLessonCompleted(supabase, event);
      break;
    
    default:
      console.log(`No handler for event type: ${event.event_type}`);
  }
}

async function sendPaymentReminder(supabase: any, event: any) {
  // Implement payment reminder logic
  console.log("Sending payment reminder for:", event.aggregate_id);
}

async function notifyLeadCreated(supabase: any, event: any) {
  // Implement lead notification logic
  console.log("Notifying about new lead:", event.aggregate_id);
}

async function notifyAttendanceOverdue(supabase: any, event: any) {
  // Implement attendance overdue notification
  console.log("Attendance overdue for:", event.aggregate_id);
}

async function processLessonCompleted(supabase: any, event: any) {
  // Implement lesson completion processing
  console.log("Processing completed lesson:", event.aggregate_id);
}
