import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrialRequestBody {
  name: string;
  phone: string;
  child_age?: number;
  comment?: string;
  branch_name: string;
  branch_address?: string;
}

// Normalize phone to format: 79161234567
function normalizePhone(phoneInput: string): string {
  if (!phoneInput || phoneInput.trim() === '') {
    return '';
  }
  
  let cleaned = phoneInput.replace(/\D/g, '');
  
  // Replace 8 with 7 for Russian numbers
  if (/^8\d{10}$/.test(cleaned)) {
    cleaned = '7' + cleaned.substring(1);
  }
  
  // Add 7 if only 10 digits
  if (cleaned.length === 10) {
    cleaned = '7' + cleaned;
  }
  
  return cleaned;
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

    const organizationId = org?.id || null;
    const normalizedPhone = normalizePhone(body.phone.trim());
    
    const childAge = body.child_age && body.child_age >= 1 && body.child_age <= 18 ? body.child_age : null;
    
    console.log("Processing trial request:", {
      name: body.name,
      phone: body.phone,
      normalizedPhone,
      childAge,
      branch: body.branch_name,
      organizationId
    });

    let clientId: string | null = null;

    // Try to find existing client by normalized phone
    if (normalizedPhone && organizationId) {
      // Search in clients table by phone field
      const { data: existingClients } = await supabase
        .from("clients")
        .select("id, phone")
        .eq("organization_id", organizationId)
        .or(`phone.ilike.%${normalizedPhone}%,phone.ilike.%${normalizedPhone.substring(1)}%`);

      // Check if any client matches by normalized phone
      if (existingClients && existingClients.length > 0) {
        for (const client of existingClients) {
          const clientNormalized = normalizePhone(client.phone || '');
          if (clientNormalized === normalizedPhone) {
            clientId = client.id;
            console.log("Found existing client by phone:", clientId);
            break;
          }
        }
      }

      // Also check client_phone_numbers table
      if (!clientId) {
        const { data: phoneNumbers } = await supabase
          .from("client_phone_numbers")
          .select("client_id, phone")
          .ilike("phone", `%${normalizedPhone}%`);

        if (phoneNumbers && phoneNumbers.length > 0) {
          for (const pn of phoneNumbers) {
            const pnNormalized = normalizePhone(pn.phone || '');
            if (pnNormalized === normalizedPhone) {
              // Verify this client belongs to our organization
              const { data: verifyClient } = await supabase
                .from("clients")
                .select("id")
                .eq("id", pn.client_id)
                .eq("organization_id", organizationId)
                .single();

              if (verifyClient) {
                clientId = pn.client_id;
                console.log("Found existing client by phone_numbers table:", clientId);
                break;
              }
            }
          }
        }
      }

      // If no client found, create a new one
      if (!clientId) {
        // Parse name into first_name and last_name
        const nameParts = body.name.trim().split(/\s+/);
        const firstName = nameParts[0] || body.name.trim();
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            organization_id: organizationId,
            name: body.name.trim(),
            first_name: firstName,
            last_name: lastName,
            phone: normalizedPhone,
            branch: body.branch_name.trim(),
            source: "website_trial",
            status: "new",
            notes: body.comment?.trim() || null,
          })
          .select("id")
          .single();

        if (clientError) {
          console.error("Error creating client:", clientError);
        } else if (newClient) {
          clientId = newClient.id;
          console.log("Created new client:", clientId);
        }
      }
    }

    // Create student and link to client
    let studentId: string | null = null;
    let studentCreated = false;

    if (organizationId && clientId) {
      // Parse name for student
      const nameParts = body.name.trim().split(/\s+/);
      const firstName = nameParts[0] || body.name.trim();
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

      // Check if student already exists for this client
      const { data: existingStudents } = await supabase
        .from("students")
        .select("id")
        .eq("client_id", clientId)
        .limit(1);

      if (existingStudents && existingStudents.length > 0) {
        studentId = existingStudents[0].id;
        console.log("Found existing student for client:", studentId);
      } else {
        // Create new student linked to client
        const { data: newStudent, error: studentError } = await supabase
          .from("students")
          .insert({
            organization_id: organizationId,
            client_id: clientId,
            first_name: firstName,
            last_name: lastName,
            phone: normalizedPhone,
            age: childAge,
            branch: body.branch_name.trim(),
            status: "trial",
            notes: body.comment?.trim() ? `Пробный урок: ${body.comment.trim()}` : "Записан на пробный урок",
          })
          .select("id")
          .single();

        if (studentError) {
          console.error("Error creating student:", studentError);
        } else if (newStudent) {
          studentId = newStudent.id;
          studentCreated = true;
          console.log("Created new student:", studentId);
        }
      }
    }

    // Insert the trial lesson request with client_id and student_id
    const { data, error } = await supabase
      .from("trial_lesson_requests")
      .insert({
        name: body.name.trim(),
        phone: body.phone.trim(),
        child_age: childAge,
        comment: body.comment?.trim() || null,
        branch_name: body.branch_name.trim(),
        branch_address: body.branch_address?.trim() || null,
        source: "website",
        status: "new",
        organization_id: organizationId,
        client_id: clientId,
        student_id: studentId,
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

    console.log("Trial request created:", { id: data.id, clientId, studentId, studentCreated });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Заявка успешно отправлена",
        id: data.id,
        client_id: clientId,
        student_id: studentId,
        student_created: studentCreated
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