/* ============================================================
   STORE (Lapisan Data) — model baru
   ------------------------------------------------------------
   Struktur:
   - loaders : 1 baris per Loader per shift (tanggal, shift, loader, area, pit, GL...)
   - haulers : fleet di dalam loader (hauler, material, disposal, distance, rit{jam:nilai})
   - losses  : problem/idle/delay per loader per jam (type, category, duration, remark)
   Dua adapter: LocalAdapter (localStorage) & SupabaseAdapter (online).
   ============================================================ */
(function () {
  const CFG = window.APP_CONFIG;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ---- SHA-256 mandiri (FIPS 180-4) ----
     Tidak bergantung pada crypto.subtle, yang absen pada konteks tak aman
     seperti file://. Dipakai untuk menyimpan sidik password. */
  const SHA_K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ];
  function utf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        const c2 = str.charCodeAt(++i);
        c = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
        out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function sha256Hex(pesan) {
    const b = utf8Bytes(String(pesan));
    const bitLen = b.length * 8;
    b.push(0x80);
    while (b.length % 64 !== 56) b.push(0);
    // panjang 64-bit big-endian; pesan di sini jauh di bawah 2^32 bit
    b.push(0, 0, 0, 0, (bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);

    let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,
        h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
    const w = new Array(64);
    const rr = (x, n) => (x >>> n) | (x << (32 - n));

    for (let i = 0; i < b.length; i += 64) {
      for (let t = 0; t < 16; t++) {
        w[t] = ((b[i+t*4] << 24) | (b[i+t*4+1] << 16) | (b[i+t*4+2] << 8) | b[i+t*4+3]) >>> 0;
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rr(w[t-15],7) ^ rr(w[t-15],18) ^ (w[t-15] >>> 3);
        const s1 = rr(w[t-2],17) ^ rr(w[t-2],19) ^ (w[t-2] >>> 10);
        w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
      }
      let a=h0,bb=h1,c=h2,d=h3,e=h4,f=h5,g=h6,hh=h7;
      for (let t = 0; t < 64; t++) {
        const S1 = rr(e,6) ^ rr(e,11) ^ rr(e,25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + SHA_K[t] + w[t]) >>> 0;
        const S0 = rr(a,2) ^ rr(a,13) ^ rr(a,22);
        const maj = (a & bb) ^ (a & c) ^ (bb & c);
        const t2 = (S0 + maj) >>> 0;
        hh=g; g=f; f=e; e=(d + t1) >>> 0; d=c; c=bb; bb=a; a=(t1 + t2) >>> 0;
      }
      h0=(h0+a)>>>0; h1=(h1+bb)>>>0; h2=(h2+c)>>>0; h3=(h3+d)>>>0;
      h4=(h4+e)>>>0; h5=(h5+f)>>>0; h6=(h6+g)>>>0; h7=(h7+hh)>>>0;
    }
    return [h0,h1,h2,h3,h4,h5,h6,h7].map((x) => x.toString(16).padStart(8, "0")).join("");
  }
  // Angka acak: pakai crypto bila ada, jatuh ke Math.random bila tidak.
  function acakHex(n) {
    const a = new Uint8Array(n);
    try { (window.crypto || {}).getRandomValues(a); }
    catch (_) { for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256); }
    if (!a.some((x) => x)) for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    return Array.from(a).map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  window.__ccrSha256 = sha256Hex; // dipakai uji untuk memverifikasi vektor resmi

  // Delay yang terisi otomatis (Masalah 4). Menit paten 60'.
  function autoLossesFor(shift) {
    const meal = shift === "2" ? "00.00" : "12.00";
    const chg = shift === "2" ? "06.00" : "18.00";
    return [
      { jam: meal, type: "delay", category: "Meal & Break", duration: 60, remark: "", auto: true },
      { jam: chg, type: "delay", category: "Change Shift", duration: 60, remark: "", auto: true },
    ];
  }

  /* ================= LOCAL ADAPTER ================= */
  const LocalAdapter = {
    key: "hpr_data_v2",
    _load() {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw);
      const init = { master: JSON.parse(JSON.stringify(window.SEED)), loaders: [], haulers: [], losses: [], session: null };
      localStorage.setItem(this.key, JSON.stringify(init));
      return init;
    },
    _save(db) { localStorage.setItem(this.key, JSON.stringify(db)); },
    async init() { this._load(); },

    // --- auth ---
    // ---- Kredensial ----
    // Password TIDAK pernah disimpan, dan tidak ada di repositori. Yang disimpan
    // hanya sidik SHA-256 bergaram, milik peramban ini saja.
    akunKey: "ccr_akun",
    _akun() {
      try { return JSON.parse(localStorage.getItem(this.akunKey) || "null"); } catch (_) { return null; }
    },
    async _sidik(password, garam) {
      // 5.000 putaran: menaikkan biaya tebak-paksa tanpa terasa saat login.
      let x = sha256Hex(garam + "\u0000" + password);
      for (let i = 0; i < 5000; i++) x = sha256Hex(x + garam);
      return x;
    },
    async adaAkun() { const a = this._akun(); return !!(a && a.sidik); },
    async daftarAkun(nrp, password, nama) {
      if (!nrp) throw new Error("NRP wajib diisi");
      if (!password || password.length < 4) throw new Error("Password minimal 4 karakter");
      const garam = acakHex(16);
      const sidik = await this._sidik(password, garam);
      localStorage.setItem(this.akunKey, JSON.stringify({ nrp: String(nrp), nama: nama || String(nrp), garam, sidik }));
      const db = this._load();
      db.session = { nrp: String(nrp), nama: nama || String(nrp), at: Date.now() };
      this._save(db);
      return db.session;
    },
    async gantiPassword(lama, baru) {
      const a = this._akun();
      if (!a) throw new Error("Belum ada akun di peramban ini");
      if ((await this._sidik(lama, a.garam)) !== a.sidik) throw new Error("Password lama salah");
      if (!baru || baru.length < 4) throw new Error("Password baru minimal 4 karakter");
      const garam = acakHex(16);
      localStorage.setItem(this.akunKey, JSON.stringify({ ...a, garam, sidik: await this._sidik(baru, garam) }));
      return true;
    },
    async signIn(nrp, password) {
      if (!nrp) throw new Error("NRP wajib diisi");
      const a = this._akun();
      if (!a || !a.sidik) throw new Error("Belum ada akun di peramban ini — buat password dulu");
      if (String(nrp) !== String(a.nrp)) throw new Error("NRP tidak dikenal di peramban ini");
      if ((await this._sidik(password, a.garam)) !== a.sidik) throw new Error("Password salah");
      const db = this._load();
      db.session = { nrp: a.nrp, nama: a.nama, at: Date.now() };
      this._save(db);
      return db.session;
    },
    async signOut() { const db = this._load(); db.session = null; this._save(db); },
    async currentUser() { return this._load().session; },

    // --- master ---
    async getMaster() { return this._load().master; },
    async saveMaster(master) { const db = this._load(); db.master = master; this._save(db); },

    // --- loaders ---
    async listLoaders(tanggal, shift) {
      const db = this._load();
      return db.loaders.filter((l) => l.tanggal === tanggal && String(l.shift) === String(shift))
        .sort((a, b) => a.loader.localeCompare(b.loader));
    },
    async getLoader(id) { return this._load().loaders.find((l) => l.id === id) || null; },
    async createLoader(data) {
      const db = this._load();
      const row = { id: uid(), created_at: Date.now(), ...data };
      db.loaders.push(row);
      autoLossesFor(String(data.shift)).forEach((x) => db.losses.push({ id: uid(), loader_id: row.id, created_at: Date.now(), ...x }));
      this._save(db); return row;
    },
    async updateLoader(id, data) {
      const db = this._load(); const i = db.loaders.findIndex((l) => l.id === id);
      if (i >= 0) { db.loaders[i] = { ...db.loaders[i], ...data }; this._save(db); return db.loaders[i]; } return null;
    },
    async deleteLoader(id) {
      const db = this._load();
      db.loaders = db.loaders.filter((l) => l.id !== id);
      db.haulers = db.haulers.filter((h) => h.loader_id !== id);
      db.losses = db.losses.filter((x) => x.loader_id !== id);
      this._save(db);
    },
    // --- haulers (fleet) ---
    async listHaulers(loaderId) { return this._load().haulers.filter((h) => h.loader_id === loaderId).sort((a, b) => a.created_at - b.created_at); },
    async createHauler(data) { const db = this._load(); const row = { id: uid(), rit: {}, created_at: Date.now(), ...data }; db.haulers.push(row); this._save(db); return row; },
    async createHaulersBulk(loaderId, names, common) {
      const db = this._load(); const out = [];
      names.forEach((nm) => { const row = { id: uid(), loader_id: loaderId, hauler: nm, material: common.material, grade: common.grade, disposal: common.disposal, distance: common.distance, rit: {}, created_at: Date.now() }; db.haulers.push(row); out.push(row); });
      this._save(db); return out;
    },
    async updateHauler(id, data) { const db = this._load(); const i = db.haulers.findIndex((h) => h.id === id); if (i >= 0) { db.haulers[i] = { ...db.haulers[i], ...data }; this._save(db); return db.haulers[i]; } return null; },
    async deleteHauler(id) { const db = this._load(); db.haulers = db.haulers.filter((h) => h.id !== id); this._save(db); },
    async setRit(haulerId, jam, value) {
      const db = this._load(); const h = db.haulers.find((x) => x.id === haulerId); if (!h) return;
      h.rit = h.rit || {}; const v = parseFloat(value);
      if (!value || isNaN(v) || v === 0) delete h.rit[jam]; else h.rit[jam] = v;
      this._save(db);
    },

    // --- losses ---
    async listLosses(loaderId) { return this._load().losses.filter((x) => x.loader_id === loaderId); },
    async createLoss(data) { const db = this._load(); const row = { id: uid(), created_at: Date.now(), ...data }; db.losses.push(row); this._save(db); return row; },
    async updateLoss(id, data) { const db = this._load(); const i = db.losses.findIndex((x) => x.id === id); if (i >= 0) { db.losses[i] = { ...db.losses[i], ...data }; this._save(db); return db.losses[i]; } return null; },
    async deleteLoss(id) { const db = this._load(); db.losses = db.losses.filter((x) => x.id !== id); this._save(db); },

    async listAll(tanggal, shift) {
      const db = this._load();
      const loaders = await this.listLoaders(tanggal, shift);
      const ids = new Set(loaders.map((l) => l.id));
      return { loaders, haulers: db.haulers.filter((h) => ids.has(h.loader_id)), losses: db.losses.filter((x) => ids.has(x.loader_id)) };
    },
    // Rentang tanggal (untuk Laporan Produksi). shift "" = semua shift.
    async listRange(dari, sampai, shift) {
      const db = this._load();
      const loaders = db.loaders.filter((l) => l.tanggal >= dari && l.tanggal <= sampai && (!shift || String(l.shift) === String(shift)));
      const ids = new Set(loaders.map((l) => l.id));
      return { loaders, haulers: db.haulers.filter((h) => ids.has(h.loader_id)), losses: db.losses.filter((x) => ids.has(x.loader_id)) };
    },
    // ---- Cadangan penuh: seluruh isi basis data apa adanya ----
    async dumpAll() {
      const db = this._load();
      return { master: db.master, loaders: db.loaders, haulers: db.haulers, losses: db.losses };
    },
    async restoreAll(data) {
      const db = this._load();
      if (data.master) db.master = data.master;
      db.loaders = Array.isArray(data.loaders) ? data.loaders : [];
      db.haulers = Array.isArray(data.haulers) ? data.haulers : [];
      db.losses = Array.isArray(data.losses) ? data.losses : [];
      this._save(db);
      return { loaders: db.loaders.length, haulers: db.haulers.length, losses: db.losses.length };
    },
    // Hapus SEMUA data ritase (master & sesi tetap).
    async clearAll() {
      const db = this._load();
      const n = db.loaders.length; db.loaders = []; db.haulers = []; db.losses = [];
      this._save(db); return n;
    },
    // Import massal hasil parsing file. Struktur: {loaders:[{_k,...}], haulers:[{_lk,...}], losses:[{_lk,...}]}
    async importBulk(pack) {
      const db = this._load();
      const idOf = {};
      pack.loaders.forEach((l) => { const row = { id: uid(), created_at: Date.now(), ...l }; delete row._k; idOf[l._k] = row.id; db.loaders.push(row); });
      pack.haulers.forEach((h) => { const lid = idOf[h._lk]; if (!lid) return; const row = { id: uid(), loader_id: lid, created_at: Date.now(), ...h }; delete row._lk; db.haulers.push(row); });
      pack.losses.forEach((x) => { const lid = idOf[x._lk]; if (!lid) return; const row = { id: uid(), loader_id: lid, created_at: Date.now(), ...x }; delete row._lk; db.losses.push(row); });
      this._save(db);
      return { loaders: pack.loaders.length, haulers: pack.haulers.length, losses: pack.losses.length };
    },
  };

  /* ================= SUPABASE ADAPTER ================= */
  const SupabaseAdapter = {
    sb: null,
    async init() {
      if (!window.supabase) throw new Error("Library Supabase belum termuat (cek internet).");
      if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) throw new Error("SUPABASE_URL / ANON_KEY belum diisi di config.js");
      this.sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    },
    // Pada mode Supabase, akun dikelola Supabase Auth — bukan di peramban.
    async adaAkun() { return true; },
    async daftarAkun() { throw new Error("Pada mode Supabase, akun dibuat lewat Supabase Auth"); },
    async gantiPassword(lama, baru) {
      const { error } = await this.sb.auth.updateUser({ password: baru });
      if (error) throw new Error(error.message);
      return true;
    },
    async signIn(nrp, password) {
      const email = `${String(nrp).toLowerCase()}@hpr.local`;
      const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return { nrp, nama: nrp, id: data.user.id };
    },
    async signOut() { await this.sb.auth.signOut(); },
    async currentUser() { const { data } = await this.sb.auth.getUser(); if (!data || !data.user) return null; const nrp = (data.user.email || "").split("@")[0]; return { nrp, nama: nrp, id: data.user.id }; },
    async getMaster() { const { data } = await this.sb.from("app_master").select("data").eq("id", 1).single(); return (data && data.data) || JSON.parse(JSON.stringify(window.SEED)); },
    async saveMaster(master) { await this.sb.from("app_master").upsert({ id: 1, data: master }); },

    async listLoaders(tanggal, shift) { const { data, error } = await this.sb.from("loaders").select("*").eq("tanggal", tanggal).eq("shift", String(shift)).order("loader"); if (error) throw new Error(error.message); return data || []; },
    async getLoader(id) { const { data } = await this.sb.from("loaders").select("*").eq("id", id).single(); return data || null; },
    async createLoader(data) {
      const { data: row, error } = await this.sb.from("loaders").insert(data).select().single();
      if (error) throw new Error(error.message);
      const losses = autoLossesFor(String(data.shift)).map((x) => ({ loader_id: row.id, ...x }));
      await this.sb.from("losses").insert(losses);
      return row;
    },
    async updateLoader(id, data) { const { data: row } = await this.sb.from("loaders").update(data).eq("id", id).select().single(); return row; },
    async deleteLoader(id) { await this.sb.from("haulers").delete().eq("loader_id", id); await this.sb.from("losses").delete().eq("loader_id", id); await this.sb.from("loaders").delete().eq("id", id); },
    async listHaulers(loaderId) { const { data } = await this.sb.from("haulers").select("*").eq("loader_id", loaderId).order("created_at"); return data || []; },
    async createHauler(data) { const { data: row, error } = await this.sb.from("haulers").insert({ rit: {}, ...data }).select().single(); if (error) throw new Error(error.message); return row; },
    async createHaulersBulk(loaderId, names, common) {
      const rows = names.map((nm) => ({ loader_id: loaderId, hauler: nm, material: common.material, grade: common.grade, disposal: common.disposal, distance: common.distance, rit: {} }));
      const { data } = await this.sb.from("haulers").insert(rows).select(); return data || [];
    },
    async updateHauler(id, data) { const { data: row } = await this.sb.from("haulers").update(data).eq("id", id).select().single(); return row; },
    async deleteHauler(id) { await this.sb.from("haulers").delete().eq("id", id); },
    async setRit(haulerId, jam, value) {
      const { data: h } = await this.sb.from("haulers").select("rit").eq("id", haulerId).single();
      const rit = (h && h.rit) || {}; const v = parseFloat(value);
      if (!value || isNaN(v) || v === 0) delete rit[jam]; else rit[jam] = v;
      await this.sb.from("haulers").update({ rit }).eq("id", haulerId);
    },
    async listLosses(loaderId) { const { data } = await this.sb.from("losses").select("*").eq("loader_id", loaderId); return data || []; },
    async createLoss(data) { const { data: row, error } = await this.sb.from("losses").insert(data).select().single(); if (error) throw new Error(error.message); return row; },
    async updateLoss(id, data) { const { data: row } = await this.sb.from("losses").update(data).eq("id", id).select().single(); return row; },
    async deleteLoss(id) { await this.sb.from("losses").delete().eq("id", id); },
    async listAll(tanggal, shift) {
      const loaders = await this.listLoaders(tanggal, shift);
      const ids = loaders.map((l) => l.id);
      let haulers = [], losses = [];
      if (ids.length) {
        haulers = (await this.sb.from("haulers").select("*").in("loader_id", ids)).data || [];
        losses = (await this.sb.from("losses").select("*").in("loader_id", ids)).data || [];
      }
      return { loaders, haulers, losses };
    },
    // Rentang tanggal (untuk Laporan Produksi). shift "" = semua shift.
    async listRange(dari, sampai, shift) {
      let qy = this.sb.from("loaders").select("*").gte("tanggal", dari).lte("tanggal", sampai);
      if (shift) qy = qy.eq("shift", String(shift));
      const { data, error } = await qy.order("tanggal").order("loader");
      if (error) throw new Error(error.message);
      const loaders = data || [], ids = loaders.map((l) => l.id);
      let haulers = [], losses = [];
      if (ids.length) {
        haulers = (await this.sb.from("haulers").select("*").in("loader_id", ids)).data || [];
        losses = (await this.sb.from("losses").select("*").in("loader_id", ids)).data || [];
      }
      return { loaders, haulers, losses };
    },
    async dumpAll() {
      const master = await this.getMaster();
      const loaders = (await this.sb.from("loaders").select("*")).data || [];
      const haulers = (await this.sb.from("haulers").select("*")).data || [];
      const losses = (await this.sb.from("losses").select("*")).data || [];
      return { master, loaders, haulers, losses };
    },
    async restoreAll(data) {
      if (data.master) await this.saveMaster(data.master);
      await this.clearAll();
      const sisip = async (tabel, baris) => {
        for (let i = 0; i < baris.length; i += 500) {
          const { error } = await this.sb.from(tabel).insert(baris.slice(i, i + 500));
          if (error) throw new Error(tabel + ": " + error.message);
        }
      };
      // urutan wajib: induk dulu, sebab haulers & losses mengacu ke loader_id
      await sisip("loaders", Array.isArray(data.loaders) ? data.loaders : []);
      await sisip("haulers", Array.isArray(data.haulers) ? data.haulers : []);
      await sisip("losses", Array.isArray(data.losses) ? data.losses : []);
      return {
        loaders: (data.loaders || []).length,
        haulers: (data.haulers || []).length,
        losses: (data.losses || []).length,
      };
    },
    async clearAll() {
      const { count } = await this.sb.from("loaders").select("*", { count: "exact", head: true });
      await this.sb.from("losses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await this.sb.from("haulers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await this.sb.from("loaders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      return count || 0;
    },
    async importBulk(pack) {
      const idOf = {};
      // loaders (batch 500)
      for (let i = 0; i < pack.loaders.length; i += 500) {
        const chunk = pack.loaders.slice(i, i + 500);
        const rows = chunk.map((l) => { const r = { ...l }; delete r._k; return r; });
        const { data, error } = await this.sb.from("loaders").insert(rows).select("id");
        if (error) throw new Error(error.message);
        (data || []).forEach((row, k) => { idOf[chunk[k]._k] = row.id; });
      }
      const push = async (table, arr) => {
        const rows = arr.map((o) => { const lid = idOf[o._lk]; if (!lid) return null; const r = { loader_id: lid, ...o }; delete r._lk; return r; }).filter(Boolean);
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await this.sb.from(table).insert(rows.slice(i, i + 500));
          if (error) throw new Error(error.message);
        }
      };
      await push("haulers", pack.haulers);
      await push("losses", pack.losses);
      return { loaders: pack.loaders.length, haulers: pack.haulers.length, losses: pack.losses.length };
    },
  };

  const Store = CFG.APP_MODE === "supabase" ? SupabaseAdapter : LocalAdapter;
  Store.mode = CFG.APP_MODE;
  window.Store = Store;
})();
