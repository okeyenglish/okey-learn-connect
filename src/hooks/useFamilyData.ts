import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: 'main' | 'spouse' | 'parent' | 'guardian' | 'other';
  lastContact?: string;
  unreadMessages?: number;
  isOnline?: boolean;
  isPrimaryContact: boolean;
}

export interface Student {
  id: string;
  name: string;
  lastName: string;
  middleName: string;
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
            name,
            phone,
            email,
            notes
          )
        `)
        .eq('family_group_id', familyGroupId);

      if (membersError) throw membersError;

      // Fetch students with their courses
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          *,
          student_courses (
            id,
            course_name,
            next_lesson_date,
            next_payment_date,
            payment_amount,
            is_active
          )
        `)
        .eq('family_group_id', familyGroupId);

      if (studentsError) throw studentsError;

      // Transform data
      const members: FamilyMember[] = membersData.map(member => ({
        id: member.clients.id,
        name: member.clients.name,
        phone: member.clients.phone,
        email: member.clients.email || undefined,
        relationship: member.relationship_type,
        isPrimaryContact: member.is_primary_contact,
        unreadMessages: Math.floor(Math.random() * 3), // Mock data for now
        isOnline: Math.random() > 0.5, // Mock data for now
        lastContact: member.relationship_type === 'main' ? 'Сейчас в чате' : '2 дня назад' // Mock data
      }));

      const students: Student[] = studentsData.map(student => {
        // Parse full name from existing name field or use defaults
        const fullName = student.name || 'Петров Павел Александрович';
        const nameParts = fullName.split(' ');
        
        return {
          id: student.id,
          name: nameParts[1] || 'Павел', // first name
          lastName: nameParts[0] || 'Петров', // last name  
          middleName: nameParts[2] || 'Александрович', // middle name
          age: student.age,
          dateOfBirth: student.date_of_birth || undefined,
          status: student.status,
          notes: student.notes || undefined,
          courses: student.student_courses.map((course: any) => ({
            id: course.id,
            name: course.course_name,
            nextLesson: course.next_lesson_date ? 
              new Date(course.next_lesson_date).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }) : undefined,
            nextPayment: course.next_payment_date ? 
              `${new Date(course.next_payment_date).toLocaleDateString('ru-RU')} - ${course.payment_amount}₽` : undefined,
            paymentAmount: course.payment_amount,
            isActive: course.is_active
          }))
        };
      });

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