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
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          related_id: string | null
          severity: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          related_id?: string | null
          severity?: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          related_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: []
      }
      inventory_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          active: boolean
          admin_notes: string | null
          beach_cleaning_fee_cents: number | null
          beach_compatible: boolean
          category_id: string | null
          checked_out_quantity: number
          cleaning_fee_cents: number | null
          cleaning_quantity: number
          created_at: string
          damaged_missing_quantity: number
          default_quantity_unit: string
          default_rental_price_cents: number | null
          deleted_at: string | null
          description: string | null
          id: string
          item_type: string
          maintenance_quantity: number
          name: string
          replacement_cost_cents: number
          requires_anchoring: boolean
          requires_cleaning: boolean
          reserved_quantity: number
          setup_required: boolean
          short_description: string | null
          sku: string | null
          slug: string
          total_owned_quantity: number
          unit_label: string
          updated_at: string
          visible_to_chat: boolean
          visible_to_planner: boolean
          wind_sensitive: boolean
        }
        Insert: {
          active?: boolean
          admin_notes?: string | null
          beach_cleaning_fee_cents?: number | null
          beach_compatible?: boolean
          category_id?: string | null
          checked_out_quantity?: number
          cleaning_fee_cents?: number | null
          cleaning_quantity?: number
          created_at?: string
          damaged_missing_quantity?: number
          default_quantity_unit?: string
          default_rental_price_cents?: number | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          item_type?: string
          maintenance_quantity?: number
          name: string
          replacement_cost_cents?: number
          requires_anchoring?: boolean
          requires_cleaning?: boolean
          reserved_quantity?: number
          setup_required?: boolean
          short_description?: string | null
          sku?: string | null
          slug: string
          total_owned_quantity?: number
          unit_label?: string
          updated_at?: string
          visible_to_chat?: boolean
          visible_to_planner?: boolean
          wind_sensitive?: boolean
        }
        Update: {
          active?: boolean
          admin_notes?: string | null
          beach_cleaning_fee_cents?: number | null
          beach_compatible?: boolean
          category_id?: string | null
          checked_out_quantity?: number
          cleaning_fee_cents?: number | null
          cleaning_quantity?: number
          created_at?: string
          damaged_missing_quantity?: number
          default_quantity_unit?: string
          default_rental_price_cents?: number | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          item_type?: string
          maintenance_quantity?: number
          name?: string
          replacement_cost_cents?: number
          requires_anchoring?: boolean
          requires_cleaning?: boolean
          reserved_quantity?: number
          setup_required?: boolean
          short_description?: string | null
          sku?: string | null
          slug?: string
          total_owned_quantity?: number
          unit_label?: string
          updated_at?: string
          visible_to_chat?: boolean
          visible_to_planner?: boolean
          wind_sensitive?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          from_status: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          quantity: number
          related_event_id: string | null
          related_order_id: string | null
          related_quote_id: string | null
          related_recommendation_id: string | null
          to_status: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity: number
          related_event_id?: string | null
          related_order_id?: string | null
          related_quote_id?: string | null
          related_recommendation_id?: string | null
          to_status?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity?: number
          related_event_id?: string | null
          related_order_id?: string | null
          related_quote_id?: string | null
          related_recommendation_id?: string | null
          to_status?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_inventory_mappings: {
        Row: {
          active: boolean
          created_at: string
          id: string
          inventory_item_id: string | null
          pricing_item_id: string | null
          recommendation_keyword: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          pricing_item_id?: string | null
          recommendation_keyword: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          pricing_item_id?: string | null
          recommendation_keyword?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_inventory_mappings_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_inventory_mappings_pricing_item_id_fkey"
            columns: ["pricing_item_id"]
            isOneToOne: false
            referencedRelation: "pricing_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_items: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          notes: string | null
          price_cents: number
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          price_cents: number
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          price_cents?: number
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          inventory_item_id: string | null
          line_total_cents: number
          name: string
          needs_pricing_review: boolean
          pricing_item_id: string | null
          quantity: number
          quote_id: string
          reason: string | null
          sort_order: number
          unit: string
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          line_total_cents?: number
          name: string
          needs_pricing_review?: boolean
          pricing_item_id?: string | null
          quantity?: number
          quote_id: string
          reason?: string | null
          sort_order?: number
          unit?: string
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          line_total_cents?: number
          name?: string
          needs_pricing_review?: boolean
          pricing_item_id?: string | null
          quantity?: number
          quote_id?: string
          reason?: string | null
          sort_order?: number
          unit?: string
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_note: string | null
          customer_phone: string | null
          event_date: string | null
          event_location: string | null
          event_type: string | null
          guest_count: number | null
          id: string
          pdf_url: string | null
          planner_input: Json | null
          preferred_contact_method: string
          recommendation: Json | null
          saved_recommendation_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_note?: string | null
          customer_phone?: string | null
          event_date?: string | null
          event_location?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          pdf_url?: string | null
          planner_input?: Json | null
          preferred_contact_method?: string
          recommendation?: Json | null
          saved_recommendation_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_note?: string | null
          customer_phone?: string | null
          event_date?: string | null
          event_location?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          pdf_url?: string | null
          planner_input?: Json | null
          preferred_contact_method?: string
          recommendation?: Json | null
          saved_recommendation_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quote_returns: {
        Row: {
          condition_notes: string | null
          created_at: string
          damaged_quantity: number
          id: string
          inventory_item_id: string
          missing_quantity: number
          quote_id: string
          quote_item_id: string | null
          returned_at: string
          returned_by: string | null
          returned_quantity: number
        }
        Insert: {
          condition_notes?: string | null
          created_at?: string
          damaged_quantity?: number
          id?: string
          inventory_item_id: string
          missing_quantity?: number
          quote_id: string
          quote_item_id?: string | null
          returned_at?: string
          returned_by?: string | null
          returned_quantity?: number
        }
        Update: {
          condition_notes?: string | null
          created_at?: string
          damaged_quantity?: number
          id?: string
          inventory_item_id?: string
          missing_quantity?: number
          quote_id?: string
          quote_item_id?: string | null
          returned_at?: string
          returned_by?: string | null
          returned_quantity?: number
        }
        Relationships: []
      }
      quotes: {
        Row: {
          amount_paid_cents: number | null
          approved_at: string | null
          booked_at: string | null
          cleaning_fee_cents: number
          created_at: string
          customer_email: string
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          delivery_fee_cents: number
          deposit_amount_cents: number | null
          discount_cents: number
          event_date: string | null
          event_location: string | null
          event_type: string | null
          guest_count: number | null
          id: string
          internal_notes: string | null
          payment_status: string | null
          quote_number: string
          quote_request_id: string | null
          saved_recommendation_id: string | null
          sent_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          tax_cents: number
          terms: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          amount_paid_cents?: number | null
          approved_at?: string | null
          booked_at?: string | null
          cleaning_fee_cents?: number
          created_at?: string
          customer_email: string
          customer_name: string
          customer_notes?: string | null
          customer_phone?: string | null
          delivery_fee_cents?: number
          deposit_amount_cents?: number | null
          discount_cents?: number
          event_date?: string | null
          event_location?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          internal_notes?: string | null
          payment_status?: string | null
          quote_number?: string
          quote_request_id?: string | null
          saved_recommendation_id?: string | null
          sent_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          terms?: string | null
          total_cents?: number
          updated_at?: string
        }
        Update: {
          amount_paid_cents?: number | null
          approved_at?: string | null
          booked_at?: string | null
          cleaning_fee_cents?: number
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string | null
          delivery_fee_cents?: number
          deposit_amount_cents?: number | null
          discount_cents?: number
          event_date?: string | null
          event_location?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          internal_notes?: string | null
          payment_status?: string | null
          quote_number?: string
          quote_request_id?: string | null
          saved_recommendation_id?: string | null
          sent_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          terms?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_calendar_events: {
        Row: {
          all_day: boolean
          assigned_to: string | null
          color: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          end_time: string | null
          event_type: string
          external_calendar_event_id: string | null
          external_calendar_provider: string | null
          id: string
          location: string | null
          notes: string | null
          quote_id: string | null
          quote_request_id: string | null
          rental_event_id: string | null
          saved_recommendation_id: string | null
          start_time: string
          status: string
          sync_to_external_calendar: boolean
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          assigned_to?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          end_time?: string | null
          event_type: string
          external_calendar_event_id?: string | null
          external_calendar_provider?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          quote_id?: string | null
          quote_request_id?: string | null
          rental_event_id?: string | null
          saved_recommendation_id?: string | null
          start_time: string
          status?: string
          sync_to_external_calendar?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          assigned_to?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          end_time?: string | null
          event_type?: string
          external_calendar_event_id?: string | null
          external_calendar_provider?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          quote_id?: string | null
          quote_request_id?: string | null
          rental_event_id?: string | null
          saved_recommendation_id?: string | null
          start_time?: string
          status?: string
          sync_to_external_calendar?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_recommendations: {
        Row: {
          blueprint_image: string | null
          booked_at: string | null
          contact: Json | null
          created_at: string
          customer_confirmation_sent_at: string | null
          customer_id: string | null
          deleted_at: string | null
          event_date: string | null
          id: string
          input: Json
          location: string | null
          pdf_url: string | null
          quote_request_email_sent_at: string | null
          quote_request_note: string | null
          quote_requested_at: string | null
          quote_sent_at: string | null
          recommendation: Json
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blueprint_image?: string | null
          booked_at?: string | null
          contact?: Json | null
          created_at?: string
          customer_confirmation_sent_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          event_date?: string | null
          id?: string
          input: Json
          location?: string | null
          pdf_url?: string | null
          quote_request_email_sent_at?: string | null
          quote_request_note?: string | null
          quote_requested_at?: string | null
          quote_sent_at?: string | null
          recommendation: Json
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blueprint_image?: string | null
          booked_at?: string | null
          contact?: Json | null
          created_at?: string
          customer_confirmation_sent_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          event_date?: string | null
          id?: string
          input?: Json
          location?: string | null
          pdf_url?: string | null
          quote_request_email_sent_at?: string | null
          quote_request_note?: string | null
          quote_requested_at?: string | null
          quote_sent_at?: string | null
          recommendation?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      spreadsheet_imports: {
        Row: {
          column_mapping: Json
          completed_at: string | null
          created_at: string
          errors: Json
          id: string
          import_type: string
          imported_by: string | null
          rows_detected: number
          rows_imported: number
          rows_skipped: number
          source_file_name: string | null
          spreadsheet_source_id: string | null
          status: string
          warnings: Json
        }
        Insert: {
          column_mapping?: Json
          completed_at?: string | null
          created_at?: string
          errors?: Json
          id?: string
          import_type: string
          imported_by?: string | null
          rows_detected?: number
          rows_imported?: number
          rows_skipped?: number
          source_file_name?: string | null
          spreadsheet_source_id?: string | null
          status?: string
          warnings?: Json
        }
        Update: {
          column_mapping?: Json
          completed_at?: string | null
          created_at?: string
          errors?: Json
          id?: string
          import_type?: string
          imported_by?: string | null
          rows_detected?: number
          rows_imported?: number
          rows_skipped?: number
          source_file_name?: string | null
          spreadsheet_source_id?: string | null
          status?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "spreadsheet_imports_spreadsheet_source_id_fkey"
            columns: ["spreadsheet_source_id"]
            isOneToOne: false
            referencedRelation: "spreadsheet_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      spreadsheet_sources: {
        Row: {
          created_at: string
          created_by: string | null
          external_sheet_name: string | null
          external_spreadsheet_id: string | null
          file_url: string | null
          id: string
          last_sync_status: string | null
          last_synced_at: string | null
          provider: string
          source_name: string
          source_type: string
          sync_enabled: boolean
          sync_frequency: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          external_sheet_name?: string | null
          external_spreadsheet_id?: string | null
          file_url?: string | null
          id?: string
          last_sync_status?: string | null
          last_synced_at?: string | null
          provider?: string
          source_name: string
          source_type: string
          sync_enabled?: boolean
          sync_frequency?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          external_sheet_name?: string | null
          external_spreadsheet_id?: string | null
          file_url?: string | null
          id?: string
          last_sync_status?: string | null
          last_synced_at?: string | null
          provider?: string
          source_name?: string
          source_type?: string
          sync_enabled?: boolean
          sync_frequency?: string
          updated_at?: string
        }
        Relationships: []
      }
      spreadsheet_sync_logs: {
        Row: {
          completed_at: string | null
          errors: Json
          id: string
          rows_checked: number
          rows_created: number
          rows_skipped: number
          rows_updated: number
          spreadsheet_source_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          errors?: Json
          id?: string
          rows_checked?: number
          rows_created?: number
          rows_skipped?: number
          rows_updated?: number
          spreadsheet_source_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          errors?: Json
          id?: string
          rows_checked?: number
          rows_created?: number
          rows_skipped?: number
          rows_updated?: number
          spreadsheet_source_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "spreadsheet_sync_logs_spreadsheet_source_id_fkey"
            columns: ["spreadsheet_source_id"]
            isOneToOne: false
            referencedRelation: "spreadsheet_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
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
      claim_first_admin: { Args: never; Returns: boolean }
      generate_quote_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
