# BarberDoc - Sistem Booking Terintegrasi dengan ERP

## 🎯 Overview
Sistem booking barbershop yang terintegrasi penuh dengan BarberDoc ERP. Setiap booking yang dikonfirmasi otomatis tercatat di laporan keuangan dan transaksi.

### 💰 PENTING: Sistem Deposit Booking

**Booking fee Rp10.000 = DEPOSIT untuk amankan seat/slot saja, BUKAN harga layanan!**

#### Flow Pembayaran:

1. **Customer Booking Online** (`/book`)
   - Pilih outlet, tanggal, jam
   - Bayar deposit **Rp10.000** via QRIS
   - Status: `pending` / `unpaid`

2. **Admin Konfirmasi** (`/bookings`)
   - Klik "Confirm" → buat transaksi Rp10.000
   - Status: `confirmed` / `paid`
   - Deposit masuk ke revenue

3. **Customer Datang ke Outlet**
   - Pilih layanan (misal: Premium Haircut Rp65k)
   - Bayar **sisa**: Rp65k - Rp10k = **Rp55k**
   - Staff input di POS

4. **Total Revenue**
   - Deposit: Rp10k (dari booking)
   - Sisa: Rp55k (dari POS)
   - **Total: Rp65k** ✅

#### Contoh Skenario:

**Skenario 1: Basic Haircut (Rp35k)**
- Deposit booking: Rp10.000
- Bayar di outlet: Rp25.000
- Total revenue: Rp35.000 ✅

**Skenario 2: Royal Grooming (Rp200k)**
- Deposit booking: Rp10.000
- Bayar di outlet: Rp190.000
- Total revenue: Rp200.000 ✅

**Skenario 3: Customer Cancel**
- Deposit Rp10k hangus (no refund)
- Status: `canceled` / `refunded`
- Revenue tetap tercatat

---

## ✨ Fitur Utama

### Untuk Pelanggan (`/book`)
- ✅ Form booking sederhana tanpa perlu login
- ✅ Pilih outlet, tanggal, dan jam
- ✅ Deposit Rp10.000 via QRIS (amankan seat)
- ✅ Notifikasi email otomatis

### Untuk Admin/Staff (`/bookings`)
- ✅ Dashboard lengkap booking
- ✅ Konfirmasi booking dengan 1 klik
- ✅ Otomatis buat transaksi deposit
- ✅ Tracking payment status
- ✅ Filter & pencarian

### Integrasi Keuangan
- ✅ Setiap booking confirmed → transaksi Rp10k tercatat
- ✅ Revenue booking muncul di Dashboard
- ✅ Terintegrasi dengan laporan bulanan
- ✅ Tracking lengkap di modul Transaksi

## 🗄️ Database Schema

### Tabel `bookings`
```sql
- id (UUID, PK)
- outlet_id (FK → outlets)
- customer_name, customer_email, customer_phone
- slot_time (timestamptz)
- status: pending | confirmed | completed | canceled
- payment_status: unpaid | paid | refunded
- payment_amount (default 10000)
- transaction_id (FK → transactions)
- confirmed_by, confirmed_at
- notes
- created_at, updated_at
```

### View `booking_stats`
Agregasi statistik booking per outlet per hari.

### Function `create_public_booking()`
RPC function untuk public booking tanpa auth.

## 🚀 Cara Setup

### 1. Migrasi Database
```bash
cd barberdoc_erp
# Jalankan migrations (via Supabase CLI atau dashboard)
# - 20260112_bookings.sql
# - 20260112_public_booking_function.sql
```

### 2. Install & Run ERP
```bash
cd barberdoc_erp
npm install
npm run dev
```

### 3. Akses Aplikasi
- **Customer Booking**: http://localhost:5173/book
- **Admin Dashboard**: http://localhost:5173/dashboard
- **Booking Management**: http://localhost:5173/bookings

## 📋 Workflow

### Flow Pelanggan
1. Buka `/book`
2. Isi form (nama, email, pilih slot)
3. Submit → status "pending"
4. Tunggu konfirmasi admin via email

### Flow Admin
1. Login ke ERP → menu "Booking"
2. Lihat list booking pending
3. Klik "Konfirmasi" → muncul dialog
4. Isi notes (opsional) → konfirmasi
5. Otomatis:
   - Status booking → "completed"
   - Payment status → "paid"
   - Buat transaksi baru di tabel `transactions`
   - Revenue tercatat di keuangan

## 🔗 Integrasi dengan Modul Lain

### Dashboard
- Card "Booking Hari Ini" menampilkan jumlah booking
- Card revenue menghitung total dari booking yang paid

### Transaksi
- Setiap booking confirmed → transaksi baru
- Transaction number: `BK-{timestamp}`
- Notes: "Booking: {customer_name}"

### Reports
- Booking revenue masuk ke laporan bulanan
- Dapat di-export bersama transaksi lain

## 🎨 UI/UX

### Public Booking Page
- Modern landing page dengan gradient
- Info kenapa booking online
- Form di-split jadi 2 kolom (info + form)
- Mobile responsive

### Admin Booking Page
- Stats cards (total, pending, completed, revenue)
- Table dengan filter & search
- Badge status berwarna (pending=yellow, completed=green)
- Dialog konfirmasi dengan textarea notes
- Show confirmer name setelah completed

## 🛠️ Tech Stack

### Backend (Supabase)
- PostgreSQL dengan RLS
- Row Level Security policies
- Database functions (create_public_booking)
- Real-time subscriptions ready

### Frontend
- React 18 + TypeScript
- Vite
- shadcn/ui components
- TanStack Query
- React Router

## 📊 Statistik & Reporting

### Dashboard Cards
```typescript
{
  todayBookings: number,
  monthBookingsRevenue: number,
  pendingBookings: number,
  completedBookings: number
}
```

### Booking Stats View
```sql
SELECT 
  outlet_id,
  DATE(slot_time) as booking_date,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  SUM(payment_amount) FILTER (WHERE payment_status = 'paid') as total_revenue
FROM bookings
GROUP BY outlet_id, DATE(slot_time);
```

## 🔐 Security

- RLS enabled di tabel `bookings`
- Public function hanya untuk create (read masih protected)
- Admin auth required untuk konfirmasi
- Tracking `confirmed_by` user

## 📱 Mobile Responsive

- Grid layout auto-adjust
- Form stacked di mobile
- Touch-friendly buttons
- Readable font sizes

## 🧪 Testing

### Manual Test Checklist
- [ ] Public booking form submit berhasil
- [ ] Booking muncul di admin panel
- [ ] Konfirmasi booking → transaksi tercatat
- [ ] Revenue muncul di dashboard
- [ ] Email notifikasi terkirim (jika ada email service)

## 🚧 Future Enhancements

- [ ] Email confirmation otomatis
- [ ] WhatsApp notification
- [ ] Online payment gateway (Midtrans)
- [ ] Reminder H-1 booking
- [ ] Rating & review system
- [ ] Multi-service selection (tidak hanya pangkas)
- [ ] Booking calendar view untuk admin
- [ ] Export booking ke PDF/Excel

## 📞 Support

Untuk pertanyaan atau issue, hubungi tim development atau buat ticket di repository.

---

**Built with ❤️ for Business Owners**
