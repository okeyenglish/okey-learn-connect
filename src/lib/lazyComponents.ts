import { lazy, ComponentType } from 'react';

/**
 * Utility for lazy loading components with retry logic
 * Helps reduce initial bundle size by code-splitting
 */

// Retry logic for dynamic imports
function retryImport<T>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): Promise<{ default: T }> {
  return new Promise((resolve, reject) => {
    importFn()
      .then(resolve)
      .catch((error) => {
        if (retries === 0) {
          reject(error);
          return;
        }
        setTimeout(() => {
          retryImport(importFn, retries - 1, delay * 1.5)
            .then(resolve)
            .catch(reject);
        }, delay);
      });
  });
}

/**
 * Create a lazy-loaded component with retry logic
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(() => retryImport(importFn));
}

/**
 * Create a lazy-loaded component from named export
 */
export function lazyNamed<T extends ComponentType<any>>(
  importFn: () => Promise<Record<string, T>>,
  exportName: string
) {
  return lazy(() =>
    importFn().then((module) => ({ default: module[exportName] }))
  );
}

/**
 * Preload a component without rendering it
 * Useful for prefetching on hover or route transitions
 */
export function preloadComponent(
  importFn: () => Promise<{ default: ComponentType<any> }>
): void {
  importFn().catch(() => {
    // Silently fail preload - not critical
  });
}

// Pre-defined lazy components for heavy modules
export const LazyPDFViewer = lazyWithRetry(() => 
  import('@/components/PDFViewer').then(m => ({ default: m.PDFViewer }))
);

export const LazyMessageSearchModal = lazyWithRetry(() => 
  import('@/components/crm/MessageSearchModal')
);

export const LazyForwardMessageModal = lazyWithRetry(() => 
  import('@/components/crm/ForwardMessageModal').then(m => ({ default: m.ForwardMessageModal }))
);

export const LazyAddTaskModal = lazyWithRetry(() => 
  import('@/components/crm/AddTaskModal').then(m => ({ default: m.AddTaskModal }))
);

export const LazyCreateInvoiceModal = lazyWithRetry(() => 
  import('@/components/crm/CreateInvoiceModal').then(m => ({ default: m.CreateInvoiceModal }))
);

export const LazyQuickResponsesModal = lazyWithRetry(() => 
  import('@/components/crm/QuickResponsesModal').then(m => ({ default: m.QuickResponsesModal }))
);

export const LazyScriptsModal = lazyWithRetry(() => 
  import('@/components/crm/ScriptsModal').then(m => ({ default: m.ScriptsModal }))
);

export const LazyProfileModal = lazyWithRetry(() => 
  import('@/components/crm/ProfileModal').then(m => ({ default: m.ProfileModal }))
);

export const LazyStudentProfileModal = lazyWithRetry(() => 
  import('@/components/crm/StudentProfileModal').then(m => ({ default: m.StudentProfileModal }))
);

export default {
  lazyWithRetry,
  lazyNamed,
  preloadComponent,
};
