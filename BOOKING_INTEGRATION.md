# Veroprise ERP - Sistem Booking Terintegrasi

## 🎯 Overview
Sistem booking online yang terintegrasi penuh dengan Veroprise ERP. Setiap booking yang dikonfirmasi otomatis tercatat di laporan keuangan dan transaksi.

### 💰 Sistem Deposit Booking

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
   - Pilih layanan (misal: Premium Service Rp65k)
   - Bayar **sisa**: Rp65k - Rp10k = **Rp55k**
   - Staff input di POS

4. **Total Revenue**
   - Deposit: Rp10k (dari booking)
   - Sisa: Rp55k (dari POS)
   - **Total: Rp65k** ✅

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

## 🚀 Cara Setup

### 1. Migrasi Database
```bash
# Jalankan migrations (via Supabase CLI atau dashboard)
# - 20260112_bookings.sql
# - 20260112_public_booking_function.sql
```

### 2. Install & Run ERP
```bash
npm install
npm run dev
```

### 3. Akses Aplikasi
- **Customer Booking**: http://localhost:8080/book
- **Admin Dashboard**: http://localhost:8080/dashboard
- **Booking Management**: http://localhost:8080/bookings

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

## 🔐 Security

- RLS enabled di tabel `bookings`
- Public function hanya untuk create (read masih protected)
- Admin auth required untuk konfirmasi
- Tracking `confirmed_by` user

---

**Built with ❤️ for Veroprise ERP**
