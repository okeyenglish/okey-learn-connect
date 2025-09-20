import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PinnedModal {
  id: string;
  type: 'task' | 'invoice' | 'client' | 'student' | 'family' | string;
  title: string;
  props: any;
  isOpen: boolean;
}

export const usePinnedModalsDB = () => {
  const [pinnedModals, setPinnedModals] = useState<PinnedModal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Загрузка закрепленных модальных окон из базы данных
  const loadPinnedModals = useCallback(async () => {
    if (!user) {
      setPinnedModals([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pinned_modals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading pinned modals:', error);
        return;
      }

      const formattedModals: PinnedModal[] = (data || []).map(modal => ({
        id: modal.modal_id,
        type: modal.modal_type,
        title: modal.title,
        props: modal.props || {},
        isOpen: false
      }));

      setPinnedModals(formattedModals);
    } catch (error) {
      console.error('Error loading pinned modals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Загружаем данные при монтировании компонента или изменении пользователя
  useEffect(() => {
    loadPinnedModals();
  }, [loadPinnedModals]);

  // Закрепление модального окна
  const pinModal = useCallback(async (modal: Omit<PinnedModal, 'isOpen'>) => {
    if (!user) return;

    try {
      // Проверяем, не закреплено ли уже такое окно
      const existing = pinnedModals.find(m => m.id === modal.id && m.type === modal.type);
      if (existing) return;

      const { error } = await supabase
        .from('pinned_modals')
        .insert({
          user_id: user.id,
          modal_id: modal.id,
          modal_type: modal.type,
          title: modal.title,
          props: modal.props
        });

      if (error) {
        console.error('Error pinning modal:', error);
        return;
      }

      // Обновляем локальное состояние
      setPinnedModals(prev => [...prev, { ...modal, isOpen: false }]);
    } catch (error) {
      console.error('Error pinning modal:', error);
    }
  }, [user, pinnedModals]);

  // Открепление модального окна
  const unpinModal = useCallback(async (id: string, type: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('pinned_modals')
        .delete()
        .eq('user_id', user.id)
        .eq('modal_id', id)
        .eq('modal_type', type);

      if (error) {
        console.error('Error unpinning modal:', error);
        return;
      }

      // Обновляем локальное состояние
      setPinnedModals(prev => prev.filter(m => !(m.id === id && m.type === type)));
    } catch (error) {
      console.error('Error unpinning modal:', error);
    }
  }, [user]);

  // Открытие закрепленного модального окна
  const openPinnedModal = useCallback((id: string, type: string) => {
    setPinnedModals(prev => 
      prev.map(m => 
        m.id === id && m.type === type 
          ? { ...m, isOpen: true }
          : m
      )
    );
  }, []);

  // Закрытие закрепленного модального окна
  const closePinnedModal = useCallback((id: string, type: string) => {
    setPinnedModals(prev => 
      prev.map(m => 
        m.id === id && m.type === type 
          ? { ...m, isOpen: false }
          : m
      )
    );
  }, []);

  // Проверка, закреплено ли модальное окно
  const isPinned = useCallback((id: string, type: string) => {
    return pinnedModals.some(m => m.id === id && m.type === type);
  }, [pinnedModals]);

  return {
    pinnedModals,
    loading,
    pinModal,
    unpinModal,
    openPinnedModal,
    closePinnedModal,
    isPinned
  };
};