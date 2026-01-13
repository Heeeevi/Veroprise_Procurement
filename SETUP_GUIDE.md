# 🚀 Setup Guide - BarberDoc ERP

## ✅ Langkah-langkah Setup Lengkap

### 1️⃣ **Setup Database Supabase**

#### A. Run Migration untuk Soft Delete
Buka Supabase SQL Editor: https://gnqunygpkdelaadvuifn.supabase.co/project/gnqunygpkdelaadvuifn/sql

Copy-paste SQL berikut:

```sql
-- Add is_active column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE public.inventory_items 
SET is_active = true 
WHERE is_active IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_active 
ON public.inventory_items(is_active);

-- Add comment
COMMENT ON COLUMN public.inventory_items.is_active IS 
'Soft delete flag. FALSE = item discontinued but kept for historical data integrity';
```

Klik **Run** ✅

#### B. (Opsional) Load Seed Data
Jika ingin sample data untuk testing, run:

```sql
-- Copy paste dari file: supabase/SEED_DATA.sql
```

---

### 2️⃣ **Setup Frontend (React App)**

#### A. Environment Variables
File `.env` sudah di-setup dengan credentials kamu:

```env
VITE_SUPABASE_URL=https://gnqunygpkdelaadvuifn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ Sudah siap!

#### B. Install Dependencies
```powershell
cd barberdoc_erp
npm install
```

#### C. Run Development Server
```powershell
npm run dev
```

Server akan jalan di: http://localhost:8080

---

### 3️⃣ **Buat User Pertama**

#### A. Signup via Frontend
1. Buka http://localhost:8080
2. Klik "Sign Up" / "Daftar"
3. Isi email & password
4. Cek email untuk konfirmasi (jika enabled)

#### B. Setup User Role & Profile di Supabase

**PENTING:** Setelah signup, user belum punya role/outlet access. Harus setup manual dulu.

Buka Supabase SQL Editor dan ganti `'YOUR-USER-UUID-HERE'` dengan UUID user kamu dari `auth.users`:

```sql
-- 1. Cari UUID user kamu
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Copy UUID, lalu ganti di bawah:

-- 2. Set user role sebagai OWNER
INSERT INTO public.user_roles (user_id, role) VALUES
    ('YOUR-USER-UUID-HERE', 'owner');

-- 3. Create profile
INSERT INTO public.profiles (user_id, full_name, phone) VALUES
    ('YOUR-USER-UUID-HERE', 'Admin Utama', '08123456789');

-- 4. Map user ke semua outlets (kasih akses ke semua cabang)
INSERT INTO public.user_outlets (user_id, outlet_id) 
SELECT 'YOUR-USER-UUID-HERE', id FROM public.outlets;
```

#### Contoh Real:
```sql
-- Misal UUID user = '123e4567-e89b-12d3-a456-426614174000'

INSERT INTO public.user_roles (user_id, role) VALUES
    ('123e4567-e89b-12d3-a456-426614174000', 'owner');

INSERT INTO public.profiles (user_id, full_name, phone) VALUES
    ('123e4567-e89b-12d3-a456-426614174000', 'Admin Utama', '08123456789');

INSERT INTO public.user_outlets (user_id, outlet_id) 
SELECT '123e4567-e89b-12d3-a456-426614174000', id FROM public.outlets;
```

---

### 4️⃣ **Test Fitur Inventory Soft Delete**

#### A. Login ke Dashboard
1. Login dengan user yang sudah dibuat
2. Buka menu **Inventory**

#### B. Test Delete Item
1. Klik tombol **Hapus** (icon trash merah) pada item
2. Dialog konfirmasi muncul dengan info dependencies
3. Klik **Nonaktifkan Item** atau **Hapus Permanen**
4. Verifikasi item hilang dari dropdown (tapi data historis tetap ada)

#### C. Verifikasi Database
```sql
-- Check item yang di-soft delete
SELECT id, name, is_active, current_stock 
FROM public.inventory_items 
WHERE is_active = false;

