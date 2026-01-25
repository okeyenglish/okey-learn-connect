import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
  type TBankInitRequest,
  type TBankInitResponse,
} from '../_shared/types.ts';

interface InitPaymentRequest {
  student_id: string;
  amount: number; // в рублях
  description?: string;
  branch_id?: string;
  success_url?: string;
  fail_url?: string;
}

interface TBankApiResponse {
  Success: boolean;
  ErrorCode: string;
  TerminalKey?: string;
  Status?: string;
  PaymentId?: string;
  OrderId?: string;
  Amount?: number;
  PaymentURL?: string;
  Message?: string;
  Details?: string;
}

// Генерация токена для Т-Банка (SHA-256)
async function generateToken(data: Record<string, any>, password: string): Promise<string> {
  // Собираем пары ключ-значение, добавляем пароль
  const pairs: Record<string, string> = { ...data, Password: password };
  
  // Сортируем по ключам и конкатенируем значения
  const sortedKeys = Object.keys(pairs).sort();
  const concatenated = sortedKeys.map(key => pairs[key]).join('');
  
  // SHA-256
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(concatenated);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем данные из запроса
    const { student_id, amount, description, branch_id, success_url, fail_url }: InitPaymentRequest = await req.json();

    if (!student_id || !amount) {
      return errorResponse('student_id and amount are required', 400);
    }

    // Получаем студента и его организацию
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, first_name, last_name, organization_id, branch')
      .eq('id', student_id)
      .single();

    if (studentError || !student) {
      console.error('Student not found:', studentError);
      return errorResponse('Student not found', 404);
    }

    const organizationId = student.organization_id;
    const studentBranch = branch_id || student.branch;

    // Ищем терминал: сначала для филиала, потом для организации
    let terminal = null;
    
    if (studentBranch) {
      // Получаем branch_id из organization_branches
      const { data: branchData } = await supabase
        .from('organization_branches')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', studentBranch)
        .single();

      if (branchData) {
        const { data: branchTerminal } = await supabase
          .from('payment_terminals')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('branch_id', branchData.id)
          .eq('provider', 'tbank')
          .eq('is_active', true)
          .single();

        terminal = branchTerminal;
      }
    }

    // Если нет терминала филиала, ищем терминал организации
    if (!terminal) {
      const { data: orgTerminal } = await supabase
        .from('payment_terminals')
        .select('*')
        .eq('organization_id', organizationId)
        .is('branch_id', null)
        .eq('provider', 'tbank')
        .eq('is_active', true)
        .single();

      terminal = orgTerminal;
    }

    if (!terminal) {
      console.error('No active payment terminal found for organization:', organizationId);
      return errorResponse('Payment terminal not configured', 400);
    }

    // Генерируем уникальный OrderId
    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const amountKopecks = Math.round(amount * 100);

    // URL для Т-Банка
    const baseUrl = terminal.is_test_mode 
      ? 'https://rest-api-test.tinkoff.ru/v2' 
      : 'https://securepay.tinkoff.ru/v2';

    // Данные для запроса
    const requestData: Record<string, any> = {
      TerminalKey: terminal.terminal_key,
      Amount: amountKopecks,
      OrderId: orderId,
      Description: description || `Оплата за обучение - ${student.first_name} ${student.last_name}`,
    };

    // Добавляем URL-ы если переданы
    if (success_url) requestData.SuccessURL = success_url;
    if (fail_url) requestData.FailURL = fail_url;

    // Генерируем токен
    const token = await generateToken(requestData, terminal.terminal_password);
    requestData.Token = token;

    console.log('Sending request to T-Bank:', { orderId, amount: amountKopecks, terminal_key: terminal.terminal_key });

    // Отправляем запрос в Т-Банк
    const response = await fetch(`${baseUrl}/Init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    const tbankResponse: TBankApiResponse = await response.json();

    console.log('T-Bank response:', tbankResponse);

    // Сохраняем онлайн-платеж
    const { data: onlinePayment, error: insertError } = await supabase
      .from('online_payments')
      .insert({
        terminal_id: terminal.id,
        student_id: student_id,
        organization_id: organizationId,
        tbank_payment_id: tbankResponse.PaymentId,
        order_id: orderId,
        amount: amountKopecks,
        status: tbankResponse.Success ? tbankResponse.Status || 'NEW' : 'ERROR',
        payment_url: tbankResponse.PaymentURL,
        error_code: tbankResponse.ErrorCode !== '0' ? tbankResponse.ErrorCode : null,
        error_message: tbankResponse.Message || tbankResponse.Details,
        description: description,
        raw_request: requestData,
        raw_response: tbankResponse,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save online payment:', insertError);
    }

    if (!tbankResponse.Success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: tbankResponse.Message || tbankResponse.Details || 'T-Bank request failed',
          error_code: tbankResponse.ErrorCode,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: TBankInitResponse = {
      success: true,
      paymentUrl: tbankResponse.PaymentURL,
      orderId: orderId,
      paymentId: tbankResponse.PaymentId,
    };

    return successResponse({ ...result, online_payment_id: onlinePayment?.id });

  } catch (error: unknown) {
    console.error('Error in tbank-init:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
