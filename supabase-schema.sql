-- ============================================================
--  CCR — Skema Database (Supabase / PostgreSQL)
--  Cara pakai: buka Supabase → SQL Editor → tempel semua isi file
--  ini → klik RUN. Aman dijalankan ulang (pakai IF NOT EXISTS).
-- ============================================================

-- ---------- 1. TABEL ----------

-- Data master (dropdown, pengawas, kode delay/problem, dll) — 1 baris saja.
create table if not exists app_master (
  id         int primary key default 1,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Loader (Exca): 1 baris per loader per tanggal per shift.
create table if not exists loaders (
  id            uuid primary key default gen_random_uuid(),
  tanggal       date        not null,
  shift         text        not null,
  loader        text        not null,
  pengawas      text,            -- NRP (dipakai saat export SS6)
  pengawas_nama text,
  area          text,
  pit           text,
  gl_pit        text,
  gl_road       text,
  gl_disposal   text,
  created_at    timestamptz not null default now()
);

-- Fleet/hauler di bawah sebuah loader. rit = {"07.00": 5, "08.00": 3, ...}
create table if not exists haulers (
  id         uuid primary key default gen_random_uuid(),
  loader_id  uuid not null references loaders(id) on delete cascade,
  hauler     text not null,
  material   text,
  grade      text,
  disposal   text,
  distance   numeric,
  rit        jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Loss: problem / idle / delay per jam.
create table if not exists losses (
  id         uuid primary key default gen_random_uuid(),
  loader_id  uuid not null references loaders(id) on delete cascade,
  jam        text not null,
  type       text not null,        -- 'problem' | 'idle' | 'delay'
  category   text,
  duration   numeric default 0,
  remark     text,
  auto       boolean default false,
  created_at timestamptz not null default now()
);

-- ---------- 2. INDEX (mempercepat laporan per tanggal) ----------
create index if not exists idx_loaders_tanggal       on loaders (tanggal);
create index if not exists idx_loaders_tanggal_shift on loaders (tanggal, shift);
create index if not exists idx_haulers_loader        on haulers (loader_id);
create index if not exists idx_losses_loader         on losses  (loader_id);

-- ---------- 3. KEAMANAN (Row Level Security) ----------
-- PENTING: tanpa ini, siapa pun yang tahu URL + anon key bisa baca/ubah data.
-- Aturan di bawah: hanya user yang SUDAH LOGIN yang boleh akses.
alter table app_master enable row level security;
alter table loaders    enable row level security;
alter table haulers    enable row level security;
alter table losses     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['app_master','loaders','haulers','losses'] loop
    execute format('drop policy if exists "ccr_auth_all" on %I', t);
    execute format(
      'create policy "ccr_auth_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- 4. BARIS AWAL DATA MASTER ----------
insert into app_master (id, data) values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- ============================================================
--  SETELAH RUN:
--  1) Authentication → Users → "Add user" untuk tiap petugas.
--     Email WAJIB berformat:  <NRP>@hpr.local   (huruf kecil)
--     contoh: 13250057@hpr.local  — password bebas, beri ke petugas.
--     (Matikan "Confirm email" atau centang auto-confirm.)
--  2) Settings → API → salin "Project URL" dan "anon public" key
--     ke file config.js (SUPABASE_URL & SUPABASE_ANON_KEY),
--     lalu ubah APP_MODE menjadi "supabase".
-- ============================================================
