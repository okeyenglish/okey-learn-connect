import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const INDEXNOW_KEY = Deno.env.get('INDEXNOW_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls, host, organizationId } = await req.json();
    console.log('[seo-indexnow] Submitting', urls?.length || 0, 'URLs');

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error('urls array is required');
    }

    if (!host) {
      throw new Error('host is required (e.g., okey-english.ru)');
    }

    if (!organizationId) {
      throw new Error('organizationId is required');
    }

    if (!INDEXNOW_KEY) {
      throw new Error('INDEXNOW_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Отправляем URLs в IndexNow (поддерживается Яндекс, Bing, Seznam)
    const indexNowPayload = {
      host: host,
      key: INDEXNOW_KEY,
      urlList: urls,
    };

    console.log('[seo-indexnow] Payload:', indexNowPayload);

    // Отправляем в IndexNow API
    const response = await fetch('https://yandex.com/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(indexNowPayload),
    });

    if (!response.ok && response.status !== 202) {
      const errorText = await response.text();
      console.error('[seo-indexnow] IndexNow API error:', errorText);
      throw new Error(`IndexNow API error: ${response.status}`);
    }

    console.log('[seo-indexnow] Successfully submitted to IndexNow');

    // Добавляем URLs в очередь публикации
    const queueItems = urls.map((url: string) => ({
      organization_id: organizationId,
      url: url,
      status: 'indexnow_submitted',
      submitted_at: new Date().toISOString(),
    }));

    const { error: queueError } = await supabase
      .from('publication_queue')
      .upsert(queueItems, {
        onConflict: 'organization_id,url',
      });

    if (queueError) {
      console.error('[seo-indexnow] Error updating queue:', queueError);
    }

    // Логируем задачу
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'indexnow_submit',
      status: 'success',
      input_data: { urls, host },
      output_data: { 
        submitted_count: urls.length,
        response_status: response.status
      },
    });

    return new Response(JSON.stringify({
      success: true,
      submitted: urls.length,
      status: response.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[seo-indexnow] Error:', error);

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
