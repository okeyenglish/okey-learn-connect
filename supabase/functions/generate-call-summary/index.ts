import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Generate call summary function called:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !LOVABLE_API_KEY) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      const { callId, callDetails } = await req.json();
      console.log('Processing call summary for callId:', callId);

      if (!callId) {
        return new Response(
          JSON.stringify({ error: 'callId is required' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }

      // Get call details from database if not provided
      let call = callDetails;
      if (!call) {
        const { data: callData, error: callError } = await supabase
          .from('call_logs')
          .select('*, clients(name)')
          .eq('id', callId)
          .single();
        
        if (callError || !callData) {
          console.error('Error fetching call:', callError);
          return new Response(
            JSON.stringify({ error: 'Call not found' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404 
            }
          );
        }
        call = callData;
      }

      // Generate call summary using OpenAI
      const prompt = `Создай краткое резюме звонка на основе следующих данных:

Клиент: ${call.clients?.name || 'Неизвестный'}
Номер телефона: ${call.phone_number}
Направление: ${call.direction === 'incoming' ? 'Входящий' : 'Исходящий'}
Статус: ${call.status}
Длительность: ${call.duration_seconds ? Math.floor(call.duration_seconds / 60) + 'м ' + (call.duration_seconds % 60) + 'с' : 'Не определена'}
Дата: ${new Date(call.started_at).toLocaleString('ru-RU')}

Создай профессиональное резюме звонка длиной 2-3 предложения, которое поможет менеджеру быстро понять суть звонка.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'Ты помощник менеджера в школе английского языка. Создавай краткие, профессиональные резюме звонков.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_completion_tokens: 200,
        }),
      });

      if (!response.ok) {
        console.error('AI Gateway error:', response.status, response.statusText);
        
        if (response.status === 429) {
          throw new Error('Превышен лимит запросов к AI. Попробуйте позже.');
        } else if (response.status === 402) {
          throw new Error('Недостаточно средств на балансе Lovable AI.');
        }
        
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      const summary = data.choices[0]?.message?.content;

      if (!summary) {
        throw new Error('No summary generated');
      }

      // Update call log with generated summary
      const { error: updateError } = await supabase
        .from('call_logs')
        .update({ summary })
        .eq('id', callId);

      if (updateError) {
        console.error('Error updating call log:', updateError);
        throw updateError;
      }

      console.log('Successfully generated and saved summary for call:', callId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          summary,
          callId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Handle non-POST requests
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Call summary generator is running',
        method: req.method
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Call summary generation error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});