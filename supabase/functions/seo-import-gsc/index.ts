import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create JWT for Google OAuth
async function createJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const payloadBase64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const signatureInput = `${headerBase64}.${payloadBase64}`;

  // Parse private key (handle both real newlines and \n-escaped)
  let privateKeyPem: string = serviceAccount.private_key;
  if (privateKeyPem.includes('\\n')) {
    privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');
  }
  // Strip header/footer and normalize
  const pemBody = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\r?\n/g, '')
    .replace(/\s/g, '');

  // Convert to binary
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  // Sign
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signatureInput)
  );

  // Convert signature to base64
  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createJWT(serviceAccount);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token error:", errorText);
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting GSC import...");
    
    const { siteUrl, startDate, endDate, organizationId } = await req.json();

    console.log("Parameters:", { siteUrl, startDate, endDate, organizationId });

    if (!siteUrl || !startDate || !endDate || !organizationId) {
      throw new Error('Missing required parameters');
    }

    // Parse service account JSON
    const serviceAccountRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountRaw) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
    }

    const serviceAccount = JSON.parse(serviceAccountRaw);
    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Invalid service account JSON');
    }

    console.log("Service account email:", serviceAccount.client_email);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get access token
    console.log("Getting access token...");
    const accessToken = await getAccessToken(serviceAccount);
    console.log("Access token obtained");

    // Call GSC API with fallbacks + diagnostics
    console.log("Calling GSC API...");

    // 1) List properties available to the service account (helps diagnose permissions)
    let availableSites: string[] = [];
    try {
      const sitesResp = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      if (sitesResp.ok) {
        const sitesData = await sitesResp.json();
        availableSites = (sitesData.siteEntry || []).map((s: any) => s.siteUrl);
        console.log('Available GSC properties for SA:', availableSites);
      } else {
        console.warn('Failed to list GSC sites:', await sitesResp.text());
      }
    } catch (e) {
      console.warn('Sites list error:', e);
    }

    // 2) Try candidate property URIs
    const candidates: string[] = (() => {
      const s = siteUrl.trim();
      if (s.startsWith('sc-domain:')) {
        const domain = s.replace('sc-domain:', '').replace(/\/$/, '');
        return [
          s,
          `https://${domain}/`,
          `https://www.${domain}/`,
          `http://${domain}/`,
        ];
      }
      try {
        const u = new URL(s);
        const domain = u.hostname;
        return [
          s.endsWith('/') ? s : `${s}/`,
          `https://${domain}/`,
          `https://www.${domain}/`,
          `http://${domain}/`,
          `sc-domain:${domain}`,
        ];
      } catch {
        return [s];
      }
    })();

    let rows: any[] = [];
    let usedProperty = '';
    let lastError: { status: number; body: string } | null = null;

    for (const candidate of candidates) {
      const gscUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(candidate)}/searchAnalytics/query`;
      console.log(`Trying property: ${candidate}`);

      const resp = await fetch(gscUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query', 'page', 'country', 'device', 'date'],
          searchType: 'web',
          rowLimit: 25000,
          dataState: 'final',
        }),
      });

      if (!resp.ok) {
        const t = await resp.text();
        lastError = { status: resp.status, body: t };
        console.warn(`GSC API ${candidate} error:`, t);
        continue;
      }

      const data = await resp.json();
      rows = data.rows || [];
      // Mark this property as accessible even if rows are 0
      usedProperty = candidate;
      break;
    }

    console.log(`Fetched ${rows.length} rows from GSC${usedProperty ? ' using ' + usedProperty : ''}`);

    if (rows.length === 0) {
      // If we never had a successful call, bubble up the last API error clearly
      if (!usedProperty && lastError) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'No accessible GSC property. Grant the service account access to your property.',
            lastError,
            availableSites,
            tried: candidates
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          imported: 0, 
          message: "No data available for the specified period or property", 
          usedProperty,
          availableSites,
          tried: candidates 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let imported = 0;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      const records = batch.map((row: any) => ({
        organization_id: organizationId,
        page_url: row.keys[1],
        query: row.keys[0],
        date: row.keys[4],
        country: row.keys[2] || '',
        device: row.keys[3] || '',
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        ctr: parseFloat((row.ctr * 100).toFixed(2)),
        position: parseFloat(row.position.toFixed(2)),
      }));

      const { error } = await supabase
        .from('search_console_queries')
        .upsert(records, {
          onConflict: 'organization_id,page_url,query,date,country,device',
        });

      if (error) {
        console.error('Batch insert error:', error);
        throw error;
      }

      imported += records.length;
      console.log(`Imported batch ${i / batchSize + 1}, total: ${imported}`);
    }

    // Log the job
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'import_gsc',
      status: 'completed',
      result: { 
        imported, 
        site_url: siteUrl, 
        date_range: `${startDate} to ${endDate}` 
      },
    });

    console.log(`Import completed: ${imported} records`);

    return new Response(
      JSON.stringify({ success: true, imported }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in seo-import-gsc:', error);
    
    // Log error to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('seo_job_logs').insert({
        organization_id: null,
        job_type: 'import_gsc',
        status: 'failed',
        result: { error: error.message },
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString() 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
