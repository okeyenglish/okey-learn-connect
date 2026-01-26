import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { corsHeaders } from '../_shared/types.ts';

const HOLIHOPE_DOMAIN = 'https://okeyenglish.t8s.ru/Api/V2';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Auth check
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'No organization found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // GET - Fetch current settings
    if (req.method === 'GET') {
      const { data: settings, error } = await supabase
        .from('messenger_settings')
        .select('settings, is_enabled')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'holihope')
        .maybeSingle();

      if (error) {
        console.error('Error fetching holihope settings:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mask API key for display
      let maskedSettings = null;
      if (settings?.settings) {
        const apiKey = (settings.settings as Record<string, string>).apiKey || '';
        maskedSettings = {
          apiKey: apiKey ? `${apiKey.substring(0, 4)}••••••••${apiKey.substring(apiKey.length - 4)}` : '',
          isEnabled: settings.is_enabled
        };
      }

      return new Response(
        JSON.stringify({ settings: maskedSettings }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Remove settings
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('messenger_settings')
        .delete()
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'holihope');

      if (error) {
        console.error('Error deleting holihope settings:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Save settings or test connection
    if (req.method === 'POST') {
      const body = await req.json();

      // Test action
      if (body.action === 'test') {
        // Fetch current API key from database
        const { data: settings } = await supabase
          .from('messenger_settings')
          .select('settings')
          .eq('organization_id', organizationId)
          .eq('messenger_type', 'holihope')
          .maybeSingle();

        const apiKey = (settings?.settings as Record<string, string>)?.apiKey;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ success: false, error: 'API ключ не настроен' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Test API call to HoliHope
        try {
          const testUrl = `${HOLIHOPE_DOMAIN}/GetFilials?authkey=${apiKey}`;
          const response = await fetch(testUrl);
          
          if (response.status === 401) {
            return new Response(
              JSON.stringify({ success: false, error: 'Неверный API ключ (401)' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (!response.ok) {
            return new Response(
              JSON.stringify({ success: false, error: `Ошибка API: ${response.status}` }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const data = await response.json();
          if (data && Array.isArray(data)) {
            return new Response(
              JSON.stringify({ success: true, message: `Найдено ${data.length} филиалов` }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('HoliHope test error:', error);
          return new Response(
            JSON.stringify({ success: false, error: `Ошибка подключения: ${(error as Error).message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Save settings
      const { apiKey, isEnabled } = body;

      // Check if settings exist
      const { data: existing } = await supabase
        .from('messenger_settings')
        .select('id, settings')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'holihope')
        .maybeSingle();

      // Preserve existing API key if new one is not provided or is masked
      let finalApiKey = apiKey;
      if (!apiKey || apiKey.includes('••')) {
        finalApiKey = (existing?.settings as Record<string, string>)?.apiKey || '';
      }

      const settingsData = {
        apiKey: finalApiKey
      };

      if (existing) {
        // Update
        const { error } = await supabase
          .from('messenger_settings')
          .update({
            settings: settingsData,
            is_enabled: isEnabled ?? true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating holihope settings:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // Insert
        if (!finalApiKey) {
          return new Response(
            JSON.stringify({ error: 'API ключ обязателен' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('messenger_settings')
          .insert({
            organization_id: organizationId,
            messenger_type: 'holihope',
            settings: settingsData,
            is_enabled: isEnabled ?? true
          });

        if (error) {
          console.error('Error inserting holihope settings:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('HoliHope settings error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
