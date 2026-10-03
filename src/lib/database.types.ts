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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          psychologist_id: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          psychologist_id: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          psychologist_id?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          for_date: string | null
          id: string
          kind: string
          psychologist_id: string
          sent_at: string
          session_id: string | null
        }
        Insert: {
          for_date?: string | null
          id?: string
          kind: string
          psychologist_id: string
          sent_at?: string
          session_id?: string | null
        }
        Update: {
          for_date?: string | null
          id?: string
          kind?: string
          psychologist_id?: string
          sent_at?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_session_id_psychologist_id_fkey"
            columns: ["session_id", "psychologist_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "psychologist_id"]
          },
        ]
      }
      patients: {
        Row: {
          active: boolean
          birth_date: string | null
          created_at: string
          dni: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          modality: string
          phone: string | null
          psychologist_id: string
          session_fee: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          birth_date?: string | null
          created_at?: string
          dni?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string
          modality?: string
          phone?: string | null
          psychologist_id?: string
          session_fee?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          birth_date?: string | null
          created_at?: string
          dni?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          modality?: string
          phone?: string | null
          psychologist_id?: string
          session_fee?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          calendar_view: string
          created_at: string
          daily_summary_enabled: boolean
          daily_summary_time: string
          default_modality: string
          default_session_fee: number | null
          default_session_minutes: number
          first_name: string
          font_size: string
          id: string
          idle_timeout_minutes: number
          last_name: string
          license_number: string | null
          notification_show_name: boolean
          reminder_minutes: number | null
          terms_accepted_at: string | null
          terms_version: string | null
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          calendar_view?: string
          created_at?: string
          daily_summary_enabled?: boolean
          daily_summary_time?: string
          default_modality?: string
          default_session_fee?: number | null
          default_session_minutes?: number
          first_name?: string
          font_size?: string
          id: string
          idle_timeout_minutes?: number
          last_name?: string
          license_number?: string | null
          notification_show_name?: boolean
          reminder_minutes?: number | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          calendar_view?: string
          created_at?: string
          daily_summary_enabled?: boolean
          daily_summary_time?: string
          default_modality?: string
          default_session_fee?: number | null
          default_session_minutes?: number
          first_name?: string
          font_size?: string
          id?: string
          idle_timeout_minutes?: number
          last_name?: string
          license_number?: string | null
          notification_show_name?: boolean
          reminder_minutes?: number | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          psychologist_id: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          psychologist_id?: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          psychologist_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          content: string
          created_at: string
          finalized_at: string | null
          id: string
          psychologist_id: string
          session_id: string
          status: string
          supersedes_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          content?: string
          created_at?: string
          finalized_at?: string | null
          id?: string
          psychologist_id?: string
          session_id: string
          status?: string
          supersedes_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          finalized_at?: string | null
          id?: string
          psychologist_id?: string
          session_id?: string
          status?: string
          supersedes_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_session_id_psychologist_id_fkey"
            columns: ["session_id", "psychologist_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "psychologist_id"]
          },
          {
            foreignKeyName: "session_notes_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: true
            referencedRelation: "session_book"
            referencedColumns: ["note_id"]
          },
          {
            foreignKeyName: "session_notes_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: true
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      session_series: {
        Row: {
          created_at: string
          duration_minutes: number
          end_date: string | null
          frequency: string
          generated_until: string | null
          id: string
          patient_id: string
          psychologist_id: string
          start_date: string
          start_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          end_date?: string | null
          frequency: string
          generated_until?: string | null
          id?: string
          patient_id: string
          psychologist_id?: string
          start_date: string
          start_time: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          end_date?: string | null
          frequency?: string
          generated_until?: string | null
          id?: string
          patient_id?: string
          psychologist_id?: string
          start_date?: string
          start_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_series_patient_id_psychologist_id_fkey"
            columns: ["patient_id", "psychologist_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id", "psychologist_id"]
          },
          {
            foreignKeyName: "session_series_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          duration_minutes: number
          ends_at: string
          fee: number | null
          id: string
          modality: string | null
          paid_at: string | null
          patient_id: string
          payment_method: string | null
          psychologist_id: string
          rescheduled_from: string | null
          series_id: string | null
          series_occurrence: string | null
          starts_at: string
          status: string
          updated_at: string
          waived_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          duration_minutes?: number
          ends_at: string
          fee?: number | null
          id?: string
          modality?: string | null
          paid_at?: string | null
          patient_id: string
          payment_method?: string | null
          psychologist_id?: string
          rescheduled_from?: string | null
          series_id?: string | null
          series_occurrence?: string | null
          starts_at: string
          status?: string
          updated_at?: string
          waived_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          duration_minutes?: number
          ends_at?: string
          fee?: number | null
          id?: string
          modality?: string | null
          paid_at?: string | null
          patient_id?: string
          payment_method?: string | null
          psychologist_id?: string
          rescheduled_from?: string | null
          series_id?: string | null
          series_occurrence?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          waived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_psychologist_id_fkey"
            columns: ["patient_id", "psychologist_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id", "psychologist_id"]
          },
          {
            foreignKeyName: "sessions_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_series_id_psychologist_id_fkey"
            columns: ["series_id", "psychologist_id"]
            isOneToOne: false
            referencedRelation: "session_series"
            referencedColumns: ["id", "psychologist_id"]
          },
        ]
      }
      vacations: {
        Row: {
          created_at: string
          end_date: string
          id: string
          psychologist_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          psychologist_id?: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          psychologist_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacations_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      calendar_sessions: {
        Row: {
          duration_minutes: number | null
          ends_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          modality: string | null
          paid_at: string | null
          patient_id: string | null
          phone: string | null
          rescheduled_from: string | null
          series_active: boolean | null
          series_id: string | null
          starts_at: string | null
          status: string | null
          waived_at: string | null
        }
        Relationships: []
      }
      patient_list: {
        Row: {
          active: boolean | null
          birth_date: string | null
          created_at: string | null
          dni: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          last_session_at: string | null
          modality: string | null
          next_session_at: string | null
          phone: string | null
          schedules: Json | null
          session_fee: number | null
          start_time: string | null
          weekday: number | null
        }
        Relationships: []
      }
      session_book: {
        Row: {
          content: string | null
          finalized_at: string | null
          note_id: string | null
          note_status: string | null
          patient_id: string | null
          psychologist_id: string | null
          session_id: string | null
          session_status: string | null
          starts_at: string | null
          updated_at: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_session_id_psychologist_id_fkey"
            columns: ["session_id", "psychologist_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "psychologist_id"]
          },
        ]
      }
      session_payments: {
        Row: {
          fee: number | null
          first_name: string | null
          id: string | null
          last_name: string | null
          paid_at: string | null
          patient_id: string | null
          payment_method: string | null
          starts_at: string | null
          status: string | null
          waived_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_patient_schedules: {
        Args: { p_patient_id: string; p_schedules: Json }
        Returns: number
      }
      add_vacation: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      cancel_series_from: { Args: { p_session_id: string }; Returns: undefined }
      create_patient: {
        Args: {
          p_birth_date?: string
          p_dni?: string
          p_email?: string
          p_first_name: string
          p_last_name: string
          p_phone?: string
          p_session_fee?: number
          p_start_time?: string
          p_weekday?: number
        }
        Returns: string
      }
      create_patient_with_schedules: {
        Args: {
          p_birth_date?: string
          p_dni?: string
          p_email?: string
          p_first_name: string
          p_last_name: string
          p_modality?: string
          p_phone?: string
          p_schedules?: Json
          p_session_date?: string
          p_session_end_time?: string
          p_session_fee?: number
          p_session_time?: string
        }
        Returns: string
      }
      cut_series_from: {
        Args: { p_from: string; p_series_id: string }
        Returns: undefined
      }
      default_session_minutes: { Args: never; Returns: number }
      due_notifications: {
        Args: { p_now: string }
        Returns: {
          for_date: string
          kind: string
          minutes_before: number
          modality: string
          patient_label: string
          psychologist_id: string
          session_count: number
          session_id: string
          start_time: string
        }[]
      }
      extend_series: { Args: never; Returns: number }
      frequency_weeks: { Args: { p_frequency: string }; Returns: number }
      generate_series_sessions: {
        Args: {
          p_from?: string
          p_series_id: string
          p_skip_conflicts?: boolean
          p_until: string
        }
        Returns: number
      }
      in_vacation: {
        Args: { p_at: string; p_psychologist_id: string }
        Returns: boolean
      }
      is_valid_timezone: { Args: { p_timezone: string }; Returns: boolean }
      log_patient_export: { Args: { p_patient_id: string }; Returns: undefined }
      mark_session_unpaid: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      mark_sessions_paid: {
        Args: { p_method: string; p_session_ids: string[] }
        Returns: number
      }
      mfa_enabled: { Args: never; Returns: boolean }
      remove_vacation: { Args: { p_vacation_id: string }; Returns: number }
      replace_patient_schedules: {
        Args: { p_patient_id: string; p_schedules: Json }
        Returns: undefined
      }
      reschedule_series_from: {
        Args: {
          p_date: string
          p_end_time?: string
          p_session_id: string
          p_time: string
        }
        Returns: undefined
      }
      reschedule_session: {
        Args: {
          p_date: string
          p_end_time?: string
          p_session_id: string
          p_time: string
        }
        Returns: undefined
      }
      same_series_cycle: {
        Args: { p_a: string; p_b: string; p_weeks: number }
        Returns: boolean
      }
      schedule_session: {
        Args: {
          p_date: string
          p_end_time?: string
          p_patient_id: string
          p_time: string
        }
        Returns: string
      }
      session_duration: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      set_patient_archived: {
        Args: { p_archived: boolean; p_patient_id: string }
        Returns: undefined
      }
      set_patient_schedule: {
        Args: { p_patient_id: string; p_start_time: string; p_weekday: number }
        Returns: undefined
      }
      set_session_modality: {
        Args: { p_modality: string; p_scope?: string; p_session_id: string }
        Returns: undefined
      }
      set_timezone: { Args: { p_timezone: string }; Returns: number }
      unwaive_session: { Args: { p_session_id: string }; Returns: undefined }
      update_patient: {
        Args: {
          p_birth_date?: string
          p_dni?: string
          p_email?: string
          p_first_name: string
          p_last_name: string
          p_patient_id: string
          p_phone?: string
          p_session_fee?: number
          p_start_time?: string
          p_weekday?: number
        }
        Returns: undefined
      }
      update_patient_with_schedules: {
        Args: {
          p_birth_date?: string
          p_dni?: string
          p_email?: string
          p_first_name: string
          p_last_name: string
          p_modality?: string
          p_patient_id: string
          p_phone?: string
          p_schedules?: Json
          p_session_date?: string
          p_session_end_time?: string
          p_session_fee?: number
          p_session_time?: string
        }
        Returns: undefined
      }
      waive_session: { Args: { p_session_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
