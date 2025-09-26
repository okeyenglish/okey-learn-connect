export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      call_comments: {
        Row: {
          call_log_id: string | null
          client_id: string
          comment_text: string
          created_at: string
          created_by: string
          id: string
          updated_at: string
        }
        Insert: {
          call_log_id?: string | null
          client_id: string
          comment_text: string
          created_at?: string
          created_by: string
          id?: string
          updated_at?: string
        }
        Update: {
          call_log_id?: string | null
          client_id?: string
          comment_text?: string
          created_at?: string
          created_by?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_comments_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          client_id: string
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          external_call_id: string | null
          id: string
          initiated_by: string | null
          notes: string | null
          phone_number: string
          started_at: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_call_id?: string | null
          id?: string
          initiated_by?: string | null
          notes?: string | null
          phone_number: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_call_id?: string | null
          id?: string
          initiated_by?: string | null
          notes?: string | null
          phone_number?: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          call_duration: string | null
          client_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          green_api_message_id: string | null
          id: string
          is_outgoing: boolean | null
          is_read: boolean
          message_status: Database["public"]["Enums"]["message_status"] | null
          message_text: string
          message_type: string
          messenger_type: Database["public"]["Enums"]["messenger_type"] | null
          phone_number_id: string | null
          system_type: string | null
          webhook_id: string | null
        }
        Insert: {
          call_duration?: string | null
          client_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          green_api_message_id?: string | null
          id?: string
          is_outgoing?: boolean | null
          is_read?: boolean
          message_status?: Database["public"]["Enums"]["message_status"] | null
          message_text: string
          message_type: string
          messenger_type?: Database["public"]["Enums"]["messenger_type"] | null
          phone_number_id?: string | null
          system_type?: string | null
          webhook_id?: string | null
        }
        Update: {
          call_duration?: string | null
          client_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          green_api_message_id?: string | null
          id?: string
          is_outgoing?: boolean | null
          is_read?: boolean
          message_status?: Database["public"]["Enums"]["message_status"] | null
          message_text?: string
          message_type?: string
          messenger_type?: Database["public"]["Enums"]["messenger_type"] | null
          phone_number_id?: string | null
          system_type?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "client_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_states: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          is_archived: boolean
          is_pinned: boolean
          is_unread: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          is_unread?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          is_unread?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_phone_numbers: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          is_telegram_enabled: boolean | null
          is_whatsapp_enabled: boolean | null
          phone: string
          phone_type: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_telegram_enabled?: boolean | null
          is_whatsapp_enabled?: boolean | null
          phone: string
          phone_type?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_telegram_enabled?: boolean | null
          is_whatsapp_enabled?: boolean | null
          phone?: string
          phone_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_phone_numbers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          avatar_url: string | null
          branch: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          last_message_at: string | null
          name: string
          notes: string | null
          phone: string
          telegram_chat_id: string | null
          updated_at: string
          whatsapp_chat_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          name: string
          notes?: string | null
          phone: string
          telegram_chat_id?: string | null
          updated_at?: string
          whatsapp_chat_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          name?: string
          notes?: string | null
          phone?: string
          telegram_chat_id?: string | null
          updated_at?: string
          whatsapp_chat_id?: string | null
        }
        Relationships: []
      }
      course_units: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          grammar: string | null
          id: string
          lessons_count: number
          sort_order: number
          title: string
          unit_number: number
          updated_at: string
          vocabulary: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          grammar?: string | null
          id?: string
          lessons_count?: number
          sort_order?: number
          title: string
          unit_number: number
          updated_at?: string
          vocabulary?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          grammar?: string | null
          id?: string
          lessons_count?: number
          sort_order?: number
          title?: string
          unit_number?: number
          updated_at?: string
          vocabulary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_units_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      docs: {
        Row: {
          content: string
          embedding: string | null
          id: string
          title: string | null
          tokens: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          content: string
          embedding?: string | null
          id?: string
          title?: string | null
          tokens?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          content?: string
          embedding?: string | null
          id?: string
          title?: string | null
          tokens?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      employee_settings: {
        Row: {
          created_at: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          permissions: Json | null
          salary: number | null
          updated_at: string | null
          user_id: string
          working_hours: Json | null
        }
        Insert: {
          created_at?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          permissions?: Json | null
          salary?: number | null
          updated_at?: string | null
          user_id: string
          working_hours?: Json | null
        }
        Update: {
          created_at?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          permissions?: Json | null
          salary?: number | null
          updated_at?: string | null
          user_id?: string
          working_hours?: Json | null
        }
        Relationships: []
      }
      family_groups: {
        Row: {
          branch: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          client_id: string
          created_at: string
          family_group_id: string
          id: string
          is_primary_contact: boolean
          relationship_type: Database["public"]["Enums"]["relationship_type"]
        }
        Insert: {
          client_id: string
          created_at?: string
          family_group_id: string
          id?: string
          is_primary_contact?: boolean
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
        }
        Update: {
          client_id?: string
          created_at?: string
          family_group_id?: string
          id?: string
          is_primary_contact?: boolean
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "family_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      faq: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_published: boolean | null
          question: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          question: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          question?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      global_chat_read_status: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          last_read_at: string
          last_read_by: string | null
          updated_at: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          last_read_by?: string | null
          updated_at?: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          last_read_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      individual_lessons: {
        Row: {
          academic_hours: number | null
          audit_location: string | null
          branch: string
          category: Database["public"]["Enums"]["group_category"]
          created_at: string
          debt_hours: number | null
          description: string | null
          id: string
          is_active: boolean
          is_skype_only: boolean | null
          lesson_end_month: string | null
          lesson_location: string | null
          lesson_start_month: string | null
          lesson_type: string
          level: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          price_per_lesson: number | null
          schedule_days: string[] | null
          schedule_time: string | null
          status: Database["public"]["Enums"]["group_status"]
          student_id: string | null
          student_name: string
          subject: string
          teacher_name: string | null
          updated_at: string
        }
        Insert: {
          academic_hours?: number | null
          audit_location?: string | null
          branch?: string
          category?: Database["public"]["Enums"]["group_category"]
          created_at?: string
          debt_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_skype_only?: boolean | null
          lesson_end_month?: string | null
          lesson_location?: string | null
          lesson_start_month?: string | null
          lesson_type?: string
          level: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          price_per_lesson?: number | null
          schedule_days?: string[] | null
          schedule_time?: string | null
          status?: Database["public"]["Enums"]["group_status"]
          student_id?: string | null
          student_name: string
          subject?: string
          teacher_name?: string | null
          updated_at?: string
        }
        Update: {
          academic_hours?: number | null
          audit_location?: string | null
          branch?: string
          category?: Database["public"]["Enums"]["group_category"]
          created_at?: string
          debt_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_skype_only?: boolean | null
          lesson_end_month?: string | null
          lesson_location?: string | null
          lesson_start_month?: string | null
          lesson_type?: string
          level?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          price_per_lesson?: number | null
          schedule_days?: string[] | null
          schedule_time?: string | null
          status?: Database["public"]["Enums"]["group_status"]
          student_id?: string | null
          student_name?: string
          subject?: string
          teacher_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      learning_groups: {
        Row: {
          academic_hours: number | null
          branch: string
          capacity: number
          category: Database["public"]["Enums"]["group_category"]
          course_id: string | null
          course_start_date: string | null
          created_at: string
          current_students: number
          custom_name: string | null
          debt_count: number | null
          default_price: number | null
          description: string | null
          group_type: Database["public"]["Enums"]["group_type"]
          id: string
          is_active: boolean
          lesson_end_month: string | null
          lesson_end_time: string | null
          lesson_start_month: string | null
          lesson_start_time: string | null
          lessons_generated: boolean | null
          level: string
          name: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          period_end: string | null
          period_start: string | null
          responsible_teacher: string | null
          schedule_days: string[] | null
          schedule_room: string | null
          schedule_time: string | null
          status: Database["public"]["Enums"]["group_status"]
          subject: string
          textbook: string | null
          total_lessons: number | null
          updated_at: string
          zoom_link: string | null
        }
        Insert: {
          academic_hours?: number | null
          branch?: string
          capacity?: number
          category?: Database["public"]["Enums"]["group_category"]
          course_id?: string | null
          course_start_date?: string | null
          created_at?: string
          current_students?: number
          custom_name?: string | null
          debt_count?: number | null
          default_price?: number | null
          description?: string | null
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          is_active?: boolean
          lesson_end_month?: string | null
          lesson_end_time?: string | null
          lesson_start_month?: string | null
          lesson_start_time?: string | null
          lessons_generated?: boolean | null
          level: string
          name: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          period_end?: string | null
          period_start?: string | null
          responsible_teacher?: string | null
          schedule_days?: string[] | null
          schedule_room?: string | null
          schedule_time?: string | null
          status?: Database["public"]["Enums"]["group_status"]
          subject?: string
          textbook?: string | null
          total_lessons?: number | null
          updated_at?: string
          zoom_link?: string | null
        }
        Update: {
          academic_hours?: number | null
          branch?: string
          capacity?: number
          category?: Database["public"]["Enums"]["group_category"]
          course_id?: string | null
          course_start_date?: string | null
          created_at?: string
          current_students?: number
          custom_name?: string | null
          debt_count?: number | null
          default_price?: number | null
          description?: string | null
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          is_active?: boolean
          lesson_end_month?: string | null
          lesson_end_time?: string | null
          lesson_start_month?: string | null
          lesson_start_time?: string | null
          lessons_generated?: boolean | null
          level?: string
          name?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          period_end?: string | null
          period_start?: string | null
          responsible_teacher?: string | null
          schedule_days?: string[] | null
          schedule_room?: string | null
          schedule_time?: string | null
          status?: Database["public"]["Enums"]["group_status"]
          subject?: string
          textbook?: string | null
          total_lessons?: number | null
          updated_at?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_sessions: {
        Row: {
          branch: string
          classroom: string
          course_lesson_id: string | null
          created_at: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          group_id: string | null
          id: string
          lesson_date: string
          lesson_number: number | null
          notes: string | null
          start_time: string
          status: Database["public"]["Enums"]["lesson_status"]
          teacher_name: string
          updated_at: string
        }
        Insert: {
          branch: string
          classroom: string
          course_lesson_id?: string | null
          created_at?: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          group_id?: string | null
          id?: string
          lesson_date: string
          lesson_number?: number | null
          notes?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["lesson_status"]
          teacher_name: string
          updated_at?: string
        }
        Update: {
          branch?: string
          classroom?: string
          course_lesson_id?: string | null
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          group_id?: string | null
          id?: string
          lesson_date?: string
          lesson_number?: number | null
          notes?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          teacher_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_sessions_course_lesson_id_fkey"
            columns: ["course_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "learning_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string | null
          homework: string | null
          id: string
          lesson_number: number
          lesson_structure: string | null
          materials: string | null
          objectives: string | null
          title: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          homework?: string | null
          id?: string
          lesson_number: number
          lesson_structure?: string | null
          materials?: string | null
          objectives?: string | null
          title: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          homework?: string | null
          id?: string
          lesson_number?: number
          lesson_structure?: string | null
          materials?: string | null
          objectives?: string | null
          title?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "course_units"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_branches: {
        Row: {
          branch: string
          created_at: string | null
          id: string
          manager_id: string
        }
        Insert: {
          branch: string
          created_at?: string | null
          id?: string
          manager_id: string
        }
        Update: {
          branch?: string
          created_at?: string | null
          id?: string
          manager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_branches_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          client_id: string | null
          created_at: string
          emoji: string
          id: string
          message_id: string
          updated_at: string
          user_id: string | null
          whatsapp_reaction_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          updated_at?: string
          user_id?: string | null
          whatsapp_reaction_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          updated_at?: string
          user_id?: string | null
          whatsapp_reaction_id?: string | null
        }
        Relationships: []
      }
      message_read_status: {
        Row: {
          created_at: string
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_message_read_status_message_id"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          last_sync_at: string | null
          messenger_type: Database["public"]["Enums"]["messenger_type"]
          settings: Json | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_sync_at?: string | null
          messenger_type: Database["public"]["Enums"]["messenger_type"]
          settings?: Json | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_sync_at?: string | null
          messenger_type?: Database["public"]["Enums"]["messenger_type"]
          settings?: Json | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      pending_gpt_responses: {
        Row: {
          approved_by: string | null
          client_id: string
          created_at: string
          expires_at: string
          id: string
          messages_context: Json
          original_response: string | null
          sent_at: string | null
          status: string
          suggested_response: string
        }
        Insert: {
          approved_by?: string | null
          client_id: string
          created_at?: string
          expires_at?: string
          id?: string
          messages_context?: Json
          original_response?: string | null
          sent_at?: string | null
          status?: string
          suggested_response: string
        }
        Update: {
          approved_by?: string | null
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          messages_context?: Json
          original_response?: string | null
          sent_at?: string | null
          status?: string
          suggested_response?: string
        }
        Relationships: []
      }
      pinned_modals: {
        Row: {
          created_at: string
          id: string
          is_open: boolean
          modal_id: string
          modal_type: string
          props: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_open?: boolean
          modal_id: string
          modal_type: string
          props?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_open?: boolean
          modal_id?: string
          modal_type?: string
          props?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: string | null
          created_at: string
          department: string | null
          email: string | null
          extension_number: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          sip_domain: string | null
          sip_password: string | null
          sip_transport: string | null
          sip_ws_url: string | null
          updated_at: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          extension_number?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          sip_domain?: string | null
          sip_password?: string | null
          sip_transport?: string | null
          sip_ws_url?: string | null
          updated_at?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          extension_number?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          sip_domain?: string | null
          sip_password?: string | null
          sip_transport?: string | null
          sip_ws_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_update: boolean | null
          created_at: string | null
          id: string
          permission: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string | null
          id?: string
          permission: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string | null
          id?: string
          permission?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      schedule: {
        Row: {
          compact_classroom: string
          compact_days: string
          compact_teacher: string | null
          compact_time: string
          created_at: string
          group_URL: string | null
          id: string
          is_active: boolean
          level: string
          name: string
          office_name: string
          updated_at: string
          vacancies: number
          Возраст: string | null
        }
        Insert: {
          compact_classroom: string
          compact_days: string
          compact_teacher?: string | null
          compact_time: string
          created_at?: string
          group_URL?: string | null
          id: string
          is_active?: boolean
          level: string
          name: string
          office_name: string
          updated_at?: string
          vacancies?: number
          Возраст?: string | null
        }
        Update: {
          compact_classroom?: string
          compact_days?: string
          compact_teacher?: string | null
          compact_time?: string
          created_at?: string
          group_URL?: string | null
          id?: string
          is_active?: boolean
          level?: string
          name?: string
          office_name?: string
          updated_at?: string
          vacancies?: number
          Возраст?: string | null
        }
        Relationships: []
      }
      student_courses: {
        Row: {
          course_name: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          next_lesson_date: string | null
          next_payment_date: string | null
          payment_amount: number | null
          start_date: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          course_name: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          next_lesson_date?: string | null
          next_payment_date?: string | null
          payment_amount?: number | null
          start_date?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          course_name?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          next_lesson_date?: string | null
          next_payment_date?: string | null
          payment_amount?: number | null
          start_date?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lesson_sessions: {
        Row: {
          created_at: string
          id: string
          lesson_session_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_session_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_session_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_lesson_sessions_lesson_session_id_fkey"
            columns: ["lesson_session_id"]
            isOneToOne: false
            referencedRelation: "lesson_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age: number
          created_at: string
          date_of_birth: string | null
          family_group_id: string
          first_name: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          name: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          age: number
          created_at?: string
          date_of_birth?: string | null
          family_group_id: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          age?: number
          created_at?: string
          date_of_birth?: string | null
          family_group_id?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          branch: string | null
          client_id: string | null
          created_at: string
          description: string | null
          direction: string | null
          due_date: string | null
          due_time: string | null
          goal: string | null
          id: string
          method: string | null
          priority: string
          responsible: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          direction?: string | null
          due_date?: string | null
          due_time?: string | null
          goal?: string | null
          id?: string
          method?: string | null
          priority?: string
          responsible?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          direction?: string | null
          due_date?: string | null
          due_time?: string | null
          goal?: string | null
          id?: string
          method?: string | null
          priority?: string
          responsible?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_messages: {
        Row: {
          branch: string
          created_at: string
          id: string
          message_text: string
          message_type: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          sent_at: string | null
          status: string
          target_group_id: string | null
          target_student_id: string | null
          target_student_name: string | null
          teacher_id: string
          teacher_name: string
          updated_at: string
        }
        Insert: {
          branch: string
          created_at?: string
          id?: string
          message_text: string
          message_type?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          sent_at?: string | null
          status?: string
          target_group_id?: string | null
          target_student_id?: string | null
          target_student_name?: string | null
          teacher_id: string
          teacher_name: string
          updated_at?: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          message_text?: string
          message_type?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          sent_at?: string | null
          status?: string
          target_group_id?: string | null
          target_student_id?: string | null
          target_student_name?: string | null
          teacher_id?: string
          teacher_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          branch: string
          categories: string[] | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          phone: string | null
          subjects: string[] | null
          updated_at: string
        }
        Insert: {
          branch?: string
          categories?: string[] | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          phone?: string | null
          subjects?: string[] | null
          updated_at?: string
        }
        Update: {
          branch?: string
          categories?: string[] | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          phone?: string | null
          subjects?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      textbooks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          program_type: string | null
          sort_order: number | null
          subcategory: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          program_type?: string | null
          sort_order?: number | null
          subcategory?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          program_type?: string | null
          sort_order?: number | null
          subcategory?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      typing_status: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_typing: boolean | null
          last_activity: string | null
          manager_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_typing?: boolean | null
          last_activity?: string | null
          manager_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_typing?: boolean | null
          last_activity?: string | null
          manager_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      unit_lessons: {
        Row: {
          activities: string
          created_at: string
          goals: string | null
          grammar: string
          homework: string | null
          id: string
          lesson_number: number
          materials: string
          sort_order: number
          structure: string | null
          title: string
          topics: string
          unit_id: string
          updated_at: string
          vocabulary: string
        }
        Insert: {
          activities?: string
          created_at?: string
          goals?: string | null
          grammar?: string
          homework?: string | null
          id?: string
          lesson_number: number
          materials?: string
          sort_order?: number
          structure?: string | null
          title: string
          topics?: string
          unit_id: string
          updated_at?: string
          vocabulary?: string
        }
        Update: {
          activities?: string
          created_at?: string
          goals?: string | null
          grammar?: string
          homework?: string | null
          id?: string
          lesson_number?: number
          materials?: string
          sort_order?: number
          structure?: string | null
          title?: string
          topics?: string
          unit_id?: string
          updated_at?: string
          vocabulary?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "course_units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          messenger_type: Database["public"]["Enums"]["messenger_type"]
          processed: boolean | null
          webhook_data: Json
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          messenger_type: Database["public"]["Enums"]["messenger_type"]
          processed?: boolean | null
          webhook_data: Json
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          messenger_type?: Database["public"]["Enums"]["messenger_type"]
          processed?: boolean | null
          webhook_data?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      check_classroom_conflict: {
        Args: {
          p_branch: string
          p_classroom: string
          p_end_time: string
          p_exclude_session_id?: string
          p_lesson_date: string
          p_start_time: string
        }
        Returns: boolean
      }
      check_multiple_students_conflicts: {
        Args: {
          p_end_time: string
          p_exclude_session_id?: string
          p_lesson_date: string
          p_start_time: string
          p_student_ids: string[]
        }
        Returns: {
          conflict_details: Json
          has_conflict: boolean
          student_id: string
        }[]
      }
      check_student_conflict: {
        Args: {
          p_end_time: string
          p_exclude_session_id?: string
          p_lesson_date: string
          p_start_time: string
          p_student_id: string
        }
        Returns: boolean
      }
      check_teacher_conflict: {
        Args: {
          p_end_time: string
          p_exclude_session_id?: string
          p_lesson_date: string
          p_start_time: string
          p_teacher_name: string
        }
        Returns: boolean
      }
      cleanup_old_typing_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_course_schedule: {
        Args: {
          p_branch: string
          p_classroom: string
          p_course_id: string
          p_end_time: string
          p_group_id: string
          p_schedule_days: string[]
          p_start_date: string
          p_start_time: string
          p_teacher_name: string
          p_total_lessons?: number
        }
        Returns: undefined
      }
      get_chat_pin_counts: {
        Args: { _chat_ids: string[] }
        Returns: {
          chat_id: string
          pin_count: number
        }[]
      }
      get_message_read_status: {
        Args: { p_message_id: string }
        Returns: {
          read_at: string
          user_id: string
          user_name: string
        }[]
      }
      get_public_schedule: {
        Args: Record<PropertyKey, never> | { branch_name?: string }
        Returns: {
          compact_classroom: string
          compact_days: string
          compact_teacher: string
          compact_time: string
          created_at: string
          group_URL: string
          id: string
          is_active: boolean
          level: string
          name: string
          office_name: string
          updated_at: string
          vacancies: number
          Возраст: string
        }[]
      }
      get_schedule_conflicts: {
        Args: {
          p_branch: string
          p_classroom: string
          p_end_time: string
          p_exclude_session_id?: string
          p_lesson_date: string
          p_start_time: string
          p_teacher_name: string
        }
        Returns: {
          conflict_type: string
          conflicting_classroom: string
          conflicting_group_id: string
          conflicting_teacher: string
          conflicting_time_range: string
        }[]
      }
      get_student_by_user_id: {
        Args: { _user_id: string }
        Returns: {
          age: number
          created_at: string
          family_group_id: string
          first_name: string
          id: string
          last_name: string
          middle_name: string
          name: string
          phone: string
          status: string
          updated_at: string
        }[]
      }
      get_student_schedule_conflicts: {
        Args: {
          p_end_time: string
          p_exclude_session_id?: string
          p_lesson_date: string
          p_start_time: string
          p_student_id: string
        }
        Returns: {
          conflict_session_id: string
          conflicting_branch: string
          conflicting_classroom: string
          conflicting_group_name: string
          conflicting_teacher: string
          conflicting_time_range: string
          lesson_type: string
        }[]
      }
      get_user_branches: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      mark_chat_messages_as_read: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      mark_message_as_read: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      match_docs: {
        Args: { match_count: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          similarity: number
          title: string
          url: string
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      user_has_permission: {
        Args: { _permission: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "teacher"
        | "student"
        | "methodist"
        | "accountant"
        | "marketing_manager"
        | "sales_manager"
        | "receptionist"
        | "head_teacher"
        | "branch_manager"
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      group_category: "preschool" | "school" | "adult" | "all"
      group_status: "reserve" | "forming" | "active" | "suspended" | "finished"
      group_type: "general" | "individual" | "mini" | "corporate"
      lesson_status: "scheduled" | "cancelled" | "completed" | "rescheduled"
      message_status:
        | "queued"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
        | "noAccount"
      messenger_type: "whatsapp" | "telegram" | "system"
      payment_method: "per_lesson" | "monthly" | "course" | "package"
      relationship_type: "main" | "spouse" | "parent" | "guardian" | "other"
      student_status: "active" | "inactive" | "trial" | "graduated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "teacher",
        "student",
        "methodist",
        "accountant",
        "marketing_manager",
        "sales_manager",
        "receptionist",
        "head_teacher",
        "branch_manager",
      ],
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      group_category: ["preschool", "school", "adult", "all"],
      group_status: ["reserve", "forming", "active", "suspended", "finished"],
      group_type: ["general", "individual", "mini", "corporate"],
      lesson_status: ["scheduled", "cancelled", "completed", "rescheduled"],
      message_status: [
        "queued",
        "sent",
        "delivered",
        "read",
        "failed",
        "noAccount",
      ],
      messenger_type: ["whatsapp", "telegram", "system"],
      payment_method: ["per_lesson", "monthly", "course", "package"],
      relationship_type: ["main", "spouse", "parent", "guardian", "other"],
      student_status: ["active", "inactive", "trial", "graduated"],
    },
  },
} as const
