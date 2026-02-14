import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { corsHeaders } from "../_shared/types.ts";

/**
 * Auto-tag conversation examples with persona_tag.
 * 
 * Uses a cheap LLM call to classify the manager's communication style.
 * Can be run as a batch job or per-example.
 * 
 * POST { organization_id, batch_size?, example_ids? }
 */

const PERSONA_SLUGS = ['academic_guide', 'sales_consultant', 'support_helper'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { organization_id, batch_size = 50, example_ids } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SELF_HOSTED_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get org personas
    const { data: personas } = await supabase
      .from("ai_personas")
      .select("slug, name, description")
      .eq("organization_id", organization_id)
      .eq("is_active", true);

    const personaSlugs = personas?.map(p => p.slug) || PERSONA_SLUGS;
    const personaDescriptions = (personas || [])
      .map(p => `${p.slug}: ${p.description || p.name}`)
      .join('\n');

    // Get untagged examples
    let query = supabase
      .from("conversation_examples")
      .select("id, messages, context_summary, outcome")
      .eq("organization_id", organization_id)
      .is("persona_tag", null)
      .limit(batch_size);

    if (example_ids?.length) {
      query = supabase
        .from("conversation_examples")
        .select("id, messages, context_summary, outcome")
        .in("id", example_ids);
    }

    const { data: examples, error: exErr } = await query;

    if (exErr) throw new Error(exErr.message);
    if (!examples || examples.length === 0) {
      return new Response(
        JSON.stringify({ success: true, tagged: 0, message: "No untagged examples" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[persona-tagger] Tagging ${examples.length} examples for org ${organization_id}`);

    let tagged = 0;
    const errors: string[] = [];

    // Process in mini-batches of 5
    for (let i = 0; i < examples.length; i += 5) {
      const batch = examples.slice(i, i + 5);
      
      const results = await Promise.allSettled(
        batch.map(async (example: any) => {
          const managerMessages = (example.messages || [])
            .filter((m: any) => m.role === 'manager')
            .slice(0, 4)
            .map((m: any) => m.content)
            .join('\n');

          if (!managerMessages) return null;

          const prompt = `Определи стиль общения менеджера в этом диалоге. Ответь ТОЛЬКО одним словом из списка: ${personaSlugs.join(' | ')}

${personaDescriptions ? `Описание стилей:\n${personaDescriptions}\n` : ''}
Контекст: ${example.context_summary || ''}
Сообщения менеджера:
${managerMessages}

Ответ (одно слово):`;

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [{ role: "user", content: prompt }],
              max_completion_tokens: 20,
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`AI error ${response.status}: ${text}`);
          }

          const data = await response.json();
          const raw = (data.choices?.[0]?.message?.content || "").trim().toLowerCase();
          
          // Find matching persona
          const matchedSlug = personaSlugs.find(s => raw.includes(s));
          if (!matchedSlug) return null;

          // Update example
          const { error: updateErr } = await supabase
            .from("conversation_examples")
            .update({ persona_tag: matchedSlug })
            .eq("id", example.id);

          if (updateErr) throw new Error(updateErr.message);
          return matchedSlug;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) tagged++;
        else if (r.status === "rejected") errors.push(r.reason?.message || "Unknown");
      }
    }

    console.log(`[persona-tagger] Done: ${tagged} tagged, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        tagged,
        total: examples.length,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[persona-tagger] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
