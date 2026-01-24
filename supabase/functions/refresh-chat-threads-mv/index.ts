import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[refresh-chat-threads-mv] Starting refresh...");

    // Call the force refresh function
    const { data, error } = await supabase.rpc("force_refresh_chat_threads_mv");

    if (error) {
      console.error("[refresh-chat-threads-mv] RPC error:", error);
      
      // Fallback: direct refresh if function doesn't exist yet
      if (error.message?.includes("does not exist")) {
        console.log("[refresh-chat-threads-mv] Function not found, trying direct refresh...");
        
        const { error: directError } = await supabase.rpc("refresh_materialized_view", {
          view_name: "chat_threads_mv"
        });
        
        if (directError) {
          throw directError;
        }
      } else {
        throw error;
      }
    }

    const duration = Math.round(performance.now() - startTime);
    
    // Get refresh status
    const { data: status } = await supabase
      .rpc("get_chat_threads_mv_status")
      .single();

    console.log(`[refresh-chat-threads-mv] ✅ Completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        status: status || null,
        message: `Materialized view refreshed in ${duration}ms`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    console.error("[refresh-chat-threads-mv] ❌ Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        duration_ms: duration,
        error: error.message || "Unknown error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
