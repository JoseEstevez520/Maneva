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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_history: {
        Row: {
          appointment_id: string
          change_reason: string | null
          changed_by: string
          created_at: string
          id: string
          new_start: string | null
          new_status: string | null
          old_start: string | null
          old_status: string | null
        }
        Insert: {
          appointment_id: string
          change_reason?: string | null
          changed_by: string
          created_at?: string
          id?: string
          new_start?: string | null
          new_status?: string | null
          old_start?: string | null
          old_status?: string | null
        }
        Update: {
          appointment_id?: string
          change_reason?: string | null
          changed_by?: string
          created_at?: string
          id?: string
          new_start?: string | null
          new_status?: string | null
          old_start?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_services: {
        Row: {
          appointment_id: string
          created_at: string
          duration_minutes: number | null
          employee_id: string
          id: string
          notes: string | null
          price: number | null
          service_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          duration_minutes?: number | null
          employee_id: string
          id?: string
          notes?: string | null
          price?: number | null
          service_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string
          id?: string
          notes?: string | null
          price?: number | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string
          client_notes: string | null
          created_at: string
          created_by: string | null
          employee_notes: string | null
          final_price: number | null
          id: string
          location_id: string
          paid: boolean
          payment_method: string | null
          scheduled_at: string
          scheduled_end: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id: string
          client_notes?: string | null
          created_at?: string
          created_by?: string | null
          employee_notes?: string | null
          final_price?: number | null
          id?: string
          location_id: string
          paid?: boolean
          payment_method?: string | null
          scheduled_at: string
          scheduled_end: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string
          client_notes?: string | null
          created_at?: string
          created_by?: string | null
          employee_notes?: string | null
          final_price?: number | null
          id?: string
          location_id?: string
          paid?: boolean
          payment_method?: string | null
          scheduled_at?: string
          scheduled_end?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_channels: {
        Row: {
          active: boolean
          channel_type: string
          created_at: string
          credentials: Json | null
          id: string
          location_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          channel_type: string
          created_at?: string
          credentials?: Json | null
          id?: string
          location_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          channel_type?: string
          created_at?: string
          credentials?: Json | null
          id?: string
          location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_channels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          active: boolean
          condition: Json | null
          created_at: string
          end_date: string
          id: string
          location_id: string
          name: string
          start_date: string
          type: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          condition?: Json | null
          created_at?: string
          end_date: string
          id?: string
          location_id: string
          name: string
          start_date: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          condition?: Json | null
          created_at?: string
          end_date?: string
          id?: string
          location_id?: string
          name?: string
          start_date?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policies: {
        Row: {
          active: boolean
          created_at: string
          hours_before: number | null
          id: string
          location_id: string
          penalty_fixed: number | null
          penalty_percentage: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          hours_before?: number | null
          id?: string
          location_id: string
          penalty_fixed?: number | null
          penalty_percentage?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          hours_before?: number | null
          id?: string
          location_id?: string
          penalty_fixed?: number | null
          penalty_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_policies_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellations: {
        Row: {
          appointment_id: string
          cancelled_at: string
          cancelled_by: string | null
          created_at: string
          id: string
          penalty_amount: number | null
          penalty_applied: boolean
          reason: string | null
        }
        Insert: {
          appointment_id: string
          cancelled_at?: string
          cancelled_by?: string | null
          created_at?: string
          id?: string
          penalty_amount?: number | null
          penalty_applied?: boolean
          reason?: string | null
        }
        Update: {
          appointment_id?: string
          cancelled_at?: string
          cancelled_by?: string | null
          created_at?: string
          id?: string
          penalty_amount?: number | null
          penalty_applied?: boolean
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          currency_id: string | null
          id: string
          name: string
          phone_prefix: string | null
        }
        Insert: {
          code: string
          currency_id?: string | null
          id?: string
          name: string
          phone_prefix?: string | null
        }
        Update: {
          code?: string
          currency_id?: string | null
          id?: string
          name?: string
          phone_prefix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "countries_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          id: string
          name: string
          symbol: string | null
        }
        Insert: {
          code: string
          id?: string
          name: string
          symbol?: string | null
        }
        Update: {
          code?: string
          id?: string
          name?: string
          symbol?: string | null
        }
        Relationships: []
      }
      eco_labels: {
        Row: {
          active: boolean
          awarded_at: string
          created_at: string
          id: string
          label_type: string
          location_id: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          awarded_at: string
          created_at?: string
          id?: string
          label_type: string
          location_id: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          awarded_at?: string
          created_at?: string
          id?: string
          label_type?: string
          location_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eco_labels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_availability: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string
          id: string
          start_time: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_services: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          service_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_unavailability: {
        Row: {
          approved_by: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_unavailability_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_unavailability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          bio: string | null
          created_at: string
          hire_date: string | null
          id: string
          location_id: string
          personal_quote: string | null
          photo_url: string | null
          position: string | null
          specialties: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          created_at?: string
          hire_date?: string | null
          id?: string
          location_id: string
          personal_quote?: string | null
          photo_url?: string | null
          position?: string | null
          specialties?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          created_at?: string
          hire_date?: string | null
          id?: string
          location_id?: string
          personal_quote?: string | null
          photo_url?: string | null
          position?: string | null
          specialties?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_photo_url_fkey"
            columns: ["photo_url"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_locations: {
        Row: {
          created_at: string
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line: {
        Row: {
          appointment_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          service_id: string | null
          subtotal: number
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity: number
          service_id?: string | null
          subtotal: number
          tax_rate?: number | null
          unit_price: number
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          service_id?: string | null
          subtotal?: number
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          base_amount: number
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          location_id: string
          status: string
          tax_amount: number
          total_amount: number
          updated_at: string
          verifactu_xml: string | null
        }
        Insert: {
          base_amount: number
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          location_id: string
          status?: string
          tax_amount: number
          total_amount: number
          updated_at?: string
          verifactu_xml?: string | null
        }
        Update: {
          base_amount?: number
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          location_id?: string
          status?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          verifactu_xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      linked_profiles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          permissions: Json
          primary_user_id: string
          secondary_user_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          permissions?: Json
          primary_user_id: string
          secondary_user_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          permissions?: Json
          primary_user_id?: string
          secondary_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "linked_profiles_primary_user_id_fkey"
            columns: ["primary_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linked_profiles_secondary_user_id_fkey"
            columns: ["secondary_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      location_config: {
        Row: {
          config_key: string
          config_value: string | null
          created_at: string
          id: string
          location_id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: string | null
          created_at?: string
          id?: string
          location_id: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: string | null
          created_at?: string
          id?: string
          location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_config_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_hours: {
        Row: {
          close_time: string | null
          day_of_week: number
          id: string
          location_id: string
          open_time: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          close_time?: string | null
          day_of_week: number
          id?: string
          location_id: string
          open_time?: string | null
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          close_time?: string | null
          day_of_week?: number
          id?: string
          location_id?: string
          open_time?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          media_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          media_url: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
        }
        Relationships: []
      }
      media_posts: {
        Row: {
          id: string
          media_id: string
          order_index: number | null
          post_id: string
        }
        Insert: {
          id?: string
          media_id: string
          order_index?: number | null
          post_id: string
        }
        Update: {
          id?: string
          media_id?: string
          order_index?: number | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_posts_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          message: string | null
          read: boolean
          sent_at: string | null
          title: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          sent_at?: string | null
          title?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          sent_at?: string | null
          title?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          currency: string
          id: string
          payment_date: string | null
          payment_method: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id: string
          created_at?: string
          currency?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          currency?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          created_at: string
          employee_id: string
          id: string
          location_id: string
          published_at: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          employee_id: string
          id?: string
          location_id: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          location_id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_category_assignments: {
        Row: {
          category_id: string
          id: string
          product_id: string
        }
        Insert: {
          category_id: string
          id?: string
          product_id: string
        }
        Update: {
          category_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_usage: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          product_id: string
          quantity_used: number
          unit_measure: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity_used: number
          unit_measure?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity_used?: number
          unit_measure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          brand: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          eco_friendly: boolean
          id: string
          location_id: string
          min_stock: number | null
          name: string
          sale_price: number | null
          sku: string | null
          stock_quantity: number
          unit_measure: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          eco_friendly?: boolean
          id?: string
          location_id: string
          min_stock?: number | null
          name: string
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number
          unit_measure?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          eco_friendly?: boolean
          id?: string
          location_id?: string
          min_stock?: number | null
          name?: string
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number
          unit_measure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      review_employees: {
        Row: {
          employee_id: string
          id: string
          review_id: string
        }
        Insert: {
          employee_id: string
          id?: string
          review_id: string
        }
        Update: {
          employee_id?: string
          id?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_employees_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          location_id: string
          rating: number
          response: string | null
          sentiment: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          location_id: string
          rating: number
          response?: string | null
          sentiment?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          location_id?: string
          rating?: number
          response?: string | null
          sentiment?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      salon_locations: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          country_id: string | null
          created_at: string
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          postal_code: string | null
          salon_id: string
          timezone_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          country_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          postal_code?: string | null
          salon_id: string
          timezone_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          country_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          salon_id?: string
          timezone_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_locations_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_locations_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_locations_timezone_id_fkey"
            columns: ["timezone_id"]
            isOneToOne: false
            referencedRelation: "timezones"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          active: boolean | null
          config: Json | null
          country_id: string | null
          created_at: string
          currency_id: string | null
          default_language_id: string | null
          description: string | null
          email_contact: string | null
          fiscal_address: string | null
          id: string
          name: string
          nif: string | null
          phone: string | null
          subscription_end: string | null
          subscription_plan: string | null
          subscription_start: string | null
          timezone_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          config?: Json | null
          country_id?: string | null
          created_at?: string
          currency_id?: string | null
          default_language_id?: string | null
          description?: string | null
          email_contact?: string | null
          fiscal_address?: string | null
          id?: string
          name: string
          nif?: string | null
          phone?: string | null
          subscription_end?: string | null
          subscription_plan?: string | null
          subscription_start?: string | null
          timezone_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          config?: Json | null
          country_id?: string | null
          created_at?: string
          currency_id?: string | null
          default_language_id?: string | null
          description?: string | null
          email_contact?: string | null
          fiscal_address?: string | null
          id?: string
          name?: string
          nif?: string | null
          phone?: string | null
          subscription_end?: string | null
          subscription_plan?: string | null
          subscription_start?: string | null
          timezone_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salons_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salons_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salons_default_language_id_fkey"
            columns: ["default_language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salons_timezone_id_fkey"
            columns: ["timezone_id"]
            isOneToOne: false
            referencedRelation: "timezones"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string | null
          config: Json | null
          created_at: string
          currency_id: string
          description: string | null
          duration_minutes: number
          id: string
          location_id: string
          name: string
          price: number
          requires_products: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          config?: Json | null
          created_at?: string
          currency_id: string
          description?: string | null
          duration_minutes: number
          id?: string
          location_id: string
          name: string
          price: number
          requires_products?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          config?: Json | null
          created_at?: string
          currency_id?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location_id?: string
          name?: string
          price?: number
          requires_products?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "salon_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          alert_date: string
          alert_type: string
          created_at: string
          id: string
          product_id: string
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          alert_date?: string
          alert_type: string
          created_at?: string
          id?: string
          product_id: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          alert_date?: string
          alert_type?: string
          created_at?: string
          id?: string
          product_id?: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      timezones: {
        Row: {
          id: string
          name: string
          utc_offset: string
        }
        Insert: {
          id?: string
          name: string
          utc_offset: string
        }
        Update: {
          id?: string
          name?: string
          utc_offset?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          preference_key: string
          preference_value: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preference_key: string
          preference_value?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preference_key?: string
          preference_value?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          hair_type: string | null
          id: string
          preferred_styles: string | null
          simple_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          hair_type?: string | null
          id?: string
          preferred_styles?: string | null
          simple_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          hair_type?: string | null
          id?: string
          preferred_styles?: string | null
          simple_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_avatar_url_fkey"
            columns: ["avatar_url"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          first_name: string
          id: string
          language_id: string | null
          last_name: string
          password_hash: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          first_name: string
          id?: string
          language_id?: string | null
          last_name: string
          password_hash: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          first_name?: string
          id?: string
          language_id?: string | null
          last_name?: string
          password_hash?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          ai_response: string | null
          created_at: string
          direction: string
          id: string
          message: string
          phone_number: string
          processed_by_ai: boolean
          user_id: string | null
        }
        Insert: {
          ai_response?: string | null
          created_at?: string
          direction: string
          id?: string
          message: string
          phone_number: string
          processed_by_ai?: boolean
          user_id?: string | null
        }
        Update: {
          ai_response?: string | null
          created_at?: string
          direction?: string
          id?: string
          message?: string
          phone_number?: string
          processed_by_ai?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
