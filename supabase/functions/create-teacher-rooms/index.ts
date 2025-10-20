import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Функция для создания checksum для BBB API
async function createChecksum(callName: string, queryString: string, secret: string): Promise<string> {
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

    // Проверяем, является ли пользователь админом
    const { data: roles } = await supabase.rpc("get_user_roles", {
      _user_id: user.id
    });

    if (!roles?.includes("admin") && !roles?.includes("manager")) {
      throw new Error("Insufficient permissions");
    }

    console.log("Creating BBB rooms for all teachers");

    // Получаем все комнаты преподавателей
    const { data: rooms, error: roomsError } = await supabase
      .from('teacher_bbb_rooms')
      .select('*');

    if (roomsError) throw roomsError;

    const createdRooms = [];
    const errors = [];

    // Создаем фактические комнаты в BBB для каждого преподавателя
    for (const room of rooms || []) {
      try {
        const meetingName = `Комната преподавателя: ${room.teacher_name}`;
        
        const params = new URLSearchParams({
          name: meetingName,
          meetingID: room.meeting_id,
          attendeePW: room.attendee_password,
          moderatorPW: room.moderator_password,
          welcome: `Добро пожаловать в комнату преподавателя ${room.teacher_name}!`,
          record: "true",
          autoStartRecording: "false",
          allowStartStopRecording: "true",
          maxParticipants: "15",
          logoutURL: "https://okey-english.ru",
        });

        const queryString = params.toString();
        const checksum = await createChecksum("create", queryString, BBB_SECRET);
        const createUrl = `${BBB_URL}api/create?${queryString}&checksum=${checksum}`;

        const createResponse = await fetch(createUrl);
        const createData = await createResponse.text();

        console.log(`Room created for ${room.teacher_name}:`, { 
          meetingId: room.meeting_id, 
          responsePreview: createData.substring(0, 200)
        });

        createdRooms.push({
          teacher_name: room.teacher_name,
          meeting_id: room.meeting_id,
          success: true
        });

      } catch (error) {
        console.error(`Error creating room for ${room.teacher_name}:`, error);
        errors.push({
          teacher_name: room.teacher_name,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        created_rooms: createdRooms.length,
        total_rooms: rooms?.length || 0,
        rooms: createdRooms,
        errors: errors.length > 0 ? errors : undefined,
        message: `Создано ${createdRooms.length} из ${rooms?.length || 0} комнат`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Create Teacher Rooms Error:", error);
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
