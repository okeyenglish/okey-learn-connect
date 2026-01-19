import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  maxChatId?: string | null;
  maxAvatarUrl?: string | null;
}

export interface FamilyMember {
  id: string;
  clientNumber?: string;
  name: string;
  phone: string;
  email?: string;
  relationship: 'main' | 'spouse' | 'parent' | 'guardian' | 'other';
  lastContact?: string;
  unreadMessages?: number;
  isOnline?: boolean;
  isPrimaryContact: boolean;
  avatar_url?: string;
  phoneNumbers: PhoneNumber[];
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

// Интерфейсы для RPC-ответа
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
  avatar_url?: string;
  relationship_type: string;
  is_primary_contact: boolean;
  phone_numbers: RpcPhoneNumber[];
}

interface RpcNextLesson {
  lesson_date: string;
  start_time: string;
}

interface RpcGroupCourse {
  group_id: string;
  group_name: string;
  subject?: string;
  is_active: boolean;
  next_lesson?: RpcNextLesson;
}

interface RpcIndividualCourse {
  id: string;
  subject?: string;
  price_per_lesson?: number;
  is_active: boolean;
  teacher_name?: string;
}

interface RpcStudent {
  id: string;
  first_name?: string;
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

// Функция расчета возраста
const calculateAge = (birthDate?: string): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Форматирование даты урока
const formatNextLesson = (nextLesson?: RpcNextLesson): string | undefined => {
  if (!nextLesson) return undefined;
  const date = new Date(nextLesson.lesson_date);
  const formattedDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  const time = nextLesson.start_time?.slice(0, 5) || '';
  return `${formattedDate} в ${time}`;
};

export const useFamilyData = (familyGroupId?: string) => {
  const [familyData, setFamilyData] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFamilyData = async () => {
    if (!familyGroupId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const startTime = performance.now();

      // Один RPC-запрос вместо 10+ отдельных запросов
      const { data, error: rpcError } = await supabase
        .rpc('get_family_data_optimized', { p_family_group_id: familyGroupId });

      const endTime = performance.now();
      console.log(`[useFamilyData] RPC completed in ${(endTime - startTime).toFixed(0)}ms`);

      if (rpcError) {
        console.error('[useFamilyData] RPC error:', rpcError);
        throw rpcError;
      }

      if (!data) {
        throw new Error('No data returned from RPC');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rpcData = data as unknown as RpcResponse;
      
      if (!rpcData.family_group) {
        throw new Error('Family group not found');
      }

      // Трансформация членов семьи
      const members: FamilyMember[] = (rpcData.members || []).map((member: RpcMember) => ({
        id: member.client_id,
        clientNumber: member.client_number || undefined,
        name: member.name,
        phone: member.phone || '',
        email: member.email || undefined,
        relationship: member.relationship_type as FamilyMember['relationship'],
        isPrimaryContact: member.is_primary_contact,
        unreadMessages: 0,
        isOnline: false,
        lastContact: undefined,
        avatar_url: member.avatar_url || undefined,
        phoneNumbers: (member.phone_numbers || []).map((p: RpcPhoneNumber) => ({
          id: p.id,
          phone: p.phone,
          type: p.phone_type || 'mobile',
          isWhatsappEnabled: p.is_whatsapp_enabled || false,
          isTelegramEnabled: p.is_telegram_enabled || false,
          isPrimary: p.is_primary || false,
          whatsappAvatarUrl: p.whatsapp_avatar_url,
          telegramAvatarUrl: p.telegram_avatar_url,
          whatsappChatId: p.whatsapp_chat_id,
          telegramChatId: p.telegram_chat_id,
          maxChatId: p.max_chat_id,
          maxAvatarUrl: p.max_avatar_url,
        })),
      }));

      // Трансформация студентов
      const students: Student[] = (rpcData.students || []).map((student: RpcStudent) => {
        const courses: Student['courses'] = [];

        // Групповые курсы
        (student.group_courses || []).forEach((gc: RpcGroupCourse) => {
          courses.push({
            id: gc.group_id,
            name: gc.group_name || gc.subject || 'Группа',
            nextLesson: formatNextLesson(gc.next_lesson),
            nextPayment: undefined,
            paymentAmount: undefined,
            isActive: gc.is_active,
          });
        });

        // Индивидуальные курсы
        (student.individual_courses || []).forEach((ic: RpcIndividualCourse) => {
          courses.push({
            id: ic.id,
            name: `${ic.subject || 'Предмет'} (инд.)`,
            nextLesson: undefined,
            nextPayment: undefined,
            paymentAmount: ic.price_per_lesson || undefined,
            isActive: ic.is_active,
          });
        });

        const firstName = student.first_name || '';
        const lastName = student.last_name || '';
        const fullName = [lastName, firstName, student.middle_name].filter(Boolean).join(' ');

        return {
          id: student.id,
          studentNumber: undefined,
          name: fullName || 'Без имени',
          firstName,
          lastName,
          middleName: student.middle_name || '',
          age: calculateAge(student.date_of_birth),
          dateOfBirth: student.date_of_birth || undefined,
          status: student.is_active ? 'active' : 'inactive',
          notes: undefined,
          courses,
        };
      });

      setFamilyData({
        id: rpcData.family_group.id,
        name: rpcData.family_group.name,
        members,
        students
      });

    } catch (err) {
      console.error('[useFamilyData] Error fetching family data:', err);
      setError('Не удалось загрузить данные семьи');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyData();
    
    // Set up real-time subscription for live updates
    if (!familyGroupId) return;
    
    const channel = supabase
      .channel(`family-data-${familyGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients'
        },
        () => {
          console.log('[useFamilyData] Client data updated, refetching...');
          fetchFamilyData();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyGroupId]);

  const refetch = () => {
    fetchFamilyData();
  };

  return {
    familyData,
    loading,
    error,
    refetch
  };
};
