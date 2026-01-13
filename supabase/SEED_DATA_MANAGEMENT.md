# 🌱 Seed Data Management Guide

## 📋 Overview

Seed data adalah data sample untuk **testing dan development**. Data ini **HARUS dihapus** sebelum memasukkan data production asli.

---

## 🎯 Workflow: Development → Production

### Phase 1: Development & Testing (Pakai Seed Data)

```bash
# 1. Setup database
Run: COMPLETE_SCHEMA.sql

# 2. Load seed data untuk testing
Run: SEED_DATA.sql

# 3. Test semua fitur dengan sample data
✅ Test POS dengan berbagai layanan
✅ Test Booking flow
✅ Test Inventory management
✅ Test Reports & Dashboard
```

### Phase 2: Cleanup (Hapus Seed Data)

```bash
# Sebelum production, hapus semua seed data
Run: CLEANUP_SEED_DATA.sql
```

### Phase 3: Production (Input Data Asli)

```bash
# Input data asli kamu
✅ Outlet/cabang asli
✅ Layanan barbershop asli
✅ Harga real
✅ Staff/karyawan real
```

---

## 📦 Isi Seed Data

### 1. **Outlets (3 cabang)**
```
- Barber Main Branch (Jl. Sudirman)
- Barber Mall Branch (Grand Indonesia)
- Barber South Branch (TB Simatupang)
```
**UUID:** `11111111-...`, `22222222-...`, `33333333-...`

### 2. **Categories (5 kategori)**
```
- Haircut
- Styling
- Grooming
- Hair Color
- Products
```
**UUID:** `aaaa1111-...`, `aaaa2222-...`, dst

### 3. **Products/Services (33 layanan)**
```
- 5 Haircut services (Rp30k - Rp100k)
- 5 Styling services (Rp40k - Rp120k)
- 7 Grooming services (Rp25k - Rp200k)
- 5 Hair Coloring (Rp150k - Rp350k)
- 10 Retail products (Rp45k - Rp120k)
```
**UUID:** `bbbb1101-...`, `bbbb1102-...`, dst

### 4. **Inventory Items (9 supplies)**
```
- Shampoo, Conditioner, Hair Gel
- Pomade, Razor Blade, Towel
- Hair Dye (Black & Brown)
- Face Mask
```
**UUID:** `cccc1111-...`, `cccc2222-...`, dst

### 5. **Expense Categories (7 kategori)**
```
- Operasional, Utilities, Supplies
- Marketing, Maintenance
- Transportation, Other
```
**UUID:** `dddd1111-...`, `dddd2222-...`, dst

### 6. **Partner Vendors (3 suppliers)**
```
- PT Supplies Indonesia
- CV Hair Products
- Toko Kimia Jaya
```
**UUID:** `eeee1111-...`, `eeee2222-...`, `eeee3333-...`

### 7. **Sample Bookings (5 bookings)**
```
- 3 bookings hari ini (2 pending, 1 confirmed)
- 2 bookings besok (pending)
```
**UUID:** `ffff1111-...`, `ffff1112-...`, dst

---

## 🗑️ Cara Hapus Seed Data

### Option 1: Hapus Seed Data Saja (Recommended)

**File:** `CLEANUP_SEED_DATA.sql`

```sql
-- Hapus hanya seed data, keep structure & users
-- Run di Supabase SQL Editor
```

**Yang Dihapus:**
- ✅ 3 sample outlets
- ✅ 5 categories
- ✅ 33 products/services
- ✅ 9 inventory items
- ✅ 7 expense categories
- ✅ 3 vendors
- ✅ 5 bookings

**Yang TIDAK Dihapus:**
- ✅ Database structure (tables, indexes, views)
- ✅ User accounts (auth.users)
- ✅ User roles & profiles
- ✅ Functions & triggers

### Option 2: Reset Total (Nuclear Option)

**WARNING:** Ini hapus SEMUA data termasuk transactions real!

```sql
-- Uncomment bagian NUCLEAR OPTION di CLEANUP_SEED_DATA.sql
-- Ini akan TRUNCATE semua table
-- Hanya gunakan jika mau start from scratch
```

---

## ✅ Step-by-Step Cleanup

### 1. **Backup First (PENTING!)**

```sql
-- Di Supabase Dashboard > Database > Backups
-- Atau export via pg_dump
```

### 2. **Run Cleanup Script**

Buka Supabase SQL Editor:
```
https://gnqunygpkdelaadvuifn.supabase.co/project/gnqunygpkdelaadvuifn/sql
```

Copy-paste isi `CLEANUP_SEED_DATA.sql`, klik **Run**

### 3. **Verify Clean**

```sql
-- Check semua table sudah bersih dari seed data
SELECT 'Outlets' as table_name, COUNT(*) FROM outlets
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Categories', COUNT(*) FROM categories
UNION ALL
SELECT 'Inventory Items', COUNT(*) FROM inventory_items;

-- Result should be 0 for all
```

