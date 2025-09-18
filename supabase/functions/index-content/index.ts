import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== STARTING CONTENT INDEXING ===');
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:');
    console.log('- OPENAI_API_KEY:', !!OPENAI_API_KEY);
    console.log('- SUPABASE_URL:', !!SUPABASE_URL);
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: "Missing configuration" }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Упрощенный контент для диагностики
    const siteContent = [
      {
        url: "/",
        title: "Главная страница",
        content: "O'KEY ENGLISH - школа английского языка в Москве. 9 филиалов. Курсы для детей и взрослых."
      },
      {
        url: "/courses", 
        title: "Курсы",
        content: "Kids Box, Super Safari, Prepare, Empower - программы для всех возрастов."
      },
      {
        url: "/branches",
        title: "Филиалы", 
        content: "Котельники, Люберцы, Мытищи, Новокосино, Окская, Солнцево, Стахановская, Онлайн."
      }
    ];

    console.log(`Processing ${siteContent.length} items`);
    let processed = 0;
    const errors = [];

    for (let i = 0; i < siteContent.length; i++) {
      const item = siteContent[i];
      console.log(`\n--- Processing item ${i + 1}/${siteContent.length}: ${item.title} ---`);
      
      try {
        // Шаг 1: Создание embedding
        console.log('Step 1: Creating embedding...');
        const embRes = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: item.content,
          }),
        });

        console.log('OpenAI API response status:', embRes.status);
        
        if (!embRes.ok) {
          const errorText = await embRes.text();
          console.error(`OpenAI API error for ${item.title}:`, errorText);
          errors.push(`${item.title}: OpenAI API error - ${errorText}`);
          continue;
        }

        const embJson = await embRes.json();
        console.log('Embedding response received, data length:', embJson.data?.length);
        
        const embedding = embJson.data?.[0]?.embedding;

        if (!embedding) {
          console.error(`No embedding in response for ${item.title}`);
          errors.push(`${item.title}: No embedding in response`);
          continue;
        }

        console.log('Embedding created successfully, vector length:', embedding.length);

        // Шаг 2: Сохранение в базу
        console.log('Step 2: Saving to database...');
        const { data, error } = await supabase
          .from('docs')
          .upsert({
            url: item.url,
            title: item.title,
            content: item.content,
            embedding: embedding,
            tokens: Math.ceil(item.content.length / 4)
          }, {
            onConflict: 'url'
          });

        if (error) {
          console.error(`Database error for ${item.title}:`, error);
          errors.push(`${item.title}: Database error - ${error.message}`);
        } else {
          console.log(`✅ Successfully saved: ${item.title}`);
          processed++;
        }
        
        // Небольшая задержка
        if (i < siteContent.length - 1) {
          console.log('Waiting 500ms before next item...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (itemError) {
        console.error(`Unexpected error processing ${item.title}:`, itemError);
        errors.push(`${item.title}: Unexpected error - ${itemError.message}`);
      }
    }

    console.log('\n=== INDEXING COMPLETED ===');
    console.log(`Successfully processed: ${processed}/${siteContent.length}`);
    console.log('Errors:', errors);

    return new Response(
      JSON.stringify({ 
        success: processed > 0, 
        message: `Проиндексировано ${processed} страниц из ${siteContent.length}`,
        processed,
        total: siteContent.length,
        errors
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== FATAL ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || "Unknown server error",
        stack: error?.stack 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});