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
      jobs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          log: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          log?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          log?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          type?: Database["public"]["Enums"]["job_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      megatrends: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "megatrends_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      signal_trend: {
        Row: {
          created_at: string
          signal_id: string
          trend_id: string
        }
        Insert: {
          created_at?: string
          signal_id: string
          trend_id: string
        }
        Update: {
          created_at?: string
          signal_id?: string
          trend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_trend_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_trend_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          ai_tags: string[] | null
          certainty: Database["public"]["Enums"]["certainty_type"] | null
          content: string | null
          created_at: string
          created_by: string | null
          fetched_at: string | null
          horizon: Database["public"]["Enums"]["horizon_type"] | null
          id: string
          lang: string | null
          relevance: number | null
          source_id: string | null
          summary: string | null
          title: string
          updated_at: string
          url: string | null
          workspace_id: string
        }
        Insert: {
          ai_tags?: string[] | null
          certainty?: Database["public"]["Enums"]["certainty_type"] | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          fetched_at?: string | null
          horizon?: Database["public"]["Enums"]["horizon_type"] | null
          id?: string
          lang?: string | null
          relevance?: number | null
          source_id?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          url?: string | null
          workspace_id: string
        }
        Update: {
          ai_tags?: string[] | null
          certainty?: Database["public"]["Enums"]["certainty_type"] | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          fetched_at?: string | null
          horizon?: Database["public"]["Enums"]["horizon_type"] | null
          id?: string
          lang?: string | null
          relevance?: number | null
          source_id?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          active: boolean | null
          crawl_interval_minutes: number | null
          created_at: string
          id: string
          last_crawled_at: string | null
          name: string | null
          type: Database["public"]["Enums"]["source_type"]
          updated_at: string
          url_or_term: string
          workspace_id: string
        }
        Insert: {
          active?: boolean | null
          crawl_interval_minutes?: number | null
          created_at?: string
          id?: string
          last_crawled_at?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url_or_term: string
          workspace_id: string
        }
        Update: {
          active?: boolean | null
          crawl_interval_minutes?: number | null
          created_at?: string
          id?: string
          last_crawled_at?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url_or_term?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_megatrend: {
        Row: {
          created_at: string
          megatrend_id: string
          trend_id: string
        }
        Insert: {
          created_at?: string
          megatrend_id: string
          trend_id: string
        }
        Update: {
          created_at?: string
          megatrend_id?: string
          trend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_megatrend_megatrend_id_fkey"
            columns: ["megatrend_id"]
            isOneToOne: false
            referencedRelation: "megatrends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trend_megatrend_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
      }
      trends: {
        Row: {
          certainty: Database["public"]["Enums"]["certainty_type"] | null
          created_at: string
          description: string | null
          id: string
          impact: Database["public"]["Enums"]["impact_type"] | null
          owner_id: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          certainty?: Database["public"]["Enums"]["certainty_type"] | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["impact_type"] | null
          owner_id?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          certainty?: Database["public"]["Enums"]["certainty_type"] | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["impact_type"] | null
          owner_id?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trends_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_workspace_with_owner: {
        Args: { workspace_name: string }
        Returns: string
      }
      get_workspace_role: {
        Args: { workspace_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_workspace_member: {
        Args: { workspace_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member" | "viewer"
      certainty_type: "certain" | "uncertain" | "wildcard"
      horizon_type: "0_5" | "5_10" | "10_plus"
      impact_type: "low" | "medium" | "high"
      job_status: "pending" | "running" | "done" | "error"
      job_type: "scan" | "reindex"
      source_type: "domain" | "rss" | "alert" | "manual"
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
      app_role: ["owner", "admin", "member", "viewer"],
      certainty_type: ["certain", "uncertain", "wildcard"],
      horizon_type: ["0_5", "5_10", "10_plus"],
      impact_type: ["low", "medium", "high"],
      job_status: ["pending", "running", "done", "error"],
      job_type: ["scan", "reindex"],
      source_type: ["domain", "rss", "alert", "manual"],
    },
  },
} as const
