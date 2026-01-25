import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { app_id } = await req.json();

    if (!app_id) {
      return new Response(
        JSON.stringify({ error: 'app_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get app
    const { data: app } = await supabase
      .from('apps')
      .select('*')
      .eq('id', app_id)
      .single();

    if (!app) {
      return new Response(
        JSON.stringify({ error: 'App not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicates using fingerprint
    const { data: duplicates } = await supabase
      .from('apps')
      .select('id, title, author_id')
      .eq('fingerprint', app.fingerprint)
      .eq('status', 'published')
      .neq('id', app_id);

    if (duplicates && duplicates.length > 0) {
      return new Response(
        JSON.stringify({
          duplicate: true,
          existing_apps: duplicates,
          message: 'Похожее приложение уже опубликовано. Измените описание или функционал.'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Publish app
    const { error: updateError } = await supabase
      .from('apps')
      .update({ 
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', app_id);

    if (updateError) throw updateError;

    return successResponse({
      success: true,
      message: 'Приложение успешно опубликовано!'
    });

  } catch (error: unknown) {
    console.error('Error in publish-app:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
