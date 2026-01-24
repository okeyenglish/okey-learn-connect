/**
 * Типизированный Supabase клиент для self-hosted Supabase
 * 
 * Используйте этот клиент вместо стандартного для получения
 * правильной типизации таблиц и функций.
 * 
 * Пример использования:
 * import { supabaseTyped as supabase } from "@/integrations/supabase/typedClient";
 */

import { createClient } from '@supabase/supabase-js';
import type { CustomDatabase } from './database.types';

const SUPABASE_URL = "https://api.academyos.ru";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg";

/**
 * Типизированный Supabase клиент с кастомными типами БД
 * Используем any для обхода проблем совместимости с Lovable Cloud types.ts
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseTyped = createClient<any>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY, 
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Re-export types for convenience
export type { CustomDatabase } from './database.types';
export * from './database.types';
