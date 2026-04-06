# Veroprise ERP (Procurement Focus)

Frontend app untuk Veroprise dengan fokus utama pada proses logistics dan procurement, sambil mempertahankan modul operasional yang masih dipakai.

## Fokus Utama

- Pengadaan bahan baku dari vendor sampai stok gudang
- Distribusi bahan dari gudang ke unit produksi
- Audit stok harian dan penyesuaian stok terkontrol
- Kontrol akses berbasis role untuk operasional

Dokumen arah produk ada di `VEROPRISE_FOCUS.md`.

## Menjalankan App

1. Install dependency:

```bash
npm install
```

2. Set environment di `.env`:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_SUPABASE_ANON_KEY=<anon-key>
```

3. Jalankan development server:

```bash
npm run dev
```

## Database yang Dipakai

File SQL penting ada di folder `supabase/`:

- `complete_schema.sql`
- `postgresql_procurement_schema.sql`
- `postgresql_auth_profile_trigger.sql`
- `postgresql_backfill_profiles.sql`
- `ASSIGN_NEW_OWNER.sql`

Urutan eksekusi dan query verifikasi ada di `supabase/PROCUREMENT_EXECUTION_GUIDE.md`.

## Catatan Keamanan

- Jangan simpan `service_role` di env frontend.
- Jangan commit secret key ke git.
- Gunakan secret manager untuk production.
