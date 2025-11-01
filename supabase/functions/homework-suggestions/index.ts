import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { level, subject, topic, lessonNumber } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Вы — эксперт по методике преподавания. Ваша задача — предложить 3-5 вариантов домашних заданий на основе информации об уроке.

Требования к заданиям:
- Соответствуют уровню сложности
- Разнообразные по типу (чтение, письмо, аудирование, грамматика, лексика)
- Конкретные и измеримые
- Занимают 20-40 минут
- Включают интерактивные элементы где возможно

Формат ответа — только JSON массив объектов с полями:
- title: краткое название задания
- description: подробное описание (2-3 предложения)
- type: тип задания (reading/writing/listening/grammar/vocabulary/speaking)
- estimatedTime: ожидаемое время в минутах`;

    const userPrompt = `Предложите домашние задания для урока:
- Уровень: ${level || "не указан"}
- Предмет: ${subject || "не указан"}
- Тема: ${topic || "не указана"}
- Номер урока: ${lessonNumber || "не указан"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Превышен лимит запросов" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Требуется пополнение баланса" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const suggestions = JSON.parse(content);

    return new Response(
      JSON.stringify({ suggestions: suggestions.suggestions || suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Homework suggestions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});