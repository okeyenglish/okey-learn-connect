import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
    
    // Используем service role для обхода RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Удаление старых тестовых данных...');
    
    // Удаляем старые данные
    await supabase.from('group_students').delete().eq('group_id', 'a1111111-1111-1111-1111-111111111111');
    await supabase.from('lesson_sessions').delete().eq('group_id', 'a1111111-1111-1111-1111-111111111111');
    await supabase.from('learning_groups').delete().eq('id', 'a1111111-1111-1111-1111-111111111111');
    await supabase.from('students').delete().in('id', [
      'b1111111-1111-1111-1111-111111111111',
      'b2222222-2222-2222-2222-222222222222',
      'b3333333-3333-3333-3333-333333333333'
    ]);
    await supabase.from('teacher_earnings').delete().eq('teacher_id', 'c33657a1-9e49-441b-83d4-859cce549860');

    console.log('Создание тестовой группы...');
    
    // 1. Создаем группу
    const { error: groupError } = await supabase.from('learning_groups').insert({
      id: 'a1111111-1111-1111-1111-111111111111',
      name: 'Английский A1 Взрослые (TEST)',
      branch: 'Окская',
      subject: 'Английский язык',
      level: 'A1',
      category: 'adult',
      group_type: 'general',
      status: 'active',
      responsible_teacher: 'Иванова Мария',
      capacity: 8,
      current_students: 3,
      academic_hours: 2,
      schedule_days: ['monday', 'wednesday', 'friday'],
      schedule_time: '18:00',
      is_active: true,
      organization_id: '00000000-0000-0000-0000-000000000001'
    });
    
    if (groupError) throw groupError;

    console.log('Создание семейных групп...');
    
    // 2. Создаем семейные группы
    await supabase.from('family_groups').delete().in('id', [
      'f1111111-1111-1111-1111-111111111111',
      'f2222222-2222-2222-2222-222222222222',
      'f3333333-3333-3333-3333-333333333333'
    ]);
    
    const familyGroupsData = [
      { id: 'f1111111-1111-1111-1111-111111111111', name: 'Семья Петровых', organization_id: '00000000-0000-0000-0000-000000000001' },
      { id: 'f2222222-2222-2222-2222-222222222222', name: 'Семья Смирновых', organization_id: '00000000-0000-0000-0000-000000000001' },
      { id: 'f3333333-3333-3333-3333-333333333333', name: 'Семья Козловых', organization_id: '00000000-0000-0000-0000-000000000001' }
    ];
    
    console.log('Inserting family groups:', JSON.stringify(familyGroupsData));
    
    const { error: familyGroupsError } = await supabase.from('family_groups').insert(familyGroupsData);
    
    if (familyGroupsError) {
      console.error('Family groups error:', familyGroupsError);
      throw familyGroupsError;
    }

    console.log('Создание тестовых студентов...');
    
    // 3. Создаем студентов
    const { error: studentsError } = await supabase.from('students').insert([
      { 
        id: 'b1111111-1111-1111-1111-111111111111', 
        name: 'Анна Петрова',
        first_name: 'Анна', 
        last_name: 'Петрова', 
        status: 'active', 
        age: 25, 
        date_of_birth: '1999-05-15',
        family_group_id: 'f1111111-1111-1111-1111-111111111111',
        organization_id: '00000000-0000-0000-0000-000000000001'
      },
      { 
        id: 'b2222222-2222-2222-2222-222222222222', 
        name: 'Иван Смирнов',
        first_name: 'Иван', 
        last_name: 'Смирнов', 
        status: 'active', 
        age: 28, 
        date_of_birth: '1996-08-20',
        family_group_id: 'f2222222-2222-2222-2222-222222222222',
        organization_id: '00000000-0000-0000-0000-000000000001'
      },
      { 
        id: 'b3333333-3333-3333-3333-333333333333', 
        name: 'Елена Козлова',
        first_name: 'Елена', 
        last_name: 'Козлова', 
        status: 'active', 
        age: 23, 
        date_of_birth: '2001-03-10',
        family_group_id: 'f3333333-3333-3333-3333-333333333333',
        organization_id: '00000000-0000-0000-0000-000000000001'
      }
    ]);
    
    if (studentsError) throw studentsError;

    console.log('Связывание студентов с группой...');
    
    // 3. Связываем студентов с группой
    const enrollmentDate = new Date();
    enrollmentDate.setDate(enrollmentDate.getDate() - 30);
    
    const { error: enrollError } = await supabase.from('group_students').insert([
      { group_id: 'a1111111-1111-1111-1111-111111111111', student_id: 'b1111111-1111-1111-1111-111111111111', enrollment_date: enrollmentDate.toISOString().split('T')[0], status: 'active' },
      { group_id: 'a1111111-1111-1111-1111-111111111111', student_id: 'b2222222-2222-2222-2222-222222222222', enrollment_date: enrollmentDate.toISOString().split('T')[0], status: 'active' },
      { group_id: 'a1111111-1111-1111-1111-111111111111', student_id: 'b3333333-3333-3333-3333-333333333333', enrollment_date: enrollmentDate.toISOString().split('T')[0], status: 'active' }
    ]);
    
    if (enrollError) throw enrollError;

    console.log('Создание занятий...');
    
    // 4. Создаем занятия
    const today = new Date();
    const sessions = [
      { days: 1, day: 'monday' },
      { days: 3, day: 'wednesday' },
      { days: 5, day: 'friday' },
      { days: 8, day: 'monday' }
    ];
    
    const sessionData = sessions.map((s, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + s.days);
      return {
        group_id: 'a1111111-1111-1111-1111-111111111111',
        teacher_name: 'Иванова Мария',
        branch: 'Окская',
        classroom: 'Кабинет 101',
        lesson_date: date.toISOString().split('T')[0],
        start_time: '18:00',
        end_time: '19:30',
        day_of_week: s.day,
        status: 'scheduled',
        lesson_number: i + 1,
        organization_id: '00000000-0000-0000-0000-000000000001'
      };
    });
    
    console.log('Inserting sessions:', JSON.stringify(sessionData[0]));
    const { error: sessionsError } = await supabase.from('lesson_sessions').insert(sessionData);
    if (sessionsError) throw sessionsError;

    console.log('Создание начислений зарплаты...');
    
    // 5. Создаем начисления
    const earnings = [-7, -5, -3].map(days => {
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return {
        teacher_id: 'c33657a1-9e49-441b-83d4-859cce549860',
        earning_date: date.toISOString().split('T')[0],
        academic_hours: 2,
        rate_per_hour: 500,
        amount: 1000,
        currency: 'RUB',
        status: 'pending',
        notes: 'Групповое занятие - Английский A1',
        organization_id: '00000000-0000-0000-0000-000000000001'
      };
    });
    
    const { error: earningsError } = await supabase.from('teacher_earnings').insert(earnings);
    if (earningsError) throw earningsError;

    console.log('Тестовые данные успешно созданы!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Тестовые данные учителя созданы: группа с 3 студентами, 4 занятия, 3 начисления (3000₽)' 
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
