# Veroprise Supabase Execution Guide

Panduan ini untuk project Supabase baru.

## Urutan Eksekusi SQL

1. `complete_schema.sql`
2. `postgresql_procurement_schema.sql`
3. `postgresql_auth_profile_trigger.sql`
4. `postgresql_backfill_profiles.sql`
5. `ASSIGN_NEW_OWNER.sql` (setelah user owner ada di `auth.users`)

## Kenapa Ada Trigger Auth Profile

Login dan role app membaca data dari `public.profiles`.
Jika user hanya dibuat di `auth.users` tanpa row di `profiles`, user akan tampil tanpa role.

File `postgresql_auth_profile_trigger.sql` memastikan setiap user baru otomatis dibuatkan row `profiles`.

## Verifikasi Wajib

### 1) Cek trigger aktif

```sql
select trigger_name, event_object_table
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
  and trigger_name = 'on_auth_user_created';
```

### 2) Cek user auth tanpa profile

```sql
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```

### 3) Cek role user

```sql
select p.id, p.email, p.role
from public.profiles p
order by p.created_at desc;
```

## Troubleshooting Singkat

- User bisa login tapi role kosong:
  Jalankan ulang `postgresql_auth_profile_trigger.sql` lalu `postgresql_backfill_profiles.sql`.

- Owner create user lalu session pindah:
  Pastikan code terbaru `src/pages/Users.tsx` sudah terpakai (create user pakai auth client terpisah).

- Error foreign key saat assign outlet:
  Pastikan row user sudah ada di `public.profiles` sebelum insert ke `user_outlets`.
