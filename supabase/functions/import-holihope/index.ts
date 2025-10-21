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
        const url = `${HOLIHOPE_DOMAIN}/GetOffices?authkey=${HOLIHOPE_API_KEY}`;
        console.log('Calling Holihope URL:', url);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP error ${response.status} at ${url} - body: ${text?.slice(0,300)}`);
        }
        
        const responseData = await response.json();
        console.log('API Response structure:', JSON.stringify(responseData).slice(0, 500));
        
        // Нормализуем массив офисов из возможных структур
        let offices: any[] = [];
        if (Array.isArray(responseData)) {
          offices = responseData;
        } else if (Array.isArray(responseData?.Offices)) {
          offices = responseData.Offices;
        } else if (Array.isArray(responseData?.offices)) {
          offices = responseData.offices;
        } else if (responseData && typeof responseData === 'object') {
          const firstArray = Object.values(responseData).find((v) => Array.isArray(v)) as any[] | undefined;
          if (firstArray) offices = firstArray;
        }
        console.log('Offices meta:', {
          isArray: Array.isArray(offices),
          length: offices?.length ?? null,
          keys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
        });
        
        console.log(`Found ${offices.length} offices`);

        for (const office of offices) {
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
              .eq('branch', (office.Name || office.name))
              .limit(1);
 
            if (!existing || existing.length === 0) {
              console.log(`Branch ${(office.Name || office.name)} will be available for use`);
            }
          }
        }

        progress[0].status = 'completed';
        progress[0].count = offices.length;
        progress[0].message = `Imported ${offices.length} offices`;
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
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetTeachers?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
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
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetClients?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
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

    // Step 5: Import leads (potential students who haven't started training)
    if (action === 'import_leads') {
      console.log('Importing leads...');
      progress.push({ step: 'import_leads', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allLeads = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetLeads?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const leads = await response.json();
          
          if (!leads || leads.length === 0) break;
          
          allLeads = allLeads.concat(leads);
          skip += take;
          
          if (leads.length < take) break;
        }

        console.log(`Found ${allLeads.length} leads`);

        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', "O'KEY ENGLISH")
          .single();

        let importedCount = 0;
        let updatedCount = 0;
        let linkedToParents = 0;

        for (const lead of allLeads) {
          let familyGroupId = null;

          // Try to find parent by clientId
          if (lead.clientId) {
            const { data: client } = await supabase
              .from('clients')
              .select('id')
              .eq('external_id', lead.clientId.toString())
              .single();

            if (client) {
              // Create or get family group
              const { data: familyGroup } = await supabase
                .from('family_groups')
                .upsert({
                  name: `Семья ${lead.lastName || 'Лида'}`,
                  branch: lead.location || lead.branch || 'Окская',
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
                  relationship_type: 'parent',
                });

                linkedToParents++;
              }
            }
          }

          // Lead data
          const leadData = {
            first_name: lead.firstName || '',
            last_name: lead.lastName || '',
            phone: lead.phone || null,
            email: lead.email || null,
            age: lead.age || null,
            branch: lead.location || lead.branch || 'Окская',
            status: 'lead',
            preferred_subject: lead.subject || null,
            level: lead.level || null,
            notes: lead.notes || lead.comment || null,
            family_group_id: familyGroupId,
            organization_id: orgData?.id,
            external_id: lead.id?.toString(),
          };

          // Check if lead already exists
          const { data: existingLead } = await supabase
            .from('students')
            .select('id')
            .eq('external_id', lead.id?.toString())
            .single();

          if (existingLead) {
            await supabase
              .from('students')
              .update(leadData)
              .eq('id', existingLead.id);
            updatedCount++;
          } else {
            await supabase.from('students').insert(leadData);
            importedCount++;
          }
        }

        progress[0].status = 'completed';
        progress[0].count = importedCount + updatedCount;
        progress[0].message = `Created ${importedCount}, updated ${updatedCount} leads (${linkedToParents} linked to parents)`;
      } catch (error) {
        console.error('Error importing leads:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 6: Import students
    if (action === 'import_students') {
      console.log('Importing students...');
      progress.push({ step: 'import_students', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allStudents = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetStudents?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
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
            status: student.status === 'Active' ? 'active' : 'archived',
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
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEdUnits?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
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
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetSchedule?authkey=${HOLIHOPE_API_KEY}&queryDays=true`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
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
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetPayments?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
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

    // ==================== NEW IMPORT BLOCKS ====================
    
    // Preview: Disciplines
    if (action === 'preview_disciplines') {
      console.log('Previewing disciplines...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetDisciplines?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const disciplines = await response.json();
        
        return new Response(JSON.stringify({
          preview: true,
          total: disciplines.length,
          sample: disciplines.slice(0, 20),
          mapping: { "id": "external_id", "name": "name (languages)" },
          entityType: "disciplines"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Preview error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Disciplines
    if (action === 'import_disciplines') {
      console.log('Importing disciplines...');
      progress.push({ step: 'import_disciplines', status: 'in_progress' });

      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetDisciplines?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const disciplines = await response.json();
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const discipline of disciplines) {
          await supabase.from('disciplines').upsert({
            name: discipline.name || 'Без названия',
            description: discipline.description || null,
            is_active: discipline.isActive !== false,
            sort_order: discipline.sortOrder || 0,
            organization_id: orgData?.id,
            external_id: discipline.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} disciplines`;
      } catch (error) {
        console.error('Error importing disciplines:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Levels
    if (action === 'preview_levels') {
      console.log('Previewing levels...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetLevels?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const levels = await response.json();
        
        return new Response(JSON.stringify({
          preview: true,
          total: levels.length,
          sample: levels.slice(0, 20),
          mapping: { "id": "external_id", "name": "name (A1-C2)" },
          entityType: "levels"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Levels
    if (action === 'import_levels') {
      console.log('Importing levels...');
      progress.push({ step: 'import_levels', status: 'in_progress' });

      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetLevels?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const levels = await response.json();
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const level of levels) {
          await supabase.from('proficiency_levels').upsert({
            name: level.name || 'Без названия',
            description: level.description || null,
            level_order: level.order || 0,
            is_active: level.isActive !== false,
            organization_id: orgData?.id,
            external_id: level.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} levels`;
      } catch (error) {
        console.error('Error importing levels:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Employees
    if (action === 'preview_employees') {
      console.log('Previewing employees...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEmployees?authkey=${HOLIHOPE_API_KEY}&take=20&skip=0`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const employees = await response.json();
        const validEmployees = employees.filter(emp => emp.position && emp.position.toLowerCase() !== 'none');
        
        return new Response(JSON.stringify({
          preview: true,
          total: validEmployees.length,
          sample: validEmployees.slice(0, 20),
          mapping: { "id": "external_id", "firstName/lastName": "first_name/last_name", "position": "position (skip 'none')" },
          entityType: "employees",
          note: "Employees with position='none' are skipped"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Employees
    if (action === 'import_employees') {
      console.log('Importing employees...');
      progress.push({ step: 'import_employees', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allEmployees = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEmployees?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const employees = await response.json();
          
          if (!employees || employees.length === 0) break;
          
          const validEmployees = employees.filter(emp => emp.position && emp.position.toLowerCase() !== 'none');
          allEmployees = allEmployees.concat(validEmployees);
          
          skip += take;
          if (employees.length < take) break;
        }
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        const positionMap = {
          'manager': 'manager',
          'methodist': 'methodist',
          'administrator': 'administrator',
          'director': 'director',
          'accountant': 'accountant',
        };
        
        let importedCount = 0;
        for (const employee of allEmployees) {
          await supabase.from('employees').upsert({
            first_name: employee.firstName || '',
            last_name: employee.lastName || '',
            middle_name: employee.middleName || null,
            phone: employee.phone || null,
            email: employee.email || null,
            position: positionMap[employee.position?.toLowerCase()] || 'other',
            branch: employee.location || employee.branch || null,
            is_active: employee.isActive !== false,
            hire_date: employee.hireDate || null,
            organization_id: orgData?.id,
            external_id: employee.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} employees (skipped position='none')`;
      } catch (error) {
        console.error('Error importing employees:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Educational Units (all types)
    if (action === 'preview_ed_units') {
      console.log('Previewing educational units...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEdUnits?authkey=${HOLIHOPE_API_KEY}&take=20&skip=0`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const units = await response.json();
        
        const typeStats = {};
        units.forEach(u => {
          const type = u.type || u.unitType || 'Unknown';
          typeStats[type] = (typeStats[type] || 0) + 1;
        });
        
        return new Response(JSON.stringify({
          preview: true,
          total: units.length,
          typeBreakdown: typeStats,
          sample: units.slice(0, 20),
          mapping: { "type/unitType": "unit_type (Group, MiniGroup, Individual, TrialLesson, etc.)" },
          entityType: "educational_units",
          note: "Imports ALL types of educational units"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Educational Units
    if (action === 'import_ed_units') {
      console.log('Importing educational units...');
      progress.push({ step: 'import_ed_units', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allUnits = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEdUnits?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const units = await response.json();
          
          if (!units || units.length === 0) break;
          allUnits = allUnits.concat(units);
          
          skip += take;
          if (units.length < take) break;
        }
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        let typeStats = {};
        
        for (const unit of allUnits) {
          const unitType = unit.type || unit.unitType || 'Group';
          typeStats[unitType] = (typeStats[unitType] || 0) + 1;
          
          let teacherId = null;
          if (unit.teacherId) {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('external_id', unit.teacherId.toString()).single();
            teacherId = teacher?.id;
          }
          
          await supabase.from('educational_units').upsert({
            name: unit.name || 'Без названия',
            unit_type: unitType,
            branch: unit.location || unit.branch || 'Окская',
            subject: unit.subject || unit.discipline || null,
            level: unit.level || null,
            teacher_id: teacherId,
            status: unit.isActive !== false ? 'active' : 'archived',
            start_date: unit.startDate || null,
            end_date: unit.endDate || null,
            max_students: unit.maxStudents || 12,
            schedule_days: unit.scheduleDays || null,
            schedule_time: unit.scheduleTime || null,
            schedule_room: unit.classroom || unit.room || null,
            price: unit.price || null,
            description: unit.description || null,
            organization_id: orgData?.id,
            external_id: unit.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} educational units: ${JSON.stringify(typeStats)}`;
      } catch (error) {
        console.error('Error importing educational units:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Ed Unit Students
    if (action === 'preview_ed_unit_students') {
      console.log('Previewing ed unit students...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEdUnitStudents?authkey=${HOLIHOPE_API_KEY}&take=20&skip=0`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const links = await response.json();
        
        return new Response(JSON.stringify({
          preview: true,
          total: links.length,
          sample: links.slice(0, 20),
          mapping: { "edUnitId": "ed_unit_id", "studentId": "student_id" },
          entityType: "ed_unit_students"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Ed Unit Students
    if (action === 'import_ed_unit_students') {
      console.log('Importing ed unit students...');
      progress.push({ step: 'import_ed_unit_students', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allLinks = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEdUnitStudents?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const links = await response.json();
          
          if (!links || links.length === 0) break;
          allLinks = allLinks.concat(links);
          
          skip += take;
          if (links.length < take) break;
        }
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const link of allLinks) {
          const { data: edUnit } = await supabase.from('educational_units').select('id').eq('external_id', link.edUnitId?.toString()).single();
          if (!edUnit) continue;
          
          const { data: student } = await supabase.from('students').select('id').eq('external_id', link.studentId?.toString()).single();
          if (!student) continue;
          
          await supabase.from('ed_unit_students').upsert({
            ed_unit_id: edUnit.id,
            student_id: student.id,
            enrollment_date: link.enrollmentDate || new Date().toISOString().split('T')[0],
            exit_date: link.exitDate || null,
            status: link.status || 'active',
            notes: link.notes || null,
            organization_id: orgData?.id,
            external_id: link.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} ed unit-student links`;
      } catch (error) {
        console.error('Error importing ed unit students:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Balances
    if (action === 'preview_balances') {
      console.log('Previewing balances...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetBalances?authkey=${HOLIHOPE_API_KEY}&take=20&skip=0`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const balances = await response.json();
        
        return new Response(JSON.stringify({
          preview: true,
          total: balances.length,
          sample: balances.slice(0, 20),
          mapping: { "studentId": "student_id", "balance": "balance" },
          entityType: "balances"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Balances
    if (action === 'import_balances') {
      console.log('Importing balances...');
      progress.push({ step: 'import_balances', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allBalances = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetBalances?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const balances = await response.json();
          
          if (!balances || balances.length === 0) break;
          allBalances = allBalances.concat(balances);
          
          skip += take;
          if (balances.length < take) break;
        }
        
        let importedCount = 0;
        for (const balance of allBalances) {
          const { data: student } = await supabase.from('students').select('id').eq('external_id', balance.studentId?.toString()).single();
          if (!student) continue;
          
          await supabase.from('student_balances').upsert({
            student_id: student.id,
            balance: balance.balance || 0,
          }, { onConflict: 'student_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} student balances`;
      } catch (error) {
        console.error('Error importing balances:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Transactions
    if (action === 'preview_transactions') {
      console.log('Previewing transactions...');
      try {
        const { data: clients } = await supabase.from('clients').select('id, external_id').not('external_id', 'is', null).limit(5);
        
        if (!clients || clients.length === 0) {
          throw new Error('No clients found. Import clients first.');
        }
        
        let allTransactions = [];
        for (const client of clients) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetIncomesAndOutgoes?authkey=${HOLIHOPE_API_KEY}&clientId=${client.external_id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (response.ok) {
            const transactions = await response.json();
            if (transactions && Array.isArray(transactions)) {
              allTransactions = allTransactions.concat(transactions);
            }
          }
        }
        
        return new Response(JSON.stringify({
          preview: true,
          total: allTransactions.length,
          clientsProcessed: clients.length,
          sample: allTransactions.slice(0, 20),
          mapping: { "clientId": "client_id → student_id", "amount": "amount (+/-)" },
          entityType: "transactions",
          note: "Fetched per client using GetIncomesAndOutgoes"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Transactions
    if (action === 'import_transactions') {
      console.log('Importing transactions...');
      progress.push({ step: 'import_transactions', status: 'in_progress' });

      try {
        const { data: clients } = await supabase.from('clients').select('id, external_id').not('external_id', 'is', null);
        
        if (!clients || clients.length === 0) {
          throw new Error('No clients found. Import clients first.');
        }
        
        let allTransactions = [];
        let clientsProcessed = 0;
        
        for (const client of clients) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetIncomesAndOutgoes?authkey=${HOLIHOPE_API_KEY}&clientId=${client.external_id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) continue;
          
          const transactions = await response.json();
          if (transactions && Array.isArray(transactions)) {
            transactions.forEach(t => t._clientId = client.id);
            allTransactions = allTransactions.concat(transactions);
          }
          clientsProcessed++;
        }
        
        let importedCount = 0;
        for (const transaction of allTransactions) {
          const { data: familyMembers } = await supabase.from('family_members').select('family_group_id').eq('client_id', transaction._clientId);
          if (!familyMembers || familyMembers.length === 0) continue;
          
          const familyGroupId = familyMembers[0].family_group_id;
          const { data: students } = await supabase.from('students').select('id').eq('family_group_id', familyGroupId);
          if (!students || students.length === 0) continue;
          
          for (const student of students) {
            const amount = Math.abs(transaction.amount || 0);
            const type = transaction.amount >= 0 ? 'credit' : 'debit';
            
            await supabase.from('balance_transactions').insert({
              student_id: student.id,
              amount: amount,
              transaction_type: type,
              description: transaction.description || `${type === 'credit' ? 'Поступление' : 'Списание'} от ${transaction.date}`,
            });
            importedCount++;
          }
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} transactions from ${clientsProcessed} clients`;
      } catch (error) {
        console.error('Error importing transactions:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Academic Reports
    if (action === 'preview_academic_reports') {
      console.log('Previewing academic reports...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEdUnitStudentReports?authkey=${HOLIHOPE_API_KEY}&take=20&skip=0`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const reports = await response.json();
        
        return new Response(JSON.stringify({
          preview: true,
          total: reports.length,
          sample: reports.slice(0, 20),
          mapping: { "studentId": "student_id", "teacherId": "teacher_id", "scores": "attendance/homework/participation/overall" },
          entityType: "academic_reports"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Academic Reports
    if (action === 'import_academic_reports') {
      console.log('Importing academic reports...');
      progress.push({ step: 'import_academic_reports', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allReports = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEdUnitStudentReports?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const reports = await response.json();
          
          if (!reports || reports.length === 0) break;
          allReports = allReports.concat(reports);
          
          skip += take;
          if (reports.length < take) break;
        }
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const report of allReports) {
          const { data: edUnit } = await supabase.from('educational_units').select('id').eq('external_id', report.edUnitId?.toString()).single();
          const { data: student } = await supabase.from('students').select('id').eq('external_id', report.studentId?.toString()).single();
          if (!student) continue;
          
          let teacherId = null;
          if (report.teacherId) {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('external_id', report.teacherId.toString()).single();
            teacherId = teacher?.id;
          }
          
          await supabase.from('academic_reports').upsert({
            ed_unit_id: edUnit?.id,
            student_id: student.id,
            report_date: report.reportDate || new Date().toISOString().split('T')[0],
            teacher_id: teacherId,
            attendance_score: report.attendanceScore || null,
            homework_score: report.homeworkScore || null,
            participation_score: report.participationScore || null,
            overall_score: report.overallScore || null,
            comments: report.comments || null,
            organization_id: orgData?.id,
            external_id: report.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} academic reports`;
      } catch (error) {
        console.error('Error importing academic reports:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Personal Tests
    if (action === 'preview_personal_tests') {
      console.log('Previewing personal tests...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetPersonalTestResults?authkey=${HOLIHOPE_API_KEY}&take=20&skip=0`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const tests = await response.json();
        
        return new Response(JSON.stringify({
          preview: true,
          total: tests.length,
          sample: tests.slice(0, 20),
          mapping: { "studentId": "student_id", "testName": "test_name", "score/maxScore": "score/max_score" },
          entityType: "personal_tests"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Personal Tests
    if (action === 'import_personal_tests') {
      console.log('Importing personal tests...');
      progress.push({ step: 'import_personal_tests', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allTests = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetPersonalTestResults?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const tests = await response.json();
          
          if (!tests || tests.length === 0) break;
          allTests = allTests.concat(tests);
          
          skip += take;
          if (tests.length < take) break;
        }
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const test of allTests) {
          const { data: student } = await supabase.from('students').select('id').eq('external_id', test.studentId?.toString()).single();
          if (!student) continue;
          
          await supabase.from('personal_tests').upsert({
            student_id: student.id,
            test_name: test.testName || 'Без названия',
            test_date: test.testDate || new Date().toISOString().split('T')[0],
            subject: test.subject || null,
            level: test.level || null,
            score: test.score || null,
            max_score: test.maxScore || null,
            percentage: test.percentage || null,
            passed: test.passed || false,
            comments: test.comments || null,
            organization_id: orgData?.id,
            external_id: test.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} personal tests`;
      } catch (error) {
        console.error('Error importing personal tests:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Group Tests
    if (action === 'preview_group_tests') {
      console.log('Previewing group tests...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEdUnitTestResults?authkey=${HOLIHOPE_API_KEY}&take=20&skip=0`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const tests = await response.json();
        
        return new Response(JSON.stringify({
          preview: true,
          total: tests.length,
          sample: tests.slice(0, 20),
          mapping: { "edUnitId": "ed_unit_id", "testName": "test_name", "averageScore": "average_score" },
          entityType: "group_tests"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Group Tests
    if (action === 'import_group_tests') {
      console.log('Importing group tests...');
      progress.push({ step: 'import_group_tests', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allTests = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEdUnitTestResults?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const tests = await response.json();
          
          if (!tests || tests.length === 0) break;
          allTests = allTests.concat(tests);
          
          skip += take;
          if (tests.length < take) break;
        }
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const test of allTests) {
          const { data: edUnit } = await supabase.from('educational_units').select('id').eq('external_id', test.edUnitId?.toString()).single();
          if (!edUnit) continue;
          
          await supabase.from('group_tests').upsert({
            ed_unit_id: edUnit.id,
            test_name: test.testName || 'Без названия',
            test_date: test.testDate || new Date().toISOString().split('T')[0],
            subject: test.subject || null,
            level: test.level || null,
            max_score: test.maxScore || null,
            average_score: test.averageScore || null,
            comments: test.comments || null,
            organization_id: orgData?.id,
            external_id: test.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} group tests`;
      } catch (error) {
        console.error('Error importing group tests:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Lesson Plans
    if (action === 'preview_lesson_plans') {
      console.log('Previewing lesson plans...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetLessonPlans?authkey=${HOLIHOPE_API_KEY}&take=20&skip=0`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const plans = await response.json();
        
        return new Response(JSON.stringify({
          preview: true,
          total: plans.length,
          sample: plans.slice(0, 20),
          mapping: { "edUnitId": "ed_unit_id", "topic": "topic", "homeworkText/Links": "homework_text/links" },
          entityType: "lesson_plans",
          note: "Only text and links are imported, not files"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Import: Lesson Plans
    if (action === 'import_lesson_plans') {
      console.log('Importing lesson plans...');
      progress.push({ step: 'import_lesson_plans', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allPlans = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetLessonPlans?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const plans = await response.json();
          
          if (!plans || plans.length === 0) break;
          allPlans = allPlans.concat(plans);
          
          skip += take;
          if (plans.length < take) break;
        }
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const plan of allPlans) {
          let lessonSessionId = null;
          if (plan.lessonSessionId) {
            const { data: session } = await supabase.from('lesson_sessions').select('id').eq('external_id', plan.lessonSessionId.toString()).single();
            lessonSessionId = session?.id;
          }
          
          let edUnitId = null;
          if (plan.edUnitId) {
            const { data: edUnit } = await supabase.from('educational_units').select('id').eq('external_id', plan.edUnitId.toString()).single();
            edUnitId = edUnit?.id;
          }
          
          await supabase.from('lesson_plans').upsert({
            lesson_session_id: lessonSessionId,
            ed_unit_id: edUnitId,
            lesson_date: plan.lessonDate || new Date().toISOString().split('T')[0],
            topic: plan.topic || null,
            homework_text: plan.homeworkText || null,
            homework_links: plan.homeworkLinks || null,
            materials_text: plan.materialsText || null,
            materials_links: plan.materialsLinks || null,
            teacher_notes: plan.teacherNotes || null,
            organization_id: orgData?.id,
            external_id: plan.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} lesson plans`;
      } catch (error) {
        console.error('Error importing lesson plans:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
