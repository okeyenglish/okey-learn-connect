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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          client_id: string | null
          content: string | null
          created_at: string
          direction: string
          external_id: string | null
          file_name: string | null
          id: string
          is_read: boolean | null
          media_type: string | null
          media_url: string | null
          message_type: string | null
          messenger: string | null
          metadata: Json | null
          organization_id: string
          read_at: string | null
          reply_to_id: string | null
          sender_id: string | null
          sender_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string
          external_id?: string | null
          file_name?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          messenger?: string | null
          metadata?: Json | null
          organization_id: string
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
          sender_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string
          external_id?: string | null
          file_name?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          messenger?: string | null
          metadata?: Json | null
          organization_id?: string
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
          sender_name?: string | null
          status?: string | null
          updated_at?: string
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
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          branch: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_message_at: string | null
          last_name: string | null
          middle_name: string | null
          name: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          salebot_client_id: string | null
          source: string | null
          status: string | null
          telegram_user_id: string | null
          updated_at: string
          whatsapp_id: string | null
        }
        Insert: {
          branch?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_message_at?: string | null
          last_name?: string | null
          middle_name?: string | null
          name?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          salebot_client_id?: string | null
          source?: string | null
          status?: string | null
          telegram_user_id?: string | null
          updated_at?: string
          whatsapp_id?: string | null
        }
        Update: {
          branch?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_message_at?: string | null
          last_name?: string | null
          middle_name?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          salebot_client_id?: string | null
          source?: string | null
          status?: string | null
          telegram_user_id?: string | null
          updated_at?: string
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_groups: {
        Row: {
          branch: string | null
          category: string | null
          created_at: string
          current_students: number | null
          group_type: string | null
          id: string
          is_active: boolean | null
          level: string | null
          max_students: number | null
          name: string
          organization_id: string
          responsible_teacher: string | null
          schedule_days: string[] | null
          schedule_time: string | null
          status: string | null
          subject: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          branch?: string | null
          category?: string | null
          created_at?: string
          current_students?: number | null
          group_type?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          max_students?: number | null
          name: string
          organization_id: string
          responsible_teacher?: string | null
          schedule_days?: string[] | null
          schedule_time?: string | null
          status?: string | null
          subject?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          branch?: string | null
          category?: string | null
          created_at?: string
          current_students?: number | null
          group_type?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          max_students?: number | null
          name?: string
          organization_id?: string
          responsible_teacher?: string | null
          schedule_days?: string[] | null
          schedule_time?: string | null
          status?: string | null
          subject?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_sessions: {
        Row: {
          branch: string | null
          classroom: string | null
          created_at: string
          end_time: string | null
          group_id: string | null
          id: string
          lesson_date: string
          notes: string | null
          organization_id: string
          start_time: string
          status: string | null
          teacher_id: string | null
          teacher_name: string | null
          updated_at: string
        }
        Insert: {
          branch?: string | null
          classroom?: string | null
          created_at?: string
          end_time?: string | null
          group_id?: string | null
          id?: string
          lesson_date: string
          notes?: string | null
          organization_id: string
          start_time: string
          status?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
          updated_at?: string
        }
        Update: {
          branch?: string | null
          classroom?: string | null
          created_at?: string
          end_time?: string | null
          group_id?: string | null
          id?: string
          lesson_date?: string
          notes?: string | null
          organization_id?: string
          start_time?: string
          status?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
          updated_at?: string
        }
        Relationships: [
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
            foreignKeyName: "lesson_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          messenger_type: string
          organization_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          messenger_type: string
          organization_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          messenger_type?: string
          organization_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
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
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          keys: Json
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          keys: Json
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          keys?: Json
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          age: number | null
          balance: number | null
          birth_date: string | null
          branch: string | null
          client_id: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          level: string | null
          middle_name: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          balance?: number | null
          birth_date?: string | null
          branch?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          level?: string | null
          middle_name?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          balance?: number | null
          birth_date?: string | null
          branch?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          level?: string | null
          middle_name?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          branch: string | null
          categories: string[] | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string | null
          organization_id: string
          phone: string | null
          profile_id: string | null
          subjects: string[] | null
          updated_at: string
        }
        Insert: {
          branch?: string | null
          categories?: string[] | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          organization_id: string
          phone?: string | null
          profile_id?: string | null
          subjects?: string[] | null
          updated_at?: string
        }
        Update: {
          branch?: string | null
          categories?: string[] | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          organization_id?: string
          phone?: string | null
          profile_id?: string | null
          subjects?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_lesson_requests: {
        Row: {
          branch_address: string | null
          branch_name: string
          comment: string | null
          created_at: string
          id: string
          name: string
          organization_id: string | null
          phone: string
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          branch_address?: string | null
          branch_name: string
          comment?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          phone: string
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          branch_address?: string | null
          branch_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string
          source?: string | null
          status?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "teacher"
        | "branch_manager"
        | "accountant"
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
      app_role: ["admin", "manager", "teacher", "branch_manager", "accountant"],
    },
  },
} as const
