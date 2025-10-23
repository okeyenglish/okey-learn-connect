/**
 * Система prefetch для критических маршрутов
 */

// Определяем критические маршруты, которые нужно предзагрузить
const criticalRoutes = {
  crm: () => import('../pages/CRM'),
  studentPortal: () => import('../pages/StudentPortal'),
  teacherPortal: () => import('../pages/TeacherPortal'),
};

// Определяем приоритеты prefetch
export enum PrefetchPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

interface PrefetchConfig {
  route: keyof typeof criticalRoutes;
  priority: PrefetchPriority;
  delay?: number; // задержка перед началом загрузки (мс)
}

// Конфигурация prefetch для разных сценариев
export const prefetchConfigs: Record<string, PrefetchConfig[]> = {
  // После входа в систему
  afterLogin: [
    { route: 'crm', priority: PrefetchPriority.HIGH, delay: 0 },
    { route: 'studentPortal', priority: PrefetchPriority.MEDIUM, delay: 1000 },
    { route: 'teacherPortal', priority: PrefetchPriority.MEDIUM, delay: 2000 },
  ],
  
  // При переходе на главную
  onHomePage: [
    { route: 'crm', priority: PrefetchPriority.MEDIUM, delay: 2000 },
  ],
};

/**
 * Функция для prefetch маршрутов
 */
export async function prefetchRoutes(configs: PrefetchConfig[]) {
  for (const config of configs) {
    const { route, delay = 0 } = config;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      await criticalRoutes[route]();
      console.log(`[Prefetch] Successfully prefetched: ${route}`);
    } catch (error) {
      console.warn(`[Prefetch] Failed to prefetch ${route}:`, error);
    }
  }
}

/**
 * Prefetch по названию сценария
 */
export function prefetchByScenario(scenario: keyof typeof prefetchConfigs) {
  const configs = prefetchConfigs[scenario];
  if (configs) {
    prefetchRoutes(configs);
  }
}

/**
 * Hook для автоматического prefetch
 */
import { useEffect } from 'react';

export function usePrefetch(scenario: keyof typeof prefetchConfigs) {
  useEffect(() => {
    // Используем requestIdleCallback если доступен, иначе setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        prefetchByScenario(scenario);
      });
    } else {
      setTimeout(() => {
        prefetchByScenario(scenario);
      }, 100);
    }
  }, [scenario]);
}
