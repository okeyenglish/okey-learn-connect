import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_PASSWORD = 'Demo123456!'

const demoUsers = [
  { id: '10000000-0000-0000-0000-000000000001', email: 'demo-admin@academius.ru', firstName: 'Иван', lastName: 'Администраторов', phone: '+79000000001', role: 'admin' },
  { id: '10000000-0000-0000-0000-000000000002', email: 'demo-teacher@academius.ru', firstName: 'Мария', lastName: 'Учителева', phone: '+79000000002', role: 'teacher' },
  { id: '10000000-0000-0000-0000-000000000003', email: 'demo-student@academius.ru', firstName: 'Анна', lastName: 'Студентова', phone: '+79000000003', role: 'student' },
  { id: '10000000-0000-0000-0000-000000000004', email: 'demo-parent@academius.ru', firstName: 'Петр', lastName: 'Родителев', phone: '+79000000004', role: 'parent' },
  { id: '10000000-0000-0000-0000-000000000005', email: 'demo-branch-manager@academius.ru', firstName: 'Ольга', lastName: 'Филиалова', phone: '+79000000005', role: 'branch_manager' },
  { id: '10000000-0000-0000-0000-000000000006', email: 'demo-methodist@academius.ru', firstName: 'Елена', lastName: 'Методистова', phone: '+79000000006', role: 'methodist' },
  { id: '10000000-0000-0000-0000-000000000007', email: 'demo-head-teacher@academius.ru', firstName: 'Сергей', lastName: 'Старшийучитель', phone: '+79000000007', role: 'head_teacher' },
  { id: '10000000-0000-0000-0000-000000000008', email: 'demo-sales-manager@academius.ru', firstName: 'Дмитрий', lastName: 'Продавец', phone: '+79000000008', role: 'sales_manager' },
  { id: '10000000-0000-0000-0000-000000000009', email: 'demo-marketing-manager@academius.ru', firstName: 'Алиса', lastName: 'Маркетолог', phone: '+79000000009', role: 'marketing_manager' },
  { id: '10000000-0000-0000-0000-000000000010', email: 'demo-manager@academius.ru', firstName: 'Николай', lastName: 'Менеджеров', phone: '+79000000010', role: 'manager' },
  { id: '10000000-0000-0000-0000-000000000011', email: 'demo-accountant@academius.ru', firstName: 'Татьяна', lastName: 'Бухгалтерова', phone: '+79000000011', role: 'accountant' },
  { id: '10000000-0000-0000-0000-000000000012', email: 'demo-receptionist@academius.ru', firstName: 'Ксения', lastName: 'Ресепшионистова', phone: '+79000000012', role: 'receptionist' },
  { id: '10000000-0000-0000-0000-000000000013', email: 'demo-support@academius.ru', firstName: 'Максим', lastName: 'Поддержкин', phone: '+79000000013', role: 'support' },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // First, ensure demo organization exists
    const { error: orgError } = await supabaseAdmin
      .from('organizations')
      .upsert({
        id: DEMO_ORG_ID,
        name: 'Демо Школа Академиус',
        slug: 'demo-school',
        subscription_tier: 'free'
      }, { onConflict: 'id' })

    if (orgError) {
      console.error('Error creating demo organization:', orgError)
    }

    const results = []

    for (const user of demoUsers) {
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: {
            first_name: user.firstName,
            last_name: user.lastName
          }
        })

        if (authError) {
          // If user already exists, that's okay
          if (authError.message.includes('already registered')) {
            results.push({ email: user.email, status: 'already_exists' })
            continue
          }
          throw authError
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authData.user.id,
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
            phone: user.phone,
            organization_id: DEMO_ORG_ID
          }, { onConflict: 'id' })

        if (profileError) {
          console.error(`Error creating profile for ${user.email}:`, profileError)
        }

        // Assign role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .upsert({
            user_id: authData.user.id,
            role: user.role
          }, { onConflict: 'user_id,role' })

        if (roleError) {
          console.error(`Error assigning role for ${user.email}:`, roleError)
        }

        // Create related domain entities for demo roles
        try {
          if (user.role === 'student') {
            // Ensure family group exists (use user id as deterministic group id)
            const familyGroupId = authData.user.id;
            const { error: fgError } = await supabaseAdmin
              .from('family_groups')
              .upsert({
                id: familyGroupId,
                name: `Демо семья ${user.lastName}`,
                organization_id: DEMO_ORG_ID,
                branch: 'Главный'
              }, { onConflict: 'id' });
            if (fgError) console.error('Error creating demo family group:', fgError);

            // Create a simple demo student linked to this account
            const { error: studError } = await supabaseAdmin
              .from('students')
              .upsert({
                id: authData.user.id, // map 1:1 for demo
                name: `${user.firstName} ${user.lastName}`,
                first_name: user.firstName,
                last_name: user.lastName,
                lk_email: user.email,
                phone: user.phone,
                age: 16,
                family_group_id: familyGroupId,
                organization_id: DEMO_ORG_ID,
                status: 'active'
              }, { onConflict: 'id' });
            if (studError) console.error('Error creating demo student:', studError);
          }

          if (user.role === 'teacher') {
            // Create a simple active teacher mapped to profile
            const { error: teacherError } = await supabaseAdmin
              .from('teachers')
              .upsert({
                id: authData.user.id, // map 1:1 for demo
                first_name: user.firstName,
                last_name: user.lastName,
                email: user.email,
                phone: user.phone,
                profile_id: authData.user.id,
                is_active: true,
                branch: 'Главный'
              }, { onConflict: 'id' });
            if (teacherError) console.error('Error creating demo teacher:', teacherError);
          }
        } catch (e) {
          console.error('Error creating domain entities:', e);
        }

        results.push({ 
          email: user.email, 
          status: 'created',
          userId: authData.user.id
        })

      } catch (error) {
        console.error(`Error creating user ${user.email}:`, error)
        results.push({ 
          email: user.email, 
          status: 'error',
          error: error.message 
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        password: DEMO_PASSWORD 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
