import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SendPushRequest {
  client_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Web Push library implementation for Deno
async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    // Import web-push compatible functions
    const encoder = new TextEncoder();
    
    // Create JWT for VAPID
    const header = { typ: 'JWT', alg: 'ES256' };
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      aud: new URL(subscription.endpoint).origin,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: vapidSubject,
    };

    // Base64URL encode
    const base64url = (data: Uint8Array | string): string => {
      const str = typeof data === 'string' ? data : String.fromCharCode(...data);
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const headerB64 = base64url(JSON.stringify(header));
    const claimsB64 = base64url(JSON.stringify(claims));
    const unsignedToken = `${headerB64}.${claimsB64}`;

    // Import VAPID private key and sign
    const privateKeyBuffer = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      encoder.encode(unsignedToken)
    );

    const signatureB64 = base64url(new Uint8Array(signature));
    const jwt = `${unsignedToken}.${signatureB64}`;

    // Send push notification
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'TTL': '86400',
      },
      body: encoder.encode(payload),
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true, statusCode: response.status };
    } else if (response.status === 410) {
      // Subscription expired
      return { success: false, statusCode: 410, error: 'Subscription expired' };
    } else {
      const errorText = await response.text();
      return { success: false, statusCode: response.status, error: errorText };
    }
  } catch (error) {
    console.error('Web push error:', error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendPushRequest = await req.json();
    const { client_id, title, body: messageBody, url, tag } = body;

    if (!client_id || !title || !messageBody) {
      return new Response(
        JSON.stringify({ error: 'client_id, title, and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client's push subscription
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, portal_settings')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = client.portal_settings as Record<string, any> | null;
    const subscription = settings?.push_subscription as PushSubscription | undefined;

    if (!subscription?.endpoint) {
      return new Response(
        JSON.stringify({ error: 'Client has no push subscription', success: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body: messageBody,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: tag || 'portal-notification',
      data: {
        url: url || '/parent-portal',
      },
    });

    // Send push notification
    const result = await sendWebPush(
      subscription,
      payload,
      vapidPublicKey,
      vapidPrivateKey,
      'mailto:support@academyos.ru'
    );

    // If subscription expired, remove it
    if (result.statusCode === 410) {
      const updatedSettings = { ...settings };
      delete updatedSettings.push_subscription;
      updatedSettings.push_notifications = false;
      
      await supabase
        .from('clients')
        .update({ portal_settings: updatedSettings })
        .eq('id', client_id);

      console.log(`[portal-push-send] Removed expired subscription for client ${client_id}`);
    }

    console.log(`[portal-push-send] Push to ${client_id}: ${result.success ? 'success' : result.error}`);

    return new Response(
      JSON.stringify({
        success: result.success,
        statusCode: result.statusCode,
        error: result.error,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in portal-push-send:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
