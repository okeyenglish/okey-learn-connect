import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { corsHeaders } from "../_shared/types.ts";

/**
 * Rescue Strategy Generator
 * 
 * When conversation health drops below threshold, generates a contextual
 * rescue reply using recent messages + health signals + persona.
 * 
 * POST { client_id, organization_id, health_data }
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { client_id, organization_id, health_data } = await req.json();

    if (!client_id || !organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "client_id and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SELF_HOSTED_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch last 10 messages for context
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("content, direction, created_at")
      .eq("client_id", client_id)
      .eq("organization_id", organization_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, strategies: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chatHistory = [...messages].reverse().map(m => {
      const role = m.direction === 'incoming' ? 'Клиент' : 'Менеджер';
      return `${role}: ${(m.content || '').slice(0, 200)}`;
    }).join('\n');

    // 2. Get client info
    const { data: client } = await supabase
      .from("clients")
      .select("name, first_name, status, source")
      .eq("id", client_id)
      .maybeSingle();

    const clientName = client?.first_name || client?.name || 'Клиент';

    // 3. Get persona if available
    let personaStyle = '';
    try {
      const { data: assignment } = await supabase
        .from("manager_persona_assignments")
        .select("persona_id")
        .eq("organization_id", organization_id)
        .eq("is_default", true)
        .maybeSingle();

      if (assignment?.persona_id) {
        const { data: persona } = await supabase
          .from("ai_personas")
          .select("name, tone, selling_intensity, response_length, formality_level, system_prompt_override")
          .eq("id", assignment.persona_id)
          .maybeSingle();

        if (persona) {
          personaStyle = `\nСтиль ответа: ${persona.tone}, продажность: ${persona.selling_intensity}/10, длина: ${persona.response_length}, формальность: ${persona.formality_level}/10.`;
          if (persona.system_prompt_override) {
            personaStyle += `\nДополнительные инструкции: ${persona.system_prompt_override}`;
          }
        }
      }
    } catch { /* persona tables may not exist yet */ }

    // 4. Build signal context
    const riskLevel = health_data?.risk_level || 'warning';
    const dominantSignal = health_data?.dominant_signal || 'unknown';
    const reason = health_data?.reason || '';
    const recommendation = health_data?.recommendation || '';

    // 5. Get OpenRouter key
    let apiKey: string | null = null;
    const { data: orgKey } = await supabase
      .from("ai_provider_keys")
      .select("key_value")
      .eq("organization_id", organization_id)
      .eq("provider", "openrouter")
      .eq("status", "active")
      .maybeSingle();

    apiKey = orgKey?.key_value || null;

    if (!apiKey) {
      // Fallback: generate rule-based strategies
      const strategies = generateRuleBasedStrategies(dominantSignal, clientName, riskLevel);
      return new Response(
        JSON.stringify({ success: true, strategies, source: 'rules' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Call LLM for contextual rescue replies
    const systemPrompt = `Ты — помощник менеджера по продажам в языковой школе. Клиент теряет интерес к диалогу.

Проблема: ${reason}
Рекомендация: ${recommendation}
Уровень риска: ${riskLevel === 'critical' ? 'КРИТИЧЕСКИЙ' : 'Предупреждение'}
Имя клиента: ${clientName}
${personaStyle}

Твоя задача: сгенерировать 3 коротких варианта ответа менеджера, которые:
1. Вернут клиента в диалог
2. Учитывают контекст последних сообщений
3. Звучат естественно (не шаблонно)
4. Каждый ответ — отдельная стратегия (мягкая, прямая, ценностная)

Формат ответа — ТОЛЬКО JSON массив из 3 строк, без markdown:
["ответ 1", "ответ 2", "ответ 3"]`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("VITE_SITE_BASE_URL") ?? "https://okeyenglish.ru",
        "X-Title": "OKEY English CRM - Rescue Strategy",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Последние сообщения:\n${chatHistory}\n\nСгенерируй 3 варианта rescue-ответа.` },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error("[rescue-strategy] LLM error:", await response.text());
      const strategies = generateRuleBasedStrategies(dominantSignal, clientName, riskLevel);
      return new Response(
        JSON.stringify({ success: true, strategies, source: 'rules_fallback' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const llmData = await response.json();
    const content = llmData.choices?.[0]?.message?.content || '';

    // Parse JSON array from response
    let strategies: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        strategies = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("[rescue-strategy] Failed to parse LLM response:", content);
    }

    // Fallback if parsing failed
    if (!strategies || strategies.length === 0) {
      strategies = generateRuleBasedStrategies(dominantSignal, clientName, riskLevel);
    }

    return new Response(
      JSON.stringify({ success: true, strategies, source: 'ai' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[rescue-strategy] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Rule-based fallback strategies by signal type
 */
function generateRuleBasedStrategies(signal: string, clientName: string, riskLevel: string): string[] {
  const name = clientName || 'вы';

  const STRATEGY_MAP: Record<string, string[]> = {
    short_replies: [
      `${name}, расскажите, пожалуйста, подробнее — какой формат обучения вам был бы комфортнее?`,
      `${name}, а какой у вас сейчас уровень? Мы подберём идеальную программу 😊`,
      `${name}, понимаю, что много информации. Давайте я коротко расскажу, чем мы отличаемся?`,
    ],
    slow_response: [
      `${name}, добрый день! Хотела уточнить — у вас остались вопросы? Буду рада помочь 🙂`,
      `${name}, я понимаю, что вы заняты. Может, удобнее будет созвониться на 2 минуты?`,
      `${name}, напоминаю, что у нас сейчас есть свободные места на пробный урок. Записать вас?`,
    ],
    declining_engagement: [
      `${name}, кстати, у нас появилось кое-что интересное — бесплатный разговорный клуб! Хотите попробовать?`,
      `${name}, а что для вас сейчас самое важное в изучении языка? Хочу предложить то, что точно подойдёт.`,
      `${name}, мы обновили программу — теперь уроки ещё интерактивнее. Хотите узнать подробнее?`,
    ],
    stage_stagnation: [
      `${name}, я вижу, что мы обсуждали уже несколько вариантов. Давайте определимся — что вам подошло больше всего?`,
      `${name}, чтобы не затягивать — могу записать вас на бесплатный пробный урок прямо сейчас. Удобно?`,
      `${name}, если есть сомнения — это нормально! Расскажите, что останавливает, и мы найдём решение.`,
    ],
    manager_monologue: [
      `${name}, извините за поток информации 😅 Что из этого вам было бы наиболее интересно?`,
      `${name}, хочу убедиться, что не перегружаю вас. Какой вопрос для вас сейчас самый важный?`,
      `А что вы думаете, ${name}? Мне важно ваше мнение 🙂`,
    ],
    no_questions: [
      `${name}, если есть любые вопросы — не стесняйтесь, я здесь, чтобы помочь!`,
      `${name}, кстати, вот что часто спрашивают наши ученики: ... Может, вас тоже интересует?`,
      `${name}, хотите, я расскажу, как обычно проходит первое занятие? Это поможет составить впечатление.`,
    ],
  };

  return STRATEGY_MAP[signal] || STRATEGY_MAP.slow_response;
}
