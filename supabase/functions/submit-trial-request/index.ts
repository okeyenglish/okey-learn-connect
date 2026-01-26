import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrialRequestBody {
  name: string;
  phone: string;
  comment?: string;
  branch_name: string;
  branch_address?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: TrialRequestBody = await req.json();
    
    // Validate required fields
    if (!body.name?.trim()) {
      return new Response(
        JSON.stringify({ error: "Имя обязательно" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!body.phone?.trim()) {
      return new Response(
        JSON.stringify({ error: "Телефон обязателен" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!body.branch_name?.trim()) {
      return new Response(
        JSON.stringify({ error: "Филиал обязателен" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for insert
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get default organization (for now, use the first one)
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    // Insert the trial lesson request
    const { data, error } = await supabase
      .from("trial_lesson_requests")
      .insert({
        name: body.name.trim(),
        phone: body.phone.trim(),
        comment: body.comment?.trim() || null,
        branch_name: body.branch_name.trim(),
        branch_address: body.branch_address?.trim() || null,
        source: "website",
        status: "new",
        organization_id: org?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting trial request:", error);
      return new Response(
        JSON.stringify({ error: "Ошибка сохранения заявки", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Trial request created:", data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Заявка успешно отправлена",
        id: data.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
