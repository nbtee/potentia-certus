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
    PostgrestVersion: "13.0.4"
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
      activities: {
        Row: {
          activity_date: string
          activity_type: string
          bullhorn_id: number
          candidate_id: string | null
          consultant_id: string | null
          created_at: string | null
          id: string
          job_order_id: string | null
          metadata: Json | null
          notes: string | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          activity_date: string
          activity_type: string
          bullhorn_id: number
          candidate_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          id?: string
          job_order_id?: string | null
          metadata?: Json | null
          notes?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          bullhorn_id?: number
          candidate_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          id?: string
          job_order_id?: string | null
          metadata?: Json | null
          notes?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      business_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_from: string
          effective_until: string | null
          id: string
          rule_key: string
          rule_type: string
          rule_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from: string
          effective_until?: string | null
          id?: string
          rule_key: string
          rule_type: string
          rule_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          rule_key?: string
          rule_type?: string
          rule_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          address1: string | null
          address2: string | null
          bullhorn_id: number
          city: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          phone: string | null
          state: string | null
          synced_at: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          bullhorn_id: number
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          state?: string | null
          synced_at?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          bullhorn_id?: number
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          state?: string | null
          synced_at?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      client_corporations: {
        Row: {
          bullhorn_id: number
          created_at: string | null
          id: string
          industry: string | null
          metadata: Json | null
          name: string
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          bullhorn_id: number
          created_at?: string | null
          id?: string
          industry?: string | null
          metadata?: Json | null
          name: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          bullhorn_id?: number
          created_at?: string | null
          id?: string
          industry?: string | null
          metadata?: Json | null
          name?: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      consultant_targets: {
        Row: {
          consultant_id: string
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          target_type: string
          target_value: number
          updated_at: string | null
        }
        Insert: {
          consultant_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          target_type: string
          target_value: number
          updated_at?: string | null
        }
        Update: {
          consultant_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          target_type?: string
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultant_targets_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      context_documents: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          document_type: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          document_type: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "context_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          created_at: string | null
          dashboard_id: string
          data_asset_id: string
          id: string
          parameters: Json
          position: Json
          updated_at: string | null
          widget_config: Json
          widget_type: string
        }
        Insert: {
          created_at?: string | null
          dashboard_id: string
          data_asset_id: string
          id?: string
          parameters?: Json
          position: Json
          updated_at?: string | null
          widget_config?: Json
          widget_type: string
        }
        Update: {
          created_at?: string | null
          dashboard_id?: string
          data_asset_id?: string
          id?: string
          parameters?: Json
          position?: Json
          updated_at?: string | null
          widget_config?: Json
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_widgets_data_asset_id_fkey"
            columns: ["data_asset_id"]
            isOneToOne: false
            referencedRelation: "data_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_shared: boolean | null
          is_template: boolean | null
          layout: Json
          metadata: Json | null
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          is_template?: boolean | null
          layout?: Json
          metadata?: Json | null
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          is_template?: boolean | null
          layout?: Json
          metadata?: Json | null
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_assets: {
        Row: {
          asset_key: string
          available_dimensions: string[] | null
          available_filters: string[] | null
          category: string
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          output_shapes: string[]
          query_template: string | null
          synonyms: string[] | null
          updated_at: string | null
        }
        Insert: {
          asset_key: string
          available_dimensions?: string[] | null
          available_filters?: string[] | null
          category: string
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          output_shapes: string[]
          query_template?: string | null
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Update: {
          asset_key?: string
          available_dimensions?: string[] | null
          available_filters?: string[] | null
          category?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          output_shapes?: string[]
          query_template?: string | null
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ingestion_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          records_failed: number | null
          records_inserted: number | null
          records_processed: number | null
          records_updated: number | null
          run_type: string
          source_table: string
          started_at: string | null
          status: string
          target_table: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_failed?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          run_type: string
          source_table: string
          started_at?: string | null
          status?: string
          target_table: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_failed?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          run_type?: string
          source_table?: string
          started_at?: string | null
          status?: string
          target_table?: string
        }
        Relationships: []
      }
      job_orders: {
        Row: {
          bullhorn_id: number
          client_corporation_id: string | null
          consultant_id: string | null
          created_at: string | null
          date_added: string | null
          date_last_modified: string | null
          employment_type: string | null
          id: string
          metadata: Json | null
          status: string | null
          synced_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          bullhorn_id: number
          client_corporation_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          date_added?: string | null
          date_last_modified?: string | null
          employment_type?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          synced_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          bullhorn_id?: number
          client_corporation_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          date_added?: string | null
          date_last_modified?: string | null
          employment_type?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          synced_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_hierarchy: {
        Row: {
          bullhorn_department_id: number | null
          created_at: string | null
          hierarchy_level: string
          id: string
          is_sales_team: boolean | null
          metadata: Json | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          bullhorn_department_id?: number | null
          created_at?: string | null
          hierarchy_level: string
          id?: string
          is_sales_team?: boolean | null
          metadata?: Json | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bullhorn_department_id?: number | null
          created_at?: string | null
          hierarchy_level?: string
          id?: string
          is_sales_team?: boolean | null
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_hierarchy_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_hierarchy"
            referencedColumns: ["id"]
          },
        ]
      }
      placements: {
        Row: {
          bullhorn_id: number
          candidate_id: string | null
          candidate_salary: number | null
          consultant_id: string | null
          created_at: string | null
          end_date: string | null
          fee_amount: number | null
          gp_per_hour: number | null
          id: string
          job_order_id: string | null
          metadata: Json | null
          placement_date: string
          revenue_type: string
          start_date: string | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          bullhorn_id: number
          candidate_id?: string | null
          candidate_salary?: number | null
          consultant_id?: string | null
          created_at?: string | null
          end_date?: string | null
          fee_amount?: number | null
          gp_per_hour?: number | null
          id?: string
          job_order_id?: string | null
          metadata?: Json | null
          placement_date: string
          revenue_type: string
          start_date?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          bullhorn_id?: number
          candidate_id?: string | null
          candidate_salary?: number | null
          consultant_id?: string | null
          created_at?: string | null
          end_date?: string | null
          fee_amount?: number | null
          gp_per_hour?: number | null
          id?: string
          job_order_id?: string | null
          metadata?: Json | null
          placement_date?: string
          revenue_type?: string
          start_date?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placements_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_referrals: {
        Row: {
          activity_id: string | null
          consultant_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          referral_date: string
          synced_at: string | null
        }
        Insert: {
          activity_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          referral_date: string
          synced_at?: string | null
        }
        Update: {
          activity_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          referral_date?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_referrals_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategic_referrals_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_status_log: {
        Row: {
          bullhorn_submission_history_id: number | null
          bullhorn_submission_id: number
          candidate_id: string | null
          comments: string | null
          consultant_id: string | null
          created_at: string | null
          detected_at: string
          id: string
          job_order_id: string | null
          metadata: Json | null
          status_from: string | null
          status_to: string
          synced_at: string | null
        }
        Insert: {
          bullhorn_submission_history_id?: number | null
          bullhorn_submission_id: number
          candidate_id?: string | null
          comments?: string | null
          consultant_id?: string | null
          created_at?: string | null
          detected_at: string
          id?: string
          job_order_id?: string | null
          metadata?: Json | null
          status_from?: string | null
          status_to: string
          synced_at?: string | null
        }
        Update: {
          bullhorn_submission_history_id?: number | null
          bullhorn_submission_id?: number
          candidate_id?: string | null
          comments?: string | null
          consultant_id?: string | null
          created_at?: string | null
          detected_at?: string
          id?: string
          job_order_id?: string | null
          metadata?: Json | null
          status_from?: string | null
          status_to?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_status_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_status_log_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_status_log_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      unmatched_terms: {
        Row: {
          created_at: string | null
          id: string
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          suggested_data_asset_id: string | null
          unmatched_term: string
          user_query: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          suggested_data_asset_id?: string | null
          unmatched_term: string
          user_query: string
        }
        Update: {
          created_at?: string | null
          id?: string
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          suggested_data_asset_id?: string | null
          unmatched_term?: string
          user_query?: string
        }
        Relationships: [
          {
            foreignKeyName: "unmatched_terms_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unmatched_terms_suggested_data_asset_id_fkey"
            columns: ["suggested_data_asset_id"]
            isOneToOne: false
            referencedRelation: "data_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          bullhorn_corporate_user_id: number | null
          created_at: string | null
          display_name: string | null
          email: string
          first_name: string | null
          hierarchy_node_id: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          metadata: Json | null
          role: string
          updated_at: string | null
        }
        Insert: {
          bullhorn_corporate_user_id?: number | null
          created_at?: string | null
          display_name?: string | null
          email: string
          first_name?: string | null
          hierarchy_node_id?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          metadata?: Json | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          bullhorn_corporate_user_id?: number | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          first_name?: string | null
          hierarchy_node_id?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          metadata?: Json | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_hierarchy_node_id_fkey"
            columns: ["hierarchy_node_id"]
            isOneToOne: false
            referencedRelation: "org_hierarchy"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_blended_revenue: {
        Args: {
          end_date: string
          fee_amount: number
          gp_per_hour: number
          revenue_type: string
          start_date: string
        }
        Returns: number
      }
      calculate_contract_revenue: {
        Args: { end_date: string; gp_per_hour: number; start_date: string }
        Returns: number
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
