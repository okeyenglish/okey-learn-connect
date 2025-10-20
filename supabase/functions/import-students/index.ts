import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, preview } = await req.json();
    console.log('Import request:', { preview, dataLength: data?.length });

    // Если preview = true, только анализируем структуру
    if (preview) {
      return await analyzeStructure(data);
    }

    // Полный импорт
    const result = await importStudents(supabase, data);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeStructure(data: any[]) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const sampleRows = data.slice(0, 5);
  const prompt = `Проанализируй структуру данных и определи маппинг колонок для импорта учеников.

Целевая структура:
- clients (контакты/родители): name, phone, email, branch, notes
- students (ученики): name (или first_name, last_name, middle_name), age, date_of_birth, phone, status, notes
- family_groups: name
- family_members: связь клиентов с семьями

Пример данных:
${JSON.stringify(sampleRows, null, 2)}

Определи для каждой колонки:
1. Какому полю в нашей структуре она соответствует
2. Является ли это данными родителя или ребенка
3. Как обработать значение (формат даты, телефона и т.п.)

Верни только JSON без дополнительного текста.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'Ты эксперт по анализу данных. Возвращай только валидный JSON без markdown и объяснений.'
        },
        { role: 'user', content: prompt }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'map_columns',
          description: 'Маппинг колонок на структуру БД',
          parameters: {
            type: 'object',
            properties: {
              mapping: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source_column: { type: 'string' },
                    target_entity: { type: 'string', enum: ['client', 'student', 'family'] },
                    target_field: { type: 'string' },
                    transformation: { type: 'string' },
                    confidence: { type: 'number' }
                  },
                  required: ['source_column', 'target_entity', 'target_field']
                }
              },
              suggestions: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['mapping']
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'map_columns' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI response error:', response.status, errorText);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const aiResponse = await response.json();
  console.log('AI analysis result:', aiResponse);

  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error('AI did not return mapping');
  }

  const mapping = JSON.parse(toolCall.function.arguments);

  return new Response(JSON.stringify({ 
    mapping: mapping.mapping,
    suggestions: mapping.suggestions,
    preview: sampleRows 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function importStudents(supabase: any, rows: any[]) {
  const stats = {
    total: rows.length,
    clients_created: 0,
    clients_updated: 0,
    families_created: 0,
    students_created: 0,
    errors: [] as string[]
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      await processRow(supabase, row, stats);
    } catch (error) {
      const errorMsg = `Строка ${i + 1}: ${error instanceof Error ? error.message : 'Ошибка'}`;
      console.error(errorMsg, row);
      stats.errors.push(errorMsg);
    }
  }

  return stats;
}

async function processRow(supabase: any, row: any, stats: any) {
  const mapping = row.__mapping;
  if (!mapping) {
    throw new Error('Маппинг не найден');
  }

  // Извлекаем данные клиента
  const clientData: any = { is_active: true };
  const studentData: any = { status: 'active' };
  let familyName = '';

  for (const map of mapping) {
    const value = row[map.source_column];
    if (!value) continue;

    if (map.target_entity === 'client') {
      if (map.target_field === 'phone') {
        clientData.phone = normalizePhone(value);
      } else {
        clientData[map.target_field] = value;
      }
    } else if (map.target_entity === 'student') {
      if (map.target_field === 'phone') {
        studentData.phone = normalizePhone(value);
      } else if (map.target_field === 'date_of_birth') {
        studentData.date_of_birth = parseDate(value);
        studentData.age = calculateAge(studentData.date_of_birth);
      } else {
        studentData[map.target_field] = value;
      }
    } else if (map.target_entity === 'family') {
      familyName += value + ' ';
    }
  }

  // Формируем имя
  if (!clientData.name && clientData.first_name) {
    clientData.name = [clientData.first_name, clientData.last_name].filter(Boolean).join(' ');
  }
  if (!studentData.name && studentData.first_name) {
    studentData.name = [studentData.first_name, studentData.last_name, studentData.middle_name]
      .filter(Boolean).join(' ');
  }

  familyName = familyName.trim() || clientData.name || 'Семья';

  // Проверяем существование клиента
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id, family_group_id:family_members(family_group_id)')
    .eq('phone', clientData.phone)
    .maybeSingle();

  let clientId;
  let familyGroupId;

  if (existingClient) {
    clientId = existingClient.id;
    familyGroupId = existingClient.family_group_id?.[0]?.family_group_id;
    stats.clients_updated++;
  } else {
    // Создаем нового клиента
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (clientError) throw clientError;
    clientId = newClient.id;
    stats.clients_created++;

    // Создаем семейную группу
    const { data: newFamily, error: familyError } = await supabase
      .from('family_groups')
      .insert([{ 
        name: familyName,
        branch: clientData.branch || 'Окская'
      }])
      .select()
      .single();

    if (familyError) throw familyError;
    familyGroupId = newFamily.id;
    stats.families_created++;

    // Связываем клиента с семьей
    await supabase
      .from('family_members')
      .insert([{
        client_id: clientId,
        family_group_id: familyGroupId,
        relationship_type: 'main',
        is_primary_contact: true
      }]);
  }

  // Создаем ученика
  studentData.family_group_id = familyGroupId;
  studentData.branch = clientData.branch || 'Окская';

  const { error: studentError } = await supabase
    .from('students')
    .insert([studentData]);

  if (studentError) throw studentError;
  stats.students_created++;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('8')) return '+7' + digits.slice(1);
  if (digits.startsWith('7')) return '+' + digits;
  return '+7' + digits.slice(-10);
}

function parseDate(dateStr: string): string {
  // Пробуем разные форматы
  const formats = [
    /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0] || format === formats[2]) {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
      return match[0];
    }
  }

  return dateStr;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
