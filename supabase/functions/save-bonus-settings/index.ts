import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

console.log('[save-bonus-settings] Function booted');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { organization_id, settings } = await req.json();

    if (!organization_id) {
      return errorResponse('organization_id is required', 400);
    }

    if (!settings) {
      return errorResponse('settings is required', 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert settings
    const { data, error } = await supabase
      .from('bonus_settings')
      .upsert({
        organization_id,
        ...settings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[save-bonus-settings] Error:', error);
      throw error;
    }

    console.log(`[save-bonus-settings] Saved settings for org ${organization_id}`);
    return successResponse({ settings: data });
  } catch (error: unknown) {
    console.error('[save-bonus-settings] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
