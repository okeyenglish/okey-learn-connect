import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Создание тестовых данных для студента...');
    
    const today = new Date();
    const studentIds = [
      'b1111111-1111-1111-1111-111111111111',
      'b2222222-2222-2222-2222-222222222222',
      'b3333333-3333-3333-3333-333333333333'
    ];

    // 1. Удаляем старые тестовые данные
    console.log('Удаление старых данных...');
    await supabase.from('student_homework').delete().in('student_id', studentIds);
    await supabase.from('homework').delete().eq('group_id', 'a1111111-1111-1111-1111-111111111111');
    await supabase.from('payments').delete().in('student_id', studentIds);
    await supabase.from('student_balances').delete().in('student_id', studentIds);

    // 2. Создаем домашние задания
    console.log('Создание домашних заданий...');
    const homeworkData = [
      {
        group_id: 'a1111111-1111-1111-1111-111111111111',
        assignment: 'Учебник стр. 20-30, упражнения 1-5',
        description: 'Выполнить все упражнения письменно, подготовить устные ответы',
        due_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        show_in_student_portal: true,
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_by: 'c33657a1-9e49-441b-83d4-859cce549860'
      },
      {
        group_id: 'a1111111-1111-1111-1111-111111111111',
        assignment: 'Учебник стр. 30-40, упражнения 6-10',
        description: 'Подготовить диалог по теме урока',
        due_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        show_in_student_portal: true,
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_by: 'c33657a1-9e49-441b-83d4-859cce549860'
      }
    ];

    const { data: homeworkRecords, error: homeworkError } = await supabase
      .from('homework')
      .insert(homeworkData)
      .select();
    
    if (homeworkError) throw homeworkError;

    // 3. Создаем student_homework записи
    console.log('Создание записей student_homework...');
    const studentHomeworkData = homeworkRecords?.flatMap(hw => [
      {
        homework_id: hw.id,
        student_id: 'b1111111-1111-1111-1111-111111111111',
        status: 'completed',
        grade: '5',
        teacher_notes: 'Отлично выполнено!',
        completed_at: new Date().toISOString()
      },
      {
        homework_id: hw.id,
        student_id: 'b2222222-2222-2222-2222-222222222222',
        status: 'in_progress',
        student_notes: 'Выполняю задание'
      },
      {
        homework_id: hw.id,
        student_id: 'b3333333-3333-3333-3333-333333333333',
        status: 'assigned'
      }
    ]) || [];

    const { error: studentHomeworkError } = await supabase
      .from('student_homework')
      .insert(studentHomeworkData);
    
    if (studentHomeworkError) throw studentHomeworkError;

    // 4. Создаем платежи
    console.log('Создание платежей...');
    const paymentsData = [
      {
        student_id: 'b1111111-1111-1111-1111-111111111111',
        amount: 5000,
        payment_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'completed',
        notes: 'Оплата за месяц',
        organization_id: '00000000-0000-0000-0000-000000000001'
      },
      {
        student_id: 'b2222222-2222-2222-2222-222222222222',
        amount: 3000,
        payment_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'completed',
        notes: 'Частичная оплата',
        organization_id: '00000000-0000-0000-0000-000000000001'
      },
      {
        student_id: 'b3333333-3333-3333-3333-333333333333',
        amount: 4500,
        payment_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'completed',
        notes: 'Оплата за месяц',
        organization_id: '00000000-0000-0000-0000-000000000001'
      }
    ];

    const { error: paymentsError } = await supabase.from('payments').insert(paymentsData);
    if (paymentsError) throw paymentsError;

    // 5. Создаем балансы
    console.log('Создание балансов студентов...');
    const balancesData = [
      {
        student_id: 'b1111111-1111-1111-1111-111111111111',
        balance: 1000
      },
      {
        student_id: 'b2222222-2222-2222-2222-222222222222',
        balance: -500
      },
      {
        student_id: 'b3333333-3333-3333-3333-333333333333',
        balance: 0
      }
    ];

    const { error: balancesError } = await supabase
      .from('student_balances')
      .upsert(balancesData, { onConflict: 'student_id' });
    
    if (balancesError) throw balancesError;

    console.log('Тестовые данные студентов успешно созданы!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Созданы тестовые данные: ${homeworkRecords?.length || 0} ДЗ, ${paymentsData.length} платежей, ${balancesData.length} балансов` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Ошибка:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
