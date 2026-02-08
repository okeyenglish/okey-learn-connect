import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RegisterWebhookBody {
  profileId: string;
  apiToken: string;
  webhookUrl?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function safeReadJson(req: Request): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  try {
    const data = await req.json();
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'invalid_json' };
  }
}

async function safeReadJsonFromResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await res.text();
    return { raw: text };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ success: false, error: 'authorization_required' }, 401);

  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return jsonResponse({ success: false, error: 'invalid_token' }, 401);

  const parsed = await safeReadJson(req);
  if (!parsed.ok) return jsonResponse({ success: false, error: parsed.error }, 400);

  const body = parsed.data as Partial<RegisterWebhookBody>;
  const profileId = (body.profileId || '').toString().trim();
  const apiToken = (body.apiToken || '').toString().trim();

  if (!profileId) return jsonResponse({ success: false, error: 'missing_profileId' }, 400);
  if (!apiToken) return jsonResponse({ success: false, error: 'missing_apiToken' }, 400);

  const webhookUrl =
    (body.webhookUrl && body.webhookUrl.toString().trim()) ||
    `https://api.academyos.ru/functions/v1/telegram-webhook?profile_id=${encodeURIComponent(profileId)}`;

  try {
    const wappiUrl = `https://wappi.pro/tapi/webhook/url/set?profile_id=${encodeURIComponent(profileId)}`;

    const res = await fetch(wappiUrl, {
      method: 'POST',
      headers: {
        Authorization: apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ webhook_url: webhookUrl }),
    });

    const wappiData = await safeReadJsonFromResponse(res);

    if (!res.ok) {
      return jsonResponse(
        {
          success: false,
          error: 'wappi_request_failed',
          status: res.status,
          wappi: wappiData,
        },
        502
      );
    }

    return jsonResponse({
      success: true,
      webhookUrl,
      wappi: wappiData,
    });
  } catch (e) {
    return jsonResponse(
      {
        success: false,
        error: 'network_error',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      502
    );
  }
});
