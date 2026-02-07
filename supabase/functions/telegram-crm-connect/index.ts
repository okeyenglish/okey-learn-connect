import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramCrmConnectRequest {
  crmApiUrl: string;
  crmApiKey: string;
  crmPhoneNumber: string;
  integrationId?: string;  // If updating existing integration
  name?: string;
}

Deno.serve(async (req) => {
  console.log('[telegram-crm-connect] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || supabaseUrl;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // Parse request
    const body: TelegramCrmConnectRequest = await req.json();
    const { crmApiUrl, crmApiKey, crmPhoneNumber, integrationId, name } = body;

    if (!crmApiUrl || !crmApiKey || !crmPhoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'All fields are required: crmApiUrl, crmApiKey, crmPhoneNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate webhook URL
    const webhookKey = crypto.randomUUID();
    const webhookUrl = `${selfHostedUrl}/functions/v1/telegram-crm-webhook`;

    console.log('[telegram-crm-connect] Registering webhook:', webhookUrl);

    // Register webhook with Telegram CRM server
    try {
      const connectResponse = await fetch(`${crmApiUrl}/integration/lovable/connect`, {
        method: 'POST',
        headers: {
          'X-API-Key': crmApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: organizationId,
          webhook_url: webhookUrl,
          phone: crmPhoneNumber,
          secret: webhookKey,
        }),
      });

      if (!connectResponse.ok) {
        let errorText = '';
        try {
          const errorData = await connectResponse.json();
          errorText = errorData.error || errorData.detail || `HTTP ${connectResponse.status}`;
        } catch {
          errorText = await connectResponse.text().catch(() => `HTTP ${connectResponse.status}`);
        }
        
        console.error('[telegram-crm-connect] Server connect failed:', errorText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Ошибка подключения к серверу: ${errorText}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const connectData = await connectResponse.json();
      console.log('[telegram-crm-connect] Server response:', connectData);

    } catch (fetchError) {
      console.error('[telegram-crm-connect] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Не удалось подключиться к серверу: ${fetchError instanceof Error ? fetchError.message : 'Network error'}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save or update integration in database
    const integrationName = name || `Telegram CRM (${crmPhoneNumber})`;
    const settings = {
      crmApiUrl,
      crmApiKey,
      crmPhoneNumber,
    };

    if (integrationId) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from('messenger_integrations')
        .update({
          name: integrationName,
          settings,
          webhook_key: webhookKey,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integrationId)
        .eq('organization_id', organizationId);

      if (updateError) {
        console.error('[telegram-crm-connect] Update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update integration' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Integration updated',
          integrationId,
          webhookUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is the first telegram integration
    const { data: existingIntegrations } = await supabase
      .from('messenger_integrations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'telegram');

    const isPrimary = !existingIntegrations || existingIntegrations.length === 0;

    // Create new integration
    const { data: newIntegration, error: createError } = await supabase
      .from('messenger_integrations')
      .insert({
        organization_id: organizationId,
        messenger_type: 'telegram',
        provider: 'telegram_crm',
        name: integrationName,
        is_primary: isPrimary,
        is_enabled: true,
        webhook_key: webhookKey,
        settings,
      })
      .select('id')
      .single();

    if (createError) {
      console.error('[telegram-crm-connect] Create error:', createError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create integration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Integration created',
        integrationId: newIntegration.id,
        webhookUrl,
        isPrimary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[telegram-crm-connect] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
