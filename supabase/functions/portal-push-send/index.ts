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

// ============================================
// RFC 8291 Web Push Encryption Implementation
// ============================================

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function uint8ArrayToBase64Url(data: Uint8Array): string {
  const binary = String.fromCharCode(...data);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// HKDF implementation for Web Push
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: info,
    },
    keyMaterial,
    length * 8
  );
  
  return new Uint8Array(derivedBits);
}

// Generate info for HKDF as per RFC 8291
function createInfo(
  type: string,
  clientPublicKey: Uint8Array,
  serverPublicKey: Uint8Array
): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  
  // Format: "Content-Encoding: <type>" + 0x00 + "P-256" + 0x00 + 0x00 + 0x41 + clientKey + 0x00 + 0x41 + serverKey
  const contentEncoding = encoder.encode('Content-Encoding: ');
  const p256 = encoder.encode('P-256');
  
  return concatUint8Arrays(
    contentEncoding,
    typeBytes,
    new Uint8Array([0]),
    p256,
    new Uint8Array([0, 0, 65]), // 0x00 0x00 0x41 (65 = uncompressed point length)
    clientPublicKey,
    new Uint8Array([0, 65]), // 0x00 0x41
    serverPublicKey
  );
}

// Encrypt payload using RFC 8291 (aes128gcm)
async function encryptPayload(
  payload: string,
  subscription: PushSubscription
): Promise<{ body: Uint8Array; serverPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  
  // Decode subscription keys
  const clientPublicKey = base64UrlToUint8Array(subscription.keys.p256dh);
  const authSecret = base64UrlToUint8Array(subscription.keys.auth);
  
  // Generate ephemeral ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  // Export server public key in uncompressed format
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyRaw);
  
  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);
  
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive IKM: HKDF(auth_secret, shared_secret, "WebPush: info" || 0x00 || client_key || server_key, 32)
  const ikmInfo = concatUint8Arrays(
    encoder.encode('WebPush: info'),
    new Uint8Array([0]),
    clientPublicKey,
    serverPublicKey
  );
  const ikm = await hkdf(authSecret, sharedSecret, ikmInfo, 32);
  
  // Derive CEK (Content Encryption Key): HKDF(salt, ikm, cek_info, 16)
  const cekInfo = createInfo('aes128gcm', clientPublicKey, serverPublicKey);
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  
  // Derive nonce: HKDF(salt, ikm, nonce_info, 12)
  const nonceInfo = createInfo('nonce', clientPublicKey, serverPublicKey);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);
  
  // Pad payload with delimiter (0x02 for last record)
  const paddedPayload = concatUint8Arrays(payloadBytes, new Uint8Array([2]));
  
  // Import CEK for AES-GCM
  const cekKey = await crypto.subtle.importKey(
    'raw',
    cek,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt with AES-128-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    cekKey,
    paddedPayload
  );
  
  // Build aes128gcm body: salt(16) || rs(4) || idlen(1) || keyid(65) || ciphertext
  const rs = new Uint8Array([0, 0, 16, 0]); // Record size: 4096 (0x00001000)
  const idlen = new Uint8Array([65]); // Key ID length
  
  const body = concatUint8Arrays(
    salt,
    rs,
    idlen,
    serverPublicKey,
    new Uint8Array(ciphertext)
  );
  
  return { body, serverPublicKey };
}

// Generate VAPID JWT token
async function generateVapidJwt(
  endpoint: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Parse endpoint to get audience
  const url = new URL(endpoint);
  const audience = url.origin;
  
  // JWT header
  const header = { typ: 'JWT', alg: 'ES256' };
  
  // JWT claims
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: vapidSubject,
  };
  
  // Base64URL encode header and claims
  const headerB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(header)));
  const claimsB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(claims)));
  const unsignedToken = `${headerB64}.${claimsB64}`;
  
  // Import VAPID private key (PKCS#8 format)
  const privateKeyBuffer = base64UrlToUint8Array(vapidPrivateKey);
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  // Sign with ECDSA
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  // Convert signature from DER to raw format if needed (WebCrypto returns raw)
  const signature = new Uint8Array(signatureBuffer);
  const signatureB64 = uint8ArrayToBase64Url(signature);
  
  return `${unsignedToken}.${signatureB64}`;
}

// Send Web Push notification with proper encryption
async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    console.log('[portal-push-send] Starting encrypted push to:', subscription.endpoint.substring(0, 60) + '...');
    
    // Encrypt payload using RFC 8291
    const { body } = await encryptPayload(payload, subscription);
    console.log('[portal-push-send] Payload encrypted, body size:', body.length);
    
    // Generate VAPID JWT
    const jwt = await generateVapidJwt(subscription.endpoint, vapidPrivateKey, vapidSubject);
    console.log('[portal-push-send] VAPID JWT generated');
    
    // Send push notification
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': body.length.toString(),
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'TTL': '86400',
        'Urgency': 'normal',
      },
      body: body,
    });

    console.log('[portal-push-send] Push response status:', response.status);

    if (response.status === 201 || response.status === 200) {
      return { success: true, statusCode: response.status };
    } else if (response.status === 410 || response.status === 404) {
      // Subscription expired or not found
      return { success: false, statusCode: response.status, error: 'Subscription expired' };
    } else {
      const errorText = await response.text();
      console.error('[portal-push-send] Push failed:', response.status, errorText);
      return { success: false, statusCode: response.status, error: errorText };
    }
  } catch (error) {
    console.error('[portal-push-send] Web push error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
      console.error('[portal-push-send] VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendPushRequest = await req.json();
    const { client_id, title, body: messageBody, url, tag } = body;

    console.log('[portal-push-send] Request received for client:', client_id);

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
      console.error('[portal-push-send] Client not found:', client_id);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = client.portal_settings as Record<string, unknown> | null;
    const subscription = settings?.push_subscription as PushSubscription | undefined;

    if (!subscription?.endpoint) {
      console.log('[portal-push-send] Client has no push subscription:', client_id);
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

    // Send push notification with encryption
    const result = await sendWebPush(
      subscription,
      payload,
      vapidPublicKey,
      vapidPrivateKey,
      'mailto:support@academyos.ru'
    );

    // If subscription expired, remove it
    if (result.statusCode === 410 || result.statusCode === 404) {
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
        source: 'lovable-cloud',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[portal-push-send] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
