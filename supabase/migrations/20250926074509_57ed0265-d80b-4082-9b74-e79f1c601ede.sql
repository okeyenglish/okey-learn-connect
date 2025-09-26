-- Первая часть: добавляем новые роли в enum
ALTER TYPE public.app_role ADD VALUE 'accountant';
ALTER TYPE public.app_role ADD VALUE 'marketing_manager';
ALTER TYPE public.app_role ADD VALUE 'sales_manager';
ALTER TYPE public.app_role ADD VALUE 'receptionist';
ALTER TYPE public.app_role ADD VALUE 'head_teacher';
ALTER TYPE public.app_role ADD VALUE 'branch_manager';