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
          is_bounce: boolean | null
          landing_path: string | null
          language: string | null
          os: string | null
          path: string | null
          project_slug: string | null
          referrer: string | null
          referrer_host: string | null
          screen: string | null
          scroll_depth: number | null
          session_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: Json | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string | null
          device?: string | null
          duration_ms?: number | null
          event_type: string
          id?: string
          is_bounce?: boolean | null
          landing_path?: string | null
          language?: string | null
          os?: string | null
          path?: string | null
          project_slug?: string | null
          referrer?: string | null
          referrer_host?: string | null
          screen?: string | null
          scroll_depth?: number | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: Json | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string | null
          device?: string | null
          duration_ms?: number | null
          event_type?: string
          id?: string
          is_bounce?: boolean | null
          landing_path?: string | null
          language?: string | null
          os?: string | null
          path?: string | null
          project_slug?: string | null
          referrer?: string | null
          referrer_host?: string | null
          screen?: string | null
          scroll_depth?: number | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: Json | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          order_index: number
          question: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          order_index?: number
          question: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          order_index?: number
          question?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      project_images: {
        Row: {
          alt: string
          blur_data_url: string | null
          caption: string | null
          created_at: string | null
          format: string | null
          id: string
          order_index: number | null
          project_id: string
          url: string
          url_md: string | null
          url_sm: string | null
        }
        Insert: {
          alt: string
          blur_data_url?: string | null
          caption?: string | null
          created_at?: string | null
          format?: string | null
          id?: string
          order_index?: number | null
          project_id: string
          url: string
          url_md?: string | null
          url_sm?: string | null
        }
        Update: {
          alt?: string
          blur_data_url?: string | null
          caption?: string | null
          created_at?: string | null
          format?: string | null
          id?: string
          order_index?: number | null
          project_id?: string
          url?: string
          url_md?: string | null
          url_sm?: string | null
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
          cover_blur_data_url: string | null
          cover_url: string | null
          cover_url_md: string | null
          cover_url_sm: string | null
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
          cover_blur_data_url?: string | null
          cover_url?: string | null
          cover_url_md?: string | null
          cover_url_sm?: string | null
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
          cover_blur_data_url?: string | null
          cover_url?: string | null
          cover_url_md?: string | null
          cover_url_sm?: string | null
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
      seo_audit_log: {
        Row: {
          created_at: string | null
          id: number
          issues: Json | null
          kind: string
          notes: string | null
          score: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          issues?: Json | null
          kind: string
          notes?: string | null
          score?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          issues?: Json | null
          kind?: string
          notes?: string | null
          score?: number | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address_city: string | null
          address_region: string | null
          address_street: string | null
          bing_site_verification: string | null
          business_founding_year: string | null
          business_opening_hours: string | null
          business_postal_code: string | null
          business_price_range: string | null
          business_type: string | null
          clarity_id: string | null
          contact_email: string | null
          contact_phone: string | null
          default_og_image: string | null
          facebook_domain_verification: string | null
          google_ads_conversion_id: string | null
          google_analytics_id: string | null
          google_business_profile_url: string | null
          google_maps_url: string | null
          google_site_verification: string | null
          google_tag_manager_id: string | null
          hotjar_id: string | null
          id: number
          instagram_url: string | null
          linkedin_url: string | null
          meta_pixel_id: string | null
          pinterest_site_verification: string | null
          pinterest_url: string | null
          seo_author: string | null
          seo_canonical_base: string | null
          seo_custom_head_html: string | null
          seo_default_description: string | null
          seo_default_title: string | null
          seo_geo_placename: string | null
          seo_geo_position: string | null
          seo_geo_region: string | null
          seo_keywords: string | null
          seo_last_audit_at: string | null
          seo_last_search_console_submit: string | null
          seo_og_image: string | null
          seo_robots: string | null
          seo_twitter_handle: string | null
          site_description: string | null
          site_title: string | null
          updated_at: string | null
          yandex_verification: string | null
        }
        Insert: {
          address_city?: string | null
          address_region?: string | null
          address_street?: string | null
          bing_site_verification?: string | null
          business_founding_year?: string | null
          business_opening_hours?: string | null
          business_postal_code?: string | null
          business_price_range?: string | null
          business_type?: string | null
          clarity_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          default_og_image?: string | null
          facebook_domain_verification?: string | null
          google_ads_conversion_id?: string | null
          google_analytics_id?: string | null
          google_business_profile_url?: string | null
          google_maps_url?: string | null
          google_site_verification?: string | null
          google_tag_manager_id?: string | null
          hotjar_id?: string | null
          id?: number
          instagram_url?: string | null
          linkedin_url?: string | null
          meta_pixel_id?: string | null
          pinterest_site_verification?: string | null
          pinterest_url?: string | null
          seo_author?: string | null
          seo_canonical_base?: string | null
          seo_custom_head_html?: string | null
          seo_default_description?: string | null
          seo_default_title?: string | null
          seo_geo_placename?: string | null
          seo_geo_position?: string | null
          seo_geo_region?: string | null
          seo_keywords?: string | null
          seo_last_audit_at?: string | null
          seo_last_search_console_submit?: string | null
          seo_og_image?: string | null
          seo_robots?: string | null
          seo_twitter_handle?: string | null
          site_description?: string | null
          site_title?: string | null
          updated_at?: string | null
          yandex_verification?: string | null
        }
        Update: {
          address_city?: string | null
          address_region?: string | null
          address_street?: string | null
          bing_site_verification?: string | null
          business_founding_year?: string | null
          business_opening_hours?: string | null
          business_postal_code?: string | null
          business_price_range?: string | null
          business_type?: string | null
          clarity_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          default_og_image?: string | null
          facebook_domain_verification?: string | null
          google_ads_conversion_id?: string | null
          google_analytics_id?: string | null
          google_business_profile_url?: string | null
          google_maps_url?: string | null
          google_site_verification?: string | null
          google_tag_manager_id?: string | null
          hotjar_id?: string | null
          id?: number
          instagram_url?: string | null
          linkedin_url?: string | null
          meta_pixel_id?: string | null
          pinterest_site_verification?: string | null
          pinterest_url?: string | null
          seo_author?: string | null
          seo_canonical_base?: string | null
          seo_custom_head_html?: string | null
          seo_default_description?: string | null
          seo_default_title?: string | null
          seo_geo_placename?: string | null
          seo_geo_position?: string | null
          seo_geo_region?: string | null
          seo_keywords?: string | null
          seo_last_audit_at?: string | null
          seo_last_search_console_submit?: string | null
          seo_og_image?: string | null
          seo_robots?: string | null
          seo_twitter_handle?: string | null
          site_description?: string | null
          site_title?: string | null
          updated_at?: string | null
          yandex_verification?: string | null
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
      analytics_sessions: {
        Row: {
          conversions: number | null
          converted: boolean | null
          country: string | null
          device: string | null
          duration_s: number | null
          ended_at: string | null
          engagement_ms: number | null
          is_bounce: boolean | null
          landing_path: string | null
          pageviews: number | null
          referrer_host: string | null
          session_id: string | null
          started_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      analytics_breakdown: {
        Args: {
          p_dim: string
          p_limit?: number
          p_since: string
          p_until: string
        }
        Returns: {
          avg_duration_s: number
          bounce_rate: number
          conversions: number
          dim: string
          sessions: number
        }[]
      }
      analytics_funnel: {
        Args: { p_since: string; p_steps: string[]; p_until: string }
        Returns: {
          event_type: string
          sessions: number
          step: number
        }[]
      }
      analytics_hours_dow: {
        Args: {
          p_country?: string
          p_device?: string
          p_landing_path?: string
          p_referrer_host?: string
          p_since: string
          p_until: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
        Returns: {
          dow: number
          hour: number
          sessions: number
        }[]
      }
      analytics_overview_kpis: {
        Args: {
          p_country?: string
          p_device?: string
          p_landing_path?: string
          p_referrer_host?: string
          p_since: string
          p_until: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
        Returns: {
          avg_engagement_ms: number
          bounce_rate: number
          conversion_rate: number
          conversions: number
          pages_per_session: number
          pageviews: number
          sessions: number
          spark: Json
          unique_visitors: number
        }[]
      }
      analytics_realtime: {
        Args: never
        Returns: {
          minute: string
          pageviews: number
          sessions: number
        }[]
      }
      analytics_retention: {
        Args: { p_since: string; p_weeks?: number }
        Returns: {
          cohort_week: string
          visitors: number
          week_offset: number
        }[]
      }
      analytics_timeseries: {
        Args: { p_grain?: string; p_since: string; p_until: string }
        Returns: {
          bucket: string
          conversions: number
          pageviews: number
          sessions: number
        }[]
      }
      analytics_top_paths: {
        Args: { p_limit?: number; p_since: string }
        Returns: {
          pageviews: number
          path: string
          sessions: number
        }[]
      }
      analytics_top_paths_v2: {
        Args: {
          p_country?: string
          p_device?: string
          p_landing_path?: string
          p_limit?: number
          p_referrer_host?: string
          p_since: string
          p_until: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
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
      analytics_top_projects_v2: {
        Args: {
          p_country?: string
          p_device?: string
          p_landing_path?: string
          p_limit?: number
          p_referrer_host?: string
          p_since: string
          p_until: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
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
