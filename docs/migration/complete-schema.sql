-- =============================================
-- AcademyOS CRM - Complete Database Schema
-- Self-Hosted Supabase Migration Script
-- Generated: 2026-01-23
-- =============================================
-- 
-- USAGE:
-- 1. Start self-hosted Supabase (docker-compose up)
-- 2. Connect to Postgres: psql -h localhost -p 5432 -U postgres -d postgres
-- 3. Run this script: \i complete-schema.sql
-- 4. Import auth.users (separately)
-- 5. Run add-auth-foreign-keys.sql
-- 6. Import data
--
-- =============================================

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================
-- ENUMS
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin', 'manager', 'teacher', 'student', 'methodist', 
    'accountant', 'marketing_manager', 'sales_manager', 
    'receptionist', 'head_teacher', 'branch_manager', 'support', 'parent'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.balance_transaction_type AS ENUM ('credit', 'debit', 'transfer_in', 'refund');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.bonus_transaction_type AS ENUM ('earned', 'spent', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_payment_method AS ENUM ('cash', 'card', 'transfer', 'online');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_price_type AS ENUM ('hourly', 'daily', 'monthly');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.group_category AS ENUM ('preschool', 'school', 'adult', 'all');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.group_status AS ENUM ('reserve', 'forming', 'active', 'suspended', 'finished', 'paused', 'dropped', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.group_student_status AS ENUM ('active', 'paused', 'completed', 'dropped');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.group_type AS ENUM ('general', 'individual', 'mini', 'corporate');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lesson_status AS ENUM ('scheduled', 'cancelled', 'completed', 'rescheduled', 'free', 'free_skip', 'paid_skip', 'partial_payment', 'partial_skip', 'penalty');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.messenger_type AS ENUM ('telegram', 'whatsapp', 'wpp_connect', 'salebot', 'sms', 'email', 'call', 'internal', 'max');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('info', 'success', 'warning', 'error', 'reminder', 'assignment');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.student_status AS ENUM ('lead', 'trial', 'active', 'paused', 'archived', 'graduated');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- BASE FUNCTIONS (create FIRST!)
-- =============================================

-- 1. update_updated_at_column - used in 50+ tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. has_role - user role check (used in RLS)
CREATE OR REPLACE FUNCTION public.has_role(check_user_id uuid, check_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = check_user_id AND ur.role = check_role::app_role
  );
$$;

-- 3. get_user_organization_id - get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- 4. user_belongs_to_organization - check org membership
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = org_id
  );
$$;

-- 5. auto_set_organization_id - auto-set org on insert
CREATE OR REPLACE FUNCTION public.auto_set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (SELECT organization_id FROM profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- LEVEL 0: Independent tables (no FK dependencies)
-- =============================================

-- organizations (main tenant table)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  website text,
  email text,
  phone text,
  address text,
  city text,
  country text DEFAULT 'Russia',
  timezone text DEFAULT 'Europe/Moscow',
  currency text DEFAULT 'RUB',
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- currencies
CREATE TABLE IF NOT EXISTS public.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  symbol text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- absence_reasons
CREATE TABLE IF NOT EXISTS public.absence_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  payment_coefficient numeric DEFAULT 1.00,
  is_excused boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- age_categories
CREATE TABLE IF NOT EXISTS public.age_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_age integer,
  max_age integer,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- proficiency_levels
CREATE TABLE IF NOT EXISTS public.proficiency_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  description text,
  color text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- learning_types
CREATE TABLE IF NOT EXISTS public.learning_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- learning_formats
CREATE TABLE IF NOT EXISTS public.learning_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_online boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- lead_sources
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- lead_statuses
CREATE TABLE IF NOT EXISTS public.lead_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  sort_order integer DEFAULT 0,
  is_success boolean DEFAULT false,
  is_failure boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- client_statuses
CREATE TABLE IF NOT EXISTS public.client_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  description text,
  external_id text,
  sort_order integer DEFAULT 0,
  is_success boolean DEFAULT false,
  is_failure boolean DEFAULT false,
  is_active boolean DEFAULT true,
  organization_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- student_statuses
CREATE TABLE IF NOT EXISTS public.student_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- course_prices
CREATE TABLE IF NOT EXISTS public.course_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text NOT NULL,
  price_per_academic_hour numeric NOT NULL,
  price_per_40_min numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  lessons_count integer NOT NULL,
  price numeric NOT NULL,
  validity_days integer DEFAULT 30,
  is_active boolean DEFAULT true,
  organization_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- docs (knowledge base)
CREATE TABLE IF NOT EXISTS public.docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text,
  content text NOT NULL,
  embedding vector(1536),
  tokens integer,
  updated_at timestamptz DEFAULT now()
);

-- faq
CREATE TABLE IF NOT EXISTS public.faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- cron_job_logs
CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL,
  error_message text,
  response_data jsonb,
  execution_time_ms integer,
  executed_at timestamptz DEFAULT now()
);

