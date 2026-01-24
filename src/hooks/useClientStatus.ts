import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/typedClient";

interface ClientStatusResult {
  isLead: boolean;
  hasActiveStudents: boolean;
  studentsCount: number;
}

interface ClientStatusCache {
  [clientId: string]: ClientStatusResult;
}

export const useClientStatus = (clientIds: string[]) => {
  const [statusMap, setStatusMap] = useState<ClientStatusCache>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Стабилизируем массив ID для предотвращения лишних запросов
  const clientIdsKey = clientIds.sort().join(',');

  useEffect(() => {
    if (clientIds.length === 0) {
      setStatusMap({});
      setIsLoading(false);
      return;
    }

    const fetchClientStatuses = async () => {
      try {
        // Получаем всех студентов для указанных клиентов через family_members
        const { data: familyMembers, error: familyError } = await supabase
          .from('family_members')
          .select(`
            client_id,
            family_group_id
          `)
          .in('client_id', clientIds);

        if (familyError) {
          console.error('Error fetching family members:', familyError);
          setIsLoading(false);
          return;
        }

        // Получаем студентов для всех семейных групп (если они есть)
        const familyGroupIds = familyMembers?.map(fm => fm.family_group_id) || [];
        
        let students: { family_group_id: string; status: string }[] = [];
        if (familyGroupIds.length > 0) {
          const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('family_group_id, status')
            .in('family_group_id', familyGroupIds);

          if (studentsError) {
            console.error('Error fetching students:', studentsError);
            setIsLoading(false);
            return;
          }

          students = studentsData || [];
        }

        // Создаем карту статусов клиентов
        const newStatusMap: ClientStatusCache = {};
        
        for (const clientId of clientIds) {
          // Находим семейные группы для этого клиента
          const clientFamilyGroups = familyMembers
            ?.filter(fm => fm.client_id === clientId)
            .map(fm => fm.family_group_id) || [];

          // Если у клиента нет семейной группы - это лид
          if (clientFamilyGroups.length === 0) {
            newStatusMap[clientId] = {
              isLead: true,
              hasActiveStudents: false,
              studentsCount: 0
            };
            continue;
          }

          // Находим студентов в этих семейных группах
          const clientStudents = students?.filter(s => 
            clientFamilyGroups.includes(s.family_group_id)
          ) || [];

          const activeStudents = clientStudents.filter(s => s.status === 'active');
          
          newStatusMap[clientId] = {
            isLead: activeStudents.length === 0, // Лид если нет активных студентов
            hasActiveStudents: activeStudents.length > 0,
            studentsCount: clientStudents.length
          };
        }

        setStatusMap(newStatusMap);
      } catch (error) {
        console.error('Error in fetchClientStatuses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientStatuses();
  }, [clientIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    getClientStatus: (clientId: string): ClientStatusResult => {
      return statusMap[clientId] || {
        isLead: false,
        hasActiveStudents: false,
        studentsCount: 0
      };
    },
    isLoading
  };
};