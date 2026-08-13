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
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string | null
          id: string
          issued_at: string | null
          test_attempt_id: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id?: string | null
          id?: string
          issued_at?: string | null
          test_attempt_id: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string | null
          id?: string
          issued_at?: string | null
          test_attempt_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_test_attempt_id_fkey"
            columns: ["test_attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_retake_purchases: {
        Row: {
          amount_paid: number
          buyer_email: string | null
          buyer_name: string | null
          consumed_at: string | null
          course_id: string | null
          created_at: string
          discount_code_id: string | null
          discount_summary: string | null
          id: string
          refunded_amount: number
          refunded_at: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          buyer_email?: string | null
          buyer_name?: string | null
          consumed_at?: string | null
          course_id?: string | null
          created_at?: string
          discount_code_id?: string | null
          discount_summary?: string | null
          id?: string
          refunded_amount?: number
          refunded_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          buyer_email?: string | null
          buyer_name?: string | null
          consumed_at?: string | null
          course_id?: string | null
          created_at?: string
          discount_code_id?: string | null
          discount_summary?: string | null
          id?: string
          refunded_amount?: number
          refunded_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_retake_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_retake_purchases_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_test_progress: {
        Row: {
          answers: Json
          course_id: string | null
          current_question_index: number
          id: string
          is_completed: boolean
          questions: Json
          started_at: string
          test_attempt_id: string | null
          time_left: number
          user_id: string
        }
        Insert: {
          answers?: Json
          course_id?: string | null
          current_question_index?: number
          id?: string
          is_completed?: boolean
          questions?: Json
          started_at?: string
          test_attempt_id?: string | null
          time_left?: number
          user_id: string
        }
        Update: {
          answers?: Json
          course_id?: string | null
          current_question_index?: number
          id?: string
          is_completed?: boolean
          questions?: Json
          started_at?: string
          test_attempt_id?: string | null
          time_left?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_test_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_test_progress_test_attempt_id_fkey"
            columns: ["test_attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_bookmarks: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          item_id: string
          item_title: string
          item_type: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          item_id: string
          item_title: string
          item_type: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          item_id?: string
          item_title?: string
          item_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_bookmarks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          course_id: string
          created_at: string | null
          explanation: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          lesson_id: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          explanation?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          lesson_id?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          explanation?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          lesson_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          course_id: string
          id: string
          last_item_index: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          last_item_index?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          last_item_index?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          amount_paid: number
          buyer_email: string | null
          buyer_name: string | null
          course_id: string
          discount_code_id: string | null
          discount_summary: string | null
          granted_by: string | null
          granted_by_admin: boolean
          id: string
          payment_status: string
          purchased_at: string
          refunded_amount: number
          refunded_at: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number
          buyer_email?: string | null
          buyer_name?: string | null
          course_id: string
          discount_code_id?: string | null
          discount_summary?: string | null
          granted_by?: string | null
          granted_by_admin?: boolean
          id?: string
          payment_status?: string
          purchased_at?: string
          refunded_amount?: number
          refunded_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          buyer_email?: string | null
          buyer_name?: string | null
          course_id?: string
          discount_code_id?: string | null
          discount_summary?: string | null
          granted_by?: string | null
          granted_by_admin?: boolean
          id?: string
          payment_status?: string
          purchased_at?: string
          refunded_amount?: number
          refunded_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_purchases_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          attempts_included: number
          attempts_total: number
          certification_enabled: boolean
          certification_mode: string
          certification_pass_percent: number
          certification_question_count: number | null
          course_includes: string | null
          created_at: string | null
          description: string
          discount_price: number | null
          discount_valid_until: string | null
          hero_image: string | null
          id: string
          price: number | null
          retake_price: number
          test_questions_count: number
          title: string
          total_lessons: number
          updated_at: string | null
          what_you_learn: string | null
        }
        Insert: {
          attempts_included?: number
          attempts_total?: number
          certification_enabled?: boolean
          certification_mode?: string
          certification_pass_percent?: number
          certification_question_count?: number | null
          course_includes?: string | null
          created_at?: string | null
          description: string
          discount_price?: number | null
          discount_valid_until?: string | null
          hero_image?: string | null
          id?: string
          price?: number | null
          retake_price?: number
          test_questions_count?: number
          title: string
          total_lessons?: number
          updated_at?: string | null
          what_you_learn?: string | null
        }
        Update: {
          attempts_included?: number
          attempts_total?: number
          certification_enabled?: boolean
          certification_mode?: string
          certification_pass_percent?: number
          certification_question_count?: number | null
          course_includes?: string | null
          created_at?: string | null
          description?: string
          discount_price?: number | null
          discount_valid_until?: string | null
          hero_image?: string | null
          id?: string
          price?: number | null
          retake_price?: number
          test_questions_count?: number
          title?: string
          total_lessons?: number
          updated_at?: string | null
          what_you_learn?: string | null
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          batch_label: string | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          percent: number
          redeemed_at: string | null
          redeemed_by: string | null
          redeemed_email: string | null
          updated_at: string
        }
        Insert: {
          batch_label?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          percent: number
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_email?: string | null
          updated_at?: string
        }
        Update: {
          batch_label?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          percent?: number
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_published: boolean
          order_index: number
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_published?: boolean
          order_index?: number
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_published?: boolean
          order_index?: number
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_counters: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          last_number: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          doc_type: string
          id?: string
          last_number?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          last_number?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          buyer_address_line1: string | null
          buyer_address_line2: string | null
          buyer_city: string | null
          buyer_company: string | null
          buyer_country: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_postal_code: string | null
          buyer_vat_id: string | null
          corrected_total_amount: number | null
          course_id: string | null
          course_purchase_id: string | null
          created_at: string
          currency: string
          discount_code_id: string | null
          discount_summary: string | null
          discovered_from_fxl: boolean
          doc_type: string
          fxl_document_id: string | null
          fxl_email_code: string | null
          fxl_email_error: string | null
          fxl_email_sent_at: string | null
          fxl_email_status: string | null
          fxl_exchange_rate: number | null
          fxl_nbp_table: string | null
          fxl_rate_date: string | null
          fxl_status: string
          fxl_unique_code: string | null
          gross_amount: number
          id: string
          invoice_number: string
          issued_at: string
          ksef_assigned_at: string | null
          ksef_attempts: number
          ksef_error_code: string | null
          ksef_error_desc: string | null
          ksef_number: string | null
          ksef_status: number | null
          line_items: Json
          net_amount: number
          notes: string | null
          notify_sent_at: string | null
          notify_status: string | null
          original_invoice_id: string | null
          payment_due_date: string | null
          pdf_path: string | null
          purchase_type: string
          refund_reason: string | null
          refundable_amount: number | null
          retake_purchase_id: string | null
          reverse_charge: boolean
          seller: Json
          settled_at: string | null
          settled_by: string | null
          settlement_status: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refunded_amount: number
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
          vat_amount: number
          vat_amount_pln: number | null
          vat_rate: number
        }
        Insert: {
          buyer_address_line1?: string | null
          buyer_address_line2?: string | null
          buyer_city?: string | null
          buyer_company?: string | null
          buyer_country?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_postal_code?: string | null
          buyer_vat_id?: string | null
          corrected_total_amount?: number | null
          course_id?: string | null
          course_purchase_id?: string | null
          created_at?: string
          currency?: string
          discount_code_id?: string | null
          discount_summary?: string | null
          discovered_from_fxl?: boolean
          doc_type?: string
          fxl_document_id?: string | null
          fxl_email_code?: string | null
          fxl_email_error?: string | null
          fxl_email_sent_at?: string | null
          fxl_email_status?: string | null
          fxl_exchange_rate?: number | null
          fxl_nbp_table?: string | null
          fxl_rate_date?: string | null
          fxl_status?: string
          fxl_unique_code?: string | null
          gross_amount?: number
          id?: string
          invoice_number: string
          issued_at?: string
          ksef_assigned_at?: string | null
          ksef_attempts?: number
          ksef_error_code?: string | null
          ksef_error_desc?: string | null
          ksef_number?: string | null
          ksef_status?: number | null
          line_items?: Json
          net_amount?: number
          notes?: string | null
          notify_sent_at?: string | null
          notify_status?: string | null
          original_invoice_id?: string | null
          payment_due_date?: string | null
          pdf_path?: string | null
          purchase_type?: string
          refund_reason?: string | null
          refundable_amount?: number | null
          retake_purchase_id?: string | null
          reverse_charge?: boolean
          seller?: Json
          settled_at?: string | null
          settled_by?: string | null
          settlement_status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_refunded_amount?: number
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
          vat_amount?: number
          vat_amount_pln?: number | null
          vat_rate?: number
        }
        Update: {
          buyer_address_line1?: string | null
          buyer_address_line2?: string | null
          buyer_city?: string | null
          buyer_company?: string | null
          buyer_country?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_postal_code?: string | null
          buyer_vat_id?: string | null
          corrected_total_amount?: number | null
          course_id?: string | null
          course_purchase_id?: string | null
          created_at?: string
          currency?: string
          discount_code_id?: string | null
          discount_summary?: string | null
          discovered_from_fxl?: boolean
          doc_type?: string
          fxl_document_id?: string | null
          fxl_email_code?: string | null
          fxl_email_error?: string | null
          fxl_email_sent_at?: string | null
          fxl_email_status?: string | null
          fxl_exchange_rate?: number | null
          fxl_nbp_table?: string | null
          fxl_rate_date?: string | null
          fxl_status?: string
          fxl_unique_code?: string | null
          gross_amount?: number
          id?: string
          invoice_number?: string
          issued_at?: string
          ksef_assigned_at?: string | null
          ksef_attempts?: number
          ksef_error_code?: string | null
          ksef_error_desc?: string | null
          ksef_number?: string | null
          ksef_status?: number | null
          line_items?: Json
          net_amount?: number
          notes?: string | null
          notify_sent_at?: string | null
          notify_status?: string | null
          original_invoice_id?: string | null
          payment_due_date?: string | null
          pdf_path?: string | null
          purchase_type?: string
          refund_reason?: string | null
          refundable_amount?: number | null
          retake_purchase_id?: string | null
          reverse_charge?: boolean
          seller?: Json
          settled_at?: string | null
          settled_by?: string | null
          settlement_status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_refunded_amount?: number
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
          vat_amount?: number
          vat_amount_pln?: number | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_course_purchase_id_fkey"
            columns: ["course_purchase_id"]
            isOneToOne: false
            referencedRelation: "course_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_retake_purchase_id_fkey"
            columns: ["retake_purchase_id"]
            isOneToOne: false
            referencedRelation: "certification_retake_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_text: string | null
          content_type: string
          content_url: string | null
          course_id: string
          created_at: string | null
          duration: string | null
          id: string
          is_free: boolean
          order_index: number
          title: string
        }
        Insert: {
          content_text?: string | null
          content_type: string
          content_url?: string | null
          course_id: string
          created_at?: string | null
          duration?: string | null
          id?: string
          is_free?: boolean
          order_index: number
          title: string
        }
        Update: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          course_id?: string
          created_at?: string | null
          duration?: string | null
          id?: string
          is_free?: boolean
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons_backup_20260812: {
        Row: {
          content_text: string | null
          content_type: string | null
          content_url: string | null
          course_id: string | null
          created_at: string | null
          duration: string | null
          id: string | null
          is_free: boolean | null
          order_index: number | null
          title: string | null
        }
        Insert: {
          content_text?: string | null
          content_type?: string | null
          content_url?: string | null
          course_id?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string | null
          is_free?: boolean | null
          order_index?: number | null
          title?: string | null
        }
        Update: {
          content_text?: string | null
          content_type?: string | null
          content_url?: string | null
          course_id?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string | null
          is_free?: boolean | null
          order_index?: number | null
          title?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          buyer_type: string
          certificate_name: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          discount_percent: number
          email: string | null
          full_name: string | null
          id: string
          postal_code: string | null
          stripe_customer_id: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string | null
          vat_id: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          buyer_type?: string
          certificate_name?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          discount_percent?: number
          email?: string | null
          full_name?: string | null
          id: string
          postal_code?: string | null
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
          vat_id?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          buyer_type?: string
          certificate_name?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          discount_percent?: number
          email?: string | null
          full_name?: string | null
          id?: string
          postal_code?: string | null
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
          vat_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          course_id: string
          id: string
          is_certification_test: boolean
          passed: boolean
          points_earned: number | null
          points_possible: number | null
          score: number
          started_at: string | null
          time_per_question: Json | null
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          course_id: string
          id?: string
          is_certification_test?: boolean
          passed: boolean
          points_earned?: number | null
          points_possible?: number | null
          score: number
          started_at?: string | null
          time_per_question?: Json | null
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          course_id?: string
          id?: string
          is_certification_test?: boolean
          passed?: boolean
          points_earned?: number | null
          points_possible?: number | null
          score?: number
          started_at?: string | null
          time_per_question?: Json | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          correct_answer: string | null
          course_id: string | null
          created_at: string | null
          explanation: string | null
          group_title: string | null
          id: string
          image_url: string | null
          image_urls: string[]
          is_free: boolean
          lesson_id: string | null
          option_a: string | null
          option_b: string | null
          option_c: string | null
          option_d: string | null
          options: Json
          order_index: number | null
          question_text: string
          test_type: string
          updated_at: string | null
        }
        Insert: {
          correct_answer?: string | null
          course_id?: string | null
          created_at?: string | null
          explanation?: string | null
          group_title?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_free?: boolean
          lesson_id?: string | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          options?: Json
          order_index?: number | null
          question_text: string
          test_type?: string
          updated_at?: string | null
        }
        Update: {
          correct_answer?: string | null
          course_id?: string | null
          created_at?: string | null
          explanation?: string | null
          group_title?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_free?: boolean
          lesson_id?: string | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          options?: Json
          order_index?: number | null
          question_text?: string
          test_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          lesson_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_invoice_number: { Args: { _doc_type: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
