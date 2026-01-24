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
  lesson_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  notes: string | null;
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
  name: string;
  organization_id: string;
  created_at: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  organization_id: string;
  status: string | null;
  created_at: string;
}

export interface ContentDoc {
  id: string;
  title: string;
  organization_id: string;
  status: string | null;
  created_at: string;
}

export interface KwNorm {
  id: string;
  keyword: string;
  organization_id: string;
  created_at: string;
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

export interface GlobalEntityMapping {
  id: string;
  entity_type: string;
  local_id: string;
  external_id: string;
  source: string;
  organization_id: string | null;
  created_at: string;
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
