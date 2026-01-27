import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
  type PushNotificationRequest,
} from "../_shared/types.ts";

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
  const endpointHost = new URL(subscription.endpoint).hostname;
  const logPrefix = `[WebPush:${endpointHost.substring(0, 20)}]`;
  
  try {
    console.log(`${logPrefix} === Starting WebPush ===`);
    
    // === Step 1: Validate inputs ===
    console.log(`${logPrefix} Step 1: Validating inputs...`);
    console.log(`${logPrefix}   - Endpoint: ${subscription.endpoint.substring(0, 80)}...`);
    console.log(`${logPrefix}   - p256dh length: ${subscription.p256dh?.length || 0} chars`);
    console.log(`${logPrefix}   - auth length: ${subscription.auth?.length || 0} chars`);
    console.log(`${logPrefix}   - VAPID public key length: ${vapidPublicKey?.length || 0} chars`);
    console.log(`${logPrefix}   - VAPID private key length: ${vapidPrivateKey?.length || 0} chars`);
    
    if (!subscription.p256dh || !subscription.auth) {
      console.error(`${logPrefix} ❌ Missing subscription keys`);
      return { success: false, error: 'Missing subscription keys (p256dh or auth)' };
    }
    
    // === Step 2: Prepare payload ===
    console.log(`${logPrefix} Step 2: Preparing payload...`);
    const payloadString = JSON.stringify(payload);
    console.log(`${logPrefix}   - Payload size: ${payloadString.length} bytes`);
    console.log(`${logPrefix}   - Payload preview: ${payloadString.substring(0, 100)}...`);

    // === Step 3: Encrypt payload ===
    console.log(`${logPrefix} Step 3: Encrypting payload (RFC 8291)...`);
    const encryptStartTime = Date.now();
    
    let encrypted: Uint8Array;
    let salt: Uint8Array;
    let serverPublicKey: Uint8Array;
    
    try {
      const result = await encryptPayload(
        payloadString,
        subscription.p256dh,
        subscription.auth
      );
      encrypted = result.encrypted;
      salt = result.salt;
      serverPublicKey = result.serverPublicKey;
      
      console.log(`${logPrefix}   ✅ Encryption successful in ${Date.now() - encryptStartTime}ms`);
      console.log(`${logPrefix}   - Encrypted size: ${encrypted.length} bytes`);
      console.log(`${logPrefix}   - Salt size: ${salt.length} bytes`);
      console.log(`${logPrefix}   - Server public key size: ${serverPublicKey.length} bytes`);
    } catch (encryptError) {
      console.error(`${logPrefix} ❌ Encryption failed:`, encryptError);
      return { success: false, error: `Encryption failed: ${encryptError instanceof Error ? encryptError.message : 'Unknown'}` };
    }

    // === Step 4: Build encrypted body ===
    console.log(`${logPrefix} Step 4: Building aes128gcm body...`);
    const body = buildEncryptedBody(encrypted, salt, serverPublicKey);
    console.log(`${logPrefix}   - Total body size: ${body.length} bytes`);

    // === Step 5: Generate VAPID JWT ===
    console.log(`${logPrefix} Step 5: Generating VAPID JWT...`);
    const vapidStartTime = Date.now();
    
    let jwt: string;
    try {
      jwt = await generateVapidJwt(
        subscription.endpoint,
        vapidPrivateKey,
        vapidPublicKey,
        'mailto:admin@okey-english.ru'
      );
      
      console.log(`${logPrefix}   ✅ VAPID JWT generated in ${Date.now() - vapidStartTime}ms`);
      console.log(`${logPrefix}   - JWT length: ${jwt.length} chars`);
      console.log(`${logPrefix}   - JWT header: ${jwt.split('.')[0].substring(0, 20)}...`);
    } catch (vapidError) {
      console.error(`${logPrefix} ❌ VAPID JWT generation failed:`, vapidError);
      return { success: false, error: `VAPID JWT failed: ${vapidError instanceof Error ? vapidError.message : 'Unknown'}` };
    }

    const vapidAuth = `vapid t=${jwt}, k=${vapidPublicKey}`;
    console.log(`${logPrefix}   - Authorization header length: ${vapidAuth.length} chars`);

    // === Step 6: Send HTTP request ===
    console.log(`${logPrefix} Step 6: Sending HTTP POST to push service...`);
    const fetchStartTime = Date.now();
    
    const headers = {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': body.length.toString(),
      'TTL': '86400',
      'Urgency': 'high',
      'Authorization': vapidAuth,
    };
    
    console.log(`${logPrefix}   - Headers: Content-Type=${headers['Content-Type']}, Content-Encoding=${headers['Content-Encoding']}, TTL=${headers['TTL']}, Urgency=${headers['Urgency']}`);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers,
      body: body,
    });

    const fetchDuration = Date.now() - fetchStartTime;
    
    // === Step 7: Process response ===
    console.log(`${logPrefix} Step 7: Processing response...`);
    console.log(`${logPrefix}   - Status: ${response.status} ${response.statusText}`);
    console.log(`${logPrefix}   - Fetch duration: ${fetchDuration}ms`);
    
    // Log response headers (useful for debugging)
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log(`${logPrefix}   - Response headers: ${JSON.stringify(responseHeaders)}`);

    if (response.ok || response.status === 201) {
      console.log(`${logPrefix} ✅ Push sent successfully!`);
      return { success: true, statusCode: response.status };
    }

    if (response.status === 404 || response.status === 410) {
      console.warn(`${logPrefix} ⚠️ Subscription expired (${response.status})`);
      return { success: false, error: 'subscription_expired', statusCode: response.status };
    }

    // Read error body
    const errorText = await response.text();
    console.error(`${logPrefix} ❌ Push failed with status ${response.status}`);
    console.error(`${logPrefix}   - Error body: ${errorText.substring(0, 500)}`);
    
    // Parse common error scenarios
    if (response.status === 401 || response.status === 403) {
      console.error(`${logPrefix}   - Likely cause: VAPID key mismatch or invalid JWT signature`);
    } else if (response.status === 400) {
      console.error(`${logPrefix}   - Likely cause: Malformed request or invalid encryption`);
    } else if (response.status === 413) {
      console.error(`${logPrefix}   - Likely cause: Payload too large`);
    }
    
    return { success: false, error: errorText, statusCode: response.status };
    
  } catch (error) {
    console.error(`${logPrefix} ❌ Unexpected error:`, error);
    console.error(`${logPrefix}   - Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`${logPrefix}   - Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`${logPrefix}   - Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  
  console.log(`\n========================================`);
  console.log(`[${requestId}] 🔔 SEND PUSH NOTIFICATION`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`========================================`);

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // === STEP 1: Environment validation ===
    console.log(`[${requestId}] Step 1: Checking environment...`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    console.log(`[${requestId}] ENV Check:`);
    console.log(`[${requestId}]   - SUPABASE_URL: ${supabaseUrl ? '✅ set' : '❌ MISSING'}`);
    console.log(`[${requestId}]   - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ set (' + supabaseServiceKey.length + ' chars)' : '❌ MISSING'}`);
    console.log(`[${requestId}]   - VAPID_PUBLIC_KEY: ${vapidPublicKey ? '✅ set (' + vapidPublicKey.length + ' chars)' : '❌ MISSING'}`);
    console.log(`[${requestId}]   - VAPID_PRIVATE_KEY: ${vapidPrivateKey ? '✅ set (' + vapidPrivateKey.length + ' chars)' : '❌ MISSING'}`);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] ❌ FATAL: Missing Supabase configuration`);
      throw new Error('Missing Supabase configuration');
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error(`[${requestId}] ❌ FATAL: Missing VAPID keys`);
      throw new Error('Missing VAPID keys - please configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets');
    }

    // VAPID diagnostic logging
    console.log(`[${requestId}] VAPID Keys:`);
    console.log(`[${requestId}]   - Public key prefix: ${vapidPublicKey.substring(0, 20)}...`);
    console.log(`[${requestId}]   - Private key prefix: ${vapidPrivateKey.substring(0, 8)}...`);

    // === STEP 2: Parse request body ===
    console.log(`[${requestId}] Step 2: Parsing request body...`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: SendPushRequest = await req.json();
    
    console.log(`[${requestId}] Request body:`);
    console.log(`[${requestId}]   - userId: ${body.userId || 'not set'}`);
    console.log(`[${requestId}]   - userIds: ${body.userIds ? JSON.stringify(body.userIds) : 'not set'}`);
    console.log(`[${requestId}]   - payload.title: ${body.payload?.title || 'not set'}`);
    console.log(`[${requestId}]   - payload.body: ${body.payload?.body?.substring(0, 50) || 'not set'}...`);
    console.log(`[${requestId}]   - payload.tag: ${body.payload?.tag || 'not set'}`);
    console.log(`[${requestId}]   - payload.url: ${body.payload?.url || 'not set'}`);

    const { userId, userIds, payload } = body;

    // Server-side unique tag enforcement
    if (payload.tag === 'test-push') {
      const oldTag = payload.tag;
      payload.tag = `test-push-${Date.now()}`;
      console.log(`[${requestId}] 🏷️ Tag fixed: "${oldTag}" → "${payload.tag}"`);
    }

    if (!payload || !payload.title) {
      console.error(`[${requestId}] ❌ Missing required payload with title`);
      return new Response(
        JSON.stringify({ error: 'Missing required payload with title' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // === STEP 3: Resolve target users ===
    console.log(`[${requestId}] Step 3: Resolving target users...`);
    
    const targetUserIds = userIds || (userId ? [userId] : []);
    const uniqueUserIds = [...new Set(targetUserIds)];

    console.log(`[${requestId}] Target users: ${uniqueUserIds.length}`);
    uniqueUserIds.forEach((id, i) => {
      console.log(`[${requestId}]   [${i + 1}] ${id}`);
    });

    if (uniqueUserIds.length === 0) {
      console.error(`[${requestId}] ❌ No target users specified`);
      return new Response(
        JSON.stringify({ error: 'No target users specified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // === STEP 4: Fetch subscriptions ===
    console.log(`[${requestId}] Step 4: Fetching subscriptions from database...`);
    
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', uniqueUserIds);

    if (fetchError) {
      console.error(`[${requestId}] ❌ Database error fetching subscriptions:`, fetchError);
      throw fetchError;
    }

    console.log(`[${requestId}] Database query result:`);
    console.log(`[${requestId}]   - Subscriptions found: ${subscriptions?.length || 0}`);

    if (!subscriptions || subscriptions.length === 0) {
      console.warn(`[${requestId}] ⚠️ No active subscriptions found for users: ${uniqueUserIds.join(', ')}`);
      console.log(`[${requestId}] Duration: ${Date.now() - startTime}ms`);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // === STEP 5: Filter subscriptions for test pushes ===
    console.log(`[${requestId}] Step 5: Filtering subscriptions...`);
    
    // For test pushes, sending to multiple stale subscriptions on the same device can result
    // in notifications being immediately replaced (same tag) or delivered to an old/broken SW.
    // To make the "Test push" button reliable, send only to the latest subscription per user.
    const isTestPush = typeof payload.tag === 'string' && payload.tag.startsWith('test-push');
    const subscriptionsToNotify = isTestPush
      ? (() => {
          const latestByUser = new Map<string, any>();
          for (const sub of subscriptions) {
            const userKey = String(sub.user_id);
            const prev = latestByUser.get(userKey);
            const subTime = sub.updated_at ? Date.parse(String(sub.updated_at)) : 0;
            const prevTime = prev?.updated_at ? Date.parse(String(prev.updated_at)) : 0;
            if (!prev || subTime >= prevTime) latestByUser.set(userKey, sub);
          }
          return Array.from(latestByUser.values());
        })()
      : subscriptions;

    console.log(`[${requestId}] Subscriptions to notify: ${subscriptionsToNotify.length} (isTestPush: ${isTestPush})`);
    
    // Log detailed subscription info
    subscriptionsToNotify.forEach((sub, idx) => {
      const keys = sub.keys as { p256dh: string; auth: string } | null;
      const endpointHost = new URL(sub.endpoint).hostname;
      console.log(`[${requestId}] 📱 Subscription #${idx + 1}:`);
      console.log(`[${requestId}]     - ID: ${sub.id}`);
      console.log(`[${requestId}]     - User: ${sub.user_id}`);
      console.log(`[${requestId}]     - Endpoint host: ${endpointHost}`);
      console.log(`[${requestId}]     - Endpoint: ${sub.endpoint.substring(0, 80)}...`);
      console.log(`[${requestId}]     - Keys present: p256dh=${!!keys?.p256dh}, auth=${!!keys?.auth}`);
      console.log(`[${requestId}]     - User agent: ${sub.user_agent?.substring(0, 60) || 'N/A'}...`);
      console.log(`[${requestId}]     - Updated at: ${sub.updated_at}`);
    });

    // === STEP 6: Send push notifications ===
    console.log(`[${requestId}] Step 6: Sending push notifications...`);

    const results = await Promise.all(
      subscriptionsToNotify.map(async (sub, idx) => {
        const subStartTime = Date.now();
        console.log(`[${requestId}] 📤 Sending to subscription #${idx + 1}...`);
        
        // Keys stored as JSONB object { p256dh, auth }
        const keys = sub.keys as { p256dh: string; auth: string };
        
        if (!keys?.p256dh || !keys?.auth) {
          console.error(`[${requestId}] ❌ Subscription #${idx + 1} has invalid keys`);
          return { subscriptionId: sub.id, userId: sub.user_id, success: false, error: 'Invalid keys' };
        }
        
        const result = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );

        const subDuration = Date.now() - subStartTime;
        
        if (result.success) {
          console.log(`[${requestId}] ✅ Subscription #${idx + 1}: SUCCESS (${result.statusCode}) in ${subDuration}ms`);
        } else {
          console.error(`[${requestId}] ❌ Subscription #${idx + 1}: FAILED - ${result.error} (${result.statusCode}) in ${subDuration}ms`);
          
          if (result.error === 'subscription_expired') {
            console.log(`[${requestId}] 🗑️ Deleting expired subscription: ${sub.id}`);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
        }

        return { subscriptionId: sub.id, userId: sub.user_id, ...result };
      })
    );

    // === STEP 7: Compile results ===
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);
    const totalDuration = Date.now() - startTime;

    console.log(`\n[${requestId}] ========== RESULTS ==========`);
    console.log(`[${requestId}] ✅ Successful: ${successful}`);
    console.log(`[${requestId}] ❌ Failed: ${failed.length}`);
    console.log(`[${requestId}] ⏱️ Total duration: ${totalDuration}ms`);
    
    if (failed.length > 0) {
      console.log(`[${requestId}] Failed details:`);
      failed.forEach((f, i) => {
        console.log(`[${requestId}]   [${i + 1}] User: ${f.userId}, Error: ${f.error}, Status: ${f.statusCode}`);
      });
    }
    
    console.log(`[${requestId}] ==============================\n`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed: failed.length,
        details: results,
        duration: totalDuration,
        source: 'lovable-cloud',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ FATAL ERROR after ${totalDuration}ms:`, error);
    console.error(`[${requestId}] Stack:`, error instanceof Error ? error.stack : 'N/A');
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        duration: totalDuration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
