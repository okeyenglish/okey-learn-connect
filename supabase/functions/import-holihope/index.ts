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

    const body = await req.json();
    const { action } = body;
    
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

        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', "O'KEY ENGLISH")
          .single();

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
                  organization_id: orgData?.id,
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
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', "O'KEY ENGLISH")
          .single();

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

        let skip = 0;
        const take = 100;
        let totalLeadsImported = 0;
        let totalFamilyLinksCreated = 0;
        let totalSkippedNoPhone = 0;

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
          
          console.log(`Processing ${leads.length} leads...`);

          // Get all unique client external IDs from this batch
          const clientExternalIds = [...new Set(
            leads
              .filter(lead => lead.clientId)
              .map(lead => lead.clientId.toString())
          )];

          // Fetch all clients in batches
          const clientMap = new Map(); // external_id -> client
          if (clientExternalIds.length > 0) {
            for (let i = 0; i < clientExternalIds.length; i += 100) {
              const batch = clientExternalIds.slice(i, i + 100);
              const { data: clients } = await supabase
                .from('clients')
                .select('id, external_id')
                .in('external_id', batch);
              
              if (clients) {
                clients.forEach(c => clientMap.set(c.external_id, c));
              }
            }
          }

          // Prepare family groups to create
          const familyGroupsToCreate = new Map(); // name -> family group data
          const leadToClientMap = new Map(); // lead id -> client_id

          for (const lead of leads) {
            if (lead.clientId) {
              const client = clientMap.get(lead.clientId.toString());
              if (client) {
                const familyName = `Семья ${lead.lastName || 'Лида'}`;
                if (!familyGroupsToCreate.has(familyName)) {
                  familyGroupsToCreate.set(familyName, {
                    name: familyName,
                    branch: lead.location || lead.branch || 'Окская',
                    organization_id: orgData?.id,
                  });
                }
                leadToClientMap.set(lead.id?.toString(), client.id);
              }
            }
          }

          // Batch upsert family groups
          const familyGroupMap = new Map(); // name -> family_group_id
          if (familyGroupsToCreate.size > 0) {
            const familyGroupsArray = Array.from(familyGroupsToCreate.values());
            for (let i = 0; i < familyGroupsArray.length; i += 50) {
              const batch = familyGroupsArray.slice(i, i + 50);
              const { data: familyGroups } = await supabase
                .from('family_groups')
                .upsert(batch, { onConflict: 'name,organization_id' })
                .select('id, name');
              
              if (familyGroups) {
                familyGroups.forEach(fg => familyGroupMap.set(fg.name, fg.id));
              }
            }
          }

          // Normalize and prepare leads; skip records without a valid phone
          const normalizePhone = (p: any): string | null => {
            if (!p) return null;
            let s = String(p).replace(/\D/g, '');
            if (!s) return null;
            // Basic RU normalization: 8XXXXXXXXXX -> 7XXXXXXXXXX
            if (s.length === 11 && s.startsWith('8')) s = '7' + s.slice(1);
            return s.length >= 10 ? s : null;
          };

          let skippedNoPhone = 0;
          const leadsToInsert = leads.reduce((acc: any[], lead: any) => {
            const phoneNorm = normalizePhone(lead.phone);
            if (!phoneNorm) { skippedNoPhone++; return acc; }
            acc.push({
              first_name: lead.firstName || '',
              last_name: lead.lastName || '',
              phone: phoneNorm,
              email: lead.email || null,
              age: lead.age || null,
              subject: lead.subject || null,
              level: lead.level || null,
              branch: lead.location || lead.branch || 'Окская',
              notes: lead.notes || lead.comment || null,
              status_id: statusId,
              lead_source_id: null,
              assigned_to: null,
            });
            return acc;
          }, [] as any[]);

          totalSkippedNoPhone += skippedNoPhone;
          console.log(`Prepared ${leadsToInsert.length} leads for insert (skipped ${skippedNoPhone} without phone)`);

          // Batch insert leads into leads table (200 at a time)
          console.log(`Inserting ${leadsToInsert.length} leads into leads table...`);
          
          for (let i = 0; i < leadsToInsert.length; i += 200) {
            const batch = leadsToInsert.slice(i, i + 200);
            const { data: insertedLeads, error: leadsError } = await supabase
              .from('leads')
              .insert(batch)
              .select('id, phone, first_name, last_name');

            if (leadsError) {
              console.error(`Error inserting leads batch (size: ${batch.length}):`, leadsError);
              continue;
            }
            
            if (insertedLeads) {
              totalLeadsImported += insertedLeads.length;
              console.log(`Inserted ${insertedLeads.length} leads successfully`);
            }
          }

          // Batch create family member links
          const familyMembersToCreate = [];
          for (const lead of leads) {
            const clientId = leadToClientMap.get(lead.id?.toString());
            const familyName = `Семья ${lead.lastName || 'Лида'}`;
            const familyGroupId = familyGroupMap.get(familyName);
            
            if (clientId && familyGroupId) {
              familyMembersToCreate.push({
                family_group_id: familyGroupId,
                client_id: clientId,
                is_primary_contact: true,
                relationship_type: 'parent',
              });
            }
          }

          if (familyMembersToCreate.length > 0) {
            console.log(`Creating ${familyMembersToCreate.length} family member links...`);
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
          if (leads.length < take) {
            console.log('Reached last page of leads');
            break;
          }
        }

        progress[0].status = 'completed';
        progress[0].count = totalLeadsImported;
        progress[0].message = `Imported ${totalLeadsImported} leads (${totalFamilyLinksCreated} linked to parents, skipped ${totalSkippedNoPhone} without phone)`;
        console.log(`Import complete: ${totalLeadsImported} leads, ${totalFamilyLinksCreated} family links, skipped ${totalSkippedNoPhone} without phone`);
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
          
          const responseData = await response.json();
          
          // Normalize response - API may return {"Students": [...]} or direct array
          const students = Array.isArray(responseData) 
            ? responseData 
            : (responseData?.Students || responseData?.students || Object.values(responseData).find(val => Array.isArray(val)) || []);
          
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

        // CRITICAL: Process agents first to build family groups correctly
        // Agents ARE clients (parents/contacts), not separate entities
        const agentToFamilyMap = new Map(); // phone/email -> family_group_id

        for (const student of allStudents) {
          let familyGroupId = null;
          const studentAgents = student.Agents || [];

          // Step 1: Process each agent (create/find client and family group)
          for (const agent of studentAgents) {
            const agentPhone = agent.phone || '';
            const agentEmail = agent.email || '';
            const agentKey = agentPhone || agentEmail;

            if (!agentKey) continue;

            // Check if we already processed this agent
            if (agentToFamilyMap.has(agentKey)) {
              familyGroupId = agentToFamilyMap.get(agentKey);
              continue;
            }

            // Find or create client for this agent
            let clientId = null;
            
            // Try to find existing client by phone or email
            const { data: existingClient } = await supabase
              .from('clients')
              .select('id')
              .or(`phone.eq.${agentPhone},email.eq.${agentEmail}`)
              .single();

            if (existingClient) {
              clientId = existingClient.id;
            } else {
              // Create new client from agent
              const { data: newClient } = await supabase
                .from('clients')
                .insert({
                  name: `${agent.lastName || ''} ${agent.firstName || ''}`.trim() || 'Контакт',
                  phone: agentPhone,
                  email: agentEmail,
                  branch: student.location || 'Окская',
                  notes: agent.relation ? `Отношение: ${agent.relation}` : null,
                  organization_id: orgData?.id,
                  external_id: agent.id?.toString(),
                })
                .select()
                .single();

              clientId = newClient?.id;

              // Add phone number
              if (clientId && agentPhone) {
                await supabase.from('client_phone_numbers').upsert({
                  client_id: clientId,
                  phone: agentPhone,
                  is_primary: true,
                  is_whatsapp_enabled: true,
                });
              }
            }

            if (!clientId) continue;

            // Find existing family for this client
            const { data: existingFamilyMember } = await supabase
              .from('family_members')
              .select('family_group_id')
              .eq('client_id', clientId)
              .single();

            if (existingFamilyMember) {
              // Use existing family
              familyGroupId = existingFamilyMember.family_group_id;
            } else {
              // Create new family group
              const familyName = `Семья ${agent.lastName || student.lastName || 'Клиента'}`;
              const { data: newFamily } = await supabase
                .from('family_groups')
                .insert({
                  name: familyName,
                  branch: student.location || 'Окская',
                  organization_id: orgData?.id,
                })
                .select()
                .single();

              familyGroupId = newFamily?.id;

              // Link client to family
              if (familyGroupId) {
                await supabase.from('family_members').insert({
                  family_group_id: familyGroupId,
                  client_id: clientId,
                  is_primary_contact: agent.isPrimary || true,
                  relationship_type: 'parent',
                });
              }
            }

            // Remember this agent's family
            if (familyGroupId) {
              agentToFamilyMap.set(agentKey, familyGroupId);
            }
          }

          // Step 2: If student has clientId but no agents, try to link via clientId
          if (!familyGroupId && student.clientId) {
            const { data: client } = await supabase
              .from('clients')
              .select('id')
              .eq('external_id', student.clientId.toString())
              .single();

            if (client) {
              // Check if client is already in a family
              const { data: existingFamilyMember } = await supabase
                .from('family_members')
                .select('family_group_id')
                .eq('client_id', client.id)
                .single();

              if (existingFamilyMember) {
                familyGroupId = existingFamilyMember.family_group_id;
              } else {
                // Create new family
                const { data: newFamily } = await supabase
                  .from('family_groups')
                  .insert({
                    name: `Семья ${student.lastName || ''}`,
                    branch: student.location || 'Окская',
                    organization_id: orgData?.id,
                  })
                  .select()
                  .single();

                familyGroupId = newFamily?.id;

                if (familyGroupId) {
                  await supabase.from('family_members').insert({
                    family_group_id: familyGroupId,
                    client_id: client.id,
                    is_primary_contact: true,
                    relationship_type: 'main',
                  });
                }
              }
            }
          }

          // Step 3: Build extra_fields JSONB
          const extraFields = {};
          if (student.ExtraFields && Array.isArray(student.ExtraFields)) {
            for (const field of student.ExtraFields) {
              extraFields[field.name || 'custom_field'] = field.value || null;
            }
          }

          // Step 4: Create/update student
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
            extra_fields: extraFields,
            organization_id: orgData?.id,
            external_id: student.id?.toString(),
          };

          const { data: insertedStudent, error } = await supabase
            .from('students')
            .upsert(studentData, { onConflict: 'external_id' })
            .select()
            .single();

          if (error) {
            console.error(`Error importing student ${student.lastName}:`, error);
          } else {
            // Step 5: If student has their own phone, create a client for them too
            if (student.phone && student.phone.trim() && familyGroupId) {
              const studentPhone = student.phone.trim();
              const studentAgents = student.Agents || [];
              const agentPhones = studentAgents.map((a: any) => a.phone?.trim()).filter(Boolean);
              
              // Only create client if student's phone is different from agent phones
              if (!agentPhones.includes(studentPhone)) {
                // Check if client already exists with this phone
                const { data: existingStudentClient } = await supabase
                  .from('clients')
                  .select('id')
                  .eq('phone', studentPhone)
                  .single();

                let studentClientId = existingStudentClient?.id;

                if (!studentClientId) {
                  // Create new client for student
                  const { data: newStudentClient } = await supabase
                    .from('clients')
                    .insert({
                      name: `${student.lastName || ''} ${student.firstName || ''}`.trim() || 'Студент',
                      phone: studentPhone,
                      email: student.email || null,
                      branch: student.location || 'Окская',
                      organization_id: orgData?.id,
                      external_id: `student_client_${student.id}`,
                    })
                    .select()
                    .single();

                  studentClientId = newStudentClient?.id;

                  // Add phone number
                  if (studentClientId) {
                    await supabase.from('client_phone_numbers').upsert({
                      client_id: studentClientId,
                      phone: studentPhone,
                      is_primary: true,
                      is_whatsapp_enabled: true,
                    });
                  }
                }

                // Link student-client to family group
                if (studentClientId && familyGroupId) {
                  await supabase.from('family_members').upsert({
                    family_group_id: familyGroupId,
                    client_id: studentClientId,
                    is_primary_contact: false,
                    relationship_type: 'self',
                  }, { onConflict: 'family_group_id,client_id' });

                  console.log(`✅ Created client for student and linked to family: ${studentPhone}`);
                }
              }
            }
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
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const status of statuses) {
          await supabase.from('client_statuses').upsert({
            name: status.name || status.Name || 'Без названия',
            description: status.description || null,
            is_active: status.isActive !== false,
            sort_order: status.order || status.Order || 0,
            organization_id: orgData?.id,
            external_id: status.id?.toString() || status.Id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
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
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const status of statuses) {
          await supabase.from('lead_statuses').upsert({
            name: status.name || status.Name || 'Без названия',
            description: status.description || null,
            is_active: status.isActive !== false,
            sort_order: status.order || status.Order || 0,
            organization_id: orgData?.id,
            external_id: status.id?.toString() || status.Id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
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
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const type of types) {
          await supabase.from('learning_types').upsert({
            name: type.name || type.Name || 'Без названия',
            description: type.description || null,
            is_active: type.isActive !== false,
            sort_order: type.order || type.Order || 0,
            organization_id: orgData?.id,
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
        let skip = 0;
        const take = 100;
        let allTests = [];

        while (true) {
          const response = await fetch(`${HOLIHOPE_DOMAIN}/GetEntranceTests?authkey=${HOLIHOPE_API_KEY}&take=${take}&skip=${skip}`, {
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
          let studentId = null;
          if (test.studentId) {
            const { data: student } = await supabase.from('students').select('id').eq('external_id', test.studentId.toString()).single();
            studentId = student?.id;
          }
          
          let teacherId = null;
          if (test.teacherId) {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('external_id', test.teacherId.toString()).single();
            teacherId = teacher?.id;
          }
          
          await supabase.from('entrance_tests').upsert({
            student_id: studentId,
            lead_id: test.leadId || null,
            test_date: test.testDate || new Date().toISOString().split('T')[0],
            assigned_level: test.assignedLevel || test.level || null,
            teacher_id: teacherId,
            comments: test.comments || null,
            organization_id: orgData?.id,
            external_id: test.id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = 'completed';
        progress[0].count = importedCount;
        progress[0].message = `Imported ${importedCount} entrance tests`;
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
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
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
            organization_id: orgData?.id,
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
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
        let importedCount = 0;
        for (const disciplineName of disciplines) {
          // API returns array of strings, not objects
          await supabase.from('disciplines').upsert({
            name: disciplineName || 'Без названия',
            description: null,
            is_active: true,
            sort_order: importedCount,
            organization_id: orgData?.id,
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
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
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
            organization_id: orgData?.id,
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
        
        const { data: orgData } = await supabase.from('organizations').select('id').eq('name', "O'KEY ENGLISH").single();
        
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
            organization_id: orgData?.id,
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
