# 🔥 Quick Reference - Database Schema

## 📊 Table Relationships

```
auth.users
  ↓
user_roles (role: owner/manager/staff/investor)
profiles (full_name, avatar, phone)
  ↓
user_outlets ← outlets (multi-outlet)
  ↓
├─ transactions (sales)
│   └─ transaction_items
├─ expenses
├─ bookings ← ⭐ BOOKING SYSTEM
├─ shifts (kasir shift)
├─ inventory_transactions
└─ purchase_orders

outlets
  ├─ outlet_inventory (stock per outlet)
  └─ employees
      ├─ attendance_logs
      └─ payroll_items

products
  ├─ categories
  └─ product_recipes → inventory_items
```

---

## 🎯 Key Tables Quick Ref

### 👤 Users & Auth
| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `user_roles` | user_id, role | Role assignment |
| `profiles` | user_id, full_name | User info |
| `user_outlets` | user_id, outlet_id | Access control |

### 🏪 Outlets & Inventory
| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `outlets` | name, is_active | Store locations |
| `inventory_items` | name, unit, cost_per_unit | Master items |
| `outlet_inventory` | outlet_id, quantity | Stock tracking |
| `product_recipes` | product_id, inventory_item_id | BOM |

### 💰 Sales & Finance
| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `transactions` | outlet_id, total, payment_method | Sales |
| `transaction_items` | transaction_id, product_id, qty | Line items |
| `expenses` | outlet_id, amount, status | Expense tracking |
| `shifts` | user_id, opening_cash, closing_cash | Kasir shift |

### 📅 Booking System ⭐
| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `bookings` | customer_email, slot_time, status | Appointments |
|  | payment_status, transaction_id | Payment tracking |
|  | confirmed_by, confirmed_at | Admin approval |

### 👥 HR & Payroll
| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `employees` | full_name, salary, position | Employee master |
| `attendance_logs` | employee_id, check_in, check_out | Attendance |
| `payroll_runs` | period_start, period_end, status | Payroll period |
| `payroll_items` | employee_id, total, days_worked | Salary details |

---

## 🔑 Enums & Types

```sql
-- User Roles
app_role: 'owner' | 'manager' | 'staff' | 'investor'

-- Payment Methods
payment_method: 'cash' | 'qris' | 'transfer' | 'card' | 'split'

-- Booking Status
booking_status: 'pending' | 'confirmed' | 'completed' | 'canceled'
booking_payment_status: 'unpaid' | 'paid' | 'refunded'

-- Expense Status
expense_status: 'pending' | 'approved' | 'rejected'

-- Inventory Transaction Types
inventory_transaction_type: 
  'purchase' | 'usage' | 'waste' | 
  'transfer_in' | 'transfer_out' | 'adjustment'
```

---

## 🚀 Common Queries

### 📅 Booking Queries

```sql
-- Get pending bookings for outlet
SELECT * FROM bookings
WHERE outlet_id = 'outlet-uuid'
  AND status = 'pending'
ORDER BY slot_time ASC;

-- Get today's bookings
SELECT * FROM bookings
WHERE outlet_id = 'outlet-uuid'
  AND DATE(slot_time) = CURRENT_DATE;

-- Booking stats (use view)
SELECT * FROM booking_stats
WHERE outlet_id = 'outlet-uuid'
  AND booking_date >= CURRENT_DATE - INTERVAL '7 days';
```

### 💰 Transaction Queries

```sql
-- Today's sales
SELECT SUM(total) as today_sales
FROM transactions
WHERE outlet_id = 'outlet-uuid'
  AND DATE(created_at) = CURRENT_DATE;

-- Top selling products
SELECT 
  product_name,
  SUM(quantity) as total_qty,
  SUM(subtotal) as revenue
FROM transaction_items ti
JOIN transactions t ON t.id = ti.transaction_id
WHERE t.outlet_id = 'outlet-uuid'
  AND DATE(t.created_at) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY product_name
ORDER BY revenue DESC
LIMIT 10;

-- Sales by payment method
SELECT 
  payment_method,
  COUNT(*) as tx_count,
  SUM(total) as total_amount
FROM transactions
WHERE outlet_id = 'outlet-uuid'
  AND DATE(created_at) = CURRENT_DATE
GROUP BY payment_method;
```

