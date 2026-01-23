import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

console.log('wappi-whatsapp-status function booted')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WAPPI_BASE_URL = 'https://wappi.pro'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get user's organization
    let organizationId: string | undefined
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
        organizationId = profile?.organization_id
      }
    }

    // Get Wappi credentials
    let query = supabase
      .from('messenger_settings')
      .select('settings')
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wappi')
      .eq('is_enabled', true)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.limit(1).maybeSingle()

    if (error || !data) {
      return new Response(JSON.stringify({
        success: false,
        status: 'not_configured',
        error: 'Wappi not configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const settings = data.settings as any
    const profileId = settings?.wappiProfileId
    const apiToken = settings?.wappiApiToken

    if (!profileId || !apiToken) {
      return new Response(JSON.stringify({
        success: false,
        status: 'not_configured',
        error: 'Missing Wappi Profile ID or API Token'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get status from Wappi
    const url = `${WAPPI_BASE_URL}/api/sync/get/status?profile_id=${profileId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      }
    })

    const text = await response.text()
    let result: any

    try {
      result = JSON.parse(text)
    } catch {
      console.error('Wappi returned non-JSON response:', text.substring(0, 200))
      return new Response(JSON.stringify({
        success: false,
        status: 'error',
        error: 'Invalid response from Wappi API'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Wappi status response:', result)

    // Normalize status
    const status = result?.status || result?.state || 'unknown'
    const isConnected = status === 'online' || status === 'connected' || status === 'authenticated'

    return new Response(JSON.stringify({
      success: true,
      status: isConnected ? 'CONNECTED' : status.toUpperCase(),
      state: status,
      phone: result?.phone,
      wid: result?.wid,
      pushname: result?.pushname || result?.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error getting Wappi status:', error)

    return new Response(JSON.stringify({
      success: false,
      status: 'error',
      error: (error as any)?.message ?? 'Server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
