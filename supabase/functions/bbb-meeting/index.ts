import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Функция для создания checksum для BBB API
function createChecksum(callName: string, queryString: string, secret: string): string {
  const crypto = await import("https://deno.land/std@0.168.0/crypto/mod.ts");
  const encoder = new TextEncoder();
  const data = encoder.encode(callName + queryString + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BBB_URL = Deno.env.get("BBB_URL");
    const BBB_SECRET = Deno.env.get("BBB_SECRET");

    if (!BBB_URL || !BBB_SECRET) {
      throw new Error("BBB credentials not configured");
    }

    const { action, meetingID, fullName, studentId, groupId, teacherId, lessonType } = await req.json();

    console.log("BBB Meeting Request:", { action, meetingID, fullName, lessonType });

    // Проверяем аутентификацию
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Создаем уникальный ID для встречи
    const meetingId = meetingID || `${lessonType}_${groupId || studentId}_${Date.now()}`;

    if (action === "create") {
      // Создаем встречу
      const meetingName = lessonType === "group" 
        ? `Групповое занятие ${groupId}` 
        : `Индивидуальное занятие ${studentId}`;

      const params = new URLSearchParams({
        name: meetingName,
        meetingID: meetingId,
        attendeePW: "student",
        moderatorPW: "teacher",
        welcome: "Добро пожаловать на урок!",
        record: "true",
        autoStartRecording: "false",
        allowStartStopRecording: "true",
        maxParticipants: lessonType === "group" ? "15" : "2",
      });

      const queryString = params.toString();
      const checksum = await createChecksum("create", queryString, BBB_SECRET);
      const createUrl = `${BBB_URL}api/create?${queryString}&checksum=${checksum}`;

      const createResponse = await fetch(createUrl);
      const createData = await createResponse.text();

      console.log("Meeting created:", { meetingId, createData });

      return new Response(
        JSON.stringify({ 
          success: true, 
          meetingId,
          message: "Meeting created successfully" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "join") {
      // Определяем роль пользователя (учитель или ученик)
      const { data: roles } = await supabase.rpc("get_user_roles", {
        _user_id: user.id
      });

      const isTeacher = roles?.includes("teacher") || roles?.includes("admin");
      const password = isTeacher ? "teacher" : "student";

      const params = new URLSearchParams({
        fullName: fullName || "Пользователь",
        meetingID: meetingId,
        password: password,
        redirect: "true",
        userdata_bbb_show_participants_on_login: "true",
        userdata_bbb_show_public_chat_on_login: "true",
      });

      const queryString = params.toString();
      const checksum = await createChecksum("join", queryString, BBB_SECRET);
      const joinUrl = `${BBB_URL}api/join?${queryString}&checksum=${checksum}`;

      console.log("Join URL generated:", { meetingId, isTeacher });

      return new Response(
        JSON.stringify({ 
          success: true, 
          joinUrl,
          meetingId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "end") {
      // Завершаем встречу
      const params = new URLSearchParams({
        meetingID: meetingId,
        password: "teacher", // Только учитель может завершить встречу
      });

      const queryString = params.toString();
      const checksum = await createChecksum("end", queryString, BBB_SECRET);
      const endUrl = `${BBB_URL}api/end?${queryString}&checksum=${checksum}`;

      await fetch(endUrl);

      console.log("Meeting ended:", { meetingId });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Meeting ended successfully" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "isMeetingRunning") {
      // Проверяем, активна ли встреча
      const params = new URLSearchParams({
        meetingID: meetingId,
      });

      const queryString = params.toString();
      const checksum = await createChecksum("isMeetingRunning", queryString, BBB_SECRET);
      const checkUrl = `${BBB_URL}api/isMeetingRunning?${queryString}&checksum=${checksum}`;

      const checkResponse = await fetch(checkUrl);
      const checkData = await checkResponse.text();
      
      const isRunning = checkData.includes("<running>true</running>");

      return new Response(
        JSON.stringify({ 
          success: true, 
          isRunning 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");

  } catch (error) {
    console.error("BBB Meeting Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
