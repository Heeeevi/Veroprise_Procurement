# Veroprise Focus (Current Direction)

Dokumen ini menjelaskan fokus produk Veroprise saat ini agar tim tidak kembali ke scope lama.

## Tujuan Produk

Veroprise diposisikan sebagai mini ERP untuk operasional procurement dan logistics yang butuh data stok real-time dan kontrol proses harian.

## Fokus Fungsional

1. Procurement workflow
- Permintaan bahan dari unit produksi
- Persetujuan pengadaan
- Penerimaan stok dari supplier

2. Warehouse control
- Monitoring stok gudang pusat
- Distribusi ke unit atau outlet
- Pencatatan movement stock yang jelas

3. Daily stock audit
- Stock opname harian
- Selisih stok terukur
- Stock adjustment dengan approval

4. Delivery documents
- Surat jalan
- Tanda terima
- Status pengiriman sampai diterima

5. Access control
- Role sesuai operasi: owner, pengadaan, gudang, unit produksi
- Akses data berbasis kebutuhan kerja

## Modul Legacy yang Tetap Ada

- POS
- Booking
- HR/Payroll

Modul di atas tetap dipertahankan selama belum ada keputusan deprecate resmi.

## Batasan Scope

- Tidak menambah fitur di luar alur procurement atau logistics tanpa approval.
- Semua perubahan schema harus menjaga konsistensi auth.users dan public.profiles.
- Dokumen acuan utama untuk database adalah supabase/PROCUREMENT_EXECUTION_GUIDE.md.

## Progress Implementasi UI (2026-04-06)

1. Role procurement sudah mulai dipakai di UI:
- manajemen user membaca role dari procurement_user_roles
- fallback ke profile role legacy tetap ada untuk kompatibilitas

2. Modul gudang sudah align ke tabel aktif:
- transfer menggunakan stock_transfer_orders
- opname menggunakan stock_opname dan stock_opname_items

3. Delivery document sekarang punya flow operasional:
- create surat jalan/tanda terima dari halaman gudang
- histori dokumen terbaru
- reprint dokumen dari riwayat

4. Audit mandiri harian sudah tersedia di halaman gudang:
- input stok fisik vs stok sistem
- simpan ke daily_stock_audits dan daily_stock_audit_items
