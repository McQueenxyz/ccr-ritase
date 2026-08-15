# Panduan Aplikasi CCR — Laporan Ritase

Aplikasi ini menggantikan pencatatan ritase manual di Excel + input ke HPR Web yang sering error.
Fokusnya: **input cepat, anti salah-ketik, dan laporan WhatsApp otomatis**.

---

## 1. Fitur

- **Login** (mode lokal atau online).
- **Form per Loader (1 shift)** — Area, Pit, GL Pit/Road/Disposal. Tambah loader baru otomatis mewarisi pengawas/area yang sama; tombol **Duplikat** membuat loader baru dengan pengawas sama & fleet kosong.
- **Fleet (Hauler)**: isi daftar hauler + Material, Disposal, Distance **sekali di depan**. Bisa **tambah banyak hauler sekaligus**.
- **Grid Ritase (seperti Excel)**: baris = hauler, kolom = jam. Ketik angka rit → Volume & total (per jam, per hauler, grand) **otomatis** dan tersimpan otomatis.
- **Loss (Problem / Idle / Delay)** per jam dengan **input DURASI (menit)**. **Meal & Break 60′** (12.00/00.00) dan **Change Shift 60′** (18.00/06.00) terisi otomatis.
- **Laporan WhatsApp 1 klik**: pilih jam → teks laporan (rit + loss + total loss menit) → *Salin* / *Buka WhatsApp*.
- **Export CSV** untuk backup / bahan input ke HPR Web.
- **Setting**: ubah semua daftar dropdown. **Mode gelap/terang**, responsif untuk **HP**.

---

## 2. Pakai SEKARANG (mode lokal — tanpa internet, tanpa daftar apa pun)

1. Buka folder `hpr-app`.
2. **Klik dua kali `index.html`** → terbuka di browser (Chrome/Edge disarankan).
3. Login: masukkan **NRP apa saja**, password **`admin`**.
4. Alur pakai:
   - **Form Ritase → ＋ Tambah Loader** (pilih loader, pengawas otomatis terisi).
   - Tab **1. Fleet** → ＋ Tambah Hauler (masukkan beberapa DT sekaligus + material/disposal/distance).
   - Tab **2. Ritase** → ketik angka rit tiap jam (grid Excel, otomatis tersimpan).
   - Tab **3. Loss** → tambah problem/idle/delay + durasi (meal & break / change shift sudah otomatis).
   - Loader berikutnya: pakai **⧉ Duplikat** (pengawas sama), lalu isi fleet & ritase baru.
5. Buat laporan: menu **Laporan WhatsApp → pilih Jam → Buat Laporan → Salin**.

> Di mode lokal, data tersimpan di **browser komputer itu** (localStorage). Aman dari HPR web yang error, tapi hanya di 1 komputer & 1 browser. Untuk online/tim, lihat bagian 4.

---

## 3. Struktur file

```
hpr-app/
├─ index.html            ← buka file ini
├─ config.js             ← pengaturan (mode lokal/online, kapasitas volume)
├─ supabase-schema.sql   ← skema database untuk mode online
├─ PANDUAN.md            ← file ini
└─ assets/
   ├─ style.css          ← tampilan
   ├─ seed.js            ← daftar loader/material/dll default (dari dokumen Anda)
   ├─ store.js           ← penyimpanan data (lokal / Supabase)
   └─ app.js             ← logika aplikasi
```

**Mengubah kapasitas volume per rit:** buka `config.js`, ubah `VOLUME_PER_RIT` (default 13).
**Mengubah daftar dropdown:** lebih mudah lewat menu **Setting** di aplikasi (langsung tersimpan).

---

## 4. Jadikan ONLINE + bisa diakses HP/tim (Supabase — GRATIS)

Bagian ini butuh Anda buat akun sendiri (saya tidak bisa mengisikan kredensial Anda). Ikuti urut:

### 4a. Buat project Supabase
1. Buka **https://supabase.com** → **Sign up** (gratis) → **New project**.
2. Beri nama (mis. `hpr`), buat **Database Password** (catat), pilih region terdekat (**Singapore**).
3. Tunggu ± 2 menit sampai project siap.

### 4b. Buat tabel database
1. Di project, buka menu **SQL Editor → New query**.
2. Buka file `supabase-schema.sql`, **salin semua isinya**, tempel, klik **RUN**.
3. Pastikan muncul "Success".

### 4c. Buat user login pertama
1. Buka **Authentication → Users → Add user → Create new user**.
2. Email: pakai pola **`<NRP>@hpr.local`** (contoh: `12345@hpr.local`).
3. Isi Password, centang **Auto Confirm User**, lalu **Create**.
4. (Ulangi untuk setiap anggota tim.)

### 4d. Sambungkan aplikasi ke Supabase
1. Buka **Project Settings → API**. Salin **Project URL** dan **anon public key**.
2. Buka `config.js`, isi:
   ```js
   APP_MODE: "supabase",
   SUPABASE_URL: "https://xxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOi....(anon key)",
   ```
3. Simpan. Buka `index.html` → login pakai **NRP** (tanpa `@hpr.local`) + password yang tadi.

> Sekarang data tersimpan online. Buka dari HP pun bisa (lihat bagian 5 agar ada alamat web).

### 4e. (opsional) Isi data master ke database
Login → menu **Setting → Simpan Data Master**. Ini menyalin daftar dropdown ke Supabase agar sama untuk semua orang.

---

## 5. Agar bisa dibuka dari HP (deploy gratis)

Pilih salah satu (paling mudah **Netlify Drop**):

**Netlify Drop**
1. Buka **https://app.netlify.com/drop**.
2. **Seret folder `hpr-app`** ke halaman itu.
3. Dapat alamat web (mis. `https://hpr-anda.netlify.app`) → buka di HP.

**Cloudflare Pages / Vercel** juga bisa (upload folder yang sama). Karena aplikasi ini file statis + Supabase, tidak perlu server khusus.

> Penting: sebelum deploy, pastikan `config.js` sudah mode `"supabase"`, supaya semua perangkat berbagi data yang sama.

---

## 6. Backup & pindah data

- **Mode lokal:** gunakan tombol **Export CSV** tiap shift sebagai cadangan. Data ada di browser; jangan "clear browsing data" tanpa export dulu.
- **Mode online:** data aman di Supabase (ada backup bawaan). Export CSV tetap berguna untuk arsip / input ke HPR Web.

---

## 7. Batasan & langkah lanjutan (jujur)

- Aplikasi ini **menggantikan Excel** dan membuat laporan WA. Ia **belum otomatis mengisi ke HPR Web** perusahaan.
- Input verbal dari Radio Rig tetap Anda ketik (tapi jauh lebih cepat & tanpa salah ketik).
- **Langkah lanjut yang bisa kita kerjakan berikutnya** jika Anda mau:
  1. **Otomatis input ke HPR Web** (butuh izin/akses resmi + kita periksa API/otomasinya).
  2. **Rekap harian/bulanan & grafik produksi**.
  3. **Multi-user dengan peran** (admin vs operator) dan riwayat perubahan.
  4. **Impor dari Excel lama** Anda ke aplikasi ini.

---

## 8. Kalau ada kendala

Catat: langkah apa, pesan error apa (kalau ada), dan di mode lokal/online. Kirim ke saya, nanti saya perbaiki.
