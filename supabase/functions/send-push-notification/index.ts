import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  url?: string;
}

interface SendPushRequest {
  userId?: string;
  userIds?: string[];
  payload: PushPayload;
}

// ============= ECDH + AES-GCM Encryption for Web Push (RFC 8291) =============

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const base64Padded = base64 + padding;
  const rawData = atob(base64Padded);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateVapidJwt(
  endpoint: string,
  privateKeyBase64: string,
  publicKeyBase64: string,
  subject: string
): Promise<string> {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = { aud, exp, sub: subject };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key for signing
  const privateKeyBytes = base64UrlToUint8Array(privateKeyBase64);
  
  // Try to import as raw key first (32 bytes), then as PKCS8
  let cryptoKey: CryptoKey;
  if (privateKeyBytes.length === 32) {
    // Raw private key - need to construct proper format
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      d: uint8ArrayToBase64Url(privateKeyBytes),
      x: '', // Will be derived
      y: '', // Will be derived
    };
    
    // We need the public key to complete JWK - extract from publicKeyBase64
    const publicKeyBytes = base64UrlToUint8Array(publicKeyBase64);
    // Uncompressed public key starts with 0x04, followed by x (32 bytes) and y (32 bytes)
    if (publicKeyBytes.length === 65 && publicKeyBytes[0] === 0x04) {
      jwk.x = uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33));
      jwk.y = uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65));
    } else {
      throw new Error('Invalid public key format');
    }
    
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  } else {
    // PKCS8 format
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  }

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert signature from DER to raw format (r || s, 64 bytes)
  const sigArray = new Uint8Array(signature);
  let finalSig: Uint8Array;
  
  if (sigArray.length === 64) {
    finalSig = sigArray;
  } else {
    // DER format - extract r and s
    finalSig = new Uint8Array(64);
    let offset = 2;
    const rLen = sigArray[offset + 1];
    const rStart = offset + 2 + (rLen > 32 ? 1 : 0);
    const rBytes = sigArray.slice(rStart, rStart + 32);
    finalSig.set(rBytes, 0);
    
    offset = rStart + 32;
    if (sigArray[offset] === 0x02) {
      const sLen = sigArray[offset + 1];
      const sStart = offset + 2 + (sLen > 32 ? 1 : 0);
      const sBytes = sigArray.slice(sStart, sStart + 32);
      finalSig.set(sBytes, 32);
    }
  }

  const signatureB64 = uint8ArrayToBase64Url(finalSig);
  return `${unsignedToken}.${signatureB64}`;
}

// HKDF implementation
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

// Web Push encryption following RFC 8291
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export server public key (uncompressed format)
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeys.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyRaw);

  // Import client public key
  const clientPublicKeyBytes = base64UrlToUint8Array(p256dh);
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeys.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Client auth secret
  const authSecret = base64UrlToUint8Array(auth);

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive IKM using auth secret
  const authInfo = encoder.encode('WebPush: info\x00');
  const keyInfo = new Uint8Array(authInfo.length + clientPublicKeyBytes.length + serverPublicKey.length);
  keyInfo.set(authInfo, 0);
  keyInfo.set(clientPublicKeyBytes, authInfo.length);
  keyInfo.set(serverPublicKey, authInfo.length + clientPublicKeyBytes.length);
  
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  // Derive content encryption key and nonce
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\x00');
  const nonceInfo = encoder.encode('Content-Encoding: nonce\x00');

  const prk = await hkdf(salt, ikm, new Uint8Array(0), 32);
  const cek = await hkdf(new Uint8Array(0), prk, cekInfo, 16);
  const nonce = await hkdf(new Uint8Array(0), prk, nonceInfo, 12);

  // Add padding delimiter
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes, 0);
  paddedPayload[payloadBytes.length] = 0x02; // Delimiter

  // Encrypt with AES-GCM
  const key = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    paddedPayload
  );
  const encrypted = new Uint8Array(encryptedBuffer);

  return { encrypted, salt, serverPublicKey };
}

// Build aes128gcm encrypted body
function buildEncryptedBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  serverPublicKey: Uint8Array
): Uint8Array {
  // Header: salt (16) + rs (4) + idlen (1) + keyid (65)
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPublicKey.length);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);

  return body;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    const payloadString = JSON.stringify(payload);

    // Encrypt the payload
    const { encrypted, salt, serverPublicKey } = await encryptPayload(
      payloadString,
      subscription.p256dh,
      subscription.auth
    );

    const body = buildEncryptedBody(encrypted, salt, serverPublicKey);

    // Generate VAPID authorization
    const jwt = await generateVapidJwt(
      subscription.endpoint,
      vapidPrivateKey,
      vapidPublicKey,
      'mailto:admin@okey-english.ru'
    );

    const vapidAuth = `vapid t=${jwt}, k=${vapidPublicKey}`;

    console.log(`Sending push to ${subscription.endpoint.substring(0, 50)}...`);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': body.length.toString(),
        'TTL': '86400',
        'Urgency': 'normal',
        'Authorization': vapidAuth,
      },
      body: body,
    });

    console.log(`Push response status: ${response.status}`);

    if (response.ok || response.status === 201) {
      return { success: true, statusCode: response.status };
    }

    if (response.status === 404 || response.status === 410) {
      return { success: false, error: 'subscription_expired', statusCode: response.status };
    }

    const errorText = await response.text();
    console.error(`Push error response: ${errorText}`);
    return { success: false, error: errorText, statusCode: response.status };
  } catch (error) {
    console.error('Push send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  console.log('=== SEND PUSH NOTIFICATION ===');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Missing VAPID keys - please configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets');
    }

    console.log(`VAPID public key length: ${vapidPublicKey.length}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: SendPushRequest = await req.json();
    console.log('Push request:', JSON.stringify(body, null, 2));

    const { userId, userIds, payload } = body;

    if (!payload || !payload.title) {
      return new Response(
        JSON.stringify({ error: 'Missing required payload with title' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const targetUserIds = userIds || (userId ? [userId] : []);
    // Remove duplicates
    const uniqueUserIds = [...new Set(targetUserIds)];

    if (uniqueUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No target users specified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Fetching subscriptions for ${uniqueUserIds.length} unique users`);

    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', uniqueUserIds)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found for users:', uniqueUserIds);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions to notify`);

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );

        if (result.error === 'subscription_expired') {
          console.log('Subscription expired, deactivating:', sub.id);
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id);
        }

        return { subscriptionId: sub.id, userId: sub.user_id, ...result };
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    console.log(`Push results: ${successful} successful, ${failed.length} failed`);
    if (failed.length > 0) {
      console.log('Failed details:', JSON.stringify(failed));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed: failed.length,
        details: results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
