import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FUNCTION_VERSION = '2026-01-15-1841';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateRequest {
  clientId: string;
  salebotId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`🚀 import-salebot-ids-csv v${FUNCTION_VERSION} started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create a single service role client for all operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Validate authorization and admin role
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ Unauthorized: no Bearer token');
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('❌ Invalid token:', userError?.message);
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = userData.user.id;
    console.log(`👤 User ID: ${userId}`);

    // Check if user is admin - query specifically for admin role
    console.log(`🔍 Checking admin role for user: ${userId}`);
    
    const { data: adminRole, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    console.log(`📋 Admin role query result:`, JSON.stringify({ adminRole, rolesError }));

    if (rolesError) {
      console.error('❌ Error checking roles:', rolesError.message);
      return new Response(JSON.stringify({ success: false, error: 'Error checking permissions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isAdmin = !!adminRole;
    console.log(`🎯 isAdmin: ${isAdmin}`);
    if (!isAdmin) {
      console.error('❌ Forbidden: user is not admin');
      return new Response(JSON.stringify({ success: false, error: 'Только администраторы могут выполнять импорт' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Admin role verified');

    // Parse request body - expecting pre-matched updates from client
    const { updates } = await req.json() as { updates: UpdateRequest[] };

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No updates provided. Expected array of {clientId, salebotId}' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📥 Received ${updates.length} pre-matched updates`);

    // Perform batch updates
    const batchSize = 50;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      // Process batch with Promise.all for parallel updates
      const results = await Promise.all(
        batch.map(async (update) => {
          const salebotIdNum = parseInt(update.salebotId);
          if (isNaN(salebotIdNum)) {
            console.error(`❌ Invalid salebotId: ${update.salebotId}`);
            return { success: false, error: 'Invalid salebotId' };
          }
          
          const { error } = await supabase
            .from('clients')
            .update({ salebot_client_id: salebotIdNum })
            .eq('id', update.clientId);
          
          return { success: !error, error };
        })
      );

      const batchSuccess = results.filter(r => r.success).length;
      const batchErrors = results.filter(r => !r.success).length;
      
      updatedCount += batchSuccess;
      errorCount += batchErrors;

      if (batchErrors > 0) {
        console.error(`❌ Errors in batch ${i}-${i + batchSize}: ${batchErrors}`);
      }

      console.log(`📊 Processed: ${Math.min(i + batchSize, updates.length)}/${updates.length}, success: ${batchSuccess}, errors: ${batchErrors}`);
    }

    console.log(`✅ Import complete: updated ${updatedCount}, errors ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      updated: updatedCount,
      errors: errorCount,
      total: updates.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Import error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
