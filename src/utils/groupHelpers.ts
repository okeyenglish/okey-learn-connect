import { supabase } from "@/integrations/supabase/client";

/**
 * Генерирует название для мини-группы на основе фамилий студентов
 */
export const generateMiniGroupName = async (groupId: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-mini-group-name', {
      body: { groupId }
    });

    if (error) throw error;
    return data.name;
  } catch (error) {
    console.error('Error generating mini-group name:', error);
    throw error;
  }
};

/**
 * Синхронизирует состав авто-группы согласно заданным условиям
 */
export const syncAutoGroup = async (groupId: string): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('sync-single-auto-group', {
      body: { groupId }
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error syncing auto-group:', error);
    throw error;
  }
};

/**
 * Проверяет, является ли группа мини-группой (по количеству студентов)
 */
export const isMiniGroup = (currentStudents: number, capacity: number): boolean => {
  return capacity <= 3 && currentStudents <= 3;
};

/**
 * Проверяет права пользователя на выполнение действия с группой
 */
export const checkGroupPermission = async (
  userId: string,
  groupId: string | null,
  permission: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_group_permission', {
      p_user_id: userId,
      p_group_id: groupId,
      p_permission: permission
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking group permission:', error);
    return false;
  }
};

/**
 * Форматирует название группы с учетом кастомного названия
 */
export const formatGroupName = (
  group: {
    name?: string;
    custom_name_locked?: boolean;
    subject?: string;
    level?: string;
    branch?: string;
  }
): string => {
  if (group.name && group.custom_name_locked) {
    return group.name;
  }
  
  if (group.name) {
    return group.name;
  }

  // Автогенерация названия
  return `${group.subject || 'Группа'} ${group.level || ''} (${group.branch || ''})`.trim();
};

/**
 * Получает цвет статуса группы
 */
export const getGroupStatusColor = (status: string): string => {
  switch (status) {
    case 'forming':
      return 'bg-yellow-100 text-yellow-800';
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    case 'paused':
      return 'bg-orange-100 text-orange-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

/**
 * Получает текстовое описание статуса группы
 */
export const getGroupStatusLabel = (status: string): string => {
  switch (status) {
    case 'forming':
      return 'Формируется';
    case 'active':
      return 'Активна';
    case 'completed':
      return 'Завершена';
    case 'paused':
      return 'Приостановлена';
    case 'cancelled':
      return 'Отменена';
    default:
      return status;
  }
};

/**
 * Вычисляет процент заполненности группы
 */
export const calculateGroupFillPercentage = (
  currentStudents: number,
  capacity: number
): number => {
  if (capacity === 0) return 0;
  return Math.round((currentStudents / capacity) * 100);
};

/**
 * Проверяет, можно ли добавить студента в группу
 */
export const canAddStudentToGroup = (
  currentStudents: number,
  capacity: number,
  status: string
): boolean => {
  return status !== 'completed' && 
         status !== 'cancelled' && 
         currentStudents < capacity;
};