-- webhook_logs
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text,
  payload jsonb,
  response jsonb,
  status_code integer,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- seo_job_logs
CREATE TABLE IF NOT EXISTS public.seo_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  status text NOT NULL,
  details jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- ai_model_mappings
CREATE TABLE IF NOT EXISTS public.ai_model_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case text NOT NULL,
  tier text NOT NULL,
  model_id text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(use_case, tier)
);

-- =============================================
-- LEVEL 1: Tables with FK to organizations
-- =============================================

-- organization_branches
CREATE TABLE IF NOT EXISTS public.organization_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  is_main boolean DEFAULT false,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}',
  working_hours jsonb,
  photos text[],
  geo_lat numeric,
  geo_lng numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- profiles (FK to auth.users added later)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  email text,
  first_name text,
  last_name text,
  middle_name text,
  phone text,
  avatar_url text,
  timezone text DEFAULT 'Europe/Moscow',
  locale text DEFAULT 'ru',
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- user_roles (FK to auth.users added later)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- clients
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  first_name text,
  last_name text,
  middle_name text,
  email text,
  phone text,
  avatar_url text,
  branch text,
  client_number text,
  notes text,
  external_id text,
  salebot_client_id integer,
  telegram_chat_id text,
  telegram_user_id bigint,
  telegram_avatar_url text,
  whatsapp_chat_id text,
  whatsapp_avatar_url text,
  max_chat_id text,
  max_user_id integer,
  max_avatar_url text,
  holihope_metadata jsonb,
  last_message_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- teachers (FK to auth.users/profiles added later)
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id uuid,
  first_name text NOT NULL,
  last_name text,
  middle_name text,
  email text,
  phone text,
  avatar_url text,
  specialization text[],
  bio text,
  hourly_rate numeric,
  is_active boolean DEFAULT true,
  external_id text,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- courses
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- textbooks
CREATE TABLE IF NOT EXISTS public.textbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text,
  publisher text,
  isbn text,
  cover_url text,
  description text,
  level text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- classrooms
CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  branch text NOT NULL,
  name text NOT NULL,
  capacity integer DEFAULT 10,
  is_online boolean DEFAULT false,
  equipment text[],
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- price_lists
CREATE TABLE IF NOT EXISTS public.price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  valid_from date,
  valid_to date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- messenger_settings
CREATE TABLE IF NOT EXISTS public.messenger_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  messenger_type messenger_type NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, key)
);

-- organization_balances
CREATE TABLE IF NOT EXISTS public.organization_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ai_pricing
CREATE TABLE IF NOT EXISTS public.ai_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_name text,
  price_per_request numeric NOT NULL,
  currency_id uuid REFERENCES currencies(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, model_name)
);

-- ai_provider_keys
CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  provider text NOT NULL,
  key_type text DEFAULT 'api_key',
  key_value text NOT NULL,
  key_label text,
  key_preview text,
  limit_monthly integer,
  limit_remaining integer,
  reset_policy text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ai_key_provision_jobs
