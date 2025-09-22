import { useState, useCallback } from 'react';

export interface PinnedModal {
  id: string;
  type: 'task' | 'invoice' | 'client' | 'student' | 'family';
  title: string;
  props: any;
  isOpen: boolean;
}

export const usePinnedModals = () => {
  const [pinnedModals, setPinnedModals] = useState<PinnedModal[]>([]);

  const pinModal = useCallback((modal: Omit<PinnedModal, 'isOpen'>) => {
    setPinnedModals(prev => {
      // Проверяем, не закреплено ли уже такое окно
      if (prev.some(m => m.id === modal.id && m.type === modal.type)) {
        return prev;
      }
      return [...prev, { ...modal, isOpen: false }];
    });
  }, []);

  const unpinModal = useCallback((id: string, type: string) => {
    setPinnedModals(prev => prev.filter(m => !(m.id === id && m.type === type)));
  }, []);

  const openPinnedModal = useCallback((id: string, type: string) => {
    setPinnedModals(prev => 
      prev.map(m => 
        m.id === id && m.type === type 
          ? { ...m, isOpen: true }
          : m
      )
    );
  }, []);

  const closePinnedModal = useCallback((id: string, type: string) => {
    setPinnedModals(prev => 
      prev.map(m => 
        m.id === id && m.type === type 
          ? { ...m, isOpen: false }
          : m
      )
    );
  }, []);

  const isPinned = useCallback((id: string, type: string) => {
    return pinnedModals.some(m => m.id === id && m.type === type);
  }, [pinnedModals]);

  return {
    pinnedModals,
    pinModal,
    unpinModal,
    openPinnedModal,
    closePinnedModal,
    isPinned
  };
};