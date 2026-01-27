import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OnboardingRequest {
  invite_token: string;
  last_name: string;
  middle_name?: string;
  email: string;
  password: string;
  terms_accepted: boolean;
}

interface OnboardingResponse {
  success: boolean;
  message?: string;
  error?: string;
  existing_user?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: OnboardingRequest = await req.json();
    console.log("[complete-teacher-onboarding] Request received:", { 
      invite_token: body.invite_token?.substring(0, 8) + "...",
      email: body.email,
      last_name: body.last_name,
    });

    // Валидация входных данных
    if (!body.invite_token || !body.email || !body.password || !body.last_name) {
      console.error("[complete-teacher-onboarding] Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Все обязательные поля должны быть заполнены" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.terms_accepted) {
      console.error("[complete-teacher-onboarding] Terms not accepted");
      return new Response(
        JSON.stringify({ success: false, error: "Необходимо принять условия работы" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Найти приглашение по токену
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("teacher_invitations")
      .select("*")
      .eq("invite_token", body.invite_token)
      .single();

    if (inviteError || !invitation) {
      console.error("[complete-teacher-onboarding] Invitation not found:", inviteError);
      return new Response(
        JSON.stringify({ success: false, error: "Приглашение не найдено" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[complete-teacher-onboarding] Found invitation:", {
      id: invitation.id,
      status: invitation.status,
      organization_id: invitation.organization_id,
      teacher_id: invitation.teacher_id,
    });

    // 2. Проверить статус и срок действия
    if (invitation.status !== "pending") {
      console.error("[complete-teacher-onboarding] Invalid invitation status:", invitation.status);
      return new Response(
        JSON.stringify({ success: false, error: "Приглашение уже использовано или отменено" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenExpiry = new Date(invitation.token_expires_at);
    if (tokenExpiry < new Date()) {
      console.error("[complete-teacher-onboarding] Token expired:", invitation.token_expires_at);
      return new Response(
        JSON.stringify({ success: false, error: "Срок действия приглашения истёк" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Проверяем, существует ли пользователь с таким email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === body.email.toLowerCase()
    );

    let userId: string;
    let isExistingUser = false;

    if (existingUser) {
      // Пользователь существует - используем его
      console.log("[complete-teacher-onboarding] Found existing user:", existingUser.id);
      userId = existingUser.id;
      isExistingUser = true;

      // Проверяем, есть ли у него уже профиль в этой организации
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, organization_id")
        .eq("id", userId)
        .single();

      if (existingProfile?.organization_id && existingProfile.organization_id !== invitation.organization_id) {
        // Пользователь из другой организации - всё равно даём доступ как преподавателю
        console.log("[complete-teacher-onboarding] User from different org, granting access");
      }

      // Обновляем профиль если нужно
      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          first_name: invitation.first_name,
          last_name: body.last_name,
          email: body.email,
          phone: invitation.phone,
          branch: invitation.branch || null,
          organization_id: invitation.organization_id,
        }, { onConflict: 'id' });

    } else {
      // 4. Создаём нового пользователя
      console.log("[complete-teacher-onboarding] Creating new auth user...");
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          first_name: invitation.first_name,
          last_name: body.last_name,
          middle_name: body.middle_name || null,
        },
      });

      if (authError || !authData.user) {
        console.error("[complete-teacher-onboarding] Auth error:", authError);
        
        if (authError?.message?.includes("already") || authError?.message?.includes("exists")) {
          return new Response(
            JSON.stringify({ success: false, error: "Пользователь с таким email уже существует" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: false, error: authError?.message || "Ошибка создания пользователя" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = authData.user.id;
      console.log("[complete-teacher-onboarding] User created:", userId);

      // 5. Обновляем/создаём профиль
      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          first_name: invitation.first_name,
          last_name: body.last_name,
          email: body.email,
          phone: invitation.phone,
          branch: invitation.branch || null,
          organization_id: invitation.organization_id,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error("[complete-teacher-onboarding] Profile error:", profileError);
      }
    }

    // 6. Добавляем роль teacher
    console.log("[complete-teacher-onboarding] Adding teacher role...");
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: 'teacher',
      }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error("[complete-teacher-onboarding] Role error:", roleError);
    }

    // 7. Обновляем запись преподавателя с profile_id
    console.log("[complete-teacher-onboarding] Updating teacher with profile_id...");
    const { error: teacherError } = await supabaseAdmin
      .from("teachers")
      .update({
        profile_id: userId,
        last_name: body.last_name,
        email: body.email,
      })
      .eq("id", invitation.teacher_id);

    if (teacherError) {
      console.error("[complete-teacher-onboarding] Teacher update error:", teacherError);
    }

    // 8. Обновляем приглашение
    console.log("[complete-teacher-onboarding] Updating invitation status...");
    const { error: updateError } = await supabaseAdmin
      .from("teacher_invitations")
      .update({
        status: "accepted",
        profile_id: userId,
        last_name: body.last_name,
        email: body.email,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("[complete-teacher-onboarding] Invitation update error:", updateError);
    }

    console.log("[complete-teacher-onboarding] Onboarding completed successfully for:", body.email);

    const response: OnboardingResponse = {
      success: true,
      message: isExistingUser 
        ? "Вы успешно добавлены как преподаватель" 
        : "Регистрация успешно завершена",
      existing_user: isExistingUser,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[complete-teacher-onboarding] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Внутренняя ошибка сервера" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
