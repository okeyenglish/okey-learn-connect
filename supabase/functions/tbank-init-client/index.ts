import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InitPaymentRequest {
  client_id: string;
  amount: number; // в рублях
  description?: string;
  success_url?: string;
  fail_url?: string;
}

interface TBankInitResponse {
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
  const pairs: Record<string, string> = { ...data, Password: password };
  const sortedKeys = Object.keys(pairs).sort();
  const concatenated = sortedKeys.map(key => pairs[key]).join('');
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(concatenated);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { client_id, amount, description, success_url, fail_url }: InitPaymentRequest = await req.json();

    if (!client_id || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: 'client_id and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Получаем клиента и его организацию
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, organization_id, branch')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = client.organization_id;
    const clientBranch = client.branch;

    // Ищем терминал: сначала для филиала, потом для организации
    let terminal = null;
    
    if (clientBranch) {
      const { data: branchData } = await supabase
        .from('organization_branches')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', clientBranch)
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
      return new Response(
        JSON.stringify({ success: false, error: 'Платежный терминал не настроен. Настройте терминал в разделе Настройки → Онлайн-оплаты' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Генерируем уникальный OrderId
    const orderId = `CL_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const amountKopecks = Math.round(amount * 100);

    const baseUrl = terminal.is_test_mode 
      ? 'https://rest-api-test.tinkoff.ru/v2' 
      : 'https://securepay.tinkoff.ru/v2';

    // Формируем чек для 54-ФЗ (обязателен для T-Bank)
    const receipt = {
      Email: "noreply@example.com", // Email получателя чека (можно заменить на email клиента)
      Taxation: "usn_income", // Система налогообложения (УСН доходы)
      Items: [
        {
          Name: description || `Оплата услуг - ${client.name}`,
          Price: amountKopecks,
          Quantity: 1,
          Amount: amountKopecks,
          Tax: "none", // НДС не облагается
          PaymentMethod: "full_payment",
          PaymentObject: "service",
        },
      ],
    };

    const requestData: Record<string, any> = {
      TerminalKey: terminal.terminal_key,
      Amount: amountKopecks,
      OrderId: orderId,
      Description: description || `Оплата - ${client.name}`,
      Receipt: receipt,
    };

    if (success_url) requestData.SuccessURL = success_url;
    if (fail_url) requestData.FailURL = fail_url;

    const token = await generateToken(
      { TerminalKey: requestData.TerminalKey, Amount: requestData.Amount, OrderId: requestData.OrderId, Description: requestData.Description },
      terminal.terminal_password
    );
    requestData.Token = token;

    console.log('Sending request to T-Bank for client:', { orderId, amount: amountKopecks, client_id, terminal_key: terminal.terminal_key });

    const response = await fetch(`${baseUrl}/Init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    const tbankResponse: TBankInitResponse = await response.json();

    console.log('T-Bank response:', tbankResponse);

    // Сохраняем онлайн-платеж (используем таблицу online_payments с nullable student_id)
    const { data: onlinePayment, error: insertError } = await supabase
      .from('online_payments')
      .insert({
        terminal_id: terminal.id,
        client_id: client_id,
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
      // Продолжаем, если не удалось сохранить - ссылка все равно создана
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

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: tbankResponse.PaymentURL,
        order_id: orderId,
        payment_id: tbankResponse.PaymentId,
        online_payment_id: onlinePayment?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in tbank-init-client:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