-- Check historical transaction tetap valid
SELECT t.id, t.created_at, ii.name, t.quantity
FROM public.inventory_transactions t
JOIN public.inventory_items ii ON t.inventory_item_id = ii.id
WHERE ii.is_active = false
ORDER BY t.created_at DESC;
```

---

### 5️⃣ **Test Booking Flow**

#### A. Customer Booking (Public Page)
1. Buka: http://localhost:8080/book
2. Pilih outlet, tanggal, jam
3. Isi nama, email, phone
4. **Deposit Rp10.000** (amankan seat)
5. Submit booking

#### B. Admin Konfirmasi (Dashboard)
1. Login sebagai Owner/Manager
2. Buka menu **Bookings**
3. Lihat booking pending
4. Klik **Confirm** → otomatis buat transaksi Rp10.000
5. Status berubah jadi **Confirmed** ✅

#### C. Customer Datang ke Outlet
1. Buka **POS** di dashboard
2. Pilih layanan (misal: Premium Haircut Rp65.000)
3. Input transaksi dengan note: "Booking ID: xxx"
4. Customer bayar **sisa**: Rp65.000 - Rp10.000 = **Rp55.000**
5. Total revenue: Rp10k (booking) + Rp55k (POS) = **Rp65k** ✅

#### D. Verifikasi Dashboard
1. Buka **Dashboard**
2. Lihat stats:
   - Today Bookings: +1
   - Today Revenue: +Rp10.000 (dari booking)
   - Today Sales: +Rp55.000 (dari POS)
   - **Total: Rp65.000** ✅

---

## 📊 Struktur Database

### Tables Created (30+)
- ✅ user_roles, profiles, outlets
- ✅ categories, products, inventory_items
- ✅ outlet_inventory, inventory_transactions
- ✅ product_recipes (BOM)
- ✅ shifts, transactions, transaction_items
- ✅ expenses, expense_categories
- ✅ partner_vendors, purchase_orders
- ✅ employees, attendance_logs, payroll_runs
- ✅ **bookings** (sistem booking)
- ✅ audit_logs

### New Features
- ✅ **Soft Delete Inventory** dengan dependency check
- ✅ **Booking System** dengan deposit Rp10k
- ✅ **Smart Delete** (hard vs soft)
- ✅ **Permission-based** (Owner/Manager only)

---

## 🔑 Credentials

### Supabase
- **URL:** https://gnqunygpkdelaadvuifn.supabase.co
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- **Dashboard:** https://gnqunygpkdelaadvuifn.supabase.co/project/gnqunygpkdelaadvuifn

### Admin Default (Setelah Setup)
- **Email:** (yang kamu buat saat signup)
- **Password:** (yang kamu buat saat signup)
- **Role:** owner
- **Access:** All outlets

---

## 🐛 Troubleshooting

### Error: "relation does not exist"
❌ Table belum dibuat
✅ Run COMPLETE_SCHEMA.sql di Supabase SQL Editor

### Error: "column is_active does not exist"
❌ Migration belum dijalankan
✅ Run migration 20260112_inventory_soft_delete.sql

### Error: "permission denied"
❌ User belum di-setup role/outlet access
✅ Run SQL setup user di Step 3B

### Error: "Invalid API key"
❌ .env file salah
✅ Check VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY

### Frontend tidak bisa login
❌ RLS policies mungkin terlalu strict
✅ Check user_roles dan user_outlets sudah di-insert

---

## 📚 Documentation

- **COMPLETE_SCHEMA.sql** - Full database schema
- **SEED_DATA.sql** - Sample data (33 produk/layanan)
- **DATABASE_SETUP_GUIDE.md** - Database setup details
- **INVENTORY_SOFT_DELETE.md** - Soft delete documentation
- **BOOKING_INTEGRATION.md** - Booking system guide
- **QUICK_REFERENCE.md** - Query examples

---

## ✅ Checklist Setup

- [ ] Run migration `is_active` column
- [ ] Update `.env` dengan Supabase credentials
- [ ] `npm install` dependencies
- [ ] `npm run dev` - start server
- [ ] Signup user pertama
- [ ] Setup user_roles, profiles, user_outlets di SQL
- [ ] Login ke dashboard
- [ ] Test inventory soft delete
- [ ] Test booking flow (customer → admin confirm → POS)
- [ ] Check dashboard stats

---

## 🎉 Done!

Setelah semua checklist selesai, sistem sudah siap digunakan! 🚀

**Next Steps:**
1. Tambah outlet/cabang baru (jika perlu)
2. Tambah produk/layanan lainnya
3. Invite user lain (staff/manager)
4. Setup expense categories sesuai kebutuhan
5. Mulai transaksi real!

**Support:**
- Dokumentasi lengkap di folder `supabase/`
- Check TROUBLESHOOTING.md jika ada masalah
