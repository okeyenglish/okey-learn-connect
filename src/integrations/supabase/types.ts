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
      absence_reasons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_excused: boolean
          name: string
          payment_coefficient: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_excused?: boolean
          name: string
          payment_coefficient?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_excused?: boolean
          name?: string
          payment_coefficient?: number
          updated_at?: string
        }
        Relationships: []
      }
      age_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_age: number | null
          min_age: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_age?: number | null
          min_age?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_age?: number | null
          min_age?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_key_provision_jobs: {
        Row: {
          attempts: number
          created_at: string | null
          entity_name: string
          id: number
          last_error: string | null
          max_attempts: number
          monthly_limit: number
          organization_id: string | null
          provider: string
          reset_policy: string
          run_after: string | null
          status: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string | null
          entity_name: string
          id?: never
          last_error?: string | null
          max_attempts?: number
          monthly_limit?: number
          organization_id?: string | null
          provider: string
          reset_policy?: string
          run_after?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string | null
          entity_name?: string
          id?: never
          last_error?: string | null
          max_attempts?: number
          monthly_limit?: number
          organization_id?: string | null
          provider?: string
          reset_policy?: string
          run_after?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_key_provision_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_key_provision_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ai_key_provision_jobs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_key_provision_jobs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_with_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_mappings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          model_id: string
          tier: string
          use_case: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model_id: string
          tier: string
          use_case: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string
          tier?: string
          use_case?: string
        }
        Relationships: []
      }
      ai_pricing: {
        Row: {
          created_at: string | null
          currency_id: string | null
          id: string
          is_active: boolean | null
          model_name: string | null
          price_per_request: number
          provider: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency_id?: string | null
          id?: string
          is_active?: boolean | null
          model_name?: string | null
          price_per_request: number
          provider: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency_id?: string | null
          id?: string
          is_active?: boolean | null
          model_name?: string | null
          price_per_request?: number
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_pricing_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_keys: {
        Row: {
          created_at: string | null
          id: string
          key_label: string | null
          key_preview: string | null
          key_type: string
          key_value: string
          limit_monthly: number | null
          limit_remaining: number | null
          organization_id: string | null
          provider: string
          reset_policy: string | null
          status: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_label?: string | null
          key_preview?: string | null
          key_type?: string
          key_value: string
          limit_monthly?: number | null
          limit_remaining?: number | null
          organization_id?: string | null
          provider: string
          reset_policy?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key_label?: string | null
          key_preview?: string | null
          key_type?: string
          key_value?: string
          limit_monthly?: number | null
          limit_remaining?: number | null
          organization_id?: string | null
          provider?: string
          reset_policy?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_provider_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ai_provider_keys_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_provider_keys_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_with_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      app_flags: {
        Row: {
          app_id: string
          created_at: string | null
          details: string | null
          id: string
          reason: string
          resolved_at: string | null
          status: string | null
          teacher_id: string
        }
        Insert: {
          app_id: string
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          resolved_at?: string | null
          status?: string | null
          teacher_id: string
        }
        Update: {
          app_id?: string
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          resolved_at?: string | null
          status?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_flags_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_flags_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      app_installs: {
        Row: {
          app_id: string
          id: string
          installed_at: string | null
          teacher_id: string
        }
        Insert: {
          app_id: string
          id?: string
          installed_at?: string | null
          teacher_id: string
        }
        Update: {
          app_id?: string
          id?: string
          installed_at?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_installs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_installs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      app_reviews: {
        Row: {
          app_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          app_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          app_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_reviews_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_reviews_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      app_usage: {
        Row: {
          app_id: string
          id: string
          teacher_id: string
          used_at: string | null
        }
        Insert: {
          app_id: string
          id?: string
          teacher_id: string
          used_at?: string | null
        }
        Update: {
          app_id?: string
          id?: string
          teacher_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_usage_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_usage_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      app_versions: {
        Row: {
          app_id: string
          artifact_path: string
          created_at: string | null
          id: string
          meta: Json | null
          model: string
          preview_url: string
          prompt: Json
          version: number
        }
        Insert: {
          app_id: string
          artifact_path: string
          created_at?: string | null
          id?: string
          meta?: Json | null
          model: string
          preview_url: string
          prompt: Json
          version: number
        }
        Update: {
          app_id?: string
          artifact_path?: string
          created_at?: string | null
          id?: string
          meta?: Json | null
          model?: string
          preview_url?: string
          prompt?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_versions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_versions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          author_id: string
          avg_rating: number | null
          created_at: string | null
          description: string | null
          embedding: string | null
          fingerprint: string | null
          id: string
          install_count: number | null
          kind: string
          latest_version: number | null
          level: string
          organization_id: string
          published_at: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          avg_rating?: number | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          fingerprint?: string | null
          id?: string
          install_count?: number | null
          kind: string
          latest_version?: number | null
          level: string
          organization_id: string
          published_at?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          avg_rating?: number | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          fingerprint?: string | null
          id?: string
          install_count?: number | null
          kind?: string
          latest_version?: number | null
          level?: string
          organization_id?: string
          published_at?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assistant_threads: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          changed_by: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          organization_id: string
          request_id: string | null
          user_agent: string | null
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          changed_by?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
          request_id?: string | null
          user_agent?: string | null
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          changed_by?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
          request_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      balance_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          lesson_session_id: string | null
          payment_id: string | null
          student_id: string
          transaction_type: Database["public"]["Enums"]["balance_transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          lesson_session_id?: string | null
          payment_id?: string | null
          student_id: string
          transaction_type: Database["public"]["Enums"]["balance_transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          lesson_session_id?: string | null
          payment_id?: string | null
          student_id?: string
          transaction_type?: Database["public"]["Enums"]["balance_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "balance_transactions_lesson_session_id_fkey"
            columns: ["lesson_session_id"]
            isOneToOne: false
            referencedRelation: "individual_lesson_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_accounts: {
        Row: {
          balance: number
          created_at: string
          id: string
          student_id: string | null
          total_earned: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          student_id?: string | null
          total_earned?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          student_id?: string | null
          total_earned?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_transactions: {
        Row: {
          amount: number
          bonus_account_id: string | null
          created_at: string
          description: string
          expires_at: string | null
          id: string
          lesson_session_id: string | null
          payment_id: string | null
          transaction_type: Database["public"]["Enums"]["bonus_transaction_type"]
        }
        Insert: {
          amount: number
          bonus_account_id?: string | null
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          lesson_session_id?: string | null
          payment_id?: string | null
          transaction_type: Database["public"]["Enums"]["bonus_transaction_type"]
        }
        Update: {
          amount?: number
          bonus_account_id?: string | null
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          lesson_session_id?: string | null
          payment_id?: string | null
          transaction_type?: Database["public"]["Enums"]["bonus_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bonus_transactions_bonus_account_id_fkey"
            columns: ["bonus_account_id"]
            isOneToOne: false
            referencedRelation: "bonus_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_photos: {
        Row: {
          alt_text: string | null
          branch_id: string
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_main: boolean
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          branch_id: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_main?: boolean
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          branch_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_main?: boolean
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      broadcast_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          delivered_count: number | null
          delivery_method: string[]
          failed_count: number | null
          filters: Json | null
          id: string
          message: string
          name: string
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          target_audience: string
          title: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          delivered_count?: number | null
          delivery_method?: string[]
          failed_count?: number | null
          filters?: Json | null
          id?: string
          message: string
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_audience: string
          title: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          delivered_count?: number | null
          delivery_method?: string[]
          failed_count?: number | null
          filters?: Json | null
          id?: string
          message?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_audience?: string
          title?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          phone_number?: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          call_duration: string | null
          client_id: string
          created_at: string
          external_message_id: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_outgoing: boolean | null
          is_read: boolean
          max_channel_id: string | null
          message_status: Database["public"]["Enums"]["message_status"] | null
          message_text: string
          message_type: string
          messenger_type: Database["public"]["Enums"]["messenger_type"] | null
          organization_id: string
          phone_number_id: string | null
          salebot_message_id: string | null
          system_type: string | null
          webhook_id: string | null
        }
        Insert: {
          call_duration?: string | null
          client_id: string
          created_at?: string
          external_message_id?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_outgoing?: boolean | null
          is_read?: boolean
          max_channel_id?: string | null
          message_status?: Database["public"]["Enums"]["message_status"] | null
          message_text: string
          message_type: string
          messenger_type?: Database["public"]["Enums"]["messenger_type"] | null
          organization_id?: string
          phone_number_id?: string | null
          salebot_message_id?: string | null
          system_type?: string | null
          webhook_id?: string | null
        }
        Update: {
          call_duration?: string | null
          client_id?: string
          created_at?: string
          external_message_id?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_outgoing?: boolean | null
          is_read?: boolean
          max_channel_id?: string | null
          message_status?: Database["public"]["Enums"]["message_status"] | null
          message_text?: string
          message_type?: string
          messenger_type?: Database["public"]["Enums"]["messenger_type"] | null
          organization_id?: string
          phone_number_id?: string | null
          salebot_message_id?: string | null
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
            foreignKeyName: "chat_messages_max_channel_id_fkey"
            columns: ["max_channel_id"]
            isOneToOne: false
            referencedRelation: "max_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
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
      chat_threads: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          participants: string[]
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          participants?: string[]
          title?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          participants?: string[]
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          branch: string
          capacity: number
          created_at: string
          equipment: string[] | null
          id: string
          is_active: boolean
          is_online: boolean
          name: string
          notes: string | null
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          branch: string
          capacity?: number
          created_at?: string
          equipment?: string[] | null
          id?: string
          is_active?: boolean
          is_online?: boolean
          name: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          branch?: string
          capacity?: number
          created_at?: string
          equipment?: string[] | null
          id?: string
          is_active?: boolean
          is_online?: boolean
          name?: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      client_branches: {
        Row: {
          branch: string
          client_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          branch: string
          client_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          branch?: string
          client_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_branches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_phone_numbers: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          is_telegram_enabled: boolean | null
          is_whatsapp_enabled: boolean | null
          max_avatar_url: string | null
          max_chat_id: string | null
          max_user_id: number | null
          phone: string
          phone_type: string | null
          telegram_avatar_url: string | null
          telegram_chat_id: string | null
          telegram_user_id: number | null
          updated_at: string | null
          whatsapp_avatar_url: string | null
          whatsapp_chat_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_telegram_enabled?: boolean | null
          is_whatsapp_enabled?: boolean | null
          max_avatar_url?: string | null
          max_chat_id?: string | null
          max_user_id?: number | null
          phone: string
          phone_type?: string | null
          telegram_avatar_url?: string | null
          telegram_chat_id?: string | null
          telegram_user_id?: number | null
          updated_at?: string | null
          whatsapp_avatar_url?: string | null
          whatsapp_chat_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_telegram_enabled?: boolean | null
          is_whatsapp_enabled?: boolean | null
          max_avatar_url?: string | null
          max_chat_id?: string | null
          max_user_id?: number | null
          phone?: string
          phone_type?: string | null
          telegram_avatar_url?: string | null
          telegram_chat_id?: string | null
          telegram_user_id?: number | null
          updated_at?: string | null
          whatsapp_avatar_url?: string | null
          whatsapp_chat_id?: string | null
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
      client_statuses: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          is_active: boolean
          is_failure: boolean
          is_success: boolean
          name: string
          organization_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          is_failure?: boolean
          is_success?: boolean
          name: string
          organization_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          is_failure?: boolean
          is_success?: boolean
          name?: string
          organization_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          avatar_url: string | null
          branch: string | null
          client_number: string | null
          created_at: string
          email: string | null
          external_id: string | null
          holihope_metadata: Json | null
          id: string
          is_active: boolean
          last_message_at: string | null
          max_avatar_url: string | null
          max_chat_id: string | null
          max_user_id: number | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          salebot_client_id: number | null
          telegram_avatar_url: string | null
          telegram_chat_id: string | null
          telegram_user_id: number | null
          updated_at: string
          whatsapp_avatar_url: string | null
          whatsapp_chat_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          client_number?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          holihope_metadata?: Json | null
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          max_avatar_url?: string | null
          max_chat_id?: string | null
          max_user_id?: number | null
          name: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          salebot_client_id?: number | null
          telegram_avatar_url?: string | null
          telegram_chat_id?: string | null
          telegram_user_id?: number | null
          updated_at?: string
          whatsapp_avatar_url?: string | null
          whatsapp_chat_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          client_number?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          holihope_metadata?: Json | null
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          max_avatar_url?: string | null
          max_chat_id?: string | null
          max_user_id?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          salebot_client_id?: number | null
          telegram_avatar_url?: string | null
          telegram_chat_id?: string | null
          telegram_user_id?: number | null
          updated_at?: string
          whatsapp_avatar_url?: string | null
          whatsapp_chat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      content_docs: {
        Row: {
          created_at: string | null
          html: string
          id: string
          idea_id: string | null
          meta: Json
          organization_id: string | null
          published_at: string | null
          quality: Json | null
          version: number | null
          word_count: number | null
        }
        Insert: {
          created_at?: string | null
          html: string
          id?: string
          idea_id?: string | null
          meta?: Json
          organization_id?: string | null
          published_at?: string | null
          quality?: Json | null
          version?: number | null
          word_count?: number | null
        }
        Update: {
          created_at?: string | null
          html?: string
          id?: string
          idea_id?: string | null
          meta?: Json
          organization_id?: string | null
          published_at?: string | null
          quality?: Json | null
          version?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_docs_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "content_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_docs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_docs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      content_ideas: {
        Row: {
          branch: string | null
          cluster_id: string | null
          created_at: string | null
          h1: string
          id: string
          idea_type: string
          meta: Json
          organization_id: string | null
          route: string
          score: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          branch?: string | null
          cluster_id?: string | null
          created_at?: string | null
          h1: string
          id?: string
          idea_type: string
          meta?: Json
          organization_id?: string | null
          route: string
          score?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          branch?: string | null
          cluster_id?: string | null
          created_at?: string | null
          h1?: string
          id?: string
          idea_type?: string
          meta?: Json
          organization_id?: string | null
          route?: string
          score?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_ideas_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "kw_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      content_metrics: {
        Row: {
          avg_position: number | null
          bounce_rate: number | null
          clicks: number | null
          content_id: string | null
          created_at: string | null
          ctr: number | null
          date: string | null
          id: string
          impressions: number | null
          organization_id: string | null
          scroll_depth: number | null
          time_on_page: number | null
        }
        Insert: {
          avg_position?: number | null
          bounce_rate?: number | null
          clicks?: number | null
          content_id?: string | null
          created_at?: string | null
          ctr?: number | null
          date?: string | null
          id?: string
          impressions?: number | null
          organization_id?: string | null
          scroll_depth?: number | null
          time_on_page?: number | null
        }
        Update: {
          avg_position?: number | null
          bounce_rate?: number | null
          clicks?: number | null
          content_id?: string | null
          created_at?: string | null
          ctr?: number | null
          date?: string | null
          id?: string
          impressions?: number | null
          organization_id?: string | null
          scroll_depth?: number | null
          time_on_page?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_metrics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_docs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      course_prices: {
        Row: {
          course_name: string
          created_at: string
          id: string
          price_per_40_min: number
          price_per_academic_hour: number
          updated_at: string
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          price_per_40_min: number
          price_per_academic_hour: number
          updated_at?: string
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          price_per_40_min?: number
          price_per_academic_hour?: number
          updated_at?: string
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "course_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          organization_id: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      cron_job_logs: {
        Row: {
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          id: string
          job_name: string
          response_data: Json | null
          status: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          job_name: string
          response_data?: Json | null
          status: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          job_name?: string
          response_data?: Json | null
          status?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          symbol?: string
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
      document_access_logs: {
        Row: {
          accessed_at: string | null
          action: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          accessed_at?: string | null
          action: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          accessed_at?: string | null
          action?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          document_type: string
          file_path: string | null
          file_size: number | null
          folder_path: string | null
          id: string
          is_shared: boolean | null
          mime_type: string | null
          name: string
          owner_id: string
          shared_with: string[] | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          document_type: string
          file_path?: string | null
          file_size?: number | null
          folder_path?: string | null
          id?: string
          is_shared?: boolean | null
          mime_type?: string | null
          name: string
          owner_id: string
          shared_with?: string[] | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_path?: string | null
          file_size?: number | null
          folder_path?: string | null
          id?: string
          is_shared?: boolean | null
          mime_type?: string | null
          name?: string
          owner_id?: string
          shared_with?: string[] | null
          updated_at?: string | null
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
      employees: {
        Row: {
          branch: string | null
          created_at: string
          department: string | null
          email: string | null
          external_id: string | null
          first_name: string
          hire_date: string | null
          holihope_metadata: Json | null
          id: string
          is_active: boolean
          last_name: string
          middle_name: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          external_id?: string | null
          first_name: string
          hire_date?: string | null
          holihope_metadata?: Json | null
          id?: string
          is_active?: boolean
          last_name: string
          middle_name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          external_id?: string | null
          first_name?: string
          hire_date?: string | null
          holihope_metadata?: Json | null
          id?: string
          is_active?: boolean
          last_name?: string
          middle_name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      event_bus: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
          payload: Json | null
          processed_at: string | null
          retry_count: number | null
          status: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bus_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bus_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      family_groups: {
        Row: {
          branch: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id?: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
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
      group_course_prices: {
        Row: {
          course_name: string
          created_at: string
          duration_minutes: number
          id: string
          price_24_lessons: number
          price_8_lessons: number
          price_80_lessons: number
          updated_at: string
        }
        Insert: {
          course_name: string
          created_at?: string
          duration_minutes?: number
          id?: string
          price_24_lessons?: number
          price_8_lessons?: number
          price_80_lessons?: number
          updated_at?: string
        }
        Update: {
          course_name?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          price_24_lessons?: number
          price_8_lessons?: number
          price_80_lessons?: number
          updated_at?: string
        }
        Relationships: []
      }
      group_history: {
        Row: {
          changed_by: string | null
          created_at: string
          event_data: Json | null
          event_type: string
          group_id: string
          id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          group_id: string
          id?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_history_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "learning_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_permissions: {
        Row: {
          can_access_all_branches: boolean | null
          can_add_students: boolean | null
          can_change_status: boolean | null
          can_create_groups: boolean | null
          can_delete_groups: boolean | null
          can_edit_groups: boolean | null
          can_remove_students: boolean | null
          can_set_custom_name: boolean | null
          can_view_finances: boolean | null
          created_at: string | null
          group_id: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_access_all_branches?: boolean | null
          can_add_students?: boolean | null
          can_change_status?: boolean | null
          can_create_groups?: boolean | null
          can_delete_groups?: boolean | null
          can_edit_groups?: boolean | null
          can_remove_students?: boolean | null
          can_set_custom_name?: boolean | null
          can_view_finances?: boolean | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_access_all_branches?: boolean | null
          can_add_students?: boolean | null
          can_change_status?: boolean | null
          can_create_groups?: boolean | null
          can_delete_groups?: boolean | null
          can_edit_groups?: boolean | null
          can_remove_students?: boolean | null
          can_set_custom_name?: boolean | null
          can_view_finances?: boolean | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "learning_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_students: {
        Row: {
          created_at: string
          enrollment_date: string
          enrollment_notes: string | null
          enrollment_type: string | null
          exit_date: string | null
          exit_reason: string | null
          group_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["group_student_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enrollment_date?: string
          enrollment_notes?: string | null
          enrollment_type?: string | null
          exit_date?: string | null
          exit_reason?: string | null
          group_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["group_student_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enrollment_date?: string
          enrollment_notes?: string | null
          enrollment_type?: string | null
          exit_date?: string | null
          exit_reason?: string | null
          group_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["group_student_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "learning_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      holihope_import_progress: {
        Row: {
          created_at: string | null
          current_offset: number | null
          current_step: number | null
          errors: Json | null
          id: string
          is_paused: boolean | null
          is_running: boolean | null
          last_error: string | null
          last_run_at: string | null
          last_sync_timestamp: string | null
          requires_manual_restart: boolean | null
          start_time: string | null
          total_branches_imported: number | null
          total_groups_imported: number | null
          total_leads_imported: number | null
          total_students_imported: number | null
          total_teachers_imported: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_offset?: number | null
          current_step?: number | null
          errors?: Json | null
          id?: string
          is_paused?: boolean | null
          is_running?: boolean | null
          last_error?: string | null
          last_run_at?: string | null
          last_sync_timestamp?: string | null
          requires_manual_restart?: boolean | null
          start_time?: string | null
          total_branches_imported?: number | null
          total_groups_imported?: number | null
          total_leads_imported?: number | null
          total_students_imported?: number | null
          total_teachers_imported?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_offset?: number | null
          current_step?: number | null
          errors?: Json | null
          id?: string
          is_paused?: boolean | null
          is_running?: boolean | null
          last_error?: string | null
          last_run_at?: string | null
          last_sync_timestamp?: string | null
          requires_manual_restart?: boolean | null
          start_time?: string | null
          total_branches_imported?: number | null
          total_groups_imported?: number | null
          total_leads_imported?: number | null
          total_students_imported?: number | null
          total_teachers_imported?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      homework: {
        Row: {
          assignment: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          group_id: string | null
          id: string
          lesson_session_id: string | null
          organization_id: string
          show_in_student_portal: boolean
          updated_at: string
        }
        Insert: {
          assignment: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          group_id?: string | null
          id?: string
          lesson_session_id?: string | null
          organization_id?: string
          show_in_student_portal?: boolean
          updated_at?: string
        }
        Update: {
          assignment?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          group_id?: string | null
          id?: string
          lesson_session_id?: string | null
          organization_id?: string
          show_in_student_portal?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "learning_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_lesson_session_id_fkey"
            columns: ["lesson_session_id"]
            isOneToOne: false
            referencedRelation: "lesson_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean | null
          level: string | null
          subject: string | null
          teacher_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          subject?: string | null
          teacher_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          subject?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      individual_lesson_history: {
        Row: {
          applied_from_date: string | null
          applied_to_date: string | null
          change_type: string
          changed_at: string
          changed_by: string | null
          changes: Json
          created_at: string
          id: string
          lesson_id: string
          notes: string | null
        }
        Insert: {
          applied_from_date?: string | null
          applied_to_date?: string | null
          change_type: string
          changed_at?: string
          changed_by?: string | null
          changes: Json
          created_at?: string
          id?: string
          lesson_id: string
          notes?: string | null
        }
        Update: {
          applied_from_date?: string | null
          applied_to_date?: string | null
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          changes?: Json
          created_at?: string
          id?: string
          lesson_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "individual_lesson_history_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "individual_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_lesson_sessions: {
        Row: {
          created_at: string | null
          created_by: string | null
          duration: number | null
          id: string
          individual_lesson_id: string
          is_additional: boolean | null
          is_free_for_student: boolean
          is_free_for_teacher: boolean
          lesson_date: string
          notes: string | null
          organization_id: string | null
          paid_minutes: number | null
          payment_id: string | null
          status: string
          teacher_hours_coefficient: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          duration?: number | null
          id?: string
          individual_lesson_id: string
          is_additional?: boolean | null
          is_free_for_student?: boolean
          is_free_for_teacher?: boolean
          lesson_date: string
          notes?: string | null
          organization_id?: string | null
          paid_minutes?: number | null
          payment_id?: string | null
          status?: string
          teacher_hours_coefficient?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          duration?: number | null
          id?: string
          individual_lesson_id?: string
          is_additional?: boolean | null
          is_free_for_student?: boolean
          is_free_for_teacher?: boolean
          lesson_date?: string
          notes?: string | null
          organization_id?: string | null
          paid_minutes?: number | null
          payment_id?: string | null
          status?: string
          teacher_hours_coefficient?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "individual_lesson_sessions_individual_lesson_id_fkey"
            columns: ["individual_lesson_id"]
            isOneToOne: false
            referencedRelation: "individual_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_lesson_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_lesson_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "individual_lesson_sessions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_lessons: {
        Row: {
          academic_hours: number | null
          academic_hours_per_day: number | null
          audit_location: string | null
          branch: string
          break_minutes: number | null
          category: Database["public"]["Enums"]["group_category"]
          color: string | null
          created_at: string
          debt_hours: number | null
          description: string | null
          duration: number | null
          external_id: string | null
          id: string
          is_active: boolean
          is_skype_only: boolean | null
          lesson_end_month: string | null
          lesson_location: string | null
          lesson_number: string | null
          lesson_start_month: string | null
          lesson_type: string
          level: string
          notes: string | null
          organization_id: string
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
          academic_hours_per_day?: number | null
          audit_location?: string | null
          branch?: string
          break_minutes?: number | null
          category?: Database["public"]["Enums"]["group_category"]
          color?: string | null
          created_at?: string
          debt_hours?: number | null
          description?: string | null
          duration?: number | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          is_skype_only?: boolean | null
          lesson_end_month?: string | null
          lesson_location?: string | null
          lesson_number?: string | null
          lesson_start_month?: string | null
          lesson_type?: string
          level: string
          notes?: string | null
          organization_id?: string
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
          academic_hours_per_day?: number | null
          audit_location?: string | null
          branch?: string
          break_minutes?: number | null
          category?: Database["public"]["Enums"]["group_category"]
          color?: string | null
          created_at?: string
          debt_hours?: number | null
          description?: string | null
          duration?: number | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          is_skype_only?: boolean | null
          lesson_end_month?: string | null
          lesson_location?: string | null
          lesson_number?: string | null
          lesson_start_month?: string | null
          lesson_type?: string
          level?: string
          notes?: string | null
          organization_id?: string
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
        Relationships: [
          {
            foreignKeyName: "individual_lessons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_lessons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      internal_chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_deleted: boolean
          is_edited: boolean
          message_text: string
          message_type: string
          reply_to_message_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          message_text: string
          message_type?: string
          reply_to_message_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          message_text?: string
          message_type?: string
          reply_to_message_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "internal_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_participants: {
        Row: {
          chat_id: string
          id: string
          is_admin: boolean
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          is_admin?: boolean
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          is_admin?: boolean
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "internal_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chats: {
        Row: {
          branch: string | null
          chat_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          chat_type: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          chat_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_link_graph: {
        Row: {
          anchor: string
          created_at: string | null
          from_route: string
          id: string
          link_type: string | null
          organization_id: string | null
          strength: number | null
          to_route: string
          updated_at: string | null
        }
        Insert: {
          anchor: string
          created_at?: string | null
          from_route: string
          id?: string
          link_type?: string | null
          organization_id?: string | null
          strength?: number | null
          to_route: string
          updated_at?: string | null
        }
        Update: {
          anchor?: string
          created_at?: string | null
          from_route?: string
          id?: string
          link_type?: string | null
          organization_id?: string | null
          strength?: number | null
          to_route?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_link_graph_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_link_graph_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      internal_message_read_status: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_message_read_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid_date: string | null
          status: Database["public"]["Enums"]["finance_invoice_status"]
          student_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid_date?: string | null
          status?: Database["public"]["Enums"]["finance_invoice_status"]
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_date?: string | null
          status?: Database["public"]["Enums"]["finance_invoice_status"]
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      kw_clusters: {
        Row: {
          branch: string | null
          created_at: string | null
          head_term: string
          id: string
          intent: string | null
          members: Json
          organization_id: string | null
          score: number | null
          slug: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          branch?: string | null
          created_at?: string | null
          head_term: string
          id?: string
          intent?: string | null
          members?: Json
          organization_id?: string | null
          score?: number | null
          slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          branch?: string | null
          created_at?: string | null
          head_term?: string
          id?: string
          intent?: string | null
          members?: Json
          organization_id?: string | null
          score?: number | null
          slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kw_clusters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kw_clusters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      kw_norm: {
        Row: {
          created_at: string | null
          difficulty: number | null
          id: string
          intent: string | null
          last_updated: string | null
          monthly_searches: number | null
          organization_id: string | null
          phrase: string
          region: string | null
          related_keywords: Json | null
          source: string | null
          trend: number | null
          updated_at: string | null
          wordstat_competition: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty?: number | null
          id?: string
          intent?: string | null
          last_updated?: string | null
          monthly_searches?: number | null
          organization_id?: string | null
          phrase: string
          region?: string | null
          related_keywords?: Json | null
          source?: string | null
          trend?: number | null
          updated_at?: string | null
          wordstat_competition?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty?: number | null
          id?: string
          intent?: string | null
          last_updated?: string | null
          monthly_searches?: number | null
          organization_id?: string | null
          phrase?: string
          region?: string | null
          related_keywords?: Json | null
          source?: string | null
          trend?: number | null
          updated_at?: string | null
          wordstat_competition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kw_norm_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kw_norm_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      kw_sources: {
        Row: {
          collected_at: string | null
          id: string
          organization_id: string | null
          payload: Json
          source: string
        }
        Insert: {
          collected_at?: string | null
          id?: string
          organization_id?: string | null
          payload: Json
          source: string
        }
        Update: {
          collected_at?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "kw_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kw_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      lead_branches: {
        Row: {
          branch: string
          created_at: string | null
          id: string
          lead_id: string
        }
        Insert: {
          branch: string
          created_at?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          branch?: string
          created_at?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_branches_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status_id: string | null
          id: string
          lead_id: string
          notes: string | null
          to_status_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          to_status_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          to_status_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_history_from_status_id_fkey"
            columns: ["from_status_id"]
            isOneToOne: false
            referencedRelation: "lead_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_status_history_to_status_id_fkey"
            columns: ["to_status_id"]
            isOneToOne: false
            referencedRelation: "lead_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_statuses: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          is_active: boolean
          is_failure: boolean
          is_success: boolean
          name: string
          organization_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          is_failure?: boolean
          is_success?: boolean
          name: string
          organization_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          is_failure?: boolean
          is_success?: boolean
          name?: string
          organization_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          age: number | null
          assigned_to: string | null
          branch: string
          converted_to_student_id: string | null
          created_at: string
          email: string | null
          external_id: string | null
          family_group_id: string | null
          first_name: string
          holihope_metadata: Json | null
          id: string
          last_name: string | null
          lead_source_id: string | null
          level: string | null
          middle_name: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          pre_enrolled_group_id: string | null
          pre_enrollment_date: string | null
          preferred_days: string[] | null
          preferred_time: string | null
          status_id: string | null
          subject: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          age?: number | null
          assigned_to?: string | null
          branch?: string
          converted_to_student_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          family_group_id?: string | null
          first_name: string
          holihope_metadata?: Json | null
          id?: string
          last_name?: string | null
          lead_source_id?: string | null
          level?: string | null
          middle_name?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          pre_enrolled_group_id?: string | null
          pre_enrollment_date?: string | null
          preferred_days?: string[] | null
          preferred_time?: string | null
          status_id?: string | null
          subject?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          age?: number | null
          assigned_to?: string | null
          branch?: string
          converted_to_student_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          family_group_id?: string | null
          first_name?: string
          holihope_metadata?: Json | null
          id?: string
          last_name?: string | null
          lead_source_id?: string | null
          level?: string | null
          middle_name?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          pre_enrolled_group_id?: string | null
          pre_enrollment_date?: string | null
          preferred_days?: string[] | null
          preferred_time?: string | null
          status_id?: string | null
          subject?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pre_enrolled_group_id_fkey"
            columns: ["pre_enrolled_group_id"]
            isOneToOne: false
            referencedRelation: "learning_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "lead_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_formats: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_online: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_online?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_online?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_groups: {
        Row: {
          academic_hours: number | null
          auto_filter_conditions: Json | null
          branch: string
          capacity: number
          category: Database["public"]["Enums"]["group_category"]
          color_code: string | null
          course_id: string | null
          course_start_date: string | null
          created_at: string
          current_students: number
          custom_name: string | null
          custom_name_locked: boolean | null
          debt_count: number | null
          default_price: number | null
          description: string | null
          enrollment_url: string | null
          external_id: string | null
          group_number: string | null
          group_type: Database["public"]["Enums"]["group_type"]
          id: string
          is_active: boolean
          is_auto_group: boolean | null
          lesson_end_month: string | null
          lesson_end_time: string | null
          lesson_start_month: string | null
          lesson_start_time: string | null
          lessons_generated: boolean | null
          level: string
          name: string
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          period_end: string | null
          period_start: string | null
          responsible_manager_id: string | null
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
          auto_filter_conditions?: Json | null
          branch?: string
          capacity?: number
          category?: Database["public"]["Enums"]["group_category"]
          color_code?: string | null
          course_id?: string | null
          course_start_date?: string | null
          created_at?: string
          current_students?: number
          custom_name?: string | null
          custom_name_locked?: boolean | null
          debt_count?: number | null
          default_price?: number | null
          description?: string | null
          enrollment_url?: string | null
          external_id?: string | null
          group_number?: string | null
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          is_active?: boolean
          is_auto_group?: boolean | null
          lesson_end_month?: string | null
          lesson_end_time?: string | null
          lesson_start_month?: string | null
          lesson_start_time?: string | null
          lessons_generated?: boolean | null
          level: string
          name: string
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          period_end?: string | null
          period_start?: string | null
          responsible_manager_id?: string | null
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
          auto_filter_conditions?: Json | null
          branch?: string
          capacity?: number
          category?: Database["public"]["Enums"]["group_category"]
          color_code?: string | null
          course_id?: string | null
          course_start_date?: string | null
          created_at?: string
          current_students?: number
          custom_name?: string | null
          custom_name_locked?: boolean | null
          debt_count?: number | null
          default_price?: number | null
          description?: string | null
          enrollment_url?: string | null
          external_id?: string | null
          group_number?: string | null
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          is_active?: boolean
          is_auto_group?: boolean | null
          lesson_end_month?: string | null
          lesson_end_time?: string | null
          lesson_start_month?: string | null
          lesson_start_time?: string | null
          lessons_generated?: boolean | null
          level?: string
          name?: string
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          period_end?: string | null
          period_start?: string | null
          responsible_manager_id?: string | null
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
          {
            foreignKeyName: "learning_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "learning_groups_responsible_manager_id_fkey"
            columns: ["responsible_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_types: {
        Row: {
          created_at: string
          description: string | null
          external_id: string | null
          holihope_metadata: Json | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_id?: string | null
          holihope_metadata?: Json | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_id?: string | null
          holihope_metadata?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
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
          external_id: string | null
          group_id: string | null
          id: string
          is_free_for_student: boolean
          is_free_for_teacher: boolean
          lesson_date: string
          lesson_number: number | null
          lessons_count: number | null
          notes: string | null
          organization_id: string
          paid_minutes: number | null
          payment_amount: number | null
          payment_date: string | null
          payment_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["lesson_status"]
          teacher_hours_coefficient: number
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
          external_id?: string | null
          group_id?: string | null
          id?: string
          is_free_for_student?: boolean
          is_free_for_teacher?: boolean
          lesson_date: string
          lesson_number?: number | null
          lessons_count?: number | null
          notes?: string | null
          organization_id?: string
          paid_minutes?: number | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["lesson_status"]
          teacher_hours_coefficient?: number
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
          external_id?: string | null
          group_id?: string | null
          id?: string
          is_free_for_student?: boolean
          is_free_for_teacher?: boolean
          lesson_date?: string
          lesson_number?: number | null
          lessons_count?: number | null
          notes?: string | null
          organization_id?: string
          paid_minutes?: number | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          teacher_hours_coefficient?: number
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
          {
            foreignKeyName: "lesson_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "lesson_sessions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          title?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "course_units"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_settings: {
        Row: {
          attendance_bonus_amount: number
          bonus_expiry_days: number | null
          branch: string
          created_at: string
          id: string
          is_active: boolean
          min_payment_for_bonus: number | null
          payment_bonus_percent: number
          updated_at: string
        }
        Insert: {
          attendance_bonus_amount?: number
          bonus_expiry_days?: number | null
          branch?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_payment_for_bonus?: number | null
          payment_bonus_percent?: number
          updated_at?: string
        }
        Update: {
          attendance_bonus_amount?: number
          bonus_expiry_days?: number | null
          branch?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_payment_for_bonus?: number | null
          payment_bonus_percent?: number
          updated_at?: string
        }
        Relationships: []
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
      max_channel_state: {
        Row: {
          channel_id: string
          connected_at: string | null
          created_at: string | null
          disconnected_at: string | null
          id: string
          last_error: string | null
          last_heartbeat_at: string | null
          status: string | null
          total_messages_received: number | null
          total_messages_sent: number | null
          updated_at: string | null
        }
        Insert: {
          channel_id: string
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          id?: string
          last_error?: string | null
          last_heartbeat_at?: string | null
          status?: string | null
          total_messages_received?: number | null
          total_messages_sent?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          id?: string
          last_error?: string | null
          last_heartbeat_at?: string | null
          status?: string | null
          total_messages_received?: number | null
          total_messages_sent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "max_channel_state_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "max_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      max_channels: {
        Row: {
          auto_start: boolean | null
          bot_id: number | null
          bot_username: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_error: string | null
          last_heartbeat_at: string | null
          messages_today: number | null
          messages_today_reset_at: string | null
          name: string
          organization_id: string
          status: string | null
          token_encrypted: string
          token_iv: string
          token_tag: string
          updated_at: string | null
        }
        Insert: {
          auto_start?: boolean | null
          bot_id?: number | null
          bot_username?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_error?: string | null
          last_heartbeat_at?: string | null
          messages_today?: number | null
          messages_today_reset_at?: string | null
          name: string
          organization_id: string
          status?: string | null
          token_encrypted: string
          token_iv: string
          token_tag: string
          updated_at?: string | null
        }
        Update: {
          auto_start?: boolean | null
          bot_id?: number | null
          bot_username?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_error?: string | null
          last_heartbeat_at?: string | null
          messages_today?: number | null
          messages_today_reset_at?: string | null
          name?: string
          organization_id?: string
          status?: string | null
          token_encrypted?: string
          token_iv?: string
          token_tag?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "max_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "max_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
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
      messages: {
        Row: {
          attachments: Json | null
          author_id: string | null
          created_at: string | null
          id: string
          role: string
          status: string
          text: string | null
          thread_id: string
          thread_type: string
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          status?: string
          text?: string | null
          thread_id: string
          thread_type: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          status?: string
          text?: string | null
          thread_id?: string
          thread_type?: string
        }
        Relationships: []
      }
      messenger_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          last_sync_at: string | null
          messenger_type: Database["public"]["Enums"]["messenger_type"]
          organization_id: string | null
          provider: string | null
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
          organization_id?: string | null
          provider?: string | null
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
          organization_id?: string | null
          provider?: string | null
          settings?: Json | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messenger_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string
          delivery_method: string[] | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          recipient_id: string
          recipient_type: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          delivery_method?: string[] | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          recipient_id: string
          recipient_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          delivery_method?: string[] | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          recipient_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_balance_transactions: {
        Row: {
          ai_requests_count: number | null
          amount: number
          created_at: string | null
          created_by: string | null
          currency_id: string | null
          description: string | null
          id: string
          metadata: Json | null
          organization_id: string
          transaction_type: string
        }
        Insert: {
          ai_requests_count?: number | null
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          transaction_type: string
        }
        Update: {
          ai_requests_count?: number | null
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_balance_transactions_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_balance_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_balance_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_balances: {
        Row: {
          balance: number
          created_at: string | null
          currency_id: string | null
          id: string
          organization_id: string
          total_spent: number
          total_topped_up: number
          updated_at: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency_id?: string | null
          id?: string
          organization_id: string
          total_spent?: number
          total_topped_up?: number
          updated_at?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency_id?: string | null
          id?: string
          organization_id?: string
          total_spent?: number
          total_topped_up?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_balances_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_branches: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          holihope_id: number | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          phone: string | null
          settings: Json | null
          sort_order: number | null
          updated_at: string
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          holihope_id?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          phone?: string | null
          settings?: Json | null
          sort_order?: number | null
          updated_at?: string
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          holihope_id?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          phone?: string | null
          settings?: Json | null
          sort_order?: number | null
          updated_at?: string
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organizations: {
        Row: {
          branding: Json | null
          created_at: string
          domain: string | null
          id: string
          max_branches: number | null
          max_students: number | null
          max_users: number | null
          name: string
          plan_type: string | null
          settings: Json | null
          slug: string
          status: string | null
          subscription_ends_at: string | null
          subscription_tier: string
          teacher_registration_enabled: boolean | null
          teacher_registration_token: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          branding?: Json | null
          created_at?: string
          domain?: string | null
          id?: string
          max_branches?: number | null
          max_students?: number | null
          max_users?: number | null
          name: string
          plan_type?: string | null
          settings?: Json | null
          slug: string
          status?: string | null
          subscription_ends_at?: string | null
          subscription_tier?: string
          teacher_registration_enabled?: boolean | null
          teacher_registration_token?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          branding?: Json | null
          created_at?: string
          domain?: string | null
          id?: string
          max_branches?: number | null
          max_students?: number | null
          max_users?: number | null
          name?: string
          plan_type?: string | null
          settings?: Json | null
          slug?: string
          status?: string | null
          subscription_ends_at?: string | null
          subscription_tier?: string
          teacher_registration_enabled?: boolean | null
          teacher_registration_token?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          external_id: string | null
          group_id: string | null
          id: string
          idempotency_key: string | null
          individual_lesson_id: string | null
          invoice_id: string | null
          lessons_count: number | null
          method: Database["public"]["Enums"]["finance_payment_method"]
          notes: string | null
          organization_id: string
          payment_date: string
          provider_transaction_id: string | null
          status: Database["public"]["Enums"]["finance_payment_status"]
          student_id: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_id?: string | null
          group_id?: string | null
          id?: string
          idempotency_key?: string | null
          individual_lesson_id?: string | null
          invoice_id?: string | null
          lessons_count?: number | null
          method: Database["public"]["Enums"]["finance_payment_method"]
          notes?: string | null
          organization_id?: string
          payment_date?: string
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["finance_payment_status"]
          student_id?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_id?: string | null
          group_id?: string | null
          id?: string
          idempotency_key?: string | null
          individual_lesson_id?: string | null
          invoice_id?: string | null
          lessons_count?: number | null
          method?: Database["public"]["Enums"]["finance_payment_method"]
          notes?: string | null
          organization_id?: string
          payment_date?: string
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["finance_payment_status"]
          student_id?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "learning_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_individual_lesson_id_fkey"
            columns: ["individual_lesson_id"]
            isOneToOne: false
            referencedRelation: "individual_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_monthly: {
        Row: {
          amount: number
          created_at: string | null
          hours: number
          lessons: number
          metadata: Json | null
          month: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          hours?: number
          lessons?: number
          metadata?: Json | null
          month: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          hours?: number
          lessons?: number
          metadata?: Json | null
          month?: string
          teacher_id?: string
          updated_at?: string | null
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
      placement_test_results: {
        Row: {
          accuracy_percent: number | null
          age_or_grade: string | null
          answers: Json
          completed_at: string
          correct_answers: number
          created_at: string | null
          email: string | null
          final_level: string
          id: string
          ip_address: string | null
          name: string
          phone: string | null
          started_at: string
          status: string
          time_spent_seconds: number
          total_questions: number
          track: string
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          accuracy_percent?: number | null
          age_or_grade?: string | null
          answers?: Json
          completed_at: string
          correct_answers: number
          created_at?: string | null
          email?: string | null
          final_level: string
          id?: string
          ip_address?: string | null
          name: string
          phone?: string | null
          started_at: string
          status?: string
          time_spent_seconds: number
          total_questions: number
          track: string
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          accuracy_percent?: number | null
          age_or_grade?: string | null
          answers?: Json
          completed_at?: string
          correct_answers?: number
          created_at?: string | null
          email?: string | null
          final_level?: string
          id?: string
          ip_address?: string | null
          name?: string
          phone?: string | null
          started_at?: string
          status?: string
          time_spent_seconds?: number
          total_questions?: number
          track?: string
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      price_list_items: {
        Row: {
          created_at: string
          currency_id: string | null
          id: string
          is_active: boolean
          price: number
          price_list_id: string
          service_category: Database["public"]["Enums"]["service_category_type"]
          service_name: string
          sort_order: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_id?: string | null
          id?: string
          is_active?: boolean
          price: number
          price_list_id: string
          service_category?: Database["public"]["Enums"]["service_category_type"]
          service_name: string
          sort_order?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_id?: string | null
          id?: string
          is_active?: boolean
          price?: number
          price_list_id?: string
          service_category?: Database["public"]["Enums"]["service_category_type"]
          service_name?: string
          sort_order?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          age_category: string | null
          branch: string
          created_at: string
          currency_id: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          age_category?: string | null
          branch?: string
          created_at?: string
          currency_id: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          age_category?: string | null
          branch?: string
          created_at?: string
          currency_id?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          is_active: boolean
          name: string
          package_hours: number | null
          price_amount: number
          price_list_id: string | null
          price_type: Database["public"]["Enums"]["finance_price_type"]
          updated_at: string
          valid_days: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean
          name: string
          package_hours?: number | null
          price_amount: number
          price_list_id?: string | null
          price_type?: Database["public"]["Enums"]["finance_price_type"]
          updated_at?: string
          valid_days?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean
          name?: string
          package_hours?: number | null
          price_amount?: number
          price_list_id?: string | null
          price_type?: Database["public"]["Enums"]["finance_price_type"]
          updated_at?: string
          valid_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      proficiency_levels: {
        Row: {
          created_at: string
          description: string | null
          external_id: string | null
          holihope_metadata: Json | null
          id: string
          is_active: boolean
          level_order: number
          name: string
          organization_id: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_id?: string | null
          holihope_metadata?: Json | null
          id?: string
          is_active?: boolean
          level_order?: number
          name: string
          organization_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_id?: string | null
          holihope_metadata?: Json | null
          id?: string
          is_active?: boolean
          level_order?: number
          name?: string
          organization_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proficiency_levels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proficiency_levels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          phone?: string | null
          sip_domain?: string | null
          sip_password?: string | null
          sip_transport?: string | null
          sip_ws_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      publication_queue: {
        Row: {
          attempts: number | null
          content_id: string | null
          created_at: string | null
          id: string
          last_error: string | null
          organization_id: string | null
          scheduled_at: string
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          attempts?: number | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          organization_id?: string | null
          scheduled_at: string
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          attempts?: number | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          organization_id?: string | null
          scheduled_at?: string
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_queue_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_docs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
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
      routing_rules: {
        Row: {
          actions: Json
          channel_id: string | null
          channel_type: string
          conditions: Json
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          name: string
          organization_id: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          channel_id?: string | null
          channel_type: string
          conditions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          organization_id: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          channel_id?: string | null
          channel_type?: string
          conditions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          organization_id?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      salebot_api_usage: {
        Row: {
          api_requests_count: number | null
          created_at: string | null
          date: string
          id: string
          max_daily_limit: number | null
          updated_at: string | null
        }
        Insert: {
          api_requests_count?: number | null
          created_at?: string | null
          date: string
          id?: string
          max_daily_limit?: number | null
          updated_at?: string | null
        }
        Update: {
          api_requests_count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          max_daily_limit?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salebot_import_progress: {
        Row: {
          created_at: string
          current_offset: number
          errors: Json | null
          estimated_total: number | null
          fill_ids_mode: boolean | null
          fill_ids_offset: number | null
          fill_ids_total_matched: number | null
          fill_ids_total_processed: number | null
          id: string
          is_paused: boolean
          is_running: boolean
          last_run_at: string | null
          list_id: string | null
          requires_manual_restart: boolean
          resync_mode: boolean | null
          resync_new_messages: number | null
          resync_offset: number | null
          resync_total_clients: number | null
          start_time: string | null
          total_clients_processed: number
          total_imported: number
          total_messages_imported: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_offset?: number
          errors?: Json | null
          estimated_total?: number | null
          fill_ids_mode?: boolean | null
          fill_ids_offset?: number | null
          fill_ids_total_matched?: number | null
          fill_ids_total_processed?: number | null
          id?: string
          is_paused?: boolean
          is_running?: boolean
          last_run_at?: string | null
          list_id?: string | null
          requires_manual_restart?: boolean
          resync_mode?: boolean | null
          resync_new_messages?: number | null
          resync_offset?: number | null
          resync_total_clients?: number | null
          start_time?: string | null
          total_clients_processed?: number
          total_imported?: number
          total_messages_imported?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_offset?: number
          errors?: Json | null
          estimated_total?: number | null
          fill_ids_mode?: boolean | null
          fill_ids_offset?: number | null
          fill_ids_total_matched?: number | null
          fill_ids_total_processed?: number | null
          id?: string
          is_paused?: boolean
          is_running?: boolean
          last_run_at?: string | null
          list_id?: string | null
          requires_manual_restart?: boolean
          resync_mode?: boolean | null
          resync_new_messages?: number | null
          resync_offset?: number | null
          resync_total_clients?: number | null
          start_time?: string | null
          total_clients_processed?: number
          total_imported?: number
          total_messages_imported?: number | null
          updated_at?: string
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
      search_console_queries: {
        Row: {
          clicks: number | null
          country: string | null
          created_at: string
          ctr: number | null
          date: string
          device: string | null
          id: string
          impressions: number | null
          organization_id: string
          page_url: string
          position: number | null
          query: string
          updated_at: string
        }
        Insert: {
          clicks?: number | null
          country?: string | null
          created_at?: string
          ctr?: number | null
          date: string
          device?: string | null
          id?: string
          impressions?: number | null
          organization_id: string
          page_url: string
          position?: number | null
          query: string
          updated_at?: string
        }
        Update: {
          clicks?: number | null
          country?: string | null
          created_at?: string
          ctr?: number | null
          date?: string
          device?: string | null
          id?: string
          impressions?: number | null
          organization_id?: string
          page_url?: string
          position?: number | null
          query?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_console_queries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_console_queries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      seo_job_logs: {
        Row: {
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          executed_at: string | null
          id: string
          job_name: string
          organization_id: string | null
          status: string
        }
        Insert: {
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          job_name: string
          organization_id?: string | null
          status: string
        }
        Update: {
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          job_name?: string
          organization_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_job_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_job_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      seo_pages: {
        Row: {
          analysis: Json | null
          created_at: string
          id: string
          last_analyzed_at: string | null
          organization_id: string
          updated_at: string
          url: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          id?: string
          last_analyzed_at?: string | null
          organization_id: string
          updated_at?: string
          url: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          id?: string
          last_analyzed_at?: string | null
          organization_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      student_attendance: {
        Row: {
          created_at: string | null
          id: string
          individual_lesson_session_id: string | null
          lesson_session_id: string | null
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          status: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          individual_lesson_session_id?: string | null
          lesson_session_id?: string | null
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          status?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          individual_lesson_session_id?: string | null
          lesson_session_id?: string | null
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          status?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_individual_lesson_session_id_fkey"
            columns: ["individual_lesson_session_id"]
            isOneToOne: false
            referencedRelation: "individual_lesson_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_lesson_session_id_fkey"
            columns: ["lesson_session_id"]
            isOneToOne: false
            referencedRelation: "lesson_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_balances_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      student_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          description: string | null
          event_category: string
          event_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          student_id: string
          title: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          description?: string | null
          event_category: string
          event_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          student_id: string
          title: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          description?: string | null
          event_category?: string
          event_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_homework: {
        Row: {
          completed_at: string | null
          created_at: string
          grade: string | null
          homework_id: string
          id: string
          status: string
          student_id: string
          student_notes: string | null
          teacher_notes: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          grade?: string | null
          homework_id: string
          id?: string
          status?: string
          student_id: string
          student_notes?: string | null
          teacher_notes?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          grade?: string | null
          homework_id?: string
          id?: string
          status?: string
          student_id?: string
          student_notes?: string | null
          teacher_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_homework_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_homework_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lesson_sessions: {
        Row: {
          attendance_status: string | null
          cancellation_reason: string | null
          created_at: string
          id: string
          is_cancelled_for_student: boolean | null
          lesson_session_id: string
          notes: string | null
          payment_amount: number | null
          payment_id: string | null
          payment_status: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_status?: string | null
          cancellation_reason?: string | null
          created_at?: string
          id?: string
          is_cancelled_for_student?: boolean | null
          lesson_session_id: string
          notes?: string | null
          payment_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_status?: string | null
          cancellation_reason?: string | null
          created_at?: string
          id?: string
          is_cancelled_for_student?: boolean | null
          lesson_session_id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
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
          {
            foreignKeyName: "student_lesson_sessions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary_contact: boolean
          last_name: string
          middle_name: string | null
          notification_preferences: Json | null
          phone: string | null
          relationship: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary_contact?: boolean
          last_name: string
          middle_name?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          relationship: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary_contact?: boolean
          last_name?: string
          middle_name?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          relationship?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_payers: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_invoice_recipient: boolean
          last_name: string
          middle_name: string | null
          payment_method: string | null
          phone: string | null
          relationship: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_invoice_recipient?: boolean
          last_name: string
          middle_name?: string | null
          payment_method?: string | null
          phone?: string | null
          relationship: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_invoice_recipient?: boolean
          last_name?: string
          middle_name?: string | null
          payment_method?: string | null
          phone?: string | null
          relationship?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_payers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_segments: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          filters: Json
          id: string
          is_global: boolean
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          filters?: Json
          id?: string
          is_global?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          filters?: Json
          id?: string
          is_global?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      student_statuses: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          is_active: boolean
          is_failure: boolean
          is_success: boolean
          name: string
          organization_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          is_failure?: boolean
          is_success?: boolean
          name: string
          organization_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          is_failure?: boolean
          is_success?: boolean
          name?: string
          organization_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          age: number
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          external_id: string | null
          extra_fields: Json | null
          family_group_id: string
          first_name: string | null
          gender: string | null
          holihope_metadata: Json | null
          id: string
          last_name: string | null
          lk_email: string | null
          middle_name: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          status: Database["public"]["Enums"]["student_status"]
          student_number: string | null
          updated_at: string
        }
        Insert: {
          age: number
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          external_id?: string | null
          extra_fields?: Json | null
          family_group_id: string
          first_name?: string | null
          gender?: string | null
          holihope_metadata?: Json | null
          id?: string
          last_name?: string | null
          lk_email?: string | null
          middle_name?: string | null
          name: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_number?: string | null
          updated_at?: string
        }
        Update: {
          age?: number
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          external_id?: string | null
          extra_fields?: Json | null
          family_group_id?: string
          first_name?: string | null
          gender?: string | null
          holihope_metadata?: Json | null
          id?: string
          last_name?: string | null
          lk_email?: string | null
          middle_name?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_number?: string | null
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
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          external_id: string | null
          holihope_metadata: Json | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_id?: string | null
          holihope_metadata?: Json | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_id?: string | null
          holihope_metadata?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      subscription_freezes: {
        Row: {
          created_at: string
          created_by: string | null
          days_count: number
          description: string | null
          end_date: string
          id: string
          reason: string
          start_date: string
          subscription_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_count: number
          description?: string | null
          end_date: string
          id?: string
          reason: string
          start_date: string
          subscription_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_count?: number
          description?: string | null
          end_date?: string
          id?: string
          reason?: string
          start_date?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_freezes_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          age_category: Database["public"]["Enums"]["group_category"] | null
          auto_renewal: boolean | null
          branch: string | null
          created_at: string
          description: string | null
          duration_days: number | null
          freeze_days_allowed: number | null
          id: string
          is_active: boolean | null
          lessons_count: number | null
          makeup_lessons_count: number | null
          max_level: string | null
          min_level: string | null
          name: string
          price: number
          price_per_lesson: number | null
          sort_order: number | null
          subject: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          updated_at: string
        }
        Insert: {
          age_category?: Database["public"]["Enums"]["group_category"] | null
          auto_renewal?: boolean | null
          branch?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          freeze_days_allowed?: number | null
          id?: string
          is_active?: boolean | null
          lessons_count?: number | null
          makeup_lessons_count?: number | null
          max_level?: string | null
          min_level?: string | null
          name: string
          price: number
          price_per_lesson?: number | null
          sort_order?: number | null
          subject?: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
        }
        Update: {
          age_category?: Database["public"]["Enums"]["group_category"] | null
          auto_renewal?: boolean | null
          branch?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          freeze_days_allowed?: number | null
          id?: string
          is_active?: boolean | null
          lessons_count?: number | null
          makeup_lessons_count?: number | null
          max_level?: string | null
          min_level?: string | null
          name?: string
          price?: number
          price_per_lesson?: number | null
          sort_order?: number | null
          subject?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
        }
        Relationships: []
      }
      subscription_transactions: {
        Row: {
          amount_changed: number | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          lesson_session_id: string | null
          lessons_changed: number | null
          reason: string | null
          subscription_id: string
          transaction_type: string
        }
        Insert: {
          amount_changed?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          lesson_session_id?: string | null
          lessons_changed?: number | null
          reason?: string | null
          subscription_id: string
          transaction_type: string
        }
        Update: {
          amount_changed?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          lesson_session_id?: string | null
          lessons_changed?: number | null
          reason?: string | null
          subscription_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_transactions_lesson_session_id_fkey"
            columns: ["lesson_session_id"]
            isOneToOne: false
            referencedRelation: "lesson_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_charge: boolean | null
          branch: string
          created_at: string
          created_by: string | null
          discount_amount: number | null
          discount_percent: number | null
          end_date: string | null
          freeze_enabled: boolean | null
          group_id: string | null
          id: string
          level: string | null
          makeup_lessons_allowed: boolean | null
          name: string
          notes: string | null
          price_per_lesson: number | null
          remaining_lessons: number | null
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          student_id: string
          subject: string
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          total_lessons: number | null
          total_price: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          auto_charge?: boolean | null
          branch?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          end_date?: string | null
          freeze_enabled?: boolean | null
          group_id?: string | null
          id?: string
          level?: string | null
          makeup_lessons_allowed?: boolean | null
          name: string
          notes?: string | null
          price_per_lesson?: number | null
          remaining_lessons?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status"]
          student_id: string
          subject?: string
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          total_lessons?: number | null
          total_price: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          auto_charge?: boolean | null
          branch?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          end_date?: string | null
          freeze_enabled?: boolean | null
          group_id?: string | null
          id?: string
          level?: string | null
          makeup_lessons_allowed?: boolean | null
          name?: string
          notes?: string | null
          price_per_lesson?: number | null
          remaining_lessons?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          student_id?: string
          subject?: string
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          total_lessons?: number | null
          total_price?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "learning_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          organization_id: string | null
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string | null
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
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
      teacher_bbb_rooms: {
        Row: {
          attendee_password: string
          created_at: string | null
          id: string
          is_active: boolean | null
          meeting_id: string
          meeting_url: string
          moderator_password: string
          teacher_id: string | null
          teacher_name: string
          updated_at: string | null
        }
        Insert: {
          attendee_password?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          meeting_id: string
          meeting_url: string
          moderator_password?: string
          teacher_id?: string | null
          teacher_name: string
          updated_at?: string | null
        }
        Update: {
          attendee_password?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          meeting_id?: string
          meeting_url?: string
          moderator_password?: string
          teacher_id?: string | null
          teacher_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_bbb_rooms_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_bbb_rooms_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_with_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_branches: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "organization_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_branches_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_branches_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_with_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_earnings: {
        Row: {
          academic_hours: number
          amount: number
          created_at: string
          currency: string
          earning_date: string
          id: string
          individual_lesson_session_id: string | null
          lesson_session_id: string | null
          notes: string | null
          organization_id: string
          payment_id: string | null
          rate_per_hour: number
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_hours: number
          amount: number
          created_at?: string
          currency?: string
          earning_date: string
          id?: string
          individual_lesson_session_id?: string | null
          lesson_session_id?: string | null
          notes?: string | null
          organization_id?: string
          payment_id?: string | null
          rate_per_hour: number
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_hours?: number
          amount?: number
          created_at?: string
          currency?: string
          earning_date?: string
          id?: string
          individual_lesson_session_id?: string | null
          lesson_session_id?: string | null
          notes?: string | null
          organization_id?: string
          payment_id?: string | null
          rate_per_hour?: number
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_earnings_individual_lesson_session_id_fkey"
            columns: ["individual_lesson_session_id"]
            isOneToOne: false
            referencedRelation: "individual_lesson_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_earnings_lesson_session_id_fkey"
            columns: ["lesson_session_id"]
            isOneToOne: false
            referencedRelation: "lesson_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_earnings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_earnings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      teacher_group_payments: {
        Row: {
          created_at: string
          group_id: string
          id: string
          lessons_count: number
          notes: string | null
          paid: boolean | null
          paid_at: string | null
          period_end: string
          period_start: string
          rate_per_lesson: number
          teacher_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          lessons_count?: number
          notes?: string | null
          paid?: boolean | null
          paid_at?: string | null
          period_end: string
          period_start: string
          rate_per_lesson: number
          teacher_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          lessons_count?: number
          notes?: string | null
          paid?: boolean | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          rate_per_lesson?: number
          teacher_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_group_payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "learning_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_group_payments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      teacher_payments: {
        Row: {
          adjustments: number
          calculated_amount: number
          created_at: string
          created_by: string | null
          currency: string
          final_amount: number
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_type: string
          period_end: string
          period_start: string
          rate_per_hour: number | null
          status: string
          teacher_id: string
          total_hours: number
          updated_at: string
        }
        Insert: {
          adjustments?: number
          calculated_amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          final_amount: number
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_type: string
          period_end: string
          period_start: string
          rate_per_hour?: number | null
          status?: string
          teacher_id: string
          total_hours?: number
          updated_at?: string
        }
        Update: {
          adjustments?: number
          calculated_amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          final_amount?: number
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_type?: string
          period_end?: string
          period_start?: string
          rate_per_hour?: number | null
          status?: string
          teacher_id?: string
          total_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      teacher_rates: {
        Row: {
          branch: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          notes: string | null
          rate_per_academic_hour: number
          rate_type: string
          subject: string | null
          teacher_id: string | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          branch?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          rate_per_academic_hour: number
          rate_type: string
          subject?: string | null
          teacher_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          branch?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          rate_per_academic_hour?: number
          rate_type?: string
          subject?: string | null
          teacher_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      teacher_substitutions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          individual_lesson_session_id: string | null
          lesson_session_id: string | null
          notes: string | null
          original_teacher_id: string
          reason: string | null
          status: string
          substitute_teacher_id: string
          substitution_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          individual_lesson_session_id?: string | null
          lesson_session_id?: string | null
          notes?: string | null
          original_teacher_id: string
          reason?: string | null
          status?: string
          substitute_teacher_id: string
          substitution_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          individual_lesson_session_id?: string | null
          lesson_session_id?: string | null
          notes?: string | null
          original_teacher_id?: string
          reason?: string | null
          status?: string
          substitute_teacher_id?: string
          substitution_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          birth_place: string | null
          birthdate: string | null
          branch: string
          categories: string[] | null
          created_at: string
          email: string | null
          external_id: string | null
          first_name: string
          holihope_metadata: Json | null
          id: string
          inn: string | null
          is_active: boolean
          last_name: string
          passport_issued_by: string | null
          passport_issued_date: string | null
          passport_number: string | null
          passport_series: string | null
          phone: string | null
          profile_id: string | null
          registration_address: string | null
          residential_address: string | null
          snils: string | null
          subjects: string[] | null
          updated_at: string
        }
        Insert: {
          birth_place?: string | null
          birthdate?: string | null
          branch?: string
          categories?: string[] | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          first_name: string
          holihope_metadata?: Json | null
          id?: string
          inn?: string | null
          is_active?: boolean
          last_name: string
          passport_issued_by?: string | null
          passport_issued_date?: string | null
          passport_number?: string | null
          passport_series?: string | null
          phone?: string | null
          profile_id?: string | null
          registration_address?: string | null
          residential_address?: string | null
          snils?: string | null
          subjects?: string[] | null
          updated_at?: string
        }
        Update: {
          birth_place?: string | null
          birthdate?: string | null
          branch?: string
          categories?: string[] | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          first_name?: string
          holihope_metadata?: Json | null
          id?: string
          inn?: string | null
          is_active?: boolean
          last_name?: string
          passport_issued_by?: string | null
          passport_issued_date?: string | null
          passport_number?: string | null
          passport_series?: string | null
          phone?: string | null
          profile_id?: string | null
          registration_address?: string | null
          residential_address?: string | null
          snils?: string | null
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          program_type?: string | null
          sort_order?: number | null
          subcategory?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "textbooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "textbooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
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
      user_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_granted: boolean
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_granted?: boolean
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_granted?: boolean
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      whatsapp_sessions: {
        Row: {
          created_at: string
          external_instance_id: string | null
          id: string
          last_qr_at: string | null
          last_qr_b64: string | null
          organization_id: string
          session_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_instance_id?: string | null
          id?: string
          last_qr_at?: string | null
          last_qr_b64?: string | null
          organization_id: string
          session_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_instance_id?: string | null
          id?: string
          last_qr_at?: string | null
          last_qr_b64?: string | null
          organization_id?: string
          session_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
        ]
      }
    }
    Views: {
      catalog: {
        Row: {
          author_id: string | null
          avg_rating: number | null
          created_at: string | null
          description: string | null
          id: string | null
          install_count: number | null
          kind: string | null
          latest_version: number | null
          level: string | null
          meta: Json | null
          preview_url: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      teachers_with_branches: {
        Row: {
          birth_place: string | null
          birthdate: string | null
          branch: string | null
          branches: Json | null
          categories: string[] | null
          created_at: string | null
          email: string | null
          external_id: string | null
          first_name: string | null
          holihope_metadata: Json | null
          id: string | null
          inn: string | null
          is_active: boolean | null
          last_name: string | null
          passport_issued_by: string | null
          passport_issued_date: string | null
          passport_number: string | null
          passport_series: string | null
          phone: string | null
          profile_id: string | null
          registration_address: string | null
          residential_address: string | null
          snils: string | null
          subjects: string[] | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_ai_provider_keys_public: {
        Row: {
          created_at: string | null
          id: string | null
          key_label: string | null
          key_preview: string | null
          limit_monthly: number | null
          limit_remaining: number | null
          organization_id: string | null
          provider: string | null
          reset_policy: string | null
          status: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          key_label?: string | null
          key_preview?: string | null
          limit_monthly?: number | null
          limit_remaining?: number | null
          organization_id?: string | null
          provider?: string | null
          reset_policy?: string | null
          status?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          key_label?: string | null
          key_preview?: string | null
          limit_monthly?: number | null
          limit_remaining?: number | null
          organization_id?: string | null
          provider?: string | null
          reset_policy?: string | null
          status?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_provider_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_ai_settings"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ai_provider_keys_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_provider_keys_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_with_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      v_organization_ai_settings: {
        Row: {
          ai_limit: number | null
          key_status: string | null
          key_type: string | null
          limit_monthly: number | null
          limit_remaining: number | null
          organization_id: string | null
          organization_name: string | null
          subscription_tier: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accrue_teacher_earning_for_lesson: {
        Args: {
          _individual_lesson_session_id?: string
          _lesson_session_id?: string
        }
        Returns: string
      }
      add_balance_transaction: {
        Args: {
          _amount: number
          _description: string
          _lesson_session_id?: string
          _payment_id?: string
          _student_id: string
          _transaction_type: Database["public"]["Enums"]["balance_transaction_type"]
        }
        Returns: undefined
      }
      add_sheet_row: { Args: { p_table_name: string }; Returns: Json }
      app_fingerprint: {
        Args: { p_description: string; p_kind: string; p_level: string }
        Returns: string
      }
      batch_update_salebot_ids: {
        Args: { p_client_ids: string[]; p_salebot_ids: number[] }
        Returns: number
      }
      calculate_cluster_score: {
        Args: {
          p_business_value?: number
          p_difficulty: number
          p_monthly_searches: number
          p_trend?: number
        }
        Returns: number
      }
      calculate_teacher_payment: {
        Args: {
          p_group_id: string
          p_period_end: string
          p_period_start: string
          p_rate_per_lesson: number
          p_teacher_id: string
        }
        Returns: {
          lessons_count: number
          total_amount: number
        }[]
      }
      calculate_teacher_salary: {
        Args: {
          _period_end: string
          _period_start: string
          _teacher_id: string
        }
        Returns: {
          accrued_count: number
          paid_count: number
          total_amount: number
          total_hours: number
        }[]
      }
      can_view_ai_keys: { Args: never; Returns: boolean }
      charge_ai_usage: {
        Args: {
          p_metadata?: Json
          p_model: string
          p_organization_id: string
          p_provider: string
          p_requests_count?: number
        }
        Returns: boolean
      }
      charge_lesson_from_subscription: {
        Args: {
          _lesson_session_id: string
          _reason?: string
          _subscription_id: string
        }
        Returns: boolean
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
      check_group_permission: {
        Args: { p_group_id: string; p_permission: string; p_user_id: string }
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
      check_salebot_api_limit: { Args: never; Returns: boolean }
      check_student_balance: {
        Args: { p_required_hours?: number; p_student_id: string }
        Returns: {
          current_balance_hours: number
          current_balance_rub: number
          has_sufficient_balance: boolean
          message: string
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
      cleanup_old_cron_logs: { Args: never; Returns: undefined }
      cleanup_old_typing_status: { Args: never; Returns: undefined }
      complete_ai_key_job: { Args: { p_id: number }; Returns: undefined }
      count_clients_without_imported_messages: {
        Args: { p_org_id: string }
        Returns: number
      }
      create_internal_group_chat: {
        Args: {
          p_branch?: string
          p_chat_type?: string
          p_description?: string
          p_name: string
          p_participant_user_ids?: string[]
        }
        Returns: string
      }
      delete_sheet_rows: {
        Args: { p_row_ids: string[]; p_table_name: string }
        Returns: undefined
      }
      dequeue_ai_key_job: {
        Args: never
        Returns: {
          entity_name: string
          id: number
          monthly_limit: number
          organization_id: string
          reset_policy: string
          teacher_id: string
        }[]
      }
      fail_ai_key_job: {
        Args: { p_backoff_seconds: number; p_error: string; p_id: number }
        Returns: undefined
      }
      find_available_teachers: {
        Args: {
          p_branch: string
          p_date: string
          p_subject: string
          p_time: string
        }
        Returns: {
          conflict_count: number
          first_name: string
          has_conflict: boolean
          last_name: string
          teacher_id: string
        }[]
      }
      find_or_create_telegram_client: {
        Args: {
          p_avatar_url?: string
          p_name: string
          p_org_id: string
          p_phone?: string
          p_telegram_chat_id: string
          p_telegram_user_id: number
          p_username?: string
        }
        Returns: string
      }
      find_similar_routes: {
        Args: { p_route: string; p_threshold?: number }
        Returns: {
          route: string
          similarity: number
        }[]
      }
      find_weak_seo_pages: {
        Args: {
          p_max_ctr?: number
          p_min_bounce?: number
          p_min_days?: number
          p_min_position?: number
        }
        Returns: {
          avg_bounce: number
          avg_ctr: number
          avg_position: number
          days_since_publish: number
          idea_id: string
          route: string
        }[]
      }
      freeze_subscription: {
        Args: {
          _end_date: string
          _reason: string
          _start_date: string
          _subscription_id: string
        }
        Returns: boolean
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
      get_ai_provider_setting: { Args: never; Returns: string }
      get_campaign_recipients: {
        Args: { p_filters: Json; p_target_audience: string }
        Returns: {
          user_email: string
          user_id: string
          user_name: string
          user_phone: string
        }[]
      }
      get_chat_pin_counts: {
        Args: { _chat_ids: string[] }
        Returns: {
          chat_id: string
          pin_count: number
        }[]
      }
      get_chat_threads_by_client_ids: {
        Args: { p_client_ids: string[] }
        Returns: {
          avatar_url: string
          client_branch: string
          client_id: string
          client_name: string
          client_phone: string
          last_message: string
          last_message_time: string
          last_unread_messenger: string
          max_avatar_url: string
          telegram_avatar_url: string
          telegram_chat_id: string
          unread_calls: number
          unread_count: number
          unread_email: number
          unread_max: number
          unread_telegram: number
          unread_whatsapp: number
          whatsapp_avatar_url: string
        }[]
      }
      get_chat_threads_fast: {
        Args: { p_limit?: number }
        Returns: {
          client_id: string
          client_name: string
          client_phone: string
          last_message: string
          last_message_time: string
          last_unread_messenger: string
          unread_calls: number
          unread_count: number
          unread_email: number
          unread_max: number
          unread_telegram: number
          unread_whatsapp: number
        }[]
      }
      get_chat_threads_optimized: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          client_branch: string
          client_id: string
          client_name: string
          client_phone: string
          last_message: string
          last_message_time: string
          last_unread_messenger: string
          max_avatar_url: string
          telegram_avatar_url: string
          telegram_chat_id: string
          unread_calls: number
          unread_count: number
          unread_email: number
          unread_max: number
          unread_telegram: number
          unread_whatsapp: number
          whatsapp_avatar_url: string
        }[]
      }
      get_clients_without_imported_messages: {
        Args: { p_limit?: number; p_offset?: number; p_org_id: string }
        Returns: {
          id: string
          name: string
          salebot_client_id: number
        }[]
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_group_debt_stats: {
        Args: { p_group_id: string }
        Returns: {
          average_balance: number
          students_with_debt: number
          total_debt: number
          total_paid: number
          total_students: number
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
      get_my_organization_id: { Args: never; Returns: string }
      get_or_create_salebot_usage: {
        Args: never
        Returns: {
          api_requests_count: number | null
          created_at: string | null
          date: string
          id: string
          max_daily_limit: number | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "salebot_api_usage"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_organization_ai_limit: {
        Args: { p_organization_id: string }
        Returns: number
      }
      get_public_schedule:
        | {
            Args: never
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
        | {
            Args: { branch_name?: string }
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
      get_sheet_columns: { Args: { p_sheet_id: string }; Returns: Json }
      get_sheet_data: { Args: { p_table_name: string }; Returns: Json }
      get_sheets: { Args: never; Returns: Json }
      get_student_balance: {
        Args: { _student_id: string }
        Returns: {
          balance: number
          created_at: string
          student_id: string
          updated_at: string
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
      get_subscription_stats: {
        Args: { _subscription_id: string }
        Returns: Json
      }
      get_teacher_rate: {
        Args: {
          _branch?: string
          _date?: string
          _subject?: string
          _teacher_id: string
        }
        Returns: number
      }
      get_user_branches: { Args: { _user_id: string }; Returns: string[] }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          is_granted: boolean
          permission_key: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_sheet_rows: {
        Args: { p_rows: Json; p_table_name: string }
        Returns: Json
      }
      increment_import_progress: {
        Args: {
          p_clients_count: number
          p_errors?: string[]
          p_imported_count: number
          p_messages_count: number
          p_new_offset: number
          p_progress_id: string
        }
        Returns: undefined
      }
      increment_salebot_api_usage: {
        Args: { increment_by?: number }
        Returns: {
          api_requests_count: number | null
          created_at: string | null
          date: string
          id: string
          max_daily_limit: number | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "salebot_api_usage"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_audit_event: {
        Args: {
          p_aggregate_id: string
          p_aggregate_type: string
          p_event_type: string
          p_new_value?: Json
          p_old_value?: Json
          p_request_id?: string
        }
        Returns: string
      }
      manual_compensate_payment: {
        Args: { p_payment_id: string; p_reason?: string }
        Returns: Json
      }
      mark_chat_messages_as_read: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      mark_chat_messages_as_read_by_messenger: {
        Args: { p_client_id: string; p_messenger_type: string }
        Returns: undefined
      }
      mark_internal_messages_as_read: {
        Args: { p_chat_id: string; p_message_ids?: string[] }
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
      normalize_phone: { Args: { phone_input: string }; Returns: string }
      process_pending_events: {
        Args: { p_limit?: number }
        Returns: {
          aggregate_id: string
          aggregate_type: string
          event_id: string
          event_type: string
          metadata: Json
          organization_id: string
          payload: Json
        }[]
      }
      publish_event: {
        Args: {
          p_aggregate_id: string
          p_aggregate_type: string
          p_event_type: string
          p_metadata?: Json
          p_organization_id?: string
          p_payload?: Json
        }
        Returns: string
      }
      refund_lesson_to_subscription: {
        Args: {
          _lesson_session_id: string
          _reason?: string
          _subscription_id: string
        }
        Returns: boolean
      }
      resolve_ai_model: {
        Args: { p_organization_id: string; p_use_case?: string }
        Returns: string
      }
      send_internal_chat_message: {
        Args: {
          p_chat_id: string
          p_file_name?: string
          p_file_type?: string
          p_file_url?: string
          p_message_text: string
          p_message_type?: string
          p_reply_to_message_id?: string
        }
        Returns: string
      }
      similar_apps: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          description: string
          id: string
          kind: string
          level: string
          similarity: number
          title: string
        }[]
      }
      sync_auto_group_students: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      topup_organization_balance: {
        Args: {
          p_amount: number
          p_description?: string
          p_organization_id: string
        }
        Returns: string
      }
      try_acquire_import_lock: {
        Args: never
        Returns: {
          acquired: boolean
          current_offset: number
          progress_id: string
        }[]
      }
      unfreeze_subscription: {
        Args: { _subscription_id: string }
        Returns: boolean
      }
      update_sheet_cell: {
        Args: {
          p_column: string
          p_row_id: string
          p_table_name: string
          p_value: string
        }
        Returns: undefined
      }
      user_has_branch: { Args: { _branch: string }; Returns: boolean }
      user_has_permission:
        | {
            Args: { _permission: string; _resource: string; _user_id: string }
            Returns: boolean
          }
        | {
            Args: { _permission_key: string; _user_id: string }
            Returns: boolean
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
        | "support"
        | "parent"
      balance_transaction_type: "credit" | "debit" | "transfer_in" | "refund"
      bonus_transaction_type: "earned" | "spent" | "expired"
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      finance_invoice_status:
        | "draft"
        | "sent"
        | "paid"
        | "overdue"
        | "cancelled"
      finance_payment_method: "cash" | "card" | "transfer" | "online"
      finance_payment_status: "pending" | "completed" | "failed" | "refunded"
      finance_price_type: "hourly" | "daily" | "monthly"
      group_category: "preschool" | "school" | "adult" | "all"
      group_status:
        | "reserve"
        | "forming"
        | "active"
        | "suspended"
        | "finished"
        | "paused"
        | "dropped"
      group_student_status: "active" | "paused" | "completed" | "dropped"
      group_type: "general" | "individual" | "mini" | "corporate"
      lesson_status:
        | "scheduled"
        | "cancelled"
        | "completed"
        | "rescheduled"
        | "free"
        | "free_skip"
        | "paid_skip"
      message_status:
        | "queued"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
        | "noAccount"
      messenger_type: "whatsapp" | "telegram" | "system" | "max" | "email"
      payment_method: "per_lesson" | "monthly" | "course" | "package"
      payment_method_type: "cash" | "card" | "bank_transfer" | "online"
      relationship_type: "main" | "spouse" | "parent" | "guardian" | "other"
      service_category_type:
        | "individual"
        | "group"
        | "club"
        | "workshop"
        | "intensive"
        | "online"
      student_status:
        | "active"
        | "inactive"
        | "trial"
        | "graduated"
        | "not_started"
        | "on_pause"
        | "archived"
        | "expelled"
      subscription_status: "active" | "paused" | "expired" | "cancelled"
      subscription_type: "per_lesson" | "monthly" | "weekly"
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
        "support",
        "parent",
      ],
      balance_transaction_type: ["credit", "debit", "transfer_in", "refund"],
      bonus_transaction_type: ["earned", "spent", "expired"],
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      finance_invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      finance_payment_method: ["cash", "card", "transfer", "online"],
      finance_payment_status: ["pending", "completed", "failed", "refunded"],
      finance_price_type: ["hourly", "daily", "monthly"],
      group_category: ["preschool", "school", "adult", "all"],
      group_status: [
        "reserve",
        "forming",
        "active",
        "suspended",
        "finished",
        "paused",
        "dropped",
      ],
      group_student_status: ["active", "paused", "completed", "dropped"],
      group_type: ["general", "individual", "mini", "corporate"],
      lesson_status: [
        "scheduled",
        "cancelled",
        "completed",
        "rescheduled",
        "free",
        "free_skip",
        "paid_skip",
      ],
      message_status: [
        "queued",
        "sent",
        "delivered",
        "read",
        "failed",
        "noAccount",
      ],
      messenger_type: ["whatsapp", "telegram", "system", "max", "email"],
      payment_method: ["per_lesson", "monthly", "course", "package"],
      payment_method_type: ["cash", "card", "bank_transfer", "online"],
      relationship_type: ["main", "spouse", "parent", "guardian", "other"],
      service_category_type: [
        "individual",
        "group",
        "club",
        "workshop",
        "intensive",
        "online",
      ],
      student_status: [
        "active",
        "inactive",
        "trial",
        "graduated",
        "not_started",
        "on_pause",
        "archived",
        "expelled",
      ],
      subscription_status: ["active", "paused", "expired", "cancelled"],
      subscription_type: ["per_lesson", "monthly", "weekly"],
    },
  },
} as const
