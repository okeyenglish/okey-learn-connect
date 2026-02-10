import { Card, CardContent } from "@/components/ui/card";
import { FamilyCard } from "./FamilyCard";
import { FamilyCardSkeleton } from "./FamilyCardSkeleton";
import { supabase } from "@/integrations/supabase/typedClient";
import { normalizePhone } from "@/utils/phoneNormalization";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { FamilyGroup } from "@/hooks/useFamilyData";

interface FamilyCardWrapperProps {
  clientId: string;
  onOpenChat?: (clientId: string, messengerType?: 'whatsapp' | 'telegram' | 'max') => void;
  activeMessengerTab?: 'whatsapp' | 'telegram' | 'max';
}

// In-memory cache for instant repeated loads
const familyDataByClientCache = new Map<string, { data: FamilyGroup; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Flag to track if unified RPC is available
let useUnifiedRpc = true;

// Flag to track if helper RPC (get_or_create_family_group_id) is available
let useGetOrCreateFamilyGroupRpc = true;

// RPC response type for unified function
interface UnifiedRpcResponse {
  family_group: {
    id: string;
    name: string;
    branch?: string;
    created_at: string;
  };
  members: Array<{
    id: string;
    client_id: string;
    client_number?: string;
    name: string;
    phone?: string;
    email?: string;
    branch?: string;
    avatar_url?: string;
    relationship_type: string;
    is_primary_contact: boolean;
    telegram_chat_id?: string | null;
    telegram_user_id?: number | null;
    whatsapp_chat_id?: string | null;
    max_chat_id?: string | null;
    phone_numbers: Array<{
      id: string;
      phone: string;
      phone_type: string;
      is_primary: boolean;
      is_whatsapp_enabled: boolean;
      is_telegram_enabled: boolean;
      whatsapp_avatar_url?: string;
      telegram_avatar_url?: string;
      whatsapp_chat_id?: string | null;
      telegram_chat_id?: string | null;
      telegram_user_id?: number | null;
      max_chat_id?: string | null;
      max_avatar_url?: string | null;
    }>;
  }>;
  students: Array<{
    id: string;
    student_number?: string;
    external_id?: string;
    holihope_id?: string | null;
    first_name: string;
    last_name?: string;
    middle_name?: string;
    date_of_birth?: string;
    avatar_url?: string;
    is_active: boolean;
    group_courses: Array<{
      group_id: string;
      group_name: string;
      subject: string;
      is_active: boolean;
      next_lesson?: { lesson_date: string; start_time: string } | null;
    }>;
    individual_courses: Array<{
      course_id: string;
      course_name: string;
      subject: string;
      is_active: boolean;
      next_lesson?: { lesson_date: string; start_time: string } | null;
    }>;
  }>;
}

// Transform unified RPC response to FamilyGroup format
const transformUnifiedResponse = (data: UnifiedRpcResponse): FamilyGroup => {
  const formatNextLesson = (nextLesson?: { lesson_date: string; start_time: string } | null): string | undefined => {
    if (!nextLesson) return undefined;
    const date = new Date(nextLesson.lesson_date);
    const formattedDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    const time = nextLesson.start_time?.slice(0, 5) || '';
    return `${formattedDate} в ${time}`;
  };

  const calculateAge = (dateOfBirth?: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return {
    id: data.family_group.id,
    name: data.family_group.name,
    members: (data.members || []).map((m) => ({
      id: m.client_id,
      clientNumber: m.client_number || undefined,
      name: m.name,
      phone: m.phone || '',
      email: m.email || undefined,
      branch: m.branch || undefined,
      relationship: m.relationship_type as 'main' | 'spouse' | 'parent' | 'guardian' | 'other',
      isPrimaryContact: m.is_primary_contact,
      unreadMessages: 0,
      isOnline: false,
      lastContact: undefined,
      avatar_url: m.avatar_url || undefined,
      telegramChatId: m.telegram_chat_id || null,
      telegramUserId: m.telegram_user_id || null,
      whatsappChatId: m.whatsapp_chat_id || null,
      maxChatId: m.max_chat_id || null,
      phoneNumbers: (m.phone_numbers || []).map((p) => ({
        id: p.id,
        phone: p.phone,
        type: p.phone_type || 'mobile',
        isWhatsappEnabled: p.is_whatsapp_enabled || false,
        isTelegramEnabled: p.is_telegram_enabled || false,
        isPrimary: p.is_primary || false,
        whatsappAvatarUrl: p.whatsapp_avatar_url || undefined,
        telegramAvatarUrl: p.telegram_avatar_url || undefined,
        whatsappChatId: p.whatsapp_chat_id || null,
        telegramChatId: p.telegram_chat_id || null,
        telegramUserId: p.telegram_user_id || null,
        maxChatId: p.max_chat_id || null,
        maxAvatarUrl: p.max_avatar_url || null,
      })),
    })),
    students: (data.students || []).map((s) => ({
      id: s.id,
      studentNumber: s.student_number || undefined,
      holihopeId: s.holihope_id || s.external_id || undefined,
      name: [s.first_name, s.last_name].filter(Boolean).join(' '),
      firstName: s.first_name,
      lastName: s.last_name || '',
      middleName: s.middle_name || '',
      age: calculateAge(s.date_of_birth),
      dateOfBirth: s.date_of_birth || undefined,
      status: s.is_active ? 'active' : 'inactive',
      courses: [
        ...(s.group_courses || []).map((c) => ({
          id: c.group_id,
          name: c.group_name,
          type: 'group' as const,
          nextLesson: formatNextLesson(c.next_lesson),
          isActive: c.is_active,
        })),
        ...(s.individual_courses || []).map((c) => ({
          id: c.course_id,
          name: c.course_name,
          type: 'individual' as const,
          nextLesson: formatNextLesson(c.next_lesson),
          isActive: c.is_active,
        })),
      ],
    })),
  };
};

// Direct client fallback - loads data from clients table when family tables are unavailable
const fetchClientDirectFallback = async (clientId: string): Promise<FamilyGroup | null> => {
  console.warn('[FamilyCardWrapper] Using direct client fallback (no family tables)');
  try {
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('id, name, phone, email, avatar_url, branch')
      .eq('id', clientId)
      .maybeSingle();

    if (error || !clientData) {
      console.error('[FamilyCardWrapper] Direct client fallback failed:', error);
      return null;
    }

    const result: FamilyGroup = {
      id: clientId,
      name: (clientData as any).name || 'Клиент',
      members: [{
        id: clientData.id,
        name: (clientData as any).name || '',
        phone: (clientData as any).phone || '',
        email: (clientData as any).email || undefined,
        branch: (clientData as any).branch || undefined,
        relationship: 'main' as const,
        isPrimaryContact: true,
        unreadMessages: 0,
        isOnline: false,
        avatar_url: (clientData as any).avatar_url || undefined,
        phoneNumbers: [],
      }],
      students: [],
    };

    familyDataByClientCache.set(clientId, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error('[FamilyCardWrapper] Direct client fallback exception:', err);
    return null;
  }
};

// Legacy fallback: sequential queries for family group ID
const fetchFamilyGroupIdLegacy = async (clientId: string): Promise<string | null> => {
  const startTime = performance.now();
  
  try {
    // Step 1: Check if client already has a family group
    const { data: existingMember, error: memberError } = await supabase
      .from('family_members')
      .select('family_group_id')
      .eq('client_id', clientId)
      .limit(1)
      .maybeSingle();

    if (!memberError && existingMember?.family_group_id) {
      console.log(`[FamilyCardWrapper] Found existing group in ${(performance.now() - startTime).toFixed(0)}ms`);
      return existingMember.family_group_id;
    }

    // If table doesn't exist, bail out to direct fallback
    if (memberError && (memberError.code === '42P01' || memberError.message?.includes('relation') || memberError.code === 'PGRST204')) {
      console.warn('[FamilyCardWrapper] family_members table not available:', memberError.message);
      return null;
    }

    // Step 2: Get client phone to find or create group
    const { data: client } = await supabase
      .from('clients')
      .select('name, first_name, last_name, phone')
      .eq('id', clientId)
      .maybeSingle();

    // Step 3: Try to find existing group by phone
    if (client?.phone) {
      const phoneNorm = normalizePhone(client.phone);
      if (phoneNorm) {
        const { data: existingGroups } = await supabase
          .from('family_members')
          .select(`
            family_group_id,
            clients!inner (phone)
          `)
          .eq('clients.phone', phoneNorm)
          .limit(1);

        if (existingGroups?.length && existingGroups[0].family_group_id) {
          const groupId = existingGroups[0].family_group_id;
          
          await supabase.from('family_members').insert({
            family_group_id: groupId,
            client_id: clientId,
            relationship_type: 'parent',
            is_primary_contact: false,
          });

          console.log(`[FamilyCardWrapper] Linked to existing group in ${(performance.now() - startTime).toFixed(0)}ms`);
          return groupId;
        }
      }
    }

    // Step 4: Create new family group
    let groupName = 'Семья клиента';
    if (client?.last_name) {
      groupName = `Семья ${client.last_name}`;
    } else if (client?.name) {
      const parts = client.name.split(' ');
      groupName = `Семья ${parts[0] || 'клиента'}`;
    }

    const { data: group, error: groupError } = await supabase
      .from('family_groups')
      .insert({ name: groupName })
      .select('id')
      .single();

    if (groupError) {
      console.warn('[FamilyCardWrapper] Error creating family_groups (table may not exist):', groupError);
      return null;
    }

    await supabase.from('family_members').insert({
      family_group_id: group.id,
      client_id: clientId,
      relationship_type: 'main',
      is_primary_contact: true,
    });

    if (client?.phone) {
      const { data: existingPhones } = await supabase
        .from('client_phone_numbers')
        .select('id')
        .eq('client_id', clientId)
        .limit(1);

      if (!existingPhones?.length) {
        await supabase.from('client_phone_numbers').insert({
          client_id: clientId,
          phone: client.phone,
          is_primary: true,
        });
      }
    }

    console.log(`[FamilyCardWrapper] Created new group (legacy) in ${(performance.now() - startTime).toFixed(0)}ms`);
    return group.id;
  } catch (err) {
    console.warn('[FamilyCardWrapper] fetchFamilyGroupIdLegacy exception (tables may not exist):', err);
    return null;
  }
};

// Fetch family data directly by client ID (unified RPC with fallback)
const fetchFamilyDataByClientId = async (clientId: string): Promise<FamilyGroup | null> => {
  const startTime = performance.now();

  // Try unified RPC first
  if (useUnifiedRpc) {
    try {
      const { data, error } = await supabase
        .rpc('get_family_data_by_client_id', { p_client_id: clientId });

      if (error) {
        // If function doesn't exist, fall back to legacy two-step approach
        if (
          error.message?.includes('function') ||
          error.code === '42883' ||
          error.code === 'PGRST202' ||
          // schema mismatch (missing columns, etc.)
          error.code === '42703'
        ) {
          console.warn('[FamilyCardWrapper] Unified RPC not available, using legacy two-step method');
          useUnifiedRpc = false;
          return fetchFamilyDataLegacy(clientId);
        }
        console.error('[FamilyCardWrapper] Unified RPC error:', error);
        return fetchFamilyDataLegacy(clientId);
      }

      if (!data || !data.family_group) {
        console.error('[FamilyCardWrapper] Invalid RPC response');
        return fetchFamilyDataLegacy(clientId);
      }

      console.log(`[FamilyCardWrapper] Unified RPC completed in ${(performance.now() - startTime).toFixed(0)}ms`);
      const result = transformUnifiedResponse(data as UnifiedRpcResponse);
      
      // Cache the result
      familyDataByClientCache.set(clientId, { data: result, timestamp: Date.now() });
      
      return result;
    } catch (err) {
      console.warn('[FamilyCardWrapper] Unified RPC failed, falling back:', err);
      useUnifiedRpc = false;
      return fetchFamilyDataLegacy(clientId);
    }
  }

  return fetchFamilyDataLegacy(clientId);
};

// Legacy two-step approach: get group ID then fetch family data
const fetchFamilyDataLegacy = async (clientId: string): Promise<FamilyGroup | null> => {
  const startTime = performance.now();
  
  // Step 1: Get or create family group ID
  let familyGroupId: string | null = null;

  if (useGetOrCreateFamilyGroupRpc) {
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_family_group_id', { p_client_id: clientId });

      if (error) {
        // If helper RPC doesn't exist (or isn't in schema cache), stop calling it to avoid 404 spam.
        if (error.code === 'PGRST202' || error.code === '42883' || error.message?.includes('Could not find the function')) {
          console.warn('[FamilyCardWrapper] get_or_create_family_group_id not available, using manual fallback');
          useGetOrCreateFamilyGroupRpc = false;
        } else {
          console.warn('[FamilyCardWrapper] get_or_create_family_group_id error, using manual fallback:', error);
        }
      } else if (data) {
        familyGroupId = data as string;
      }
    } catch {
      // Ignore - will use manual fallback
    }
  }
  
  if (!familyGroupId) {
    familyGroupId = await fetchFamilyGroupIdLegacy(clientId);
  }
  
  if (!familyGroupId) {
    console.warn('[FamilyCardWrapper] No family group found, using direct client fallback');
    return fetchClientDirectFallback(clientId);
  }

  // Step 2: Fetch family data
  const { data, error } = await supabase
    .rpc('get_family_data_optimized', { p_family_group_id: familyGroupId });

  if (error || !data) {
    console.warn('[FamilyCardWrapper] get_family_data_optimized failed, using direct client fallback:', error);
    return fetchClientDirectFallback(clientId);
  }

  console.log(`[FamilyCardWrapper] Legacy two-step completed in ${(performance.now() - startTime).toFixed(0)}ms`);
  
  // Transform using the same format as useFamilyData
  const rpcData = data as UnifiedRpcResponse;
  const result = transformUnifiedResponse(rpcData);
  
  // Cache the result
  familyDataByClientCache.set(clientId, { data: result, timestamp: Date.now() });
  
  return result;
};

export const FamilyCardWrapper = ({ clientId, onOpenChat, activeMessengerTab }: FamilyCardWrapperProps) => {
  const queryClient = useQueryClient();
  
  // Get cached data for instant display
  const cachedData = familyDataByClientCache.get(clientId);
  const isCacheValid = cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL);
  
  const { data: familyData, isLoading, error } = useQuery({
    queryKey: ['family-data-by-client', clientId],
    queryFn: () => fetchFamilyDataByClientId(clientId),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    refetchOnWindowFocus: false,
    retry: 1,
    // Use in-memory cache for instant display
    placeholderData: isCacheValid ? cachedData.data : undefined,
  });

  // Also populate the family-data query cache for useFamilyData hook compatibility
  useEffect(() => {
    if (familyData?.id) {
      queryClient.setQueryData(['family-data', familyData.id], familyData);
    }
  }, [familyData, queryClient]);

  // Don't show skeleton if we have cached data
  if (isLoading && !isCacheValid) {
    return <FamilyCardSkeleton />;
  }

  if (error || !familyData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            {error ? 'Ошибка загрузки' : 'Не удалось загрузить данные клиента'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="animate-scale-in">
      <FamilyCard
        familyGroupId={familyData.id}
        activeMemberId={clientId}
        onSwitchMember={(memberId) => console.log('Switch member:', memberId)}
        onOpenChat={onOpenChat}
        onCall={(memberId) => console.log('Call member:', memberId)}
        onPhoneSwitch={(phoneId) => console.log('Switch phone:', phoneId)}
        activePhoneId="1"
        activeMessengerTab={activeMessengerTab}
      />
    </div>
  );
};
