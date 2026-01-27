import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ai-hub-sections-state';

interface SectionsState {
  aiSectionExpanded: boolean;
  staffSectionExpanded: boolean;
}

const DEFAULT_STATE: SectionsState = {
  aiSectionExpanded: false,
  staffSectionExpanded: true,
};

/**
 * Хук для сохранения состояния развёрнутости секций в localStorage.
 */
export function usePersistedSections() {
  const [state, setState] = useState<SectionsState>(() => {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_STATE, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_STATE;
  });

  // Сохранять в localStorage при изменении
  const updateState = useCallback((updates: Partial<SectionsState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (error) {
        console.warn('Failed to save sections state to localStorage:', error);
      }
      return newState;
    });
  }, []);

  const setAiSectionExpanded = useCallback((expanded: boolean) => {
    updateState({ aiSectionExpanded: expanded });
  }, [updateState]);

  const setStaffSectionExpanded = useCallback((expanded: boolean) => {
    updateState({ staffSectionExpanded: expanded });
  }, [updateState]);

  const toggleAiSection = useCallback(() => {
    updateState({ aiSectionExpanded: !state.aiSectionExpanded });
  }, [state.aiSectionExpanded, updateState]);

  const toggleStaffSection = useCallback(() => {
    updateState({ staffSectionExpanded: !state.staffSectionExpanded });
  }, [state.staffSectionExpanded, updateState]);

  return {
    aiSectionExpanded: state.aiSectionExpanded,
    staffSectionExpanded: state.staffSectionExpanded,
    setAiSectionExpanded,
    setStaffSectionExpanded,
    toggleAiSection,
    toggleStaffSection,
  };
}
