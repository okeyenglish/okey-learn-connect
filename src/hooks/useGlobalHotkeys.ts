import { useEffect } from 'react';

interface GlobalHotkeysConfig {
  onStart?: () => void;
  onAttendance?: () => void;
  onHomework?: () => void;
  onComplete?: () => void;
  onOpenChat?: () => void;
  onOpenCommandPalette?: () => void;
  enabled?: boolean;
}

/**
 * Хук для глобальных горячих клавиш в ЛК преподавателя
 * 
 * Клавиши:
 * - Enter: Начать следующий урок
 * - P: Посещаемость
 * - D: Домашнее задание
 * - ⌘↵ (Cmd+Enter): Провёл урок
 * - ⌘/ (Cmd+/): Открыть чат/ассистент
 * - ⌘K: Командная палитра
 * - Esc: Закрыть модалы
 */
export const useGlobalHotkeys = (config: GlobalHotkeysConfig) => {
  const {
    onStart,
    onAttendance,
    onHomework,
    onComplete,
    onOpenChat,
    onOpenCommandPalette,
    enabled = true,
  } = config;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем если фокус на инпуте/текстареа (кроме спец. комбинаций)
      const target = e.target as HTMLElement;
      const isInputFocused = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // ⌘K или Ctrl+K - всегда работает
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenCommandPalette?.();
        return;
      }

      // ⌘/ или Ctrl+/ - всегда работает
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        onOpenChat?.();
        return;
      }

      // ⌘Enter или Ctrl+Enter - провёл урок
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onComplete?.();
        return;
      }

      // Если фокус на инпуте, остальные клавиши не работают
      if (isInputFocused) return;

      // Enter - начать урок
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onStart?.();
        return;
      }

      // P - посещаемость
      if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
        e.preventDefault();
        onAttendance?.();
        return;
      }

      // D - домашнее задание
      if (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        e.preventDefault();
        onHomework?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onStart, onAttendance, onHomework, onComplete, onOpenChat, onOpenCommandPalette]);
};

export default useGlobalHotkeys;