# 🚨 MASALAH YANG DITEMUKAN & SOLUSI

## ❌ Masalah yang Dilaporkan User

### 1. **Barang ## 📋 **CARA MEMPERBAIKI**

### **LANGKAH 1: Run Database Fix**

⚠️ **PENTING:** Script sudah diperbaiki untuk error `ON CONFLICT`!

1. Buka Supabase Dashboard: https://supabase.com/dashboard/project/gnqunygpkdelaadvuifn
2. Buka **SQL Editor**
3. Copy semua isi dari file:
   ```
   D:\Buildkathon\barberbook\barbershop-booking\barberdoc_erp\supabase\FIX_OUTLET_AND_PRODUCTS.sql
   ```
4. Paste di SQL Editor
5. Klik **Run**
6. Check output - harus ada:
   ```
   ✅ Default outlet created successfully (atau "already exist")
   ✅ Categories check completed
   ✅ Service products created successfully (atau "already exist")
   ✅ User mapped to outlets successfully
   ```

### **LANGKAH 1b: (OPSIONAL) Add Unique Constraints**
Untuk mencegah data duplikat di masa depan:

1. Copy semua isi dari file:
   ```
   D:\Buildkathon\barberbook\barbershop-booking\barberdoc_erp\supabase\migrations\20260112_add_unique_constraints.sql
   ```
2. Paste di SQL Editor
3. Klik **Run**
4. Expected: 4 unique constraints ditambahkandi Inventory tidak ada**
**Root Cause:** POS menggunakan tabel `products`, Inventory menggunakan tabel `inventory_items`

**Penjelasan:**
- **`products`** = LAYANAN yang dibeli customer (Potong Rambut, Styling, dll)
- **`inventory_items`** = BARANG HABIS PAKAI yang digunakan untuk layanan (Pomade, Shampoo, dll)

**Ini BUKAN bug, tapi design by intent!** 

#### Contoh Alur Bisnis:
```
Customer pesan "Styling Modern" (Rp60.000) di POS
  ↓
Sistem jual service "Styling Modern" dari tabel PRODUCTS
  ↓
Sistem otomatis kurangi stok dari tabel INVENTORY_ITEMS:
  - Pomade: -0.1 unit
  - Wax: -0.05 unit
  ↓
(via tabel product_recipes yang link products ↔ inventory_items)
```

### 2. **Outlet tidak muncul / hilang**
**Root Cause:** 
- Tabel `outlets` kosong (belum ada data)
- User belum di-map ke outlet via `user_outlets`
- RLS Policy blocking karena tidak ada mapping

**Solusi:** Run SQL `FIX_OUTLET_AND_PRODUCTS.sql`

### 3. **Logo dan Branding masih "Veroprise"**
**Root Cause:** Hardcoded logo path dan nama aplikasi di multiple files

**Fixed:**
- ✅ Logo path diganti ke `/Logo Long 2.png`
- ✅ Nama aplikasi diganti ke "BarberDoc ERP"
- ✅ Subtitle diganti ke "Barbershop Management System"
- ✅ Files diupdate:
  - `MainLayout.tsx`
  - `Auth.tsx`
  - `Index.tsx`
  - `PublicBooking.tsx`

### 4. **QRIS belum ada di halaman booking**
**Root Cause:** QRIS image tidak ditampilkan setelah booking berhasil

**Fixed:**
- ✅ QRIS image (`qris_barberdoc.jpeg`) di-copy ke `barberdoc_erp/public/`
- ✅ Dialog QRIS payment ditambahkan di `PublicBooking.tsx`
- ✅ Muncul otomatis setelah booking berhasil

---

## ✅ SOLUSI YANG SUDAH DITERAPKAN

### 1. **Branding Update**
```bash
# Logo & QRIS copied to correct location
D:\Buildkathon\barberbook\barbershop-booking\barberdoc_erp\public\
├── Logo Long 2.png  ← Logo utama
└── qris_barberdoc.jpeg  ← QRIS payment
```

**Updated files:**
- `/src/components/layout/MainLayout.tsx` - Logo sidebar + mobile
- `/src/pages/Auth.tsx` - Logo login page
- `/src/pages/Index.tsx` - Logo landing page
- `/src/pages/PublicBooking.tsx` - Logo booking page + QRIS dialog

### 2. **QRIS Payment Integration**
**Di PublicBooking.tsx:**
- Dialog QRIS muncul setelah booking berhasil
- Tampilkan QR code untuk scan
- Tampilkan total: Rp10.000
- Info: "Setelah transfer, booking dikonfirmasi admin dalam 1x24 jam"

### 3. **Database Fix Script**
**File:** `supabase/FIX_OUTLET_AND_PRODUCTS.sql`