### 📦 Inventory Queries

```sql
-- Low stock items (use view)
SELECT * FROM low_stock_items;

-- Stock movement history
SELECT 
  ii.name,
  it.type,
  it.quantity,
  it.created_at
FROM inventory_transactions it
JOIN inventory_items ii ON ii.id = it.inventory_item_id
WHERE it.outlet_id = 'outlet-uuid'
ORDER BY it.created_at DESC
LIMIT 50;

-- Current stock per outlet
SELECT 
  ii.name,
  ii.unit,
  oi.quantity,
  ii.cost_per_unit
FROM outlet_inventory oi
JOIN inventory_items ii ON ii.id = oi.inventory_item_id
WHERE oi.outlet_id = 'outlet-uuid'
ORDER BY ii.name;
```

### 💸 Finance Queries

```sql
-- Monthly profit/loss
SELECT 
  DATE_TRUNC('month', created_at) as month,
  SUM(total) as revenue
FROM transactions
WHERE outlet_id = 'outlet-uuid'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Pending expenses
SELECT 
  e.*,
  ec.name as category_name,
  p.full_name as requester_name
FROM expenses e
JOIN expense_categories ec ON ec.id = e.category_id
JOIN profiles p ON p.user_id = e.user_id
WHERE e.outlet_id = 'outlet-uuid'
  AND e.status = 'pending'
ORDER BY e.created_at DESC;

-- Expense by category (this month)
SELECT 
  ec.name as category,
  SUM(e.amount) as total
FROM expenses e
JOIN expense_categories ec ON ec.id = e.category_id
WHERE e.outlet_id = 'outlet-uuid'
  AND DATE_TRUNC('month', e.expense_date) = DATE_TRUNC('month', CURRENT_DATE)
  AND e.status = 'approved'
GROUP BY ec.name
ORDER BY total DESC;
```

### 👥 HR Queries

```sql
-- Today's attendance
SELECT 
  e.full_name,
  al.check_in,
  al.check_out,
  CASE 
    WHEN al.check_out IS NULL THEN 'Aktif'
    ELSE 'Selesai'
  END as status
FROM attendance_logs al
JOIN employees e ON e.id = al.employee_id
WHERE al.outlet_id = 'outlet-uuid'
  AND DATE(al.check_in) = CURRENT_DATE;

-- Payroll summary
SELECT 
  pr.*,
  COUNT(pi.id) as employee_count,
  SUM(pi.total) as calculated_total
FROM payroll_runs pr
LEFT JOIN payroll_items pi ON pi.payroll_run_id = pr.id
WHERE pr.outlet_id = 'outlet-uuid'
GROUP BY pr.id
ORDER BY pr.period_end DESC;
```

---

## 🔐 RLS Helper Queries

```sql
-- Check user's outlets
SELECT o.* 
FROM outlets o
JOIN user_outlets uo ON uo.outlet_id = o.id
WHERE uo.user_id = auth.uid();

-- Check user role
SELECT role FROM user_roles WHERE user_id = auth.uid();

-- Check access to specific outlet
SELECT EXISTS (
  SELECT 1 FROM user_outlets
  WHERE user_id = auth.uid()
    AND outlet_id = 'outlet-uuid'
);
```

---

## 🎯 Function Usage

### create_public_booking()
```javascript
const { data, error } = await supabase.rpc('create_public_booking', {
  p_outlet_id: outletId,
  p_customer_name: 'John Doe',
  p_customer_email: 'john@example.com',
  p_customer_phone: '08123456789',
  p_slot_time: '2026-01-15T10:00:00Z',
  p_payment_amount: 10000
});

// Returns: { success: true, booking_id: 'uuid', message: '...' }
```

