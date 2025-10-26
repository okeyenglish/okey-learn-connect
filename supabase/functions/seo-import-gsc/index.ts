import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function getAccessToken(serviceAccountJson: any): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: serviceAccountJson.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  
  const jwtClaimSetEncoded = btoa(JSON.stringify(jwtClaimSet))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;
  
  // Import private key for signing
  const privateKey = serviceAccountJson.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.substring(
    pemHeader.length,
    privateKey.length - pemFooter.length
  ).replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const jwt = `${jwtHeader}.${jwtClaimSetEncoded}.${signatureBase64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }
  
  const tokenData: GoogleAuthResponse = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { siteUrl, startDate, endDate, organizationId } = await req.json();

    if (!siteUrl || !startDate || !endDate || !organizationId) {
      throw new Error('Missing required parameters');
    }

    const serviceAccountJson = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || '{}');
    if (!serviceAccountJson.private_key) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Getting access token...');
    const accessToken = await getAccessToken(serviceAccountJson);

    console.log('Fetching data from GSC...');
    const gscResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query', 'page', 'country', 'device', 'date'],
          rowLimit: 25000,
        }),
      }
    );

    if (!gscResponse.ok) {
      const error = await gscResponse.text();
      throw new Error(`GSC API error: ${error}`);
    }

    const gscData = await gscResponse.json();
    const rows = gscData.rows || [];

    console.log(`Fetched ${rows.length} rows from GSC`);

    let imported = 0;
    let updated = 0;

    // Batch insert
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const records = batch.map((row: any) => ({
        organization_id: organizationId,
        page_url: row.keys[1],
        query: row.keys[0],
        date: row.keys[4],
        country: row.keys[2],
        device: row.keys[3],
        impressions: row.impressions,
        clicks: row.clicks,
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
      } else {
        imported += records.length;
      }
    }

    // Log the job
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'import_gsc',
      status: 'completed',
      result: { imported, site_url: siteUrl, date_range: `${startDate} - ${endDate}` },
    });

    return new Response(
      JSON.stringify({ success: true, imported, updated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
