import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WAPPI_BASE_URL = 'https://wappi.pro'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface DownloadRequest {
  messageId: string;
  organizationId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messageId, organizationId } = await req.json() as DownloadRequest

    if (!messageId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'messageId is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user's organization if not provided
    let orgId = organizationId
    
    if (!orgId) {
      const authHeader = req.headers.get('authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        })
        const { data: { user } } = await supabaseAuth.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()
          orgId = profile?.organization_id
        }
      }
    }

    if (!orgId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Could not determine organization'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get Wappi credentials for the organization
    const { data: settings, error: settingsError } = await supabase
      .from('messenger_settings')
      .select('settings')
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wappi')
      .eq('organization_id', orgId)
      .eq('is_enabled', true)
      .single()

    if (settingsError || !settings) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wappi settings not found'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const wappiSettings = settings.settings as any
    const profileId = wappiSettings?.wappiProfileId
    const apiToken = wappiSettings?.wappiApiToken

    if (!profileId || !apiToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing Wappi credentials'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call Wappi API to download media
    const url = `${WAPPI_BASE_URL}/api/sync/message/media/download?profile_id=${profileId}&message_id=${messageId}`

    console.log('Downloading media via Wappi:', messageId)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken
      }
    })

    // Check if response is JSON (error) or binary (file)
    const contentType = response.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      const result = await response.json()
      console.log('Wappi download response:', result)

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: result.description || result.message || 'Failed to download file'
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // If API returns a URL
      if (result.url || result.downloadUrl) {
        return new Response(JSON.stringify({
          success: true,
          downloadUrl: result.url || result.downloadUrl
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // If API returns base64
      if (result.body || result.data) {
        return new Response(JSON.stringify({
          success: true,
          base64: result.body || result.data,
          mimeType: result.mimetype || result.mimeType
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Unknown response format from Wappi'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Binary response - return as is or convert to base64
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    return new Response(JSON.stringify({
      success: true,
      base64,
      mimeType: contentType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error downloading file via Wappi:', error)

    return new Response(JSON.stringify({
      success: false,
      error: (error as any)?.message ?? 'Server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
