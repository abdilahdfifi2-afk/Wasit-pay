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
      admin_actions_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          code: string
          created_at: string
          id: string
          ip_hash: string | null
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      affiliate_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          confirm_after: string
          created_at: string
          id: string
          kind: string
          order_id: string | null
          paid_ledger_id: string | null
          referred_user_id: string
          status: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          confirm_after?: string
          created_at?: string
          id?: string
          kind: string
          order_id?: string | null
          paid_ledger_id?: string | null
          referred_user_id: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          confirm_after?: string
          created_at?: string
          id?: string
          kind?: string
          order_id?: string | null
          paid_ledger_id?: string | null
          referred_user_id?: string
          status?: string
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          code: string
          created_at: string
          first_order_at: string | null
          first_order_id: string | null
          id: string
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          code: string
          created_at?: string
          first_order_at?: string | null
          first_order_id?: string | null
          id?: string
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          code?: string
          created_at?: string
          first_order_at?: string | null
          first_order_id?: string | null
          id?: string
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_resolution: string | null
          created_at: string
          id: string
          opened_by: string
          order_id: string
          reason: string
          status: Database["public"]["Enums"]["dispute_status"]
        }
        Insert: {
          admin_resolution?: string | null
          created_at?: string
          id?: string
          opened_by: string
          order_id: string
          reason: string
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Update: {
          admin_resolution?: string | null
          created_at?: string
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          image_url: string | null
          is_read: boolean
          message: string | null
          order_id: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          message?: string | null
          order_id?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          message?: string | null
          order_id?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          buyer_id: string
          commission: number
          created_at: string
          id: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_method: string | null
          product_id: string
          seller_id: string
          shipping_address: string | null
          shipping_status: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          commission?: number
          created_at?: string
          id?: string
          order_status?: Database["public"]["Enums"]["order_status"]
          payment_method?: string | null
          product_id: string
          seller_id: string
          shipping_address?: string | null
          shipping_status?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          commission?: number
          created_at?: string
          id?: string
          order_status?: Database["public"]["Enums"]["order_status"]
          payment_method?: string | null
          product_id?: string
          seller_id?: string
          shipping_address?: string | null
          shipping_status?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          image_url: string
          order_id: string
          payment_method: string | null
          transaction_reference: string | null
          uploaded_by: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          image_url: string
          order_id: string
          payment_method?: string | null
          transaction_reference?: string | null
          uploaded_by: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          image_url?: string
          order_id?: string
          payment_method?: string | null
          transaction_reference?: string | null
          uploaded_by?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          condition: string
          created_at: string
          description: string | null
          id: string
          images: string[]
          price: number
          seller_id: string
          status: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          price: number
          seller_id: string
          status?: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          price?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["product_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_banned: boolean
          phone: string | null
          updated_at: string
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_banned?: boolean
          phone?: string | null
          updated_at?: string
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean
          phone?: string | null
          updated_at?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          reviewed_user_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          reviewed_user_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          reviewed_user_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_verifications: {
        Row: {
          admin_notes: string | null
          created_at: string
          full_name: string
          id: string
          id_card_back_url: string
          id_card_front_url: string
          id_card_number: string
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          full_name: string
          id?: string
          id_card_back_url: string
          id_card_front_url: string
          id_card_number: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url: string
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          full_name?: string
          id?: string
          id_card_back_url?: string
          id_card_front_url?: string
          id_card_number?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id?: string
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
      wallet_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["wallet_entry_kind"]
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["wallet_entry_kind"]
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["wallet_entry_kind"]
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_details: Json
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          transaction_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_details?: Json
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transaction_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_details?: Json
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transaction_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      affiliate_clicks_safe: {
        Row: {
          code: string | null
          created_at: string | null
          id: string | null
          referer: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string | null
          referer?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string | null
          referer?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_banned: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_banned?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_banned?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      affiliate_payout: { Args: never; Returns: number }
      apply_referral_code: { Args: { _code: string }; Returns: undefined }
      apply_wallet_delta: {
        Args: {
          _amount: number
          _created_by?: string
          _kind: Database["public"]["Enums"]["wallet_entry_kind"]
          _notes?: string
          _reference_id?: string
          _reference_type?: string
          _user_id: string
        }
        Returns: string
      }
      get_or_create_affiliate_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          _action: string
          _details?: Json
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _link?: string
          _message: string
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
      request_withdrawal: {
        Args: {
          _account_details: Json
          _amount: number
          _payment_method: string
        }
        Returns: string
      }
      resolve_dispute: {
        Args: { _dispute_id: string; _resolution?: string; _winner: string }
        Returns: undefined
      }
      review_payment_proof: {
        Args: {
          _decision: Database["public"]["Enums"]["verification_status"]
          _notes?: string
          _proof_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "buyer" | "seller" | "admin"
      dispute_status: "open" | "reviewing" | "resolved" | "rejected"
      kyc_status: "pending" | "approved" | "rejected"
      order_status:
        | "pending_payment"
        | "payment_review"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled"
        | "disputed"
      product_status: "active" | "sold" | "draft" | "removed"
      verification_status: "pending" | "approved" | "rejected"
      wallet_entry_kind:
        | "opening_balance"
        | "order_credit"
        | "withdrawal_hold"
        | "withdrawal_refund"
        | "withdrawal_complete"
        | "admin_adjustment"
      withdrawal_status: "pending" | "processing" | "completed" | "rejected"
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
      app_role: ["buyer", "seller", "admin"],
      dispute_status: ["open", "reviewing", "resolved", "rejected"],
      kyc_status: ["pending", "approved", "rejected"],
      order_status: [
        "pending_payment",
        "payment_review",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "disputed",
      ],
      product_status: ["active", "sold", "draft", "removed"],
      verification_status: ["pending", "approved", "rejected"],
      wallet_entry_kind: [
        "opening_balance",
        "order_credit",
        "withdrawal_hold",
        "withdrawal_refund",
        "withdrawal_complete",
        "admin_adjustment",
      ],
      withdrawal_status: ["pending", "processing", "completed", "rejected"],
    },
  },
} as const
