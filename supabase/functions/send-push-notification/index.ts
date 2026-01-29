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

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: { p256dh?: string; auth?: string; device_token?: string } | null;
  device_token?: string;
  subscription_type?: 'web' | 'fcm' | 'apns';
  user_agent?: string;
  updated_at?: string;
}

// ============= FCM (Firebase Cloud Messaging) for Native Push =============

interface FCMMessage {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: 'high' | 'normal';
      notification: {
        icon?: string;
        color?: string;
        sound?: string;
        tag?: string;
        click_action?: string;
      };
    };
    apns?: {
      headers: {
        'apns-priority': string;
      };
      payload: {
        aps: {
          alert: {
            title: string;
            body: string;
          };
          sound?: string;
          badge?: number;
          'thread-id'?: string;
          'mutable-content'?: number;
        };
      };
    };
  };
}

/**
 * Get OAuth2 access token for Firebase using service account
 */
async function getFirebaseAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri?: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour

  // JWT header
  const header = { alg: 'RS256', typ: 'JWT' };
  
  // JWT claims
  const claims = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Encode header and claims
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const claimsB64 = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const unsignedToken = `${headerB64}.${claimsB64}`;

  // Import private key and sign
  const privateKeyPem = serviceAccount.private_key;
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKeyPem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get Firebase access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Send push notification via Firebase Cloud Messaging (FCM) HTTP v1 API
 */
