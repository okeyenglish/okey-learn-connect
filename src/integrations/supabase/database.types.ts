/**
 * Кастомные типы базы данных для self-hosted Supabase (api.academyos.ru)
 * 
 * Этот файл содержит типы таблиц, которые не синхронизируются автоматически
 * с Lovable Cloud, поскольку проект использует внешний self-hosted Supabase.
 * 
 * ВАЖНО: При изменении схемы БД обновите типы в этом файле вручную.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum для ролей пользователей
export type AppRole = 'admin' | 'moderator' | 'user' | 'teacher' | 'manager' | 'owner' | 'branch_manager' | 'methodist' | 'head_teacher' | 'sales_manager' | 'marketing_manager' | 'accountant' | 'receptionist' | 'support' | 'student';

// ============ Основные таблицы ============

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  branch: string | null;
  organization_id: string | null;
  // SIP настройки
  extension_number: string | null;
  sip_domain: string | null;
  sip_password: string | null;
  sip_ws_url: string | null;
  sip_transport: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Teacher {
  id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  branch: string | null;
  subjects: string[] | null;
  categories: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type StudentStatus = 'active' | 'archived' | 'expelled' | 'graduated' | 'inactive' | 'not_started' | 'on_pause' | 'trial';

export interface Student {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  email: string | null;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  branch: string | null;
  organization_id: string | null;
  family_group_id: string | null;
  external_id: string | null;
  status: StudentStatus;
  age?: number | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | null;
  avatar_url?: string | null;
  lk_email?: string | null;
  lk_enabled?: boolean | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  messenger_type: string | null;
  messenger_id: string | null;
  salebot_client_id: string | null;
  organization_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  client_id: string;
  content: string | null;
  is_outgoing: boolean;
  message_type: string | null;
  media_url: string | null;
  external_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TeacherBBBRoom {
  id: string;
  teacher_id: string | null;
  teacher_name: string;
  meeting_id: string;
  attendee_password: string | null;
  moderator_password: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationBranch {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface BranchPhoto {
  id: string;
  branch_id: string;
  organization_id: string | null;
  photo_url: string;
  alt_text: string | null;
  sort_order: number;
  is_main: boolean;
  created_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_group_id: string;
  client_id: string | null;
  student_id: string | null;
  relationship: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string | null;
  notes: string | null;
  organization_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  thread_type: string;
  content: string;
  role: string;
  created_at: string;
}

export interface IndividualLessonSession {
  id: string;
  student_id: string;
  teacher_id: string | null;
  individual_lesson_id?: string | null;
  lesson_date: string;
  start_time: string | null;
  end_time: string | null;
  duration?: number | null;
  paid_minutes?: number | null;
  status: string | null;
  notes: string | null;
  payment_id?: string | null;
  is_additional?: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentLessonSession {
  id: string;
  student_id: string;
  group_session_id: string | null;
  attendance_status: string | null;
  notes: string | null;
  created_at: string;
}

export interface KwCluster {
  id: string;
  name?: string;
  organization_id: string;
  head_term: string;
  slug: string;
  intent?: string;
  members?: string[];
  score?: number;
  status?: string;
  created_at: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  route?: string;
  organization_id: string;
  status: string | null;
  created_at: string;
}

export interface ContentDoc {
  id: string;
  title?: string;
  organization_id: string;
  content_idea_id?: string;
  content_ideas?: { title: string; route: string };
  version?: number;
  word_count?: number;
  status: string | null;
  published_at?: string | null;
  created_at: string;
}

export interface KwNorm {
  id: string;
  keyword?: string;
  phrase: string;
  organization_id: string;
  region?: string;
  monthly_searches?: number;
  difficulty?: number;
  intent?: string;
  created_at: string;
}

export interface SeoPage {
  id: string;
  organization_id: string;
  url: string;
  title?: string;
  analysis?: Json;
  last_analyzed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Classroom {
  id: string;
  name: string;
  branch: string | null;
  capacity: number;
  is_online: boolean;
  is_active: boolean;
  organization_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface TeacherSubstitution {
  id: string;
  original_teacher_id: string;
  substitute_teacher_id: string | null;
  lesson_session_id: string | null;
  individual_lesson_session_id?: string | null;
  substitution_date: string;
  reason?: string;
  notes?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface ClientPhoneNumber {
  id: string;
  client_id: string;
  phone: string;
  phone_type?: string | null;
  is_primary: boolean;
  is_whatsapp_enabled?: boolean;
  is_telegram_enabled?: boolean;
  whatsapp_chat_id?: string | null;
  telegram_chat_id?: string | null;
  telegram_user_id?: number | null;
  max_chat_id?: string | null;
  max_user_id?: number | null;
  whatsapp_avatar_url?: string | null;
  telegram_avatar_url?: string | null;
  max_avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  old_value: Json | null;
  new_value: Json | null;
  changed_by: string | null;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_type: string;
  payload: Json | null;
  response: Json | null;
  status: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CallLog {
  id: string;
  client_id: string | null;
  phone_number: string;
  direction: string;
  status: string;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  notes: string | null;
  created_at: string;
}

export interface PendingGPTResponse {
  id: string;
  client_id: string;
  suggested_response?: string | null;
  messages_context?: string | null;
  status: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at: string;
}

export interface StudentCourse {
  id: string;
  student_id: string;
  course_name: string;
  payment_amount: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  client_id: string | null;
  student_id: string | null;
  group_id?: string | null;
  amount: number;
  status: string;
  description: string | null;
  payment_method: string | null;
  method?: string | null;
  payment_date?: string | null;
  lessons_count?: number | null;
  created_at: string;
  updated_at: string;
}

// ============ Дополнительные таблицы ============

export interface WhatsAppSession {
  id: string;
  session_id: string;
  status: string;
  qr_code?: string | null;
  organization_id: string | null;
  branch?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SearchConsoleQuery {
  id: string;
  organization_id: string;
  query: string;
  position?: number | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  date?: string | null;
  created_at: string;
}

export interface TeacherEarning {
  id: string;
  teacher_id: string;
  session_id?: string | null;
  individual_session_id?: string | null;
  amount: number;
  status: string;
  paid_at?: string | null;
  created_at: string;
}

export interface TeacherRate {
  id: string;
  teacher_id: string;
  rate_type: string;
  amount: number;
  subject?: string | null;
  level?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BalanceTransaction {
  id: string;
  student_id?: string | null;
  family_group_id?: string | null;
  amount: number;
  transaction_type: string;
  description?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface FamilyLedger {
  id: string;
  family_group_id: string;
  balance: number;
  updated_at: string;
}

export interface FamilyLedgerTransaction {
  id: string;
  family_group_id: string;
  amount: number;
  transaction_type: string;
  description?: string | null;
  reference_id?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface TypingStatus {
  id: string;
  user_id: string;
  client_id: string;
  is_typing: boolean;
  updated_at: string;
}

export interface MessageReadStatus {
  id: string;
  message_id: string;
  user_id: string;
  user_name?: string | null;
  read_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  user_type: string;
  emoji: string;
  created_at: string;
}

export interface ClientBranch {
  id: string;
  client_id: string;
  branch: string;
  created_at: string;
}

export interface CourseUnit {
  id: string;
  course_id: string;
  unit_number: number;
  title: string;
  description?: string | null;
  vocabulary?: string | null;
  grammar?: string | null;
  lessons_count: number;
  sort_order: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  unit_id: string;
  lesson_number: number;
  title: string;
  description?: string | null;
  objectives?: string | null;
  lesson_structure?: string | null;
  homework?: string | null;
  duration_minutes?: number | null;
  sort_order: number;
  materials?: Json | string | null;
  created_at: string;
  updated_at?: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: Json;
  user_agent?: string | null;
  created_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission: string;
  granted_by?: string | null;
  created_at: string;
}

export interface EventOutbox {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Json;
  status: string;
  organization_id?: string | null;
  processed_at?: string | null;
  created_at: string;
}

export interface LearningGroup {
  id: string;
  name: string;
  subject?: string | null;
  level?: string | null;
  branch?: string | null;
  category?: string | null;
  group_type?: string | null;
  status?: string | null;
  responsible_teacher: string | null;
  current_students: number | null;
  capacity: number | null;
  academic_hours?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  schedule_days?: string[] | null;
  schedule_time?: string | null;
  schedule_room?: string | null;
  course_id?: string | null;
  course_name?: string | null;
  debt_count?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonSession {
  id: string;
  group_id?: string | null;
  learning_group_id: string | null;
  course_lesson_id?: string | null;
  teacher_name: string | null;
  branch?: string | null;
  lesson_date: string;
  day_of_week?: string | null;
  start_time: string | null;
  end_time: string | null;
  classroom: string | null;
  status: string | null;
  notes?: string | null;
  paid_minutes?: number | null;
  payment_id?: string | null;
  payment_date?: string | null;
  payment_amount?: number | null;
  lessons_count?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface CronJobLog {
  id: string;
  job_name: string;
  executed_at: string;
  status: string;
  response_data: Json | null;
  error_message: string | null;
  execution_time_ms: number | null;
}

export interface StudentBalance {
  id: string;
  student_id: string;
  balance: number;
  currency?: string;
  updated_at: string;
  created_at?: string;
}

export interface GlobalEntityMapping {
  id: string;
  entity_type: string;
  local_id: string;
  external_id: string;
  source: string;
  organization_id: string | null;
  created_at: string;
}

export interface LeadSource {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface LeadStatus {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface GroupStudent {
  id: string;
  group_id: string;
  student_id: string;
  status: string;
  enrollment_type: string | null;
  enrollment_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface IndividualLesson {
  id: string;
  student_id: string;
  student_name?: string | null;
  teacher_id: string | null;
  teacher_name?: string | null;
  subject: string | null;
  level?: string | null;
  branch?: string | null;
  lesson_location?: string | null;
  duration?: number | null;
  price_per_lesson?: number | null;
  academic_hours_per_day?: number | null;
  schedule_time?: string | null;
  schedule_days?: string[] | null;
  period_start?: string | null;
  period_end?: string | null;
  schedule?: Json | null;
  status?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  slug?: string | null;
  title?: string | null;
  name: string;
  description: string | null;
  price: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface IndividualLessonHistory {
  id: string;
  lesson_id: string;
  changed_at: string;
  changed_by: string | null;
  change_type: string;
  changes: Json;
  applied_from_date?: string | null;
  applied_to_date?: string | null;
  notes?: string | null;
}

export interface Homework {
  id: string;
  lesson_session_id?: string | null;
  group_id?: string | null;
  assignment: string;
  description?: string | null;
  due_date: string;
  show_in_student_portal: boolean;
  created_at: string;
  updated_at?: string;
}

export interface StudentHomework {
  id: string;
  homework_id: string;
  student_id: string;
  status: string;
  submitted_at?: string | null;
  grade?: number | null;
  teacher_notes?: string | null;
  created_at: string;
}

export interface AssistantThread {
  id: string;
  owner_id: string;
  title?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface TeacherBranch {
  id: string;
  teacher_id: string;
  branch_id: string;
  organization_branches?: OrganizationBranch;
  created_at: string;
}

export interface ChatThread {
  id: string;
  name: string;
  organization_id?: string | null;
  type?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface HomeworkTemplate {
  id: string;
  name: string;
  content: string;
  subject?: string | null;
  level?: string | null;
  created_at: string;
}

export interface AIProviderKeyPublic {
  id: string;
  provider: string;
  masked_key: string;
  is_active: boolean;
  created_at: string;
}

export interface AIKeyProvisionJob {
  id: string;
  user_id: string;
  provider: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface App {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  status: string;
  published_at?: string | null;
  organization_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  lesson_session_id?: string | null;
  individual_lesson_session_id?: string | null;
  status: string;
  notes?: string | null;
  marked_by?: string | null;
  marked_at: string;
  created_at: string;
}

export interface ChatState {
  id: string;
  user_id: string;
  chat_id: string;
  is_pinned: boolean;
  is_archived: boolean;
  is_unread: boolean;
  created_at: string;
  updated_at?: string;
}

export interface StudentSegment {
  id: string;
  student_id: string;
  segment_id: string;
  created_at: string;
}

export interface Segment {
  id: string;
  name: string;
  description?: string | null;
  organization_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Textbook {
  id: string;
  title: string;
  description?: string | null;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  program_type?: string | null;
  category?: string | null;
  subcategory?: string | null;
  uploaded_by?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  client_id?: string | null;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  due_date?: string | null;
  due_time?: string | null;
  responsible?: string | null;
  goal?: string | null;
  method?: string | null;
  direction?: string | null;
  branch?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation
  clients?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
}

export interface TuitionCharge {
  id: string;
  student_id: string;
  learning_unit_type: string;
  learning_unit_id: string;
  amount: number;
  currency: string;
  academic_hours: number;
  charge_date: string;
  description?: string | null;
  status: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTuitionLink {
  id: string;
  payment_id: string;
  tuition_charge_id: string;
  amount: number;
  created_at: string;
}

export interface MessengerSettings {
  id: string;
  organization_id?: string | null;
  messenger_type: string;
  provider?: string | null;
  is_enabled: boolean;
  settings?: Json | null;
  webhook_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlobalChatReadStatus {
  id?: string;
  chat_id: string;
  last_read_at: string;
  last_read_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentHistory {
  id: string;
  student_id: string;
  event_type: string;
  event_category: string;
  title: string;
  description?: string | null;
  old_value?: Json | null;
  new_value?: Json | null;
  changed_by?: string | null;
  created_at: string;
}

export interface PinnedModalDB {
  id?: string;
  user_id: string;
  modal_id: string;
  modal_type: string;
  title: string;
  props?: Json | null;
  is_open?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SLAMetric {
  id: string;
  metric_type: 'lead_first_touch' | 'attendance_submission' | 'payment_reminder';
  entity_id: string;
  entity_type: string;
  target_time: string;
  actual_time: string | null;
  is_met: boolean | null;
  sla_threshold_minutes: number;
  delay_minutes: number | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface SLADashboard {
  organization_id: string;
  metric_type: string;
  total_metrics: number;
  met_count: number;
  missed_count: number;
  avg_delay_minutes: number;
  sla_percentage: number;
  date: string;
}

export interface StudentOperationLog {
  id: string;
  student_id: string;
  operation_type: 
    | 'created' 
    | 'updated' 
    | 'status_changed' 
    | 'enrolled_to_group' 
    | 'expelled_from_group' 
    | 'transferred' 
    | 'archived' 
    | 'restored'
    | 'payment_added'
    | 'lk_access_granted'
    | 'lk_access_revoked';
  old_value: Json | null;
  new_value: Json | null;
  notes: string | null;
  performed_by: string | null;
  performed_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  subscription_type: 'per_lesson' | 'monthly' | 'weekly';
  lessons_count?: number | null;
  duration_days?: number | null;
  price: number;
  price_per_lesson?: number | null;
  is_active?: boolean | null;
  freeze_days_allowed?: number | null;
  branch?: string | null;
  subject?: string | null;
  age_category?: 'preschool' | 'school' | 'adult' | 'all' | null;
  auto_renewal?: boolean | null;
  makeup_lessons_count?: number | null;
  max_level?: string | null;
  min_level?: string | null;
  sort_order?: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationAISettings {
  organization_id: string;
  organization_name: string;
  subscription_tier: 'free' | 'paid';
  ai_limit: number;
  key_type: 'free' | 'byok' | null;
  limit_remaining: number | null;
  limit_monthly: number | null;
  key_status: string | null;
}

export interface Schedule {
  id: string;
  name: string;
  office_name: string;
  level: string;
  compact_days: string;
  compact_time: string;
  compact_classroom: string;
  compact_teacher: string;
  vacancies: number;
  group_URL?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============ RPC функции ============

export interface GetPublicScheduleResult {
  id: string;
  name: string;
  office_name: string | null;
  level: string | null;
  compact_days: string | null;
  compact_time: string | null;
  compact_classroom: string | null;
  compact_teacher: string | null;
  vacancies: number | null;
  group_URL: string | null;
}

// ============ Database interface для Supabase ============

export interface CustomDatabase {
  // Required for Supabase SDK compatibility
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'id' | 'created_at'>;
        Update: Partial<UserRole>;
      };
      teachers: {
        Row: Teacher;
        Insert: Partial<Teacher>;
        Update: Partial<Teacher>;
      };
      students: {
        Row: Student;
        Insert: Partial<Student>;
        Update: Partial<Student>;
      };
      clients: {
        Row: Client;
        Insert: Partial<Client>;
        Update: Partial<Client>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Partial<ChatMessage>;
        Update: Partial<ChatMessage>;
      };
      faq: {
        Row: FAQ;
        Insert: Partial<FAQ>;
        Update: Partial<FAQ>;
      };
      teacher_bbb_rooms: {
        Row: TeacherBBBRoom;
        Insert: Partial<TeacherBBBRoom>;
        Update: Partial<TeacherBBBRoom>;
      };
      organization_branches: {
        Row: OrganizationBranch;
        Insert: Partial<OrganizationBranch>;
        Update: Partial<OrganizationBranch>;
      };
      branch_photos: {
        Row: BranchPhoto;
        Insert: Partial<BranchPhoto>;
        Update: Partial<BranchPhoto>;
      };
      family_groups: {
        Row: FamilyGroup;
        Insert: Partial<FamilyGroup>;
        Update: Partial<FamilyGroup>;
      };
      family_members: {
        Row: FamilyMember;
        Insert: Partial<FamilyMember>;
        Update: Partial<FamilyMember>;
      };
      leads: {
        Row: Lead;
        Insert: Partial<Lead>;
        Update: Partial<Lead>;
      };
      messages: {
        Row: Message;
        Insert: Partial<Message>;
        Update: Partial<Message>;
      };
      individual_lesson_sessions: {
        Row: IndividualLessonSession;
        Insert: Partial<IndividualLessonSession>;
        Update: Partial<IndividualLessonSession>;
      };
      student_lesson_sessions: {
        Row: StudentLessonSession;
        Insert: Partial<StudentLessonSession>;
        Update: Partial<StudentLessonSession>;
      };
      kw_clusters: {
        Row: KwCluster;
        Insert: Partial<KwCluster>;
        Update: Partial<KwCluster>;
      };
      content_ideas: {
        Row: ContentIdea;
        Insert: Partial<ContentIdea>;
        Update: Partial<ContentIdea>;
      };
      content_docs: {
        Row: ContentDoc;
        Insert: Partial<ContentDoc>;
        Update: Partial<ContentDoc>;
      };
      kw_norm: {
        Row: KwNorm;
        Insert: Partial<KwNorm>;
        Update: Partial<KwNorm>;
      };
      seo_pages: {
        Row: SeoPage;
        Insert: Partial<SeoPage>;
        Update: Partial<SeoPage>;
      };
      classrooms: {
        Row: Classroom;
        Insert: Partial<Classroom>;
        Update: Partial<Classroom>;
      };
      teacher_substitutions: {
        Row: TeacherSubstitution;
        Insert: Partial<TeacherSubstitution>;
        Update: Partial<TeacherSubstitution>;
      };
      client_phone_numbers: {
        Row: ClientPhoneNumber;
        Insert: Partial<ClientPhoneNumber>;
        Update: Partial<ClientPhoneNumber>;
      };
      global_entity_mappings: {
        Row: GlobalEntityMapping;
        Insert: Partial<GlobalEntityMapping>;
        Update: Partial<GlobalEntityMapping>;
      };
      audit_log: {
        Row: AuditLog;
        Insert: Partial<AuditLog>;
        Update: Partial<AuditLog>;
      };
      webhook_logs: {
        Row: WebhookLog;
        Insert: Partial<WebhookLog>;
        Update: Partial<WebhookLog>;
      };
      call_logs: {
        Row: CallLog;
        Insert: Partial<CallLog>;
        Update: Partial<CallLog>;
      };
      pending_gpt_responses: {
        Row: PendingGPTResponse;
        Insert: Partial<PendingGPTResponse>;
        Update: Partial<PendingGPTResponse>;
      };
      student_courses: {
        Row: StudentCourse;
        Insert: Partial<StudentCourse>;
        Update: Partial<StudentCourse>;
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment>;
        Update: Partial<Payment>;
      };
      learning_groups: {
        Row: LearningGroup;
        Insert: Partial<LearningGroup>;
        Update: Partial<LearningGroup>;
      };
      lesson_sessions: {
        Row: LessonSession;
        Insert: Partial<LessonSession>;
        Update: Partial<LessonSession>;
      };
      cron_job_logs: {
        Row: CronJobLog;
        Insert: Partial<CronJobLog>;
        Update: Partial<CronJobLog>;
      };
      student_balances: {
        Row: StudentBalance;
        Insert: Partial<StudentBalance>;
        Update: Partial<StudentBalance>;
      };
      lead_sources: {
        Row: LeadSource;
        Insert: Partial<LeadSource>;
        Update: Partial<LeadSource>;
      };
      lead_statuses: {
        Row: LeadStatus;
        Insert: Partial<LeadStatus>;
        Update: Partial<LeadStatus>;
      };
      group_students: {
        Row: GroupStudent;
        Insert: Partial<GroupStudent>;
        Update: Partial<GroupStudent>;
      };
      individual_lessons: {
        Row: IndividualLesson;
        Insert: Partial<IndividualLesson>;
        Update: Partial<IndividualLesson>;
      };
      courses: {
        Row: Course;
        Insert: Partial<Course>;
        Update: Partial<Course>;
      };
      organizations: {
        Row: Organization;
        Insert: Partial<Organization>;
        Update: Partial<Organization>;
      };
      individual_lesson_history: {
        Row: IndividualLessonHistory;
        Insert: Partial<IndividualLessonHistory>;
        Update: Partial<IndividualLessonHistory>;
      };
      homework: {
        Row: Homework;
        Insert: Partial<Homework>;
        Update: Partial<Homework>;
      };
      student_homework: {
        Row: StudentHomework;
        Insert: Partial<StudentHomework>;
        Update: Partial<StudentHomework>;
      };
      assistant_threads: {
        Row: AssistantThread;
        Insert: Partial<AssistantThread>;
        Update: Partial<AssistantThread>;
      };
      teacher_branches: {
        Row: TeacherBranch;
        Insert: Partial<TeacherBranch>;
        Update: Partial<TeacherBranch>;
      };
      chat_threads: {
        Row: ChatThread;
        Insert: Partial<ChatThread>;
        Update: Partial<ChatThread>;
      };
      homework_templates: {
        Row: HomeworkTemplate;
        Insert: Partial<HomeworkTemplate>;
        Update: Partial<HomeworkTemplate>;
      };
      v_ai_provider_keys_public: {
        Row: AIProviderKeyPublic;
        Insert: Partial<AIProviderKeyPublic>;
        Update: Partial<AIProviderKeyPublic>;
      };
      ai_key_provision_jobs: {
        Row: AIKeyProvisionJob;
        Insert: Partial<AIKeyProvisionJob>;
        Update: Partial<AIKeyProvisionJob>;
      };
      apps: {
        Row: App;
        Insert: Partial<App>;
        Update: Partial<App>;
      };
      student_attendance: {
        Row: StudentAttendance;
        Insert: Partial<StudentAttendance>;
        Update: Partial<StudentAttendance>;
      };
      chat_states: {
        Row: ChatState;
        Insert: Partial<ChatState>;
        Update: Partial<ChatState>;
      };
      student_segments: {
        Row: StudentSegment;
        Insert: Partial<StudentSegment>;
        Update: Partial<StudentSegment>;
      };
      segments: {
        Row: Segment;
        Insert: Partial<Segment>;
        Update: Partial<Segment>;
      };
      // Новые таблицы
      whatsapp_sessions: {
        Row: WhatsAppSession;
        Insert: Partial<WhatsAppSession>;
        Update: Partial<WhatsAppSession>;
      };
      search_console_queries: {
        Row: SearchConsoleQuery;
        Insert: Partial<SearchConsoleQuery>;
        Update: Partial<SearchConsoleQuery>;
      };
      teacher_earnings: {
        Row: TeacherEarning;
        Insert: Partial<TeacherEarning>;
        Update: Partial<TeacherEarning>;
      };
      teacher_rates: {
        Row: TeacherRate;
        Insert: Partial<TeacherRate>;
        Update: Partial<TeacherRate>;
      };
      balance_transactions: {
        Row: BalanceTransaction;
        Insert: Partial<BalanceTransaction>;
        Update: Partial<BalanceTransaction>;
      };
      family_ledger: {
        Row: FamilyLedger;
        Insert: Partial<FamilyLedger>;
        Update: Partial<FamilyLedger>;
      };
      family_ledger_transactions: {
        Row: FamilyLedgerTransaction;
        Insert: Partial<FamilyLedgerTransaction>;
        Update: Partial<FamilyLedgerTransaction>;
      };
      typing_status: {
        Row: TypingStatus;
        Insert: Partial<TypingStatus>;
        Update: Partial<TypingStatus>;
      };
      message_read_status: {
        Row: MessageReadStatus;
        Insert: Partial<MessageReadStatus>;
        Update: Partial<MessageReadStatus>;
      };
      message_reactions: {
        Row: MessageReaction;
        Insert: Partial<MessageReaction>;
        Update: Partial<MessageReaction>;
      };
      client_branches: {
        Row: ClientBranch;
        Insert: Partial<ClientBranch>;
        Update: Partial<ClientBranch>;
      };
      course_units: {
        Row: CourseUnit;
        Insert: Partial<CourseUnit>;
        Update: Partial<CourseUnit>;
      };
      lessons: {
        Row: Lesson;
        Insert: Partial<Lesson>;
        Update: Partial<Lesson>;
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: Partial<PushSubscription>;
        Update: Partial<PushSubscription>;
      };
      user_permissions: {
        Row: UserPermission;
        Insert: Partial<UserPermission>;
        Update: Partial<UserPermission>;
      };
      event_outbox: {
        Row: EventOutbox;
        Insert: Partial<EventOutbox>;
        Update: Partial<EventOutbox>;
      };
      textbooks: {
        Row: Textbook;
        Insert: Partial<Textbook>;
        Update: Partial<Textbook>;
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task>;
        Update: Partial<Task>;
      };
      tuition_charges: {
        Row: TuitionCharge;
        Insert: Partial<TuitionCharge>;
        Update: Partial<TuitionCharge>;
      };
      payment_tuition_link: {
        Row: PaymentTuitionLink;
        Insert: Partial<PaymentTuitionLink>;
        Update: Partial<PaymentTuitionLink>;
      };
      messenger_settings: {
        Row: MessengerSettings;
        Insert: Partial<MessengerSettings>;
        Update: Partial<MessengerSettings>;
      };
      global_chat_read_status: {
        Row: GlobalChatReadStatus;
        Insert: Partial<GlobalChatReadStatus>;
        Update: Partial<GlobalChatReadStatus>;
      };
      student_history: {
        Row: StudentHistory;
        Insert: Partial<StudentHistory>;
        Update: Partial<StudentHistory>;
      };
      pinned_modals: {
        Row: PinnedModalDB;
        Insert: Partial<PinnedModalDB>;
        Update: Partial<PinnedModalDB>;
      };
      sla_metrics: {
        Row: SLAMetric;
        Insert: Partial<SLAMetric>;
        Update: Partial<SLAMetric>;
      };
      mv_sla_dashboard: {
        Row: SLADashboard;
        Insert: never;
        Update: never;
      };
      student_operation_logs: {
        Row: StudentOperationLog;
        Insert: Partial<StudentOperationLog>;
        Update: Partial<StudentOperationLog>;
      };
      subscription_plans: {
        Row: SubscriptionPlan;
        Insert: Partial<SubscriptionPlan>;
        Update: Partial<SubscriptionPlan>;
      };
      v_organization_ai_settings: {
        Row: OrganizationAISettings;
        Insert: never;
        Update: never;
      };
      schedule: {
        Row: Schedule;
        Insert: Partial<Schedule>;
        Update: Partial<Schedule>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_public_schedule: {
        Args: { branch_name: string | null };
        Returns: GetPublicScheduleResult[];
      };
      get_user_role: {
        Args: { _user_id: string };
        Returns: string | null;
      };
      get_user_roles: {
        Args: { _user_id: string };
        Returns: string[];
      };
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
      get_message_read_status: {
        Args: { p_message_id: string };
        Returns: MessageReadStatus[];
      };
      mark_message_as_read: {
        Args: { p_message_id: string };
        Returns: void;
      };
      mark_chat_messages_as_read: {
        Args: { p_client_id: string };
        Returns: void;
      };
      mark_chat_messages_as_read_by_messenger: {
        Args: { p_client_id: string; p_messenger_type: string };
        Returns: void;
      };
      unified_crm_search: {
        Args: { p_org_id: string; p_query: string; p_limit?: number };
        Returns: Json;
      };
      fast_search_clients: {
        Args: { p_query: string; p_limit?: number };
        Returns: Json;
      };
      get_family_data_optimized: {
        Args: { p_family_group_id: string };
        Returns: Json;
      };
      bulk_charge_tuition: {
        Args: { p_filters: Json; p_amount: number; p_description?: string };
        Returns: Json;
      };
      bulk_generate_invoices: {
        Args: { p_filters: Json; p_due_days?: number };
        Returns: Json;
      };
      topup_organization_balance: {
        Args: { p_organization_id: string; p_amount: number; p_description?: string };
        Returns: Json;
      };
      manual_compensate_payment: {
        Args: { p_payment_id: string; p_reason?: string };
        Returns: Json;
      };
      check_group_permission: {
        Args: { p_user_id: string; p_group_id: string; p_permission: string };
        Returns: boolean;
      };
      publish_event: {
        Args: { p_event_type: string; p_aggregate_type: string; p_aggregate_id: string; p_payload: Json; p_organization_id?: string };
        Returns: string;
      };
      process_pending_events: {
        Args: { p_limit?: number };
        Returns: number;
      };
      refresh_all_materialized_views: {
        Args: Record<string, never>;
        Returns: void;
      };
      get_campaign_recipients: {
        Args: { p_campaign_id: string };
        Returns: Json;
      };
      get_user_permissions: {
        Args: { _user_id: string };
        Returns: Record<string, boolean>;
      };
      count_clients_without_imported_messages: {
        Args: { p_org_id: string };
        Returns: number;
      };
      // Teacher chat RPC functions
      get_teacher_chat_messages: {
        Args: { p_client_id: string };
        Returns: Json[];
      };
      get_teacher_unread_counts: {
        Args: Record<string, never>;
        Returns: { teacher_id: string; client_id: string | null; unread_count: number; last_message_time: string | null; last_message_text: string | null; last_messenger_type: string | null }[];
      };
      // Balance RPC functions
      add_balance_transaction: {
        Args: { _student_id: string; _amount: number; _transaction_type: string; _description: string; _payment_id?: string | null; _lesson_session_id?: string | null };
        Returns: void;
      };
      get_student_balance: {
        Args: { _student_id: string };
        Returns: number;
      };
      // Pin counts
      get_chat_pin_counts: {
        Args: { _chat_ids: string[] };
        Returns: { chat_id: string; pin_count: number }[];
      };
      // Teacher salary stats
      get_teacher_salary_stats: {
        Args: { p_teacher_id: string; p_period_start?: string; p_period_end?: string };
        Returns: { total_amount: number; total_hours: number; total_lessons: number; group_lessons: number; individual_lessons: number; paid_amount: number; unpaid_amount: number }[];
      };
      // SLA functions
      record_sla_metric: {
        Args: { p_metric_type: string; p_entity_id: string; p_entity_type: string; p_target_time: string; p_actual_time: string; p_threshold_minutes: number; p_organization_id: string };
        Returns: string;
      };
      refresh_advanced_materialized_views: {
        Args: Record<string, never>;
        Returns: void;
      };
      // Student by user id
      get_student_by_user_id: {
        Args: { _user_id: string };
        Returns: Student | null;
      };
      // Sheets RPC functions
      get_sheets: {
        Args: Record<string, never>;
        Returns: { id: string; name: string; slug: string; table_name: string; created_at: string }[];
      };
      get_sheet_columns: {
        Args: { p_sheet_id: string };
        Returns: { name: string; data_type: string; is_required: boolean; position: number }[];
      };
      get_sheet_data: {
        Args: { p_table_name: string };
        Returns: Json[];
      };
      update_sheet_cell: {
        Args: { p_table_name: string; p_row_id: string; p_column: string; p_value: string };
        Returns: void;
      };
      add_sheet_row: {
        Args: { p_table_name: string };
        Returns: Json[];
      };
      delete_sheet_rows: {
        Args: { p_table_name: string; p_row_ids: string[] };
        Returns: void;
      };
      import_sheet_rows: {
        Args: { p_table_name: string; p_rows: Json[] };
        Returns: Json[];
      };
      create_sheet: {
        Args: { p_name: string; p_slug: string; p_columns: Json[] };
        Returns: void;
      };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Экспортируем тип для использования в клиенте
export type { CustomDatabase as Database };
