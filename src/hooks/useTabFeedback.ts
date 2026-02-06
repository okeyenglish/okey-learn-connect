import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from './use-mobile';

interface UseTabFeedbackOptions {
  /** Минимальное время отсутствия (мс) чтобы показать вопрос */
  minAwayTime?: number;
  /** Callback когда нужно показать сообщение AI */
  onShowFeedbackRequest?: () => void;
  /** Включено ли отслеживание */
  enabled?: boolean;
}

/**
 * Хук для отслеживания ухода менеджера с вкладки CRM
 * и запроса обратной связи от AI помощника
 */
export const useTabFeedback = ({
  minAwayTime = 30000, // 30 секунд по умолчанию
  onShowFeedbackRequest,
  enabled = true
}: UseTabFeedbackOptions = {}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const leftAtRef = useRef<number | null>(null);
  const hasAskedRef = useRef(false);
  const sessionAskedRef = useRef(false); // Спрашиваем только раз за сессию

  const handleVisibilityChange = useCallback(() => {
    // Skip tab feedback on mobile devices
    if (isMobile) return;
    
    if (!enabled || !user || sessionAskedRef.current) return;

    if (document.hidden) {
      // Пользователь ушёл с вкладки
      leftAtRef.current = Date.now();
      console.log('[TabFeedback] User left the tab');
    } else {
      // Пользователь вернулся
      if (leftAtRef.current) {
        const awayTime = Date.now() - leftAtRef.current;
        console.log(`[TabFeedback] User returned after ${Math.round(awayTime / 1000)}s`);
        
        if (awayTime >= minAwayTime && !hasAskedRef.current) {
          hasAskedRef.current = true;
          sessionAskedRef.current = true;
          
          // Логируем событие
          logTabAwayEvent(user.id, awayTime);
          
          // Вызываем callback для показа сообщения
          onShowFeedbackRequest?.();
        }
      }
      leftAtRef.current = null;
    }
  }, [enabled, user, minAwayTime, onShowFeedbackRequest, isMobile]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, handleVisibilityChange]);

  // Сброс флага при новой сессии (при монтировании)
  useEffect(() => {
    hasAskedRef.current = false;
  }, []);

  return {
    resetFeedbackFlag: () => {
      hasAskedRef.current = false;
    }
  };
};

// Логирование события ухода с вкладки (для аналитики)
async function logTabAwayEvent(userId: string, awayTimeMs: number) {
  try {
    // Можно логировать в audit_log или отдельную таблицу
    console.log(`[TabFeedback] Logged tab-away event: user=${userId}, away=${Math.round(awayTimeMs / 1000)}s`);
  } catch (error) {
    console.error('[TabFeedback] Failed to log event:', error);
  }
}

export const TAB_FEEDBACK_MESSAGE = 
  "Заметил, что вы отвлеклись на другой ресурс 👀\n\n" +
  "Чего не хватает в нашем интерфейсе CRM? " +
  "Пришлите, пожалуйста, ссылочку или опишите — я передам коллегам в разработку! 🚀";
