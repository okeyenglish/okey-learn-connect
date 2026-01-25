/**
 * Supabase клиент для self-hosted инстанса (api.academyos.ru)
 * 
 * ВАЖНО: Этот файл настроен на self-hosted Supabase.
 * Типы берутся из database.types.ts, а не из автогенерируемого types.ts
 * 
 * Используем any для SDK клиента из-за сложностей совместимости типов.
 * Для типизации используйте интерфейсы из database.types.ts напрямую.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://api.academyos.ru";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Re-export types for convenience - use these for type annotations
export type { CustomDatabase as Database } from './database.types';
export * from './database.types';