CREATE TABLE IF NOT EXISTS public.ai_key_provision_jobs (
  id bigserial PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  entity_name text NOT NULL,
  provider text NOT NULL,
  monthly_limit integer DEFAULT 50,
  reset_policy text DEFAULT 'daily',
  status text DEFAULT 'queued',
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 8,
  last_error text,
  run_after timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- max_channels
CREATE TABLE IF NOT EXISTS public.max_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  channel_type text NOT NULL,
  channel_name text,
  instance_id text,
  api_token text,
  phone_number text,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- kw_clusters
CREATE TABLE IF NOT EXISTS public.kw_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES kw_clusters(id),
  level integer DEFAULT 0,
  score numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- LEVEL 2: Tables with multiple dependencies
-- =============================================

-- students (depends on clients)
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  middle_name text,
  birth_date date,
  age integer,
  gender text,
  avatar_url text,
  level_id uuid REFERENCES proficiency_levels(id),
  status student_status DEFAULT 'active',
  balance numeric DEFAULT 0,
  notes text,
  external_id text,
  is_studying boolean DEFAULT true,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- learning_groups
CREATE TABLE IF NOT EXISTS public.learning_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES organization_branches(id),
  teacher_id uuid REFERENCES teachers(id),
  name text NOT NULL,
  code text,
  subject_id uuid REFERENCES subjects(id),
  level_id uuid REFERENCES proficiency_levels(id),
  age_category_id uuid REFERENCES age_categories(id),
  group_type group_type DEFAULT 'general',
  group_category group_category DEFAULT 'all',
  status group_status DEFAULT 'forming',
  max_students integer DEFAULT 8,
  current_students integer DEFAULT 0,
  lesson_duration integer DEFAULT 60,
  price_per_lesson numeric,
  schedule jsonb,
  start_date date,
  end_date date,
  classroom_id uuid REFERENCES classrooms(id),
  textbook_id uuid REFERENCES textbooks(id),
  course_id uuid REFERENCES courses(id),
  notes text,
  is_auto_group boolean DEFAULT false,
  auto_filter_conditions jsonb,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- leads
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  source_id uuid REFERENCES lead_sources(id),
  status_id uuid REFERENCES lead_statuses(id),
  assigned_to uuid REFERENCES profiles(id),
  branch text,
  notes text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  converted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- client_phone_numbers
CREATE TABLE IF NOT EXISTS public.client_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone text NOT NULL,
  phone_type text,
  is_primary boolean DEFAULT false,
  is_telegram_enabled boolean DEFAULT false,
  is_whatsapp_enabled boolean DEFAULT false,
  telegram_chat_id text,
  telegram_user_id bigint,
  telegram_avatar_url text,
  whatsapp_chat_id text,
  whatsapp_avatar_url text,
  max_chat_id text,
  max_user_id integer,
  max_avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- client_branches
CREATE TABLE IF NOT EXISTS public.client_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  branch text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- course_units
CREATE TABLE IF NOT EXISTS public.course_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  unit_number integer NOT NULL,
  lessons_count integer DEFAULT 0,
  vocabulary text,
  grammar text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- unit_lessons
CREATE TABLE IF NOT EXISTS public.unit_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES course_units(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  lesson_number integer NOT NULL,
  duration_minutes integer DEFAULT 45,
  materials jsonb,
  objectives text[],
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- teacher_branches
CREATE TABLE IF NOT EXISTS public.teacher_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES organization_branches(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, branch_id)
);

-- teacher_rates
CREATE TABLE IF NOT EXISTS public.teacher_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  group_type group_type,
  rate_per_hour numeric NOT NULL,
  rate_per_lesson numeric,
  min_students integer DEFAULT 1,
  max_students integer,
  effective_from date,
  effective_to date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- teacher_bbb_rooms
CREATE TABLE IF NOT EXISTS public.teacher_bbb_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE UNIQUE,
  room_id text NOT NULL,
  meeting_id text,
  moderator_password text,
  attendee_password text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- LEVEL 3: Session/transaction tables
-- =============================================

-- group_students
CREATE TABLE IF NOT EXISTS public.group_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status group_student_status DEFAULT 'active',
  joined_at date DEFAULT CURRENT_DATE,
  left_at date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(group_id, student_id)
);

