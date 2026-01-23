import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Starting auto-groups synchronization...');
    
    // Получаем все активные авто-группы
    const { data: autoGroups, error: groupsError } = await supabaseClient
      .from('learning_groups')
      .select('id, name, auto_filter_conditions')
      .eq('is_auto_group', true)
      .eq('is_active', true);
    
    if (groupsError) {
      console.error('Error fetching auto-groups:', groupsError);
      throw groupsError;
    }

    console.log(`Found ${autoGroups?.length || 0} auto-groups to sync`);

    let syncedCount = 0;
    let errors = [];

    // Синхронизируем каждую авто-группу
    for (const group of autoGroups || []) {
      try {
        console.log(`Syncing group: ${group.name} (${group.id})`);
        
        const { error: syncError } = await supabaseClient
          .rpc('sync_auto_group_students', { p_group_id: group.id });
        
        if (syncError) {
          console.error(`Error syncing group ${group.id}:`, syncError);
          errors.push({
            groupId: group.id,
            groupName: group.name,
            error: syncError.message
          });
        } else {
          syncedCount++;
          console.log(`Successfully synced group ${group.name}`);
        }
      } catch (error) {
        console.error(`Exception syncing group ${group.id}:`, error);
        errors.push({
          groupId: group.id,
          groupName: group.name,
          error: error.message
        });
      }
    }

    console.log(`Synchronization complete. Synced: ${syncedCount}, Errors: ${errors.length}`);
    
    return new Response(
      JSON.stringify({ 
        synced: syncedCount,
        total: autoGroups?.length || 0,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-auto-groups function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
