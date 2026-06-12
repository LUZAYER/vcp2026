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
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          authorization_id: string | null
          created_at: string
          detail: Json | null
          id: string
          patient_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          authorization_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          patient_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          authorization_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          patient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          ai_insights: Json | null
          ai_insights_generated_at: string | null
          default_payer: string | null
          id: number
          notification_prefs: Json | null
          organization_name: string | null
          updated_at: string
        }
        Insert: {
          ai_insights?: Json | null
          ai_insights_generated_at?: string | null
          default_payer?: string | null
          id?: number
          notification_prefs?: Json | null
          organization_name?: string | null
          updated_at?: string
        }
        Update: {
          ai_insights?: Json | null
          ai_insights_generated_at?: string | null
          default_payer?: string | null
          id?: number
          notification_prefs?: Json | null
          organization_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      appeal_events: {
        Row: {
          actor_id: string | null
          appeal_id: string
          created_at: string
          detail: Json | null
          event_type: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          appeal_id: string
          created_at?: string
          detail?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          appeal_id?: string
          created_at?: string
          detail?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeal_events_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      appeal_notes: {
        Row: {
          appeal_id: string
          author_id: string | null
          body: string
          created_at: string
          id: string
          internal: boolean
        }
        Insert: {
          appeal_id: string
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          internal?: boolean
        }
        Update: {
          appeal_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          internal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "appeal_notes_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      appeals: {
        Row: {
          ai_confidence: number | null
          ai_model: string | null
          appeal_letter: string | null
          assigned_to: string | null
          authorization_id: string
          clinical_justification: string | null
          created_at: string
          created_by: string | null
          current: boolean
          decided_at: string | null
          id: string
          outcome: string | null
          payer_response_draft: string | null
          status: Database["public"]["Enums"]["appeal_status"]
          submitted_at: string | null
          supporting_evidence: string | null
          updated_at: string
          version: number
        }
        Insert: {
          ai_confidence?: number | null
          ai_model?: string | null
          appeal_letter?: string | null
          assigned_to?: string | null
          authorization_id: string
          clinical_justification?: string | null
          created_at?: string
          created_by?: string | null
          current?: boolean
          decided_at?: string | null
          id?: string
          outcome?: string | null
          payer_response_draft?: string | null
          status?: Database["public"]["Enums"]["appeal_status"]
          submitted_at?: string | null
          supporting_evidence?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          ai_confidence?: number | null
          ai_model?: string | null
          appeal_letter?: string | null
          assigned_to?: string | null
          authorization_id?: string
          clinical_justification?: string | null
          created_at?: string
          created_by?: string | null
          current?: boolean
          decided_at?: string | null
          id?: string
          outcome?: string | null
          payer_response_draft?: string | null
          status?: Database["public"]["Enums"]["appeal_status"]
          submitted_at?: string | null
          supporting_evidence?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "appeals_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      authorizations: {
        Row: {
          ai_confidence: number | null
          ai_model: string | null
          ai_scores: Json | null
          ai_summary: Json | null
          approval_probability: number | null
          clinical_notes: string | null
          coding_risk: number | null
          created_at: string
          created_by: string | null
          decided_at: string | null
          denial_probability: number | null
          diagnosis: string | null
          diagnosis_code: string | null
          documentation_risk: number | null
          id: string
          patient_id: string
          payer: string | null
          payer_complexity: number | null
          procedure_code: string | null
          procedure_requested: string | null
          recommended_actions: Json | null
          referring_physician: string | null
          risk_factors: Json | null
          risk_generated_at: string | null
          risk_rationale: string | null
          risk_score: number | null
          status: Database["public"]["Enums"]["auth_status"]
          submitted_at: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_model?: string | null
          ai_scores?: Json | null
          ai_summary?: Json | null
          approval_probability?: number | null
          clinical_notes?: string | null
          coding_risk?: number | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          denial_probability?: number | null
          diagnosis?: string | null
          diagnosis_code?: string | null
          documentation_risk?: number | null
          id?: string
          patient_id: string
          payer?: string | null
          payer_complexity?: number | null
          procedure_code?: string | null
          procedure_requested?: string | null
          recommended_actions?: Json | null
          referring_physician?: string | null
          risk_factors?: Json | null
          risk_generated_at?: string | null
          risk_rationale?: string | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["auth_status"]
          submitted_at?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_model?: string | null
          ai_scores?: Json | null
          ai_summary?: Json | null
          approval_probability?: number | null
          clinical_notes?: string | null
          coding_risk?: number | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          denial_probability?: number | null
          diagnosis?: string | null
          diagnosis_code?: string | null
          documentation_risk?: number | null
          id?: string
          patient_id?: string
          payer?: string | null
          payer_complexity?: number | null
          procedure_code?: string | null
          procedure_requested?: string | null
          recommended_actions?: Json | null
          referring_physician?: string | null
          risk_factors?: Json | null
          risk_generated_at?: string | null
          risk_rationale?: string | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["auth_status"]
          submitted_at?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authorizations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          authorization_id: string | null
          category: Database["public"]["Enums"]["document_category"]
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          patient_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          authorization_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          patient_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          authorization_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          patient_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          created_at: string
          created_by: string | null
          dob: string | null
          effective_date: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          insurance_group: string | null
          insurance_member_id: string | null
          insurance_payer: string | null
          last_name: string
          mrn: string
          phone: string | null
          plan_type: string | null
          subscriber_relationship: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          effective_date?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          insurance_group?: string | null
          insurance_member_id?: string | null
          insurance_payer?: string | null
          last_name: string
          mrn: string
          phone?: string | null
          plan_type?: string | null
          subscriber_relationship?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          effective_date?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          insurance_group?: string | null
          insurance_member_id?: string | null
          insurance_payer?: string | null
          last_name?: string
          mrn?: string
          phone?: string | null
          plan_type?: string | null
          subscriber_relationship?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          notification_prefs: Json | null
          npi: string | null
          organization: string | null
          status: Database["public"]["Enums"]["user_status"]
          theme: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          notification_prefs?: Json | null
          npi?: string | null
          organization?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          theme?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          notification_prefs?: Json | null
          npi?: string | null
          organization?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          theme?: string | null
          title?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authenticated_user: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "physician" | "clinical_staff" | "billing"
      appeal_status:
        | "drafted"
        | "submitted"
        | "under_review"
        | "approved"
        | "denied"
      auth_status:
        | "draft"
        | "pending"
        | "submitted"
        | "under_review"
        | "approved"
        | "denied"
        | "appealed"
      document_category:
        | "clinical_note"
        | "physician_order"
        | "mri_report"
        | "ct_report"
        | "xray_report"
        | "lab_result"
        | "referral"
        | "other"
      notification_kind:
        | "auth_status_change"
        | "appeal_update"
        | "high_risk"
        | "mention"
        | "system"
      user_status: "active" | "invited" | "suspended"
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
      app_role: ["admin", "physician", "clinical_staff", "billing"],
      appeal_status: [
        "drafted",
        "submitted",
        "under_review",
        "approved",
        "denied",
      ],
      auth_status: [
        "draft",
        "pending",
        "submitted",
        "under_review",
        "approved",
        "denied",
        "appealed",
      ],
      document_category: [
        "clinical_note",
        "physician_order",
        "mri_report",
        "ct_report",
        "xray_report",
        "lab_result",
        "referral",
        "other",
      ],
      notification_kind: [
        "auth_status_change",
        "appeal_update",
        "high_risk",
        "mention",
        "system",
      ],
      user_status: ["active", "invited", "suspended"],
    },
  },
} as const
