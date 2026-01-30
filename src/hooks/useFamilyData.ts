import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";

export interface PhoneNumber {
  id: string;
  phone: string;
  type: string;
  isWhatsappEnabled: boolean;
  isTelegramEnabled: boolean;
  isPrimary: boolean;
  whatsappAvatarUrl?: string;
  telegramAvatarUrl?: string;
  whatsappChatId?: string | null;
  telegramChatId?: string | null;
  telegramUserId?: number | null;
  maxChatId?: string | null;
  maxAvatarUrl?: string | null;
}

export interface FamilyMember {
  id: string;
  clientNumber?: string;
  name: string;
  phone: string;
  email?: string;
  branch?: string;
  relationship: 'main' | 'spouse' | 'parent' | 'guardian' | 'other';
  lastContact?: string;
  unreadMessages?: number;
  isOnline?: boolean;
  isPrimaryContact: boolean;
  avatar_url?: string;
  phoneNumbers: PhoneNumber[];
  // Client-level messenger data (from clients table)
  telegramChatId?: string | null;
  telegramUserId?: number | null;
  whatsappChatId?: string | null;
  maxChatId?: string | null;
}

export interface Student {
  id: string;
  studentNumber?: string;
  name: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phone?: string;
  age: number;
  dateOfBirth?: string;
  status: 'active' | 'inactive' | 'trial' | 'graduated' | 'not_started' | 'on_pause' | 'archived' | 'expelled';
  courses: {
    id: string;
    name: string;
    nextLesson?: string;
    nextPayment?: string;
    paymentAmount?: number;
    isActive: boolean;
  }[];
  notes?: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  members: FamilyMember[];
  students: Student[];
}

// RPC response types
interface RpcPhoneNumber {
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
}

interface RpcMember {
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
  phone_numbers: RpcPhoneNumber[];
  // Client-level messenger data
  telegram_chat_id?: string | null;
  telegram_user_id?: number | null;
  whatsapp_chat_id?: string | null;
  max_chat_id?: string | null;
}

interface RpcNextLesson {
  lesson_date: string;
  start_time: string;
}

interface RpcGroupCourse {
  group_id: string;
  group_name: string;
  subject: string;
  is_active: boolean;
  next_lesson?: RpcNextLesson | null;
}

interface RpcIndividualCourse {
  course_id: string;
  course_name: string;
  subject: string;
  is_active: boolean;
  next_lesson?: RpcNextLesson | null;
}

interface RpcStudent {
  id: string;
  student_number?: string;
  first_name: string;
  last_name?: string;
  middle_name?: string;
  date_of_birth?: string;
  avatar_url?: string;
  is_active: boolean;
  group_courses: RpcGroupCourse[];
  individual_courses: RpcIndividualCourse[];
}

interface RpcFamilyGroup {
  id: string;
  name: string;
  branch?: string;
  created_at: string;
}

interface RpcResponse {
  family_group: RpcFamilyGroup;
  members: RpcMember[];
  students: RpcStudent[];
}

// Calculate age from date of birth
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

// Format next lesson date
const formatNextLesson = (nextLesson?: RpcNextLesson | null): string | undefined => {
  if (!nextLesson) return undefined;
  const date = new Date(nextLesson.lesson_date);
  const formattedDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  const time = nextLesson.start_time?.slice(0, 5) || '';
  return `${formattedDate} в ${time}`;
};

// Transform RPC response to FamilyGroup
const transformRpcResponse = (data: RpcResponse): FamilyGroup => {
  const members: FamilyMember[] = (data.members || []).map((member: RpcMember) => ({
    id: member.client_id,
    clientNumber: member.client_number || undefined,
    name: member.name,
    phone: member.phone || '',
    email: member.email || undefined,
    branch: member.branch || undefined,
    relationship: member.relationship_type as FamilyMember['relationship'],
    isPrimaryContact: member.is_primary_contact,
    unreadMessages: 0,
    isOnline: false,
    lastContact: undefined,
    avatar_url: member.avatar_url || undefined,
    // Client-level messenger data
    telegramChatId: member.telegram_chat_id || null,
    telegramUserId: member.telegram_user_id || null,
    whatsappChatId: member.whatsapp_chat_id || null,
    maxChatId: member.max_chat_id || null,
    phoneNumbers: (member.phone_numbers || []).map((p: RpcPhoneNumber) => ({
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
  }));

  const students: Student[] = (data.students || []).map((student: RpcStudent) => {
    const courses = [
      ...(student.group_courses || []).map((c: RpcGroupCourse) => ({
        id: c.group_id,
        name: c.group_name,
        nextLesson: formatNextLesson(c.next_lesson),
        isActive: c.is_active,
      })),
      ...(student.individual_courses || []).map((c: RpcIndividualCourse) => ({
        id: c.course_id,
        name: c.course_name,
        nextLesson: formatNextLesson(c.next_lesson),
        isActive: c.is_active,
      })),
    ];

    return {
      id: student.id,
      studentNumber: student.student_number || undefined,
      name: [student.first_name, student.last_name].filter(Boolean).join(' '),
      firstName: student.first_name,
      lastName: student.last_name || '',
      middleName: student.middle_name || '',
      age: calculateAge(student.date_of_birth),
      dateOfBirth: student.date_of_birth || undefined,
      status: student.is_active ? 'active' : 'inactive',
      courses,
    };
  });

  return {
    id: data.family_group.id,
    name: data.family_group.name,
    members,
    students,
  };
};

// Fetch family data
const fetchFamilyData = async (familyGroupId: string): Promise<FamilyGroup> => {
  const startTime = performance.now();
  
  const { data, error } = await supabase
    .rpc('get_family_data_optimized', { p_family_group_id: familyGroupId });

  console.log(`[useFamilyData] RPC completed in ${(performance.now() - startTime).toFixed(0)}ms`);

  if (error) {
    console.error('[useFamilyData] RPC error:', error);
    throw error;
  }

  if (!data) {
    throw new Error('No data returned from RPC');
  }

  const rpcData = data as unknown as RpcResponse;
  
  if (!rpcData.family_group) {
    throw new Error('Family group not found');
  }

  return transformRpcResponse(rpcData);
};

export const useFamilyData = (familyGroupId?: string) => {
  const query = useQuery({
    queryKey: ['family-data', familyGroupId],
    queryFn: () => fetchFamilyData(familyGroupId!),
    enabled: !!familyGroupId,
    staleTime: 30000, // 30 seconds - data considered fresh
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    familyData: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
};
