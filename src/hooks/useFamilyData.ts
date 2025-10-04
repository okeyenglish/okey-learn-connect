import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PhoneNumber {
  id: string;
  phone: string;
  type: string;
  isWhatsappEnabled: boolean;
  isTelegramEnabled: boolean;
  isPrimary: boolean;
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
  status: 'active' | 'inactive' | 'trial' | 'graduated';
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

      // Fetch family group info
      const { data: familyGroup, error: groupError } = await supabase
        .from('family_groups')
        .select('*')
        .eq('id', familyGroupId)
        .single();

      if (groupError) throw groupError;

      // Fetch family members with client details
      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select(`
          *,
          clients (
            id,
            client_number,
            name,
            phone,
            email,
            notes,
            avatar_url
          )
        `)
        .eq('family_group_id', familyGroupId);

      if (membersError) throw membersError;

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('family_group_id', familyGroupId);

      if (studentsError) throw studentsError;

      // Transform data - fetch phone numbers for each member
      const members: FamilyMember[] = await Promise.all(
        membersData.map(async (member) => {
          const { data: phoneNumbers } = await supabase
            .from('client_phone_numbers')
            .select('*')
            .eq('client_id', member.clients.id);

          return {
            id: member.clients.id,
            clientNumber: member.clients.client_number,
            name: member.clients.name,
            phone: member.clients.phone,
            email: member.clients.email || undefined,
            relationship: member.relationship_type,
            isPrimaryContact: member.is_primary_contact,
            unreadMessages: Math.floor(Math.random() * 3), // Mock data for now
            isOnline: Math.random() > 0.5, // Mock data for now
            lastContact: member.relationship_type === 'main' ? 'Сейчас в чате' : '2 дня назад', // Mock data
            avatar_url: member.clients.avatar_url || undefined,
            phoneNumbers: (phoneNumbers || []).map(p => ({
              id: p.id,
              phone: p.phone,
              type: p.phone_type,
              isWhatsappEnabled: p.is_whatsapp_enabled || false,
              isTelegramEnabled: p.is_telegram_enabled || false,
              isPrimary: p.is_primary || false,
            })),
          };
        })
      );

      // Transform students data - fetch real course data from group_students and individual_lessons
      const students: Student[] = await Promise.all(
        studentsData.map(async (student) => {
          const courses = [];
          
          // Fetch group courses
          const { data: groupStudents } = await supabase
            .from('group_students')
            .select(`
              *,
              learning_groups (
                id,
                name,
                subject,
                level
              )
            `)
            .eq('student_id', student.id)
            .eq('status', 'active');

          // Add group courses with next lesson info
          if (groupStudents) {
            for (const gs of groupStudents) {
              if (gs.learning_groups) {
                // Get next lesson for this group
                const { data: nextLesson } = await supabase
                  .from('lesson_sessions')
                  .select('lesson_date, start_time')
                  .eq('group_id', gs.learning_groups.id)
                  .gte('lesson_date', new Date().toISOString().split('T')[0])
                  .eq('status', 'scheduled')
                  .order('lesson_date', { ascending: true })
                  .order('start_time', { ascending: true })
                  .limit(1)
                  .maybeSingle();

                courses.push({
                  id: gs.learning_groups.id,
                  name: gs.learning_groups.name,
                  nextLesson: nextLesson ? 
                    `${new Date(nextLesson.lesson_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} в ${nextLesson.start_time.slice(0, 5)}` : undefined,
                  nextPayment: undefined,
                  paymentAmount: undefined,
                  isActive: true
                });
              }
            }
          }

          // Fetch individual lessons
          const { data: individualLessons } = await supabase
            .from('individual_lessons')
            .select('*')
            .eq('student_id', student.id)
            .eq('is_active', true);

          // Add individual lessons
          if (individualLessons) {
            for (const il of individualLessons) {
              courses.push({
                id: il.id,
                name: `${il.subject} (инд.)`,
                nextLesson: undefined,
                nextPayment: undefined,
                paymentAmount: il.price_per_lesson || undefined,
                isActive: il.is_active
              });
            }
          }

          return {
            id: student.id,
            studentNumber: student.student_number,
            name: student.name,
            firstName: student.first_name || student.name.split(' ')[0],
            lastName: student.last_name || student.name.split(' ').slice(1).join(' '),
            middleName: student.middle_name || '',
            age: student.age,
            dateOfBirth: student.date_of_birth || undefined,
            status: student.status,
            notes: student.notes || undefined,
            courses
          };
        })
      );

      setFamilyData({
        id: familyGroup.id,
        name: familyGroup.name,
        members,
        students
      });

    } catch (err) {
      console.error('Error fetching family data:', err);
      setError('Не удалось загрузить данные семьи');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyData();
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