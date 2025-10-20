import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DuplicateGroup {
  matchType: 'phone' | 'name' | 'both';
  matchValue: string;
  students: Array<{
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    status: string;
    created_at: string;
    family_group_id?: string;
  }>;
}

export const useFindDuplicates = () => {
  return useQuery({
    queryKey: ['student-duplicates'],
    queryFn: async (): Promise<DuplicateGroup[]> => {
      const { data: students, error } = await supabase
        .from('students')
        .select('id, name, first_name, last_name, phone, status, created_at, family_group_id')
        .order('created_at', { ascending: true }) as any;

      if (error) throw error;
      if (!students) return [];

      const duplicates: DuplicateGroup[] = [];
      const processed = new Set<string>();

      // Группируем по телефону
      const phoneGroups = new Map<string, typeof students>();
      students.forEach((student: any) => {
        if (student.phone && student.phone.trim()) {
          const normalizedPhone = student.phone.replace(/\D/g, '');
          if (normalizedPhone.length >= 10) {
            if (!phoneGroups.has(normalizedPhone)) {
              phoneGroups.set(normalizedPhone, []);
            }
            phoneGroups.get(normalizedPhone)!.push(student);
          }
        }
      });

      // Добавляем дубликаты по телефону
      phoneGroups.forEach((group, phone) => {
        if (group.length > 1) {
          const ids = group.map((s: any) => s.id);
          if (!ids.some(id => processed.has(id))) {
            duplicates.push({
              matchType: 'phone',
              matchValue: phone,
              students: group as any,
            });
            ids.forEach(id => processed.add(id));
          }
        }
      });

      // Группируем по ФИО
      const nameGroups = new Map<string, typeof students>();
      students.forEach((student: any) => {
        if (student.first_name && student.last_name) {
          const normalizedName = `${student.last_name.toLowerCase().trim()}_${student.first_name.toLowerCase().trim()}`;
          if (!nameGroups.has(normalizedName)) {
            nameGroups.set(normalizedName, []);
          }
          nameGroups.get(normalizedName)!.push(student);
        }
      });

      // Добавляем дубликаты по ФИО (только те, что еще не обработаны по телефону)
      nameGroups.forEach((group, name) => {
        if (group.length > 1) {
          const unprocessed = group.filter((s: any) => !processed.has(s.id));
          if (unprocessed.length > 1) {
            duplicates.push({
              matchType: 'name',
              matchValue: name,
              students: unprocessed as any,
            });
            unprocessed.forEach((s: any) => processed.add(s.id));
          }
        }
      });

      return duplicates;
    },
  });
};
