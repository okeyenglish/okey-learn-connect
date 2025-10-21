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
            
            leadsData.push({
              leadInfo: {
                first_name: lead.firstName || lead.FirstName || '',
                last_name: lead.lastName || lead.LastName || '',
                phone: leadPhone, // Can be null now
                email: lead.email || lead.EMail || null,
                age: lead.age || lead.Age || null,
                subject: lead.subject || lead.Subject || null,
                level: lead.level || lead.Level || null,
                branch: lead.location || lead.Location || lead.branch || 'Окская',
                notes: lead.notes || lead.comment || lead.Comment || null,
                status_id: statusId,
                lead_source_id: null,
                assigned_to: null,
              },
              leadPhone,
              agentPhones,
              allPhones,
              agents,
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
                
                // Map phones to new client IDs
                newClients.forEach((client, idx) => {
                  phoneToClientMap.set(phonesToCreateClients[i + idx], client.id);
                });
              }
            }
          }
          
          console.log(`Total clients available: ${phoneToClientMap.size}`);
          
          // Step 3: Create family_groups
          // 3a. One family_group per agent
          // 3b. One family_group per lead with phone
          const familyGroupsToCreate = [];
          const agentPhoneToFamilyNameMap = new Map(); // agentPhone -> familyName
          const leadPhoneToFamilyNameMap = new Map(); // leadPhone -> familyName
          
          leadsData.forEach((ld) => {
            // Create family group for each agent
            ld.agentPhones.forEach((agentPhone) => {
              const clientId = phoneToClientMap.get(agentPhone);
              if (!clientId) return;
              
              const agentIdx = ld.agentPhones.indexOf(agentPhone);
              const agent = ld.agents[agentIdx];
              const agentName = `${agent?.LastName || agent?.lastName || ''} ${agent?.FirstName || agent?.firstName || ''}`.trim() || 'Без имени';
              const familyName = `Семья ${agentName}`;
              
              agentPhoneToFamilyNameMap.set(agentPhone, familyName);
              
              if (!familyGroupsToCreate.find(fg => fg.name === familyName)) {
                familyGroupsToCreate.push({
                  name: familyName,
                  branch: ld.leadInfo.branch,
                  organization_id: orgId,
                });
              }
            });
            
            // Create family group for lead if they have a phone
            if (ld.leadPhone) {
              const leadClientId = phoneToClientMap.get(ld.leadPhone);
              if (leadClientId) {
                const leadName = `${ld.leadInfo.first_name} ${ld.leadInfo.last_name}`.trim() || 'Без имени';
                const familyName = `Семья ${leadName}`;
                
                leadPhoneToFamilyNameMap.set(ld.leadPhone, familyName);
                
                if (!familyGroupsToCreate.find(fg => fg.name === familyName)) {
                  familyGroupsToCreate.push({
                    name: familyName,
                    branch: ld.leadInfo.branch,
                    organization_id: orgId,
                  });
                }
              }
            }
          });
          
          console.log(`Creating ${familyGroupsToCreate.length} family groups (agents + leads with phones)...`);
          
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

          // Step 6: Create family member links
          console.log('Creating family member links...');
          const familyMembersToCreate = [];
          
          leadsData.forEach((ld) => {
            const leadKey = `${ld.leadInfo.first_name}_${ld.leadInfo.last_name}_${ld.leadInfo.phone || ''}_${ld.leadInfo.email || ''}`;
            const leadId = leadIdMap.get(leadKey);
            
            // A. Add members to each AGENT's family_group
            ld.agentPhones.forEach((agentPhone, agentIdx) => {
              const agentClientId = phoneToClientMap.get(agentPhone);
              if (!agentClientId) return;
              
              const familyName = agentPhoneToFamilyNameMap.get(agentPhone);
              const familyGroupId = familyGroupNameToIdMap.get(familyName);
              if (!familyGroupId) return;
              
              // Add the agent as primary
              familyMembersToCreate.push({
                family_group_id: familyGroupId,
                client_id: agentClientId,
                is_primary_contact: true,
                relationship_type: 'main',
              });
              
              // Add the lead as student (if lead has a phone/client)
              if (ld.leadPhone) {
                const leadClientId = phoneToClientMap.get(ld.leadPhone);
                if (leadClientId) {
                  familyMembersToCreate.push({
                    family_group_id: familyGroupId,
                    client_id: leadClientId,
                    is_primary_contact: false,
                    relationship_type: 'other',
                  });
                }
              }
              
              // Add all OTHER agents as parents
              ld.agentPhones.forEach((otherAgentPhone, otherIdx) => {
                if (otherIdx === agentIdx) return;
                const otherClientId = phoneToClientMap.get(otherAgentPhone);
                if (otherClientId) {
                  familyMembersToCreate.push({
                    family_group_id: familyGroupId,
                    client_id: otherClientId,
                    is_primary_contact: false,
                    relationship_type: 'parent',
                  });
                }
              });
            });
            
            // B. Add members to LEAD's family_group (if lead has phone)
            if (ld.leadPhone) {
              const leadClientId = phoneToClientMap.get(ld.leadPhone);
              if (leadClientId) {
                const familyName = leadPhoneToFamilyNameMap.get(ld.leadPhone);
                const familyGroupId = familyGroupNameToIdMap.get(familyName);
                if (familyGroupId) {
                  // Add lead as primary
                  familyMembersToCreate.push({
                    family_group_id: familyGroupId,
                    client_id: leadClientId,
                    is_primary_contact: true,
                    relationship_type: 'main',
                  });
                  
                  // Add all agents as parents
                  ld.agentPhones.forEach((agentPhone) => {
                    const agentClientId = phoneToClientMap.get(agentPhone);
                    if (agentClientId) {
                      familyMembersToCreate.push({
                        family_group_id: familyGroupId,
                        client_id: agentClientId,
                        is_primary_contact: false,
                        relationship_type: 'parent',
                      });
                    }
                  });
                }
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

        // Process students in batches
        while (true) {
          console.log(`Fetching students batch: skip=${skip}, take=${take}`);
          
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
            
            const branch = (student.OfficesAndCompanies?.[0]?.Name) || student.location || student.Location || 'Окская';
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
                external_id: (student.Id ?? student.id)?.toString(),
                organization_id: orgId,
              },
              branch,
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
                
                newClients.forEach((client, idx) => {
                  phoneToClientMap.set(phonesToCreateClients[i + idx], client.id);
                });
              }
            }
          }
          
          console.log(`Total clients available: ${phoneToClientMap.size}`);
          
          // Step 3: Create family_groups
          // 3a. One family_group per agent
          // 3b. One family_group per student with phone
          const familyGroupsToCreate = [];
          const agentPhoneToFamilyNameMap = new Map();
          const studentPhoneToFamilyNameMap = new Map();
          
          studentsData.forEach((sd) => {
            // Create family group for each agent
            sd.agentPhones.forEach((agentPhone) => {
              const clientId = phoneToClientMap.get(agentPhone);
              if (!clientId) return;
              
              const agentIdx = sd.agentPhones.indexOf(agentPhone);
              const agent = sd.agents[agentIdx];
              const agentName = `${agent?.LastName || agent?.lastName || ''} ${agent?.FirstName || agent?.firstName || ''}`.trim() || 'Без имени';
              const familyName = `Семья ${agentName}`;
              
              agentPhoneToFamilyNameMap.set(agentPhone, familyName);
              
              if (!familyGroupsToCreate.find(fg => fg.name === familyName)) {
                familyGroupsToCreate.push({
                  name: familyName,
                  branch: sd.branch,
                  organization_id: orgId,
                });
              }
            });
            
            // Always create a family group for student (even without phone)
            const studentName = `${sd.studentInfo.first_name} ${sd.studentInfo.last_name}`.trim() || 'Без имени';
            const familyName = `Семья ${studentName}`;
            
            if (sd.studentPhone) {
              studentPhoneToFamilyNameMap.set(sd.studentPhone, familyName);
            }
            
            if (!familyGroupsToCreate.find(fg => fg.name === familyName)) {
              familyGroupsToCreate.push({
                name: familyName,
                branch: sd.branch,
                organization_id: orgId,
              });
            }
          });
          
          console.log(`Creating ${familyGroupsToCreate.length} family groups (agents + students with phones)...`);
          
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
            // Determine family_group_id priority: agent family > student family
            let familyGroupId = null;
            
            if (sd.agentPhones.length > 0) {
              const firstAgentPhone = sd.agentPhones[0];
              const familyName = agentPhoneToFamilyNameMap.get(firstAgentPhone);
              familyGroupId = familyGroupNameToIdMap.get(familyName);
            } else if (sd.studentPhone) {
              const familyName = studentPhoneToFamilyNameMap.get(sd.studentPhone);
              familyGroupId = familyGroupNameToIdMap.get(familyName);
            } else {
              const fallbackFamilyName = `Семья ${sd.studentInfo.first_name} ${sd.studentInfo.last_name}`.trim() || 'Семья Без имени';
              familyGroupId = familyGroupNameToIdMap.get(fallbackFamilyName);
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
              .upsert(batch, { onConflict: 'external_id' })
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

          // Step 5: Create family member links
          console.log('Creating family member links...');
          const familyMembersToCreate = [];
          
          studentsData.forEach((sd) => {
            const studentKey = sd.studentInfo.external_id || `${sd.studentInfo.first_name}_${sd.studentInfo.last_name}_${sd.studentInfo.phone || ''}_${sd.studentInfo.lk_email || ''}`;
            const studentId = studentIdMap.get(studentKey);
            
            // A. Add members to each AGENT's family_group
            sd.agentPhones.forEach((agentPhone, agentIdx) => {
              const agentClientId = phoneToClientMap.get(agentPhone);
              if (!agentClientId) return;
              
              const familyName = agentPhoneToFamilyNameMap.get(agentPhone);
              const familyGroupId = familyGroupNameToIdMap.get(familyName);
              if (!familyGroupId) return;
              
              // Add the agent as primary
              familyMembersToCreate.push({
                family_group_id: familyGroupId,
                client_id: agentClientId,
                is_primary_contact: true,
                relationship_type: 'main',
              });
              
              // Add the student as student (if student has a phone/client)
              if (sd.studentPhone) {
                const studentClientId = phoneToClientMap.get(sd.studentPhone);
                if (studentClientId) {
                  familyMembersToCreate.push({
                    family_group_id: familyGroupId,
                    client_id: studentClientId,
                    is_primary_contact: false,
                    relationship_type: 'other',
                  });
                }
              }
              
              // Add all OTHER agents as parents
              sd.agentPhones.forEach((otherAgentPhone, otherIdx) => {
                if (otherIdx === agentIdx) return;
                const otherClientId = phoneToClientMap.get(otherAgentPhone);
                if (otherClientId) {
                  familyMembersToCreate.push({
                    family_group_id: familyGroupId,
                    client_id: otherClientId,
                    is_primary_contact: false,
                    relationship_type: 'parent',
                  });
                }
              });
            });
            
            // B. Add members to STUDENT's family_group (if student has phone)
            if (sd.studentPhone) {
              const studentClientId = phoneToClientMap.get(sd.studentPhone);
              if (studentClientId) {
                const familyName = studentPhoneToFamilyNameMap.get(sd.studentPhone);
                const familyGroupId = familyGroupNameToIdMap.get(familyName);
                if (familyGroupId) {
                  // Add student as primary
                  familyMembersToCreate.push({
                    family_group_id: familyGroupId,
                    client_id: studentClientId,
                    is_primary_contact: true,
                    relationship_type: 'main',
                  });
                  
                  // Add all agents as parents
                  sd.agentPhones.forEach((agentPhone) => {
                    const agentClientId = phoneToClientMap.get(agentPhone);
                    if (agentClientId) {
                      familyMembersToCreate.push({
                        family_group_id: familyGroupId,
                        client_id: agentClientId,
                        is_primary_contact: false,
                        relationship_type: 'parent',
                      });
                    }
                  });
                }
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
        
        let importedCount = 0;
        for (const status of statuses) {
          await supabase.from('client_statuses').upsert({
            name: status.name || status.Name || 'Без названия',
            description: status.description || null,
            is_active: status.isActive !== false,
            sort_order: status.order || status.Order || 0,
            organization_id: orgId,
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
        
        let importedCount = 0;
        for (const status of statuses) {
          await supabase.from('lead_statuses').upsert({
            name: status.name || status.Name || 'Без названия',
            description: status.description || null,
            is_active: status.isActive !== false,
            sort_order: status.order || status.Order || 0,
            organization_id: orgId,
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
            organization_id: orgId,
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
                }
              } catch (err) {
                console.error(`  ✗ Error: ${err}`);
                // Continue with next combination
              }
            }
          }
        }
        
        console.log(`Total units fetched: ${allUnits.length}`);
        console.log(`Processed ${totalRequests} requests (${successfulRequests} successful)`);
        
        // Remove duplicates by Id
        const uniqueUnits = allUnits.reduce((acc, unit) => {
          const id = unit.Id?.toString();
          if (id && !acc.has(id)) {
            acc.set(id, unit);
          }
          return acc;
        }, new Map());
        
        const unitsToImport = Array.from(uniqueUnits.values());
        console.log(`Unique units after deduplication: ${unitsToImport.length}`);
        
        let importedCount = 0;
        let typeStats = {};
        
        for (const unit of unitsToImport) {
          const unitType = unit.Type || unit.type || 'Group';
          typeStats[unitType] = (typeStats[unitType] || 0) + 1;
          
          // Get primary teacher from first schedule item
          let teacherId = null;
          if (unit.ScheduleItems && unit.ScheduleItems.length > 0) {
            const firstSchedule = unit.ScheduleItems[0];
            const teacherExternalId = firstSchedule.TeacherIds?.[0];
            if (teacherExternalId) {
              const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('external_id', teacherExternalId.toString())
                .single();
              teacherId = teacher?.id;
            }
          }
          
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
          
          await supabase.from('educational_units').upsert({
            name: unit.Name || 'Без названия',
            unit_type: unitType,
            branch: unit.OfficeOrCompanyName || 'Окская',
            subject: unit.Discipline || null,
            level: unit.Level || null,
            teacher_id: teacherId,
            status: 'active', // Holihope doesn't provide status, default to active
            start_date: unit.ScheduleItems?.[0]?.BeginDate || null,
            end_date: unit.ScheduleItems?.[0]?.EndDate || null,
            max_students: (unit.StudentsCount || 0) + (unit.Vacancies || 0),
            schedule_days: scheduleDays,
            schedule_time: scheduleTime,
            schedule_room: scheduleRoom,
            price: unit.FiscalInfo?.PriceValue || null,
            description: unit.Description || null,
            organization_id: orgId,
            external_id: unit.Id?.toString(),
          }, { onConflict: 'external_id' });
          importedCount++;
        }
        
        progress[0].status = hasMore ? 'in_progress' : 'completed';
        progress[0].count = importedCount;
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
            organization_id: orgId,
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