**Isi:**
1. ✅ Create default outlet jika kosong
2. ✅ Create categories (Haircut, Styling, Grooming, Coloring)
3. ✅ Create sample products (10 services)
4. ✅ Map first user to all outlets
5. ✅ Verification query
6. ✅ Dokumentasi data model lengkap

---

## 📋 CARA MEMPERBAIKI

### **LANGKAH 1: Run Database Fix**
1. Buka Supabase Dashboard: https://supabase.com/dashboard/project/gnqunygpkdelaadvuifn
2. Buka **SQL Editor**
3. Copy semua isi dari file:
   ```
   D:\Buildkathon\barberbook\barbershop-booking\barberdoc_erp\supabase\FIX_OUTLET_AND_PRODUCTS.sql
   ```
4. Paste di SQL Editor
5. Klik **Run**
6. Check output - harus ada:
   ```
   ✅ Default outlet created
   ✅ Service products created
   ✅ User mapped to outlets
   ```

### **LANGKAH 2: Verify Data**
Run query ini di Supabase SQL Editor:
```sql
-- Check outlets
SELECT * FROM outlets WHERE is_active = true;

-- Check products (services)
SELECT p.name, c.name as category, p.price 
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE p.is_active = true;

-- Check user-outlet mapping
SELECT 
  u.email,
  o.name as outlet_name
FROM user_outlets uo
JOIN auth.users u ON u.id = uo.user_id
JOIN outlets o ON o.id = uo.outlet_id;
```

**Expected Output:**
- ✅ Minimal 1 outlet muncul
- ✅ Minimal 10 products (services) muncul
- ✅ User email kamu ada di mapping

### **LANGKAH 3: Restart Dev Server**
```powershell
cd D:\Buildkathon\barberbook\barbershop-booking\barberdoc_erp
npm run dev
```

### **LANGKAH 4: Test Features**

#### A. Test Login
1. Buka: http://localhost:8082/auth
2. Login dengan akun master kamu
3. **Expected:** Logo "BarberDoc" muncul, bukan "Veroprise"

#### B. Test Outlet Selection
1. Setelah login, cek dropdown outlet di header
2. **Expected:** Muncul "BarberDoc Pusat" (atau outlet yang kamu buat)
3. **Jika masih kosong:** User belum di-map, re-run step 1

#### C. Test POS (Products)
1. Buka menu **POS / Kasir**
2. **Expected:** Muncul 10 services:
   - Potong Rambut Reguler (Rp50k)
   - Potong Rambut Premium (Rp75k)
   - Styling Klasik (Rp40k)
   - dll

#### D. Test Inventory (Supplies)
1. Buka menu **Inventory**
2. **Expected:** Muncul inventory items dari SEED_DATA.sql (jika sudah di-run):
   - Pomade Supreme
   - Shampoo Anti-Dandruff
   - Wax Professional
   - dll
3. **Jika kosong:** Belum run SEED_DATA.sql (opsional)

#### E. Test Booking + QRIS
1. Buka halaman public: http://localhost:8082/public-booking
2. **Expected:** Logo "BarberDoc Booking" muncul
3. Isi form booking:
   - Pilih outlet: BarberDoc Pusat
   - Nama: Test User
   - Email: test@example.com
   - Tanggal: Besok
   - Jam: 10:00
4. Klik **Booking Sekarang**
5. **Expected:** 
   - ✅ Toast: "Booking Berhasil!"
   - ✅ Dialog QRIS muncul
   - ✅ QR code BarberDoc ditampilkan
   - ✅ Total: Rp10.000
   - ✅ Info konfirmasi admin 1x24 jam

---

## 📊 DATA MODEL EXPLANATION

### Products (Services) - untuk POS
```sql
-- Ini yang dijual ke customer di POS
products (
  id, 
  name,           -- "Potong Rambut Premium"
  category_id,    -- Link ke categories
  price,          -- 75000 (harga jual)
  description,
  is_active
)
```

### Inventory Items (Supplies) - untuk Inventory
```sql
-- Ini barang habis pakai yang ditrack stoknya
inventory_items (
  id,
  name,              -- "Pomade Supreme"
  unit,              -- "pcs"
  cost_per_unit,     -- 45000 (harga beli)
  current_stock,     -- 50
  min_stock,         -- 10
  is_active
)
```

### Product Recipes - Link keduanya
```sql
-- Ini recipe: "Styling Modern" butuh bahan apa aja
product_recipes (
  product_id,          -- Link ke products
  inventory_item_id,   -- Link ke inventory_items
  quantity_used        -- 0.1 (pakai 0.1 unit pomade per service)
)
```

