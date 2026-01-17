import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FUNCTION_VERSION = '2026-01-15-1925';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateRequest {
  clientId: string;
  salebotId: string;
}

interface NewClientRequest {
  salebotId: string;
  name: string;
  phone: string;
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
    console.log(`🔐 v${FUNCTION_VERSION} Auth header present: ${!!authHeader}`);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error(`❌ v${FUNCTION_VERSION} Unauthorized: no Bearer token`);
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log(`🔐 v${FUNCTION_VERSION} Token length: ${token?.length || 0}`);
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

    // Parse request body - expecting pre-matched updates and new clients from client
    const { updates, newClients, branch } = await req.json() as { 
      updates: UpdateRequest[]; 
      newClients?: NewClientRequest[];
      branch?: string 
    };

    const hasUpdates = updates && Array.isArray(updates) && updates.length > 0;
    const hasNewClients = newClients && Array.isArray(newClients) && newClients.length > 0;

    if (!hasUpdates && !hasNewClients) {
      return new Response(JSON.stringify({ 
        success: true, 
        updated: 0,
        created: 0,
        errors: 0,
        total: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📍 Branch for import: ${branch || 'not specified'}`);

    console.log(`📥 Received ${updates?.length || 0} pre-matched updates, ${newClients?.length || 0} new clients`);

    // Process updates
    let updatedTotal = 0;
    let failedValidUpdates = 0;

    if (hasUpdates) {
      // Normalize + validate updates
      const normalized = updates
        .map((u) => ({
          clientId: u.clientId,
          salebotId: Number.parseInt(String(u.salebotId), 10),
        }))
        .filter((u) => Number.isFinite(u.salebotId));

      // De-duplicate by clientId (last one wins) to avoid re-updating same row
      const dedup = new Map<string, number>();
      for (const u of normalized) dedup.set(u.clientId, u.salebotId);

      const validUpdates = Array.from(dedup.entries()).map(([clientId, salebotId]) => ({
        clientId,
        salebotId,
      }));

      console.log(
        `📊 Valid updates: ${validUpdates.length}, invalid: ${updates.length - normalized.length}, deduped: ${normalized.length - validUpdates.length}`,
      );

      const BATCH_SIZE = 250;

      const updateBatch = async (clientIds: string[], salebotIds: number[]): Promise<number> => {
        const { data: updatedCount, error: rpcError } = await supabase.rpc('batch_update_salebot_ids', {
          p_client_ids: clientIds,
          p_salebot_ids: salebotIds,
        });

        if (rpcError) {
          // 57014 = query_canceled (often statement_timeout). Split batch to find/avoid the slow/locked rows.
          if (rpcError.code === '57014' && clientIds.length > 1) {
            const mid = Math.ceil(clientIds.length / 2);
            const left = await updateBatch(clientIds.slice(0, mid), salebotIds.slice(0, mid));
            const right = await updateBatch(clientIds.slice(mid), salebotIds.slice(mid));
            return left + right;
          }

          throw rpcError;
        }

        return updatedCount || 0;
      };

      for (let i = 0; i < validUpdates.length; i += BATCH_SIZE) {
        const batch = validUpdates.slice(i, i + BATCH_SIZE);
        const clientIds = batch.map((u) => u.clientId);
        const salebotIds = batch.map((u) => u.salebotId);

        console.log(`🔁 Updating batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)`);

        try {
          const updatedCount = await updateBatch(clientIds, salebotIds);
          updatedTotal += updatedCount;
          console.log(`✅ Batch updated: ${updatedCount}`);
          // If branch is specified, also add clients to this branch
          if (branch && updatedCount > 0) {
            const branchRecords = clientIds.map(clientId => ({
              client_id: clientId,
              branch: branch
            }));
            
            const { error: branchError } = await supabase
              .from('client_branches')
              .upsert(branchRecords, { onConflict: 'client_id,branch' });
            
            if (branchError) {
              console.warn('⚠️ Branch assignment warning:', branchError.message);
            } else {
              console.log(`📍 Assigned ${clientIds.length} clients to branch: ${branch}`);
            }
          }
        } catch (e) {
          console.error('❌ Batch update failed:', e);
          failedValidUpdates += batch.length;
        }
      }
    }

    // Process new clients
    let createdTotal = 0;
    let failedNewClients = 0;

    if (hasNewClients) {
      console.log(`📥 Creating ${newClients.length} new clients...`);
      
      for (const nc of newClients) {
        try {
          const salebotIdNum = Number.parseInt(String(nc.salebotId), 10);
          if (!Number.isFinite(salebotIdNum)) {
            failedNewClients++;
            continue;
          }

          // Create client record
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              name: nc.name || 'Без имени',
              salebot_client_id: salebotIdNum,
              branch: branch || null,
              is_active: true
            })
            .select('id')
            .single();
          
          if (clientError || !newClient) {
            console.error('❌ Failed to create client:', clientError?.message);
            failedNewClients++;
            continue;
          }

          // Create phone number record
          const { error: phoneError } = await supabase
            .from('client_phone_numbers')
            .insert({
              client_id: newClient.id,
              phone: nc.phone,
              is_primary: true
            });
          
          if (phoneError) {
            console.warn('⚠️ Phone insert warning:', phoneError.message);
          }

          // Create branch assignment if specified
          if (branch) {
            const { error: branchError } = await supabase
              .from('client_branches')
              .insert({
                client_id: newClient.id,
                branch: branch
              });
            
            if (branchError) {
              console.warn('⚠️ Branch assignment warning:', branchError.message);
            }
          }

          createdTotal++;
        } catch (e) {
          console.error('❌ Failed to create client:', e);
          failedNewClients++;
        }
      }
      
      console.log(`✅ Created ${createdTotal} new clients, failed: ${failedNewClients}`);
    }

    const totalErrors = failedValidUpdates + failedNewClients;
    console.log(
      `✅ Import complete: updated ${updatedTotal}, created ${createdTotal}, errors: ${totalErrors}`,
    );

    return new Response(
      JSON.stringify({
        success: totalErrors === 0,
        updated: updatedTotal,
        created: createdTotal,
        errors: totalErrors,
        total: (updates?.length || 0) + (newClients?.length || 0),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: totalErrors === 0 ? 200 : 207,
      },
    );

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
