# 🗑️ Inventory Soft Delete - Dokumentasi

## 📋 Overview

Fitur hapus inventory dengan **Smart Delete System** yang melindungi integritas data historis dan cashflow.

---

## 🎯 Konsep: Soft Delete vs Hard Delete

### 🔴 Hard Delete (Hapus Permanen)
**Kapan:** Item **TIDAK** memiliki data historis apapun
- ✅ Item baru yang belum pernah digunakan
- ✅ Item yang salah input
- ❌ Menghapus dari database sepenuhnya

### 🟡 Soft Delete (Nonaktifkan)
**Kapan:** Item **MEMILIKI** data historis
- ✅ Ada transaksi inventory
- ✅ Ada purchase order
- ✅ Ada recipe produk (BOM)
- ❌ Item ditandai `is_active = false`
- ✅ Data historis tetap utuh

---

## 🔍 Dependency Check

Sistem otomatis mengecek 3 dependencies:

### 1. **Inventory Transactions** 📦
```sql
SELECT COUNT(*) FROM inventory_transactions 
WHERE inventory_item_id = ?
```
- Transaksi pembelian, penggunaan, waste, transfer
- Penting untuk audit trail

### 2. **Purchase Orders** 📋
```sql
SELECT COUNT(*) FROM purchase_order_items 
WHERE inventory_item_id = ?
```
- PO yang sudah di-receive
- Penting untuk tracking biaya

### 3. **Product Recipes (BOM)** 🍳
```sql
SELECT COUNT(*) FROM product_recipes 
WHERE inventory_item_id = ?
```
- Resep produk yang menggunakan item ini
- Penting untuk cost calculation

---

## 💰 Dampak terhadap Cashflow & Laporan

### ✅ TIDAK ADA DAMPAK NEGATIF

| Aspek | Hard Delete | Soft Delete |
|-------|-------------|-------------|
| **Laporan Historis** | ❌ Broken | ✅ Tetap Valid |
| **Cashflow Report** | ❌ Error | ✅ Akurat |
| **Purchase Order** | ❌ Broken Reference | ✅ Tetap Valid |
| **Inventory Audit** | ❌ Data Loss | ✅ Complete Trail |
| **Product Cost** | ❌ Calculation Error | ✅ Accurate |
| **Tax Report** | ❌ Incomplete | ✅ Complete |

### 📊 Contoh Skenario:

**Skenario 1: Item dengan Transaksi**
```
Item: Shampoo Sachet
- 50 transaksi inventory
- 10 purchase orders
- 3 product recipes

Action: SOFT DELETE
Result: 
  ✓ Item tidak muncul di dropdown baru
  ✓ Laporan bulan lalu tetap akurat
  ✓ Cashflow tidak berubah
  ✓ Tax report tetap valid
```

**Skenario 2: Item Baru (Salah Input)**
```
Item: Test Item
- 0 transaksi
- 0 purchase orders
- 0 recipes

Action: HARD DELETE
Result:
  ✓ Item dihapus permanen
  ✓ Database lebih bersih
```

---

## 🎨 UI/UX Flow

### Step 1: Klik Tombol Hapus
- User (Owner/Manager) klik tombol "Hapus" pada item
- Sistem menjalankan dependency check

### Step 2: Dialog Konfirmasi
**Jika ADA Dependencies:**
```
⚠️ Item ini memiliki data historis:
  • 50 transaksi inventory
  • 10 purchase orders
  • 3 resep produk (BOM)

Item akan di-NONAKTIFKAN (soft delete) 
untuk menjaga integritas laporan keuangan.

📊 Dampak terhadap Sistem:
  ✓ Laporan Keuangan: Data historis tetap tersimpan
  ✓ Purchase Order: PO lama tetap valid
  ✓ Cashflow: Tidak terpengaruh
  ✓ Form Input: Item tidak muncul di dropdown baru

[Batal]  [Nonaktifkan Item]
```

**Jika TIDAK ADA Dependencies:**
```
✓ Item ini tidak memiliki data historis 
  dan dapat dihapus sepenuhnya.

[Batal]  [Hapus Permanen]
```

### Step 3: Konfirmasi
- User klik tombol sesuai kondisi
- Toast notification muncul
- Table refresh otomatis

---

## 🔐 Permission

