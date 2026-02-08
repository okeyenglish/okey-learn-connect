import { useState, useEffect, useCallback } from 'react';
import { toBranchKey } from '@/lib/branchUtils';

const STORAGE_KEY = 'crm-selected-branch';

/**
 * Хук для сохранения выбранного филиала в localStorage.
 * Позволяет сохранять выбор между сессиями.
 * 
 * При инициализации автоматически мигрирует старые значения
 * (полные названия типа "O'KEY ENGLISH Новокосино") в нормализованные ключи.
 */
export function usePersistedBranch(defaultValue: string = 'all') {
  const [selectedBranch, setSelectedBranchState] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return defaultValue;
      
      // Migrate old values: if it's not 'all' and contains spaces or brand tokens,
      // normalize it to the new key format
      if (stored !== 'all') {
        const normalized = toBranchKey(stored);
        
        // If normalization changed the value, save the normalized version
        if (normalized && normalized !== stored.toLowerCase().trim()) {
          console.log('[usePersistedBranch] Migrating old branch value:', {
            old: stored,
            new: normalized,
          });
          localStorage.setItem(STORAGE_KEY, normalized);
          return normalized;
        }
        
        // If normalization resulted in empty string, reset to 'all'
        if (!normalized) {
          console.log('[usePersistedBranch] Invalid stored branch, resetting to all:', stored);
          localStorage.setItem(STORAGE_KEY, defaultValue);
          return defaultValue;
        }
      }
      
      return stored;
    } catch {
      return defaultValue;
    }
  });

  // Сохранять в localStorage при изменении
  const setSelectedBranch = useCallback((branch: string) => {
    // Always normalize before saving (except 'all')
    const normalizedBranch = branch === 'all' ? 'all' : toBranchKey(branch) || 'all';
    
    setSelectedBranchState(normalizedBranch);
    try {
      localStorage.setItem(STORAGE_KEY, normalizedBranch);
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

  /**
   * Validates that the current selection is in the list of available branches.
   * If not, resets to 'all'.
   * 
   * @param availableBranchKeys - Array of normalized branch keys that are valid
   */
  const validateAgainstAvailable = useCallback((availableBranchKeys: string[]) => {
    if (selectedBranch === 'all') return;
    
    // Check if current selection is still valid
    if (!availableBranchKeys.includes(selectedBranch)) {
      console.log('[usePersistedBranch] Current branch not in available list, resetting:', {
        current: selectedBranch,
        available: availableBranchKeys,
      });
      resetBranch();
    }
  }, [selectedBranch, resetBranch]);

  return {
    selectedBranch,
    setSelectedBranch,
    resetBranch,
    validateAgainstAvailable,
  };
}