async function sendFCMPush(
  deviceToken: string,
  payload: PushPayload,
  subscriptionType: 'fcm' | 'apns',
  firebaseProjectId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  const logPrefix = `[FCM:${subscriptionType}]`;
  
  try {
    console.log(`${logPrefix} Sending to token: ${deviceToken.substring(0, 30)}...`);
    
    // Convert payload data to string values (FCM requires string values in data)
    const dataPayload: Record<string, string> = {};
    if (payload.url) dataPayload.url = payload.url;
    if (payload.tag) dataPayload.tag = payload.tag;
    if (payload.data) {
      Object.entries(payload.data).forEach(([key, value]) => {
        dataPayload[key] = typeof value === 'string' ? value : JSON.stringify(value);
      });
    }

    const fcmMessage: FCMMessage = {
      message: {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body || '',
        },
        data: Object.keys(dataPayload).length > 0 ? dataPayload : undefined,
        android: {
          priority: 'high',
          notification: {
            icon: payload.icon || 'ic_notification',
            color: '#4F46E5',
            sound: 'default',
            tag: payload.tag,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body || '',
              },
              sound: 'default',
              badge: 1,
              'thread-id': payload.tag,
              'mutable-content': 1,
            },
          },
        },
      },
    };

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`;
    
    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmMessage),
    });

    console.log(`${logPrefix} Response status: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      console.log(`${logPrefix} ✅ Successfully sent, message name: ${result.name}`);
      return { success: true, statusCode: response.status };
    }

    const errorData = await response.json();
    console.error(`${logPrefix} ❌ FCM error:`, JSON.stringify(errorData));

    // Handle specific FCM error codes
    const fcmError = errorData.error;
    if (fcmError) {
      const errorCode = fcmError.details?.[0]?.errorCode || fcmError.code;
      
      // Token expired or invalid
      if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
        console.warn(`${logPrefix} Token is invalid/expired`);
        return { success: false, error: 'subscription_expired', statusCode: response.status };
      }
    }

    return { success: false, error: fcmError?.message || 'FCM send failed', statusCode: response.status };
    
  } catch (error) {
    console.error(`${logPrefix} Exception:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown FCM error' };
  }
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
    const firebaseServiceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

    console.log(`[${requestId}] ENV Check:`);
    console.log(`[${requestId}]   - SUPABASE_URL: ${supabaseUrl ? '✅ set' : '❌ MISSING'}`);
    console.log(`[${requestId}]   - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ set (' + supabaseServiceKey.length + ' chars)' : '❌ MISSING'}`);
    console.log(`[${requestId}]   - VAPID_PUBLIC_KEY: ${vapidPublicKey ? '✅ set (' + vapidPublicKey.length + ' chars)' : '❌ MISSING'}`);
    console.log(`[${requestId}]   - VAPID_PRIVATE_KEY: ${vapidPrivateKey ? '✅ set (' + vapidPrivateKey.length + ' chars)' : '❌ MISSING'}`);
    console.log(`[${requestId}]   - FIREBASE_SERVICE_ACCOUNT: ${firebaseServiceAccountJson ? '✅ set' : '⚠️ not set (FCM disabled)'}`);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] ❌ FATAL: Missing Supabase configuration`);
      throw new Error('Missing Supabase configuration');
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error(`[${requestId}] ❌ FATAL: Missing VAPID keys`);
      throw new Error('Missing VAPID keys - please configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets');
    }

    // Parse Firebase service account if available
    let firebaseServiceAccount: { client_email: string; private_key: string; project_id: string } | null = null;
    let firebaseAccessToken: string | null = null;
    
    if (firebaseServiceAccountJson) {
      try {
        firebaseServiceAccount = JSON.parse(firebaseServiceAccountJson);
        console.log(`[${requestId}]   - Firebase project: ${firebaseServiceAccount?.project_id || 'unknown'}`);
        
        // Get Firebase access token
        console.log(`[${requestId}] Getting Firebase access token...`);
        firebaseAccessToken = await getFirebaseAccessToken(firebaseServiceAccount!);
        console.log(`[${requestId}]   ✅ Firebase access token obtained`);
      } catch (parseError) {
        console.error(`[${requestId}] ⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT:`, parseError);
      }
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

    // === STEP 5: Categorize subscriptions ===
    console.log(`[${requestId}] Step 5: Categorizing subscriptions...`);
    
    const webSubscriptions: PushSubscription[] = [];
    const nativeSubscriptions: PushSubscription[] = [];
    
    (subscriptions as PushSubscription[]).forEach((sub, idx) => {
      const subType = sub.subscription_type || 'web';
      const keys = sub.keys as { p256dh?: string; auth?: string; device_token?: string } | null;
      
      console.log(`[${requestId}] 📱 Subscription #${idx + 1}:`);
      console.log(`[${requestId}]     - ID: ${sub.id}`);
      console.log(`[${requestId}]     - User: ${sub.user_id}`);
      console.log(`[${requestId}]     - Type: ${subType}`);
      
      if (subType === 'fcm' || subType === 'apns') {
        const deviceToken = sub.device_token || keys?.device_token;
        console.log(`[${requestId}]     - Device token: ${deviceToken ? deviceToken.substring(0, 30) + '...' : 'N/A'}`);
        if (deviceToken) {
          nativeSubscriptions.push(sub);
        } else {
          console.warn(`[${requestId}]     ⚠️ Native subscription without device_token, skipping`);
        }
      } else {
        const endpointHost = sub.endpoint ? new URL(sub.endpoint).hostname : 'unknown';
        console.log(`[${requestId}]     - Endpoint host: ${endpointHost}`);
        console.log(`[${requestId}]     - Keys present: p256dh=${!!keys?.p256dh}, auth=${!!keys?.auth}`);
        webSubscriptions.push(sub);
      }
      
      console.log(`[${requestId}]     - Updated at: ${sub.updated_at}`);
    });

    console.log(`[${requestId}] Subscription breakdown:`);
    console.log(`[${requestId}]   - Web Push: ${webSubscriptions.length}`);
    console.log(`[${requestId}]   - Native (FCM/APNs): ${nativeSubscriptions.length}`);

    // === STEP 6: Send push notifications ===
    console.log(`[${requestId}] Step 6: Sending push notifications...`);

    const isTestPush = typeof payload.tag === 'string' && payload.tag.startsWith('test-');
    console.log(`[${requestId}] isTestPush: ${isTestPush}, tag: ${payload.tag}`);

    const results: Array<{ subscriptionId: string; userId: string; type: string; success: boolean; error?: string; statusCode?: number }> = [];

    // === Send to Web Push subscriptions ===
    if (webSubscriptions.length > 0) {
      console.log(`[${requestId}] 🌐 Sending to ${webSubscriptions.length} Web Push subscriptions...`);
      
      if (isTestPush) {
        // Fresh + Fallback for test push
        const sortedSubs = [...webSubscriptions].sort((a, b) => {
          const aTime = a.updated_at ? Date.parse(String(a.updated_at)) : 0;
          const bTime = b.updated_at ? Date.parse(String(b.updated_at)) : 0;
          return bTime - aTime;
        });
        
        for (const sub of sortedSubs) {
          const keys = sub.keys as { p256dh: string; auth: string };
          if (!keys?.p256dh || !keys?.auth) {
            results.push({ subscriptionId: sub.id, userId: sub.user_id, type: 'web', success: false, error: 'Invalid keys' });
            continue;
          }
          
          const result = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth },
            payload,
            vapidPublicKey,
            vapidPrivateKey
          );
          
          results.push({ subscriptionId: sub.id, userId: sub.user_id, type: 'web', ...result });
          
          if (result.success) {
            console.log(`[${requestId}] ✅ Web push delivered, stopping test`);
            break;
          }
          
          if (result.error === 'subscription_expired') {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      } else {
        // Send to all in parallel
        const webResults = await Promise.all(
          webSubscriptions.map(async (sub) => {
            const keys = sub.keys as { p256dh: string; auth: string };
            if (!keys?.p256dh || !keys?.auth) {
              return { subscriptionId: sub.id, userId: sub.user_id, type: 'web', success: false, error: 'Invalid keys' };
            }
            
            const result = await sendWebPush(
              { endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth },
              payload,
              vapidPublicKey,
              vapidPrivateKey
            );
            
            if (result.error === 'subscription_expired') {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
            
            return { subscriptionId: sub.id, userId: sub.user_id, type: 'web', ...result };
          })
        );
        results.push(...webResults);
      }
    }

    // === Send to Native (FCM/APNs) subscriptions ===
    if (nativeSubscriptions.length > 0) {
      if (!firebaseServiceAccount || !firebaseAccessToken) {
        console.warn(`[${requestId}] ⚠️ Skipping ${nativeSubscriptions.length} native subscriptions - FIREBASE_SERVICE_ACCOUNT not configured`);
        nativeSubscriptions.forEach(sub => {
          results.push({ 
            subscriptionId: sub.id, 
            userId: sub.user_id, 
            type: sub.subscription_type || 'native',
            success: false, 
            error: 'FCM not configured' 
          });
        });
      } else {
        console.log(`[${requestId}] 📱 Sending to ${nativeSubscriptions.length} Native subscriptions via FCM...`);
        
        const nativeResults = await Promise.all(
          nativeSubscriptions.map(async (sub) => {
            const deviceToken = sub.device_token || (sub.keys as { device_token?: string })?.device_token;
            const subType = (sub.subscription_type || 'fcm') as 'fcm' | 'apns';
            
            if (!deviceToken) {
              return { 
                subscriptionId: sub.id, 
                userId: sub.user_id, 
                type: subType,
                success: false, 
                error: 'Missing device token' 
              };
            }
            
            const result = await sendFCMPush(
              deviceToken,
              payload,
              subType,
              firebaseServiceAccount!.project_id,
              firebaseAccessToken!
            );
            
            if (result.error === 'subscription_expired') {
              console.log(`[${requestId}] 🗑️ Deleting expired native subscription: ${sub.id}`);
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
            
            return { subscriptionId: sub.id, userId: sub.user_id, type: subType, ...result };
          })
        );
        results.push(...nativeResults);
      }
    }

    // === STEP 7: Compile results ===
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);
    const totalDuration = Date.now() - startTime;

    const webSuccess = results.filter(r => r.type === 'web' && r.success).length;
    const nativeSuccess = results.filter(r => (r.type === 'fcm' || r.type === 'apns') && r.success).length;

    console.log(`\n[${requestId}] ========== RESULTS ==========`);
    console.log(`[${requestId}] ✅ Successful: ${successful} (Web: ${webSuccess}, Native: ${nativeSuccess})`);
    console.log(`[${requestId}] ❌ Failed: ${failed.length}`);
    console.log(`[${requestId}] ⏱️ Total duration: ${totalDuration}ms`);
    
    if (failed.length > 0) {
      console.log(`[${requestId}] Failed details:`);
      failed.forEach((f, i) => {
        console.log(`[${requestId}]   [${i + 1}] User: ${f.userId}, Type: ${f.type}, Error: ${f.error}, Status: ${f.statusCode}`);
      });
    }
    
    console.log(`[${requestId}] ==============================\n`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed: failed.length,
        breakdown: {
          web: { sent: webSuccess, total: webSubscriptions.length },
          native: { sent: nativeSuccess, total: nativeSubscriptions.length },
        },
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
