import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    const n8nProxyToken = Deno.env.get('N8N_PROXY_TOKEN');
    return new Response(
      JSON.stringify({ ok: true, health: 'webhook-proxy', env: { N8N_WEBHOOK_URL: !!n8nWebhookUrl, N8N_PROXY_TOKEN: !!n8nProxyToken }, time: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    const n8nProxyToken = Deno.env.get('N8N_PROXY_TOKEN');

    console.log('Environment check:', {
      n8nWebhookUrl: n8nWebhookUrl ? 'SET' : 'MISSING',
      n8nProxyToken: n8nProxyToken ? 'SET' : 'MISSING'
    });

    if (!n8nWebhookUrl || !n8nProxyToken) {
      console.error('Missing environment variables:', {
        n8nWebhookUrl: !!n8nWebhookUrl,
        n8nProxyToken: !!n8nProxyToken,
        allEnvVars: Object.keys(Deno.env.toObject())
      });
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Server configuration error',
          details: 'Missing N8N_WEBHOOK_URL or N8N_PROXY_TOKEN environment variables'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const payload = await req.json().catch(() => ({}));
    
    // Get client info from headers
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const userAgent = req.headers.get('user-agent') || '';
    const origin = req.headers.get('origin') || '';

    // Construct enriched payload
    const enrichedPayload = {
      ...payload,
      meta: {
        triggered_from: origin,
        ip: forwardedFor.split(',')[0]?.trim() || null,
        ua: userAgent,
        ts: new Date().toISOString(),
        source: 'supabase-proxy'
      },
    };

    console.log('Proxying webhook request:', {
      url: n8nWebhookUrl,
      payload: enrichedPayload,
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Token': '[REDACTED]'
      }
    });

    // Forward request to n8n
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Token': n8nProxyToken,
      },
      body: JSON.stringify(enrichedPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n webhook error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return new Response(
        JSON.stringify({ 
          ok: false, 
          status: response.status, 
          error: errorText || 'Webhook request failed' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const responseText = await response.text();
    console.log('n8n webhook success:', {
      status: response.status,
      response: responseText
    });

    return new Response(
      JSON.stringify({ ok: true, data: responseText }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Webhook proxy error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: (error as any)?.message || 'Proxy error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});