-- lesson_sessions
CREATE TABLE IF NOT EXISTS public.lesson_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id),
  substitute_teacher_id uuid REFERENCES teachers(id),
  classroom_id uuid REFERENCES classrooms(id),
  unit_id uuid REFERENCES course_units(id),
  lesson_id uuid REFERENCES unit_lessons(id),
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer,
  status lesson_status DEFAULT 'scheduled',
  topic text,
  homework text,
  notes text,
  bbb_meeting_id text,
  bbb_join_url text,
  is_online boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- individual_lessons
CREATE TABLE IF NOT EXISTS public.individual_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES subjects(id),
  price_per_lesson numeric,
  lesson_duration integer DEFAULT 60,
  schedule jsonb,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- individual_lesson_sessions
CREATE TABLE IF NOT EXISTS public.individual_lesson_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_lesson_id uuid REFERENCES individual_lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id),
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer,
  status lesson_status DEFAULT 'scheduled',
  topic text,
  homework text,
  notes text,
  price numeric,
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- student_attendance
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_session_id uuid NOT NULL REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status text DEFAULT 'scheduled',
  absence_reason_id uuid REFERENCES absence_reasons(id),
  notes text,
  marked_at timestamptz,
  marked_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lesson_session_id, student_id)
);

-- payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'RUB',
  payment_method finance_payment_method DEFAULT 'cash',
  status payment_status DEFAULT 'pending',
  description text,
  invoice_id uuid,
  external_id text,
  payment_date date DEFAULT CURRENT_DATE,
  processed_by uuid,
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- balance_transactions
CREATE TABLE IF NOT EXISTS public.balance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  transaction_type balance_transaction_type NOT NULL,
  description text NOT NULL,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  lesson_session_id uuid REFERENCES individual_lesson_sessions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  lessons_total integer NOT NULL,
  lessons_remaining integer NOT NULL,
  amount_paid numeric,
  purchased_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  invoice_number text,
  amount numeric NOT NULL,
  currency text DEFAULT 'RUB',
  status finance_invoice_status DEFAULT 'draft',
  due_date date,
  paid_at timestamptz,
  items jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone_number_id uuid REFERENCES client_phone_numbers(id),
  max_channel_id uuid REFERENCES max_channels(id),
  message_text text NOT NULL,
  message_type text NOT NULL,
  messenger_type messenger_type,
  is_outgoing boolean DEFAULT false,
  is_read boolean DEFAULT false,
  message_status message_status,
  external_message_id text,
  salebot_message_id text,
  file_url text,
  file_name text,
  file_type text,
  call_duration text,
  webhook_id text,
  system_type text,
  created_at timestamptz DEFAULT now()
);

-- message_read_status (FK to auth.users added later)
CREATE TABLE IF NOT EXISTS public.message_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- global_chat_read_status (FK to auth.users added later)
CREATE TABLE IF NOT EXISTS public.global_chat_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz DEFAULT now(),
  last_read_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  UNIQUE(client_id, user_id)
);

-- assistant_threads (FK to auth.users added later)
CREATE TABLE IF NOT EXISTS public.assistant_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  context jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- pinned_modals (FK to auth.users added later)
CREATE TABLE IF NOT EXISTS public.pinned_modals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  modal_type text NOT NULL,
  entity_id text NOT NULL,
  entity_data jsonb,
  position_x integer DEFAULT 100,
  position_y integer DEFAULT 100,
  width integer DEFAULT 400,
  height integer DEFAULT 300,
  is_minimized boolean DEFAULT false,
  z_index integer DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, modal_type, entity_id)
);

