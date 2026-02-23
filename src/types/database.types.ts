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
      billing_events: {
        Row: {
          created_at: string | null
          id: string
          kind: string
          mp_resource_id: string | null
          payload: Json | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kind: string
          mp_resource_id?: string | null
          payload?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kind?: string
          mp_resource_id?: string | null
          payload?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          label: string | null
          name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label?: string | null
          name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string | null
          name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_conversation_members: {
        Row: {
          conversation_id: string
          created_at: string | null
          hidden_at: string | null
          last_read_at: string | null
          unread_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          hidden_at?: string | null
          last_read_at?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          hidden_at?: string | null
          last_read_at?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          dm_key: string | null
          id: string
          last_message_at: string | null
          preview: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dm_key?: string | null
          id?: string
          last_message_at?: string | null
          preview?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dm_key?: string | null
          id?: string
          last_message_at?: string | null
          preview?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          conversation_id: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          body: string
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          expires_at: string | null
          id: string
          is_expired: boolean | null
          meta: Json | null
          product_id: string | null
          service_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_expired?: boolean | null
          meta?: Json | null
          product_id?: string | null
          service_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_expired?: boolean | null
          meta?: Json | null
          product_id?: string | null
          service_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          retry_count: number | null
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          retry_count?: number | null
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          retry_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          can_feature: boolean | null
          code: string
          created_at: string | null
          credits_monthly: number | null
          currency: string | null
          feature_cost: number | null
          max_images_per_product: number | null
          max_images_per_service: number | null
          max_products: number | null
          max_services: number | null
          name: string
          price_monthly_cents: number | null
          price_yearly_cents: number | null
          priority: string | null
          updated_at: string | null
        }
        Insert: {
          can_feature?: boolean | null
          code: string
          created_at?: string | null
          credits_monthly?: number | null
          currency?: string | null
          feature_cost?: number | null
          max_images_per_product?: number | null
          max_images_per_service?: number | null
          max_products?: number | null
          max_services?: number | null
          name: string
          price_monthly_cents?: number | null
          price_yearly_cents?: number | null
          priority?: string | null
          updated_at?: string | null
        }
        Update: {
          can_feature?: boolean | null
          code?: string
          created_at?: string | null
          credits_monthly?: number | null
          currency?: string | null
          feature_cost?: number | null
          max_images_per_product?: number | null
          max_images_per_service?: number | null
          max_products?: number | null
          max_services?: number | null
          name?: string
          price_monthly_cents?: number | null
          price_yearly_cents?: number | null
          priority?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          path: string | null
          product_id: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          path?: string | null
          product_id?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          path?: string | null
          product_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_likes: {
        Row: {
          created_at: string | null
          liker_user_id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          liker_user_id: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          liker_user_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_likes_liker_user_id_fkey"
            columns: ["liker_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_likes_liker_user_id_fkey"
            columns: ["liker_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_likes_liker_user_id_fkey"
            columns: ["liker_user_id"]
            isOneToOne: false
            referencedRelation: "v_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "product_likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived: boolean | null
          category: string | null
          created_at: string | null
          description: string | null
          featured_until: string | null
          id: string
          image_url: string | null
          images: string[] | null
          location: string | null
          price: number | null
          published: boolean | null
          quantity_unit: string | null
          quantity_value: number | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          archived?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          location?: string | null
          price?: number | null
          published?: boolean | null
          quantity_unit?: string | null
          quantity_value?: number | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          archived?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          location?: string | null
          price?: number | null
          published?: boolean | null
          quantity_unit?: string | null
          quantity_value?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profile_likes: {
        Row: {
          created_at: string | null
          liker_user_id: string
          target_seller_id: string
        }
        Insert: {
          created_at?: string | null
          liker_user_id: string
          target_seller_id: string
        }
        Update: {
          created_at?: string | null
          liker_user_id?: string
          target_seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_likes_liker_user_id_fkey"
            columns: ["liker_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_likes_liker_user_id_fkey"
            columns: ["liker_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_likes_liker_user_id_fkey"
            columns: ["liker_user_id"]
            isOneToOne: false
            referencedRelation: "v_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "profile_likes_target_seller_id_fkey"
            columns: ["target_seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_likes_target_seller_id_fkey"
            columns: ["target_seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_likes_target_seller_id_fkey"
            columns: ["target_seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          company: string | null
          country: string | null
          credits_balance: number | null
          dni_cuit: string | null
          exportador: boolean | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          mp_payer_email: string | null
          mp_preapproval_id: string | null
          mp_subscription_status: string | null
          onboarding_completed: boolean | null
          payer_id: string | null
          phone: string | null
          plan_activated_at: string | null
          plan_code: string | null
          plan_pending_code: string | null
          plan_pending_effective_at: string | null
          plan_renews_at: string | null
          postal_code: string | null
          province: string | null
          role_code: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          credits_balance?: number | null
          dni_cuit?: string | null
          exportador?: boolean | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          mp_payer_email?: string | null
          mp_preapproval_id?: string | null
          mp_subscription_status?: string | null
          onboarding_completed?: boolean | null
          payer_id?: string | null
          phone?: string | null
          plan_activated_at?: string | null
          plan_code?: string | null
          plan_pending_code?: string | null
          plan_pending_effective_at?: string | null
          plan_renews_at?: string | null
          postal_code?: string | null
          province?: string | null
          role_code?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          credits_balance?: number | null
          dni_cuit?: string | null
          exportador?: boolean | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          mp_payer_email?: string | null
          mp_preapproval_id?: string | null
          mp_subscription_status?: string | null
          onboarding_completed?: boolean | null
          payer_id?: string | null
          phone?: string | null
          plan_activated_at?: string | null
          plan_code?: string | null
          plan_pending_code?: string | null
          plan_pending_effective_at?: string | null
          plan_renews_at?: string | null
          postal_code?: string | null
          province?: string | null
          role_code?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          code: string
          description: string | null
          name: string
        }
        Insert: {
          code: string
          description?: string | null
          name: string
        }
        Update: {
          code?: string
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          severity: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_images: {
        Row: {
          created_at: string | null
          id: string
          path: string | null
          service_id: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          path?: string | null
          service_id?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          path?: string | null
          service_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_images_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_likes: {
        Row: {
          created_at: string | null
          liker_user_id: string
          service_id: string
        }
        Insert: {
          created_at?: string | null
          liker_user_id: string
          service_id: string
        }
        Update: {
          created_at?: string | null
          liker_user_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_likes_liker_user_id_fkey"
            columns: ["liker_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_likes_liker_user_id_fkey"
            columns: ["liker_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_likes_liker_user_id_fkey"
            columns: ["liker_user_id"]
            isOneToOne: false
            referencedRelation: "v_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "service_likes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          city: string | null
          created_at: string | null
          description: string | null
          dest_city: string | null
          dest_province: string | null
          featured_until: string | null
          id: string
          location: string | null
          origin_city: string | null
          origin_province: string | null
          price: number | null
          province: string | null
          published: boolean | null
          title: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          dest_city?: string | null
          dest_province?: string | null
          featured_until?: string | null
          id?: string
          location?: string | null
          origin_city?: string | null
          origin_province?: string | null
          price?: number | null
          province?: string | null
          published?: boolean | null
          title: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          dest_city?: string | null
          dest_province?: string | null
          featured_until?: string | null
          id?: string
          location?: string | null
          origin_city?: string | null
          origin_province?: string | null
          price?: number | null
          province?: string | null
          published?: boolean | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_images: {
        Row: {
          alt: string | null
          bucket: string
          category: string | null
          created_at: string
          height: number | null
          id: string
          is_active: boolean
          path: string
          priority: number
          tags: string[]
          title: string | null
          updated_at: string
          url: string | null
          width: number | null
        }
        Insert: {
          alt?: string | null
          bucket?: string
          category?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_active?: boolean
          path: string
          priority?: number
          tags?: string[]
          title?: string | null
          updated_at?: string
          url?: string | null
          width?: number | null
        }
        Update: {
          alt?: string | null
          bucket?: string
          category?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_active?: boolean
          path?: string
          priority?: number
          tags?: string[]
          title?: string | null
          updated_at?: string
          url?: string | null
          width?: number | null
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          created_at: string | null
          last_refill: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          last_refill?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          last_refill?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      user_presence: {
        Row: {
          is_online: boolean | null
          last_seen_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          is_online?: boolean | null
          last_seen_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          is_online?: boolean | null
          last_seen_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      users: {
        Row: {
          company: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
        }
        Insert: {
          company?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
        }
        Update: {
          company?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
        }
        Relationships: []
      }
      v_product_likes_count: {
        Row: {
          likes_count: number | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      v_profile_likes_count: {
        Row: {
          likes_count: number | null
          seller_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_likes_target_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_likes_target_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_likes_target_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      v_seller_stats: {
        Row: {
          avatar_url: string | null
          city: string | null
          company: string | null
          first_name: string | null
          full_name: string | null
          joined_at: string | null
          last_name: string | null
          plan_code: string | null
          products_count: number | null
          province: string | null
          seller_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      v_service_likes_count: {
        Row: {
          likes_count: number | null
          service_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_likes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      chat_get_conversations_v2: {
        Args: { p_user_id: string }
        Returns: {
          counterparty_avatar_url: string
          counterparty_email: string
          counterparty_id: string
          counterparty_name: string
          id: string
          last_created_at: string
          preview: string
          unread_count: number
        }[]
      }
      chat_list_conversations: {
        Args: { p_include_hidden?: boolean; p_user: string }
        Returns: {
          counterparty_avatar_url: string
          counterparty_id: string
          counterparty_name: string
          hidden_at: string
          id: string
          last_created_at: string
          preview: string
          unread_count: number
        }[]
      }
      mark_inactive_users_offline: { Args: never; Returns: number }
      mark_messages_delivered: {
        Args: { p_conversation_id: string; p_reader_id: string }
        Returns: number
      }
      mark_messages_read: {
        Args: { p_conversation_id: string; p_reader_id: string }
        Returns: {
          message_id: string
          sender_id: string
        }[]
      }
      update_user_presence: {
        Args: { p_is_online: boolean; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      product_status: "draft" | "published" | "archived"
      subscription_status: "active" | "inactive" | "cancelled" | "past_due"
      user_role: "visitante" | "interesado" | "anunciante" | "admin"
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
    Enums: {
      product_status: ["draft", "published", "archived"],
      subscription_status: ["active", "inactive", "cancelled", "past_due"],
      user_role: ["visitante", "interesado", "anunciante", "admin"],
    },
  },
} as const
