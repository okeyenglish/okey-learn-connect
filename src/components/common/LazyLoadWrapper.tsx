import { Suspense, ComponentType, lazy } from 'react';

/**
 * Wrapper для lazy loading с улучшенным UX
 */

interface LazyLoadWrapperProps {
  loadingComponent?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

const DefaultLoadingComponent = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="loading-spinner rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Загрузка...</p>
    </div>
  </div>
);

/**
 * HOC для lazy loading компонентов с кастомным fallback
 */
export function withLazyLoad<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadWrapperProps = {}
) {
  const LazyComponent = lazy(importFunc);
  const { loadingComponent = <DefaultLoadingComponent /> } = options;

  return function LazyLoadedComponent(props: any) {
    return (
      <Suspense fallback={loadingComponent}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Компонент для группировки нескольких lazy loaded компонентов
 */
interface LazyGroupProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LazyGroup({ children, fallback = <DefaultLoadingComponent /> }: LazyGroupProps) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

/**
 * Prefetch функция для предзагрузки компонентов
 */
export function prefetchComponent(
  importFunc: () => Promise<{ default: ComponentType<any> }>
) {
  // Начинаем загрузку, но не ждем результата
  importFunc().catch(err => {
    console.warn('Prefetch failed:', err);
  });
}

/**
 * Hook для prefetch при hover
 */
export function usePrefetchOnHover() {
  return (importFunc: () => Promise<{ default: ComponentType<any> }>) => {
    return {
      onMouseEnter: () => prefetchComponent(importFunc),
      onTouchStart: () => prefetchComponent(importFunc),
    };
  };
}
