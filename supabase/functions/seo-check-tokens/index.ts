import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YANDEX_OAUTH_TOKEN = Deno.env.get('YANDEX_OAUTH_TOKEN');
    const YANDEX_METRIKA_COUNTER_ID = Deno.env.get('YANDEX_METRIKA_COUNTER_ID');
    const YANDEX_WEBMASTER_HOST_ID = Deno.env.get('YANDEX_WEBMASTER_HOST_ID');
    const YANDEX_WEBMASTER_USER_ID = Deno.env.get('YANDEX_WEBMASTER_USER_ID');
    const YANDEX_DIRECT_TOKEN = Deno.env.get('YANDEX_DIRECT_TOKEN');

    const results = {
      oauth_token: { exists: !!YANDEX_OAUTH_TOKEN, valid: false, error: null, data: null },
      metrika_counter_id: { exists: !!YANDEX_METRIKA_COUNTER_ID, valid: false, error: null, value: YANDEX_METRIKA_COUNTER_ID },
      webmaster_host_id: { exists: !!YANDEX_WEBMASTER_HOST_ID, valid: false, error: null, value: YANDEX_WEBMASTER_HOST_ID },
      webmaster_user_id: { exists: !!YANDEX_WEBMASTER_USER_ID, valid: false, error: null, value: YANDEX_WEBMASTER_USER_ID },
      direct_token: { exists: !!YANDEX_DIRECT_TOKEN, valid: false, error: null, data: null }
    };

    // 1. Проверка YANDEX_OAUTH_TOKEN через Webmaster API
    if (YANDEX_OAUTH_TOKEN) {
      try {
        const userResponse = await fetch('https://api.webmaster.yandex.net/v4/user/', {
          headers: { 'Authorization': `OAuth ${YANDEX_OAUTH_TOKEN}` }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          results.oauth_token.valid = true;
          results.oauth_token.data = userData;
        } else {
          results.oauth_token.error = `HTTP ${userResponse.status}: ${await userResponse.text()}`;
        }
      } catch (error) {
        results.oauth_token.error = error.message;
      }
    }

    // 2. Проверка YANDEX_METRIKA_COUNTER_ID через Management API
    if (YANDEX_METRIKA_COUNTER_ID && YANDEX_OAUTH_TOKEN) {
      try {
        const metrikaResponse = await fetch(
          `https://api-metrika.yandex.net/management/v1/counter/${YANDEX_METRIKA_COUNTER_ID}`,
          { headers: { 'Authorization': `OAuth ${YANDEX_OAUTH_TOKEN}` } }
        );
        
        if (metrikaResponse.ok) {
          const counterData = await metrikaResponse.json();
          results.metrika_counter_id.valid = true;
          results.metrika_counter_id.data = {
            name: counterData.counter?.name,
            site: counterData.counter?.site,
            status: counterData.counter?.code_status
          };
        } else {
          results.metrika_counter_id.error = `HTTP ${metrikaResponse.status}: ${await metrikaResponse.text()}`;
        }
      } catch (error) {
        results.metrika_counter_id.error = error.message;
      }
    }

    // 3. Проверка YANDEX_WEBMASTER_HOST_ID
    if (YANDEX_WEBMASTER_HOST_ID && YANDEX_WEBMASTER_USER_ID && YANDEX_OAUTH_TOKEN) {
      try {
        const hostResponse = await fetch(
          `https://api.webmaster.yandex.net/v4/user/${YANDEX_WEBMASTER_USER_ID}/hosts/${YANDEX_WEBMASTER_HOST_ID}/summary`,
          { headers: { 'Authorization': `OAuth ${YANDEX_OAUTH_TOKEN}` } }
        );
        
        if (hostResponse.ok) {
          const hostData = await hostResponse.json();
          results.webmaster_host_id.valid = true;
          results.webmaster_host_id.data = {
            host_display_name: hostData.host_display_name,
            verification: hostData.verification,
            indexing: hostData.indexing_available
          };
        } else {
          const errorText = await hostResponse.text();
          
          // Проверяем, является ли это ошибкой HOST_NOT_LOADED
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error_code === 'HOST_NOT_LOADED') {
              results.webmaster_host_id.error = 'PENDING_LOAD';
              results.webmaster_host_id.data = {
                status: 'pending',
                message: 'Хост добавлен в Вебмастер, но ещё не загружен. Обычно это занимает 1-7 дней.'
              };
            } else {
              results.webmaster_host_id.error = `HTTP ${hostResponse.status}: ${errorText}`;
            }
          } catch {
            results.webmaster_host_id.error = `HTTP ${hostResponse.status}: ${errorText}`;
          }
        }
      } catch (error) {
        results.webmaster_host_id.error = error.message;
      }
    }

    // 4. Проверка YANDEX_WEBMASTER_USER_ID
    if (YANDEX_WEBMASTER_USER_ID && YANDEX_OAUTH_TOKEN) {
      try {
        const hostsResponse = await fetch(
          `https://api.webmaster.yandex.net/v4/user/${YANDEX_WEBMASTER_USER_ID}/hosts`,
          { headers: { 'Authorization': `OAuth ${YANDEX_OAUTH_TOKEN}` } }
        );
        
        if (hostsResponse.ok) {
          const hostsData = await hostsResponse.json();
          results.webmaster_user_id.valid = true;
          results.webmaster_user_id.data = {
            hosts_count: hostsData.hosts?.length || 0,
            hosts: hostsData.hosts
          };
        } else {
          results.webmaster_user_id.error = `HTTP ${hostsResponse.status}: ${await hostsResponse.text()}`;
        }
      } catch (error) {
        results.webmaster_user_id.error = error.message;
      }
    }

    // 5. Проверка YANDEX_DIRECT_TOKEN через Direct API
    if (YANDEX_DIRECT_TOKEN) {
      try {
        // Проверяем доступ к Wordstat через тестовый запрос
        const wordstatResponse = await fetch('https://api.direct.yandex.com/json/v5/keywordsresearch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${YANDEX_DIRECT_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept-Language': 'ru'
          },
          body: JSON.stringify({
            method: 'get',
            params: {
              Keywords: ['английский язык'],
              GeoIds: [1] // Москва и область
            }
          })
        });

        if (wordstatResponse.ok) {
          const wordstatData = await wordstatResponse.json();
          results.direct_token.valid = true;
          results.direct_token.data = { 
            status: 'Токен валиден, Wordstat API доступен',
            test_query_result: wordstatData
          };
        } else {
          const errorText = await wordstatResponse.text();
          results.direct_token.error = `HTTP ${wordstatResponse.status}: ${errorText}`;
        }
      } catch (error) {
        results.direct_token.error = error.message;
      }
    }

    // Общая валидация
    const allValid = Object.values(results).every(r => r.exists && r.valid);
    
    // Функция для определения статуса
    const getStatus = (result: any) => {
      if (result.valid) return '✅ Работает';
      if (result.error === 'PENDING_LOAD') return '⏳ Ожидает загрузки';
      return '❌ Ошибка';
    };
    
    const summary = {
      all_tokens_valid: allValid,
      tokens_status: {
        oauth_token: getStatus(results.oauth_token),
        metrika_counter: getStatus(results.metrika_counter_id),
        webmaster_host: getStatus(results.webmaster_host_id),
        webmaster_user: getStatus(results.webmaster_user_id),
        direct_token: getStatus(results.direct_token)
      }
    };

    return new Response(
      JSON.stringify({ success: true, summary, details: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[seo-check-tokens] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
