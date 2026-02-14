import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Intent Preview Layer
 * 
 * Returns human-readable AI state for a conversation.
 * Shows UNDERSTANDING before ACTION — the key UX pattern
 * that makes AI feel intelligent.
 * 
 * Response:
 *   { summary, next_step, confidence, state }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stage labels (human-readable Russian)
const STAGE_LABELS: Record<string, string> = {
  new_lead: 'Новый контакт',
  qualification: 'Выясняем потребности',
  interest: 'Проявляет интерес',
  objection: 'Есть сомнения',
  trial_offer: 'Предложен пробный урок',
  trial_scheduled: 'Записан на пробное',
  trial_done: 'Прошёл пробное',
  negotiation: 'Обсуждаем условия',
  closed_won: 'Записан',
  closed_lost: 'Потерян',
  reactivation: 'Возвращается',
};

// Intent → human-readable
const INTENT_LABELS: Record<string, string> = {
  price_question: 'Спрашивает о цене',
  schedule_question: 'Уточняет расписание',
  trial_request: 'Хочет на пробный урок',
  complaint: 'Высказывает недовольство',
  payment_question: 'Вопрос по оплате',
  greeting: 'Приветствие',
  goodbye: 'Прощание',
  thanks: 'Благодарность',
  general_question: 'Общий вопрос',
  enrollment_request: 'Хочет записаться',
  cancellation: 'Хочет отменить',
};

// Next step templates based on stage + intent
const NEXT_STEPS: Record<string, Record<string, string>> = {
  objection: {
    price_question: 'Перейти к ценности обучения, показать результаты учеников',
    default: 'Уточнить конкретное сомнение и закрыть его',
  },
  qualification: {
    default: 'Выяснить цель обучения и уровень',
  },
  interest: {
    default: 'Предложить пробный урок',
  },
  trial_offer: {
    default: 'Подтвердить дату и время пробного',
  },
  trial_done: {
    default: 'Спросить впечатления и предложить абонемент',
  },
  reactivation: {
    default: 'Узнать причину паузы, предложить новый формат',
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SELF_HOSTED_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { client_id, organization_id } = body;

    if (!client_id || !organization_id) {
      return new Response(JSON.stringify({ error: 'client_id and organization_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Get latest messages for context
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('content, direction, created_at')
      .eq('client_id', client_id)
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({
        summary: 'Новый диалог — пока нет сообщений',
        next_step: 'Начать с приветствия и уточнения потребности',
        confidence: 0.5,
        state: { stage: 'new_lead', intent: null, health: 100 },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get latest annotations for this client's messages
    const messageIds = messages.map(() => client_id); // we'll search by conversation
    const { data: annotations } = await supabase
      .from('ai_annotations')
      .select('annotation_type, value_json, confidence')
      .eq('entity_type', 'conversation')
      .eq('entity_id', client_id)
      .order('version', { ascending: false })
      .limit(5);

    // 3. Extract state from annotations or infer from messages
    let stage = 'qualification';
    let intent = 'general_question';
    let health = 75;
    let confidence = 0.6;

    if (annotations && annotations.length > 0) {
      for (const ann of annotations) {
        if (ann.annotation_type === 'intent' && ann.value_json) {
          intent = ann.value_json.intent || intent;
          stage = ann.value_json.stage || stage;
          confidence = ann.confidence || confidence;
        }
        if (ann.annotation_type === 'health' && ann.value_json) {
          health = ann.value_json.score || health;
        }
      }
    } else {
      // Quick inference from last message
      const lastMsg = messages[0]?.content?.toLowerCase() || '';
      if (lastMsg.includes('цен') || lastMsg.includes('стоим')) {
        intent = 'price_question';
        stage = 'objection';
      } else if (lastMsg.includes('пробн') || lastMsg.includes('попробовать')) {
        intent = 'trial_request';
        stage = 'interest';
      } else if (lastMsg.includes('расписан') || lastMsg.includes('время') || lastMsg.includes('когда')) {
        intent = 'schedule_question';
        stage = 'interest';
      } else if (lastMsg.includes('записать') || lastMsg.includes('хочу')) {
        intent = 'enrollment_request';
        stage = 'negotiation';
      }
    }

    // 4. Build human-readable summary
    const stageLabel = STAGE_LABELS[stage] || stage;
    const intentLabel = INTENT_LABELS[intent] || intent;

    const nextStepMap = NEXT_STEPS[stage] || {};
    const nextStep = nextStepMap[intent] || nextStepMap.default || 'Продолжить диалог';

    // Build summary line
    let summary = `${intentLabel}. Стадия: ${stageLabel}.`;
    if (health < 50) {
      summary += ' ⚠️ Риск потери клиента.';
    }

    // Log this preview event
    await supabase.rpc('log_ai_event', {
      p_org_id: organization_id,
      p_event_type: 'suggestion_shown',
      p_conversation_id: client_id,
      p_payload: { type: 'intent_preview', stage, intent, health },
    }).catch(() => {}); // non-blocking

    return new Response(JSON.stringify({
      summary,
      next_step: nextStep,
      confidence: Math.round(confidence * 100) / 100,
      state: { stage, intent, health },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[intent-preview] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
