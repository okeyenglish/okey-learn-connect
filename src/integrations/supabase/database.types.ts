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
export type AppRole = 'admin' | 'moderator' | 'user' | 'teacher' | 'manager' | 'owner' | 'branch_manager' | 'methodist' | 'head_teacher' | 'sales_manager' | 'marketing_manager' | 'accountant' | 'receptionist' | 'support' | 'student' | 'parent';

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

export interface StudentParent {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  relationship: 'parent' | 'mother' | 'father' | 'guardian' | 'other';
  phone?: string | null;
  email?: string | null;
  is_primary_contact: boolean;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  created_at: string;
  updated_at: string;
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
  organization_id?: string | null;
  teacher_id?: string | null;
  key_preview?: string | null;
  limit_remaining?: number | null;
  status: string;
  masked_key: string;
  is_active: boolean;
  created_at: string;
}

export interface AIProviderKey {
  id: string;
  provider: string;
  organization_id?: string | null;
  teacher_id?: string | null;
  key_value: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface AIKeyProvisionJob {
  id: string;
  organization_id?: string | null;
  teacher_id?: string | null;
  entity_name?: string | null;
  provider: string;
  monthly_limit?: number | null;
  reset_policy?: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface InternalLinkGraph {
  id: string;
  from_route: string;
  to_route: string;
  anchor: string;
  link_type: string;
  strength?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  route?: string | null;
  organization_id: string;
  status: string | null;
  branch?: string | null;
  idea_type?: string | null;
  meta?: Json | null;
  created_at: string;
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

export interface PaymentNotification {
  id: string;
  student_id?: string | null;
  notification_type: string;
  notification_date: string;
  is_sent: boolean;
  sent_at?: string | null;
  message?: string | null;
  created_at: string;
  updated_at?: string;
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

// Teacher floating rates
export interface TeacherFloatingRate {
  id: string;
  rate_id: string;
  student_count: number;
  rate_amount: number;
  created_at: string;
  updated_at: string;
}

// Student tags
export interface StudentTag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentTagAssignment {
  id: string;
  student_id: string;
  tag_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

// Teacher salary accruals
export interface TeacherSalaryAccrual {
  id: string;
  teacher_id: string;
  lesson_session_id?: string | null;
  individual_lesson_session_id?: string | null;
  earning_date: string;
  amount: number;
  academic_hours: number;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

// AI Model Mappings
export interface AIModelMapping {
  id: string;
  tier: string;
  use_case: string;
  model_id: string;
  is_active: boolean;
  created_at: string;
}

// Role permissions
export interface RolePermission {
  id: string;
  role: AppRole;
  permission: string;
  resource: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  created_at?: string;
}

// Discount/Surcharge system
export interface DiscountSurcharge {
  id: string;
  name: string;
  type: 'discount' | 'surcharge';
  value_type: 'fixed' | 'percent';
  value: number;
  description?: string | null;
  is_permanent: boolean;
  is_active: boolean;
  auto_apply: boolean;
  apply_priority: number;
  created_at: string;
  updated_at: string;
}

export interface StudentDiscountSurcharge {
  id: string;
  student_id: string;
  discount_surcharge_id: string;
  is_permanent: boolean;
  times_used: number;
  max_uses?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
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
        Relationships: [
          { foreignKeyName: "profiles_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'id' | 'created_at'>;
        Update: Partial<UserRole>;
        Relationships: [];
      };
      teachers: {
        Row: Teacher;
        Insert: Partial<Teacher>;
        Update: Partial<Teacher>;
        Relationships: [
          { foreignKeyName: "teachers_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      students: {
        Row: Student;
        Insert: Partial<Student>;
        Update: Partial<Student>;
        Relationships: [
          { foreignKeyName: "students_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "students_family_group_id_fkey"; columns: ["family_group_id"]; isOneToOne: false; referencedRelation: "family_groups"; referencedColumns: ["id"] }
        ];
      };
      clients: {
        Row: Client;
        Insert: Partial<Client>;
        Update: Partial<Client>;
        Relationships: [
          { foreignKeyName: "clients_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Partial<ChatMessage>;
        Update: Partial<ChatMessage>;
        Relationships: [
          { foreignKeyName: "chat_messages_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }
        ];
      };
      faq: {
        Row: FAQ;
        Insert: Partial<FAQ>;
        Update: Partial<FAQ>;
        Relationships: [];
      };
      teacher_bbb_rooms: {
        Row: TeacherBBBRoom;
        Insert: Partial<TeacherBBBRoom>;
        Update: Partial<TeacherBBBRoom>;
        Relationships: [
          { foreignKeyName: "teacher_bbb_rooms_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] }
        ];
      };
      organization_branches: {
        Row: OrganizationBranch;
        Insert: Partial<OrganizationBranch>;
        Update: Partial<OrganizationBranch>;
        Relationships: [
          { foreignKeyName: "organization_branches_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      branch_photos: {
        Row: BranchPhoto;
        Insert: Partial<BranchPhoto>;
        Update: Partial<BranchPhoto>;
        Relationships: [
          { foreignKeyName: "branch_photos_branch_id_fkey"; columns: ["branch_id"]; isOneToOne: false; referencedRelation: "organization_branches"; referencedColumns: ["id"] },
          { foreignKeyName: "branch_photos_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      family_groups: {
        Row: FamilyGroup;
        Insert: Partial<FamilyGroup>;
        Update: Partial<FamilyGroup>;
        Relationships: [
          { foreignKeyName: "family_groups_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      family_members: {
        Row: FamilyMember;
        Insert: Partial<FamilyMember>;
        Update: Partial<FamilyMember>;
        Relationships: [
          { foreignKeyName: "family_members_family_group_id_fkey"; columns: ["family_group_id"]; isOneToOne: false; referencedRelation: "family_groups"; referencedColumns: ["id"] },
          { foreignKeyName: "family_members_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "family_members_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      leads: {
        Row: Lead;
        Insert: Partial<Lead>;
        Update: Partial<Lead>;
        Relationships: [
          { foreignKeyName: "leads_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message>;
        Update: Partial<Message>;
        Relationships: [];
      };
      individual_lesson_sessions: {
        Row: IndividualLessonSession;
        Insert: Partial<IndividualLessonSession>;
        Update: Partial<IndividualLessonSession>;
        Relationships: [
          { foreignKeyName: "individual_lesson_sessions_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "individual_lesson_sessions_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] }
        ];
      };
      student_lesson_sessions: {
        Row: StudentLessonSession;
        Insert: Partial<StudentLessonSession>;
        Update: Partial<StudentLessonSession>;
        Relationships: [
          { foreignKeyName: "student_lesson_sessions_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "student_lesson_sessions_group_session_id_fkey"; columns: ["group_session_id"]; isOneToOne: false; referencedRelation: "lesson_sessions"; referencedColumns: ["id"] }
        ];
      };
      kw_clusters: {
        Row: KwCluster;
        Insert: Partial<KwCluster>;
        Update: Partial<KwCluster>;
        Relationships: [
          { foreignKeyName: "kw_clusters_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      content_ideas: {
        Row: ContentIdea;
        Insert: Partial<ContentIdea>;
        Update: Partial<ContentIdea>;
        Relationships: [
          { foreignKeyName: "content_ideas_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      content_docs: {
        Row: ContentDoc;
        Insert: Partial<ContentDoc>;
        Update: Partial<ContentDoc>;
        Relationships: [
          { foreignKeyName: "content_docs_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "content_docs_content_idea_id_fkey"; columns: ["content_idea_id"]; isOneToOne: false; referencedRelation: "content_ideas"; referencedColumns: ["id"] }
        ];
      };
      kw_norm: {
        Row: KwNorm;
        Insert: Partial<KwNorm>;
        Update: Partial<KwNorm>;
        Relationships: [
          { foreignKeyName: "kw_norm_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      seo_pages: {
        Row: SeoPage;
        Insert: Partial<SeoPage>;
        Update: Partial<SeoPage>;
        Relationships: [
          { foreignKeyName: "seo_pages_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      classrooms: {
        Row: Classroom;
        Insert: Partial<Classroom>;
        Update: Partial<Classroom>;
        Relationships: [
          { foreignKeyName: "classrooms_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      teacher_substitutions: {
        Row: TeacherSubstitution;
        Insert: Partial<TeacherSubstitution>;
        Update: Partial<TeacherSubstitution>;
        Relationships: [
          { foreignKeyName: "teacher_substitutions_original_teacher_id_fkey"; columns: ["original_teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] },
          { foreignKeyName: "teacher_substitutions_substitute_teacher_id_fkey"; columns: ["substitute_teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] },
          { foreignKeyName: "teacher_substitutions_lesson_session_id_fkey"; columns: ["lesson_session_id"]; isOneToOne: false; referencedRelation: "lesson_sessions"; referencedColumns: ["id"] }
        ];
      };
      client_phone_numbers: {
        Row: ClientPhoneNumber;
        Insert: Partial<ClientPhoneNumber>;
        Update: Partial<ClientPhoneNumber>;
        Relationships: [
          { foreignKeyName: "client_phone_numbers_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }
        ];
      };
      global_entity_mappings: {
        Row: GlobalEntityMapping;
        Insert: Partial<GlobalEntityMapping>;
        Update: Partial<GlobalEntityMapping>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLog;
        Insert: Partial<AuditLog>;
        Update: Partial<AuditLog>;
        Relationships: [];
      };
      webhook_logs: {
        Row: WebhookLog;
        Insert: Partial<WebhookLog>;
        Update: Partial<WebhookLog>;
        Relationships: [];
      };
      call_logs: {
        Row: CallLog;
        Insert: Partial<CallLog>;
        Update: Partial<CallLog>;
        Relationships: [
          { foreignKeyName: "call_logs_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }
        ];
      };
      pending_gpt_responses: {
        Row: PendingGPTResponse;
        Insert: Partial<PendingGPTResponse>;
        Update: Partial<PendingGPTResponse>;
        Relationships: [
          { foreignKeyName: "pending_gpt_responses_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }
        ];
      };
      student_courses: {
        Row: StudentCourse;
        Insert: Partial<StudentCourse>;
        Update: Partial<StudentCourse>;
        Relationships: [
          { foreignKeyName: "student_courses_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment>;
        Update: Partial<Payment>;
        Relationships: [
          { foreignKeyName: "payments_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "learning_groups"; referencedColumns: ["id"] }
        ];
      };
      learning_groups: {
        Row: LearningGroup;
        Insert: Partial<LearningGroup>;
        Update: Partial<LearningGroup>;
        Relationships: [
          { foreignKeyName: "learning_groups_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "learning_groups_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] }
        ];
      };
      lesson_sessions: {
        Row: LessonSession;
        Insert: Partial<LessonSession>;
        Update: Partial<LessonSession>;
        Relationships: [
          { foreignKeyName: "lesson_sessions_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "lesson_sessions_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "learning_groups"; referencedColumns: ["id"] },
          { foreignKeyName: "lesson_sessions_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] }
        ];
      };
      cron_job_logs: {
        Row: CronJobLog;
        Insert: Partial<CronJobLog>;
        Update: Partial<CronJobLog>;
        Relationships: [];
      };
      student_balances: {
        Row: StudentBalance;
        Insert: Partial<StudentBalance>;
        Update: Partial<StudentBalance>;
        Relationships: [
          { foreignKeyName: "student_balances_student_id_fkey"; columns: ["student_id"]; isOneToOne: true; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      lead_sources: {
        Row: LeadSource;
        Insert: Partial<LeadSource>;
        Update: Partial<LeadSource>;
        Relationships: [];
      };
      lead_statuses: {
        Row: LeadStatus;
        Insert: Partial<LeadStatus>;
        Update: Partial<LeadStatus>;
        Relationships: [];
      };
      group_students: {
        Row: GroupStudent;
        Insert: Partial<GroupStudent>;
        Update: Partial<GroupStudent>;
        Relationships: [
          { foreignKeyName: "group_students_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "learning_groups"; referencedColumns: ["id"] },
          { foreignKeyName: "group_students_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      individual_lessons: {
        Row: IndividualLesson;
        Insert: Partial<IndividualLesson>;
        Update: Partial<IndividualLesson>;
        Relationships: [
          { foreignKeyName: "individual_lessons_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "individual_lessons_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] }
        ];
      };
      courses: {
        Row: Course;
        Insert: Partial<Course>;
        Update: Partial<Course>;
        Relationships: [];
      };
      organizations: {
        Row: Organization;
        Insert: Partial<Organization>;
        Update: Partial<Organization>;
        Relationships: [];
      };
      individual_lesson_history: {
        Row: IndividualLessonHistory;
        Insert: Partial<IndividualLessonHistory>;
        Update: Partial<IndividualLessonHistory>;
        Relationships: [
          { foreignKeyName: "individual_lesson_history_lesson_id_fkey"; columns: ["lesson_id"]; isOneToOne: false; referencedRelation: "individual_lessons"; referencedColumns: ["id"] }
        ];
      };
      homework: {
        Row: Homework;
        Insert: Partial<Homework>;
        Update: Partial<Homework>;
        Relationships: [
          { foreignKeyName: "homework_lesson_session_id_fkey"; columns: ["lesson_session_id"]; isOneToOne: false; referencedRelation: "lesson_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "homework_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "learning_groups"; referencedColumns: ["id"] }
        ];
      };
      student_homework: {
        Row: StudentHomework;
        Insert: Partial<StudentHomework>;
        Update: Partial<StudentHomework>;
        Relationships: [
          { foreignKeyName: "student_homework_homework_id_fkey"; columns: ["homework_id"]; isOneToOne: false; referencedRelation: "homework"; referencedColumns: ["id"] },
          { foreignKeyName: "student_homework_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      assistant_threads: {
        Row: AssistantThread;
        Insert: Partial<AssistantThread>;
        Update: Partial<AssistantThread>;
        Relationships: [];
      };
      teacher_branches: {
        Row: TeacherBranch;
        Insert: Partial<TeacherBranch>;
        Update: Partial<TeacherBranch>;
        Relationships: [
          { foreignKeyName: "teacher_branches_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] },
          { foreignKeyName: "teacher_branches_branch_id_fkey"; columns: ["branch_id"]; isOneToOne: false; referencedRelation: "organization_branches"; referencedColumns: ["id"] }
        ];
      };
      chat_threads: {
        Row: ChatThread;
        Insert: Partial<ChatThread>;
        Update: Partial<ChatThread>;
        Relationships: [
          { foreignKeyName: "chat_threads_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      homework_templates: {
        Row: HomeworkTemplate;
        Insert: Partial<HomeworkTemplate>;
        Update: Partial<HomeworkTemplate>;
        Relationships: [];
      };
      v_ai_provider_keys_public: {
        Row: AIProviderKeyPublic;
        Insert: Partial<AIProviderKeyPublic>;
        Update: Partial<AIProviderKeyPublic>;
        Relationships: [];
      };
      ai_key_provision_jobs: {
        Row: AIKeyProvisionJob;
        Insert: Partial<AIKeyProvisionJob>;
        Update: Partial<AIKeyProvisionJob>;
        Relationships: [
          { foreignKeyName: "ai_key_provision_jobs_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      apps: {
        Row: App;
        Insert: Partial<App>;
        Update: Partial<App>;
        Relationships: [
          { foreignKeyName: "apps_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      student_attendance: {
        Row: StudentAttendance;
        Insert: Partial<StudentAttendance>;
        Update: Partial<StudentAttendance>;
        Relationships: [
          { foreignKeyName: "student_attendance_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "student_attendance_lesson_session_id_fkey"; columns: ["lesson_session_id"]; isOneToOne: false; referencedRelation: "lesson_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "student_attendance_individual_lesson_session_id_fkey"; columns: ["individual_lesson_session_id"]; isOneToOne: false; referencedRelation: "individual_lesson_sessions"; referencedColumns: ["id"] }
        ];
      };
      chat_states: {
        Row: ChatState;
        Insert: Partial<ChatState>;
        Update: Partial<ChatState>;
        Relationships: [];
      };
      student_segments: {
        Row: StudentSegment;
        Insert: Partial<StudentSegment>;
        Update: Partial<StudentSegment>;
        Relationships: [
          { foreignKeyName: "student_segments_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "student_segments_segment_id_fkey"; columns: ["segment_id"]; isOneToOne: false; referencedRelation: "segments"; referencedColumns: ["id"] }
        ];
      };
      segments: {
        Row: Segment;
        Insert: Partial<Segment>;
        Update: Partial<Segment>;
        Relationships: [
          { foreignKeyName: "segments_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      whatsapp_sessions: {
        Row: WhatsAppSession;
        Insert: Partial<WhatsAppSession>;
        Update: Partial<WhatsAppSession>;
        Relationships: [
          { foreignKeyName: "whatsapp_sessions_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      search_console_queries: {
        Row: SearchConsoleQuery;
        Insert: Partial<SearchConsoleQuery>;
        Update: Partial<SearchConsoleQuery>;
        Relationships: [
          { foreignKeyName: "search_console_queries_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      teacher_earnings: {
        Row: TeacherEarning;
        Insert: Partial<TeacherEarning>;
        Update: Partial<TeacherEarning>;
        Relationships: [
          { foreignKeyName: "teacher_earnings_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] },
          { foreignKeyName: "teacher_earnings_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "lesson_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "teacher_earnings_individual_session_id_fkey"; columns: ["individual_session_id"]; isOneToOne: false; referencedRelation: "individual_lesson_sessions"; referencedColumns: ["id"] }
        ];
      };
      teacher_rates: {
        Row: TeacherRate;
        Insert: Partial<TeacherRate>;
        Update: Partial<TeacherRate>;
        Relationships: [
          { foreignKeyName: "teacher_rates_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] }
        ];
      };
      balance_transactions: {
        Row: BalanceTransaction;
        Insert: Partial<BalanceTransaction>;
        Update: Partial<BalanceTransaction>;
        Relationships: [
          { foreignKeyName: "balance_transactions_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "balance_transactions_family_group_id_fkey"; columns: ["family_group_id"]; isOneToOne: false; referencedRelation: "family_groups"; referencedColumns: ["id"] }
        ];
      };
      family_ledger: {
        Row: FamilyLedger;
        Insert: Partial<FamilyLedger>;
        Update: Partial<FamilyLedger>;
        Relationships: [
          { foreignKeyName: "family_ledger_family_group_id_fkey"; columns: ["family_group_id"]; isOneToOne: true; referencedRelation: "family_groups"; referencedColumns: ["id"] }
        ];
      };
      family_ledger_transactions: {
        Row: FamilyLedgerTransaction;
        Insert: Partial<FamilyLedgerTransaction>;
        Update: Partial<FamilyLedgerTransaction>;
        Relationships: [
          { foreignKeyName: "family_ledger_transactions_family_group_id_fkey"; columns: ["family_group_id"]; isOneToOne: false; referencedRelation: "family_groups"; referencedColumns: ["id"] }
        ];
      };
      typing_status: {
        Row: TypingStatus;
        Insert: Partial<TypingStatus>;
        Update: Partial<TypingStatus>;
        Relationships: [
          { foreignKeyName: "typing_status_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }
        ];
      };
      message_read_status: {
        Row: MessageReadStatus;
        Insert: Partial<MessageReadStatus>;
        Update: Partial<MessageReadStatus>;
        Relationships: [];
      };
      message_reactions: {
        Row: MessageReaction;
        Insert: Partial<MessageReaction>;
        Update: Partial<MessageReaction>;
        Relationships: [];
      };
      client_branches: {
        Row: ClientBranch;
        Insert: Partial<ClientBranch>;
        Update: Partial<ClientBranch>;
        Relationships: [
          { foreignKeyName: "client_branches_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "client_branches_branch_id_fkey"; columns: ["branch_id"]; isOneToOne: false; referencedRelation: "organization_branches"; referencedColumns: ["id"] }
        ];
      };
      course_units: {
        Row: CourseUnit;
        Insert: Partial<CourseUnit>;
        Update: Partial<CourseUnit>;
        Relationships: [
          { foreignKeyName: "course_units_course_id_fkey"; columns: ["course_id"]; isOneToOne: false; referencedRelation: "courses"; referencedColumns: ["id"] }
        ];
      };
      lessons: {
        Row: Lesson;
        Insert: Partial<Lesson>;
        Update: Partial<Lesson>;
        Relationships: [
          { foreignKeyName: "lessons_unit_id_fkey"; columns: ["unit_id"]; isOneToOne: false; referencedRelation: "course_units"; referencedColumns: ["id"] }
        ];
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: Partial<PushSubscription>;
        Update: Partial<PushSubscription>;
        Relationships: [];
      };
      user_permissions: {
        Row: UserPermission;
        Insert: Partial<UserPermission>;
        Update: Partial<UserPermission>;
        Relationships: [];
      };
      event_outbox: {
        Row: EventOutbox;
        Insert: Partial<EventOutbox>;
        Update: Partial<EventOutbox>;
        Relationships: [];
      };
      textbooks: {
        Row: Textbook;
        Insert: Partial<Textbook>;
        Update: Partial<Textbook>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task>;
        Update: Partial<Task>;
        Relationships: [
          { foreignKeyName: "tasks_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }
        ];
      };
      tuition_charges: {
        Row: TuitionCharge;
        Insert: Partial<TuitionCharge>;
        Update: Partial<TuitionCharge>;
        Relationships: [
          { foreignKeyName: "tuition_charges_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      payment_tuition_link: {
        Row: PaymentTuitionLink;
        Insert: Partial<PaymentTuitionLink>;
        Update: Partial<PaymentTuitionLink>;
        Relationships: [
          { foreignKeyName: "payment_tuition_link_payment_id_fkey"; columns: ["payment_id"]; isOneToOne: false; referencedRelation: "payments"; referencedColumns: ["id"] },
          { foreignKeyName: "payment_tuition_link_tuition_charge_id_fkey"; columns: ["tuition_charge_id"]; isOneToOne: false; referencedRelation: "tuition_charges"; referencedColumns: ["id"] }
        ];
      };
      messenger_settings: {
        Row: MessengerSettings;
        Insert: Partial<MessengerSettings>;
        Update: Partial<MessengerSettings>;
        Relationships: [
          { foreignKeyName: "messenger_settings_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      global_chat_read_status: {
        Row: GlobalChatReadStatus;
        Insert: Partial<GlobalChatReadStatus>;
        Update: Partial<GlobalChatReadStatus>;
        Relationships: [];
      };
      student_history: {
        Row: StudentHistory;
        Insert: Partial<StudentHistory>;
        Update: Partial<StudentHistory>;
        Relationships: [
          { foreignKeyName: "student_history_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      pinned_modals: {
        Row: PinnedModalDB;
        Insert: Partial<PinnedModalDB>;
        Update: Partial<PinnedModalDB>;
        Relationships: [];
      };
      sla_metrics: {
        Row: SLAMetric;
        Insert: Partial<SLAMetric>;
        Update: Partial<SLAMetric>;
        Relationships: [
          { foreignKeyName: "sla_metrics_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      mv_sla_dashboard: {
        Row: SLADashboard;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      student_operation_logs: {
        Row: StudentOperationLog;
        Insert: Partial<StudentOperationLog>;
        Update: Partial<StudentOperationLog>;
        Relationships: [
          { foreignKeyName: "student_operation_logs_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      subscription_plans: {
        Row: SubscriptionPlan;
        Insert: Partial<SubscriptionPlan>;
        Update: Partial<SubscriptionPlan>;
        Relationships: [];
      };
      v_organization_ai_settings: {
        Row: OrganizationAISettings;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      schedule: {
        Row: Schedule;
        Insert: Partial<Schedule>;
        Update: Partial<Schedule>;
        Relationships: [];
      };
      internal_link_graph: {
        Row: InternalLinkGraph;
        Insert: Partial<InternalLinkGraph>;
        Update: Partial<InternalLinkGraph>;
        Relationships: [];
      };
      ai_provider_keys: {
        Row: AIProviderKey;
        Insert: Partial<AIProviderKey>;
        Update: Partial<AIProviderKey>;
        Relationships: [
          { foreignKeyName: "ai_provider_keys_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      payment_notifications: {
        Row: PaymentNotification;
        Insert: Partial<PaymentNotification>;
        Update: Partial<PaymentNotification>;
        Relationships: [
          { foreignKeyName: "payment_notifications_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
      teacher_floating_rates: {
        Row: TeacherFloatingRate;
        Insert: Partial<TeacherFloatingRate>;
        Update: Partial<TeacherFloatingRate>;
        Relationships: [
          { foreignKeyName: "teacher_floating_rates_rate_id_fkey"; columns: ["rate_id"]; isOneToOne: false; referencedRelation: "teacher_rates"; referencedColumns: ["id"] }
        ];
      };
      student_tags: {
        Row: StudentTag;
        Insert: Partial<StudentTag>;
        Update: Partial<StudentTag>;
        Relationships: [];
      };
      student_tag_assignments: {
        Row: StudentTagAssignment;
        Insert: Partial<StudentTagAssignment>;
        Update: Partial<StudentTagAssignment>;
        Relationships: [
          { foreignKeyName: "student_tag_assignments_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "student_tag_assignments_tag_id_fkey"; columns: ["tag_id"]; isOneToOne: false; referencedRelation: "student_tags"; referencedColumns: ["id"] }
        ];
      };
      teacher_salary_accruals: {
        Row: TeacherSalaryAccrual;
        Insert: Partial<TeacherSalaryAccrual>;
        Update: Partial<TeacherSalaryAccrual>;
        Relationships: [
          { foreignKeyName: "teacher_salary_accruals_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "teachers"; referencedColumns: ["id"] },
          { foreignKeyName: "teacher_salary_accruals_lesson_session_id_fkey"; columns: ["lesson_session_id"]; isOneToOne: false; referencedRelation: "lesson_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "teacher_salary_accruals_individual_lesson_session_id_fkey"; columns: ["individual_lesson_session_id"]; isOneToOne: false; referencedRelation: "individual_lesson_sessions"; referencedColumns: ["id"] }
        ];
      };
      ai_model_mappings: {
        Row: AIModelMapping;
        Insert: Partial<AIModelMapping>;
        Update: Partial<AIModelMapping>;
        Relationships: [];
      };
      role_permissions: {
        Row: RolePermission;
        Insert: Partial<RolePermission>;
        Update: Partial<RolePermission>;
        Relationships: [];
      };
      discounts_surcharges: {
        Row: DiscountSurcharge;
        Insert: Partial<DiscountSurcharge>;
        Update: Partial<DiscountSurcharge>;
        Relationships: [];
      };
      student_discounts_surcharges: {
        Row: StudentDiscountSurcharge;
        Insert: Partial<StudentDiscountSurcharge>;
        Update: Partial<StudentDiscountSurcharge>;
        Relationships: [
          { foreignKeyName: "student_discounts_surcharges_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "student_discounts_surcharges_discount_surcharge_id_fkey"; columns: ["discount_surcharge_id"]; isOneToOne: false; referencedRelation: "discounts_surcharges"; referencedColumns: ["id"] }
        ];
      };
      student_parents: {
        Row: StudentParent;
        Insert: Partial<StudentParent>;
        Update: Partial<StudentParent>;
        Relationships: [
          { foreignKeyName: "student_parents_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ];
      };
    };
    Views: {
      mv_client_unread_stats: {
        Row: {
          client_id: string;
          client_name: string;
          branch: string | null;
          unread_count: number;
          last_message_at: string | null;
        };
      };
      mv_client_tasks_stats: {
        Row: {
          client_id: string;
          total_tasks: number;
          pending_tasks: number;
          completed_tasks: number;
          overdue_tasks: number;
        };
      };
      mv_group_stats: {
        Row: {
          id: string;
          name: string;
          branch: string | null;
          status: string;
          current_students: number;
          capacity: number;
          fill_percentage: number;
        };
      };
      mv_schedule_overview: {
        Row: {
          id: string;
          lesson_date: string;
          start_time: string;
          end_time: string;
          group_name: string;
          teacher_name: string;
          branch: string | null;
          status: string;
        };
      };
      mv_student_overview: {
        Row: {
          id: string;
          name: string;
          branch: string | null;
          status: string;
          balance: number;
          has_debt: boolean;
          last_lesson_date: string | null;
        };
      };
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
      get_chat_threads_by_client_ids: {
        Args: { p_client_ids: string[] };
        Returns: Json[];
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
      // SEO RPC functions
      find_similar_routes: {
        Args: { p_route: string; p_threshold: number };
        Returns: { route: string; similarity: number }[];
      };
      // Balance/Student RPC functions
      get_user_organization_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      get_students_with_low_balance: {
        Args: { days_threshold: number; hours_threshold: number };
        Returns: { student_id: string; student_name: string; balance_hours: number; estimated_days_left: number; last_payment_date: string | null; weekly_consumption: number }[];
      };
      transfer_between_students: {
        Args: { _from_student_id: string; _to_student_id: string; _amount: number; _description: string; _via_family_ledger?: boolean };
        Returns: Json;
      };
      auto_create_payment_notifications: {
        Args: Record<string, never>;
        Returns: void;
      };
      check_student_balance: {
        Args: { p_student_id: string; p_required_hours: number };
        Returns: { has_sufficient_balance: boolean; current_balance_hours: number; current_balance_rub: number; message: string }[];
      };
      // Conflict check RPC functions
      check_student_schedule_conflict: {
        Args: { p_student_id: string; p_start_time: string; p_end_time: string; p_exclude_session_id?: string | null };
        Returns: { has_conflict: boolean; conflict_details: Json }[];
      };
      check_teacher_double_booking: {
        Args: { p_teacher_id: string; p_start_time: string; p_end_time: string; p_exclude_session_id?: string | null };
        Returns: { has_conflict: boolean; conflict_details: Json }[];
      };
      check_room_conflict: {
        Args: { p_classroom: string; p_branch: string; p_start_time: string; p_end_time: string; p_exclude_session_id?: string | null };
        Returns: { has_conflict: boolean; conflict_details: Json }[];
      };
      // Teacher substitution RPC
      find_available_teachers: {
        Args: { p_date: string; p_time: string; p_subject: string; p_branch: string };
        Returns: { teacher_id: string; first_name: string; last_name: string; has_conflict: boolean; conflict_count: number }[];
      };
      // Family ledger RPC functions
      add_family_ledger_transaction: {
        Args: { _family_group_id: string | null; _client_id: string | null; _amount: number; _transaction_type: string; _description: string; _payment_id?: string | null };
        Returns: void;
      };
      transfer_to_student_balance: {
        Args: { _family_ledger_id: string; _student_id: string; _amount: number; _description: string };
        Returns: void;
      };
      // Discount RPC functions
      apply_discount_to_student: {
        Args: { _student_id: string; _discount_id: string; _start_date?: string | null; _end_date?: string | null; _notes?: string | null };
        Returns: void;
      };
      calculate_price_with_discounts: {
        Args: { _base_price: number; _student_id: string; _discount_ids?: string[] | null };
        Returns: { final_price: number; applied_discounts: Json }[];
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
