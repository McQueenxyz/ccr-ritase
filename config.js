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

  // Model tiap loader (Exca) + target produksi per shift per model.
  // Jika BCM shift loader >= target → target tercapai (loss tak wajib diisi).
  // Sumber: sheet "POP UNIT" (ekspor populasi SS6) + daftar populasi SS6 Agustus 2026.
  // Excavator 45T -> PC400, 30T -> PC300, 20T -> PC200.
  UNIT_MODEL: {
    E5416: "PC400", E5418: "PC400", E5422: "PC400",
    E5312: "PC300", E5313: "PC300", E5314: "PC300",
    E5153: "PC200", E5154: "PC200", E5155: "PC200", E5156: "PC200",
    E5157: "PC200", E5158: "PC200", E5159: "PC200", E5160: "PC200",
    E5161: "PC200", E5166: "PC200", E5167: "PC200", E5168: "PC200",
    E5169: "PC200", E5170: "PC200", E5171: "PC200", E5172: "PC200",
    E5189: "PC200", // terverifikasi di populasi SS6: PC200-10M0CE, Excavator 20T
  },

  // PLAN PRODUKTIVITAS (BCM/jam) — dasar hitung Gain & Loss (waterfall DPR).
  // ob = OB/Quarry, ore = Ore Getting/Hauling. Per unit (menimpa nilai model).
  // BELUM TERVALIDASI. Sumber DPR Agustus 2026 menyebut dua versi berbeda
  // (200/160/90 pada tabel per unit, 205/166/90 pada blok ringkasan) dan
  // keduanya tidak cocok dengan angka di bawah. Menunggu berkas plan resmi.
  PLAN_PDTY_MODEL: { PC400: { ob: 200, ore: 334 }, PC300: { ob: 158, ore: 158 }, PC200: { ob: 90, ore: 90 } },
  PLAN_PDTY_UNIT: { E5314: { ore: 158 }, E5312: { ore: 210 }, E5422: { ore: 334 } },

  // PLAN LOSS per unit — diambil dari DPR Waterfall (basis 31 hari, MOHH 744 jam).
  // perDay/perWeek dalam MENIT. Plan diskalakan ke MOHH yang benar-benar tercatat
  // (mis. hanya shift 1 = 12 jam → plan × 12/24).
  LOSS_PLAN: [
    { code: "B01", label: "Breakdown / Maintenance", grup: "breakdown", perDay: 72 },
    { code: "I01", label: "Hujan (Rain)", grup: "idle", perDay: 81 },
    { code: "I05", label: "Kabut (Fog)", grup: "idle", perDay: 25 },
    { code: "I02", label: "Slippery", grup: "idle", perDay: 27 },
    { code: "D09", label: "Meal & Break", grup: "delay", perDay: 120 },
    { code: "D13", label: "Change Shift", grup: "delay", perDay: 120 },
    { code: "D15", label: "Praying", grup: "delay", perDay: 45 },
    { code: "D17", label: "Prepare Front / Disposal", grup: "delay", perDay: 30 },
    { code: "D06", label: "Wait Pengukuran Survey", grup: "delay", perDay: 30 },
    { code: "D02", label: "Refueling", grup: "delay", perDay: 0 },
    { code: "D27", label: "Friday Pray", grup: "delay", perWeek: 60 },
    { code: "D28", label: "General Safety Talk", grup: "delay", perWeek: 5 },
  ],
  TARGETS: { PC400: { bcm: 200, rit: 16 }, PC300: { bcm: 200, rit: 16 }, PC200: { bcm: 70, rit: 0 } },

  // Akun terdaftar (mode lokal): NRP -> { pw, nama }.
  // NRP tak terdaftar memakai password default "admin" (nama = NRP).
  // CATATAN KEAMANAN: file ini publik di GitHub — password di sini bisa dilihat siapa saja.
  ACCOUNTS: {
    "13250057": { pw: "Dev", nama: "Muh Taufik Hidayat" },
  },
};
