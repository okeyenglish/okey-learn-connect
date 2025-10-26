import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

  // Parse private key
  const privateKeyPem = serviceAccount.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .substring(pemHeader.length, privateKeyPem.length - pemFooter.length)
    .replace(/\s/g, '');

  // Convert to binary
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

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

    // Call GSC API
    console.log("Calling GSC API...");
    const gscUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    
    const gscResponse = await fetch(gscUrl, {
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
    });

    if (!gscResponse.ok) {
      const errorText = await gscResponse.text();
      console.error("GSC API error:", errorText);
      throw new Error(`GSC API error (${gscResponse.status}): ${errorText}`);
    }

    const gscData = await gscResponse.json();
    const rows = gscData.rows || [];

    console.log(`Fetched ${rows.length} rows from GSC`);

    if (rows.length === 0) {
      console.log("No data returned from GSC");
      return new Response(
        JSON.stringify({ success: true, imported: 0, message: "No data available for the specified period" }),
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