Hanya **Owner** dan **Manager** yang bisa hapus item:

```tsx
{(isOwner || isManager) && (
  <Button onClick={() => handleDeleteClick(item)}>
    <Trash2 /> Hapus
  </Button>
)}
```

---

## 🗄️ Database Schema

### Table: inventory_items
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  min_stock NUMERIC(12, 2),
  current_stock NUMERIC(12, 2),
  cost_per_unit NUMERIC(12, 2),
  is_active BOOLEAN DEFAULT true,  -- ← New column
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Index untuk performance
CREATE INDEX idx_inventory_items_is_active 
ON inventory_items(is_active);
```

### Migration
```bash
# Run migration untuk database yang sudah ada
psql -f migrations/20260112_inventory_soft_delete.sql
```

---

## 📝 Usage Example

### Frontend Code
```tsx
const handleDeleteClick = async (item: InventoryItem) => {
  // 1. Check dependencies
  const check = await checkDeleteDependencies(item.id);
  
  // 2. Show confirmation dialog with check result
  setDeleteCheckResult(check);
  setShowDeleteDialog(true);
};

const handleDeleteConfirm = async () => {
  const hasAnyDependency = 
    checkResult.hasTransactions || 
    checkResult.hasPurchaseOrders || 
    checkResult.hasRecipes;
  
  if (hasAnyDependency) {
    // SOFT DELETE
    await supabase
      .from('inventory_items')
      .update({ is_active: false })
      .eq('id', item.id);
    
    toast({
      title: 'Item di-nonaktifkan',
      description: 'Data historis tetap tersimpan untuk integritas laporan.'
    });
  } else {
    // HARD DELETE
    await supabase
      .from('inventory_items')
      .delete()
      .eq('id', item.id);
    
    toast({
      title: 'Item dihapus',
      description: 'Item berhasil dihapus dari sistem.'
    });
  }
};
```

### Query: Hanya tampilkan item aktif
```tsx
// Di form/dropdown, hanya tampilkan item aktif
const { data: activeItems } = await supabase
  .from('inventory_items')
  .select('*')
  .eq('is_active', true)  // ← Filter active only
  .order('name');
```

### Query: Tampilkan semua (untuk laporan)
```tsx
// Di laporan/audit, tampilkan semua item
const { data: allItems } = await supabase
  .from('inventory_items')
  .select('*')
  .order('name');
```

---

## 🧪 Testing Checklist

- [ ] Item tanpa transaksi → Hard delete berhasil
- [ ] Item dengan transaksi → Soft delete berhasil
- [ ] Item dengan PO → Soft delete berhasil
- [ ] Item dengan recipe → Soft delete berhasil
- [ ] Permission check: Staff tidak bisa hapus
- [ ] Toast notification muncul
- [ ] Table refresh setelah delete
- [ ] Laporan historis tetap valid
- [ ] Form dropdown tidak tampilkan item inactive
- [ ] Audit log tetap utuh

---

## 🎯 Benefits

1. **Data Integrity** ✅
   - Historical data tetap utuh
   - Foreign key tidak broken
   - Audit trail lengkap

2. **Cashflow Accuracy** ✅
   - Laporan keuangan tetap akurat
   - Tax report tidak error
   - PO tracking tidak hilang

3. **User Friendly** ✅
   - Smart decision (hard vs soft)
   - Clear warning messages
   - Easy to understand impact

4. **Database Clean** ✅
   - Item tidak terpakai bisa dihapus
   - Item aktif tetap bersih
   - Performance optimal

---

## 🚀 Deployment

### 1. Deploy Migration
```bash
# Supabase SQL Editor
-- Copy paste dari: migrations/20260112_inventory_soft_delete.sql
```

### 2. Update Frontend
```bash
# File sudah diupdate:
# - src/pages/Inventory.tsx
```

### 3. Test
```bash
npm run dev
# Test delete item dengan/tanpa dependencies
```

---

## 📚 Related Documentation

- [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md) - Database setup
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Query examples
- [COMPLETE_SCHEMA.sql](./COMPLETE_SCHEMA.sql) - Full schema

---

**Note:** Fitur ini melindungi integritas cashflow dan laporan keuangan dengan smart delete system yang otomatis mendeteksi dependencies dan memilih strategi delete yang tepat.
