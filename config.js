/* ============================================================
   KONFIGURASI APLIKASI CCR
   ------------------------------------------------------------
   File ini yang Anda ubah untuk berpindah antara:
   - MODE "local"    : data disimpan di browser (localStorage).
                       Cocok untuk mencoba & pakai offline di 1 komputer.
   - MODE "supabase" : data disimpan online di database Supabase.
                       Cocok untuk online, bisa diakses HP/tim, ada login.

   Cara pindah ke online: ganti APP_MODE menjadi "supabase",
   lalu isi SUPABASE_URL dan SUPABASE_ANON_KEY dari project Supabase Anda.
   (Panduan lengkap ada di file PANDUAN.md)
   ============================================================ */

window.APP_CONFIG = {
  // Ganti ke "supabase" jika sudah siap online. Default "local" agar
  // aplikasi langsung bisa dicoba tanpa setup apa pun.
  APP_MODE: "local",

  // Isi kedua nilai ini dari Supabase (Settings > API) saat mode "supabase".
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // Kapasitas volume per 1 rit (default). Bisa diubah per-loader nanti.
  // Contoh di dokumen: 1 rit = 13. 3 rit = 39. dst.
  VOLUME_PER_RIT: 13,

  // Nama perusahaan untuk header laporan
  COMPANY: "PT Antareja Mahada Makmur",
};
