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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          outlet_id: string
          customer_name: string
          customer_email: string | null
          customer_phone: string
          slot_time: string
          status: string
          payment_status: string
          payment_amount: number
          notes: string | null
          confirmed_by: string | null
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          outlet_id: string
          customer_name: string
          customer_email?: string | null
          customer_phone: string
          slot_time: string
          status?: string
          payment_status?: string
          payment_amount?: number
          notes?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          outlet_id?: string
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string
          slot_time?: string
          status?: string
          payment_status?: string
          payment_amount?: number
          notes?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category_id: string | null
          created_at: string
          description: string
          expense_date: string | null
          id: string
          notes: string | null
          outlet_id: string
          receipt_url: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          description: string
          expense_date?: string | null
          id?: string
          notes?: string | null
          outlet_id: string
          receipt_url?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          expense_date?: string | null
          id?: string
          notes?: string | null
          outlet_id?: string
          receipt_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          current_stock: number | null
          id: string
          min_stock: number | null
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number | null
          id?: string
          min_stock?: number | null
          name: string
          unit: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number | null
          id?: string
          min_stock?: number | null
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          notes: string | null
          outlet_id: string
          quantity: number
          reference_id: string | null
          type: Database["public"]["Enums"]["inventory_transaction_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          outlet_id: string
          quantity: number
          reference_id?: string | null
          type: Database["public"]["Enums"]["inventory_transaction_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          outlet_id?: string
          quantity?: number
          reference_id?: string | null
          type?: Database["public"]["Enums"]["inventory_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_inventory: {
        Row: {
          id: string
          inventory_item_id: string
          outlet_id: string
          quantity: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          inventory_item_id: string
          outlet_id: string
          quantity?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          inventory_item_id?: string
          outlet_id?: string
          quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_inventory_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_inventory_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          closing_cash: number | null
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          opening_cash: number | null
          outlet_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          closing_cash?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          opening_cash?: number | null
          outlet_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          closing_cash?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          opening_cash?: number | null
          outlet_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          cost_price: number | null
          created_at: string
          id: string
          notes: string | null
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          subtotal: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          discount: number | null
          id: string
          notes: string | null
          outlet_id: string
          payment_details: Json | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          shift_id: string | null
          subtotal: number
          tax: number | null
          total: number
          transaction_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount?: number | null
          id?: string
          notes?: string | null
          outlet_id: string
          payment_details?: Json | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          shift_id?: string | null
          subtotal: number
          tax?: number | null
          total: number
          transaction_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount?: number | null
          id?: string
          notes?: string | null
          outlet_id?: string
          payment_details?: Json | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shift_id?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          transaction_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_outlets: {
        Row: {
          created_at: string
          id: string
          outlet_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outlet_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          outlet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_outlets_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
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
      vendors: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          id: string
          outlet_id: string
          vendor_id: string
          status: Database["public"]["Enums"]["purchase_order_status"]
          total_amount: number
          expected_date: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          outlet_id: string
          vendor_id: string
          status?: Database["public"]["Enums"]["purchase_order_status"]
          total_amount?: number
          expected_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          outlet_id?: string
          vendor_id?: string
          status?: Database["public"]["Enums"]["purchase_order_status"]
          total_amount?: number
          expected_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory_batches: {
        Row: {
          id: string
          inventory_item_id: string
          outlet_id: string
          sku_batch: string | null
          initial_quantity: number
          current_quantity: number
          expiration_date: string | null
          received_date: string | null
          purchase_order_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inventory_item_id: string
          outlet_id: string
          sku_batch?: string | null
          initial_quantity: number
          current_quantity: number
          expiration_date?: string | null
          received_date?: string | null
          purchase_order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          inventory_item_id?: string
          outlet_id?: string
          sku_batch?: string | null
          initial_quantity?: number
          current_quantity?: number
          expiration_date?: string | null
          received_date?: string | null
          purchase_order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          }
        ]
      }
      employees: {
        Row: {
          id: string
          outlet_id: string
          full_name: string
          nik: string | null
          job_position: string
          base_salary: number
          join_date: string
          status: string
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          outlet_id: string
          full_name: string
          nik?: string | null
          job_position: string
          base_salary?: number
          join_date?: string
          status?: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          outlet_id?: string
          full_name?: string
          nik?: string | null
          job_position?: string
          base_salary?: number
          join_date?: string
          status?: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance_logs: {
        Row: {
          id: string
          employee_id: string
          outlet_id: string
          date: string
          clock_in: string | null
          clock_out: string | null
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          outlet_id: string
          date?: string
          clock_in?: string | null
          clock_out?: string | null
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          outlet_id?: string
          date?: string
          clock_in?: string | null
          clock_out?: string | null
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      payroll_runs: {
        Row: {
          id: string
          outlet_id: string
          period: string
          total_amount: number
          status: string
          created_by: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          outlet_id: string
          period: string
          total_amount?: number
          status?: string
          created_by?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          outlet_id?: string
          period?: string
          total_amount?: number
          status?: string
          created_by?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_items: {
        Row: {
          id: string
          payroll_run_id: string
          employee_id: string
          base_salary: number
          allowances: number
          deductions: number
          net_salary: number
          created_at: string
        }
        Insert: {
          id?: string
          payroll_run_id: string
          employee_id: string
          base_salary?: number
          allowances?: number
          deductions?: number
          net_salary?: number
          created_at?: string
        }
        Update: {
          id?: string
          payroll_run_id?: string
          employee_id?: string
          base_salary?: number
          allowances?: number
          deductions?: number
          net_salary?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      partner_vendors: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          category: string
          business_types: string[]
          description: string | null
          contact_whatsapp: string | null
          contact_email: string | null
          website_url: string | null
          address: string | null
          is_featured: boolean
          is_active: boolean
          badge: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          category: string
          business_types?: string[]
          description?: string | null
          contact_whatsapp?: string | null
          contact_email?: string | null
          website_url?: string | null
          address?: string | null
          is_featured?: boolean
          is_active?: boolean
          badge?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          category?: string
          business_types?: string[]
          description?: string | null
          contact_whatsapp?: string | null
          contact_email?: string | null
          website_url?: string | null
          address?: string | null
          is_featured?: boolean
          is_active?: boolean
          badge?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_recipes: {
        Row: {
          id: string
          product_id: string
          inventory_item_id: string
          quantity_needed: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          inventory_item_id: string
          quantity_needed?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          inventory_item_id?: string
          quantity_needed?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      check_product_availability: {
        Args: {
          p_product_id: string
          p_outlet_id: string
          p_quantity?: number
        }
        Returns: { is_available: boolean; missing_items: string[] }[]
      }
      deduct_inventory_for_sale: {
        Args: {
          p_transaction_id: string
          p_outlet_id: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "staff" | "investor"
      inventory_transaction_type:
      | "purchase"
      | "usage"
      | "waste"
      | "transfer_in"
      | "transfer_out"
      | "adjustment"
      | "sale"
      payment_method: "cash" | "qris" | "transfer" | "card" | "split"
      purchase_order_status: "draft" | "ordered" | "received" | "cancelled"
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
      app_role: ["owner", "manager", "staff", "investor"],
      inventory_transaction_type: [
        "purchase",
        "usage",
        "waste",
        "transfer_in",
        "transfer_out",
        "adjustment",
      ],
      payment_method: ["cash", "qris", "transfer", "card", "split"],
    },
  },
} as const
