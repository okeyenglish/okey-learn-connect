 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: "No authorization header" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     
     const supabase = createClient(supabaseUrl, supabaseKey, {
       auth: {
         autoRefreshToken: false,
         persistSession: false,
       },
       global: {
         headers: {
           Authorization: authHeader,
         },
       },
     });
 
     // Получаем текущего пользователя из JWT
     const { data: { user }, error: userError } = await supabase.auth.getUser();
     
     if (userError || !user) {
       return new Response(
         JSON.stringify({ error: "Unauthorized", details: userError?.message }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Получаем профиль
     const { data: profile, error: profileError } = await supabase
       .from("profiles")
       .select("*")
       .eq("id", user.id)
       .single();
 
     // Получаем роли
     const { data: roles, error: rolesError } = await supabase
       .from("user_roles")
       .select("role")
       .eq("user_id", user.id);
 
     // Проверяем доступные чаты для организации
     let clientsCount = 0;
     let messagesCount = 0;
     
     if (profile?.organization_id) {
       const { count: cCount } = await supabase
         .from("clients")
         .select("*", { count: "exact", head: true })
         .eq("organization_id", profile.organization_id);
       
       const { count: mCount } = await supabase
         .from("chat_messages")
         .select("*", { count: "exact", head: true })
         .eq("organization_id", profile.organization_id);
       
       clientsCount = cCount || 0;
       messagesCount = mCount || 0;
     }
 
     const result = {
       user_id: user.id,
       email: user.email,
       profile: profile || null,
       profile_error: profileError?.message || null,
       roles: roles?.map(r => r.role) || [],
       roles_error: rolesError?.message || null,
       organization_clients_count: clientsCount,
       organization_messages_count: messagesCount,
       jwt_claims: {
         sub: user.id,
         email: user.email,
         role: user.role,
       },
     };
 
     return new Response(
       JSON.stringify(result, null, 2),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
 
   } catch (error) {
     console.error("Error:", error);
     return new Response(
       JSON.stringify({ 
         error: "Internal error", 
         details: error instanceof Error ? error.message : String(error) 
       }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });