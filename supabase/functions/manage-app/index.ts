import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, app_id, teacher_id, rating, comment, reason } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Action:', action, 'Teacher ID:', teacher_id, 'App ID:', app_id);

    // Get teacher by profile_id or id
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id, profile_id')
      .or(`id.eq.${teacher_id},profile_id.eq.${teacher_id}`)
      .maybeSingle();

    console.log('Teacher found:', teacher, 'Error:', teacherError);

    if (!teacher) {
      console.error('Teacher not found for id:', teacher_id);
      return new Response(
        JSON.stringify({ error: 'Teacher not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'install':
        // Install app
        console.log('Installing app:', app_id, 'for teacher:', teacher.id);
        const { error: installError } = await supabase
          .from('app_installs')
          .upsert({ 
            app_id, 
            teacher_id: teacher.id 
          });
        if (installError) {
          console.error('Install error:', installError);
          throw installError;
        }
        console.log('App installed successfully');
        result = { success: true, message: 'Приложение добавлено в "Мои приложения"' };
        break;

      case 'uninstall':
        // Uninstall app
        const { error: uninstallError } = await supabase
          .from('app_installs')
          .delete()
          .eq('app_id', app_id)
          .eq('teacher_id', teacher.id);
        if (uninstallError) throw uninstallError;
        result = { success: true, message: 'Приложение удалено из "Моих приложений"' };
        break;

      case 'rate':
        // Rate app
        if (!rating || rating < 1 || rating > 5) {
          return new Response(
            JSON.stringify({ error: 'rating must be between 1 and 5' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: rateError } = await supabase
          .from('app_reviews')
          .upsert({ 
            app_id, 
            teacher_id: teacher.id,
            rating,
            comment: comment || null
          });
        if (rateError) throw rateError;
        result = { success: true, message: 'Спасибо за оценку!' };
        break;

      case 'flag':
        // Flag app
        if (!reason) {
          return new Response(
            JSON.stringify({ error: 'reason is required for flagging' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: flagError } = await supabase
          .from('app_flags')
          .insert({ 
            app_id, 
            teacher_id: teacher.id,
            reason
          });
        if (flagError) throw flagError;
        result = { success: true, message: 'Жалоба отправлена. Спасибо!' };
        break;

      case 'usage':
        // Track usage
        const { error: usageError } = await supabase
          .from('app_usage')
          .insert({ 
            app_id, 
            teacher_id: teacher.id,
            session_at: new Date().toISOString(),
            duration_sec: 0
          });
        if (usageError) throw usageError;
        result = { success: true };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in manage-app:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
