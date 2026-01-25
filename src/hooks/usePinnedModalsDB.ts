import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';
import type { PinnedModalDB } from '@/integrations/supabase/database.types';

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

      const formattedModals: PinnedModal[] = (data || []).map((modal) => ({
        id: modal.modal_id,
        type: modal.modal_type,
        title: modal.title,
        props: modal.props || {},
        isOpen: modal.is_open || false
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

    // Подписка на realtime изменения
    if (!user) return;

    const channel = supabase
      .channel('pinned_modals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_modals',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Pinned modals changed, reloading...');
          loadPinnedModals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPinnedModals, user]);

  // Закрепление модального окна
  const pinModal = useCallback(async (modal: Omit<PinnedModal, 'isOpen'>) => {
    if (!user) return;

    try {
      // Проверяем, не закреплено ли уже такое окно
      const existing = pinnedModals.find(m => m.id === modal.id && m.type === modal.type);
      if (existing) {
        console.log('Modal already pinned, skipping');
        return;
      }

      console.log('Pinning modal:', modal);
      const { error } = await supabase
        .from('pinned_modals')
        .upsert({
          user_id: user.id,
          modal_id: modal.id,
          modal_type: modal.type,
          title: modal.title,
          props: modal.props
        }, {
          onConflict: 'user_id,modal_id,modal_type'
        });

      if (error) {
        console.error('Error pinning modal:', error);
        return;
      }

      console.log('Modal pinned successfully');
      // Перезагружаем данные вместо обновления локального состояния
      await loadPinnedModals();
    } catch (error) {
      console.error('Error pinning modal:', error);
    }
  }, [user, pinnedModals, loadPinnedModals]);

  // Открепление модального окна
  const unpinModal = useCallback(async (id: string, type: string) => {
    if (!user) return;

    try {
      console.log('Unpinning modal:', { id, type });
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

      console.log('Modal unpinned successfully');
      // Перезагружаем данные вместо обновления локального состояния
      await loadPinnedModals();
    } catch (error) {
      console.error('Error unpinning modal:', error);
    }
  }, [user, loadPinnedModals]);

  // Открытие закрепленного модального окна
  const openPinnedModal = useCallback(async (id: string, type: string) => {
    if (!user) return;

    try {
      // Обновляем в базе данных
      const { error } = await supabase
        .from('pinned_modals')
        .update({ is_open: true })
        .eq('user_id', user.id)
        .eq('modal_id', id)
        .eq('modal_type', type);

      if (error) {
        console.error('Error updating modal state:', error);
        return;
      }

      // Обновляем локальное состояние
      setPinnedModals(prev => 
        prev.map(m => 
          m.id === id && m.type === type 
            ? { ...m, isOpen: true }
            : m
        )
      );
    } catch (error) {
      console.error('Error opening pinned modal:', error);
    }
  }, [user]);

  // Закрытие закрепленного модального окна
  const closePinnedModal = useCallback(async (id: string, type: string) => {
    if (!user) return;

    try {
      // Обновляем в базе данных
      const { error } = await supabase
        .from('pinned_modals')
        .update({ is_open: false })
        .eq('user_id', user.id)
        .eq('modal_id', id)
        .eq('modal_type', type);

      if (error) {
        console.error('Error updating modal state:', error);
        return;
      }

      // Обновляем локальное состояние
      setPinnedModals(prev => 
        prev.map(m => 
          m.id === id && m.type === type 
            ? { ...m, isOpen: false }
            : m
        )
      );
    } catch (error) {
      console.error('Error closing pinned modal:', error);
    }
  }, [user]);

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
