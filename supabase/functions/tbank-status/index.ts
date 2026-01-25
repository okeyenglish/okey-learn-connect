import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  successResponse, 
  errorResponse, 
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const orderId = url.searchParams.get('order_id');

    if (!orderId) {
      return errorResponse('order_id is required', 400);
    }

    const { data: onlinePayment, error } = await supabase
      .from('online_payments')
      .select('*, payment:payments(*)')
      .eq('order_id', orderId)
      .single();

    if (error || !onlinePayment) {
      return errorResponse('Payment not found', 404);
    }

    return successResponse({
      status: onlinePayment.status,
      amount: onlinePayment.amount / 100,
      is_paid: onlinePayment.status === 'CONFIRMED',
      payment_id: onlinePayment.payment_id,
      created_at: onlinePayment.created_at,
    });

  } catch (error: unknown) {
    console.error('Error in tbank-status:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
