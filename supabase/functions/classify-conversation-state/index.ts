import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { corsHeaders } from '../_shared/types.ts';

/**
 * Classify Conversation State
 * 
 * Analyzes the last N messages of a dialogue and determines the current
 * sales conversation stage using LLM tagging (cheap, 1-token response).
 * 
 * Called after each incoming message or on-demand from UI.
 */

const WINDOW_SIZE = 8; // last N messages to analyze

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { client_id, organization_id } = await req.json();

    if (!client_id || !organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'client_id and organization_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(selfHostedUrl, serviceKey);

    // 1. Get available stages for this organization
    const { data: stages } = await supabase
      .from('conversation_stages')
      .select('code, name')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .order('sort_order');

    const stageList = (stages || []).map(s => s.code);
    
    if (stageList.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No conversation stages configured for this organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get last N messages for this client
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('content, direction, message_type, created_at')
      .eq('client_id', client_id)
      .eq('organization_id', organization_id)
      .not('content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(WINDOW_SIZE);

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, stage: 'greeting', confidence: 0.5, reason: 'no_messages' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reverse to chronological order
    const chronological = [...messages].reverse();

    // 3. Build conversation text for classifier
    const conversationText = chronological.map(m => {
      const role = m.direction === 'incoming' ? 'Клиент' : 'Менеджер';
      return `${role}: ${(m.content || '').slice(0, 200)}`;
    }).join('\n');

    // 4. Classify using LLM (cheap, short prompt)
    const stageDescriptions = (stages || []).map(s => `${s.code} — ${s.name}`).join('\n');
    
    const classifierPrompt = `Определи текущую стадию продающего диалога.

Доступные стадии:
${stageDescriptions}

Диалог (последние ${chronological.length} сообщений):
${conversationText}

Ответь СТРОГО в формате JSON:
{"stage": "код_стадии", "confidence": 0.0-1.0, "reason": "краткое пояснение на русском"}`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    let classificationResult: { stage: string; confidence: number; reason: string };

    if (lovableApiKey) {
      // Use Lovable AI Gateway (preferred)
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'user', content: classifierPrompt }
          ],
          temperature: 0.1,
          max_tokens: 100,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error('[classify] AI gateway error:', aiResponse.status, errText);
        throw new Error(`AI gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const responseText = aiData.choices?.[0]?.message?.content || '';
      
      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        classificationResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try to extract stage name
        const foundStage = stageList.find(s => responseText.toLowerCase().includes(s));
        classificationResult = {
          stage: foundStage || 'greeting',
          confidence: 0.5,
          reason: 'Parsed from raw response'
        };
      }
    } else if (openaiApiKey) {
      // Fallback to OpenAI
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'user', content: classifierPrompt }
          ],
          temperature: 0.1,
          max_tokens: 100,
        }),
      });

      const aiData = await aiResponse.json();
      const responseText = aiData.choices?.[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[^}]+\}/);
      classificationResult = jsonMatch 
        ? JSON.parse(jsonMatch[0])
        : { stage: 'greeting', confidence: 0.3, reason: 'Parse failed' };
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'No AI API key configured (LOVABLE_API_KEY or OPENAI_API_KEY)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate stage code
    if (!stageList.includes(classificationResult.stage)) {
      classificationResult.stage = stageList[0];
      classificationResult.confidence = Math.min(classificationResult.confidence, 0.3);
    }

    // 5. Get current state to check for transitions
    const { data: currentState } = await supabase
      .from('conversation_states')
      .select('current_stage')
      .eq('client_id', client_id)
      .maybeSingle();

    const previousStage = currentState?.current_stage || null;
    const isTransition = previousStage && previousStage !== classificationResult.stage;

    // 6. Upsert conversation state
    const { error: upsertError } = await supabase
      .from('conversation_states')
      .upsert({
        client_id,
        organization_id,
        current_stage: classificationResult.stage,
        previous_stage: previousStage,
        confidence: classificationResult.confidence,
        stage_entered_at: isTransition ? new Date().toISOString() : (currentState ? undefined : new Date().toISOString()),
        last_classified_at: new Date().toISOString(),
        message_window_size: chronological.length,
        metadata: { reason: classificationResult.reason },
      }, {
        onConflict: 'client_id',
      });

    if (upsertError) {
      console.error('[classify] Upsert error:', upsertError);
    }

    // 7. Log transition if stage changed
    if (isTransition) {
      await supabase
        .from('conversation_stage_transitions')
        .insert({
          organization_id,
          client_id,
          from_stage: previousStage,
          to_stage: classificationResult.stage,
          confidence: classificationResult.confidence,
        });
    }

    // 8. Get next best actions for this stage
    const { data: actions } = await supabase
      .from('next_best_actions')
      .select('action_type, action_label, action_detail, priority, success_rate')
      .eq('organization_id', organization_id)
      .eq('stage_code', classificationResult.stage)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(3);

    return new Response(
      JSON.stringify({
        success: true,
        stage: classificationResult.stage,
        previous_stage: previousStage,
        is_transition: isTransition,
        confidence: classificationResult.confidence,
        reason: classificationResult.reason,
        next_best_actions: actions || [],
        messages_analyzed: chronological.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[classify-conversation-state] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
