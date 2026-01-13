# 🚀 QUICK FIX GUIDE - Error ON CONFLICT

## ❌ ERROR YANG MUNCUL
```
Error: Failed to run sql query: 
ERROR: 42P10: there is no unique or exclusion constraint 
matching the ON CONFLICT specification
```

## ✅ SUDAH DIPERBAIKI!

File `FIX_OUTLET_AND_PRODUCTS.sql` sudah diupdate untuk menghindari error `ON CONFLICT`.

## 📋 LANGKAH CEPAT

### 1️⃣ Copy Script yang Sudah Diperbaiki
**Location:** 
```
D:\Buildkathon\barberbook\barbershop-booking\barberdoc_erp\supabase\FIX_OUTLET_AND_PRODUCTS.sql
```

**Select All (Ctrl+A)** → **Copy (Ctrl+C)**

---

### 2️⃣ Run di Supabase
1. Buka: https://supabase.com/dashboard/project/gnqunygpkdelaadvuifn
2. Sidebar kiri → **SQL Editor**
3. **New Query**
4. **Paste** script (Ctrl+V)
5. Klik **RUN** (atau F5)

---

### 3️⃣ Expected Output (Success!)
```
✅ NOTICE: Default outlet created successfully
   (atau "Outlets already exist, skipping")

✅ NOTICE: Categories check completed

✅ NOTICE: Service products created successfully
   (atau "Products already exist, skipping")

✅ NOTICE: User mapped to outlets successfully
   (atau "No users found, please signup first")

📊 Query result (4 rows):
┌─────────────────────────────┬──────────────┐
│ table_name                  │ record_count │
├─────────────────────────────┼──────────────┤
│ Outlets                     │ 1            │
│ Products (Services)         │ 10           │
│ Inventory Items (Supplies)  │ 0 atau >0    │
│ User-Outlet Mappings        │ 1 atau >0    │
└─────────────────────────────┴──────────────┘
```

---

## ✅ VERIFICATION

### Check Outlets
```sql
SELECT * FROM outlets WHERE is_active = true;
```
**Expected:** Minimal 1 outlet (BarberDoc Pusat)

### Check Products (Services)
```sql
SELECT name, price FROM products WHERE is_active = true;
```
**Expected:** 10 services (Potong Rambut, Styling, dll)

### Check User Mapping
```sql
SELECT 
  u.email,
  o.name as outlet_name
FROM user_outlets uo
JOIN auth.users u ON u.id = uo.user_id
JOIN outlets o ON o.id = uo.outlet_id;
```
**Expected:** Email kamu + outlet name

---

## 🔧 APA YANG DIPERBAIKI?

### BEFORE (Error) ❌
```sql
INSERT INTO categories (name, description) VALUES
('Haircut', 'Haircut services'),
('Styling', 'Styling services')
ON CONFLICT (name) DO NOTHING;
-- ❌ ERROR: categories table tidak punya UNIQUE constraint pada 'name'
```

### AFTER (Fixed) ✅
```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Haircut') THEN
    INSERT INTO categories (name, description) VALUES ('Haircut', 'Haircut services');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Styling') THEN
    INSERT INTO categories (name, description) VALUES ('Styling', 'Styling services');
  END IF;
END $$;
-- ✅ NO ERROR: Manual check sebelum insert
```

---

## 🎯 NEXT STEPS AFTER SQL SUCCESS

### 1. Restart Dev Server (jika belum)
```powershell
cd D:\Buildkathon\barberbook\barbershop-booking\barberdoc_erp
npm run dev
```

### 2. Test Login
- URL: http://localhost:8082/auth
- Login dengan akun master
- Check logo "BarberDoc ERP" muncul

### 3. Test Outlet Dropdown
- Setelah login, check dropdown outlet di header
- Harus muncul "BarberDoc Pusat"

### 4. Test POS
- Menu: **POS / Kasir**
- Harus muncul 10 services (Potong Rambut, Styling, dll)

### 5. Test Public Booking + QRIS
- URL: http://localhost:8082/public-booking
- Isi form booking → Klik "Booking Sekarang"
- Dialog QRIS harus muncul dengan QR code

---

## 🆘 MASIH ERROR?

### Jika masih ada error lain, screenshot & share:
1. Error message lengkap dari Supabase
2. Output dari verification queries
3. Browser console error (F12 → Console tab)

---

## 📁 FILES YANG SUDAH DIFIX

✅ `supabase/FIX_OUTLET_AND_PRODUCTS.sql` - Script utama (fixed)
✅ `supabase/migrations/20260112_add_unique_constraints.sql` - Opsional untuk add constraints
✅ `FIXES_AND_SOLUTIONS.md` - Dokumentasi lengkap
✅ `src/pages/PublicBooking.tsx` - QRIS dialog
✅ `src/components/layout/MainLayout.tsx` - Logo BarberDoc
✅ `public/Logo Long 2.png` - Logo file
✅ `public/qris_barberdoc.jpeg` - QRIS image

---

**Last Updated:** January 12, 2026
**Status:** ✅ READY TO RUN
