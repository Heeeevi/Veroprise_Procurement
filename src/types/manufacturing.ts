import { Product, Profile } from './database';
import { Warehouse } from './warehouse';

export type DisassemblyStatus = 'draft' | 'completed' | 'cancelled';

export interface DisassemblyItem {
  id: string;
  disassembly_id: string;
  result_product_id: string;
  quantity_produced: number;
  cost_allocation_percentage: number;
  created_at: string;
  
  result_product?: Product;
}

export interface Disassembly {
  id: string;
  disassembly_number: string;
  source_product_id: string;
  source_warehouse_id: string;
  target_warehouse_id: string;
  quantity_used: number;
  status: DisassemblyStatus;
  performed_by: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  source_product?: Product;
  source_warehouse?: Warehouse;
  target_warehouse?: Warehouse;
  performed_by_profile?: Profile;
  items?: DisassemblyItem[];
}

export type WorkOrderStatus = 'planned' | 'kitting' | 'in_progress' | 'completed' | 'cancelled';
export type WorkOrderItemStatus = 'pending' | 'picked';

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  product_id: string;
  planned_quantity: number;
  actual_quantity?: number;
  status: WorkOrderItemStatus;
  created_at: string;
  
  product?: Product;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  product_id: string;
  target_quantity: number;
  warehouse_id: string;
  status: WorkOrderStatus;
  planned_date?: string;
  start_time?: string;
  end_time?: string;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  product?: Product;
  warehouse?: Warehouse;
  assigned_to_profile?: Profile;
  items?: WorkOrderItem[];
}
