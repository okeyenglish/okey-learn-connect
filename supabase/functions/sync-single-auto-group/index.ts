import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    const { groupId } = await req.json();
    
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    console.log(`Syncing auto-group: ${groupId}`);
    
    // Проверяем, что это действительно авто-группа
    const { data: group, error: groupError } = await supabaseClient
      .from('learning_groups')
      .select('id, name, is_auto_group')
      .eq('id', groupId)
      .single();
    
    if (groupError) {
      console.error('Error fetching group:', groupError);
      throw groupError;
    }

    if (!group.is_auto_group) {
      throw new Error('This is not an auto-group');
    }

    console.log(`Found auto-group: ${group.name}`);
    
    // Вызываем функцию синхронизации
    const { data, error: syncError } = await supabaseClient
      .rpc('sync_auto_group_students', { p_group_id: groupId });
    
    if (syncError) {
      console.error('Error syncing group:', syncError);
      throw syncError;
    }

    console.log('Successfully synced group');
    
    // Получаем обновленную информацию о группе
    const { data: updatedGroup, error: fetchError } = await supabaseClient
      .from('learning_groups')
      .select('current_students')
      .eq('id', groupId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching updated group:', fetchError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        groupId,
        currentStudents: updatedGroup?.current_students || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-single-auto-group function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
