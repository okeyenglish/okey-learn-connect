import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  handleCors, 
  errorResponse, 
  successResponse,
  getOpenAIApiKey,
  getOrganizationIdFromUser,
} from '../_shared/types.ts';

interface FAQItem {
  question_cluster: string;
  best_answer: string;
  source_example_ids: string[];
  frequency: number;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const organizationId = await getOrganizationIdFromUser(supabase, authHeader);
    if (!organizationId) {
      return errorResponse('Organization not found', 400);
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'extract', minExamples = 5, faqId } = body;

    // Action: approve FAQ
    if (action === 'approve' && faqId) {
      const { error } = await supabase
        .from('extracted_faq')
        .update({ approved: true })
        .eq('id', faqId)
        .eq('organization_id', organizationId);
      
      if (error) return errorResponse(`Approve failed: ${error.message}`, 500);
      return successResponse({ approved: true });
    }

    // Action: delete FAQ
    if (action === 'delete' && faqId) {
      const { error } = await supabase
        .from('extracted_faq')
        .delete()
        .eq('id', faqId)
        .eq('organization_id', organizationId);
      
      if (error) return errorResponse(`Delete failed: ${error.message}`, 500);
      return successResponse({ deleted: true });
    }

    // Action: list existing FAQ
    if (action === 'list') {
      const { data: faqs, error } = await supabase
        .from('extracted_faq')
        .select('*')
        .eq('organization_id', organizationId)
        .order('frequency', { ascending: false });

      if (error) return errorResponse(`List failed: ${error.message}`, 500);
      return successResponse({ faqs: faqs || [] });
    }

    // Action: extract FAQ from indexed conversations
    const openaiApiKey = await getOpenAIApiKey(supabase, organizationId);
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const apiKey = openaiApiKey || lovableKey;

    if (!apiKey) {
      return errorResponse('AI service not configured', 500);
    }

    // Get all approved conversation examples
    const { data: examples, error: exError } = await supabase
      .from('conversation_examples')
      .select('id, scenario_type, context_summary, initial_message, messages, example_messages, quality_score, outcome, key_phrases')
      .eq('organization_id', organizationId)
      .eq('approved', true)
      .gte('quality_score', 3)
      .order('quality_score', { ascending: false })
      .limit(100);

    if (exError) {
      return errorResponse(`Failed to fetch examples: ${exError.message}`, 500);
    }

    if (!examples || examples.length < minExamples) {
      return successResponse({ 
        faqs: [], 
        message: `Нужно минимум ${minExamples} проиндексированных диалогов. Сейчас: ${examples?.length || 0}` 
      });
    }

    // Build context for AI clustering
    const exampleSummaries = examples.map((ex: any, i: number) => {
      const msgs = ex.example_messages || ex.messages || [];
      const clientQuestions = msgs
        .filter((m: any) => m.role === 'client')
        .map((m: any) => m.content)
        .slice(0, 3)
        .join(' | ');
      
      return `[${i + 1}] Тема: ${ex.scenario_type}, Суть: ${ex.context_summary}, Вопросы клиента: ${clientQuestions}`;
    }).join('\n');

    const prompt = `Проанализируй следующие диалоги и выдели часто задаваемые вопросы (FAQ).

ДИАЛОГИ:
${exampleSummaries}

Сгруппируй похожие вопросы клиентов в кластеры. Для каждого кластера:
1. Сформулируй обобщённый вопрос
2. Составь лучший ответ на основе успешных диалогов
3. Укажи номера диалогов-источников
4. Оцени частоту (сколько диалогов затрагивают эту тему)

Верни JSON массив:
[
  {
    "question_cluster": "Обобщённый вопрос",
    "best_answer": "Лучший ответ на основе примеров",
    "source_indices": [1, 3, 7],
    "frequency": 5
  }
]

Выдели 5-15 самых частых вопросов. Отвечай ТОЛЬКО валидным JSON массивом.`;

    const aiUrl = openaiApiKey 
      ? 'https://api.openai.com/v1/chat/completions' 
      : 'https://ai.gateway.lovable.dev/v1/chat/completions';

    const aiModel = openaiApiKey ? 'gpt-4o-mini' : 'google/gemini-2.5-flash';

    const aiResponse = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[extract-faq] AI error:', errText);
      return errorResponse('AI analysis failed', 500);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from AI response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[extract-faq] Could not parse AI response:', content);
      return errorResponse('Could not parse FAQ from AI response', 500);
    }

    const rawFaqs = JSON.parse(jsonMatch[0]) as Array<{
      question_cluster: string;
      best_answer: string;
      source_indices: number[];
      frequency: number;
    }>;

    // Map source indices to actual example IDs
    const faqItems: FAQItem[] = rawFaqs.map(faq => ({
      question_cluster: faq.question_cluster,
      best_answer: faq.best_answer,
      source_example_ids: faq.source_indices
        .filter(i => i >= 1 && i <= examples.length)
        .map(i => examples[i - 1].id),
      frequency: faq.frequency,
    }));

    // Save to database (upsert by question_cluster)
    let saved = 0;
    for (const faq of faqItems) {
      const { error: upsertError } = await supabase
        .from('extracted_faq')
        .upsert({
          organization_id: organizationId,
          question_cluster: faq.question_cluster,
          best_answer: faq.best_answer,
          source_example_ids: faq.source_example_ids,
          frequency: faq.frequency,
          approved: false,
        }, {
          onConflict: 'organization_id,question_cluster',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        // Try insert if upsert fails (unique constraint might not exist)
        const { error: insertError } = await supabase
          .from('extracted_faq')
          .insert({
            organization_id: organizationId,
            question_cluster: faq.question_cluster,
            best_answer: faq.best_answer,
            source_example_ids: faq.source_example_ids,
            frequency: faq.frequency,
            approved: false,
          });
        
        if (!insertError) saved++;
        else console.warn('[extract-faq] Insert error:', insertError.message);
      } else {
        saved++;
      }
    }

    console.log(`[extract-faq] Extracted ${faqItems.length} FAQs, saved ${saved}`);

    return successResponse({ 
      faqs: faqItems, 
      saved,
      total: faqItems.length 
    });

  } catch (error) {
    console.error('[extract-faq] Error:', error);
    return errorResponse('Server error', 500);
  }
});