### Alur Sinkronisasi
```
Customer bayar "Styling Modern" (Rp60.000) di POS
  ↓
CREATE transaction di tabel transactions
  ↓
CREATE transaction_items: 1x "Styling Modern" @ Rp60k
  ↓
TRIGGER: deduct_inventory_for_sale()
  ↓
READ product_recipes untuk product "Styling Modern"
  ↓
DEDUCT inventory_items:
  - Pomade: 50 → 49.9 unit
  - Wax: 30 → 29.95 unit
  ↓
UPDATE inventory_batches (FIFO method)
```

---

## 🔧 OPTIONAL: Load Sample Inventory Data

Jika kamu mau inventory items juga ada data sample (opsional):

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/SEED_DATA.sql (hanya bagian inventory_items)

INSERT INTO inventory_items (name, unit, min_stock, cost_per_unit, current_stock) VALUES
('Pomade Supreme', 'pcs', 10, 45000, 50),
('Wax Professional', 'pcs', 10, 35000, 40),
('Shampoo Anti-Dandruff', 'btl', 15, 25000, 60),
('Hair Gel Strong Hold', 'pcs', 8, 30000, 30),
('Beard Oil Premium', 'btl', 5, 55000, 20),
('Hair Tonic Herbal', 'btl', 12, 28000, 45),
('Aftershave Lotion', 'btl', 8, 32000, 25),
('Styling Cream', 'pcs', 10, 40000, 35),
('Hair Spray Ultra Hold', 'can', 6, 38000, 18),
('Comb Set Professional', 'set', 5, 75000, 12);
```

---

## 🎯 CHECKLIST FINAL

### Branding
- [x] Logo BarberDoc di sidebar
- [x] Logo BarberDoc di login page
- [x] Logo BarberDoc di public booking
- [x] Nama aplikasi: "BarberDoc ERP"
- [x] Subtitle: "Barbershop Management System"

### QRIS Payment
- [x] QRIS image copied ke public folder
- [x] QRIS dialog di PublicBooking
- [x] Auto-show setelah booking berhasil
- [x] Tampilkan total Rp10.000
- [x] Info konfirmasi 1x24 jam

### Database
- [x] Script FIX_OUTLET_AND_PRODUCTS.sql created
- [ ] Run script di Supabase (BELUM - tunggu user)
- [ ] Verify outlets muncul (setelah run)
- [ ] Verify products muncul (setelah run)
- [ ] Verify user-outlet mapping (setelah run)

### Testing
- [ ] Login dengan logo baru (tunggu restart server)
- [ ] Outlet dropdown ada data (tunggu run SQL)
- [ ] POS menampilkan services (tunggu run SQL)
- [ ] Inventory menampilkan supplies (opsional)
- [ ] Public booking tampilkan QRIS (tunggu restart)

---

## 🚀 NEXT STEPS

1. **Run SQL Script:**
   ```
   supabase/FIX_OUTLET_AND_PRODUCTS.sql di Supabase SQL Editor
   ```

2. **Restart Dev Server:**
   ```powershell
   cd barberdoc_erp
   npm run dev
   ```

3. **Test semua fitur** sesuai checklist di atas

4. **Report issues** jika masih ada yang tidak berfungsi

---

## 📞 TROUBLESHOOTING

### Problem: Error "there is no unique or exclusion constraint matching the ON CONFLICT"
**Status:** ✅ **SUDAH DIPERBAIKI!**

**Solution:**
```
Script FIX_OUTLET_AND_PRODUCTS.sql sudah diupdate.
Sekarang menggunakan IF NOT EXISTS check instead of ON CONFLICT.

Re-copy script dari file dan run ulang di Supabase SQL Editor.
```

### Problem: Outlet masih tidak muncul setelah run SQL
**Solution:**
```sql
-- Check RLS policies
SELECT * FROM user_outlets WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'
);

-- If empty, manually map:
INSERT INTO user_outlets (user_id, outlet_id)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'),
  (SELECT id FROM outlets LIMIT 1)
);
```

### Problem: Products masih kosong di POS
**Solution:**
```sql
-- Check products count
SELECT COUNT(*) FROM products WHERE is_active = true;

-- If 0, re-run step 4 from FIX_OUTLET_AND_PRODUCTS.sql
```

### Problem: QRIS image tidak muncul
**Solution:**
```powershell
# Check file exists
Test-Path "D:\Buildkathon\barberbook\barbershop-booking\barberdoc_erp\public\qris_barberdoc.jpeg"

# If False, copy again:
Copy-Item "D:\Buildkathon\barberbook\barbershop-booking\public\qris_barberdoc.jpeg" "D:\Buildkathon\barberbook\barbershop-booking\barberdoc_erp\public\"

# Then restart dev server
```

---

**File Created:** `D:\Buildkathon\barberbook\barbershop-booking\barberdoc_erp\FIXES_AND_SOLUTIONS.md`
