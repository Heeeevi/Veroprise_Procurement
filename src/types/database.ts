// Custom type definitions for the ERP system

export type LegacyRole = 'owner' | 'manager' | 'staff' | 'investor' | 'customer';
export type ProcurementRole =
  | 'super_admin'
  | 'pengadaan'
  | 'gudang'
  | 'peracikan_bumbu'
  | 'unit_produksi'
  | 'owner';
export type AppRole = LegacyRole | ProcurementRole;

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'card' | 'split';

export type InventoryTransactionType = 'purchase' | 'usage' | 'waste' | 'transfer_in' | 'transfer_out' | 'adjustment';

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: AppRole | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Outlet {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Shift {
  id: string;
  user_id: string;
  outlet_id: string;
  started_at: string;
  ended_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  notes: string | null;
  created_at: string;
  outlet?: Outlet;
  profile?: Profile;
}

export interface Transaction {
  id: string;
  outlet_id: string;
  shift_id: string | null;
  user_id: string;
  transaction_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  payment_details: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  outlet?: Outlet;
  profile?: Profile;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  subtotal: number;
  notes: string | null;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  outlet_id: string;
  category_id: string | null;
  user_id: string;
  approved_by: string | null;
  description: string;
  amount: number;
  receipt_url: string | null;
  status: ExpenseStatus;
  notes: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
  outlet?: Outlet;
  category?: ExpenseCategory;
  profile?: Profile;
  approver?: Profile;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  cost_per_unit: number;
  created_at: string;
  updated_at: string;
}

export interface OutletInventory {
  id: string;
  outlet_id: string;
  inventory_item_id: string;
  quantity: number;
  updated_at: string;
  outlet?: Outlet;
  inventory_item?: InventoryItem;
}

export interface InventoryTransaction {
  id: string;
  outlet_id: string;
  inventory_item_id: string;
  user_id: string;
  type: InventoryTransactionType;
  quantity: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SessionLog {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Cart types for POS
export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

// Booking types
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'canceled';
export type BookingPaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Booking {
  id: string;
  outlet_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  slot_time: string;
  status: BookingStatus;
  payment_status: BookingPaymentStatus;
  payment_amount: number;
  payment_method: PaymentMethod | null;
  transaction_id: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  outlet?: Outlet;
  confirmer?: Profile;
}

export interface BookingStats {
  outlet_id: string;
  booking_date: string;
  total_bookings: number;
  completed_bookings: number;
  canceled_bookings: number;
  paid_bookings: number;
  total_revenue: number;
}

// Dashboard stats
export interface DashboardStats {
  totalSales: number;
  totalTransactions: number;
  totalExpenses: number;
  netProfit: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  salesByDay: { date: string; total: number }[];
  bookings?: {
    total: number;
    revenue: number;
    pending: number;
    completed: number;
  };
}
