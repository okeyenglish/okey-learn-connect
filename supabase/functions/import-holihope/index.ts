import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer, x-supabase-version, x-profile-claims',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

const HOLIHOPE_DOMAIN = 'https://okeyenglish.t8s.ru/Api/V2';
const HOLIHOPE_API_KEY = 'eUhKlOpwAPTjOi8MgkVjms2DBY6jQPFrGPtfa8IyxpIZclH9wKMcTVGyumfvoWuJ';

interface ImportProgress {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  count?: number;
  message?: string;
  error?: string;
  hasMore?: boolean;
  nextSkip?: number;
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

    // Manual auth check (since verify_jwt is disabled to allow CORS preflight)
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Resolve organization from the authenticated user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, branch')
      .eq('id', user.id)
      .single();
    const orgId = profile?.organization_id || null;

    const body = await req.json();
    const { action } = body;
    
    const progress: ImportProgress[] = [];

    // Step 1: Delete all data completely
    if (action === 'delete_all_data') {
      console.log('Starting complete data deletion...');
      
      try {
        const stats = {
          students: 0,
          clients: 0,
          familyGroups: 0,
          familyMembers: 0,
          leads: 0,
        };

        // Delete in correct order due to foreign key constraints
        
        // 1. Delete lesson sessions
        const { error: sessionsError } = await supabase
          .from('lesson_sessions')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (sessionsError) console.error('Error deleting lesson_sessions:', sessionsError);

        // 2. Delete individual lesson sessions
        const { error: indivSessionsError } = await supabase
          .from('individual_lesson_sessions')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (indivSessionsError) console.error('Error deleting individual_lesson_sessions:', indivSessionsError);

        // 3. Delete group students
        const { error: groupStudentsError } = await supabase
          .from('group_students')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (groupStudentsError) console.error('Error deleting group_students:', groupStudentsError);

        // 4. Delete learning groups
        const { error: groupsError } = await supabase
          .from('learning_groups')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (groupsError) console.error('Error deleting learning_groups:', groupsError);

        // 5. Delete individual lessons
        const { error: indivLessonsError } = await supabase
          .from('individual_lessons')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (indivLessonsError) console.error('Error deleting individual_lessons:', indivLessonsError);

        // 6. Delete payments
        const { error: paymentsError } = await supabase
          .from('payments')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (paymentsError) console.error('Error deleting payments:', paymentsError);

        // 7. Delete students
        const { data: deletedStudents, error: studentsError } = await supabase
          .from('students')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
          .select();
        if (!studentsError) stats.students = deletedStudents?.length || 0;

        // 8. Delete family members
        const { data: deletedMembers, error: membersError } = await supabase
          .from('family_members')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
          .select();
        if (!membersError) stats.familyMembers = deletedMembers?.length || 0;

        // 9. Delete family groups
        const { data: deletedGroups, error: familyGroupsError } = await supabase
          .from('family_groups')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
          .select();
        if (!familyGroupsError) stats.familyGroups = deletedGroups?.length || 0;

        // 10. Delete lead branches (связаны с лидами)
        const { error: leadBranchesError } = await supabase
          .from('lead_branches')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (leadBranchesError) console.error('Error deleting lead_branches:', leadBranchesError);

        // 11. Delete leads (using service role to bypass RLS)
        console.log('Deleting leads...');
        const { count: leadsCount, error: leadsCountError } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true });
        
        if (leadsCountError) {
          console.error('Error counting leads:', leadsCountError);
        } else {
          console.log(`Found ${leadsCount} leads to delete`);
        }
        
        const { data: deletedLeads, error: leadsError } = await supabase
          .from('leads')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
          .select();
        
        if (leadsError) {
          console.error('Error deleting leads:', leadsError);
        } else {
          stats.leads = deletedLeads?.length || 0;
          console.log(`Deleted ${stats.leads} leads`);
        }

        // 11. Delete call comments (связаны с клиентами)
        const { error: callCommentsError } = await supabase
          .from('call_comments')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (callCommentsError) console.error('Error deleting call_comments:', callCommentsError);

