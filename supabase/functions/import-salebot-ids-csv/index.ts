import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FUNCTION_VERSION = '2026-01-15-1720';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CsvRow {
  salebotId: string;
  name: string;
  phone: string;
}

function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Handle Russian phone numbers
  if (digits.startsWith('8') && digits.length === 11) {
    digits = '7' + digits.substring(1);
  }
  
  // Add + prefix if not present
  if (!digits.startsWith('+')) {
    digits = '+' + digits;
  }
  
  return digits;
}

function parseCsvLine(line: string): string[] {
  // Handle semicolon-separated values
  return line.split(';').map(field => field.trim().replace(/^["']|["']$/g, ''));
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`🚀 import-salebot-ids-csv v${FUNCTION_VERSION} started`);
  console.log(`📋 Headers: x-client-info=${req.headers.get('x-client-info') || 'none'}, auth=${req.headers.get('authorization') ? 'present' : 'missing'}`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Validate authorization and admin role
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ Unauthorized: no Bearer token');
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check user role using anon key client with user's token
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('❌ Invalid token:', claimsError?.message);
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = claimsData.claims.sub;
    console.log(`👤 User ID: ${userId}`);

    // Check if user is admin using service role client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (rolesError) {
      console.error('❌ Error checking roles:', rolesError.message);
      return new Response(JSON.stringify({ success: false, error: 'Error checking permissions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isAdmin = userRoles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      console.error('❌ Forbidden: user is not admin');
      return new Response(JSON.stringify({ success: false, error: 'Только администраторы могут выполнять импорт' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Admin role verified');

    const { csvData, dryRun = false } = await req.json();

    if (!csvData || typeof csvData !== 'string') {
      throw new Error('CSV data is required');
    }

    console.log('📥 Начало импорта salebot_client_id из CSV');
    console.log(`📊 Режим: ${dryRun ? 'тестовый (dry run)' : 'реальный импорт'}`);

    // Parse CSV
    const lines = csvData.split('\n').filter(line => line.trim());
    console.log(`📊 Всего строк в CSV: ${lines.length}`);

    // Skip header if present (check if first line contains 'ID' or similar)
    const startIndex = lines[0].toLowerCase().includes('id') || 
                       lines[0].toLowerCase().includes('имя') || 
                       lines[0].toLowerCase().includes('name') ? 1 : 0;
    
    const rows: CsvRow[] = [];
    
    for (let i = startIndex; i < lines.length; i++) {
      const fields = parseCsvLine(lines[i]);
      if (fields.length >= 3) {
        const salebotId = fields[0];
        const name = fields[1];
        // Phone can be in field 2 or 3 (CSV format: ID;Name;Phone;Phone)
        const phone = fields[2] || fields[3];
        
        if (salebotId && phone) {
          rows.push({
            salebotId,
            name,
            phone: normalizePhone(phone)
          });
        }
      }
    }

    console.log(`📊 Распознано записей: ${rows.length}`);

    // Get all phone numbers from database for matching (paginate to get all)
    let allPhoneRecords: { id: string; client_id: string; phone: string }[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: pageRecords, error: phoneError } = await supabase
        .from('client_phone_numbers')
        .select('id, client_id, phone')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (phoneError) {
        throw new Error(`Ошибка получения телефонов: ${phoneError.message}`);
      }

      if (!pageRecords || pageRecords.length === 0) break;
      
      allPhoneRecords = allPhoneRecords.concat(pageRecords);
      console.log(`📊 Загружено телефонов: ${allPhoneRecords.length}`);
      
      if (pageRecords.length < pageSize) break;
      page++;
    }

    console.log(`📊 Всего телефонов в базе: ${allPhoneRecords.length}`);

    // Create phone lookup map (normalized phone -> client_id)
    const phoneToClientMap = new Map<string, string>();
    for (const record of allPhoneRecords) {
      const normalizedPhone = normalizePhone(record.phone);
      phoneToClientMap.set(normalizedPhone, record.client_id);
    }

    // Match and prepare updates
    const updates: { clientId: string; salebotId: string; phone: string }[] = [];
    const notFound: string[] = [];

    for (const row of rows) {
      const clientId = phoneToClientMap.get(row.phone);
      if (clientId) {
        updates.push({
          clientId,
          salebotId: row.salebotId,
          phone: row.phone
        });
      } else {
        notFound.push(row.phone);
      }
    }

    console.log(`✅ Найдено совпадений: ${updates.length}`);
    console.log(`❌ Не найдено: ${notFound.length}`);

    if (dryRun) {
      // Just return stats without making changes
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        totalRows: rows.length,
        matched: updates.length,
        notFound: notFound.length,
        sampleNotFound: notFound.slice(0, 10),
        sampleMatched: updates.slice(0, 10).map(u => ({ phone: u.phone, salebotId: u.salebotId }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Perform actual updates in batches using upsert for efficiency
    const batchSize = 100;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      // Prepare batch data for upsert
      const batchData = batch.map(update => ({
        id: update.clientId,
        salebot_client_id: parseInt(update.salebotId)
      }));

      const { error: batchError } = await supabase
        .from('clients')
        .upsert(batchData, { onConflict: 'id', ignoreDuplicates: false });

      if (batchError) {
        console.error(`❌ Ошибка batch ${i}-${i + batchSize}: ${batchError.message}`);
        errorCount += batch.length;
      } else {
        updatedCount += batch.length;
      }

      console.log(`📊 Обработано: ${Math.min(i + batchSize, updates.length)}/${updates.length}`);
    }

    console.log(`✅ Импорт завершён: обновлено ${updatedCount}, ошибок ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      dryRun: false,
      totalRows: rows.length,
      matched: updates.length,
      updated: updatedCount,
      errors: errorCount,
      notFound: notFound.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Ошибка импорта CSV:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});