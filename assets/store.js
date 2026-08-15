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
    async signIn(nrp, password) {
      if (!nrp) throw new Error("NRP wajib diisi");
      if (password !== "admin") throw new Error("Password salah (default: admin)");
      const db = this._load(); db.session = { nrp, nama: nrp, at: Date.now() }; this._save(db); return db.session;
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
  };

  /* ================= SUPABASE ADAPTER ================= */
  const SupabaseAdapter = {
    sb: null,
    async init() {
      if (!window.supabase) throw new Error("Library Supabase belum termuat (cek internet).");
      if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) throw new Error("SUPABASE_URL / ANON_KEY belum diisi di config.js");
      this.sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
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
  };

  const Store = CFG.APP_MODE === "supabase" ? SupabaseAdapter : LocalAdapter;
  Store.mode = CFG.APP_MODE;
  window.Store = Store;
})();
