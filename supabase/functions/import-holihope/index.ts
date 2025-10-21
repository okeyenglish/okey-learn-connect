import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HOLIHOPE_DOMAIN = 'https://okeyenglish.t8s.ru/Api/V2';
const HOLIHOPE_API_KEY = 'eUhKlOpwAPTjOi8MgkVjms2DBY6jQPFrGPtfa8IyxpIZclH9wKMcTVGyumfvoWuJ';

interface ImportProgress {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  count?: number;
  message?: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action } = await req.json();
    
    const progress: ImportProgress[] = [];

    // Step 1: Clear existing data
    if (action === 'clear_data') {
      console.log('Starting data cleanup...');
      progress.push({ step: 'clear_data', status: 'in_progress', message: 'Clearing existing data' });

      try {
        // Delete in correct order due to foreign key constraints
        await supabase.from('lesson_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('individual_lesson_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('group_students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('learning_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('individual_lessons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('family_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('family_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('teachers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        progress[0].status = 'completed';
        progress[0].message = 'Data cleared successfully';
      } catch (error) {
        console.error('Error clearing data:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Import locations (branches)
    if (action === 'import_locations') {
      console.log('Importing locations...');
      progress.push({ step: 'import_locations', status: 'in_progress' });

      try {
        const url = `${HOLIHOPE_DOMAIN}/GetLocations`;
        console.log('Calling Holihope URL:', url);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ authkey: HOLIHOPE_API_KEY }),
        });
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP error ${response.status} at ${url} - body: ${text?.slice(0,300)}`);
        }
        
        const locations = await response.json();
        
        console.log(`Found ${locations.length} locations`);

        for (const location of locations) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('id')
            .eq('name', "O'KEY ENGLISH")
            .single();

          if (orgData) {
            // Check if branch exists
            const { data: existing } = await supabase
              .from('profiles')
              .select('branch')
              .eq('branch', location.name)
              .limit(1);

            if (!existing || existing.length === 0) {
              console.log(`Branch ${location.name} will be available for use`);
            }
          }
        }

        progress[0].status = 'completed';
        progress[0].count = locations.length;
        progress[0].message = `Imported ${locations.length} locations`;
      } catch (error) {
        console.error('Error importing locations:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Import teachers
    if (action === 'import_teachers') {
      console.log('Importing teachers...');
      progress.push({ step: 'import_teachers', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allTeachers = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetTeachers`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              authkey: HOLIHOPE_API_KEY,
              take: take,
              skip: skip
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const teachers = await response.json();
          
          if (!teachers || teachers.length === 0) break;
          
          allTeachers = allTeachers.concat(teachers);
          skip += take;
          
          if (teachers.length < take) break;
        }

        console.log(`Found ${allTeachers.length} teachers`);

        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', "O'KEY ENGLISH")
          .single();

        for (const teacher of allTeachers) {
          const teacherData = {
            first_name: teacher.firstName || '',
            last_name: teacher.lastName || '',
            email: teacher.email || null,
            phone: teacher.phone || null,
            subjects: teacher.subjects ? [teacher.subjects] : [],
            categories: teacher.categories ? [teacher.categories] : [],
            branch: teacher.location || 'Окская',
            is_active: teacher.isActive !== false,
            organization_id: orgData?.id,
            external_id: teacher.id?.toString(),
          };

          const { error } = await supabase
            .from('teachers')
            .upsert(teacherData, { onConflict: 'external_id' });

          if (error) {
            console.error(`Error importing teacher ${teacher.lastName}:`, error);
          }
        }

        progress[0].status = 'completed';
        progress[0].count = allTeachers.length;
        progress[0].message = `Imported ${allTeachers.length} teachers`;
      } catch (error) {
        console.error('Error importing teachers:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 4: Import clients
    if (action === 'import_clients') {
      console.log('Importing clients...');
      progress.push({ step: 'import_clients', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allClients = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetClients`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              authkey: HOLIHOPE_API_KEY,
              take: take,
              skip: skip
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const clients = await response.json();
          
          if (!clients || clients.length === 0) break;
          
          allClients = allClients.concat(clients);
          skip += take;
          
          if (clients.length < take) break;
        }

        console.log(`Found ${allClients.length} clients`);

        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', "O'KEY ENGLISH")
          .single();

        for (const client of allClients) {
          const clientData = {
            name: `${client.lastName || ''} ${client.firstName || ''}`.trim() || 'Без имени',
            phone: client.phone || client.mobile || '',
            email: client.email || null,
            branch: client.location || 'Окская',
            notes: client.comment || null,
            organization_id: orgData?.id,
            external_id: client.id?.toString(),
          };

          const { data: insertedClient, error } = await supabase
            .from('clients')
            .upsert(clientData, { onConflict: 'external_id' })
            .select()
            .single();

          if (error) {
            console.error(`Error importing client ${client.lastName}:`, error);
          } else if (client.phone || client.mobile) {
            // Add phone number
            await supabase.from('client_phone_numbers').upsert({
              client_id: insertedClient.id,
              phone: client.phone || client.mobile,
              is_primary: true,
              is_whatsapp_enabled: true,
            });
          }
        }

        progress[0].status = 'completed';
        progress[0].count = allClients.length;
        progress[0].message = `Imported ${allClients.length} clients`;
      } catch (error) {
        console.error('Error importing clients:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 5: Import students
    if (action === 'import_students') {
      console.log('Importing students...');
      progress.push({ step: 'import_students', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allStudents = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetStudents`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              authkey: HOLIHOPE_API_KEY,
              take: take,
              skip: skip
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const students = await response.json();
          
          if (!students || students.length === 0) break;
          
          allStudents = allStudents.concat(students);
          skip += take;
          
          if (students.length < take) break;
        }

        console.log(`Found ${allStudents.length} students`);

        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', "O'KEY ENGLISH")
          .single();

        for (const student of allStudents) {
          // Find or create family group
          let familyGroupId = null;
          
          if (student.clientId) {
            const { data: client } = await supabase
              .from('clients')
              .select('id')
              .eq('external_id', student.clientId.toString())
              .single();

            if (client) {
              // Create or get family group
              const { data: familyGroup } = await supabase
                .from('family_groups')
                .upsert({
                  name: `Семья ${student.lastName || ''}`,
                  branch: student.location || 'Окская',
                  organization_id: orgData?.id,
                }, { onConflict: 'name,organization_id' })
                .select()
                .single();

              if (familyGroup) {
                familyGroupId = familyGroup.id;

                // Link client to family
                await supabase.from('family_members').upsert({
                  family_group_id: familyGroup.id,
                  client_id: client.id,
                  is_primary_contact: true,
                  relationship_type: 'main',
                });
              }
            }
          }

          const studentData = {
            first_name: student.firstName || '',
            last_name: student.lastName || '',
            date_of_birth: student.dateOfBirth || null,
            phone: student.phone || null,
            email: student.email || null,
            branch: student.location || 'Окская',
            status: student.status === 'Active' ? 'active' : 
                    student.status === 'Archived' ? 'archived' : 'lead',
            notes: student.comment || null,
            family_group_id: familyGroupId,
            organization_id: orgData?.id,
            external_id: student.id?.toString(),
          };

          const { error } = await supabase
            .from('students')
            .upsert(studentData, { onConflict: 'external_id' });

          if (error) {
            console.error(`Error importing student ${student.lastName}:`, error);
          }
        }

        progress[0].status = 'completed';
        progress[0].count = allStudents.length;
        progress[0].message = `Imported ${allStudents.length} students`;
      } catch (error) {
        console.error('Error importing students:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 6: Import educational units (groups)
    if (action === 'import_groups') {
      console.log('Importing educational units (groups)...');
      progress.push({ step: 'import_groups', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allGroups = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEdUnits`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              authkey: HOLIHOPE_API_KEY,
              take: take,
              skip: skip
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const groups = await response.json();
          
          if (!groups || groups.length === 0) break;
          
          allGroups = allGroups.concat(groups);
          skip += take;
          
          if (groups.length < take) break;
        }

        console.log(`Found ${allGroups.length} educational units`);

        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', "O'KEY ENGLISH")
          .single();

        for (const group of allGroups) {
          // Find teacher
          let teacherId = null;
          if (group.teacherId) {
            const { data: teacher } = await supabase
              .from('teachers')
              .select('id')
              .eq('external_id', group.teacherId.toString())
              .single();
            teacherId = teacher?.id;
          }

          // Create group
          const groupData = {
            name: group.name || 'Без названия',
            branch: group.location || 'Окская',
            course: group.course || null,
            category: group.category || null,
            level: group.level || null,
            teacher_id: teacherId,
            schedule: group.schedule || null,
            status: group.isActive !== false ? 'active' : 'archived',
            start_date: group.startDate || null,
            end_date: group.endDate || null,
            lesson_duration: group.lessonDuration || 80,
            max_students: group.maxStudents || 8,
            organization_id: orgData?.id,
            external_id: group.id?.toString(),
          };

          const { data: insertedGroup, error: groupError } = await supabase
            .from('learning_groups')
            .upsert(groupData, { onConflict: 'external_id' })
            .select()
            .single();

          if (groupError) {
            console.error(`Error importing group ${group.name}:`, groupError);
            continue;
          }

          // Add students to group
          if (group.studentIds && Array.isArray(group.studentIds)) {
            for (const studentExtId of group.studentIds) {
              const { data: student } = await supabase
                .from('students')
                .select('id')
                .eq('external_id', studentExtId.toString())
                .single();

              if (student) {
                await supabase.from('group_students').upsert({
                  group_id: insertedGroup.id,
                  student_id: student.id,
                  enrollment_date: group.startDate || new Date().toISOString().split('T')[0],
                  status: 'active',
                }, { onConflict: 'group_id,student_id' });
              }
            }
          }
        }

        progress[0].status = 'completed';
        progress[0].count = allGroups.length;
        progress[0].message = `Imported ${allGroups.length} groups`;
      } catch (error) {
        console.error('Error importing groups:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 7: Import schedule/lessons
    if (action === 'import_schedule') {
      console.log('Importing schedule...');
      progress.push({ step: 'import_schedule', status: 'in_progress' });

      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetSchedule`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            authkey: HOLIHOPE_API_KEY,
            queryDays: true
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const schedule = await response.json();
        
        console.log(`Found ${schedule.length} schedule items`);

        for (const lesson of schedule) {
          // Find group
          const { data: group } = await supabase
            .from('learning_groups')
            .select('id')
            .eq('external_id', lesson.edUnitId?.toString())
            .single();

          if (!group) continue;

          // Create lesson session
          const sessionData = {
            group_id: group.id,
            lesson_date: lesson.date,
            start_time: lesson.startTime || '10:00',
            end_time: lesson.endTime || '11:20',
            status: lesson.status === 'Completed' ? 'completed' :
                   lesson.status === 'Cancelled' ? 'cancelled' : 'scheduled',
            topic: lesson.topic || null,
            homework: lesson.homework || null,
            notes: lesson.notes || null,
            external_id: lesson.id?.toString(),
          };

          const { error } = await supabase
            .from('lesson_sessions')
            .upsert(sessionData, { onConflict: 'external_id' });

          if (error) {
            console.error(`Error importing lesson:`, error);
          }
        }

        progress[0].status = 'completed';
        progress[0].count = schedule.length;
        progress[0].message = `Imported ${schedule.length} lessons`;
      } catch (error) {
        console.error('Error importing schedule:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 8: Import payments
    if (action === 'import_payments') {
      console.log('Importing payments...');
      progress.push({ step: 'import_payments', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allPayments = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetPayments`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              authkey: HOLIHOPE_API_KEY,
              take: take,
              skip: skip
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const payments = await response.json();
          
          if (!payments || payments.length === 0) break;
          
          allPayments = allPayments.concat(payments);
          skip += take;
          
          if (payments.length < take) break;
        }

        console.log(`Found ${allPayments.length} payments`);

        for (const payment of allPayments) {
          // Find student
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('external_id', payment.studentId?.toString())
            .single();

          if (!student) continue;

          const paymentData = {
            student_id: student.id,
            amount: payment.amount || 0,
            payment_date: payment.date || new Date().toISOString(),
            payment_method: payment.method || 'cash',
            description: payment.description || null,
            external_id: payment.id?.toString(),
          };

          const { error } = await supabase
            .from('payments')
            .upsert(paymentData, { onConflict: 'external_id' });

          if (error) {
            console.error(`Error importing payment:`, error);
          }
        }

        progress[0].status = 'completed';
        progress[0].count = allPayments.length;
        progress[0].message = `Imported ${allPayments.length} payments`;
      } catch (error) {
        console.error('Error importing payments:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