### check_product_availability()
```javascript
const { data } = await supabase.rpc('check_product_availability', {
  p_product_id: productId,
  p_outlet_id: outletId,
  p_quantity: 2
});

// Returns: true/false
```

### get_user_role()
```javascript
const { data } = await supabase.rpc('get_user_role', {
  user_uuid: userId
});

// Returns: 'owner' | 'manager' | 'staff' | 'investor'
```

---

## 📈 Reporting Views

### booking_stats
```sql
SELECT 
  booking_date,
  total_bookings,
  completed_bookings,
  total_revenue
FROM booking_stats
WHERE outlet_id = 'outlet-uuid'
  AND booking_date >= CURRENT_DATE - INTERVAL '30 days';
```

### daily_sales
```sql
SELECT 
  sale_date,
  transaction_count,
  total_sales,
  average_transaction
FROM daily_sales
WHERE outlet_id = 'outlet-uuid'
ORDER BY sale_date DESC
LIMIT 30;
```

### low_stock_items
```sql
SELECT 
  name,
  unit,
  min_stock,
  current_stock,
  shortage
FROM low_stock_items
ORDER BY shortage DESC;
```

---

## ⚡ Performance Tips

### Indexes
All key lookups are indexed:
- `outlet_id` on all outlet-related tables
- `created_at DESC` on transaction tables
- `user_id` on user-related tables
- Composite indexes for common filters

### Query Optimization
```sql
-- ✅ Good: Use specific columns
SELECT id, name, price FROM products WHERE is_active = true;

-- ❌ Bad: SELECT *
SELECT * FROM products;

-- ✅ Good: Use indexes
WHERE outlet_id = 'uuid' AND DATE(created_at) = CURRENT_DATE

-- ❌ Bad: Function on indexed column
WHERE LOWER(name) = 'john'
```

---

## 🔄 Common Workflows

### 1. Customer Books Appointment
```sql
-- Via RPC function
SELECT create_public_booking(...);
-- Status: pending, payment_status: unpaid
```

### 2. Admin Confirms Booking
```sql
-- Create transaction
INSERT INTO transactions (...) RETURNING id;

-- Update booking
UPDATE bookings 
SET status = 'completed',
    payment_status = 'paid',
    transaction_id = :tx_id,
    confirmed_by = auth.uid(),
    confirmed_at = NOW()
WHERE id = :booking_id;
```

### 3. POS Sale
```sql
-- Insert transaction
INSERT INTO transactions (...) RETURNING id;

-- Insert items
INSERT INTO transaction_items (...);
-- Trigger auto-deducts inventory via product_recipes

-- (Optional) Record in shift
UPDATE shifts SET ... WHERE id = :shift_id;
```

### 4. Inventory Restock
```sql
-- Create PO
INSERT INTO purchase_orders (...) RETURNING id;

-- Add items
INSERT INTO purchase_order_items (...);

-- When received: Update outlet_inventory
UPDATE outlet_inventory SET quantity = quantity + :received_qty;

-- Log transaction
INSERT INTO inventory_transactions (type = 'purchase', ...);
```

---

## 🐛 Debug Queries

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'bookings';

-- Check triggers
SELECT * FROM pg_trigger WHERE tgrelid = 'bookings'::regclass;

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'transactions';

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📝 Data Types Reference

```sql
UUID          - Primary keys, foreign keys
TEXT          - String (unlimited length)
NUMERIC(12,2) - Money, quantities (12 digits, 2 decimal)
NUMERIC(12,4) - Precise measurements (recipes)
TIMESTAMPTZ   - Timestamp with timezone
DATE          - Date only
BOOLEAN       - true/false
JSONB         - Flexible data (payment_details, etc.)
```

---

**💡 Tip**: Bookmark this page for quick reference during development!