-- push_subscriptions (FK to auth.users added later)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- audit_log (FK to auth.users added later)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  changed_by uuid,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  request_id text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- Remaining tables (apps, content, etc.)
-- =============================================

-- apps
CREATE TABLE IF NOT EXISTS public.apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  kind text NOT NULL,
  level text NOT NULL,
  status text DEFAULT 'draft',
  tags text[],
  embedding vector(1536),
  fingerprint text,
  avg_rating numeric,
  install_count integer DEFAULT 0,
  latest_version integer,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- app_versions
CREATE TABLE IF NOT EXISTS public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version integer NOT NULL,
  prompt jsonb NOT NULL,
  model text NOT NULL,
  artifact_path text NOT NULL,
  preview_url text NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(app_id, version)
);

-- app_installs
CREATE TABLE IF NOT EXISTS public.app_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  installed_at timestamptz DEFAULT now(),
  UNIQUE(app_id, teacher_id)
);

-- app_reviews
CREATE TABLE IF NOT EXISTS public.app_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(app_id, teacher_id)
);

-- app_usage
CREATE TABLE IF NOT EXISTS public.app_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  used_at timestamptz DEFAULT now()
);

-- app_flags
CREATE TABLE IF NOT EXISTS public.app_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- content_ideas
CREATE TABLE IF NOT EXISTS public.content_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  cluster_id uuid REFERENCES kw_clusters(id),
  title text NOT NULL,
  h1 text NOT NULL,
  route text NOT NULL,
  idea_type text NOT NULL,
  branch text,
  score numeric,
  status text DEFAULT 'draft',
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- content_docs
CREATE TABLE IF NOT EXISTS public.content_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  idea_id uuid REFERENCES content_ideas(id) ON DELETE SET NULL,
  html text NOT NULL,
  meta jsonb DEFAULT '{}',
  quality jsonb,
  word_count integer,
  version integer DEFAULT 1,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- content_metrics
CREATE TABLE IF NOT EXISTS public.content_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  content_id uuid REFERENCES content_docs(id) ON DELETE CASCADE,
  date date,
  impressions integer,
  clicks integer,
  ctr numeric,
  avg_position numeric,
  time_on_page integer,
  bounce_rate numeric,
  scroll_depth numeric,
  created_at timestamptz DEFAULT now()
);

-- homework
CREATE TABLE IF NOT EXISTS public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES learning_groups(id) ON DELETE CASCADE,
  lesson_session_id uuid REFERENCES lesson_sessions(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES teachers(id),
  title text NOT NULL,
  description text,
  due_date date,
  attachments text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- student_homework
CREATE TABLE IF NOT EXISTS public.student_homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  submitted_at timestamptz,
  checked_at timestamptz,
  grade integer,
  feedback text,
  attachments text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(homework_id, student_id)
);

-- tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id uuid REFERENCES profiles(id),
  due_date timestamptz,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  related_entity_type text,
  related_entity_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type notification_type DEFAULT 'info',
  title text NOT NULL,
  message text,
  link text,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  document_type text NOT NULL,
  file_path text,
  file_size integer,
  mime_type text,
  folder_path text,
  content text,
  is_shared boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- typing_status
CREATE TABLE IF NOT EXISTS public.typing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_typing boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- internal_chats
CREATE TABLE IF NOT EXISTS public.internal_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text,
  chat_type text DEFAULT 'direct',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- internal_chat_participants
CREATE TABLE IF NOT EXISTS public.internal_chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES internal_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- internal_chat_messages
CREATE TABLE IF NOT EXISTS public.internal_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES internal_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message_text text NOT NULL,
  attachments jsonb,
  reply_to_id uuid REFERENCES internal_chat_messages(id),
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- teacher_messages
CREATE TABLE IF NOT EXISTS public.teacher_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  to_teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  subject text,
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  parent_id uuid REFERENCES teacher_messages(id),
  created_at timestamptz DEFAULT now()
);

