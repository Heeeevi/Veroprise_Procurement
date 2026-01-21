# 🚀 Setup Guide - Veroprise ERP

## ✅ Langkah-langkah Setup Lengkap

### 1️⃣ **Setup Database Supabase**

#### A. Run Migration
Buka Supabase SQL Editor dan jalankan SQL berikut:

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
```

#### B. (Opsional) Load Seed Data
Jika ingin sample data untuk testing, run file: `supabase/SEED_DATA.sql`

---

### 2️⃣ **Setup Frontend (React App)**

#### A. Environment Variables
Buat file `.env` dari `.env.example`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### B. Install Dependencies
```powershell
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

#### B. Setup User Role & Profile di Supabase

**PENTING:** Setelah signup, user belum punya role/outlet access. Harus setup manual:

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

-- 4. Map user ke semua outlets
INSERT INTO public.user_outlets (user_id, outlet_id) 
SELECT 'YOUR-USER-UUID-HERE', id FROM public.outlets;
```

---

### 4️⃣ **Test Fitur Inventory**

1. Login ke Dashboard
2. Buka menu **Inventory**
3. Test Delete Item:
   - Klik tombol Hapus (icon trash merah)
   - Dialog konfirmasi muncul
   - Klik "Nonaktifkan Item" atau "Hapus Permanen"

---

### 5️⃣ **Test Booking Flow**

#### A. Customer Booking (Public Page)
1. Buka: http://localhost:8080/book
2. Pilih outlet, tanggal, jam
3. Isi nama, email, phone
4. Deposit Rp10.000 via QRIS
5. Submit booking

#### B. Admin Konfirmasi (Dashboard)
1. Login sebagai Owner/Manager
2. Buka menu **Bookings**
3. Lihat booking pending
4. Klik **Confirm** → otomatis buat transaksi

---

## 📊 Struktur Database

### Tables (30+)
- ✅ user_roles, profiles, outlets
- ✅ categories, products, inventory_items
- ✅ outlet_inventory, inventory_transactions
- ✅ shifts, transactions, transaction_items
- ✅ expenses, expense_categories
- ✅ partner_vendors, purchase_orders
- ✅ employees, attendance_logs, payroll_runs
- ✅ bookings
- ✅ audit_logs

---

## 🐛 Troubleshooting

| Error | Solusi |
|-------|--------|
| "relation does not exist" | Run COMPLETE_SCHEMA.sql di Supabase |
| "permission denied" | Setup user_roles dan user_outlets |
| "Invalid API key" | Check .env file |
| Frontend tidak bisa login | Check RLS policies |

---

## 📚 Documentation Files

- `COMPLETE_SCHEMA.sql` - Full database schema
- `SEED_DATA.sql` - Sample data
- `DATABASE_SETUP_GUIDE.md` - Database setup details
- `BOOKING_INTEGRATION.md` - Booking system guide

---

## ✅ Setup Checklist

- [ ] Run migration scripts
- [ ] Update `.env` dengan Supabase credentials
- [ ] `npm install` dependencies
- [ ] `npm run dev` - start server
- [ ] Signup user pertama
- [ ] Setup user_roles, profiles, user_outlets di SQL
- [ ] Login ke dashboard
- [ ] Test booking flow

---

**🎉 Done! Setelah checklist selesai, sistem siap digunakan! 🚀**
