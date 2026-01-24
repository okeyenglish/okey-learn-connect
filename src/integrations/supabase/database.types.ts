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

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  branch: string | null;
  organization_id: string | null;
  family_group_id: string | null;
  external_id: string | null;
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
  is_primary: boolean;
  created_at: string;
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
  status: string | null;
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
  amount: number;
  status: string;
  description: string | null;
  payment_method: string | null;
  method?: string | null;
  payment_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LearningGroup {
  id: string;
  name: string;
  responsible_teacher: string | null;
  current_students: number | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonSession {
  id: string;
  learning_group_id: string | null;
  teacher_name: string | null;
  lesson_date: string;
  start_time: string | null;
  end_time: string | null;
  classroom: string | null;
  status: string | null;
  created_at: string;
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
  updated_at: string;
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
  teacher_id: string | null;
  subject: string | null;
  schedule: Json | null;
  is_active: boolean;
  created_at: string;
}

export interface Course {
  id: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_public_schedule: {
        Args: { branch_name: string };
        Returns: GetPublicScheduleResult[];
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