-- call_logs
CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  initiated_by uuid,
  phone_number text NOT NULL,
  direction text NOT NULL,
  status text DEFAULT 'initiated',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  notes text,
  summary text,
  external_call_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- call_comments
CREATE TABLE IF NOT EXISTS public.call_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id uuid REFERENCES call_logs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- broadcast_campaigns
CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  target_audience text NOT NULL,
  delivery_method text[] DEFAULT '{}',
  filters jsonb,
  status text DEFAULT 'draft',
  total_recipients integer,
  sent_count integer,
  delivered_count integer,
  failed_count integer,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- Additional utility tables
-- =============================================

-- schedule
CREATE TABLE IF NOT EXISTS public.schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id),
  group_id uuid REFERENCES learning_groups(id),
  classroom_id uuid REFERENCES classrooms(id),
  day_of_week day_of_week NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  effective_from date,
  effective_to date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- teacher_substitutions
CREATE TABLE IF NOT EXISTS public.teacher_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  substitute_teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  lesson_session_id uuid REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  group_id uuid REFERENCES learning_groups(id) ON DELETE CASCADE,
  substitution_date date NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- teacher_earnings
CREATE TABLE IF NOT EXISTS public.teacher_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  lesson_session_id uuid REFERENCES lesson_sessions(id) ON DELETE SET NULL,
  individual_session_id uuid REFERENCES individual_lesson_sessions(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  earning_type text NOT NULL,
  description text,
  period_start date,
  period_end date,
  is_paid boolean DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- teacher_payments
CREATE TABLE IF NOT EXISTS public.teacher_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text,
  period_start date,
  period_end date,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- payroll_monthly
CREATE TABLE IF NOT EXISTS public.payroll_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  lessons_count integer DEFAULT 0,
  total_hours numeric DEFAULT 0,
  base_amount numeric DEFAULT 0,
  bonuses numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'draft',
  approved_at timestamptz,
  approved_by uuid,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, year, month)
);

-- online_payments
CREATE TABLE IF NOT EXISTS public.online_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  external_id text,
  provider text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'RUB',
  status text DEFAULT 'pending',
  payment_url text,
  callback_url text,
  metadata jsonb,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- payment_terminals
CREATE TABLE IF NOT EXISTS public.payment_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES organization_branches(id),
  name text NOT NULL,
  terminal_id text,
  provider text,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES (performance)
-- =============================================

-- clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_organization ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_telegram ON clients(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_whatsapp ON clients(whatsapp_chat_id) WHERE whatsapp_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_last_message ON clients(last_message_at DESC);

-- students indexes
CREATE INDEX IF NOT EXISTS idx_students_client ON students(client_id);
CREATE INDEX IF NOT EXISTS idx_students_organization ON students(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- teachers indexes
CREATE INDEX IF NOT EXISTS idx_teachers_organization ON teachers(organization_id);
CREATE INDEX IF NOT EXISTS idx_teachers_profile ON teachers(profile_id);

-- learning_groups indexes
CREATE INDEX IF NOT EXISTS idx_groups_organization ON learning_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_groups_teacher ON learning_groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_groups_status ON learning_groups(status);

-- lesson_sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_group ON lesson_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON lesson_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON lesson_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON lesson_sessions(status);

-- chat_messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_client ON chat_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_organization ON chat_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- apps indexes
CREATE INDEX IF NOT EXISTS idx_apps_author ON apps(author_id);
CREATE INDEX IF NOT EXISTS idx_apps_organization ON apps(organization_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);

-- =============================================
-- ENABLE RLS on all tables
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_chat_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_modals ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- REALTIME subscriptions
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_status;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE internal_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE lesson_sessions;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Schema created successfully!' as status;
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
