import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

console.log('[get-bonus-settings] Function booted');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { organization_id } = await req.json().catch(() => ({ organization_id: null }));

    if (!organization_id) {
      return errorResponse('organization_id is required', 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('bonus_settings')
      .select('*')
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (error) {
      console.error('[get-bonus-settings] Error:', error);
      // Если таблицы нет, возвращаем null
      if (error.code === '42P01') {
        return successResponse({ settings: null });
      }
      throw error;
    }

    console.log(`[get-bonus-settings] Retrieved settings for org ${organization_id}`);
    return successResponse({ settings: data });
  } catch (error: unknown) {
    console.error('[get-bonus-settings] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
