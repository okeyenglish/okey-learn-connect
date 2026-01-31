import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: 'manager' | 'client' | 'system';
  content: string;
}

interface Scenario {
  intent: string;
  issue?: string;
  dialogType: string;
  description: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, scenario, conversation, managerMessage, sampleDialogue, turnCount } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      // Return fallback response if no API key
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI not configured"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'start') {
      // Generate opening client message
      const systemPrompt = buildStartPrompt(scenario, sampleDialogue);
      
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
            { role: "user", content: "Начни диалог как клиент. Представься и задай первый вопрос или озвучь проблему." }
          ],
          temperature: 0.8,
          max_tokens: 300
        }),
      });

      if (!response.ok) {
        console.error("AI gateway error:", response.status);
        return new Response(
          JSON.stringify({ success: false, error: "AI error" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const clientMessage = data.choices?.[0]?.message?.content || "Здравствуйте, хотела бы узнать о ваших услугах...";
      
      const contextMessage = buildContextMessage(scenario);

      return new Response(
        JSON.stringify({
          success: true,
          clientMessage,
          context: contextMessage
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'respond') {
      // Generate client response to manager's message
      const systemPrompt = buildResponsePrompt(scenario, sampleDialogue, turnCount);
      
      // Build conversation history for AI
      const aiMessages = [
        { role: "system", content: systemPrompt }
      ];
      
      // Add conversation history
      for (const msg of conversation || []) {
        aiMessages.push({
          role: msg.role === 'client' ? 'assistant' : 'user',
          content: msg.content
        });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          temperature: 0.7,
          max_tokens: 400
        }),
      });

      if (!response.ok) {
        console.error("AI gateway error:", response.status);
        return new Response(
          JSON.stringify({ success: false, error: "AI error" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const clientResponse = data.choices?.[0]?.message?.content || "Понятно, давайте подробнее...";
      
      // Determine if session should end
      const shouldEnd = turnCount >= 8 || 
        clientResponse.toLowerCase().includes('согласен') ||
        clientResponse.toLowerCase().includes('запишусь') ||
        clientResponse.toLowerCase().includes('оформляем');

      // Generate feedback for manager's response
      const feedback = await generateFeedback(managerMessage, scenario, LOVABLE_API_KEY);

      // Generate final score if ending
      let finalScore: number | undefined;
      let finalFeedback: string[] | undefined;
      
      if (shouldEnd) {
        const evaluation = await evaluateSession(conversation, scenario, LOVABLE_API_KEY);
        finalScore = evaluation.score;
        finalFeedback = evaluation.feedback;
      }

      return new Response(
        JSON.stringify({
          success: true,
          clientResponse: cleanResponse(clientResponse),
          feedback,
          shouldEnd,
          finalScore,
          finalFeedback
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unknown action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function buildStartPrompt(scenario: Scenario, sampleDialogue?: Message[]): string {
  const issuePrompts: Record<string, string> = {
    'price_too_high': 'Ты считаешь что услуги дорогие, но всё же интересуешься.',
    'no_time': 'У тебя мало времени, ты очень занят(а), но ребёнок хочет учиться.',
    'child_motivation': 'Твой ребёнок не особо хочет учить английский, тебя это беспокоит.',
    'teacher_issue': 'Ты недоволен(на) предыдущим преподавателем в другой школе.',
    'hesitation': 'Ты сомневаешься и не готов(а) сразу принять решение.'
  };

  const intentPrompts: Record<string, string> = {
    'price_check': 'Ты хочешь узнать стоимость занятий.',
    'schedule_info': 'Тебе важно узнать про расписание и удобство.',
    'program_choice': 'Ты не можешь определиться с программой.',
    'comparison': 'Ты сравниваешь разные школы.',
    'urgent_start': 'Тебе нужно срочно начать занятия.'
  };

  let prompt = `Ты играешь роль клиента школы английского языка "O'KEY ENGLISH".
  
РОЛЬ: Ты родитель, который интересуется курсами английского для своего ребёнка (7-12 лет).

ХАРАКТЕР:
- ${issuePrompts[scenario.issue || ''] || 'Ты заинтересован(а), но осторожен(на).'}
- ${intentPrompts[scenario.intent] || 'Ты хочешь получить информацию.'}

ИНСТРУКЦИИ:
1. Веди себя как реальный клиент, не как AI
2. Отвечай короткими фразами (1-3 предложения)
3. Задавай уточняющие вопросы
4. Если менеджер хорошо работает с возражениями — постепенно "прогревайся"
5. Если менеджер давит или не слушает — сопротивляйся больше
6. НЕ соглашайся слишком быстро, но и не будь невозможным клиентом

КОНТЕКСТ: ${scenario.description}`;

  if (sampleDialogue && sampleDialogue.length > 0) {
    const clientLines = sampleDialogue
      .filter((m: any) => m.role === 'client')
      .slice(0, 3)
      .map((m: any) => `- "${m.content}"`)
      .join('\n');
    
    if (clientLines) {
      prompt += `\n\nПРИМЕРЫ РЕПЛИК КЛИЕНТА (для вдохновения):\n${clientLines}`;
    }
  }

  return prompt;
}

function buildResponsePrompt(scenario: Scenario, sampleDialogue?: Message[], turnCount?: number): string {
  let prompt = buildStartPrompt(scenario, sampleDialogue);
  
  const progress = turnCount || 0;
  
  if (progress >= 6) {
    prompt += `\n\nВАЖНО: Диалог подходит к концу (${progress} реплик). 
Если менеджер был убедителен — начни соглашаться, проявляй интерес к записи.
Если менеджер был неубедителен — вежливо откажись, скажи что подумаешь.`;
  } else if (progress >= 4) {
    prompt += `\n\nВАЖНО: Середина разговора. Если менеджер хорошо работает — становись теплее. Задавай конкретные вопросы.`;
  }

  return prompt;
}

function buildContextMessage(scenario: Scenario): string {
  return `🎯 **${scenario.description}**

💡 Ваша задача: провести диалог с клиентом и добиться положительного результата.
📊 Диалог рассчитан на 6-8 реплик.`;
}

function cleanResponse(response: string): string {
  // Remove any AI meta-commentary
  return response
    .replace(/\(как клиент.*?\)/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/^(клиент:|client:)/gi, '')
    .trim();
}

async function generateFeedback(
  managerMessage: string, 
  scenario: Scenario,
  apiKey: string
): Promise<{ score: number; suggestions: string[] } | undefined> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Ты эксперт по продажам в образовательной сфере. Оцени ответ менеджера.
            
Контекст: ${scenario.description}
Возражение клиента: ${scenario.issue || 'нет'}

Верни JSON: {"score": 1-10, "suggestions": ["совет 1"]}`
          },
          {
            role: "user",
            content: `Ответ менеджера: "${managerMessage}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      }),
    });

    if (!response.ok) return undefined;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: parsed.score || 5,
        suggestions: parsed.suggestions || []
      };
    }
  } catch (e) {
    console.error("Feedback generation error:", e);
  }
  return undefined;
}

async function evaluateSession(
  conversation: Message[],
  scenario: Scenario,
  apiKey: string
): Promise<{ score: number; feedback: string[] }> {
  try {
    const conversationText = conversation
      .map(m => `${m.role === 'manager' ? 'Менеджер' : 'Клиент'}: ${m.content}`)
      .join('\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Ты эксперт по обучению менеджеров продаж в образовательной сфере.

Оцени тренировочный диалог по следующим критериям:
1. Выявление потребностей (0-25 баллов)
2. Работа с возражениями (0-25 баллов)
3. Предложение решения (0-25 баллов)
4. Закрытие на следующий шаг (0-25 баллов)

Контекст сценария: ${scenario.description}
Основное возражение: ${scenario.issue || 'нет'}

Верни JSON:
{
  "score": итоговый балл 0-100,
  "feedback": ["рекомендация 1", "рекомендация 2", "рекомендация 3"]
}`
          },
          {
            role: "user",
            content: `Диалог:\n${conversationText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      return { score: 70, feedback: ["Тренировка завершена. Продолжайте практиковаться!"] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.min(100, Math.max(0, parsed.score || 70)),
        feedback: parsed.feedback || ["Хорошая работа!"]
      };
    }
  } catch (e) {
    console.error("Session evaluation error:", e);
  }
  
  return { score: 70, feedback: ["Тренировка завершена. Продолжайте практиковаться!"] };
}
