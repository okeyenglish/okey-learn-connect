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
    
    const { groupId } = await req.json();
    
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    console.log(`Generating mini-group name for group: ${groupId}`);
    
    // Получаем студентов группы со статусом 'active'
    const { data: students, error: studentsError } = await supabaseClient
      .from('group_students')
      .select(`
        student:students(last_name, first_name)
      `)
      .eq('group_id', groupId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw studentsError;
    }

    console.log(`Found ${students?.length || 0} active students`);
    
    // Формируем название из фамилий
    const lastNames = students
      ?.map(s => s.student?.last_name)
      .filter(Boolean) || [];
    
    if (lastNames.length === 0) {
      console.log('No students found, using default name');
      return new Response(
        JSON.stringify({ 
          name: 'Мини-группа (без студентов)',
          locked: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const name = lastNames.join(' + ');
    console.log(`Generated name: ${name}`);
    
    // Обновляем название группы и блокируем его от редактирования
    const { error: updateError } = await supabaseClient
      .from('learning_groups')
      .update({ 
        name, 
        custom_name_locked: true 
      })
      .eq('id', groupId);
    
    if (updateError) {
      console.error('Error updating group name:', updateError);
      throw updateError;
    }

    console.log('Successfully updated group name');
    
    return new Response(
      JSON.stringify({ name, locked: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-mini-group-name function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
