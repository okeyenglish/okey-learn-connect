import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'crm-selected-branch';

/**
 * Хук для сохранения выбранного филиала в localStorage.
 * Позволяет сохранять выбор между сессиями.
 */
export function usePersistedBranch(defaultValue: string = 'all') {
  const [selectedBranch, setSelectedBranchState] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored || defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Сохранять в localStorage при изменении
  const setSelectedBranch = useCallback((branch: string) => {
    setSelectedBranchState(branch);
    try {
      localStorage.setItem(STORAGE_KEY, branch);
    } catch (error) {
      console.warn('Failed to save branch to localStorage:', error);
    }
  }, []);

  // Синхронизация между вкладками
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setSelectedBranchState(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Сброс филиала
  const resetBranch = useCallback(() => {
    setSelectedBranch(defaultValue);
  }, [defaultValue, setSelectedBranch]);

  return {
    selectedBranch,
    setSelectedBranch,
    resetBranch,
  };
}
