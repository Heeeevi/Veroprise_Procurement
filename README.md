# Veroprise ERP - Enterprise Resource Planning System

> **Platform Manajemen Bisnis All-in-One dengan Multi-Outlet, POS, Booking, Inventory, HR & Laporan Keuangan**

[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple)](https://vitejs.dev/)

---

## 📋 Daftar Isi

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Fitur yang Sudah Diimplementasikan](#-fitur-yang-sudah-diimplementasikan)
- [Modul & Kemampuan](#-modul--kemampuan)
- [Quick Start](#-quick-start)
- [Struktur Database](#-struktur-database)
- [Security & Role System](#-security--role-system)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

**Veroprise ERP** adalah sistem ERP (Enterprise Resource Planning) modern berbasis cloud yang dirancang untuk bisnis dengan kebutuhan:
- Multi-outlet/cabang management
- Point of Sale (POS) dengan berbagai metode pembayaran
- Sistem booking/reservasi online
- Inventory & warehouse management
- HR & Payroll
- Laporan keuangan real-time

---

## 🛠 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI Components** | shadcn/ui + Tailwind CSS |
| **State Management** | TanStack Query (React Query) |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| **Routing** | React Router v6 |
| **PDF Generation** | jsPDF |
| **Charts** | Recharts (untuk dashboard) |

---

## ✅ Fitur yang Sudah Diimplementasikan

### Core Features
| Fitur | Status | Deskripsi |
|-------|--------|-----------|
| Multi-Outlet Management | ✅ | Kelola banyak cabang dalam 1 sistem |
| User Role System | ✅ | Owner, Manager, Staff, Investor |
| Authentication | ✅ | Login, Register, Session management |
| Dark Mode | ✅ | Theme switching support |
| Responsive Design | ✅ | Mobile, tablet, desktop |

### Business Modules
| Modul | Status | Fitur Utama |
|-------|--------|-------------|
| Dashboard | ✅ | Statistik real-time, grafik penjualan |
| POS | ✅ | Multi-payment, shift management, struk |
| Products | ✅ | CRUD produk, kategori, pricing |
| Inventory | ✅ | Stock tracking, low stock alerts |
| Warehouse | ✅ | Multi-warehouse, stock transfer, PO |
| Transactions | ✅ | History, filter, detail view |
| Expenses | ✅ | Tracking, approval workflow |
| Bookings | ✅ | Online booking, konfirmasi, payment |
| Reports | ✅ | PDF export, daily closing, profit/loss |
| HR & Payroll | ✅ | Employee, attendance, payroll |
| Users | ✅ | User management, role assignment |
| Settings | ✅ | Outlet settings, preferences |

---

## 📦 Modul & Kemampuan

### 1. 📊 Dashboard (`/dashboard`)
**Statistik real-time untuk monitoring bisnis**

Kemampuan:
- Total penjualan hari ini/minggu/bulan
- Jumlah transaksi
- Produk terlaris (top 5)
- Penjualan per metode pembayaran
- Grafik tren penjualan
- Quick stats: gross profit, expenses, net profit

### 2. 🛒 POS - Point of Sale (`/pos`)
**Sistem kasir lengkap untuk transaksi cepat**

Kemampuan:
- Pencarian produk real-time
- Filter berdasarkan kategori
- Keranjang belanja dengan quantity adjustment
- Multiple payment methods:
  - 💵 Cash
  - 📱 QRIS
  - 🏦 Transfer Bank
  - 🛍️ Olshop (untuk penjualan online)
- Split payment (kombinasi metode pembayaran)
- Shift management (buka/tutup shift)
- Print struk/receipt
- Diskon per item atau total
- Auto-deduct inventory on sale

### 3. 📦 Products (`/products`)
**Manajemen produk dan layanan**

Kemampuan:
- CRUD produk (Create, Read, Update, Delete)
- Kategori produk
- Harga jual & harga modal (untuk kalkulasi profit)
- Status aktif/nonaktif
- Product recipes (BOM - Bill of Materials)
- Image upload

### 4. 📋 Inventory (`/inventory`)
**Tracking stock per outlet**

Kemampuan:
- Stock per outlet
- Low stock alerts (warning ketika stock menipis)
- Stock adjustment (+/-)
- History pergerakan stock
- Bulk update stock
- Filter berdasarkan kategori/outlet

### 5. 🏭 Warehouse (`/warehouse`)
**Manajemen gudang dan procurement**

Kemampuan:
- Multi-warehouse management
- Stock Opname (physical count dengan adjustment)
- Stock Transfer antar warehouse/outlet
- Purchase Orders (PO):
  - Buat PO ke vendor
  - Track status (draft, ordered, received)
  - Receive items ke inventory
- Supplier/Vendor management

### 6. 💰 Transactions (`/transactions`)
**Riwayat semua transaksi**

Kemampuan:
- View semua transaksi
- Filter berdasarkan:
  - Outlet
  - Tanggal
  - Metode pembayaran
  - Status
- Detail transaksi dengan items
- Split payment breakdown
- Link ke booking (jika dari booking)

### 7. 💸 Expenses (`/expenses`)
**Pencatatan dan approval pengeluaran**

Kemampuan:
- CRUD expense
- Kategori pengeluaran
- Status approval (pending, approved, rejected)
- Approval workflow:
  - Staff create expense
  - Manager/Owner approve
- Filter berdasarkan status, kategori, tanggal
- Bukti/attachment upload

### 8. 📅 Bookings (`/bookings`)
**Sistem reservasi pelanggan**

Kemampuan:
- Dashboard booking admin
- Status tracking:
  - 🟡 Pending (menunggu konfirmasi)
  - 🔵 Confirmed (terkonfirmasi)
  - 🟢 Completed (selesai)
  - 🔴 Canceled (dibatalkan)
- Konfirmasi booking → auto create transaction
- Payment tracking (dp, paid, unpaid)
- Filter berdasarkan outlet, tanggal, status
- Revenue dari booking

### 9. 📱 Public Booking (`/book`)
**Halaman booking untuk pelanggan**

Kemampuan:
- Form booking tanpa login
- Pilih outlet
- Pilih tanggal & jam
- Input nama & nomor HP
- Pilih layanan/produk
- Payment DP (Rp 10.000)
- QRIS payment display
- Konfirmasi booking via WhatsApp

### 10. 📊 Reports (`/reports`)
**Laporan keuangan lengkap**

Kemampuan:
- Filter per outlet atau semua outlet
- Filter periode: 7 hari, bulan ini, tahun ini
- Statistik:
  - Total penjualan
  - HPP (Harga Pokok Penjualan)
  - Gross Profit
  - Total Pengeluaran
  - Net Profit
  - Profit Margin
- Perhitungan Setoran Tunai (Cash Deposit)
- Produk terlaris
- Penjualan per metode bayar
- Visualisasi perbandingan finansial
- **PDF Export** (2 halaman):
  - Page 1: Summary, top products, payment methods
  - Page 2: Detail layanan, booking statistics
- **Daily Closing**:
  - Input uang fisik
  - Hitung selisih
  - Simpan ke database

### 11. 👥 HR & Payroll (`/hr`)
**Manajemen karyawan dan penggajian**

Kemampuan:
- Employee Management:
  - Data karyawan
  - Posisi/jabatan
  - Outlet assignment
  - Salary information
- Attendance:
  - Clock in/out
  - Attendance log
  - Late/early detection
- Payroll:
  - Monthly payroll run
  - Salary calculation
  - Deductions & bonuses
  - Commission tracking
  - Payroll history

### 12. 👤 Users (`/users`)
**Manajemen user dan outlet**

Kemampuan:
- User Management:
  - Lihat semua user
  - Assign role (owner, manager, staff, investor)
  - Assign outlet access
  - Edit profile
- Outlet Management:
  - CRUD outlet
  - Outlet address & contact
  - Status (active/inactive)
  - Assign user ke outlet

### 13. ⚙️ Settings (`/settings`)
**Pengaturan sistem**

Kemampuan:
- Profile settings
- Outlet preferences
- Theme (light/dark mode)

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js >= 18
npm atau bun
Supabase account (gratis)
```

### Installation
```bash
# Clone repository
git clone <repo-url>
cd veroprise_erp

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env dengan Supabase credentials
```

### Database Setup
1. Login ke [supabase.com](https://supabase.com)
2. Buat project baru
3. Buka SQL Editor
4. Jalankan file berikut secara berurutan:
   ```
   supabase/COMPLETE_SCHEMA.sql   (wajib)
   supabase/SEED_DATA.sql         (optional - data sample)
   ```
5. Update `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Run Development
```bash
npm run dev
```
Buka [http://localhost:8080](http://localhost:8080)

---

## 🗄 Struktur Database

### Tabel Utama (30+ tabel)

| Kategori | Tabel |
|----------|-------|
| **User Management** | `profiles`, `user_roles`, `user_outlets` |
| **Products** | `categories`, `products`, `product_recipes` |
| **Inventory** | `inventory_items`, `outlet_inventory`, `inventory_transactions` |
| **Warehouse** | `warehouses`, `warehouse_inventory`, `stock_opnames`, `stock_transfers` |
| **Sales** | `transactions`, `transaction_items`, `shifts` |
| **Finance** | `expenses`, `expense_categories`, `daily_closings` |
| **Booking** | `bookings` |
| **HR** | `employees`, `attendance_logs`, `payroll_runs`, `payroll_items` |
| **Procurement** | `partner_vendors`, `purchase_orders`, `purchase_order_items` |
| **Audit** | `audit_logs` |
| **Organization** | `outlets` |

### Key Relationships
```
outlets
  ├─ user_outlets → users (many-to-many)
  ├─ transactions → bookings
  ├─ expenses
  ├─ outlet_inventory → products
  └─ employees
```

---

## 🔐 Security & Role System

### Row Level Security (RLS)
- ✅ Enabled pada semua tabel
- ✅ Users hanya akses data outlet mereka
- ✅ Role-based access control

### User Roles

| Role | Akses |
|------|-------|
| **Owner** | Full access ke semua fitur dan semua outlet |
| **Manager** | Manage outlet operations, approve expenses |
| **Staff** | POS, basic inventory, create expenses |
| **Investor** | View-only reports dan dashboard |

### Role Capabilities Matrix

| Fitur | Owner | Manager | Staff | Investor |
|-------|:-----:|:-------:|:-----:|:--------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| POS | ✅ | ✅ | ✅ | ❌ |
| Products | ✅ | ✅ | 👁 | ❌ |
| Inventory | ✅ | ✅ | 👁 | ❌ |
| Transactions | ✅ | ✅ | 👁 | ✅ |
| Expenses | ✅ | ✅ | ➕ | ❌ |
| Bookings | ✅ | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ❌ | ✅ |
| HR & Payroll | ✅ | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ |

*Legend: ✅ Full Access, 👁 View Only, ➕ Create Only, ❌ No Access*

---

## 🐛 Troubleshooting

### Common Issues

**1. "Cannot connect to Supabase"**
- Check `.env` file exists dan terisi
- Verify VITE_SUPABASE_URL format: `https://xxx.supabase.co`
- Ensure anon key is correct

**2. "RLS policy blocks access"**
- Check user has role in `user_roles` table
- Verify user mapped to outlet in `user_outlets`
- Query: `SELECT * FROM user_outlets WHERE user_id = auth.uid();`

**3. "Outlet dropdown empty"**
- Pastikan ada outlet dengan `status = 'active'`
- Check RLS policies pada tabel `outlets`

**4. "PDF generation error"**
- Pastikan tidak ada data dengan `null` values
- Check console untuk error detail

**5. "Inventory not deducting"**
- Verify `product_recipes` table has entries
- Check trigger is enabled: `trigger_deduct_inventory`
- Ensure `outlet_inventory` has stock

---

## 📁 Project Structure

```
veroprise_erp/
├── src/
│   ├── components/        # Reusable components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/       # Layout components
│   │   ├── hr/           # HR specific components
│   │   ├── warehouse/    # Warehouse components
│   │   └── payment/      # Payment components
│   ├── pages/            # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── POS.tsx
│   │   ├── Products.tsx
│   │   ├── Inventory.tsx
│   │   ├── Warehouse.tsx
│   │   ├── Transactions.tsx
│   │   ├── Expenses.tsx
│   │   ├── Bookings.tsx
│   │   ├── PublicBooking.tsx
│   │   ├── Reports.tsx
│   │   ├── HR.tsx
│   │   ├── Users.tsx
│   │   └── Settings.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.tsx   # Authentication
│   │   ├── useOutlet.tsx # Outlet context
│   │   └── useShift.tsx  # Shift management
│   ├── integrations/     # External integrations
│   │   └── supabase/     # Supabase client & types
│   ├── lib/              # Utility functions
│   │   ├── utils.ts      # General utilities
│   │   └── pdfGenerator.ts # PDF generation
│   ├── types/            # TypeScript types
│   └── App.tsx           # Main app component
├── supabase/
│   ├── migrations/       # Database migrations
│   ├── COMPLETE_SCHEMA.sql
│   └── SEED_DATA.sql
└── public/               # Static assets
```

---

## 📞 Support & Resources

- 📖 [Supabase Docs](https://supabase.com/docs)
- 📖 [React Query Docs](https://tanstack.com/query)
- 📖 [shadcn/ui Docs](https://ui.shadcn.com)
- 📖 [Tailwind CSS Docs](https://tailwindcss.com)

---

## 🎉 Roadmap

### Current Version (v1.0)
- ✅ Multi-outlet management
- ✅ POS system with split payment
- ✅ Online booking system
- ✅ Inventory & warehouse management
- ✅ Finance & expenses tracking
- ✅ HR & payroll
- ✅ Reports & PDF export
- ✅ Daily closing

### Coming Soon (v1.1)
- [ ] Email notifications
- [ ] WhatsApp integration
- [ ] Online payment gateway (Midtrans)
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] API documentation
- [ ] Webhook support

---

## 📜 License

MIT License - Free to use for personal & commercial projects

---

**🚀 Veroprise ERP - Solusi Lengkap untuk Manajemen Bisnis Modern!**
