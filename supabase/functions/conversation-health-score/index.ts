import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { corsHeaders } from "../_shared/types.ts";

/**
 * Conversation Health Score Calculator
 *
 * Вычисляет health score (0-100) для диалога клиента на основе:
 * 1. Engagement signals — длина сообщений, вопросы, скорость ответов
 * 2. Momentum — динамика изменения вовлечённости
 * 3. Stage stagnation — застой на одной стадии
 * 4. Manager behavior — проблемы на стороне менеджера
 *
 * POST { client_id, organization_id }
 * Returns { health_score, risk_level, dominant_signal, signals, recommendation, reason }
 */

interface HealthSignals {
  engagement: number;      // 0-100
  momentum: number;        // 0-100
  stage_progress: number;  // 0-100
  manager_behavior: number; // 0-100
  details: Record<string, unknown>;
}

const WEIGHTS = {
  engagement: 0.30,
  momentum: 0.30,
  stage_progress: 0.25,
  manager_behavior: 0.15,
};

// Risk recommendations by dominant signal
const RECOMMENDATIONS: Record<string, string> = {
  short_replies: 'Клиент отвечает коротко. Задайте открытый вопрос о цели обучения или предложите пробный урок.',
  slow_response: 'Клиент замедлился с ответами. Возможно стоит вернуться к ценности или предложить удобное время для звонка.',
  declining_engagement: 'Вовлечённость падает. Попробуйте сменить тему или предложить что-то новое.',
  stage_stagnation: 'Диалог застрял на текущей стадии. Попробуйте мягко продвинуть к следующему шагу.',
  manager_monologue: 'Слишком много сообщений подряд от менеджера. Дайте клиенту высказаться.',
  no_questions: 'Клиент перестал задавать вопросы. Это признак угасания интереса — вернитесь к потребности.',
  ok: 'Диалог развивается нормально.',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { client_id, organization_id } = await req.json();

    if (!client_id || !organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "client_id and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SELF_HOSTED_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch last 30 messages for this client
    const { data: messages, error: msgErr } = await supabase
      .from("chat_messages")
      .select("id, content, direction, created_at, sender_id, message_type, metadata")
      .eq("client_id", client_id)
      .eq("organization_id", organization_id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (msgErr) {
      console.error("[health-score] Messages fetch error:", msgErr);
      throw new Error(msgErr.message);
    }

    if (!messages || messages.length < 3) {
      return new Response(
        JSON.stringify({
          success: true,
          health_score: 80,
          risk_level: "ok",
          dominant_signal: "insufficient_data",
          reason: "Недостаточно сообщений для анализа",
          recommendation: "Продолжайте диалог.",
          signals: {},
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reverse to chronological order
    const chronological = [...messages].reverse();

    // Determine message direction
    const isIncoming = (msg: any) => {
      if (msg.direction === 'incoming') return true;
      if (msg.direction === 'outgoing') return false;
      // Fallback for is_outgoing boolean field
      if ((msg as any).is_outgoing === true) return false;
      if ((msg as any).is_outgoing === false) return true;
      // message_type fallback
      return msg.message_type !== 'manager';
    };

    const clientMessages = chronological.filter(isIncoming);
    const managerMessages = chronological.filter(m => !isIncoming(m));

    // ========== 1. ENGAGEMENT SIGNALS ==========
    const engagement = calcEngagement(clientMessages, chronological);

    // ========== 2. MOMENTUM ==========
    const momentum = calcMomentum(clientMessages);

    // ========== 3. STAGE PROGRESS ==========
    const stageProgress = await calcStageProgress(supabase, client_id, organization_id);

    // ========== 4. MANAGER BEHAVIOR ==========
    const managerBehavior = calcManagerBehavior(managerMessages, clientMessages, chronological);

    // ========== COMPOSITE SCORE ==========
    const rawScore =
      engagement.score * WEIGHTS.engagement +
      momentum.score * WEIGHTS.momentum +
      stageProgress.score * WEIGHTS.stage_progress +
      managerBehavior.score * WEIGHTS.manager_behavior;

    const healthScore = Math.round(Math.max(0, Math.min(100, rawScore)));

    const riskLevel = healthScore >= 80 ? 'ok' : healthScore >= 50 ? 'warning' : 'critical';

    // Find dominant negative signal
    const signalScores = [
      { name: 'short_replies', score: engagement.details.avgLength < 15 ? 100 - engagement.score : 0 },
      { name: 'slow_response', score: engagement.details.avgResponseMin > 60 ? 100 - engagement.score : 0 },
      { name: 'declining_engagement', score: momentum.score < 50 ? 100 - momentum.score : 0 },
      { name: 'stage_stagnation', score: stageProgress.score < 40 ? 100 - stageProgress.score : 0 },
      { name: 'manager_monologue', score: managerBehavior.details.consecutiveManagerMsgs > 2 ? 100 - managerBehavior.score : 0 },
      { name: 'no_questions', score: engagement.details.questionCount === 0 ? 30 : 0 },
    ];

    const dominantSignal = signalScores.sort((a, b) => b.score - a.score)[0];
    const signalName = dominantSignal.score > 0 ? dominantSignal.name : 'ok';

    const signals = {
      engagement: { score: engagement.score, ...engagement.details },
      momentum: { score: momentum.score, ...momentum.details },
      stage_progress: { score: stageProgress.score, ...stageProgress.details },
      manager_behavior: { score: managerBehavior.score, ...managerBehavior.details },
    };

    const reason = generateReason(signalName, signals);
    const recommendation = RECOMMENDATIONS[signalName] || RECOMMENDATIONS.ok;

    // Save to health log
    try {
      await supabase.from("conversation_health_log").insert({
        client_id,
        organization_id,
        health_score: healthScore,
        risk_level: riskLevel,
        dominant_signal: signalName,
        signals,
        recommendation,
        reason,
      });
    } catch (logErr) {
      console.error("[health-score] Failed to save log:", logErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        health_score: healthScore,
        risk_level: riskLevel,
        dominant_signal: signalName,
        signals,
        recommendation,
        reason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[health-score] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============ SIGNAL CALCULATORS ============

function calcEngagement(clientMsgs: any[], allMsgs: any[]) {
  if (clientMsgs.length === 0) return { score: 30, details: { avgLength: 0, questionCount: 0, avgResponseMin: 999 } };

  const lengths = clientMsgs.map(m => (m.content || '').length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  // Count questions from client
  const questionCount = clientMsgs.filter(m => (m.content || '').includes('?')).length;

  // Average response time (minutes)
  const responseTimes: number[] = [];
  for (let i = 1; i < allMsgs.length; i++) {
    const prev = allMsgs[i - 1];
    const curr = allMsgs[i];
    // Client responding to manager
    if (curr.direction === 'incoming' && prev.direction === 'outgoing') {
      const diff = (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / 60000;
      if (diff > 0 && diff < 1440) responseTimes.push(diff);
    }
  }
  const avgResponseMin = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 30;

  // Score
  let score = 50;
  // Length component (0-30)
  score += Math.min(30, avgLength / 3);
  // Questions component (0-20)
  score += Math.min(20, questionCount * 5);
  // Response speed component (penalize slow)
  if (avgResponseMin < 5) score += 15;
  else if (avgResponseMin < 30) score += 10;
  else if (avgResponseMin < 120) score += 0;
  else score -= 15;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    details: {
      avgLength: Math.round(avgLength),
      questionCount,
      avgResponseMin: Math.round(avgResponseMin),
      messageCount: clientMsgs.length,
    },
  };
}

function calcMomentum(clientMsgs: any[]) {
  if (clientMsgs.length < 4) return { score: 70, details: { trend: 'stable', recentVsOlder: 1 } };

  const mid = Math.floor(clientMsgs.length / 2);
  const older = clientMsgs.slice(0, mid);
  const recent = clientMsgs.slice(mid);

  const olderAvg = older.reduce((s, m) => s + (m.content || '').length, 0) / older.length;
  const recentAvg = recent.reduce((s, m) => s + (m.content || '').length, 0) / recent.length;

  const ratio = olderAvg > 0 ? recentAvg / olderAvg : 1;

  let trend: string;
  let score: number;

  if (ratio >= 0.9) {
    trend = 'stable';
    score = 80;
  } else if (ratio >= 0.6) {
    trend = 'declining';
    score = 55;
  } else {
    trend = 'dropping';
    score = 25;
  }

  return {
    score,
    details: { trend, recentVsOlder: Math.round(ratio * 100) / 100 },
  };
}

async function calcStageProgress(supabase: any, clientId: string, orgId: string) {
  try {
    const { data: state } = await supabase
      .from("conversation_states")
      .select("current_stage, stage_entered_at, previous_stage")
      .eq("client_id", clientId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!state) return { score: 70, details: { stage: 'unknown', hoursOnStage: 0 } };

    const hoursOnStage = (Date.now() - new Date(state.stage_entered_at).getTime()) / 3600000;
    const hasProgressed = state.previous_stage && state.previous_stage !== state.current_stage;

    let score = 80;
    if (hoursOnStage > 48) score -= 40;
    else if (hoursOnStage > 24) score -= 25;
    else if (hoursOnStage > 12) score -= 10;

    if (hasProgressed) score += 10;

    // Stages that are naturally risky
    const riskyStages = ['objection', 'follow_up'];
    if (riskyStages.includes(state.current_stage)) score -= 10;

    return {
      score: Math.max(0, Math.min(100, score)),
      details: {
        stage: state.current_stage,
        hoursOnStage: Math.round(hoursOnStage),
        hasProgressed: !!hasProgressed,
      },
    };
  } catch {
    return { score: 70, details: { stage: 'unknown', hoursOnStage: 0 } };
  }
}

function calcManagerBehavior(managerMsgs: any[], clientMsgs: any[], allMsgs: any[]) {
  if (managerMsgs.length === 0) return { score: 70, details: { consecutiveManagerMsgs: 0, avgManagerLength: 0, ratio: 0 } };

  // Consecutive manager messages at the end
  let consecutive = 0;
  for (let i = allMsgs.length - 1; i >= 0; i--) {
    if (allMsgs[i].direction === 'outgoing' || allMsgs[i].message_type === 'manager') {
      consecutive++;
    } else break;
  }

  const avgManagerLength = managerMsgs.reduce((s, m) => s + (m.content || '').length, 0) / managerMsgs.length;
  const ratio = clientMsgs.length > 0 ? managerMsgs.length / clientMsgs.length : 3;

  let score = 80;
  if (consecutive >= 4) score -= 30;
  else if (consecutive >= 3) score -= 15;
  
  if (ratio > 2) score -= 15;
  if (avgManagerLength > 500) score -= 10;

  return {
    score: Math.max(0, Math.min(100, score)),
    details: {
      consecutiveManagerMsgs: consecutive,
      avgManagerLength: Math.round(avgManagerLength),
      ratio: Math.round(ratio * 100) / 100,
    },
  };
}

function generateReason(signal: string, signals: any): string {
  switch (signal) {
    case 'short_replies':
      return `Клиент отвечает в среднем ${signals.engagement.avgLength} символов. Это признак угасания интереса.`;
    case 'slow_response':
      return `Среднее время ответа клиента: ${signals.engagement.avgResponseMin} мин. Клиент замедляется.`;
    case 'declining_engagement':
      return `Вовлечённость клиента снизилась: длина сообщений упала до ${signals.momentum.recentVsOlder * 100}% от начала диалога.`;
    case 'stage_stagnation':
      return `Диалог застрял на стадии «${signals.stage_progress.stage}» уже ${signals.stage_progress.hoursOnStage}ч.`;
    case 'manager_monologue':
      return `Менеджер отправил ${signals.manager_behavior.consecutiveManagerMsgs} сообщения подряд без ответа клиента.`;
    case 'no_questions':
      return 'Клиент перестал задавать вопросы — признак потери интереса.';
    default:
      return 'Диалог развивается нормально.';
  }
}
