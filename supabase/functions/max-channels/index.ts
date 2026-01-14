import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple AES-GCM encryption for tokens
async function encryptToken(token: string, masterKey: string): Promise<{ encrypted: string; iv: string; tag: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Derive key from master key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey.padEnd(32, '0').slice(0, 32)),
    'AES-GCM',
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    data
  );
  
  const encryptedArray = new Uint8Array(encryptedBuffer);
  // In AES-GCM, the tag is appended to the ciphertext
  const encrypted = encryptedArray.slice(0, -16);
  const tag = encryptedArray.slice(-16);
  
  return {
    encrypted: btoa(String.fromCharCode(...encrypted)),
    iv: btoa(String.fromCharCode(...iv)),
    tag: btoa(String.fromCharCode(...tag))
  };
}

async function decryptToken(encrypted: string, iv: string, tag: string, masterKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Derive key from master key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey.padEnd(32, '0').slice(0, 32)),
    'AES-GCM',
    false,
    ['decrypt']
  );
  
  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const tagBytes = Uint8Array.from(atob(tag), c => c.charCodeAt(0));
  
  // Combine encrypted data with tag
  const combined = new Uint8Array(encryptedBytes.length + tagBytes.length);
  combined.set(encryptedBytes);
  combined.set(tagBytes, encryptedBytes.length);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    keyMaterial,
    combined
  );
  
  return decoder.decode(decryptedBuffer);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('MAX_ENCRYPTION_KEY') || 'default-key-change-me';
    const maxConnectorUrl = Deno.env.get('MAX_CONNECTOR_URL');
    const maxSecret = Deno.env.get('MAX_CONNECTOR_SECRET');

    // Verify JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User has no organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const channelId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET': {
        // List all channels for organization
        const { data: channels, error } = await supabase
          .from('max_channels')
          .select(`
            id, 
            name, 
            bot_username, 
            bot_id,
            is_enabled, 
            auto_start,
            status, 
            last_error,
            last_heartbeat_at,
            messages_today,
            created_at,
            updated_at
          `)
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching channels:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch channels' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ channels }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'POST': {
        const body = await req.json();
        const { name, token: botToken, autoStart = true } = body;

        if (!name || !botToken) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: name, token' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate token with MAX Connector
        let botInfo = { botId: null, botUsername: null };
        if (maxConnectorUrl) {
          try {
            const validateResponse = await fetch(`${maxConnectorUrl}/validate-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-max-secret': maxSecret || ''
              },
              body: JSON.stringify({ token: botToken })
            });

            if (validateResponse.ok) {
              botInfo = await validateResponse.json();
            } else {
              const errorData = await validateResponse.json();
              return new Response(
                JSON.stringify({ error: 'Invalid bot token', details: errorData }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } catch (e) {
            console.warn('Could not validate token with connector:', e);
            // Continue without validation if connector is unavailable
          }
        }

        // Encrypt token before storing
        const { encrypted, iv, tag } = await encryptToken(botToken, encryptionKey);

        // Create channel
        const { data: channel, error: createError } = await supabase
          .from('max_channels')
          .insert({
            organization_id: profile.organization_id,
            name,
            token_encrypted: encrypted,
            token_iv: iv,
            token_tag: tag,
            bot_id: botInfo.botId,
            bot_username: botInfo.botUsername,
            is_enabled: true,
            auto_start: autoStart,
            status: 'offline'
          })
          .select('id, name, bot_username, bot_id, status, is_enabled, auto_start')
          .single();

        if (createError) {
          console.error('Error creating channel:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create channel' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Start bot if auto_start is enabled
        if (autoStart && maxConnectorUrl) {
          try {
            await fetch(`${maxConnectorUrl}/channels/${channel.id}/start`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-max-secret': maxSecret || ''
              },
              body: JSON.stringify({ token: botToken })
            });
          } catch (e) {
            console.warn('Could not start bot:', e);
          }
        }

        console.log('Created MAX channel:', channel.id);

        return new Response(
          JSON.stringify({ channel }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'PATCH': {
        if (!channelId) {
          return new Response(
            JSON.stringify({ error: 'Channel ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const { name, isEnabled, autoStart } = body;

        const updates: any = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (isEnabled !== undefined) updates.is_enabled = isEnabled;
        if (autoStart !== undefined) updates.auto_start = autoStart;

        const { data: channel, error: updateError } = await supabase
          .from('max_channels')
          .update(updates)
          .eq('id', channelId)
          .eq('organization_id', profile.organization_id)
          .select('id, name, bot_username, status, is_enabled, auto_start')
          .single();

        if (updateError) {
          console.error('Error updating channel:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update channel' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ channel }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'DELETE': {
        if (!channelId) {
          return new Response(
            JSON.stringify({ error: 'Channel ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Stop bot first
        if (maxConnectorUrl) {
          try {
            await fetch(`${maxConnectorUrl}/channels/${channelId}/stop`, {
              method: 'POST',
              headers: { 'x-max-secret': maxSecret || '' }
            });
          } catch (e) {
            console.warn('Could not stop bot before deletion:', e);
          }
        }

        const { error: deleteError } = await supabase
          .from('max_channels')
          .delete()
          .eq('id', channelId)
          .eq('organization_id', profile.organization_id);

        if (deleteError) {
          console.error('Error deleting channel:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete channel' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('MAX channels error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});