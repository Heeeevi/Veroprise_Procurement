# 🗄️ Database Setup Guide - Veroprise ERP + Booking System

## 📋 Overview
Complete SQL schema untuk sistem ERP barbershop dengan modul booking terintegrasi.

---

## 🚀 Quick Start (Supabase Dashboard)

### Step 1: Login ke Supabase
1. Buka [supabase.com](https://supabase.com)
2. Login dan pilih project atau buat baru
3. Klik "SQL Editor" di sidebar

### Step 2: Run Schema
1. Copy seluruh isi file `COMPLETE_SCHEMA.sql`
2. Paste ke SQL Editor
3. Klik "Run" atau tekan `Ctrl + Enter`
4. Tunggu sampai selesai (± 10-30 detik)

### Step 3: Verify
Cek di **Table Editor** apakah tabel sudah muncul:
- ✅ `profiles`, `outlets`, `products`
- ✅ `transactions`, `bookings`, `expenses`
- ✅ `employees`, `payroll_runs`
- dll.

---

## 📊 Database Structure

### 17 Sections:
1. **User Management** - Roles, profiles, authentication
2. **Outlet Management** - Multi-outlet support
3. **Product & Inventory** - Catalog, stock, BOM
4. **Transactions & Sales** - POS, sales tracking
5. **Expenses & Finance** - Expense tracking, approval
6. **Vendors & Purchase Orders** - Procurement
7. **HR & Payroll** - Employee, attendance, salary
8. **Booking System** - Customer bookings
9. **Audit & Logging** - Activity logs
10. **Indexes** - Performance optimization
11. **Triggers** - Auto-update timestamps
12. **Views** - Reporting & analytics
13. **RLS** - Row Level Security enabled
14. **RLS Policies** - Security rules
15. **Functions** - Stored procedures
16. **Permissions** - Grant access
17. **Seed Data** - Default categories

---

## 🔑 Key Features

### 🔐 Security
- **Row Level Security (RLS)** enabled on all tables
- Users only see data for their outlets
- Role-based access control (owner, manager, staff, investor)

### 📈 Performance
- **20+ indexes** for fast queries
- Optimized for multi-outlet operations
- Views for common reports

### 🔄 Automation
- Auto-update timestamps with triggers
- Auto-deduct inventory on sales
- Booking → transaction integration

### 📊 Reporting
- `booking_stats` - Daily booking metrics
- `daily_sales` - Sales per day
- `low_stock_items` - Inventory alerts

---

## 🎯 Core Tables

### User & Auth
```
user_roles      - User role assignments
profiles        - User profile info
outlets         - Store locations
user_outlets    - User-outlet mapping
```

### Product & Inventory
```
categories          - Product categories
products            - Service/product catalog
inventory_items     - Raw materials/supplies
outlet_inventory    - Stock per outlet
product_recipes     - BOM (Bill of Materials)
```

### Sales & Finance
```
shifts              - Kasir shifts
transactions        - Sales records
transaction_items   - Line items
expenses            - Expense tracking
expense_categories  - Expense types
```

### Booking System
```
bookings    - Customer appointments
            - Links to transactions when confirmed
            - Payment tracking (unpaid/paid/refunded)
```

### HR
```
employees         - Employee master data
attendance_logs   - Clock in/out
payroll_runs      - Salary periods
payroll_items     - Salary details
```

### Procurement
```
partner_vendors       - Supplier list
purchase_orders       - PO header
purchase_order_items  - PO line items
```

---

## 🔧 Functions & Procedures

### 1. `create_public_booking()`
**Purpose**: Allow customers to book without login
```sql
SELECT public.create_public_booking(
    p_outlet_id := 'uuid-here',
    p_customer_name := 'John Doe',
    p_customer_email := 'john@mail.com',
    p_customer_phone := '08123456789',
    p_slot_time := '2026-01-15 10:00:00+07',
    p_payment_amount := 10000
);
```

### 2. `get_user_role()`
Get user's role
```sql
SELECT public.get_user_role(auth.uid());
```

### 3. `check_product_availability()`
Check if product can be sold (inventory check)
```sql
SELECT public.check_product_availability(
    'product-uuid',
    'outlet-uuid',
    2  -- quantity
);
```

### 4. `deduct_inventory_for_sale()`
Auto-triggered when transaction_item inserted

---

## 📱 Usage Examples

### Create Booking (Public)
```sql
-- Via RPC from frontend
const { data } = await supabase.rpc('create_public_booking', {
  p_outlet_id: outletId,
  p_customer_name: 'John Doe',
  p_customer_email: 'john@mail.com',
  p_customer_phone: '08123456789',
  p_slot_time: new Date('2026-01-15T10:00:00').toISOString(),
  p_payment_amount: 10000
});
```

### Query Bookings (Admin)
```sql
SELECT * FROM bookings
WHERE outlet_id = 'your-outlet-id'
  AND status = 'pending'
ORDER BY slot_time ASC;
```

### Confirm Booking & Create Transaction
```sql
-- Step 1: Create transaction
INSERT INTO transactions (outlet_id, user_id, transaction_number, total, payment_method)
VALUES ('outlet-id', auth.uid(), 'BK-123', 10000, 'qris')
RETURNING id;

-- Step 2: Update booking
UPDATE bookings
SET status = 'completed',
    payment_status = 'paid',
    confirmed_by = auth.uid(),
    confirmed_at = NOW(),
    transaction_id = 'transaction-id-from-step-1'
WHERE id = 'booking-id';
```

### Daily Sales Report
```sql
SELECT * FROM daily_sales
WHERE outlet_id = 'your-outlet-id'
  AND sale_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY sale_date DESC;
```

### Booking Statistics
```sql
SELECT * FROM booking_stats
WHERE outlet_id = 'your-outlet-id'
  AND booking_date >= CURRENT_DATE - INTERVAL '30 days';
```

---

## 🔐 Security Configuration

### RLS Policies Summary
- ✅ Users see only their outlet data
- ✅ Public can create bookings (anon role)
- ✅ Only authenticated users can confirm bookings
- ✅ Role-based access for sensitive data (payroll, expenses)

### Grant Permissions
```sql
-- Already included in schema:
GRANT EXECUTE ON FUNCTION create_public_booking TO anon;
GRANT EXECUTE ON FUNCTION create_public_booking TO authenticated;
```

---

## 🧪 Testing Checklist

After running schema, test:

### ✅ Basic Operations
- [ ] Create outlet
- [ ] Create user profile
- [ ] Assign user to outlet
- [ ] Create product & category
- [ ] Create booking (public)
- [ ] View booking in admin

### ✅ Booking Flow
- [ ] Public booking creation works
- [ ] Admin can see pending bookings
- [ ] Confirm booking creates transaction
- [ ] Booking stats view shows correct data

### ✅ Inventory
- [ ] Add inventory item
- [ ] Set outlet stock
- [ ] Create product recipe (BOM)
- [ ] Sell product → inventory deducted

### ✅ Finance
- [ ] Create transaction
- [ ] Add expense
- [ ] Approve expense
- [ ] View daily_sales view

---

## 🔄 Migration from Existing DB

If you have existing data:

### Option 1: Fresh Start
1. Backup existing data
2. Run `COMPLETE_SCHEMA.sql`
3. Import data via CSV or SQL

### Option 2: Incremental
1. Run only new sections (booking, etc.)
2. Keep existing tables
3. Add foreign keys manually

---

## 🐛 Troubleshooting

### Error: "relation already exists"
- **Cause**: Running schema multiple times
- **Fix**: Drop existing tables or use `IF NOT EXISTS` (already included)

### Error: "permission denied"
- **Cause**: RLS blocks access
- **Fix**: Check RLS policies or use service_role key for setup

### Error: "function does not exist"
- **Cause**: Function not created yet
- **Fix**: Run Section 15 (Functions) again

### Slow queries
- **Check**: Indexes created (Section 10)
- **Fix**: Run `ANALYZE` on tables

---

## 📞 Support

### Common Issues
1. **Can't login to ERP**: Check `user_roles` and `user_outlets` tables
2. **Booking not showing**: Verify RLS policies
3. **Inventory not deducting**: Check `product_recipes` mapping

### Resources
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- Project README: `BOOKING_INTEGRATION.md`

---

## 📝 Schema Version

- **Version**: 1.0
- **Date**: 2026-01-12
- **Compatibility**: PostgreSQL 14+, Supabase
- **Tables**: 30+
- **Functions**: 5
- **Views**: 3
- **Indexes**: 20+

---

## 🎉 Next Steps

After schema setup:

1. **Configure Supabase Auth**
   - Enable email/password auth
   - Add social providers (optional)

2. **Update Frontend `.env`**
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Create First User**
   - Sign up via auth
   - Manually set role in `user_roles` table

4. **Create Outlet**
   ```sql
   INSERT INTO outlets (name, address, phone)
   VALUES ('Main Branch', 'Jl. Example 123', '021-12345');
   ```

5. **Map User to Outlet**
   ```sql
   INSERT INTO user_outlets (user_id, outlet_id)
   VALUES ('user-uuid', 'outlet-uuid');
   ```

6. **Test Booking**
   - Visit `/book` page
   - Fill form & submit
   - Check in `/bookings` admin panel

---

**🎊 Database setup complete! Happy coding!**