        // 12. Delete call logs (связаны с клиентами)
        const { error: callLogsError } = await supabase
          .from('call_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (callLogsError) console.error('Error deleting call_logs:', callLogsError);

        // 13. Delete chat messages (связаны с клиентами)
        const { error: chatMessagesError } = await supabase
          .from('chat_messages')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (chatMessagesError) console.error('Error deleting chat_messages:', chatMessagesError);

        // 14. Delete client phone numbers (связаны с клиентами)
        const { error: phonesError } = await supabase
          .from('client_phone_numbers')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (phonesError) console.error('Error deleting client_phone_numbers:', phonesError);

        // 15. Delete client branches (связаны с клиентами)
        const { error: clientBranchesError } = await supabase
          .from('client_branches')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (clientBranchesError) console.error('Error deleting client_branches:', clientBranchesError);

        // 16. Delete clients
        const { data: deletedClients, error: clientsError } = await supabase
          .from('clients')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
          .select();
        if (!clientsError) stats.clients = deletedClients?.length || 0;

        console.log('Complete deletion stats:', stats);

        return new Response(JSON.stringify({ 
          success: true,
          stats,
          message: 'All data deleted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error during complete deletion:', error);
        return new Response(JSON.stringify({ 
          error: error.message,
          success: false 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

    // Step 2: Clear existing data (old way - marks as inactive)
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

        // Сохраняем филиалы в БД
        let importedCount = 0;
        for (const office of offices) {
          // Извлекаем название филиала из "OKEY ENGLISH Окская" -> "Окская"
          const branchName = office.Name?.replace(/^OKEY ENGLISH\s*/i, '').trim() || office.Name;
          
          const branchData = {
            organization_id: orgId,
            name: branchName,
            address: office.Address || null,
            phone: office.Phone || null,
            email: office.EMail || null,
            is_active: !office.NoClassrooms, // Если есть аудитории, то активен
            working_hours: null, // Можно будет добавить позже
            settings: {
              holihope_id: office.Id,
              location: office.Location,
              license: office.License,
              timezone: office.TimeZone,
            },
            sort_order: office.Id || 0,
          };

          const { error } = await supabase
            .from('organization_branches')
            .upsert(branchData, { 
              onConflict: 'organization_id,name',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error(`Error importing branch ${branchName}:`, error);
          } else {
            importedCount++;
          }
        }

        console.log(`Successfully imported ${importedCount} of ${offices.length} branches`);

        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} of ${offices.length} offices`;
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
          
          const responseData = await response.json();
          
          // Normalize response - API may return {"Teachers": [...]} or direct array
          const teachers = Array.isArray(responseData) 
            ? responseData 
            : (responseData?.Teachers || responseData?.teachers || Object.values(responseData).find(val => Array.isArray(val)) || []);
          
          if (!teachers || teachers.length === 0) break;
          
          allTeachers = allTeachers.concat(teachers);
          skip += take;
          
          if (teachers.length < take) break;
        }

        console.log(`Found ${allTeachers.length} teachers`);

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
            organization_id: orgId,
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

    // Step 4: Import clients (from student agents)
    if (action === 'import_clients') {
      console.log('Importing clients from student agents...');
      progress.push({ step: 'import_clients', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let totalClients = 0;
        const processedAgents = new Map(); // Track by phone/email to avoid duplicates
        const allClientsToUpsert: any[] = [];

        while (true) {
          let response;
          let retries = 3;
          
          while (retries > 0) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
              
              response = await fetch(`${HOLIHOPE_DOMAIN}/GetStudents?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              break; // Success, exit retry loop
            } catch (error) {
              retries--;
              console.warn(`Fetch failed (${retries} retries left):`, error.message);
              
              if (retries === 0) {
                throw new Error(`Failed to fetch students after 3 attempts: ${error.message}`);
              }
              
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, (4 - retries) * 2000));
            }
          }
          
          if (!response) {
            throw new Error('Failed to get response after retries');
          }
          
          const responseData = await response.json();
          
          // Normalize response - API may return {"Students": [...]} or direct array
          const students = Array.isArray(responseData) 
            ? responseData 
            : (responseData?.Students || responseData?.students || Object.values(responseData).find(val => Array.isArray(val)) || []);
          
          if (!students || students.length === 0) break;
          
          console.log(`Processing ${students.length} students for agents...`);
          
          for (const student of students) {
            // Process each agent (parent/contact) as a potential client
            if (student.Agents && Array.isArray(student.Agents)) {
              for (const agent of student.Agents) {
                // Skip agents without phone number - we can't add them to chats
                const phone = agent.Mobile || agent.Phone;
                if (!phone) continue;
                
                // Create unique key to avoid duplicates
                const agentKey = phone;
                if (processedAgents.has(agentKey)) continue;
                processedAgents.set(agentKey, true);
                
                const clientData = {
                  name: `${agent.LastName || ''} ${agent.FirstName || ''} ${agent.MiddleName || ''}`.trim() || 'Без имени',
                  phone: null,
                  email: agent.EMail || null,
                  branch: student.OfficesAndCompanies?.[0]?.Name || 'Окская',
                  notes: [
                    agent.WhoIs ? `Отношение: ${agent.WhoIs}` : null,
                    agent.JobOrStudyPlace ? `Место работы: ${agent.JobOrStudyPlace}` : null,
                    agent.Position ? `Должность: ${agent.Position}` : null,
                    agent.IsCustomer ? 'Заказчик' : null
                  ].filter(Boolean).join('; ') || null,
                  organization_id: orgId,
                  external_id: `agent_${agentKey}`,
                };
                
                allClientsToUpsert.push({
                  clientData,
                  phone,
                  phoneType: agent.Mobile ? 'mobile' : 'other',
                  whatsappEnabled: agent.UseMobileBySystem || false
                });
                
                totalClients++;
              }
            }
          }
          
          skip += take;
          if (students.length < take) break;
        }

        // Now batch upsert all clients
        console.log(`Upserting ${allClientsToUpsert.length} clients...`);
        
        for (let i = 0; i < allClientsToUpsert.length; i += 50) {
          const batch = allClientsToUpsert.slice(i, i + 50);
          const clientsData = batch.map(item => item.clientData);
          
          const { data: clients, error: clientError } = await supabase
            .from('clients')
            .upsert(clientsData, { onConflict: 'external_id,organization_id' })
            .select('id,external_id');

          if (clientError) {
            console.error('Error upserting clients batch:', clientError);
            continue;
          }

          // Prepare phone numbers batch
          const phonesData = [];
          for (let j = 0; j < batch.length; j++) {
            const item = batch[j];
            const client = clients?.find(c => c.external_id === item.clientData.external_id);
            if (client && item.phone) {
              phonesData.push({
                client_id: client.id,
                phone: item.phone,
                phone_type: item.phoneType,
                is_primary: true,
                is_whatsapp_enabled: item.whatsappEnabled,
                is_telegram_enabled: false
              });
            }
          }

          if (phonesData.length > 0) {
            await supabase
              .from('client_phone_numbers')
              .upsert(phonesData, { onConflict: 'client_id,phone' });
          }
        }

        progress[0].status = 'completed';
        progress[0].count = totalClients;
        progress[0].message = `Imported ${totalClients} clients from student agents`;
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
        // Get "Новый" status ID
        const { data: newStatus } = await supabase
          .from('lead_statuses')
          .select('id')
          .eq('name', 'Новый')
          .single();

        if (!newStatus) {
          throw new Error('Could not find "Новый" lead status');
        }

        const statusId = newStatus.id;
        console.log(`Using status_id: ${statusId} for new leads`);

        let skip = (body?.skip ?? 0);
        const take = (body?.take ?? 100);
        let totalLeadsImported = 0;
        let totalFamilyLinksCreated = 0;
        let totalSkippedNoPhone = 0;
        const batchMode = !!body?.batch_mode;
        const maxBatches = Number.isFinite(body?.max_batches) ? body?.max_batches : 1;
        let batchesProcessed = 0;
        let lastBatchSize = 0;

        // Process leads in batches to avoid CPU timeout
        while (true) {
          console.log(`Fetching leads batch: skip=${skip}, take=${take}`);
          
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetLeads?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const responseData = await response.json();
          
          // Normalize response - API may return {"Leads": [...]} or direct array
          const leads = Array.isArray(responseData) 
            ? responseData 
            : (responseData?.Leads || responseData?.leads || Object.values(responseData).find(val => Array.isArray(val)) || []);
          
          if (!leads || leads.length === 0) {
            console.log('No more leads to process');
            break;
          }
          lastBatchSize = leads.length;
          
          if (skip === 0) {
            try {
              const sample = leads.slice(0, 3);
              sample.forEach((l: any, idx: number) => {
                const logObj: any = {
                  keys: Object.keys(l || {}),
                  phone_like: {
                    phone: l?.phone,
                    Phone: l?.Phone,
                    Mobile: l?.Mobile,
                    phones: l?.phones,
                    Phones: l?.Phones,
                    ContactPhone: l?.ContactPhone,
                    Contact: l?.Contact,
                    Client: l?.Client,
                  }
                };
                console.log('Lead sample', idx, JSON.stringify(logObj).slice(0, 800));
              });
            } catch (e) {
              console.log('Lead sample log error', (e as Error)?.message);
            }
          }
          
          console.log(`Processing ${leads.length} leads...`);

          // Normalize and prepare leads; skip records without a valid phone
          const extractRawPhone = (lead: any): string | null => {
            const pickFromObj = (o: any): string | null => {
              if (!o || typeof o !== 'object') return null;
              const fields = ['phone','Phone','Mobile','mobile','ContactPhone','Telephone','Tel','Number','number','PhoneNumber','Normalized','normalized','value','Value'];
              for (const k of fields) {
                if (o[k]) return String(o[k]);
              }
              return null;
            };

            const pickFromArray = (arr: any[]): string | null => {
              if (!Array.isArray(arr)) return null;
              for (const item of arr) {
                if (item == null) continue;
                if (typeof item === 'string' || typeof item === 'number') return String(item);
                const v = pickFromObj(item);
                if (v) return v;
              }
              return null;
            };

            // 1) Try direct fields on the lead
            const direct = pickFromObj(lead);
            if (direct) return direct;

            // 2) Try common array fields on the lead
            const arrayKeys = ['phones','Phones','phoneNumbers','PhoneNumbers','contacts','Contacts','ContactPhones','ContactPhoneNumbers'];
            for (const key of arrayKeys) {
              const v = pickFromArray(lead?.[key]);
              if (v) return v;
            }

            // 3) Try nested contact-like objects
            const nestedObjs = [lead?.Contact, lead?.Client, lead?.Agent, lead?.customer, lead?.Customer, lead?.PrimaryContact, lead?.Manager];
            for (const obj of nestedObjs) {
              const v1 = pickFromObj(obj);
              if (v1) return v1;
              for (const key of arrayKeys) {
                const v2 = pickFromArray(obj?.[key]);
                if (v2) return v2;
              }
            }

            return null;
          };

          const normalizePhone = (p: any): string | null => {
            if (!p) return null;
            let s = String(p).replace(/\D/g, '');
            if (!s) return null;
            // Basic RU normalization: 8XXXXXXXXXX -> 7XXXXXXXXXX
            if (s.length === 11 && s.startsWith('8')) s = '7' + s.slice(1);
            if (s.length === 10 && s.startsWith('9')) s = '7' + s; // local mobile without country
            return s.length >= 10 ? s : null;
          };

          let skippedNoPhone = 0;
          
          // Prepare leads data and collect ALL phones (lead + agents)
          const leadsData = []; // {lead data, leadPhone, agentPhones[], allPhones[]}
          const allPhonesSet = new Set();
          
          leads.forEach((lead: any) => {
            // Extract lead's own phone
            const leadPhoneRaw = extractRawPhone(lead);
            const leadPhone = normalizePhone(leadPhoneRaw);
            
            // Extract agent phones
            const agents = lead.Agents || lead.agents || [];
            const agentPhones = [];
            
            if (Array.isArray(agents)) {
              agents.forEach((agent: any) => {
                const agentPhoneRaw = agent.Mobile || agent.Phone || agent.mobile || agent.phone;
                const agentPhone = normalizePhone(agentPhoneRaw);
                if (agentPhone) {
                  agentPhones.push(agentPhone);
                  allPhonesSet.add(agentPhone);
                }
              });
            }
            
            // If no phones at all (lead + agents), skip
            if (!leadPhone && agentPhones.length === 0) {
              skippedNoPhone++;
              return;
            }
            
            // Collect all phones for this lead (lead + agents)
            const allPhones = [];
            if (leadPhone) {
              allPhones.push(leadPhone);
              allPhonesSet.add(leadPhone);
            }
            allPhones.push(...agentPhones);
            
            // Extract all branches for this lead
            const extractBranches = (lead: any): string[] => {
              const branchesSet = new Set<string>();
              
              if (lead.location) branchesSet.add(lead.location);
              if (lead.Location) branchesSet.add(lead.Location);
              if (lead.branch) branchesSet.add(lead.branch);
              if (lead.Branch) branchesSet.add(lead.Branch);
              
              if (Array.isArray(lead.OfficesAndCompanies)) {
                lead.OfficesAndCompanies.forEach((office: any) => {
                  if (office?.Name) branchesSet.add(office.Name);
                });
              }
              
              if (Array.isArray(lead.Offices)) {
                lead.Offices.forEach((office: any) => {
                  if (typeof office === 'string') branchesSet.add(office);
                  else if (office?.Name) branchesSet.add(office.Name);
                });
              }
              
              const branches = Array.from(branchesSet).filter(b => b && b.trim());
              return branches.length > 0 ? branches : ['Окская'];
            };

            const leadBranches = extractBranches(lead);
            
            leadsData.push({
              leadInfo: {
                first_name: lead.firstName || lead.FirstName || '',
                last_name: lead.lastName || lead.LastName || '',
                phone: leadPhone, // Can be null now
                email: lead.email || lead.EMail || null,
                age: lead.age || lead.Age || null,
                subject: lead.subject || lead.Subject || null,
                level: lead.level || lead.Level || null,
                branch: leadBranches[0], // First branch for backward compatibility
                notes: lead.notes || lead.comment || lead.Comment || null,
                status_id: statusId,
                lead_source_id: null,
                assigned_to: null,
              },
              leadPhone,
              agentPhones,
              allPhones,
              agents,
              branches: leadBranches, // Store all branches
            });
          });

          totalSkippedNoPhone += skippedNoPhone;
          console.log(`Prepared ${leadsData.length} leads for insert (skipped ${skippedNoPhone} without phone)`);
          console.log(`Total unique phones (lead + agents): ${allPhonesSet.size}`);

          // Step 1: Get all unique phones and check which clients already exist
          const uniquePhones = Array.from(allPhonesSet);
          console.log(`Checking ${uniquePhones.length} unique phones...`);
          
          const phoneToClientMap = new Map(); // phone -> client_id
          
          // Query existing clients by phone in batches
          for (let i = 0; i < uniquePhones.length; i += 100) {
            const phoneBatch = uniquePhones.slice(i, i + 100);
            const { data: existingPhones } = await supabase
              .from('client_phone_numbers')
              .select('phone, client_id')
              .in('phone', phoneBatch);
            
            if (existingPhones) {
              existingPhones.forEach(p => phoneToClientMap.set(p.phone, p.client_id));
            }
          }
          
          console.log(`Found ${phoneToClientMap.size} existing clients for phones`);
          
          // Step 2: Create new clients for phones that don't exist
          const phonesToCreateClients = uniquePhones.filter(p => !phoneToClientMap.has(p));
          console.log(`Creating ${phonesToCreateClients.length} new clients...`);
          
          if (phonesToCreateClients.length > 0) {
            // Build phone -> (lead or agent) data for client name/email
            const phoneToSourceMap = new Map();
            
            leadsData.forEach(ld => {
              // Lead phone
              if (ld.leadPhone && phonesToCreateClients.includes(ld.leadPhone)) {
                phoneToSourceMap.set(ld.leadPhone, {
                  name: `${ld.leadInfo.first_name} ${ld.leadInfo.last_name}`.trim() || 'Без имени',
                  email: ld.leadInfo.email,
                  branch: ld.leadInfo.branch,
                  branches: ld.branches, // Store all branches
                });
              }
              
              // Agent phones
              ld.agentPhones.forEach((agentPhone, idx) => {
                if (phonesToCreateClients.includes(agentPhone) && !phoneToSourceMap.has(agentPhone)) {
                  const agent = ld.agents[idx];
                  const agentName = `${agent?.LastName || agent?.lastName || ''} ${agent?.FirstName || agent?.firstName || ''} ${agent?.MiddleName || agent?.middleName || ''}`.trim() || 'Без имени';
                  phoneToSourceMap.set(agentPhone, {
                    name: agentName,
                    email: agent?.EMail || agent?.email || null,
                    branch: ld.leadInfo.branch,
                    branches: ld.branches, // Store all branches
                  });
                }
              });
            });
            
            const newClientsData = phonesToCreateClients.map(phone => {
              const source = phoneToSourceMap.get(phone) || { name: 'Без имени', email: null, branch: 'Окская' };
              return {
                name: source.name,
                email: source.email,
                branch: source.branch,
                organization_id: orgId,
              };
            });
            
            // Insert new clients in batches
            for (let i = 0; i < newClientsData.length; i += 50) {
              const batch = newClientsData.slice(i, i + 50);
              const { data: newClients, error: clientError } = await supabase
                .from('clients')
                .insert(batch)
                .select('id');
              
              if (clientError) {
                console.error('Error creating clients:', clientError);
                continue;
              }
              
              if (newClients) {
                // Create phone number records for new clients
                const phoneRecords = newClients.map((client, idx) => ({
                  client_id: client.id,
                  phone: phonesToCreateClients[i + idx],
                  phone_type: 'mobile',
                  is_primary: true,
                  is_whatsapp_enabled: true,
                  is_telegram_enabled: false,
                }));
                
                await supabase
                  .from('client_phone_numbers')
                  .insert(phoneRecords);
                
                // Insert client branches
                const clientBranchRecords = [];
                newClients.forEach((client, idx) => {
                  const phone = phonesToCreateClients[i + idx];
                  const source = phoneToSourceMap.get(phone);
                  
                  if (source?.branches) {
                    source.branches.forEach((branch: string) => {
                      clientBranchRecords.push({
                        client_id: client.id,
                        branch: branch,
                      });
                    });
                  }
                });
                
                if (clientBranchRecords.length > 0) {
                  const { error: branchError } = await supabase
                    .from('client_branches')
                    .upsert(clientBranchRecords, { onConflict: 'client_id,branch' });
                  
                  if (branchError) {
                    console.error('Error inserting client branches:', branchError);
                  }
                }
                
                // Map phones to new client IDs
                newClients.forEach((client, idx) => {
                  phoneToClientMap.set(phonesToCreateClients[i + idx], client.id);
                });
              }
            }
          }
          
          console.log(`Total clients available: ${phoneToClientMap.size}`);
          
          // Step 3: Create family_groups - Group by ANY common agent
          // Use Union-Find to cluster children who share at least one agent
          const familyGroupsToCreate = [];
          const leadsWithoutAgents = []; // leadKeys without agents
          
          // Build clusters: children with any common agent go to same family
          const agentToClusterMap = new Map(); // agentPhone -> clusterId
          const clusterToAgentsMap = new Map(); // clusterId -> Set(agentPhones)
          const clusterToChildrenMap = new Map(); // clusterId -> [leadKeys]
          const clusterToFirstAgentMap = new Map(); // clusterId -> first agent for naming
          let nextClusterId = 0;
          
          leadsData.forEach((ld) => {
            const leadKey = `${ld.leadInfo.first_name}_${ld.leadInfo.last_name}_${ld.leadInfo.phone || ''}_${ld.leadInfo.email || ''}`;
            
            if (ld.agentPhones.length === 0) {
              leadsWithoutAgents.push(leadKey);
              return;
            }
            
            // Find if any agent already belongs to a cluster
            let targetClusterId = null;
            const clustersToMerge = new Set();
            
            for (const agentPhone of ld.agentPhones) {
              if (agentToClusterMap.has(agentPhone)) {
                clustersToMerge.add(agentToClusterMap.get(agentPhone));
              }
            }
            
            // Merge all found clusters into one
            if (clustersToMerge.size === 0) {
              // Create new cluster
              targetClusterId = nextClusterId++;
            } else if (clustersToMerge.size === 1) {
              // Use existing cluster
              targetClusterId = Array.from(clustersToMerge)[0];
            } else {
              // Merge multiple clusters into the first one
              const clusterIds = Array.from(clustersToMerge);
              targetClusterId = clusterIds[0];
              
              // Merge other clusters into target
              for (let i = 1; i < clusterIds.length; i++) {
                const mergeId = clusterIds[i];
                
                // Merge agents
                const mergeAgents = clusterToAgentsMap.get(mergeId) || new Set();
                const targetAgents = clusterToAgentsMap.get(targetClusterId) || new Set();
                mergeAgents.forEach(a => targetAgents.add(a));
                clusterToAgentsMap.set(targetClusterId, targetAgents);
                
                // Merge children
                const mergeChildren = clusterToChildrenMap.get(mergeId) || [];
                const targetChildren = clusterToChildrenMap.get(targetClusterId) || [];
                clusterToChildrenMap.set(targetClusterId, [...targetChildren, ...mergeChildren]);
                
                // Update agent mappings
                mergeAgents.forEach(a => agentToClusterMap.set(a, targetClusterId));
                
                // Clean up merged cluster
                clusterToAgentsMap.delete(mergeId);
                clusterToChildrenMap.delete(mergeId);
                clusterToFirstAgentMap.delete(mergeId);
              }
            }
            
            // Add current child's agents to cluster
            if (!clusterToAgentsMap.has(targetClusterId)) {
              clusterToAgentsMap.set(targetClusterId, new Set());
            }
            if (!clusterToChildrenMap.has(targetClusterId)) {
              clusterToChildrenMap.set(targetClusterId, []);
            }
            
            const clusterAgents = clusterToAgentsMap.get(targetClusterId);
            ld.agentPhones.forEach(phone => {
              clusterAgents.add(phone);
              agentToClusterMap.set(phone, targetClusterId);
            });
            
            clusterToChildrenMap.get(targetClusterId).push(leadKey);
            
            // Store first agent for naming if not set
            if (!clusterToFirstAgentMap.has(targetClusterId)) {
              clusterToFirstAgentMap.set(targetClusterId, ld.agents[0]);
            }
          });
          
          // Create family groups for each cluster
          clusterToAgentsMap.forEach((agentPhones, clusterId) => {
            const firstAgent = clusterToFirstAgentMap.get(clusterId);
            const agentName = `${firstAgent?.LastName || firstAgent?.lastName || ''} ${firstAgent?.FirstName || firstAgent?.firstName || ''}`.trim() || 'Без имени';
            const familyName = `Семья ${agentName}`;
            
            if (!familyGroupsToCreate.find(fg => fg.name === familyName)) {
              const childLeadKeys = clusterToChildrenMap.get(clusterId) || [];
              const leadKey = childLeadKeys[0];
              const leadData = leadsData.find(ld => 
                `${ld.leadInfo.first_name}_${ld.leadInfo.last_name}_${ld.leadInfo.phone || ''}_${ld.leadInfo.email || ''}` === leadKey
              );
              
              familyGroupsToCreate.push({
                name: familyName,
                branch: leadData?.leadInfo.branch || 'Окская',
                organization_id: orgId,
              });
            }
          });
          
          // Create individual families for leads without agents
          leadsWithoutAgents.forEach((leadKey) => {
            const leadData = leadsData.find(ld => 
              `${ld.leadInfo.first_name}_${ld.leadInfo.last_name}_${ld.leadInfo.phone || ''}_${ld.leadInfo.email || ''}` === leadKey
            );
            
            if (leadData) {
              const leadName = `${leadData.leadInfo.first_name} ${leadData.leadInfo.last_name}`.trim() || 'Без имени';
              const familyName = `Семья ${leadName}`;
              
              if (!familyGroupsToCreate.find(fg => fg.name === familyName)) {
                familyGroupsToCreate.push({
                  name: familyName,
                  branch: leadData.leadInfo.branch,
                  organization_id: orgId,
                });
              }
            }
          });
          
          console.log(`Creating ${familyGroupsToCreate.length} family groups (unified by common parents)...`);
          
          const familyGroupNameToIdMap = new Map();
          if (familyGroupsToCreate.length > 0) {
            for (let i = 0; i < familyGroupsToCreate.length; i += 50) {
              const batch = familyGroupsToCreate.slice(i, i + 50);
              const { data: newFamilyGroups } = await supabase
                .from('family_groups')
                .upsert(batch, { onConflict: 'name,organization_id' })
                .select('id, name');
              
              if (newFamilyGroups) {
                newFamilyGroups.forEach(fg => {
                  familyGroupNameToIdMap.set(fg.name, fg.id);
                });
              }
            }
          }
          
          console.log(`Created/found ${familyGroupNameToIdMap.size} family groups`);

          // Step 4: Insert leads
          const leadsToInsert = leadsData.map((ld) => ld.leadInfo);

          // Step 5: Batch insert leads into leads table (200 at a time)
          console.log(`Inserting ${leadsToInsert.length} leads into leads table...`);
          
          const leadIdMap = new Map();
          for (let i = 0; i < leadsToInsert.length; i += 200) {
            const batch = leadsToInsert.slice(i, i + 200);
            const { data: insertedLeads, error: leadsError } = await supabase
              .from('leads')
              .insert(batch)
              .select('id, phone, email, first_name, last_name');

            if (leadsError) {
              console.error(`Error inserting leads batch (size: ${batch.length}):`, leadsError);
              continue;
            }
            
            if (insertedLeads) {
              totalLeadsImported += insertedLeads.length;
              console.log(`Inserted ${insertedLeads.length} leads successfully`);
              
              insertedLeads.forEach((lead) => {
                const key = `${lead.first_name}_${lead.last_name}_${lead.phone || ''}_${lead.email || ''}`;
                leadIdMap.set(key, lead.id);
              });
            }
          }

          // Insert lead branches
          console.log('Inserting lead branches...');
          const leadBranchRecords = [];
          
          leadsData.forEach((ld) => {
            const leadKey = `${ld.leadInfo.first_name}_${ld.leadInfo.last_name}_${ld.leadInfo.phone || ''}_${ld.leadInfo.email || ''}`;
            const leadId = leadIdMap.get(leadKey);
            
            if (leadId && ld.branches) {
              ld.branches.forEach((branch: string) => {
                leadBranchRecords.push({
                  lead_id: leadId,
                  branch: branch,
                });
              });
            }
          });
          
          if (leadBranchRecords.length > 0) {
            for (let i = 0; i < leadBranchRecords.length; i += 200) {
              const batch = leadBranchRecords.slice(i, i + 200);
              const { error: branchError } = await supabase
                .from('lead_branches')
                .upsert(batch, { onConflict: 'lead_id,branch' });
              
              if (branchError) {
                console.error('Error inserting lead branches:', branchError);
              }
            }
            console.log(`Inserted ${leadBranchRecords.length} lead branch associations`);
          }

          // Step 6: Create family member links - unified families by common parents
          console.log('Creating family member links...');
          const familyMembersToCreate = [];
          
          // A. Add all agents and children for each cluster
          clusterToAgentsMap.forEach((agentPhones, clusterId) => {
            const firstAgent = clusterToFirstAgentMap.get(clusterId);
            const agentName = `${firstAgent?.LastName || firstAgent?.lastName || ''} ${firstAgent?.FirstName || firstAgent?.firstName || ''}`.trim() || 'Без имени';
            const familyName = `Семья ${agentName}`;
            const familyGroupId = familyGroupNameToIdMap.get(familyName);
            if (!familyGroupId) return;
            
            // Add ALL unique agents as parents (first one is primary)
            const agentPhonesArray = Array.from(agentPhones);
            agentPhonesArray.forEach((agentPhone, idx) => {
              const agentClientId = phoneToClientMap.get(agentPhone);
              if (agentClientId) {
                familyMembersToCreate.push({
                  family_group_id: familyGroupId,
                  client_id: agentClientId,
                  is_primary_contact: idx === 0,
                  relationship_type: 'parent',
                });
              }
            });
            
            // Add all children to this family
            const childLeadKeys = clusterToChildrenMap.get(clusterId) || [];
            childLeadKeys.forEach((leadKey) => {
              const leadData = leadsData.find(ld => 
                `${ld.leadInfo.first_name}_${ld.leadInfo.last_name}_${ld.leadInfo.phone || ''}_${ld.leadInfo.email || ''}` === leadKey
              );
              
              if (leadData?.leadPhone) {
                const leadClientId = phoneToClientMap.get(leadData.leadPhone);
                if (leadClientId) {
                  familyMembersToCreate.push({
                    family_group_id: familyGroupId,
                    client_id: leadClientId,
                    is_primary_contact: false,
                    relationship_type: 'other',
                  });
                }
              }
            });
          });
          
          // B. Add leads without agents to their individual families
          leadsWithoutAgents.forEach((leadKey) => {
            const leadData = leadsData.find(ld => 
              `${ld.leadInfo.first_name}_${ld.leadInfo.last_name}_${ld.leadInfo.phone || ''}_${ld.leadInfo.email || ''}` === leadKey
            );
            
            if (!leadData?.leadPhone) return;
            
            const leadName = `${leadData.leadInfo.first_name} ${leadData.leadInfo.last_name}`.trim() || 'Без имени';
            const familyName = `Семья ${leadName}`;
            const familyGroupId = familyGroupNameToIdMap.get(familyName);
            
            if (familyGroupId) {
              const leadClientId = phoneToClientMap.get(leadData.leadPhone);
              if (leadClientId) {
                familyMembersToCreate.push({
                  family_group_id: familyGroupId,
                  client_id: leadClientId,
                  is_primary_contact: true,
                  relationship_type: 'main',
                });
              }
            }
          });

          if (familyMembersToCreate.length > 0) {
            console.log(`Upserting ${familyMembersToCreate.length} family member links...`);
            for (let i = 0; i < familyMembersToCreate.length; i += 100) {
              const batch = familyMembersToCreate.slice(i, i + 100);
              const { error: familyError } = await supabase
                .from('family_members')
                .upsert(batch, { onConflict: 'family_group_id,client_id' });
              
              if (familyError) {
                console.error('Error creating family members:', familyError);
              } else {
                totalFamilyLinksCreated += batch.length;
              }
            }
          }

          skip += take;
          
          // Break if we got fewer leads than requested (last page)
          if (lastBatchSize < take) {
            console.log('Reached last page of leads');
            break;
          }
          
          // In batch mode, stop after the configured number of batches
          if (batchMode) {
            batchesProcessed++;
            if (batchesProcessed >= maxBatches) {
              console.log('Batch mode limit reached');
              break;
            }
          }
        }

        progress[0].status = 'completed';
        progress[0].count = totalLeadsImported;
        progress[0].message = `Imported ${totalLeadsImported} leads (${totalFamilyLinksCreated} linked to parents, skipped ${totalSkippedNoPhone} without phone)`;
        progress[0].hasMore = batchMode ? (lastBatchSize === take) : false;
        progress[0].nextSkip = skip;
        console.log(`Import complete: ${totalLeadsImported} leads, ${totalFamilyLinksCreated} family links, skipped ${totalSkippedNoPhone} without phone. hasMore=${progress[0].hasMore}, nextSkip=${progress[0].nextSkip}`);
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

        let skip = (body?.skip ?? 0);
        const take = (body?.take ?? 100);
        let totalStudentsImported = 0;
        let totalFamilyLinksCreated = 0;
        const batchMode = !!body?.batch_mode;
        const maxBatches = Number.isFinite(body?.max_batches) ? body?.max_batches : 1;
        let batchesProcessed = 0;
        let lastBatchSize = 0;

        // Process students in batches with timeout and retry
        while (true) {
          console.log(`Fetching students batch: skip=${skip}, take=${take}`);
          
          let response;
          let retries = 3;
          
          while (retries > 0) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
              
              response = await fetch(`${HOLIHOPE_DOMAIN}/GetStudents?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              break; // Success, exit retry loop
            } catch (error) {
              retries--;
              console.warn(`Fetch failed (${retries} retries left):`, error.message);
              
              if (retries === 0) {
                throw new Error(`Failed to fetch students after 3 attempts: ${error.message}`);
              }
              
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, (4 - retries) * 2000));
            }
          }
          
          if (!response) {
            throw new Error('Failed to get response after retries');
          }
          
          const responseData = await response.json();
          const students = Array.isArray(responseData) 
            ? responseData 
            : (responseData?.Students || responseData?.students || Object.values(responseData).find(val => Array.isArray(val)) || []);
          
          if (!students || students.length === 0) {
            console.log('Reached last page of students');
            break;
          }
          lastBatchSize = students.length;
          
          console.log(`Processing ${students.length} students...`);

          const normalizePhone = (p: any): string | null => {
            if (!p) return null;
            let s = String(p).replace(/\D/g, '');
            if (!s) return null;
            if (s.length === 11 && s.startsWith('8')) s = '7' + s.slice(1);
            if (s.length === 10 && s.startsWith('9')) s = '7' + s;
            return s.length >= 10 ? s : null;
          };

          const parseDateToISO = (input: any): string | null => {
            if (!input) return null;
            const s = String(input).trim();
            // Try DD.MM.YYYY
            const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
            if (m) {
              const d = m[1].padStart(2, '0');
              const mo = m[2].padStart(2, '0');
              const y = m[3].length === 2 ? (Number(m[3]) + 2000).toString() : m[3];
              return `${y}-${mo}-${d}`;
            }
            // Try native Date
            const dt = new Date(s);
            if (!isNaN(dt.getTime())) {
              const yyyy = dt.getFullYear();
              const mm = String(dt.getMonth() + 1).padStart(2, '0');
              const dd = String(dt.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            }
            return null;
          };

          const calcAge = (isoDate: string | null): number | null => {
            if (!isoDate) return null;
            const [y, m, d] = isoDate.split('-').map(Number);
            if (!y || !m || !d) return null;
            const birth = new Date(y, m - 1, d);
            if (isNaN(birth.getTime())) return null;
            const now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            const md = now.getMonth() - birth.getMonth();
            if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age--;
            return age;
          };
          // Prepare students data and collect ALL phones (student + agents)
          const studentsData = [];
          const allPhonesSet = new Set();
          
          students.forEach((student: any) => {
            const studentPhone = normalizePhone(student.Mobile || student.Phone || student.mobile || student.phone);
            
            // Extract agent phones
            const agents = student.Agents || student.agents || [];
            const agentPhones = [];
            
            if (Array.isArray(agents)) {
              agents.forEach((agent: any) => {
                const agentPhoneRaw = agent.Mobile || agent.Phone || agent.mobile || agent.phone;
                const agentPhone = normalizePhone(agentPhoneRaw);
                if (agentPhone) {
                  agentPhones.push(agentPhone);
                  allPhonesSet.add(agentPhone);
                }
              });
            }
            
            // Build extra_fields
            const extraFields = {};
            if (student.ExtraFields && Array.isArray(student.ExtraFields)) {
              for (const field of student.ExtraFields) {
                extraFields[field.name || 'custom_field'] = field.value || null;
              }
            }
            
            // Extract all branches for this student
            const studentBranches = [];
            if (Array.isArray(student.OfficesAndCompanies)) {
              student.OfficesAndCompanies.forEach((office: any) => {
                if (office?.Name) studentBranches.push(office.Name);
              });
            }
            if (studentBranches.length === 0) {
              studentBranches.push(student.location || student.Location || 'Окская');
            }
            
            const branch = studentBranches[0]; // First branch for backward compatibility
            const rawDob = student.Birthday || student.dateOfBirth || student.DateOfBirth || null;
            const dobISO = parseDateToISO(rawDob);
            const providedAge = Number(student.age || student.Age);
            const computedAge = Number.isFinite(providedAge) && providedAge > 0 ? providedAge : (calcAge(dobISO) ?? 7);
            const safeAge = Math.max(1, Math.min(100, computedAge));
            const fullName = `${student.firstName || student.FirstName || ''} ${student.lastName || student.LastName || ''}`.trim() || 'Без имени';
            const rawStatus = (student.Status || student.status || '').toString().toLowerCase();
            let normalizedStatus: 'active' | 'inactive' | 'trial' | 'graduated' = 'inactive';
            if (/заним|актив|учит|active|study/.test(rawStatus)) normalizedStatus = 'active';
            else if (/проб|trial/.test(rawStatus)) normalizedStatus = 'trial';
            else if (/выпуск|graduat/.test(rawStatus)) normalizedStatus = 'graduated';
            
            // CRITICAL: Use only ClientId for external_id (required for linking with groups)
            const clientId = student.ClientId ?? student.clientId;
            if (!clientId) {
              console.warn(`⚠️ Skipping student "${fullName}" - no ClientId in API response (only Id=${student.Id ?? student.id})`);
              return; // Skip students without ClientId
            }
            
            studentsData.push({
              studentInfo: {
                name: fullName,
                first_name: student.firstName || student.FirstName || '',
                last_name: student.lastName || student.LastName || '',
                middle_name: student.middleName || student.MiddleName || null,
                age: safeAge,
                date_of_birth: dobISO,
                phone: studentPhone,
                lk_email: student.EMail || student.Email || student.email || null,
                gender: (typeof student.Gender === 'boolean' ? (student.Gender ? 'male' : 'female') : (student.gender || student.Gender || null)),
                status: normalizedStatus,
                notes: student.comment || student.Comment || null,
                extra_fields: extraFields,
                external_id: clientId.toString(),
                organization_id: orgId,
              },
              branch,
              branches: studentBranches, // Store all branches
              studentPhone,
              agentPhones,
              agents,
            });

            if (studentPhone) allPhonesSet.add(studentPhone);
          });

          console.log(`Total unique phones (students + agents): ${allPhonesSet.size}`);

          // Step 1: Get all unique phones and check which clients already exist
          const uniquePhones = Array.from(allPhonesSet);
          const phoneToClientMap = new Map();
          
          for (let i = 0; i < uniquePhones.length; i += 100) {
            const phoneBatch = uniquePhones.slice(i, i + 100);
            const { data: existingPhones } = await supabase
              .from('client_phone_numbers')
              .select('phone, client_id')
              .in('phone', phoneBatch);
            
            if (existingPhones) {
              existingPhones.forEach(p => phoneToClientMap.set(p.phone, p.client_id));
            }
          }
          
          console.log(`Found ${phoneToClientMap.size} existing clients for phones`);
          
          // Step 2: Create new clients for phones that don't exist
          const phonesToCreateClients = uniquePhones.filter(p => !phoneToClientMap.has(p));
          console.log(`Creating ${phonesToCreateClients.length} new clients...`);
          
          if (phonesToCreateClients.length > 0) {
            const phoneToSourceMap = new Map();
            
            studentsData.forEach(sd => {
              // Student phone
              if (sd.studentPhone && phonesToCreateClients.includes(sd.studentPhone)) {
                phoneToSourceMap.set(sd.studentPhone, {
                  name: `${sd.studentInfo.first_name} ${sd.studentInfo.last_name}`.trim() || 'Без имени',
                  email: sd.studentInfo.lk_email,
                  branch: sd.branch,
                  branches: sd.branches, // Store all branches
                });
              }
              
              // Agent phones
              sd.agentPhones.forEach((agentPhone, idx) => {
                if (phonesToCreateClients.includes(agentPhone) && !phoneToSourceMap.has(agentPhone)) {
                  const agent = sd.agents[idx];
                  const agentName = `${agent?.LastName || agent?.lastName || ''} ${agent?.FirstName || agent?.firstName || ''} ${agent?.MiddleName || agent?.middleName || ''}`.trim() || 'Без имени';
                  phoneToSourceMap.set(agentPhone, {
                    name: agentName,
                    email: agent?.EMail || agent?.email || null,
                    branch: sd.branch,
                    branches: sd.branches, // Store all branches
                  });
                }
              });
            });
            
            const newClientsData = phonesToCreateClients.map(phone => {
              const source = phoneToSourceMap.get(phone) || { name: 'Без имени', email: null, branch: 'Окская' };
              return {
                name: source.name,
                email: source.email,
                branch: source.branch,
                organization_id: orgId,
              };
            });
            
            for (let i = 0; i < newClientsData.length; i += 50) {
              const batch = newClientsData.slice(i, i + 50);
              const { data: newClients, error: clientError } = await supabase
                .from('clients')
                .insert(batch)
                .select('id');
              
              if (clientError) {
                console.error('Error creating clients:', clientError);
                continue;
              }
              
              if (newClients) {
                const phoneRecords = newClients.map((client, idx) => ({
                  client_id: client.id,
                  phone: phonesToCreateClients[i + idx],
                  phone_type: 'mobile',
                  is_primary: true,
                  is_whatsapp_enabled: true,
                  is_telegram_enabled: false,
                }));
                
                await supabase
                  .from('client_phone_numbers')
                  .insert(phoneRecords);
                
                // Insert client branches
                const clientBranchRecords = [];
                newClients.forEach((client, idx) => {
                  const phone = phonesToCreateClients[i + idx];
                  const source = phoneToSourceMap.get(phone);
                  
                  if (source?.branches) {
                    source.branches.forEach((branch: string) => {
                      clientBranchRecords.push({
                        client_id: client.id,
                        branch: branch,
                      });
                    });
                  }
                });
                
                if (clientBranchRecords.length > 0) {
                  await supabase
                    .from('client_branches')
                    .upsert(clientBranchRecords, { onConflict: 'client_id,branch' });
                }
                
                newClients.forEach((client, idx) => {
                  phoneToClientMap.set(phonesToCreateClients[i + idx], client.id);
                });
              }
            }
          }
          
          console.log(`Total clients available: ${phoneToClientMap.size}`);
          
          // Step 3: Create family_groups - Group by ANY common agent
          // Use Union-Find to cluster children who share at least one agent
          const familyGroupsToCreate = [];
          const studentsWithoutAgents = []; // studentKeys without agents
          
          // Build clusters: children with any common agent go to same family
          const agentToClusterMap = new Map(); // agentPhone -> clusterId
          const clusterToAgentsMap = new Map(); // clusterId -> Set(agentPhones)
          const clusterToChildrenMap = new Map(); // clusterId -> [studentKeys]
          const clusterToFirstAgentMap = new Map(); // clusterId -> first agent for naming
          let nextClusterId = 0;
          
          studentsData.forEach((sd) => {
            const studentKey = sd.studentInfo.external_id || `${sd.studentInfo.first_name}_${sd.studentInfo.last_name}_${sd.studentInfo.phone || ''}_${sd.studentInfo.lk_email || ''}`;
            
            if (sd.agentPhones.length === 0) {
              studentsWithoutAgents.push(studentKey);
              return;
            }
            
            // Find if any agent already belongs to a cluster
            let targetClusterId = null;
            const clustersToMerge = new Set();
            
            for (const agentPhone of sd.agentPhones) {
              if (agentToClusterMap.has(agentPhone)) {
                clustersToMerge.add(agentToClusterMap.get(agentPhone));
              }
            }
            
            // Merge all found clusters into one
            if (clustersToMerge.size === 0) {
              // Create new cluster
              targetClusterId = nextClusterId++;
            } else if (clustersToMerge.size === 1) {
              // Use existing cluster
              targetClusterId = Array.from(clustersToMerge)[0];
            } else {
              // Merge multiple clusters into the first one
              const clusterIds = Array.from(clustersToMerge);
              targetClusterId = clusterIds[0];
              
              // Merge other clusters into target
              for (let i = 1; i < clusterIds.length; i++) {
                const mergeId = clusterIds[i];
                
                // Merge agents
                const mergeAgents = clusterToAgentsMap.get(mergeId) || new Set();
                const targetAgents = clusterToAgentsMap.get(targetClusterId) || new Set();
                mergeAgents.forEach(a => targetAgents.add(a));
                clusterToAgentsMap.set(targetClusterId, targetAgents);
                
                // Merge children
                const mergeChildren = clusterToChildrenMap.get(mergeId) || [];
                const targetChildren = clusterToChildrenMap.get(targetClusterId) || [];
                clusterToChildrenMap.set(targetClusterId, [...targetChildren, ...mergeChildren]);
                
                // Update agent mappings
                mergeAgents.forEach(a => agentToClusterMap.set(a, targetClusterId));
                
                // Clean up merged cluster
                clusterToAgentsMap.delete(mergeId);
                clusterToChildrenMap.delete(mergeId);
                clusterToFirstAgentMap.delete(mergeId);
              }
            }
            
            // Add current child's agents to cluster
            if (!clusterToAgentsMap.has(targetClusterId)) {
              clusterToAgentsMap.set(targetClusterId, new Set());
            }
            if (!clusterToChildrenMap.has(targetClusterId)) {
              clusterToChildrenMap.set(targetClusterId, []);
            }
            
            const clusterAgents = clusterToAgentsMap.get(targetClusterId);
            sd.agentPhones.forEach(phone => {
              clusterAgents.add(phone);
              agentToClusterMap.set(phone, targetClusterId);
            });
            
            clusterToChildrenMap.get(targetClusterId).push(studentKey);
            
            // Store first agent for naming if not set
            if (!clusterToFirstAgentMap.has(targetClusterId)) {
              clusterToFirstAgentMap.set(targetClusterId, sd.agents[0]);
            }
          });
          
          // Create family groups for each cluster
          clusterToAgentsMap.forEach((agentPhones, clusterId) => {
            const firstAgent = clusterToFirstAgentMap.get(clusterId);
            const agentName = `${firstAgent?.LastName || firstAgent?.lastName || ''} ${firstAgent?.FirstName || firstAgent?.firstName || ''}`.trim() || 'Без имени';
            const familyName = `Семья ${agentName}`;
            
            if (!familyGroupsToCreate.find(fg => fg.name === familyName)) {
              const childStudentKeys = clusterToChildrenMap.get(clusterId) || [];
              const studentKey = childStudentKeys[0];
              const studentData = studentsData.find(sd => {
                const key = sd.studentInfo.external_id || `${sd.studentInfo.first_name}_${sd.studentInfo.last_name}_${sd.studentInfo.phone || ''}_${sd.studentInfo.lk_email || ''}`;
                return key === studentKey;
              });
              
              familyGroupsToCreate.push({
                name: familyName,
                branch: studentData?.branch || 'Окская',
                organization_id: orgId,
              });
            }
          });
          
          // Create individual families for students without agents
          studentsWithoutAgents.forEach((studentKey) => {
            const studentData = studentsData.find(sd => {
              const key = sd.studentInfo.external_id || `${sd.studentInfo.first_name}_${sd.studentInfo.last_name}_${sd.studentInfo.phone || ''}_${sd.studentInfo.lk_email || ''}`;
              return key === studentKey;
            });
            
            if (studentData) {
              const studentName = `${studentData.studentInfo.first_name} ${studentData.studentInfo.last_name}`.trim() || 'Без имени';
              const familyName = `Семья ${studentName}`;
              
              if (!familyGroupsToCreate.find(fg => fg.name === familyName)) {
                familyGroupsToCreate.push({
                  name: familyName,
                  branch: studentData.branch,
                  organization_id: orgId,
                });
              }
            }
          });
          
          console.log(`Creating ${familyGroupsToCreate.length} family groups (unified by common parents)...`);
          
          const familyGroupNameToIdMap = new Map();
          if (familyGroupsToCreate.length > 0) {
            // 1) Try batch upsert
            for (let i = 0; i < familyGroupsToCreate.length; i += 50) {
              const batch = familyGroupsToCreate.slice(i, i + 50);
              const { data: upserted, error: upsertErr } = await supabase
                .from('family_groups')
                .upsert(batch, { onConflict: 'name,organization_id' })
                .select('id, name');
              if (upsertErr) {
                console.error('family_groups upsert error:', upsertErr);
              }
              if (upserted) {
                upserted.forEach(fg => familyGroupNameToIdMap.set(fg.name, fg.id));
              }
            }

            // 2) Ensure mapping via select (fallback if upsert returned empty)
            const names = familyGroupsToCreate.map(fg => fg.name);
            const chunkSize = 50;
            for (let i = 0; i < names.length; i += chunkSize) {
              const chunk = names.slice(i, i + chunkSize);
              const { data: fetchedChunk, error: fetchErr } = await supabase
                .from('family_groups')
                .select('id, name')
                .in('name', chunk)
                .eq('organization_id', orgId);
              if (fetchErr) {
                console.error('family_groups select error:', fetchErr);
                continue;
              }
              fetchedChunk?.forEach(fg => familyGroupNameToIdMap.set(fg.name, fg.id));
            }

            // 3) Insert any missing names explicitly
            const missing = names.filter(n => !familyGroupNameToIdMap.has(n));
            if (missing.length > 0) {
              console.log(`Inserting missing ${missing.length} family groups explicitly...`);
              for (let i = 0; i < missing.length; i += 50) {
                const batch = missing.slice(i, i + 50).map(n => ({
                  name: n,
                  branch: (familyGroupsToCreate.find(f => f.name === n)?.branch) || 'Окская',
                  organization_id: orgId,
                }));
                const { data: inserted, error: insertErr } = await supabase
                  .from('family_groups')
                  .insert(batch)
                  .select('id, name');
                if (insertErr) {
                  console.error('family_groups insert error:', insertErr);
                }
                inserted?.forEach(fg => familyGroupNameToIdMap.set(fg.name, fg.id));
              }
            }
          }
          
          console.log(`Created/found ${familyGroupNameToIdMap.size} family groups`);

          // Step 4: Prepare students with family_group_id
          const studentsToInsert = [];
          studentsData.forEach((sd) => {
            const studentKey = sd.studentInfo.external_id || `${sd.studentInfo.first_name}_${sd.studentInfo.last_name}_${sd.studentInfo.phone || ''}_${sd.studentInfo.lk_email || ''}`;
            
            let familyGroupId = null;
            
            // If student has agents, find their cluster
            if (sd.agentPhones.length > 0) {
              // Find cluster by checking first agent
              const firstAgentPhone = sd.agentPhones[0];
              const clusterId = agentToClusterMap.get(firstAgentPhone);
              
              if (clusterId !== undefined) {
                const firstAgent = clusterToFirstAgentMap.get(clusterId);
                const agentName = `${firstAgent?.LastName || firstAgent?.lastName || ''} ${firstAgent?.FirstName || firstAgent?.firstName || ''}`.trim() || 'Без имени';
                const familyName = `Семья ${agentName}`;
                familyGroupId = familyGroupNameToIdMap.get(familyName);
              }
            } else {
              // Student without agents - use their own family
              const studentName = `${sd.studentInfo.first_name} ${sd.studentInfo.last_name}`.trim() || 'Без имени';
              const familyName = `Семья ${studentName}`;
              familyGroupId = familyGroupNameToIdMap.get(familyName);
            }
            
            if (familyGroupId) {
              studentsToInsert.push({
                ...sd.studentInfo,
                family_group_id: familyGroupId,
              });
            }
          });

          console.log(`Inserting ${studentsToInsert.length} students into students table...`);
          
          const studentIdMap = new Map();
          for (let i = 0; i < studentsToInsert.length; i += 100) {
            const batch = studentsToInsert.slice(i, i + 100);
            const { data: insertedStudents, error: studentsError } = await supabase
              .from('students')
              .upsert(batch, { onConflict: 'external_id,organization_id' })
              .select('id, phone, lk_email, first_name, last_name, external_id');

            if (studentsError) {
              console.error(`Error inserting students batch (size: ${batch.length}):`, studentsError);
              continue;
            }
            
            if (insertedStudents) {
              totalStudentsImported += insertedStudents.length;
              console.log(`Inserted ${insertedStudents.length} students successfully`);
              
              insertedStudents.forEach((student) => {
                const key = student.external_id || `${student.first_name}_${student.last_name}_${student.phone || ''}_${student.lk_email || ''}`;
                studentIdMap.set(key, student.id);
              });
            }
          }

          // Step 5: Create family member links - unified families by common parents
          console.log('Creating family member links...');
          const familyMembersToCreate = [];
          
          // A. Add all agents and children for each cluster
          clusterToAgentsMap.forEach((agentPhones, clusterId) => {
            const firstAgent = clusterToFirstAgentMap.get(clusterId);
            const agentName = `${firstAgent?.LastName || firstAgent?.lastName || ''} ${firstAgent?.FirstName || firstAgent?.firstName || ''}`.trim() || 'Без имени';
            const familyName = `Семья ${agentName}`;
            const familyGroupId = familyGroupNameToIdMap.get(familyName);
            if (!familyGroupId) return;
            
            // Add ALL unique agents as parents (first one is primary)
            const agentPhonesArray = Array.from(agentPhones);
            agentPhonesArray.forEach((agentPhone, idx) => {
              const agentClientId = phoneToClientMap.get(agentPhone);
              if (agentClientId) {
                familyMembersToCreate.push({
                  family_group_id: familyGroupId,
                  client_id: agentClientId,
                  is_primary_contact: idx === 0,
                  relationship_type: 'parent',
                });
              }
            });
            
            // Add all children to this family
            const childStudentKeys = clusterToChildrenMap.get(clusterId) || [];
            childStudentKeys.forEach((studentKey) => {
              const studentData = studentsData.find(sd => {
                const key = sd.studentInfo.external_id || `${sd.studentInfo.first_name}_${sd.studentInfo.last_name}_${sd.studentInfo.phone || ''}_${sd.studentInfo.lk_email || ''}`;
                return key === studentKey;
              });
              
              if (studentData?.studentPhone) {
                const studentClientId = phoneToClientMap.get(studentData.studentPhone);
                if (studentClientId) {
                  familyMembersToCreate.push({
                    family_group_id: familyGroupId,
                    client_id: studentClientId,
                    is_primary_contact: false,
                    relationship_type: 'other',
                  });
                }
              }
            });
          });
          
          // B. Add students without agents to their individual families
          studentsWithoutAgents.forEach((studentKey) => {
            const studentData = studentsData.find(sd => {
              const key = sd.studentInfo.external_id || `${sd.studentInfo.first_name}_${sd.studentInfo.last_name}_${sd.studentInfo.phone || ''}_${sd.studentInfo.lk_email || ''}`;
              return key === studentKey;
            });
            
            if (!studentData?.studentPhone) return;
            
            const studentName = `${studentData.studentInfo.first_name} ${studentData.studentInfo.last_name}`.trim() || 'Без имени';
            const familyName = `Семья ${studentName}`;
            const familyGroupId = familyGroupNameToIdMap.get(familyName);
            
            if (familyGroupId) {
              const studentClientId = phoneToClientMap.get(studentData.studentPhone);
              if (studentClientId) {
                familyMembersToCreate.push({
                  family_group_id: familyGroupId,
                  client_id: studentClientId,
                  is_primary_contact: true,
                  relationship_type: 'main',
                });
              }
            }
          });

          if (familyMembersToCreate.length > 0) {
            // Deduplicate family members to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
            const uniqueFamilyMembers = [];
            const seen = new Set();
            for (const member of familyMembersToCreate) {
              const key = `${member.family_group_id}_${member.client_id}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueFamilyMembers.push(member);
              }
            }
            
            console.log(`Upserting ${uniqueFamilyMembers.length} unique family member links (${familyMembersToCreate.length - uniqueFamilyMembers.length} duplicates removed)...`);
            for (let i = 0; i < uniqueFamilyMembers.length; i += 100) {
              const batch = uniqueFamilyMembers.slice(i, i + 100);
              const { error: familyError } = await supabase
                .from('family_members')
                .upsert(batch, { onConflict: 'family_group_id,client_id' });
              
              if (familyError) {
                console.error('Error creating family members:', familyError);
              } else {
                totalFamilyLinksCreated += batch.length;
              }
            }
          }