### 4. **Insert Production Data**

Sekarang input data asli kamu:

#### A. Outlets Real
```sql
INSERT INTO public.outlets (name, address, phone, is_active) VALUES
    ('BarberDoc Kelapa Gading', 'Jl. Boulevard Raya No. 15', '021-xxx', true),
    ('BarberDoc Serpong', 'Jl. BSD Raya No. 88', '021-yyy', true);
```

#### B. Categories Real
```sql
INSERT INTO public.categories (name, description, sort_order) VALUES
    ('Haircut Pria', 'Layanan potong rambut pria', 1),
    ('Haircut Wanita', 'Layanan potong rambut wanita', 2),
    -- dst
```

#### C. Products/Services Real
```sql
INSERT INTO public.products (category_id, name, description, price, cost_price, is_active) VALUES
    ((SELECT id FROM categories WHERE name = 'Haircut Pria'), 
     'Classic Cut', 
     'Potong rambut klasik', 
     45000, 
     8000, 
     true);
```

---

## 🔍 Identifikasi Seed Data

Semua seed data menggunakan UUID pattern yang recognizable:

```
Outlets:     11111111-1111-1111-1111-111111111111
             22222222-2222-2222-2222-222222222222
             33333333-3333-3333-3333-333333333333

Categories:  aaaa1111-1111-1111-1111-111111111111
             aaaa2222-2222-2222-2222-222222222222
             dst...

Products:    bbbb1101-1111-1111-1111-111111111111
             bbbb1102-1111-1111-1111-111111111111
             dst...

Inventory:   cccc1111-1111-1111-1111-111111111111
             dst...

Expenses:    dddd1111-1111-1111-1111-111111111111
             dst...

Vendors:     eeee1111-1111-1111-1111-111111111111
             dst...

Bookings:    ffff1111-1111-1111-1111-111111111111
             dst...
```

Pattern ini memudahkan untuk delete:
```sql
DELETE FROM products WHERE id LIKE 'bbbb%';
DELETE FROM categories WHERE id LIKE 'aaaa%';
-- dst
```

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Lupa Hapus Seed Data
**Problem:** Production mixed dengan sample data
**Solution:** Run CLEANUP_SEED_DATA.sql

### ❌ Mistake 2: Hapus Seed Data Terlalu Awal
**Problem:** Belum test fitur dengan baik
**Solution:** Test dulu sampai yakin, baru cleanup

### ❌ Mistake 3: Lupa Backup
**Problem:** Data production kehapus
**Solution:** ALWAYS backup before cleanup!

### ❌ Mistake 4: Foreign Key Error saat Delete
**Problem:** Delete order salah
**Solution:** Pakai CLEANUP_SEED_DATA.sql yang sudah urut benar

---

## 📊 Verification Checklist

Setelah cleanup, verify dengan queries ini:

```sql
-- ✅ Check: Outlets harus kosong
SELECT COUNT(*) FROM outlets; -- Should be 0

-- ✅ Check: Categories harus kosong
SELECT COUNT(*) FROM categories; -- Should be 0

-- ✅ Check: Products harus kosong
SELECT COUNT(*) FROM products; -- Should be 0

-- ✅ Check: Inventory harus kosong
SELECT COUNT(*) FROM inventory_items; -- Should be 0

-- ✅ Check: Bookings harus kosong
SELECT COUNT(*) FROM bookings; -- Should be 0

-- ✅ Check: Users tetap ada (TIDAK dihapus)
SELECT COUNT(*) FROM auth.users; -- Should > 0
SELECT COUNT(*) FROM user_roles; -- Should > 0
SELECT COUNT(*) FROM profiles; -- Should > 0
```

---

## 🎯 Best Practices

### Development Phase
1. ✅ Load SEED_DATA.sql
2. ✅ Test semua fitur
3. ✅ Explore dashboard & reports
4. ✅ Train staff dengan sample data

### Pre-Production Phase
1. ✅ Backup database
2. ✅ Run CLEANUP_SEED_DATA.sql
3. ✅ Verify semua seed data terhapus
4. ✅ Verify users tetap ada

### Production Phase
1. ✅ Input outlets asli
2. ✅ Input categories asli
3. ✅ Input products/services asli
4. ✅ Input staff/employees
5. ✅ Mulai transaksi real!

---

## 📝 Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `SEED_DATA.sql` | Load sample data | Development/Testing |
| `CLEANUP_SEED_DATA.sql` | Delete sample data | Before Production |
| `COMPLETE_SCHEMA.sql` | Create database structure | Initial setup |

---

## 🔗 Related Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup instructions
- [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md) - Database details
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Query examples

---

**Remember:** Seed data adalah TEMAN saat development, tapi MUSUH saat production! Jangan lupa cleanup sebelum go-live! 🚀
