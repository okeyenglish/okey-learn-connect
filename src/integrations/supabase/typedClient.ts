/**
 * Типизированный Supabase клиент для self-hosted Supabase
 * 
 * DEPRECATED: Используйте основной клиент из ./client
 * Этот файл существует для обратной совместимости.
 * 
 * Пример использования:
 * import { supabase } from "@/integrations/supabase/client";
 */

// Re-export main client to avoid multiple GoTrueClient instances
export { supabase } from './client';

// Alias for backward compatibility
export { supabase as supabaseTyped } from './client';

// Re-export types for convenience
export type { CustomDatabase } from './database.types';
export * from './database.types';