          skip += take;
          batchesProcessed++;
          
          if (batchMode && batchesProcessed >= maxBatches) {
            const hasMore = lastBatchSize >= take;
            progress[0].status = 'in_progress';
            progress[0].count = totalStudentsImported;
            progress[0].message = `Импортировано ${totalStudentsImported} студентов`;
            progress[0].hasMore = hasMore;
            progress[0].nextSkip = skip;
            
            console.log(`Batch complete: ${totalStudentsImported} students, hasMore=${hasMore}, nextSkip=${skip}`);
            return new Response(JSON.stringify({ progress }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          if (students.length < take) {
            console.log('Reached last page of students');
            break;
          }
        }

        progress[0].status = 'completed';
        progress[0].count = totalStudentsImported;
        progress[0].message = `Import complete: ${totalStudentsImported} students, ${totalFamilyLinksCreated} family links`;
        console.log(`Import complete: ${totalStudentsImported} students, ${totalFamilyLinksCreated} family links`);
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
            organization_id: orgId,
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
    
    // Preview: Client Statuses
    if (action === 'preview_client_statuses') {
      console.log('Previewing client statuses...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetClientStatuses?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();
        
        // Normalize response structure
        let statuses: any[] = [];
        if (Array.isArray(responseData)) {
          statuses = responseData;
        } else if (Array.isArray(responseData?.Statuses)) {
          statuses = responseData.Statuses;
        } else if (Array.isArray(responseData?.statuses)) {
          statuses = responseData.statuses;
        } else if (responseData && typeof responseData === 'object') {
          const firstArray = Object.values(responseData).find((v) => Array.isArray(v)) as any[] | undefined;
          if (firstArray) statuses = firstArray;
        }
        
        return new Response(JSON.stringify({
          preview: true,
          total: statuses.length,
          sample: statuses.slice(0, 20),
          mapping: { "id": "external_id", "name": "name" },
          entityType: "client_statuses"
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

    // Import: Client Statuses
    if (action === 'import_client_statuses') {
      console.log('Importing client statuses...');
      progress.push({ step: 'import_client_statuses', status: 'in_progress' });

      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetClientStatuses?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();
        
        // Normalize response structure
        let statuses: any[] = [];
        if (Array.isArray(responseData)) {
          statuses = responseData;
        } else if (Array.isArray(responseData?.Statuses)) {
          statuses = responseData.Statuses;
        } else if (Array.isArray(responseData?.statuses)) {
          statuses = responseData.statuses;
        } else if (responseData && typeof responseData === 'object') {
          const firstArray = Object.values(responseData).find((v) => Array.isArray(v)) as any[] | undefined;
          if (firstArray) statuses = firstArray;
        }
        
        let importedCount = 0;
        for (const status of statuses) {
          const { error } = await supabase.from('client_statuses').upsert({
            name: status.name || status.Name || 'Без названия',
            description: status.description || null,
            is_active: status.isActive !== false,
            sort_order: status.order || status.Order || 0,
            organization_id: orgId,
            external_id: status.id?.toString() || status.Id?.toString(),
          }, { onConflict: 'external_id,organization_id' });
          
          if (error) {
            console.error('Error upserting client status:', error);
          } else {
            importedCount++;
          }
        }
        
        console.log(`Successfully imported ${importedCount} of ${statuses.length} client statuses`);
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} client statuses`;
      } catch (error) {
        console.error('Error importing client statuses:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Lead Statuses
    if (action === 'preview_lead_statuses') {
      console.log('Previewing lead statuses...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetLeadStatuses?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();
        
        // Normalize response structure
        let statuses: any[] = [];
        if (Array.isArray(responseData)) {
          statuses = responseData;
        } else if (Array.isArray(responseData?.Statuses)) {
          statuses = responseData.Statuses;
        } else if (Array.isArray(responseData?.statuses)) {
          statuses = responseData.statuses;
        } else if (responseData && typeof responseData === 'object') {
          const firstArray = Object.values(responseData).find((v) => Array.isArray(v)) as any[] | undefined;
          if (firstArray) statuses = firstArray;
        }
        
        return new Response(JSON.stringify({
          preview: true,
          total: statuses.length,
          sample: statuses.slice(0, 20),
          mapping: { "id": "external_id", "name": "name" },
          entityType: "lead_statuses"
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

    // Import: Lead Statuses
    if (action === 'import_lead_statuses') {
      console.log('Importing lead statuses...');
      progress.push({ step: 'import_lead_statuses', status: 'in_progress' });

      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetLeadStatuses?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();
        
        // Normalize response structure
        let statuses: any[] = [];
        if (Array.isArray(responseData)) {
          statuses = responseData;
        } else if (Array.isArray(responseData?.Statuses)) {
          statuses = responseData.Statuses;
        } else if (Array.isArray(responseData?.statuses)) {
          statuses = responseData.statuses;
        } else if (responseData && typeof responseData === 'object') {
          const firstArray = Object.values(responseData).find((v) => Array.isArray(v)) as any[] | undefined;
          if (firstArray) statuses = firstArray;
        }
        
        let importedCount = 0;
        for (const status of statuses) {
          const { error } = await supabase.from('lead_statuses').upsert({
            name: status.name || status.Name || 'Без названия',
            description: status.description || null,
            is_active: status.isActive !== false,
            sort_order: status.order || status.Order || 0,
            organization_id: orgId,
            external_id: status.id?.toString() || status.Id?.toString(),
          }, { onConflict: 'external_id,organization_id' });
          
          if (error) {
            console.error('Error upserting lead status:', error);
          } else {
            importedCount++;
          }
        }
        
        console.log(`Successfully imported ${importedCount} of ${statuses.length} lead statuses`);
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} lead statuses`;
      } catch (error) {
        console.error('Error importing lead statuses:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Student Statuses
    if (action === 'preview_student_statuses') {
      console.log('Previewing student statuses...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetStudentStatuses?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();
        
        // Normalize response structure
        let statuses: any[] = [];
        if (Array.isArray(responseData)) {
          statuses = responseData;
        } else if (Array.isArray(responseData?.Statuses)) {
          statuses = responseData.Statuses;
        } else if (Array.isArray(responseData?.statuses)) {
          statuses = responseData.statuses;
        } else if (responseData && typeof responseData === 'object') {
          const firstArray = Object.values(responseData).find((v) => Array.isArray(v)) as any[] | undefined;
          if (firstArray) statuses = firstArray;
        }
        
        return new Response(JSON.stringify({
          preview: true,
          total: statuses.length,
          sample: statuses.slice(0, 20),
          mapping: { "id": "external_id", "name": "name" },
          entityType: "student_statuses"
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

    // Import: Student Statuses
    if (action === 'import_student_statuses') {
      console.log('Importing student statuses...');
      progress.push({ step: 'import_student_statuses', status: 'in_progress' });

      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetStudentStatuses?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();
        
        // Normalize response structure
        let statuses: any[] = [];
        if (Array.isArray(responseData)) {
          statuses = responseData;
        } else if (Array.isArray(responseData?.Statuses)) {
          statuses = responseData.Statuses;
        } else if (Array.isArray(responseData?.statuses)) {
          statuses = responseData.statuses;
        } else if (responseData && typeof responseData === 'object') {
          const firstArray = Object.values(responseData).find((v) => Array.isArray(v)) as any[] | undefined;
          if (firstArray) statuses = firstArray;
        }
        
        let importedCount = 0;
        for (const status of statuses) {
          const { error } = await supabase.from('student_statuses').upsert({
            name: status.name || status.Name || 'Без названия',
            description: status.description || null,
            is_active: status.isActive !== false,
            sort_order: status.order || status.Order || 0,
            organization_id: orgId,
            external_id: status.id?.toString() || status.Id?.toString(),
          }, { onConflict: 'external_id,organization_id' });
          
          if (error) {
            console.error('Error upserting student status:', error);
          } else {
            importedCount++;
          }
        }
        
        console.log(`Successfully imported ${importedCount} of ${statuses.length} student statuses`);
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} student statuses`;
      } catch (error) {
        console.error('Error importing student statuses:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Learning Types
    if (action === 'preview_learning_types') {
      console.log('Previewing learning types...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetLearningTypes?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();
        
        // Normalize response structure
        let types: any[] = [];
        if (Array.isArray(responseData)) {
          types = responseData;
        } else if (Array.isArray(responseData?.Types)) {
          types = responseData.Types;
        } else if (Array.isArray(responseData?.types)) {
          types = responseData.types;
        } else if (responseData && typeof responseData === 'object') {
          const firstArray = Object.values(responseData).find((v) => Array.isArray(v)) as any[] | undefined;
          if (firstArray) types = firstArray;
        }
        
        return new Response(JSON.stringify({
          preview: true,
          total: types.length,
          sample: types.slice(0, 20),
          mapping: { "id": "external_id", "name": "name" },
          entityType: "learning_types"
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

    // Import: Learning Types
    if (action === 'import_learning_types') {
      console.log('Importing learning types...');
      progress.push({ step: 'import_learning_types', status: 'in_progress' });

      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetLearningTypes?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();
        
        // Normalize response structure
        let types: any[] = [];
        if (Array.isArray(responseData)) {
          types = responseData;
        } else if (Array.isArray(responseData?.Types)) {
          types = responseData.Types;
        } else if (Array.isArray(responseData?.types)) {
          types = responseData.types;
        } else if (responseData && typeof responseData === 'object') {
          const firstArray = Object.values(responseData).find((v) => Array.isArray(v)) as any[] | undefined;
          if (firstArray) types = firstArray;
        }
        
        let importedCount = 0;
        for (const type of types) {
          await supabase.from('learning_types').upsert({
            name: type.name || type.Name || 'Без названия',
            description: type.description || null,
            is_active: type.isActive !== false,
            sort_order: type.order || type.Order || 0,
            organization_id: orgId,
            external_id: type.id?.toString() || type.Id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} learning types`;
      } catch (error) {
        console.error('Error importing learning types:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Entrance Tests
    if (action === 'preview_entrance_tests') {
      console.log('Previewing entrance tests...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEntranceTests?authkey=${HOLIHOPE_API_KEY}&take=20&skip=0`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const tests = await response.json();
        
        return new Response(JSON.stringify({
          preview: true,
          total: tests.length,
          sample: tests.slice(0, 20),
          mapping: { "studentId/leadId": "student_id/lead_id", "assignedLevel": "assigned_level" },
          entityType: "entrance_tests"
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

    // Import: Entrance Tests
    if (action === 'import_entrance_tests') {
      console.log('Importing entrance tests...');
      progress.push({ step: 'import_entrance_tests', status: 'in_progress' });

      try {
        // Get all students with external_id (clientId from Holihope)
        console.log('Loading students...');
        const { data: students } = await supabase
          .from('students')
          .select('id, external_id')
          .not('external_id', 'is', null);
        
        if (!students || students.length === 0) {
          throw new Error('No students found with external_id');
        }
        
        console.log(`Found ${students.length} students with external_id`);
        
        // Pre-load teachers map
        const { data: teachers } = await supabase
          .from('teachers')
          .select('id, external_id')
          .not('external_id', 'is', null);
        
        const teacherMap = new Map((teachers || []).map(t => [t.external_id, t.id]));
        console.log(`Loaded ${teacherMap.size} teachers`);
        
        let allTests = [];
        let processedStudents = 0;
        
        // For each student, fetch their entrance tests using clientId
        for (const student of students) {
          try {
            const response = await fetch(
              `${HOLIHOPE_DOMAIN}/GetEntranceTests?authkey=${HOLIHOPE_API_KEY}&clientId=${student.external_id}`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
              }
            );
            
            if (response.ok) {
              const tests = await response.json();
              if (tests && Array.isArray(tests) && tests.length > 0) {
                // Add student_id to each test
                tests.forEach(test => {
                  test._student_id = student.id;
                  test._student_external_id = student.external_id;
                });
                allTests = allTests.concat(tests);
              }
            }
            
            processedStudents++;
            if (processedStudents % 50 === 0) {
              console.log(`Processed ${processedStudents}/${students.length} students, found ${allTests.length} tests`);
            }
            
            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (err) {
            console.error(`Error fetching tests for student ${student.external_id}:`, err);
            // Continue with next student
          }
        }
        
        console.log(`Total tests fetched: ${allTests.length} from ${processedStudents} students`);
        
        // Batch insert tests
        const batchSize = 100;
        let importedCount = 0;
        
        for (let i = 0; i < allTests.length; i += batchSize) {
          const batch = allTests.slice(i, i + batchSize);
          const testsToInsert = batch.map(test => ({
            student_id: test._student_id,
            lead_id: test.leadId || null,
            test_date: test.testDate || test.TestDate || new Date().toISOString().split('T')[0],
            assigned_level: test.assignedLevel || test.AssignedLevel || test.level || test.Level || null,
            teacher_id: test.teacherId ? teacherMap.get(test.teacherId.toString()) || null : null,
            comments: test.comments || test.Comments || null,
            organization_id: orgId,
            external_id: test.id?.toString() || test.Id?.toString(),
          }));
          
          const { error } = await supabase
            .from('entrance_tests')
            .upsert(testsToInsert, { onConflict: 'external_id' });
          
          if (error) {
            console.error(`Error inserting batch starting at ${i}:`, error);
          } else {
            importedCount += batch.length;
            console.log(`Imported ${importedCount}/${allTests.length} tests`);
          }
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} entrance tests from ${processedStudents} students`;
      } catch (error) {
        console.error('Error importing entrance tests:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Online Test Results
    if (action === 'preview_online_tests') {
      console.log('Previewing online tests...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetOnlineTestResults?authkey=${HOLIHOPE_API_KEY}&take=20&skip=0`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const tests = await response.json();
        
        return new Response(JSON.stringify({
          preview: true,
          total: tests.length,
          sample: tests.slice(0, 20),
          mapping: { "studentId": "student_id", "testName": "test_name", "score": "score" },
          entityType: "online_test_results"
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

    // Import: Online Test Results
    if (action === 'import_online_tests') {
      console.log('Importing online test results...');
      progress.push({ step: 'import_online_tests', status: 'in_progress' });

      try {
        let skip = 0;
        const take = 100;
        let allTests = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetOnlineTestResults?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
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
        
        let importedCount = 0;
        for (const test of allTests) {
          const { data: student } = await supabase.from('students').select('id').eq('external_id', test.studentId?.toString()).single();
          if (!student) continue;
          
          await supabase.from('online_test_results').upsert({
            student_id: student.id,
            test_name: test.testName || 'Онлайн-тест',
            test_date: test.testDate || new Date().toISOString().split('T')[0],
            score: test.score || null,
            max_score: test.maxScore || null,
            percentage: test.percentage || null,
            passed: test.passed || false,
            time_spent_minutes: test.timeSpent || null,
            comments: test.comments || null,
            organization_id: orgId,
            external_id: test.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} online test results`;
      } catch (error) {
        console.error('Error importing online test results:', error);
        progress[0].status = 'error';
        progress[0].error = error.message;
      }

      return new Response(JSON.stringify({ progress }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preview: Disciplines
    if (action === 'preview_disciplines') {
      console.log('Previewing disciplines...');
      try {
        const response = await fetch(`${HOLIHOPE_DOMAIN}/GetDisciplines?authkey=${HOLIHOPE_API_KEY}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();
        
        // Normalize response - API returns {"Disciplines": ["Английский", "Немецкий", ...]}
        const disciplines = Array.isArray(responseData) 
          ? responseData 
          : (responseData?.Disciplines || responseData?.disciplines || Object.values(responseData).find(val => Array.isArray(val)) || []);
        
        return new Response(JSON.stringify({
          preview: true,
          total: disciplines.length,
          sample: disciplines.slice(0, 20),
          mapping: { "string": "name (direct string array)" },
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
        const responseData = await response.json();
        
        // Normalize response - API returns {"Disciplines": ["Английский", "Немецкий", ...]}
        const disciplines = Array.isArray(responseData) 
          ? responseData 
          : (responseData?.Disciplines || responseData?.disciplines || Object.values(responseData).find(val => Array.isArray(val)) || []);
        
        let importedCount = 0;
        for (const disciplineName of disciplines) {
          // API returns array of strings, not objects
          await supabase.from('disciplines').upsert({
            name: disciplineName || 'Без названия',
            description: null,
            is_active: true,
            sort_order: importedCount,
            organization_id: orgId,
            external_id: disciplineName, // Use name as external_id since no ID provided
          }, { onConflict: 'external_id,organization_id' });
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
        const responseData = await response.json();
        
        // Normalize response - API returns {"Levels": [{Name, Disciplines}, ...]}
        const levels = Array.isArray(responseData) 
          ? responseData 
          : (responseData?.Levels || responseData?.levels || Object.values(responseData).find(val => Array.isArray(val)) || []);
        
        return new Response(JSON.stringify({
          preview: true,
          total: levels.length,
          sample: levels.slice(0, 20),
          mapping: { "Name": "name", "Disciplines": "applicable disciplines" },
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
        const responseData = await response.json();
        
        // Normalize response - API returns {"Levels": [{Name, Disciplines}, ...]}
        const levels = Array.isArray(responseData) 
          ? responseData 
          : (responseData?.Levels || responseData?.levels || Object.values(responseData).find(val => Array.isArray(val)) || []);
        
        let importedCount = 0;
        for (const level of levels) {
          // API returns {Name: string, Disciplines: string[]}
          const levelName = level.Name || level.name || 'Без названия';
          const disciplines = level.Disciplines || level.disciplines || [];
          
          await supabase.from('proficiency_levels').upsert({
            name: levelName,
            description: disciplines.length > 0 ? `Применяется для: ${disciplines.join(', ')}` : null,
            level_order: importedCount,
            is_active: true,
            organization_id: orgId,
            external_id: levelName, // Use name as external_id since no ID provided
          }, { onConflict: 'external_id,organization_id' });
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
        const responseData = await response.json();
        
        // Normalize response - API returns {"Employees": [...]}
        const employees = Array.isArray(responseData) 
          ? responseData 
          : (responseData?.Employees || responseData?.employees || Object.values(responseData).find(val => Array.isArray(val)) || []);
        
        const validEmployees = employees.filter(emp => !emp.Fired);
        
        return new Response(JSON.stringify({
          preview: true,
          total: validEmployees.length,
          sample: validEmployees.slice(0, 20),
          mapping: { 
            "Id": "external_id", 
            "FirstName/LastName/MiddleName": "full name", 
            "Mobile/Phone": "phone", 
            "EMail": "email",
            "Status": "status",
            "Position": "position",
            "Offices": "branches"
          },
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
          const responseData = await response.json();
          
          // Normalize response - API returns {"Employees": [...]}
          const employees = Array.isArray(responseData) 
            ? responseData 
            : (responseData?.Employees || responseData?.employees || Object.values(responseData).find(val => Array.isArray(val)) || []);
          
          if (!employees || employees.length === 0) break;
          
          const validEmployees = employees.filter(emp => !emp.Fired);
          allEmployees = allEmployees.concat(validEmployees);
          
          skip += take;
          if (employees.length < take) break;
        }
        
        let importedCount = 0;
        let skippedCount = 0;
        
        for (const employee of allEmployees) {
          // Get primary branch from Offices array
          const primaryBranch = employee.Offices && employee.Offices.length > 0 
            ? employee.Offices[0].Name 
            : 'Окская';
          
          // Create profile data - import all employees regardless of email
          const profileData = {
            first_name: employee.FirstName || '',
            last_name: employee.LastName || '',
            email: employee.EMail || null,
            phone: employee.Mobile || employee.Phone || null,
            department: employee.Position || null,
            branch: primaryBranch,
            organization_id: orgId,
          };
          
          // Try to find existing profile by email or phone
          let existingProfile = null;
          
          if (employee.EMail) {
            const { data } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', employee.EMail)
              .maybeSingle();
            existingProfile = data;
          }
          
          if (!existingProfile && (employee.Mobile || employee.Phone)) {
            const phone = employee.Mobile || employee.Phone;
            const { data } = await supabase
              .from('profiles')
              .select('id')
              .eq('phone', phone)
              .maybeSingle();
            existingProfile = data;
          }
          
          if (existingProfile) {
            // Update existing profile
            await supabase
              .from('profiles')
              .update(profileData)
              .eq('id', existingProfile.id);
          }
          
          console.log(`Processed employee ${employee.FirstName} ${employee.LastName}`);
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Processed ${importedCount} employees. Note: For employees with emails, auth users must be created manually in Supabase Auth.`;
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
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - 180); // 6 months back
        const to = new Date(now);
        to.setDate(to.getDate() + 180); // 6 months forward
        const dateFrom = from.toISOString().slice(0, 10);
        const dateTo = to.toISOString().slice(0, 10);
        
        // Batch parameters
        const batchSize = body.batch_size || null; // If null, process all
        const startOfficeIndex = body.office_index || 0;
        const startStatusIndex = body.status_index || 0;
        const startTimeIndex = body.time_index || 0;
        
        // Step 1: Get list of offices
        console.log('Fetching list of offices from GetOffices...');
        const officesUrl = `${HOLIHOPE_DOMAIN}/GetOffices?authkey=${HOLIHOPE_API_KEY}`;
        const officesResp = await fetch(officesUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        
        if (!officesResp.ok) {
          throw new Error(`Failed to fetch offices: ${officesResp.status}`);
        }
        
        const officesRaw = await officesResp.json();
        const offices = Array.isArray(officesRaw) ? officesRaw : (officesRaw?.Offices || officesRaw?.Office || []);
        const officeIds = offices.map((o: any) => o.Id || o.OfficeId || o.id).filter(Boolean);
        console.log(`Found ${officeIds.length} offices: ${officeIds.join(', ')}`);
        
        if (officeIds.length === 0) {
          throw new Error('No offices found');
        }
        
        // Statuses to iterate through
        const statuses = ['Reserve', 'Forming', 'Working', 'Stopped', 'Finished'];
        
        // Time ranges from 06:00 to 23:00 with 1 hour step
        const timeRanges: Array<{ from: string; to: string }> = [];
        for (let hour = 6; hour < 23; hour++) {
          const fromTime = `${hour.toString().padStart(2, '0')}:00`;
          const toTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
          timeRanges.push({ from: fromTime, to: toTime });
        }
        
        const totalCombinations = officeIds.length * statuses.length * timeRanges.length;
        console.log(`Total combinations: ${totalCombinations}. Starting from: office=${startOfficeIndex}, status=${startStatusIndex}, time=${startTimeIndex}`);
        if (batchSize) {
          console.log(`Batch mode enabled: will process ${batchSize} requests per call`);
        }
        
        let allUnits: any[] = [];
        let fetchedCount = 0;
        let totalRequests = 0;
        let successfulRequests = 0;
        let hasMore = false;
        let nextOfficeIndex = startOfficeIndex;
        let nextStatusIndex = startStatusIndex;
        let nextTimeIndex = startTimeIndex;
        
        // Step 2: For each office, fetch units by status and time range
        outerLoop: for (let oi = startOfficeIndex; oi < officeIds.length; oi++) {
          const officeId = officeIds[oi];
          
          for (let si = (oi === startOfficeIndex ? startStatusIndex : 0); si < statuses.length; si++) {
            const status = statuses[si];
            
            for (let ti = (oi === startOfficeIndex && si === startStatusIndex ? startTimeIndex : 0); ti < timeRanges.length; ti++) {
              const timeRange = timeRanges[ti];
              
              // Check if we've reached the batch limit
              if (batchSize && totalRequests >= batchSize) {
                hasMore = true;
                nextOfficeIndex = oi;
                nextStatusIndex = si;
                nextTimeIndex = ti;
                console.log(`Batch limit reached. Next batch should start at: office=${oi}, status=${si}, time=${ti}`);
                break outerLoop;
              }
              
              try {
                const apiUrl = `${HOLIHOPE_DOMAIN}/GetEdUnits?authkey=${HOLIHOPE_API_KEY}&officeOrCompanyId=${encodeURIComponent(officeId)}&statuses=${encodeURIComponent(status)}&timeFrom=${encodeURIComponent(timeRange.from)}&timeTo=${encodeURIComponent(timeRange.to)}&queryDays=true&queryFiscalInfo=true&queryTeacherPrices=true&dateFrom=${dateFrom}&dateTo=${dateTo}`;
                totalRequests++;
                
                const currentPosition = (oi * statuses.length * timeRanges.length) + (si * timeRanges.length) + ti + 1;
                console.log(`[${currentPosition}/${totalCombinations}] Fetching: Office=${officeId}, Status=${status}, Time=${timeRange.from}-${timeRange.to}`);
                
                const response = await fetch(apiUrl, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' },
                });
                
                if (!response.ok) {
                  console.warn(`  ⚠️ HTTP ${response.status}`);
                  continue;
                }
                
                const raw = await response.json();
                const batch = Array.isArray(raw) ? raw : (raw?.EdUnits || []);
                
                if (batch.length > 0) {
                  allUnits = allUnits.concat(batch);
                  fetchedCount += batch.length;
                  successfulRequests++;
                  console.log(`  ✓ Fetched ${batch.length} units (total: ${fetchedCount}, successful requests: ${successfulRequests})`);
                } else {
                  console.log(`  ℹ Empty response (0 units)`);
                }
                
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (err) {
                console.error(`  ✗ Error: ${err}`);
                // Continue with next combination
              }
            }
          }
        }
        
        console.log(`Total units fetched: ${allUnits.length}`);
        console.log(`Processed ${totalRequests} requests (${successfulRequests} successful)`);
        
        // Log units without ID for debugging
        const unitsWithoutId = allUnits.filter(u => !u.Id);
        console.log(`Units without ID: ${unitsWithoutId.length}`);
        
        // Create unique ID including period dates to handle multiple periods for same EdUnit
        const uniqueUnits = allUnits.reduce((acc, unit, index) => {
          const id = unit.Id?.toString();
          
          // Skip units without ID
          if (!id) {
            console.log(`  Skipping unit without ID at index ${index}: ${unit.Name || 'unnamed'}`);
            return acc;
          }
          
          const beginDate = unit.ScheduleItems?.[0]?.BeginDate || '';
          const endDate = unit.ScheduleItems?.[0]?.EndDate || '';
          
          // Create composite key: EdUnitId + BeginDate + EndDate
          // If no dates, include name to avoid collisions
          const compositeKey = (beginDate || endDate) 
            ? `${id}_${beginDate}_${endDate}`
            : `${id}_${unit.Name || 'noname'}`;
          
          if (!acc.has(compositeKey)) {
            acc.set(compositeKey, unit);
          } else {
            console.log(`  Duplicate found: ${compositeKey}`);
          }
          return acc;
        }, new Map());
        
        const unitsToImport = Array.from(uniqueUnits.values());
        console.log(`Unique units after deduplication: ${unitsToImport.length} (from ${allUnits.length} total)`);
        
        let importedCount = 0;
        let typeStats = {};
        
        for (const unit of unitsToImport) {
          const unitType = unit.Type || unit.type || 'Group';
          typeStats[unitType] = (typeStats[unitType] || 0) + 1;
          
          // Extract schedule info from ScheduleItems
          let scheduleDays = null;
          let scheduleTime = null;
          let scheduleRoom = null;
          
          if (unit.ScheduleItems && unit.ScheduleItems.length > 0) {
            const firstSchedule = unit.ScheduleItems[0];
            scheduleDays = firstSchedule.Weekdays?.toString() || null;
            scheduleTime = firstSchedule.BeginTime && firstSchedule.EndTime 
              ? `${firstSchedule.BeginTime}-${firstSchedule.EndTime}` 
              : null;
            scheduleRoom = firstSchedule.ClassroomName || firstSchedule.ClassroomLink || null;
          }
          
          // Map Holihope status to our enum
          const mapGroupStatus = (holihopeStatus: string): string => {
            const statusMap: Record<string, string> = {
              'working': 'active',
              'reserve': 'reserve',
              'forming': 'forming',
              'active': 'active',
              'suspended': 'suspended',
              'finished': 'finished',
              'completed': 'finished'
            };
            return statusMap[holihopeStatus?.toLowerCase()] || 'active';
          };

          // Import based on unit type
          if (unitType === 'Individual') {
            // Import as individual_lessons (student will be linked in step 13)
            // Note: student_name will be updated when linking students
            // Create unique external_id including period to handle multiple periods for same EdUnit
            const beginDate = unit.ScheduleItems?.[0]?.BeginDate || '';
            const endDate = unit.ScheduleItems?.[0]?.EndDate || '';
            // If no dates, include name to match deduplication logic
            const externalId = (beginDate || endDate)
              ? `${unit.Id}_${beginDate}_${endDate}`
              : `${unit.Id}_${unit.Name || 'noname'}`;
            
            const { error: lessonError } = await supabase.from('individual_lessons').upsert({
              student_name: unit.Name || 'Без названия',
              branch: unit.OfficeOrCompanyName || 'Окская',
              subject: unit.Discipline || 'Английский',
              level: unit.Level || 'A1',
              category: 'all',
              lesson_type: 'individual',
              status: 'active',
              teacher_name: unit.ScheduleItems?.[0]?.TeacherName || null,
              schedule_days: scheduleDays ? [scheduleDays] : null,
              schedule_time: scheduleTime,
              lesson_location: scheduleRoom,
              period_start: unit.ScheduleItems?.[0]?.BeginDate || null,
              period_end: unit.ScheduleItems?.[0]?.EndDate || null,
              price_per_lesson: unit.FiscalInfo?.PriceValue || null,
              description: unit.Description || null,
              organization_id: orgId,
              external_id: externalId,
            }, { onConflict: 'external_id' });
            
            if (lessonError) {
              console.error(`❌ Error importing individual lesson ${unit.Id} (external_id: ${externalId}):`, JSON.stringify(lessonError));
            } else {
              importedCount++;
            }
          } else {
            // Import as learning_groups (Group, MiniGroup, etc.)
            const groupType = unitType === 'MiniGroup' ? 'mini' : 'general';
            const maxStudents = (unit.StudentsCount || 0) + (unit.Vacancies || 0);
            
            // Create unique external_id including period to handle multiple periods for same EdUnit
            const beginDate = unit.ScheduleItems?.[0]?.BeginDate || '';
            const endDate = unit.ScheduleItems?.[0]?.EndDate || '';
            // If no dates, include name to match deduplication logic
            const externalId = (beginDate || endDate)
              ? `${unit.Id}_${beginDate}_${endDate}`
              : `${unit.Id}_${unit.Name || 'noname'}`;
            
            const { error: groupError } = await supabase.from('learning_groups').upsert({
              name: unit.Name || 'Без названия',
              branch: unit.OfficeOrCompanyName || 'Окская',
              subject: unit.Discipline || 'Английский',
              level: unit.Level || 'A1',
              category: 'all',
              group_type: groupType,
              status: mapGroupStatus(unit.Status),
              payment_method: 'per_lesson',
              capacity: maxStudents > 0 ? maxStudents : 12,
              current_students: unit.StudentsCount || 0,
              responsible_teacher: unit.ScheduleItems?.[0]?.TeacherName || null,
              schedule_days: scheduleDays ? [scheduleDays] : null,
              schedule_time: scheduleTime,
              schedule_room: scheduleRoom,
              period_start: unit.ScheduleItems?.[0]?.BeginDate || null,
              period_end: unit.ScheduleItems?.[0]?.EndDate || null,
              default_price: unit.FiscalInfo?.PriceValue || null,
              description: unit.Description || null,
              organization_id: orgId,
              external_id: externalId,
            }, { onConflict: 'external_id' });
            
            if (groupError) {
              console.error(`❌ Error importing learning group ${unit.Id} (external_id: ${externalId}):`, JSON.stringify(groupError));
            } else {
              importedCount++;
            }
          }
        }
        
        // Process ScheduleItems and Days for all imported units
        console.log('Processing schedule items and lesson days...');
        
        // Helper function to parse weekdays bitmask
        const parseWeekdays = (weekdaysMask: number): string[] => {
          const days: string[] = [];
          const dayMap: { [key: number]: string } = {
            1: 'monday',
            2: 'tuesday',
            4: 'wednesday',
            8: 'thursday',
            16: 'friday',
            32: 'saturday',
            64: 'sunday',
          };
          
          for (const [bit, day] of Object.entries(dayMap)) {
            if (weekdaysMask & parseInt(bit)) {
              days.push(day);
            }
          }
          
          return days;
        };
        
        let totalScheduleItems = 0;
        let totalGroupSchedules = 0;
        let totalIndividualSchedules = 0;
        let totalLessons = 0;
        let totalGroupLessons = 0;
        let totalIndividualLessons = 0;
        
        for (const unit of unitsToImport) {
          const unitType = unit.Type || unit.type || 'Group';
          const isIndividual = unitType === 'Individual';
          
          // Update ScheduleItems with proper weekdays parsing
          if (unit.ScheduleItems && Array.isArray(unit.ScheduleItems) && unit.ScheduleItems.length > 0) {
            for (const scheduleItem of unit.ScheduleItems) {
              const scheduleDays = parseWeekdays(scheduleItem.Weekdays || 0);
              const beginDate = unit.ScheduleItems?.[0]?.BeginDate || '';
              const endDate = unit.ScheduleItems?.[0]?.EndDate || '';
              const externalId = (beginDate || endDate)
                ? `${unit.Id}_${beginDate}_${endDate}`
                : `${unit.Id}_${unit.Name || 'noname'}`;
              
              if (isIndividual) {
                const { data: individualLesson } = await supabase
                  .from('individual_lessons')
                  .select('id')
                  .eq('external_id', externalId)
                  .single();
                
                if (individualLesson) {
                  await supabase
                    .from('individual_lessons')
                    .update({
                      schedule_days: scheduleDays,
                      schedule_time: `${scheduleItem.BeginTime}-${scheduleItem.EndTime}`,
                      lesson_location: scheduleItem.ClassroomName || scheduleItem.ClassroomLink || null,
                      period_start: scheduleItem.BeginDate || null,
                      period_end: scheduleItem.EndDate || null,
                    })
                    .eq('id', individualLesson.id);
                  
                  totalIndividualSchedules++;
                }
              } else {
                const { data: group } = await supabase
                  .from('learning_groups')
                  .select('id')
                  .eq('external_id', externalId)
                  .single();
                
                if (group) {
                  await supabase
                    .from('learning_groups')
                    .update({
                      schedule_days: scheduleDays,
                      lesson_start_time: scheduleItem.BeginTime || null,
                      lesson_end_time: scheduleItem.EndTime || null,
                      schedule_room: scheduleItem.ClassroomName || null,
                      zoom_link: scheduleItem.ClassroomLink || null,
                      period_start: scheduleItem.BeginDate || null,
                      period_end: scheduleItem.EndDate || null,
                    })
                    .eq('id', group.id);
                  
                  totalGroupSchedules++;
                }
              }
              
              totalScheduleItems++;
            }
          }
          
          // Process Days (specific lesson sessions)
          if (unit.Days && Array.isArray(unit.Days) && unit.Days.length > 0) {
            const beginDate = unit.ScheduleItems?.[0]?.BeginDate || '';
            const endDate = unit.ScheduleItems?.[0]?.EndDate || '';
            const externalId = (beginDate || endDate)
              ? `${unit.Id}_${beginDate}_${endDate}`
              : `${unit.Id}_${unit.Name || 'noname'}`;
            
            // Deduplicate Days by Date + BeginTime
            const uniqueDays = new Map();
            for (const day of unit.Days) {
              const dayKey = `${day.Date}_${day.BeginTime}`;
              if (!uniqueDays.has(dayKey)) {
                uniqueDays.set(dayKey, day);
              }
            }
            
            for (const day of uniqueDays.values()) {
              if (isIndividual) {
                const { data: individualLesson } = await supabase
                  .from('individual_lessons')
                  .select('id')
                  .eq('external_id', externalId)
                  .single();

                if (individualLesson) {
                  const sessionData = {
                    individual_lesson_id: individualLesson.id,
                    lesson_date: day.Date || day.date,
                    start_time: day.BeginTime || day.beginTime || '10:00',
                    end_time: day.EndTime || day.endTime || '11:20',
                    status: day.Canceled ? 'cancelled' : 
                           day.IsCompleted || day.isCompleted ? 'completed' : 'scheduled',
                    topic: day.Topic || day.topic || null,
                    homework: day.Homework || day.homework || null,
                    notes: day.Notes || day.notes || null,
                    external_id: day.Id?.toString() || `${unit.Id}_${day.Date}`,
                  };

                  const { error } = await supabase
                    .from('individual_lesson_sessions')
                    .upsert(sessionData, { onConflict: 'external_id' });

                  if (!error) {
                    totalIndividualLessons++;
                  }
                }
              } else {
                const { data: group } = await supabase
                  .from('learning_groups')
                  .select('id')
                  .eq('external_id', externalId)
                  .single();

                if (group) {
                  const sessionData = {
                    group_id: group.id,
                    lesson_date: day.Date || day.date,
                    start_time: day.BeginTime || day.beginTime || '10:00',
                    end_time: day.EndTime || day.endTime || '11:20',
                    status: day.Canceled ? 'cancelled' : 
                           day.IsCompleted || day.isCompleted ? 'completed' : 'scheduled',
                    topic: day.Topic || day.topic || null,
                    homework: day.Homework || day.homework || null,
                    notes: day.Notes || day.notes || null,
                    external_id: day.Id?.toString() || `${unit.Id}_${day.Date}`,
                  };

                  const { error } = await supabase
                    .from('lesson_sessions')
                    .upsert(sessionData, { onConflict: 'external_id' });

                  if (!error) {
                    totalGroupLessons++;
                  }
                }
              }
            }
            
            totalLessons += uniqueDays.size;
          }
        }
        
        console.log(`Processed ${totalScheduleItems} schedule items (${totalGroupSchedules} group, ${totalIndividualSchedules} individual)`);
        console.log(`Processed ${totalLessons} lesson sessions (${totalGroupLessons} group, ${totalIndividualLessons} individual)`);
        
        // Get actual counts from database instead of using importedCount
        // because upsert can update existing records without incrementing
        const { count: groupsCount } = await supabase.from('learning_groups')
          .select('*', { count: 'exact', head: true })
          .not('external_id', 'is', null);
        
        const { count: lessonsCount } = await supabase.from('individual_lessons')
          .select('*', { count: 'exact', head: true })
          .not('external_id', 'is', null);
        
        const actualCount = (groupsCount || 0) + (lessonsCount || 0);
        
        progress[0].status = hasMore ? 'in_progress' : 'completed';
        progress[0].count = actualCount;
        progress[0].hasMore = hasMore;
        
        if (hasMore) {
          progress[0].message = `Batch completed: Imported ${importedCount} units from ${successfulRequests} requests. Continue with next batch.`;
          // Include next batch parameters in response
          return new Response(JSON.stringify({ 
            progress,
            nextBatch: {
              office_index: nextOfficeIndex,
              status_index: nextStatusIndex,
              time_index: nextTimeIndex,
              batch_size: batchSize
            },
            stats: {
              totalFetched: fetchedCount,
              totalImported: importedCount,
              requestsProcessed: totalRequests,
              successfulRequests: successfulRequests,
              typeStats: typeStats
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          progress[0].message = `Import completed: ${importedCount} educational units imported. Types: ${JSON.stringify(typeStats)}`;
          return new Response(JSON.stringify({ 
            progress,
            stats: {
              totalFetched: fetchedCount,
              totalImported: importedCount,
              requestsProcessed: totalRequests,
              successfulRequests: successfulRequests,
              typeStats: typeStats
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
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
      console.log('Importing ed unit students (linking with groups and individual lessons)...');
      progress.push({ step: 'import_ed_unit_students', status: 'in_progress' });

      try {
        const batchMode = body.batch_mode === true;
        const skipParam = body.skip || 0;
        const take = body.take ? Number(body.take) : (batchMode ? 1 : 10); // Smaller batches to avoid timeouts

        // Fetch educational units from DB (both groups and individual lessons) with external_id
        console.log(`Fetching educational units from DB (skip=${skipParam}, take=${take})...`);
        const { data: allGroups } = await supabase
          .from('learning_groups')
          .select('id, name, external_id, organization_id')
          .not('external_id', 'is', null)
          .range(skipParam, skipParam + take - 1);
        
        const { data: allIndividualLessons } = await supabase
          .from('individual_lessons')
          .select('id, student_name, external_id, organization_id')
          .not('external_id', 'is', null)
          .range(skipParam, skipParam + take - 1);
        
        const edUnits = [
          ...(allGroups || []).map(g => ({ ...g, type: 'group' })),
          ...(allIndividualLessons || []).map(il => ({ ...il, type: 'individual' }))
        ];
        
        console.log(`Found ${edUnits.length} educational units to process (${allGroups?.length || 0} groups, ${allIndividualLessons?.length || 0} individual)`);
        
        if (edUnits.length === 0) {
          console.log('No more educational units to process');
          progress[0].status = 'completed';
          progress[0].count = 0;
          progress[0].message = `No more educational units to process (skip=${skipParam})`;
          progress[0].hasMore = false;
          return new Response(JSON.stringify({ progress }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Fetch all students with external_id in batches (Supabase has 1000 row limit by default)
        console.log('Fetching all students with external_id...');
        const studentByExternalIdMap = new Map();
        const allStudents = [];
        
        let fetchOffset = 0;
        const fetchBatchSize = 1000;
        while (true) {
          const { data: studentsBatch, error } = await supabase
            .from('students')
            .select('id, external_id, first_name, last_name')
            .not('external_id', 'is', null)
            .range(fetchOffset, fetchOffset + fetchBatchSize - 1);
          
          if (error) {
            console.error('Error fetching students:', error);
            break;
          }
          
          if (!studentsBatch || studentsBatch.length === 0) {
            break;
          }
          
          studentsBatch.forEach(s => {
            studentByExternalIdMap.set(s.external_id, s.id);
            allStudents.push(s);
          });
          fetchOffset += fetchBatchSize;
          
          if (studentsBatch.length < fetchBatchSize) {
            break; // Last batch
          }
        }
        
        console.log(`Found ${studentByExternalIdMap.size} students with external_id`);
        
        
        let groupLinksCount = 0;
        let individualLinksCount = 0;
        let skippedCount = 0;
        let skippedReasons = {
          noStudentsInResponse: 0,
          studentNotFound: 0,
          apiError: 0
        };
        
        const groupStudentsToInsert = [];
        const individualLessonsToUpdate = [];
        
        console.log('Processing educational units...');
        for (const edUnit of edUnits) {
          const edUnitExternalId = edUnit.external_id;
          console.log(`\nProcessing ${edUnit.type} with external_id=${edUnitExternalId}...`);
          
          try {
            // Make API request to GetEdUnitStudents for this specific educational unit
            // IMPORTANT: for groups, API expects original unit Id, not composite external_id with dates
            const edUnitIdForApi = edUnit.type === 'group'
              ? (typeof edUnitExternalId === 'string' ? edUnitExternalId.split('_')[0] : edUnitExternalId)
              : edUnitExternalId;
            // ВАЖНО: queryPayers=true для получения массива Payers с ClientId
            const apiUrl = `${HOLIHOPE_DOMAIN}/GetEdUnitStudents?authkey=${HOLIHOPE_API_KEY}&edUnitId=${edUnitIdForApi}&queryPayers=true`;
            console.log(`  Fetching students from: ${apiUrl}`);
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });
            
            if (!response.ok) {
              console.log(`  API error for edUnit ${edUnitExternalId}: HTTP ${response.status}`);
              skippedReasons.apiError++;
              continue;
            }
            
            const raw = await response.json();
            
            // Extract array from response
            const students = Array.isArray(raw)
              ? raw
              : (raw.EdUnitStudents || raw.edUnitStudents || raw.Students || raw.students || raw.data || []);
            
            if (!Array.isArray(students) || students.length === 0) {
              console.log(`  No students in response for edUnit ${edUnitExternalId}`);
              skippedReasons.noStudentsInResponse++;
              continue;
            }
            
            console.log(`  Found ${students.length} students for edUnit ${edUnitExternalId}`);
            
            // Process each student in this educational unit
            for (const studentData of students) {
              let studentId = null;
              
              // Поиск: students.external_id может быть Id, ClientId, или StudentClientId
              const studentClientId = (
                studentData.StudentClientId ??
                studentData.studentClientId ??
                studentData.ClientId ??
                studentData.clientId ??
                (Array.isArray(studentData.Payers) && studentData.Payers[0]?.ClientId) ??
                (Array.isArray(studentData.payers) && studentData.payers[0]?.clientId) ??
                studentData.Id ??
                studentData.id
              )?.toString();
              if (studentClientId) {
                studentId = studentByExternalIdMap.get(studentClientId) || null;
              }
              
              if (!studentId) {
                console.log(`  ❌ Student NOT FOUND: ClientId=${studentClientId}, EdUnit=${edUnitExternalId}`);
                skippedCount++;
                skippedReasons.studentNotFound++;
                continue;
              }
              
              const rawStatus = (studentData.Status ?? studentData.status ?? '').toString();
              // Map Holihope status to our enum (active, paused, completed, dropped)
              const status = /reserve|резерв/i.test(rawStatus) ? 'paused' 
                          : /stopped|отчисл|выбыл|прекрат/i.test(rawStatus) ? 'dropped' 
                          : /завершен|completed/i.test(rawStatus) ? 'completed'
                          : 'active';
              
              const enrollmentDate = studentData.BeginDate ?? studentData.beginDate ?? new Date().toISOString().split('T')[0];
              const exitDate = studentData.EndDate ?? studentData.endDate ?? null;
              
              // Get student info for individual lessons
              const student = allStudents?.find(s => s.id === studentId);
              const studentName = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : 'Unknown Student';
              const studentLevel = 'A1'; // Default level, can be updated later
              
              // Determine if this is a group or individual lesson based on edUnit.type
              if (edUnit.type === 'group') {
                // Link student to group
                groupStudentsToInsert.push({
                  student_id: studentId,
                  group_id: edUnit.id,
                  status,
                  enrollment_date: enrollmentDate,
                  exit_date: exitDate,
                  notes: `Imported from Holihope (Status: ${rawStatus})`
                });
                groupLinksCount++;
              } else if (edUnit.type === 'individual') {
                // Update individual lesson with student
                individualLessonsToUpdate.push({
                  id: edUnit.id,
                  student_id: studentId,
                  student_name: studentName,
                  level: studentLevel,
                  organization_id: edUnit.organization_id,
                  status,
                  period_start: enrollmentDate,
                  period_end: exitDate,
                  notes: `Imported from Holihope (Status: ${rawStatus})`
                });
                individualLinksCount++;
              }
            }
          } catch (err) {
            console.log(`  Error processing edUnit ${edUnitExternalId}:`, err.message);
            skippedReasons.apiError++;
          }
        }
        
        console.log(`Prepared ${groupStudentsToInsert.length} group links and ${individualLessonsToUpdate.length} individual lesson updates`);
        console.log(`Skip reasons:`, skippedReasons);
        
        // Batch insert group_students
        if (groupStudentsToInsert.length > 0) {
          console.log(`Inserting ${groupStudentsToInsert.length} group-student links in batches...`);
          for (let i = 0; i < groupStudentsToInsert.length; i += 100) {
            const batch = groupStudentsToInsert.slice(i, i + 100);
            const { error } = await supabase
              .from('group_students')
              .upsert(batch, { onConflict: 'group_id,student_id', ignoreDuplicates: false });
            
            if (error) {
              console.error(`Error inserting group_students batch ${i}-${i + batch.length}:`, error);
            } else {
              console.log(`Inserted group_students batch ${i}-${i + batch.length}`);
            }
          }
        }
        
        // Batch update individual_lessons using upsert
        if (individualLessonsToUpdate.length > 0) {
          console.log(`Updating ${individualLessonsToUpdate.length} individual lessons in batches...`);
          for (let i = 0; i < individualLessonsToUpdate.length; i += 100) {
            const batch = individualLessonsToUpdate.slice(i, i + 100);
            const { error } = await supabase
              .from('individual_lessons')
              .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
            
            if (error) {
              console.error(`Error updating individual_lessons batch ${i}-${i + batch.length}:`, error);
            } else {
              console.log(`Updated individual_lessons batch ${i}-${i + batch.length}`);
            }
          }
        }
        
        progress[0].status = 'completed';
        progress[0].count = groupLinksCount + individualLinksCount;
        progress[0].message = `Linked ${groupLinksCount} students to groups, ${individualLinksCount} to individual lessons (skipped ${skippedCount}: no students=${skippedReasons.noStudentsInResponse}, student not found=${skippedReasons.studentNotFound}, API errors=${skippedReasons.apiError})`;
        progress[0].hasMore = batchMode && ((allGroups?.length === take) || (allIndividualLessons?.length === take));
        progress[0].nextSkip = skipParam + take;
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
            organization_id: orgId,
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
            organization_id: orgId,
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
            organization_id: orgId,
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
            organization_id: orgId,
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
