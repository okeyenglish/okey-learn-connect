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
  birth_date?: string;
  terms_accepted: boolean;
}

interface OnboardingResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Маппинг позиций на роли
const POSITION_TO_ROLE: Record<string, string> = {
  manager: 'manager',
  methodist: 'manager', // Методист получает роль manager
  branch_manager: 'branch_manager',
  teacher: 'teacher',
  accountant: 'accountant',
  receptionist: 'manager', // Администратор получает роль manager
  sales_manager: 'manager',
  head_teacher: 'teacher',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Используем service role для создания пользователя
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: OnboardingRequest = await req.json();
    console.log("[complete-employee-onboarding] Request received:", { 
      invite_token: body.invite_token?.substring(0, 8) + "...",
      email: body.email,
      last_name: body.last_name,
    });

    // Валидация входных данных
    if (!body.invite_token || !body.email || !body.password || !body.last_name) {
      console.error("[complete-employee-onboarding] Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Все обязательные поля должны быть заполнены" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.terms_accepted) {
      console.error("[complete-employee-onboarding] Terms not accepted");
      return new Response(
        JSON.stringify({ success: false, error: "Необходимо принять условия работы" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Найти приглашение по токену
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("employee_invitations")
      .select("*")
      .eq("invite_token", body.invite_token)
      .single();

    if (inviteError || !invitation) {
      console.error("[complete-employee-onboarding] Invitation not found:", inviteError);
      return new Response(
        JSON.stringify({ success: false, error: "Приглашение не найдено" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[complete-employee-onboarding] Found invitation:", {
      id: invitation.id,
      status: invitation.status,
      organization_id: invitation.organization_id,
      position: invitation.position,
    });

    // 2. Проверить статус и срок действия
    if (invitation.status !== "pending") {
      console.error("[complete-employee-onboarding] Invalid invitation status:", invitation.status);
      return new Response(
        JSON.stringify({ success: false, error: "Приглашение уже использовано или отменено" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenExpiry = new Date(invitation.token_expires_at);
    if (tokenExpiry < new Date()) {
      console.error("[complete-employee-onboarding] Token expired:", invitation.token_expires_at);
      return new Response(
        JSON.stringify({ success: false, error: "Срок действия приглашения истёк" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Создать пользователя в auth.users
    console.log("[complete-employee-onboarding] Creating auth user...");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Автоподтверждение
      user_metadata: {
        first_name: invitation.first_name,
        last_name: body.last_name,
        middle_name: body.middle_name || null,
      },
    });

    if (authError || !authData.user) {
      console.error("[complete-employee-onboarding] Auth error:", authError);
      
      // Проверяем на дубликат email
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

    const userId = authData.user.id;
    console.log("[complete-employee-onboarding] User created:", userId);

    // 4. Обновить профиль (он создаётся автоматически через триггер handle_new_user)
    // Даём триггеру время на создание профиля
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Сначала проверяем, существует ли профиль
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, organization_id")
      .eq("id", userId)
      .single();
    
    console.log("[complete-employee-onboarding] Existing profile check:", existingProfile);
    
    const profileData = {
      id: userId,
      first_name: invitation.first_name,
      last_name: body.last_name,
      email: body.email,
      phone: invitation.phone,
      branch: invitation.branch || null,
      organization_id: invitation.organization_id,
    };

    if (existingProfile) {
      // Профиль существует - делаем update
      console.log("[complete-employee-onboarding] Updating existing profile with organization_id:", invitation.organization_id);
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileData)
        .eq("id", userId);

      if (profileError) {
        console.error("[complete-employee-onboarding] Profile update error:", profileError);
      } else {
        console.log("[complete-employee-onboarding] Profile updated successfully");
      }
    } else {
      // Профиль не существует - делаем insert
      console.log("[complete-employee-onboarding] Inserting new profile with organization_id:", invitation.organization_id);
      const { error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert(profileData);
      
      if (insertError) {
        console.error("[complete-employee-onboarding] Profile insert error:", insertError);
      } else {
        console.log("[complete-employee-onboarding] Profile inserted successfully");
      }
    }

    // Верификация: проверяем что organization_id установлен
    const { data: verifyProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, organization_id, first_name, last_name, email")
      .eq("id", userId)
      .single();
    
    console.log("[complete-employee-onboarding] Profile verification:", verifyProfile);

    // 5. Добавить роль в user_roles
    const role = POSITION_TO_ROLE[invitation.position] || 'manager';
    console.log("[complete-employee-onboarding] Adding role:", role);
    
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: role,
      });

    if (roleError) {
      console.error("[complete-employee-onboarding] Role error:", roleError);
      // Не критично, продолжаем
    }

    // 6. Если позиция = teacher, создаём запись в teachers
    if (invitation.position === 'teacher' || invitation.position === 'head_teacher') {
      console.log("[complete-employee-onboarding] Creating teacher record...");
      const { error: teacherError } = await supabaseAdmin
        .from("teachers")
        .insert({
          first_name: invitation.first_name,
          last_name: body.last_name,
          email: body.email,
          phone: invitation.phone,
          branch: invitation.branch || null,
          organization_id: invitation.organization_id,
          profile_id: userId,
          is_active: true,
        });

      if (teacherError) {
        console.error("[complete-employee-onboarding] Teacher error:", teacherError);
      }
    }

    // 7. Обновить приглашение
    console.log("[complete-employee-onboarding] Updating invitation status...");
    const { error: updateError } = await supabaseAdmin
      .from("employee_invitations")
      .update({
        status: "accepted",
        profile_id: userId,
        last_name: body.last_name,
        middle_name: body.middle_name || null,
        email: body.email,
        birth_date: body.birth_date || null,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("[complete-employee-onboarding] Invitation update error:", updateError);
    }

    console.log("[complete-employee-onboarding] Onboarding completed successfully for:", body.email);

    const response: OnboardingResponse = {
      success: true,
      message: "Регистрация успешно завершена",
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[complete-employee-onboarding] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Внутренняя ошибка сервера" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
