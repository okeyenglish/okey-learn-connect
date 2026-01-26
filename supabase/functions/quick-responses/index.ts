import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuickResponseCategory {
  id: string;
  name: string;
  organization_id: string;
  is_teacher_category: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface QuickResponse {
  id: string;
  category_id: string;
  text: string;
  organization_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // Parse URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract the path after the function name
    // URL: /quick-responses or /quick-responses/category or /quick-responses/category/:id
    let action = '';
    let resourceId = '';
    
    // Find the quick-responses segment and get what follows
    const fnIndex = pathParts.findIndex(p => p === 'quick-responses');
    if (fnIndex !== -1) {
      action = pathParts[fnIndex + 1] || '';
      resourceId = pathParts[fnIndex + 2] || '';
    }

    console.log('[quick-responses] Method:', req.method, 'Action:', action, 'ResourceId:', resourceId);

    // Route handlers
    if (req.method === 'GET' && !action) {
      // GET /quick-responses - List all categories with responses
      const isTeacher = url.searchParams.get('is_teacher') === 'true';
      return await listCategories(supabase, organizationId, isTeacher);
    }

    if (req.method === 'POST' && action === 'category') {
      // POST /quick-responses/category - Create category
      const body = await req.json();
      return await createCategory(supabase, organizationId, body);
    }

    if (req.method === 'PATCH' && action === 'category' && resourceId) {
      // PATCH /quick-responses/category/:id - Update category
      const body = await req.json();
      return await updateCategory(supabase, organizationId, resourceId, body);
    }

    if (req.method === 'DELETE' && action === 'category' && resourceId) {
      // DELETE /quick-responses/category/:id - Delete category
      return await deleteCategory(supabase, organizationId, resourceId);
    }

    if (req.method === 'POST' && action === 'import-defaults') {
      // POST /quick-responses/import-defaults - Import default templates
      const body = await req.json();
      return await importDefaultTemplates(supabase, organizationId, body.is_teacher === true);
    }

    if (req.method === 'POST' && action === 'response') {
      // POST /quick-responses/response - Create response
      const body = await req.json();
      return await createResponse(supabase, organizationId, body);
    }

    if (req.method === 'PATCH' && action === 'response' && resourceId) {
      // PATCH /quick-responses/response/:id - Update response
      const body = await req.json();
      return await updateResponse(supabase, organizationId, resourceId, body);
    }

    if (req.method === 'DELETE' && action === 'response' && resourceId) {
      // DELETE /quick-responses/response/:id - Delete response
      return await deleteResponse(supabase, organizationId, resourceId);
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[quick-responses] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function listCategories(supabase: any, organizationId: string, isTeacher: boolean) {
  // Get categories
  const { data: categories, error: catError } = await supabase
    .from('quick_response_categories')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_teacher_category', isTeacher)
    .order('sort_order', { ascending: true });

  if (catError) {
    console.error('[quick-responses] Error fetching categories:', catError);
    return new Response(
      JSON.stringify({ error: catError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get all responses for these categories
  const categoryIds = (categories || []).map((c: QuickResponseCategory) => c.id);
  
  let responses: QuickResponse[] = [];
  if (categoryIds.length > 0) {
    const { data: respData, error: respError } = await supabase
      .from('quick_responses')
      .select('*')
      .in('category_id', categoryIds)
      .order('sort_order', { ascending: true });

    if (respError) {
      console.error('[quick-responses] Error fetching responses:', respError);
    } else {
      responses = respData || [];
    }
  }

  // Combine categories with their responses
  const categoriesWithResponses = (categories || []).map((cat: QuickResponseCategory) => ({
    ...cat,
    responses: responses.filter((r: QuickResponse) => r.category_id === cat.id)
  }));

  return new Response(
    JSON.stringify({ categories: categoriesWithResponses }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createCategory(supabase: any, organizationId: string, body: any) {
  const { name, is_teacher_category = false } = body;

  if (!name) {
    return new Response(
      JSON.stringify({ error: 'Name is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get max sort_order
  const { data: existing } = await supabase
    .from('quick_response_categories')
    .select('sort_order')
    .eq('organization_id', organizationId)
    .eq('is_teacher_category', is_teacher_category)
    .order('sort_order', { ascending: false })
    .limit(1);

  const maxOrder = existing?.[0]?.sort_order || 0;

  const { data: category, error } = await supabase
    .from('quick_response_categories')
    .insert({
      name,
      organization_id: organizationId,
      is_teacher_category,
      sort_order: maxOrder + 1
    })
    .select()
    .single();

  if (error) {
    console.error('[quick-responses] Error creating category:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ category }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateCategory(supabase: any, organizationId: string, categoryId: string, body: any) {
  const { name } = body;

  const { data: category, error } = await supabase
    .from('quick_response_categories')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', categoryId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    console.error('[quick-responses] Error updating category:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ category }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteCategory(supabase: any, organizationId: string, categoryId: string) {
  // Delete all responses in this category first
  const { error: respError } = await supabase
    .from('quick_responses')
    .delete()
    .eq('category_id', categoryId);

  if (respError) {
    console.error('[quick-responses] Error deleting responses:', respError);
  }

  // Delete the category
  const { error } = await supabase
    .from('quick_response_categories')
    .delete()
    .eq('id', categoryId)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[quick-responses] Error deleting category:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createResponse(supabase: any, organizationId: string, body: any) {
  const { category_id, text } = body;

  if (!category_id || !text) {
    return new Response(
      JSON.stringify({ error: 'category_id and text are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify category belongs to organization
  const { data: category } = await supabase
    .from('quick_response_categories')
    .select('id')
    .eq('id', category_id)
    .eq('organization_id', organizationId)
    .single();

  if (!category) {
    return new Response(
      JSON.stringify({ error: 'Category not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get max sort_order
  const { data: existing } = await supabase
    .from('quick_responses')
    .select('sort_order')
    .eq('category_id', category_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const maxOrder = existing?.[0]?.sort_order || 0;

  const { data: response, error } = await supabase
    .from('quick_responses')
    .insert({
      category_id,
      text,
      organization_id: organizationId,
      sort_order: maxOrder + 1
    })
    .select()
    .single();

  if (error) {
    console.error('[quick-responses] Error creating response:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ response }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateResponse(supabase: any, organizationId: string, responseId: string, body: any) {
  const { text } = body;

  const { data: response, error } = await supabase
    .from('quick_responses')
    .update({ text, updated_at: new Date().toISOString() })
    .eq('id', responseId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    console.error('[quick-responses] Error updating response:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ response }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteResponse(supabase: any, organizationId: string, responseId: string) {
  const { error } = await supabase
    .from('quick_responses')
    .delete()
    .eq('id', responseId)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[quick-responses] Error deleting response:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Default templates for clients
const defaultClientTemplates = [
  {
    name: "Фирменные курсы",
    responses: [
      "Speaking club - это занятие для практических упражнений в устной речи, где участники могут свободно общаться на английском языке в непринужденной атмосфере.",
      "*Workshop - это имитация ситуаций,* которые возникают в поездках заграницей. За год мы проигрываем более 50 различных ситуаций.",
      "*Watch&Play - это авторский курс нашей школы,* который позволяет детям погружаться в мир мультфильмов, изучая английский язык."
    ]
  },
  {
    name: "Стоимость",
    responses: [
      "Стоимость индивидуальных занятий составляет 2500 рублей за урок 60 минут.",
      "Групповые занятия (2-4 человека) - 1800 рублей за урок на человека.",
      "Мини-группы (5-8 человек) - 1200 рублей за урок на человека."
    ]
  },
  {
    name: "Регистрация",
    responses: [
      "Для записи на пробное занятие нам потребуется ваше имя, контактный телефон и возраст ученика.",
      "Регистрация проходит через наш сайт или по телефону. Пробное занятие бесплатно!"
    ]
  },
  {
    name: "Тестирование",
    responses: [
      "Перед началом обучения мы проводим бесплатное тестирование для определения уровня знаний.",
      "Тестирование занимает около 30 минут и включает проверку грамматики, лексики и разговорных навыков."
    ]
  },
  {
    name: "Материнский капитал",
    responses: [
      "Да, мы принимаем оплату материнским капиталом для детей от 3 лет.",
      "Для оплаты материнским капиталом необходимо предоставить справку из ПФР и заключить договор."
    ]
  },
  {
    name: "Учебники",
    responses: [
      "Мы используем современные британские учебники Cambridge и Oxford.",
      "Все необходимые материалы предоставляются школой. Дополнительно покупать ничего не нужно."
    ]
  }
];

// Default templates for teachers
const defaultTeacherTemplates = [
  {
    name: "Расписание",
    responses: [
      "Добрый день! Подтверждаю ваше расписание на эту неделю.",
      "К сожалению, занятие придётся перенести. Предлагаю следующие варианты времени:",
      "Напоминаю о занятии завтра. Пожалуйста, подготовьте материалы."
    ]
  },
  {
    name: "Методика",
    responses: [
      "Пожалуйста, заполните методический отчёт до конца недели.",
      "Напоминаю о методическом совещании. Подготовьте материалы по вашим группам.",
      "Просьба ознакомиться с новыми методическими рекомендациями."
    ]
  },
  {
    name: "Оплата и документы",
    responses: [
      "Зарплата будет перечислена в стандартные сроки.",
      "Пожалуйста, проверьте табель учёта рабочего времени и подтвердите.",
      "Необходимо предоставить документы для оформления. Список прилагаю."
    ]
  },
  {
    name: "Ученики",
    responses: [
      "К вам добавлен новый ученик. Подробная информация в карточке.",
      "Прошу подготовить отчёт по успеваемости ваших учеников.",
      "Родители ученика просят связаться для обсуждения прогресса."
    ]
  },
  {
    name: "Общее",
    responses: [
      "Спасибо за информацию! Приняла к сведению.",
      "Хорошо, подтверждаю.",
      "Пожалуйста, уточните детали."
    ]
  }
];

async function importDefaultTemplates(supabase: any, organizationId: string, isTeacher: boolean) {
  const templates = isTeacher ? defaultTeacherTemplates : defaultClientTemplates;
  
  console.log(`[quick-responses] Importing ${templates.length} default categories for ${isTeacher ? 'teachers' : 'clients'}`);

  try {
    // Get existing categories to determine sort order
    const { data: existingCats } = await supabase
      .from('quick_response_categories')
      .select('sort_order')
      .eq('organization_id', organizationId)
      .eq('is_teacher_category', isTeacher)
      .order('sort_order', { ascending: false })
      .limit(1);

    let sortOrder = (existingCats?.[0]?.sort_order || 0) + 1;

    for (const template of templates) {
      // Create category
      const { data: category, error: catError } = await supabase
        .from('quick_response_categories')
        .insert({
          name: template.name,
          organization_id: organizationId,
          is_teacher_category: isTeacher,
          sort_order: sortOrder++
        })
        .select()
        .single();

      if (catError) {
        console.error('[quick-responses] Error creating category:', catError);
        continue;
      }

      // Create responses for this category
      let respSortOrder = 1;
      for (const text of template.responses) {
        const { error: respError } = await supabase
          .from('quick_responses')
          .insert({
            category_id: category.id,
            text,
            organization_id: organizationId,
            sort_order: respSortOrder++
          });

        if (respError) {
          console.error('[quick-responses] Error creating response:', respError);
        }
      }
    }

    // Fetch all categories with responses
    const { data: categories, error: fetchError } = await supabase
      .from('quick_response_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_teacher_category', isTeacher)
      .order('sort_order', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    const categoryIds = (categories || []).map((c: QuickResponseCategory) => c.id);
    let responses: QuickResponse[] = [];
    
    if (categoryIds.length > 0) {
      const { data: respData } = await supabase
        .from('quick_responses')
        .select('*')
        .in('category_id', categoryIds)
        .order('sort_order', { ascending: true });
      responses = respData || [];
    }

    const categoriesWithResponses = (categories || []).map((cat: QuickResponseCategory) => ({
      ...cat,
      responses: responses.filter((r: QuickResponse) => r.category_id === cat.id)
    }));

    return new Response(
      JSON.stringify({ categories: categoriesWithResponses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[quick-responses] Error importing defaults:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to import templates' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
