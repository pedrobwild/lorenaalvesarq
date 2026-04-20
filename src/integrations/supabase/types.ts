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
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string | null
          device: string | null
          duration_ms: number | null
          event_type: string
          id: string
          os: string | null
          path: string | null
          project_slug: string | null
          referrer: string | null
          scroll_depth: number | null
          session_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          value: Json | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string | null
          device?: string | null
          duration_ms?: number | null
          event_type: string
          id?: string
          os?: string | null
          path?: string | null
          project_slug?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: Json | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string | null
          device?: string | null
          duration_ms?: number | null
          event_type?: string
          id?: string
          os?: string | null
          path?: string | null
          project_slug?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      project_images: {
        Row: {
          alt: string
          caption: string | null
          created_at: string | null
          format: string | null
          id: string
          order_index: number | null
          project_id: string
          url: string
        }
        Insert: {
          alt: string
          caption?: string | null
          created_at?: string | null
          format?: string | null
          id?: string
          order_index?: number | null
          project_id: string
          url: string
        }
        Update: {
          alt?: string
          caption?: string | null
          created_at?: string | null
          format?: string | null
          id?: string
          order_index?: number | null
          project_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          area: string | null
          cover_alt: string | null
          cover_url: string | null
          created_at: string | null
          em: string | null
          id: string
          intro: string | null
          location: string | null
          materials: string[] | null
          number: string | null
          og_image_url: string | null
          order_index: number | null
          photographer: string | null
          program: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string | null
          summary: string | null
          tag: string
          team: string | null
          title: string
          updated_at: string | null
          visible: boolean | null
          year: string | null
        }
        Insert: {
          area?: string | null
          cover_alt?: string | null
          cover_url?: string | null
          created_at?: string | null
          em?: string | null
          id?: string
          intro?: string | null
          location?: string | null
          materials?: string[] | null
          number?: string | null
          og_image_url?: string | null
          order_index?: number | null
          photographer?: string | null
          program?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string | null
          summary?: string | null
          tag: string
          team?: string | null
          title: string
          updated_at?: string | null
          visible?: boolean | null
          year?: string | null
        }
        Update: {
          area?: string | null
          cover_alt?: string | null
          cover_url?: string | null
          created_at?: string | null
          em?: string | null
          id?: string
          intro?: string | null
          location?: string | null
          materials?: string[] | null
          number?: string | null
          og_image_url?: string | null
          order_index?: number | null
          photographer?: string | null
          program?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string | null
          summary?: string | null
          tag?: string
          team?: string | null
          title?: string
          updated_at?: string | null
          visible?: boolean | null
          year?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address_city: string | null
          address_region: string | null
          address_street: string | null
          contact_email: string | null
          contact_phone: string | null
          default_og_image: string | null
          id: number
          instagram_url: string | null
          linkedin_url: string | null
          pinterest_url: string | null
          site_description: string | null
          site_title: string | null
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_region?: string | null
          address_street?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          default_og_image?: string | null
          id?: number
          instagram_url?: string | null
          linkedin_url?: string | null
          pinterest_url?: string | null
          site_description?: string | null
          site_title?: string | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_region?: string | null
          address_street?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          default_og_image?: string | null
          id?: number
          instagram_url?: string | null
          linkedin_url?: string | null
          pinterest_url?: string | null
          site_description?: string | null
          site_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      analytics_daily: {
        Row: {
          day: string | null
          event_type: string | null
          events: number | null
          sessions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      analytics_top_paths: {
        Args: { p_limit?: number; p_since: string }
        Returns: {
          pageviews: number
          path: string
          sessions: number
        }[]
      }
      analytics_top_projects: {
        Args: { p_limit?: number; p_since: string }
        Returns: {
          project_slug: string
          sessions: number
          views: number
        }[]
      }
      analytics_top_referrers: {
        Args: { p_limit?: number; p_since: string }
        Returns: {
          referrer: string
          sessions: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
