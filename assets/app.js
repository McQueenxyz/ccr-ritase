/* ============================================================
   APP — model baru: Loader → Fleet(Hauler) → Grid Ritase → Loss
   ============================================================ */
(function () {
  const CFG = window.APP_CONFIG;
  const app = document.getElementById("app");
  const state = { user: null, master: null, tanggal: todayISO(), shift: "1", detailTab: "fleet" };

  /* ---------- util ---------- */
  function todayISO() { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
  function fmtID(iso) { if (!iso) return ""; const [y, m, dd] = iso.split("-"); return `${dd}/${m}/${y}`; }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  const perRit = () => num(CFG.VOLUME_PER_RIT) || 1;

  // --- Master pengawas & nomor lambung (fallback ke SEED bila master lama belum punya) ---
  const pengawasList = () => (state.master && state.master.pengawas) || window.SEED.pengawas || [];
  const lambungList = () => (state.master && state.master.haulers_master) || window.SEED.haulers_master || [];
  const onlyDigits = (s) => String(s == null ? "" : s).replace(/\D/g, "");
  const pengawasNrp = (nama) => { const p = pengawasList().find((x) => x.nama.toLowerCase() === String(nama || "").trim().toLowerCase()); return p ? p.nrp : (/^\d+$/.test(String(nama || "").trim()) ? String(nama).trim() : ""); };
  const pengawasNama = (nrp) => { const p = pengawasList().find((x) => x.nrp === String(nrp || "").trim()); return p ? p.nama : ""; };
  // Kode SS6: pakai kode dari Data Master dulu (bisa diedit user), fallback ke tabel bawaan.
  function resolveCode(type, label) {
    const m = state.master || {};
    const map = type === "problem" ? m.problem_codes : type === "idle" ? m.idle_codes : m.delay_codes;
    const c = map && map[label];
    if (c) return { code: c, desc: label };
    return window.SS6_CODES ? window.SS6_CODES.codeFor(type, label) : { code: "", desc: "" };
  }
  // Ketik 3-4 angka terakhir → nomor lambung penuh. Kembalikan input asli bila tak unik/tak cocok.
  function resolveLambung(input) {
    const t = String(input == null ? "" : input).trim();
    if (!t) return "";
    const list = lambungList();
    const exact = list.find((u) => u.lambung.toUpperCase() === t.toUpperCase());
    if (exact) return exact.lambung;
    const d = onlyDigits(t);
    if (d.length >= 3) {
      const hits = list.filter((u) => onlyDigits(u.lambung).endsWith(d));
      if (hits.length === 1) return hits[0].lambung;
    }
    return t.toUpperCase();
  }
  const jamListFor = (shift) => (String(shift) === "2" ? state.master.jam_shift2 : state.master.jam_shift1);
  function optionList(arr, sel) { return arr.map((v) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(v)}</option>`).join(""); }
  function toast(msg) { let t = document.querySelector(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); } t.textContent = msg; t.classList.add("show"); clearTimeout(t._to); t._to = setTimeout(() => t.classList.remove("show"), 2200); }

  /* ---------- ikon Heroicons (garis, stroke 1.5) + brand (fill) ---------- */
  const ICONS = {
    truck: '<path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>',
    back: '<path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/>',
    next: '<path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/>',
    menu: '<path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>',
    close: '<path d="M6 18 18 6M6 6l12 12"/>',
    add: '<path d="M12 4.5v15m7.5-7.5h-15"/>',
    logout: '<path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"/>',
    moon: '<path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"/>',
    sun: '<path d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/>',
    form: '<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>',
    chat: '<path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/>',
    settings: '<path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"/><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>',
    person: '<path d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>',
    edit: '<path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/>',
    delete: '<path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>',
    copy: '<path d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"/>',
    send: '<path d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/>',
    download: '<path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>',
    save: '<path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
    rocket: '<path d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.63 8.41m5.96 5.96a14.9 14.9 0 0 1-5.84 2.58m-.12-8.54a6 6 0 0 0-7.38 5.84h4.8m2.58-5.84a14.93 14.93 0 0 0-2.58 5.84m2.7 2.7c-.1.02-.21.04-.31.06a15.1 15.1 0 0 1-2.45-2.45 14.9 14.9 0 0 1 .06-.31m-2.24 2.39a4.49 4.49 0 0 0-1.76 4.3 4.49 4.49 0 0 0 4.31-1.75M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/>',
    mail: '<path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/>',
    grid: '<path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"/>',
    clock: '<path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
    box: '<path d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>',
    mineral: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
    alert: '<path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>',
    whatsapp: '<path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>',
    instagram: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>',
    x: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
    threads: '<path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 8.132c.976-1.45 2.56-2.774 5.117-2.774h.043c4.267.024 6.786 2.665 7.007 7.234.126.083.25.17.372.263 1.383 1.038 2.377 2.457 2.786 4.088.606 2.409-.079 4.998-1.807 6.804-1.844 1.83-4.155 2.65-7.062 2.663z"/>',
    facebook: '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',
    linkedin: '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>',
    youtube: '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
    behance: '<path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14h-8.027c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988h-6.466v-14.967h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zm-3.466-8.988h3.584c2.508 0 2.906-3-.312-3h-3.272v3zm3.391 3h-3.391v3.016h3.341c3.055 0 2.868-3.016.05-3.016z"/>',
  };
  const LOGO_SVG = "<svg class=\"ic logo-svg\" viewBox=\"331 524 1370 951\" xmlns=\"http://www.w3.org/2000/svg\" aria-label=\"CCR\"><path d=\"M0 0 C0 77.88 0 155.76 0 236 C-7.92 236.33 -15.84 236.66 -24 237 C-28.96611065 237.70415002 -33.70979446 238.40962304 -38.57910156 239.47265625 C-40.35457722 239.8594077 -42.13305166 240.23245981 -43.91308594 240.59765625 C-59.21317662 243.74338127 -73.65750989 247.78984965 -88 254 C-88.81017578 254.34933594 -89.62035156 254.69867187 -90.45507812 255.05859375 C-124.87534012 270.12953445 -156.4609542 294.10851708 -178.83886719 324.42871094 C-179.92143281 325.8936799 -181.02630542 327.34209171 -182.1328125 328.7890625 C-213.03129819 369.86587289 -230.52475529 425.94152233 -223.50830078 477.13476562 C-221.6387695 490.2667597 -219.26233056 503.09825041 -214.83007812 515.63671875 C-213.946514 518.1522778 -213.12154271 520.68331564 -212.296875 523.21875 C-205.94280072 542.20929111 -196.94173022 560.86252673 -185 577 C-184.30777344 577.96164062 -183.61554688 578.92328125 -182.90234375 579.9140625 C-169.27197427 598.52059861 -153.67599369 615.38510049 -135 629 C-134.00226563 629.7425 -133.00453125 630.485 -131.9765625 631.25 C-92.71982589 659.50677699 -48.89219593 671.91773061 -1 674 C-1 599.42 -1 524.84 -1 448 C20.04617961 448 39.07565643 448.63134095 59.57641602 451.79150391 C62.53187589 452.24529784 65.48932375 452.68380925 68.44726562 453.12109375 C81.79286827 455.1327114 94.88617546 457.8201126 108 461 C108.68003082 461.16274414 109.36006165 461.32548828 110.06069946 461.49316406 C113.92492441 462.41835578 117.77763973 463.3821426 121.625 464.375 C122.74600098 464.66318604 123.86700195 464.95137207 125.02197266 465.24829102 C133.11347235 467.38026934 140.99977634 469.89699519 148.82275391 472.86669922 C154.25591355 474.99992946 154.25591355 474.99992946 160 475 C161.70007698 473.80144964 161.70007698 473.80144964 163.0625 471.9375 C163.65804687 471.20015625 164.25359375 470.4628125 164.8671875 469.703125 C165.57101562 468.81109375 166.27484375 467.9190625 167 467 C167.89598251 465.93023069 168.79460047 464.86266526 169.6953125 463.796875 C187.09926089 442.9647885 200.17537199 418.90103942 209.17285156 393.34521484 C209.91568907 391.23904687 210.68382112 389.14446857 211.4609375 387.05078125 C222.32133301 356.60876353 224.82331803 321.82710562 220 290 C219.87882812 288.84371094 219.75765625 287.68742187 219.6328125 286.49609375 C214.98165728 243.25933455 193.8021632 201.07613345 165.11328125 168.8828125 C161 164.26136364 161 164.26136364 161 161 C162.2578125 159.66796875 162.2578125 159.66796875 164.125 158.1875 C168.32923856 154.67898063 172.15972498 150.89490271 176 147 C180.14419664 142.81074594 184.30925067 138.77321926 188.8125 134.96875 C191.99820751 132.10161324 194.98584758 129.04568121 198 126 C202.14508331 121.81155808 206.30916359 117.77329283 210.8125 113.96875 C213.99820751 111.10161324 216.98584758 108.04568121 220 105 C224.14508331 100.81155808 228.30916359 96.77329283 232.8125 92.96875 C235.99820751 90.10161324 238.98584758 87.04568121 242 84 C246.14508331 79.81155808 250.30916359 75.77329283 254.8125 71.96875 C258.65296637 68.51233027 262.23154622 64.78697405 265.86499023 61.11547852 C269.41457818 57.54301767 273.03157879 54.15395599 276.87890625 50.90234375 C280.43066171 47.71688351 283.74880752 44.2922635 287.08227539 40.88061523 C289.91698702 38.00017536 292.81078555 35.26136937 295.875 32.625 C300.30558848 28.79646278 304.39891705 24.67578391 308.5 20.5 C315.6546493 13.21502922 323.12681065 6.49538122 331 0 C337.58426227 6.38372636 343.90117329 12.79142982 349.609375 19.98828125 C351.36522452 22.20030736 353.14082203 24.37827354 354.953125 26.54296875 C363.61107961 36.9317179 371.4286538 47.79933802 379 59 C379.47646973 59.7017334 379.95293945 60.4034668 380.44384766 61.12646484 C410.58869841 105.78510125 434.266495 157.21797114 446 210 C446.26619141 211.17046875 446.53238281 212.3409375 446.80664062 213.546875 C451.5588773 234.56871752 454.87939747 255.5516601 457 277 C457.08588379 277.78628784 457.17176758 278.57257568 457.26025391 279.38269043 C458.04708622 287.06452865 458.17763047 294.69592519 458.203125 302.4140625 C458.20595238 303.0898875 458.20877975 303.76571251 458.21169281 304.46201706 C458.22658845 308.05052816 458.23587416 311.63900018 458.24023438 315.22753906 C458.24458489 318.13424467 458.25835611 321.04064773 458.28125 323.94726562 C458.42193118 342.19081011 457.69978261 359.91370666 455 378 C454.79155105 379.50424975 454.5851554 381.00878627 454.38134766 382.51367188 C450.80123938 408.59469098 445.19980401 433.97054278 437 459 C436.66629395 460.02561035 436.33258789 461.0512207 435.98876953 462.10791016 C430.51765615 478.7865164 424.11797125 494.9583754 417 511 C416.64583008 511.80228027 416.29166016 512.60456055 415.92675781 513.43115234 C403.91758774 540.4189241 388.53418244 566.25543753 371 590 C370.20601807 591.07797852 370.20601807 591.07797852 369.39599609 592.17773438 C364.41674936 598.91987546 359.4161737 605.60085466 354 612 C355.70226208 616.03792399 358.48280561 619.16229132 361.25 622.5 C426.85585301 703.15454064 461 806.68064654 461 910 C383.12 910 305.24 910 225 910 C224.67 902.41 224.34 894.82 224 887 C223.5346967 882.89340012 223.05552808 878.97553284 222.3125 874.9375 C222.13952393 873.95692627 221.96654785 872.97635254 221.78833008 871.96606445 C210.63643418 811.53451734 177.04547438 758.88159149 126.453125 723.984375 C104.76335062 709.29130203 80.51052095 697.70296977 54.890625 691.8984375 C52.38585617 691.32002703 49.89344723 690.68349692 47.421875 689.9765625 C31.55920565 685.63554393 17.05191425 685.50458067 0 684 C0 758.58 0 833.16 0 910 C-18.53675352 910 -35.47138436 909.89788647 -53.609375 907.44873047 C-57.04862757 906.99356441 -60.49115029 906.58895078 -63.9375 906.19140625 C-143.80454783 896.58930151 -220.95607156 861.88510051 -284.04052734 812.52587891 C-285.89790967 811.0794997 -287.76834059 809.65232145 -289.64453125 808.23046875 C-297.33204557 802.36303463 -304.43604624 796.03653988 -311.4296875 789.359375 C-313.86021307 787.04420439 -316.34410046 784.81631691 -318.88671875 782.625 C-323.4229011 778.68401379 -327.69165335 774.49991918 -331.9375 770.25 C-332.73019287 769.45722656 -333.52288574 768.66445312 -334.33959961 767.84765625 C-339.23837977 762.90096256 -343.80542211 757.89201695 -348.08984375 752.40234375 C-349.99833214 750.00209761 -352.02403672 747.79501531 -354.125 745.5625 C-378.72538171 718.47636543 -397.72856117 685.53317206 -414 653 C-414.49773926 652.01773438 -414.99547852 651.03546875 -415.50830078 650.0234375 C-423.54347188 634.12283315 -429.99292025 617.76267781 -436 601 C-436.60739014 599.32164062 -436.60739014 599.32164062 -437.22705078 597.609375 C-450.63039699 560.2592332 -458.67017327 520.62253503 -461 481 C-461.08241943 479.72987061 -461.08241943 479.72987061 -461.16650391 478.43408203 C-461.82402722 468.28417204 -462.2144954 458.17321034 -462 448 C-461.99274902 447.23880859 -461.98549805 446.47761719 -461.97802734 445.69335938 C-461.67905324 419.52552418 -458.32649456 392.59690951 -452.47070312 367.08154297 C-451.98784566 364.94625107 -451.54488533 362.80557223 -451.109375 360.66015625 C-434.82239504 281.74106014 -394.07575352 208.1910275 -340 149 C-339.10395069 148.01061222 -338.20812723 147.02101987 -337.3125 146.03125 C-329.96947069 137.9386705 -322.51707593 130.04321687 -314.20703125 122.9296875 C-312.05434215 121.04751332 -309.96426041 119.10745322 -307.87768555 117.15258789 C-301.51034289 111.20938991 -294.83875099 105.79994262 -287.93212891 100.49951172 C-285.90891416 98.92930892 -283.91224181 97.32942765 -281.91796875 95.72265625 C-270.14420932 86.29615035 -257.76640147 78.0189868 -245 70 C-244.30841797 69.56349121 -243.61683594 69.12698242 -242.90429688 68.67724609 C-213.25906116 50.07493862 -181.77270146 35.99319226 -149 24 C-147.62569824 23.49146484 -147.62569824 23.49146484 -146.22363281 22.97265625 C-131.19348973 17.45630775 -115.54153959 13.77031814 -100 10 C-99.10120117 9.78069824 -98.20240234 9.56139648 -97.27636719 9.33544922 C-81.72964233 5.63800716 -65.7401036 4.0110464 -49.90234375 2.05078125 C-48.80314857 1.91355652 -48.80314857 1.91355652 -47.68174744 1.77355957 C-31.53325701 -0.194719 -16.60062048 0 0 0 Z \" fill=\"currentColor\" transform=\"translate(1220,545)\"/> <path d=\"M0 0 C0 77.88 0 155.76 0 236 C-7.59 236.33 -15.18 236.66 -23 237 C-27.08621773 237.46542784 -30.98265202 237.94472766 -35 238.6875 C-36.4691687 238.94805176 -36.4691687 238.94805176 -37.96801758 239.21386719 C-79.88502482 246.95404262 -119.11454478 264.74399042 -150.60546875 293.79296875 C-152.21366789 295.27524039 -153.84183582 296.73611075 -155.48828125 298.17578125 C-191.36640589 329.59006457 -214.95306283 377.20253934 -222.63574219 423.85253906 C-222.9087521 425.46205328 -223.20494468 427.06766421 -223.51269531 428.67089844 C-224.92213346 436.31817199 -225.38567165 443.72996856 -225.375 451.5 C-225.37258301 453.37002686 -225.37258301 453.37002686 -225.37011719 455.27783203 C-225.1339433 473.70634128 -222.65506049 492.41892087 -217 510 C-216.75910645 510.77827148 -216.51821289 511.55654297 -216.27001953 512.35839844 C-197.66361048 572.35922519 -158.32029502 619.53663018 -103 649.0625 C-80.53843257 660.74132525 -55.98477879 669.0219385 -30.73046875 671.67578125 C-28 672 -28 672 -25 673 C-16.75 673.33 -8.5 673.66 0 674 C0 751.88 0 829.76 0 910 C-39.323199 910 -39.323199 910 -54.3125 907.75 C-55.96986808 907.51821176 -57.6274248 907.28776876 -59.28515625 907.05859375 C-70.10188987 905.53824463 -80.88201776 903.82923416 -91.56152344 901.52246094 C-94.26840494 900.94249233 -96.98125349 900.39691505 -99.6953125 899.8515625 C-111.3843158 897.45918359 -122.6757676 894.44979045 -133.98681641 890.66259766 C-136.74416665 889.75507297 -139.52741991 888.94286957 -142.3125 888.125 C-214.42306298 865.80506384 -277.79160929 824.01571408 -331.07382202 771.10140991 C-332.17420977 770.00907598 -333.27607247 768.91822547 -334.37954712 767.82901001 C-341.40239387 760.88732746 -347.84413583 753.73755729 -354 746 C-354.93471331 744.89811566 -355.87606395 743.80177421 -356.828125 742.71484375 C-379.94249338 716.2078826 -398.27016201 685.32303189 -414 654 C-414.70987061 652.59427734 -414.70987061 652.59427734 -415.43408203 651.16015625 C-422.45071034 637.18022117 -428.43663566 622.94254597 -433.80908203 608.25439453 C-434.58556859 606.13250732 -435.37002861 604.01351583 -436.16357422 601.89794922 C-446.54047514 574.1834373 -453.1887816 545.50357068 -457.515625 516.26708984 C-458.01056751 512.92872257 -458.53381642 509.5955125 -459.05859375 506.26171875 C-463.83047293 475.09340626 -463.60390158 442.28999558 -460 411 C-459.87641113 409.85660156 -459.75282227 408.71320313 -459.62548828 407.53515625 C-457.6389299 389.4851664 -454.30993601 372.0091567 -449.85839844 354.40966797 C-449.0809197 351.32142334 -448.33563898 348.22768918 -447.6015625 345.12890625 C-434.49904091 290.99342417 -409.32820884 239.18482255 -377 194 C-376.42362793 193.19304687 -375.84725586 192.38609375 -375.25341797 191.5546875 C-368.77308416 182.52503318 -362.15835451 173.67876131 -354.85595703 165.2956543 C-353.00389023 163.16823566 -351.17540776 161.0244064 -349.36865234 158.85839844 C-342.34775842 150.47634785 -334.9124238 142.62907044 -327.14404297 134.93823242 C-325.23205738 133.04473083 -323.32842351 131.14312 -321.42578125 129.24023438 C-315.4520497 123.28367611 -309.45152062 117.44293982 -303 112 C-301.93930505 111.06357259 -300.88065284 110.12482544 -299.82421875 109.18359375 C-254.22689529 69.04867606 -198.43220868 40.0218548 -141 21 C-140.05721191 20.68369629 -139.11442383 20.36739258 -138.14306641 20.04150391 C-93.65156249 5.35491043 -46.61031698 0 0 0 Z \" fill=\"currentColor\" transform=\"translate(815,545)\"/></svg>";
  const BRAND = { whatsapp: 1, instagram: 1, x: 1, threads: 1, facebook: 1, linkedin: 1, youtube: 1, behance: 1 };
  function icon(name, size) { const inner = ICONS[name] || ""; const s = size || 20; return `<svg class="ic${BRAND[name] ? " brand" : ""}" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">${inner}</svg>`; }

  /* ---------- theme: IKUT PERANGKAT (prefers-color-scheme), tanpa toggle ---------- */
  function initTheme() { document.documentElement.removeAttribute("data-theme"); localStorage.removeItem("hpr_theme"); }

  /* ---------- appbar & modal ---------- */
  function appbar(o = {}) {
    const hh = location.hash || "#/";
    const isHome = (hh === "#/" || hh === "" || hh === "#");
    return `<div class="appbar">
      <button class="iconbtn" data-act="drawer" title="Menu">${icon("menu")}</button>
      ${(o.back || !isHome) ? `<button class="iconbtn ab-back" data-act="back" title="Kembali">${icon("back")}</button>` : ""}
      <div class="logo"><span>CCR</span></div>
      ${o.crumb ? `<span class="crumb">${esc(o.crumb)}</span>` : ""}
      <span class="spacer"></span>
      <span class="mode-badge ${Store.mode}">${Store.mode === "supabase" ? "ONLINE" : "LOKAL"}</span>
    </div>`;
  }
  function openModal(title, bodyHtml) {
    const bg = document.createElement("div"); bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal"><h3>${esc(title)}</h3>${bodyHtml}</div>`;
    let closed = false;
    const api = { root: bg, close: () => { if (!closed) { closed = true; bg.remove(); } }, onDismiss: null };
    // klik area gelap di luar form → jalankan onDismiss (mis. simpan otomatis) bila ada
    bg.addEventListener("click", (e) => { if (e.target === bg) { if (api.onDismiss) api.onDismiss(); else api.close(); } });
    document.body.appendChild(bg);
    return api;
  }
  // Dialog konfirmasi milik app (pengganti window.confirm yang sering diblokir)
  function confirmModal(msg, onYes, yesLabel) {
    const body = `<p style="color:var(--muted); margin:-4px 0 18px">${esc(msg)}</p>
      <div class="modal-actions">
        <button class="btn danger block" data-act="c-yes">${esc(yesLabel || "Ya, hapus")}</button>
        <button class="btn block" data-act="c-no">Batal</button>
      </div>`;
    const mo = openModal("Konfirmasi", body);
    mo.root.querySelector('[data-act="c-yes"]').onclick = async () => { mo.close(); try { await onYes(); } catch (e) { toast(e.message); } };
    mo.root.querySelector('[data-act="c-no"]').onclick = mo.close;
  }

  /* ---------- ROUTER ---------- */
  async function route() {
    if (!state.user) return renderLogin();
    if (!state.master) state.master = await Store.getMaster();
    const h = location.hash || "#/";
    closeDrawer();
    if (h.startsWith("#/loader/")) return renderLoaderDetail(h.split("/").pop());
    if (h.startsWith("#/report")) return renderReport();
    if (h.startsWith("#/unit")) return renderUnit({ add: h.indexOf("/add") >= 0 });
    if (h.startsWith("#/delay")) return renderDelay({ add: h.indexOf("/add") >= 0 });
    if (h.startsWith("#/produksi")) return renderProduksi();
    if (h.startsWith("#/gainloss")) return renderGainLoss();
    if (h.startsWith("#/import")) return renderImport();
    if (h.startsWith("#/setting")) return renderSetting();
    if (h.startsWith("#/account")) return renderAccount();
    if (h.startsWith("#/form")) return renderLoaders();
    return renderDashboard();
  }

  /* ---------- LOGIN ---------- */
  function renderLogin() {
    const hint = Store.mode === "supabase" ? "Login memakai akun Supabase." : "Mode lokal — password default: admin";
    app.innerHTML = `<div class="login-wrap"><div class="login-box">
      <div class="login-logo">${LOGO_SVG}</div>
      <h1 class="login-title">Masuk dengan<br>Akun CCR</h1>
      <div id="acct-badge" class="acct-badge hidden"></div>
      <form id="login-form" autocomplete="off" novalidate>
        <div class="login-field" id="fld-nrp">
          <input id="lg-nrp" class="login-input" placeholder="Masukkan Nrp" inputmode="numeric" autocomplete="off" />
          <button type="submit" id="lg-arrow" class="login-arrow" aria-label="Lanjut">${icon("next", 16)}</button>
        </div>
        <div class="login-field hidden" id="fld-pw">
          <input id="lg-pw" class="login-input" type="password" placeholder="Password" autocomplete="off" />
        </div>
        <div id="lg-err" class="login-err hidden">Periksa informasi akun yang Anda masukkan dan coba lagi.</div>
        <div id="lg-back" class="login-back hidden"><a data-act="lg-reset">‹ Ganti NRP</a></div>
        <button type="submit" id="lg-login" class="btn primary block login-btn hidden">Login</button>
      </form>
      <div class="login-hint">${hint}</div>
      <div class="login-foot">Hak Cipta © 2026 CCR · PT Antareja Mahada Makmur — Site Vale</div>
    </div></div>`;
    let nrp = "", step = "nrp";
    const $ = (id) => document.getElementById(id);
    const nrpFld = $("fld-nrp"), pwFld = $("fld-pw"), nrpIn = $("lg-nrp"), pwIn = $("lg-pw"), loginBtn = $("lg-login"), badge = $("acct-badge"), back = $("lg-back"), err = $("lg-err");
    const showErr = (on) => err.classList.toggle("hidden", !on);
    function toPw() {
      nrp = nrpIn.value.trim(); if (!nrp) { nrpIn.focus(); return; }
      step = "pw"; showErr(false); pwIn.value = "";
      badge.textContent = "NRP " + nrp; badge.classList.remove("hidden"); back.classList.remove("hidden");
      nrpFld.classList.add("hidden"); pwFld.classList.remove("hidden"); loginBtn.classList.remove("hidden");
      setTimeout(() => pwIn.focus(), 40);
    }
    function toNrp() {
      step = "nrp"; nrp = ""; showErr(false); pwIn.value = "";
      badge.classList.add("hidden"); back.classList.add("hidden");
      pwFld.classList.add("hidden"); loginBtn.classList.add("hidden"); nrpFld.classList.remove("hidden");
      setTimeout(() => nrpIn.focus(), 40);
    }
    async function doLogin() {
      showErr(false);
      try { state.user = await Store.signIn(nrp, pwIn.value); location.hash = "#/"; route(); }
      catch (e) { showErr(true); pwIn.focus(); if (pwIn.select) pwIn.select(); }
    }
    nrpIn.addEventListener("input", () => showErr(false));
    pwIn.addEventListener("input", () => showErr(false));
    $("login-form").addEventListener("submit", (e) => { e.preventDefault(); if (step === "nrp") toPw(); else doLogin(); });
    back.querySelector("[data-act='lg-reset']").addEventListener("click", (e) => { e.preventDefault(); toNrp(); });
    setTimeout(() => nrpIn.focus(), 30);
  }

  /* Animator border-beam: sudut diputar dengan kecepatan yang di-spring saat hover.
     Berhenti sendiri saat kartu login lepas dari DOM (pindah halaman). */
  function initLoginBeam() {
    const card = document.querySelector(".login-card.beam-host");
    if (!card) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { card.style.setProperty("--beam-a", "40deg"); return; }
    let angle = 40, speed = 42, target = 42, v = 0, last = 0, raf = 0;
    const k = 30, d = 11; // spring kecepatan (dari komponen asli)
    const surge = () => { target = 240; };
    const settle = () => { target = 42; };
    card.addEventListener("pointerenter", surge);
    card.addEventListener("pointerleave", settle);
    card.addEventListener("focusin", surge);
    card.addEventListener("focusout", settle);
    const frame = (now) => {
      if (!document.contains(card)) { cancelAnimationFrame(raf); return; }
      if (!last) last = now;
      let dt = (now - last) / 1000; if (dt > 0.05) dt = 0.05; last = now;
      const a = k * (target - speed) - d * v; v += a * dt; speed += v * dt;
      angle = (angle + speed * dt) % 360;
      card.style.setProperty("--beam-a", angle.toFixed(2) + "deg");
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  const fmtNum = (n) => (Number(n) || 0).toLocaleString("id-ID");

  /* ---------- NAVBAR (drawer) ---------- */
  function drawerItems() {
    const h = location.hash || "#/";
    const isHome = (h === "#/" || h === "" || h === "#");
    const it = (to, ic, label, act) => `<div class="nav-item ${(act ? false : (to === "#/" ? isHome : h.startsWith(to))) ? "active" : ""}" data-to="${to || ""}">${icon(ic, 20)}<span>${label}</span></div>`;
    return `
      ${it("#/", "grid", "Dashboard")}
      ${it("#/form", "mineral", "Form Ritase")}
      ${it("#/report", "chat", "Report")}
      ${it("#/produksi", "grid", "Laporan Produksi")}
      ${it("#/gainloss", "box", "Gain & Loss")}
      ${it("#/import", "download", "Import Data")}
      <div class="nav-grp"><div class="nav-gh">${icon("truck", 18)}<span>Unit</span></div>
        <div class="nav-sub" data-to="#/unit">Daftar Populasi Unit</div>
        <div class="nav-sub" data-to="#/unit/add">Tambah Unit</div></div>
      <div class="nav-grp"><div class="nav-gh">${icon("alert", 18)}<span>Delay</span></div>
        <div class="nav-sub" data-to="#/delay">Daftar Delay</div>
        <div class="nav-sub" data-to="#/delay/add">Tambah Delay</div></div>
      ${it("#/account", "person", "Account")}
      ${it("#/setting", "settings", "Setting")}
      <div class="nav-sep"></div>
      <div class="nav-item danger" data-act="logout">${icon("logout", 20)}<span>Logout</span></div>`;
  }
  function openDrawer() {
    let d = document.getElementById("drawer");
    if (!d) { d = document.createElement("div"); d.id = "drawer"; d.className = "drawer-bg"; document.body.appendChild(d); }
    d.innerHTML = `<nav class="drawer"><div class="drawer-head"><div class="logo"><span>CCR</span></div><button class="iconbtn" data-act="drawer-close" aria-label="Tutup">${icon("close")}</button></div><div class="drawer-body">${drawerItems()}</div></nav>`;
    requestAnimationFrame(() => d.classList.add("open"));
    d.onclick = (e) => {
      if (e.target === d || e.target.closest('[data-act="drawer-close"]')) return closeDrawer();
      const lo = e.target.closest('[data-act="logout"]');
      if (lo) { closeDrawer(); confirmModal("Keluar dari akun CCR?", async () => { await Store.signOut(); state.user = null; state.master = null; renderLogin(); }, "Ya, keluar"); return; }
      const nav = e.target.closest("[data-to]");
      if (nav && nav.getAttribute("data-to")) { const to = nav.getAttribute("data-to"); closeDrawer(); if ((location.hash || "#/") === to) route(); else location.hash = to; }
    };
  }
  function closeDrawer() { const d = document.getElementById("drawer"); if (d) d.classList.remove("open"); }

  /* ---------- DASHBOARD ---------- */
  async function renderDashboard() {
    const { loaders, haulers } = await Store.listAll(state.tanggal, state.shift);
    const byId = {}; loaders.forEach((l) => (byId[l.id] = l));
    const jams = jamListFor(state.shift);
    const perJam = {}; jams.forEach((j) => (perJam[j] = 0));
    let totalRit = 0, totalBcm = 0;
    haulers.forEach((h) => {
      const l = byId[h.loader_id] || {}; const f = bcmPerRit(l.loader, h.material);
      Object.keys(h.rit || {}).forEach((j) => { const r = num(h.rit[j]); totalRit += r; totalBcm += r * f; if (perJam[j] != null) perJam[j] += r; });
    });
    const hoursReported = jams.filter((j) => perJam[j] > 0).length;
    const maxJam = Math.max(1, ...jams.map((j) => perJam[j]));
    const shiftOpts = state.master.shifts.map((s) => `<option value="${s.kode}" ${s.kode === state.shift ? "selected" : ""}>${esc(s.label)}</option>`).join("");
    const bars = jams.map((j) => {
      const v = perJam[j], pct = v > 0 ? Math.max(8, Math.round((v / maxJam) * 100)) : 0;
      return `<div class="bcol"><div class="bval">${v || ""}</div><div class="btrack"><div class="bfill" style="height:${pct}%"></div></div><div class="blbl">${j.slice(0, 2)}</div></div>`;
    }).join("");
    app.innerHTML = `${appbar({ menu: true, crumb: "Dashboard" })}<div class="container">
      <div class="dash-hi">Halo, <b>${esc(state.user.nama)}</b> 👋</div>
      <div class="toolbar">
        <div><label>Tanggal</label><input type="date" id="d-tgl" value="${state.tanggal}"></div>
        <div class="grow"><label>Shift</label><select id="d-shift">${shiftOpts}</select></div>
      </div>
      <div class="dstats">
        <div class="dcard"><span class="dic blue">${icon("truck", 20)}</span><div><div class="n">${fmtNum(totalRit)}</div><div class="t">Total Ritase</div></div></div>
        <div class="dcard"><span class="dic green">${icon("box", 20)}</span><div><div class="n">${fmtNum(Math.round(totalBcm))}</div><div class="t">Total BCM</div></div></div>
        <div class="dcard"><span class="dic amber">${icon("clock", 20)}</span><div><div class="n">${hoursReported}<span class="ns">/${jams.length}</span></div><div class="t">Jam Terlapor</div></div></div>
      </div>
      <div class="card">
        <div class="dchart-h"><span class="pt">Ritase per Jam</span><span class="chip">Shift ${state.shift}</span></div>
        <div class="bars">${bars || '<div class="empty">Belum ada input.</div>'}</div>
      </div>
    </div>`;
    document.getElementById("d-tgl").onchange = (e) => { state.tanggal = e.target.value; renderDashboard(); };
    document.getElementById("d-shift").onchange = (e) => { state.shift = e.target.value; renderDashboard(); };
  }

  /* ---------- UNIT (populasi) ---------- */
  async function renderUnit(opts) {
    const m = state.master;
    const dts = m.haulers_master || [], excas = m.loaders || [];
    const dtRows = dts.length ? dts.map((u, i) => `<tr><td class="num">${i + 1}</td><td>${esc(u.lambung)}</td><td>${esc(u.ton)} T</td>
      <td class="actions"><button class="iconbtn" data-act="del-unit" data-kind="dt" data-id="${esc(u.lambung)}" title="Hapus">${icon("delete")}</button></td></tr>`).join("") : `<tr><td colspan="4" class="empty">Belum ada DT.</td></tr>`;
    const exRows = excas.length ? excas.map((l, i) => `<tr><td class="num">${i + 1}</td><td>${esc(l.kode)}</td><td>${esc(l.material_default || "-")}</td>
      <td class="actions"><button class="iconbtn" data-act="del-unit" data-kind="exca" data-id="${esc(l.kode)}" title="Hapus">${icon("delete")}</button></td></tr>`).join("") : `<tr><td colspan="4" class="empty">Belum ada Loader.</td></tr>`;
    app.innerHTML = `${appbar({ menu: true, crumb: "Unit" })}<div class="container">
      <div class="page-head"><div class="page-title">Populasi Unit</div><button class="btn primary" data-act="add-unit">${icon("add", 18)} Tambah Unit</button></div>
      <div class="card sect"><div class="sect-h"><span>Dump Truck (DT)</span><span class="chip">${dts.length}</span></div>
        <div class="table-wrap"><table><thead><tr><th class="num">No</th><th>Nomor Lambung</th><th>Tonase</th><th>Aksi</th></tr></thead><tbody>${dtRows}</tbody></table></div></div>
      <div class="card sect"><div class="sect-h"><span>Excavator (Loader)</span><span class="chip">${excas.length}</span></div>
        <div class="table-wrap"><table><thead><tr><th class="num">No</th><th>Kode Unit</th><th>Material Default</th><th>Aksi</th></tr></thead><tbody>${exRows}</tbody></table></div></div>
    </div>`;
    if (opts && opts.add) unitModal();
  }
  function unitModal() {
    const body = `
      <div class="field"><label>Jenis Unit</label><select id="u-kind"><option value="dt">Dump Truck (DT)</option><option value="exca">Excavator (Loader)</option></select></div>
      <div class="field"><label>Kode / Nomor Lambung</label><input id="u-kode" placeholder="cth: DA54227 atau E5416" /></div>
      <div class="field" id="u-ton-wrap"><label>Tonase (DT)</label><select id="u-ton"><option value="20">20 Ton</option><option value="30" selected>30 Ton</option><option value="40">40 Ton</option></select></div>
      <div class="modal-actions"><button class="btn primary block" data-act="save-unit">Simpan</button><button class="btn block" data-act="cancel">Batal</button></div>`;
    const mo = openModal("Tambah Unit", body);
    const kindSel = mo.root.querySelector("#u-kind"), tonWrap = mo.root.querySelector("#u-ton-wrap");
    kindSel.onchange = () => { tonWrap.style.display = kindSel.value === "dt" ? "" : "none"; };
    mo.root.querySelector('[data-act="cancel"]').onclick = mo.close;
    mo.root.querySelector('[data-act="save-unit"]').onclick = async () => {
      const kode = mo.root.querySelector("#u-kode").value.trim().toUpperCase();
      if (!kode) { toast("Isi kode/lambung"); return; }
      const m = state.master;
      if (kindSel.value === "dt") {
        m.haulers_master = m.haulers_master || [];
        if (m.haulers_master.some((u) => u.lambung.toUpperCase() === kode)) { toast("Sudah ada"); return; }
        m.haulers_master.push({ lambung: kode, ton: num(mo.root.querySelector("#u-ton").value) });
      } else {
        m.loaders = m.loaders || [];
        if (m.loaders.some((l) => l.kode.toUpperCase() === kode)) { toast("Sudah ada"); return; }
        m.loaders.push({ kode, material_default: "OB", keterangan: "" });
      }
      await Store.saveMaster(m); toast("Unit ditambahkan"); mo.close(); renderUnit();
    };
  }

  /* ---------- DELAY (kode) ---------- */
  async function renderDelay(opts) {
    const codes = (window.SS6_CODES && window.SS6_CODES.DELAY) || {};
    const extra = state.master.delay_extra || [];
    const rows = Object.keys(codes).sort().map((c) => `<tr><td>${esc(c)}</td><td>${esc(codes[c])}</td><td></td></tr>`).join("");
    const exRows = extra.length ? extra.map((d, i) => `<tr><td>${esc(d.code || "-")}</td><td>${esc(d.desc)}</td>
      <td class="actions"><button class="iconbtn" data-act="del-delay" data-i="${i}" title="Hapus">${icon("delete")}</button></td></tr>`).join("") : `<tr><td colspan="3" class="empty">Belum ada delay tambahan.</td></tr>`;
    app.innerHTML = `${appbar({ menu: true, crumb: "Delay" })}<div class="container">
      <div class="page-head"><div class="page-title">Delay</div><button class="btn primary" data-act="add-delay">${icon("add", 18)} Tambah Delay</button></div>
      <div class="card sect"><div class="sect-h"><span>Delay Tambahan</span><span class="chip">${extra.length}</span></div>
        <div class="table-wrap"><table><thead><tr><th>Kode</th><th>Deskripsi</th><th>Aksi</th></tr></thead><tbody>${exRows}</tbody></table></div></div>
      <div class="card sect"><div class="sect-h"><span>Daftar Kode Delay (SS6)</span><span class="chip">${Object.keys(codes).length}</span></div>
        <div class="table-wrap"><table><thead><tr><th>Kode</th><th>Deskripsi</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
    </div>`;
    if (opts && opts.add) delayModal();
  }
  function delayModal() {
    const codes = (window.SS6_CODES && window.SS6_CODES.DELAY) || {};
    const opt = Object.keys(codes).sort().map((c) => `<option value="${esc(c)}">${esc(c)} — ${esc(codes[c])}</option>`).join("");
    const body = `
      <div class="field"><label>Kode Delay</label><select id="dl-code">${opt}</select></div>
      <div class="field"><label>Deskripsi (yang tampil di form)</label><input id="dl-desc" placeholder="cth: Tunggu Air" /></div>
      <div class="hint">Delay ini akan muncul sebagai pilihan di form Loss (tipe Delay).</div>
      <div class="modal-actions"><button class="btn primary block" data-act="save-delay">Simpan</button><button class="btn block" data-act="cancel">Batal</button></div>`;
    const mo = openModal("Tambah Delay", body);
    mo.root.querySelector('[data-act="cancel"]').onclick = mo.close;
    mo.root.querySelector('[data-act="save-delay"]').onclick = async () => {
      const code = mo.root.querySelector("#dl-code").value, desc = mo.root.querySelector("#dl-desc").value.trim();
      if (!desc) { toast("Isi deskripsi"); return; }
      const m = state.master;
      m.delay_extra = m.delay_extra || []; m.delay_extra.push({ code, desc });
      m.delay = m.delay || []; if (!m.delay.includes(desc)) m.delay.push(desc);
      await Store.saveMaster(m); toast("Delay ditambahkan"); mo.close(); renderDelay();
    };
  }

  /* ---------- LOADER LIST ---------- */
  async function renderLoaders() {
    const { loaders, haulers, losses } = await Store.listAll(state.tanggal, state.shift);
    const byId = {}; loaders.forEach((l) => (byId[l.id] = l));
    const cntH = {}, cntR = {}, bcmR = {}, ritLJ = {};
    haulers.forEach((h) => {
      cntH[h.loader_id] = (cntH[h.loader_id] || 0) + 1;
      const l = byId[h.loader_id] || {}, f = bcmPerRit(l.loader, h.material);
      const mp = ritLJ[h.loader_id] = ritLJ[h.loader_id] || {};
      Object.keys(h.rit || {}).forEach((j) => { mp[j] = (mp[j] || 0) + num(h.rit[j]); });
      const sr = Object.values(h.rit || {}).reduce((a, b) => a + num(b), 0);
      cntR[h.loader_id] = (cntR[h.loader_id] || 0) + sr;
      bcmR[h.loader_id] = (bcmR[h.loader_id] || 0) + sr * f;
    });
    const lossLJ = {};
    losses.forEach((x) => {
      const lj = lossLJ[x.loader_id] = lossLJ[x.loader_id] || {};
      const mp = lj[x.jam] = lj[x.jam] || { delay: 0, idle: 0, items: [] };
      if (x.type === "idle") mp.idle += num(x.duration); else if (x.type === "delay") mp.delay += num(x.duration);
      mp.items.push({ type: x.type, cat: x.category, dur: num(x.duration), rem: x.remark });
    });
    const tgtOf = (kode) => (CFG.TARGETS || {})[(CFG.UNIT_MODEL || {})[kode]] || null;
    const reached = (l) => { const t = tgtOf(l.loader); return !!(t && t.bcm && (bcmR[l.id] || 0) >= t.bcm); };
    const jams = jamListFor(state.shift);
    const njRaw = String(new Date().getHours()).padStart(2, "0") + ".00";
    const nowJam = (state.tanggal === todayISO() && jams.includes(njRaw)) ? njRaw : null;
    const totalRit = Object.values(cntR).reduce((a, b) => a + b, 0);
    // "belum" = jam-ini kosong DAN target produksi belum tercapai
    const belum = nowJam ? loaders.filter((l) => !(num((ritLJ[l.id] || {})[nowJam]) > 0) && !reached(l)).length : null;
    const shiftOpts = state.master.shifts.map((s) => `<option value="${s.kode}" ${s.kode === state.shift ? "selected" : ""}>${esc(s.label)}</option>`).join("");
    // ---- Papan Shift: ringkasan + matriks Loader × Jam ----
    let papan = "";
    const P = (mnt) => (mnt / 60) * 100;
    const barsFor = (l) => {
      const mp = ritLJ[l.id] || {}, lj = lossLJ[l.id] || {};
      const cell = (j) => {
        const r = num(mp[j]), lo = lj[j] || { delay: 0, idle: 0, items: [] };
        let d = lo.delay, i = lo.idle; const tot = d + i; if (tot > 60) { const s = 60 / tot; d *= s; i *= s; }
        const hasData = r > 0 || d > 0 || i > 0, now = j === nowJam;
        const loss = d + i, work = hasData ? Math.max(0, 60 - loss) : 0;
        const wp = P(work), fp = P(work + loss);
        const grad = hasData ? `background:linear-gradient(to top,#34c759 0 ${wp}%,#ffcc00 ${wp}% ${fp}%,transparent ${fp}% 100%);` : "";
        const parts = (lo.items || []).map((x) => `${x.cat} ${Math.round(x.dur)}'${x.rem ? " (" + x.rem + ")" : ""}`);
        const detail = `${j} · ${r} rit` + (parts.length ? " · " + parts.join(" · ") : (hasData ? "" : " · belum diisi"));
        return `<div class="ccell"><div class="jlbl">${j.slice(0, 2)}</div><div class="cbar ${now ? "now" : ""}" data-act="open-ritase" data-id="${l.id}" data-tip="${esc(detail)}"><div class="cbar-fill" style="${grad}"></div></div><div class="cnum">${r || ""}</div></div>`;
      };
      return `<div class="mx-scroll"><div class="fleet-grid">${jams.map(cell).join("")}</div></div>`;
    };
    if (loaders.length) {
      papan = `${nowJam && belum > 0 ? `<div class="banner">
          <span class="bic">${icon("rocket", 22)}</span>
          <div class="btxt"><div class="t">Jam ${nowJam} — waktunya laporan per jam</div><div class="d">${belum} loader belum diisi untuk jam ini.</div></div>
          <button class="bcta" data-act="report-now" data-jam="${nowJam}">Buat laporan ${icon("next", 15)}</button>
        </div>` : ""}
        <div class="summary">
          <div class="stat ok"><div class="n">${loaders.length}</div><div class="t">Loader aktif</div></div>
          <div class="stat"><div class="n">${totalRit}</div><div class="t">Total rit shift</div></div>
          <div class="stat ${nowJam ? "hot" : ""}"><div class="n">${nowJam ? belum : haulers.length}</div><div class="t">${nowJam ? "Belum jam " + nowJam : "Total hauler"}</div></div>
        </div>
        <div class="papan-head"><span class="pt">Papan Shift ${esc(state.shift)}</span>${nowJam ? `<span class="live"><span class="bl"></span> ${nowJam}</span>` : ""}</div>
        <div class="legend"><span><i style="background:#34c759"></i>Terisi</span><span><i style="background:#ffcc00"></i>Delay/Idle</span><span><i style="background:var(--surface-2);border:1px solid var(--border)"></i>Belum</span><span><i style="box-shadow:0 0 0 2px var(--warning) inset"></i>Jam ini</span></div>
        ${nowJam ? `<div style="margin:10px 0 4px"><button class="btn primary" data-act="report-now" data-jam="${nowJam}">Buat Laporan ${nowJam} →</button></div>` : ""}`;
    }
    const rows = loaders.length ? loaders.map((l) => `
      <div class="card fleet-card">
        <div class="fleet-top">
          <div>
            <div class="title">${esc(l.loader)}</div>
            <div class="meta"><span>PIT ${esc(l.pit || "-")}</span><span>GL: ${esc(l.gl_pit || "-")}</span>
              <span class="chip">${cntH[l.id] || 0} hauler</span>
              <span class="chip ${reached(l) ? "ok" : ""}">${cntR[l.id] || 0}${(tgtOf(l.loader) && tgtOf(l.loader).rit) ? "/" + tgtOf(l.loader).rit : ""} rit${reached(l) ? " ✓" : ""}</span>
              <span class="chip">${Math.round(bcmR[l.id] || 0)}${tgtOf(l.loader) ? "/" + tgtOf(l.loader).bcm : ""} BCM</span></div>
          </div>
          <div class="actions">
            <button class="btn sm primary" data-act="open-loader" data-id="${l.id}">Buka →</button>
            <button class="iconbtn" data-act="dup-loader" data-id="${l.id}" title="Duplikat (loader baru, pengawas sama)">${icon("copy")}</button>
            <button class="iconbtn" data-act="edit-loader" data-id="${l.id}" title="Edit">${icon("edit")}</button>
            <button class="iconbtn" data-act="del-loader" data-id="${l.id}" title="Hapus">${icon("delete")}</button>
          </div>
        </div>
        ${barsFor(l)}
      </div>`).join("") : `<div class="empty">Belum ada loader untuk tanggal & shift ini.<br/>Klik <b>＋ Tambah Loader</b>.</div>`;
    app.innerHTML = `${appbar({ back: true, menu: true, crumb: "Form Ritase" })}<div class="container">
      <div class="toolbar">
        <div><label>Tanggal</label><input type="date" id="f-tgl" value="${state.tanggal}"></div>
        <div class="grow"><label>Shift</label><select id="f-shift">${shiftOpts}</select></div>
        <button class="btn primary" data-act="add-loader">＋ Tambah Loader</button>
      </div>${papan}<div class="fleet-list">${rows}</div></div>`;
    document.getElementById("f-tgl").onchange = (e) => { state.tanggal = e.target.value; renderLoaders(); };
    document.getElementById("f-shift").onchange = (e) => { state.shift = e.target.value; renderLoaders(); };
  }

  async function loaderModal(existing) {
    const m = state.master;
    let base = existing;
    if (!base) {
      // prefill header (area/PIT/GL) dari loader terakhir di shift ini (Masalah 1)
      const list = await Store.listLoaders(state.tanggal, state.shift);
      const last = list[list.length - 1];
      base = last ? { loader: "", pengawas: last.pengawas, pengawas_nama: last.pengawas_nama, area: last.area, pit: last.pit, gl_pit: last.gl_pit, gl_road: last.gl_road, gl_disposal: last.gl_disposal }
                  : { loader: "", pengawas: "", pengawas_nama: "", area: m.areas[0], pit: m.pits[0], gl_pit: m.gl_pit[0], gl_road: m.gl_road[0], gl_disposal: m.gl_disposal[0] };
    }
    const loaderOpts = `<option value="">— pilih loader —</option>` + m.loaders.map((l) => `<option value="${esc(l.kode)}" ${l.kode === base.loader ? "selected" : ""}>${esc(l.kode)}</option>`).join("");
    const pgNames = pengawasList().map((p) => p.nama);
    const glOpt = (sel) => `<option value="">— pilih —</option>` + optionList(pgNames, sel);
    const body = `
      <div class="field"><label>Loader (Exca)</label><select id="m-loader">${loaderOpts}</select></div>
      <div class="row2">
        <div class="field"><label>Area</label><select id="m-area">${optionList(m.areas, base.area)}</select></div>
        <div class="field"><label>PIT</label><select id="m-pit">${optionList(m.pits, base.pit)}</select></div>
      </div>
      <div class="row3">
        <div class="field"><label>GL Pit</label><select id="m-glpit">${glOpt(base.gl_pit)}</select></div>
        <div class="field"><label>GL Road</label><select id="m-glroad">${glOpt(base.gl_road)}</select></div>
        <div class="field"><label>GL Disposal</label><select id="m-gldisp">${glOpt(base.gl_disposal)}</select></div>
      </div>
      <div class="modal-actions"><button class="btn primary block" data-act="save-loader">Simpan</button><button class="btn block" data-act="cancel">Batal</button></div>`;
    const isEdit = !!(existing && existing.id);
    const mo = openModal(isEdit ? "Edit Loader" : "Tambah Loader", body);
    let saved = false;
    const collect = () => {
      const glpit = mo.root.querySelector("#m-glpit").value;
      return { tanggal: state.tanggal, shift: state.shift, loader: mo.root.querySelector("#m-loader").value,
        pengawas: pengawasNrp(glpit), pengawas_nama: glpit,
        area: mo.root.querySelector("#m-area").value, pit: mo.root.querySelector("#m-pit").value,
        gl_pit: glpit, gl_road: mo.root.querySelector("#m-glroad").value, gl_disposal: mo.root.querySelector("#m-gldisp").value };
    };
    const doSave = async (silent) => {
      if (saved) return;
      const data = collect();
      if (!data.loader) { if (!silent) toast("Pilih loader dulu"); return; }
      saved = true;
      try {
        if (isEdit) { await Store.updateLoader(existing.id, data); if (!silent) toast("Loader tersimpan"); mo.close(); renderLoaders(); }
        else if (silent) { await Store.createLoader(data); mo.close(); renderLoaders(); }
        else { const row = await Store.createLoader(data); toast(`Loader ${data.loader} dibuat`); mo.close(); location.hash = "#/loader/detail/" + row.id; }
      } catch (e) { saved = false; toast(e.message); }
    };
    mo.root.querySelector('[data-act="save-loader"]').onclick = () => doSave(false);
    mo.root.querySelector('[data-act="cancel"]').onclick = mo.close; // Batal = buang
    mo.onDismiss = () => { if (!mo.root.querySelector("#m-loader").value) { mo.close(); return; } doSave(true); }; // klik luar = simpan
  }

  /* ---------- LOADER DETAIL (3 tab) ---------- */
  async function renderLoaderDetail(loaderId) {
    const l = await Store.getLoader(loaderId);
    if (!l) { toast("Loader tak ditemukan"); location.hash = "#/form"; return; }
    app._loaderId = loaderId;
    // samakan konteks agar Report & grid memakai tanggal/shift loader ini
    state.tanggal = l.tanggal; state.shift = String(l.shift);
    const haulers = await Store.listHaulers(loaderId);
    const losses = await Store.listLosses(loaderId);
    // Satu halaman: Fleet → Ritase → Loss → Report
    const jams = jamListFor(l.shift);
    const njRaw = String(new Date().getHours()).padStart(2, "0") + ".00";
    const nowJam = (l.tanggal === todayISO() && jams.includes(njRaw)) ? njRaw : "";
    const jamOpts = `<option value="">— Semua jam (rekap shift) —</option>` + jams.map((j) => `<option value="${j}" ${j === nowJam ? "selected" : ""}>${j}</option>`).join("");
    const sec = (n, title, chip, body) => `<div class="card sect ld-sec" id="sec-${n}"><div class="sect-h"><span><span class="secno">${n}</span>${title}</span>${chip || ""}</div><div class="sect-b">${body}</div></div>`;
    const totRit = haulers.reduce((a, h) => a + Object.values(h.rit || {}).reduce((x, y) => x + num(y), 0), 0);
    const totLoss = losses.reduce((a, x) => a + num(x.duration), 0);
    app.innerHTML = `${appbar({ back: true, menu: true, crumb: `${l.loader}` })}<div class="container">
      <div class="page-title">${esc(l.loader)} <span class="hint">PIT ${esc(l.pit)} · GL ${esc(l.gl_pit || "-")} · Shift ${esc(l.shift)} · ${esc(fmtID(l.tanggal))}</span></div>
      <div class="ld-jump">
        <a href="#sec-1">Fleet</a><a href="#sec-2">Ritase</a><a href="#sec-3">Loss</a><a href="#sec-4">Report</a>
      </div>
      ${sec(1, "Fleet (Hauler)", `<span class="chip">${haulers.length}</span>`, fleetSection(l, haulers))}
      ${sec(2, "Ritase", `<span class="chip ok">${totRit} rit</span>`, ritaseSection(l, haulers))}
      ${sec(3, "Loss", `<span class="chip ${totLoss ? "loss" : ""}">${totLoss}'</span>`, lossSection(l, losses))}
      ${sec(4, "Report", "", `
        <div class="toolbar" style="margin-bottom:12px">
          <div class="grow"><label>Jam</label><select id="d-rjam">${jamOpts}</select></div>
          <button class="btn primary" data-act="d-gen-report">Buat Laporan</button>
        </div>
        <div style="margin-bottom:10px"><label>Keterangan Tambahan <span class="hint">(opsional)</span></label>
          <textarea id="r-ket" rows="2" placeholder="cth: 5 Operator Izin, 2 Operator Sakit"></textarea></div>
        <div class="report-box" id="report-out">Pilih jam lalu klik <b>Buat Laporan</b>.</div>
        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn primary btn-ic" data-act="wa-report">${icon("whatsapp", 18)} Salin &amp; buka WhatsApp</button>
          <button class="btn btn-ic" data-act="copy-report">${icon("copy", 18)} Salin saja</button>
        </div>
        <div class="hint">Laporan mencakup <b>semua loader</b> pada ${esc(fmtID(l.tanggal))} shift ${esc(l.shift)}.</div>`)}
    </div>`;
    bindGrid(loaderId);
  }

  /* --- Tab 1: FLEET --- */
  function fleetSection(l, haulers) {
    const rows = haulers.length ? haulers.map((h) => `<tr>
        <td>${esc(h.hauler)}</td><td>${esc(h.material)}</td><td>${esc(h.disposal || "-")}</td><td class="num">${esc(h.distance || "-")}</td>
        <td class="actions"><button class="iconbtn" data-act="edit-hauler" data-id="${h.id}" title="Edit">${icon("edit")}</button><button class="iconbtn" data-act="del-hauler" data-id="${h.id}" title="Hapus">${icon("delete")}</button></td>
      </tr>`).join("") : `<tr><td colspan="5" class="empty">Belum ada hauler. Klik ＋ Tambah Hauler.</td></tr>`;
    return `<div class="hint" style="margin-bottom:10px">Isi daftar hauler + material, disposal, distance <b>sekali di sini</b>. Angka ritase diisi di tab <b>2. Ritase</b>.</div>
      <div class="table-wrap"><table class="sortable"><thead><tr>
        <th class="sortable">Hauler / DT ${sortChev}</th>
        <th class="sortable">Material ${sortChev}</th>
        <th class="sortable">Disposal ${sortChev}</th>
        <th class="sortable num" data-num="1">Distance ${sortChev}</th>
        <th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div style="margin-top:14px"><button class="btn primary" data-act="add-hauler">${icon("add", 18)} Tambah Hauler</button></div>`;
  }
  async function haulerModal(loaderId, existing) {
    const m = state.master;
    const d = existing || { hauler: "", material: m.materials[0], disposal: "", distance: "", grade: "SAP3-SSP" };
    const multi = !existing;
    const gradeList = m.grades || ["SAP3-SSP"];
    const body = `
      ${multi
        ? `<div class="field"><label>Daftar Hauler / DT <span class="hint">(satu per baris / koma — cukup 3 angka terakhir, cth 227 → DA54227)</span></label><textarea id="d-hauler" rows="4" placeholder="227&#10;228&#10;174"></textarea></div>`
        : `<div class="field"><label>Hauler / DT <span class="hint">(cth: 227 → DA54227)</span></label><input id="d-hauler" list="lambung-list" value="${esc(d.hauler)}" placeholder="ketik 3 angka terakhir" autocomplete="off" /></div>`}
      <datalist id="lambung-list">${lambungList().map((u) => `<option value="${esc(u.lambung)}">${u.ton}T</option>`).join("")}</datalist>
      <div class="row2">
        <div class="field"><label>Material</label><select id="d-material">${optionList(m.materials, d.material)}</select></div>
        <div class="field"><label>Grade <span class="hint">(hanya utk Ore)</span></label><select id="d-grade">${optionList(gradeList, d.grade || "SAP3-SSP")}</select></div>
      </div>
      <div class="row2">
        <div class="field"><label>Disposal / Dump</label><select id="d-disposal"><option value="">-</option>${optionList(m.disposals, d.disposal)}</select></div>
        <div class="field"><label>Distance (m)</label><input id="d-distance" type="number" value="${esc(d.distance)}" placeholder="cth: 3200" /></div>
      </div>
      ${multi ? `<div class="hint">Material, Disposal, Distance ini berlaku untuk semua hauler yang Anda tambahkan sekarang. Bisa diedit per-hauler nanti.</div>` : ""}
      <div class="modal-actions"><button class="btn primary block" data-act="save-hauler">Simpan</button><button class="btn block" data-act="cancel">Batal</button></div>`;
    const mo = openModal(existing ? "Edit Hauler" : "Tambah Hauler", body);
    let saved = false;
    const doSave = async (silent) => {
      if (saved) return;
      const common = { material: mo.root.querySelector("#d-material").value, grade: mo.root.querySelector("#d-grade").value, disposal: mo.root.querySelector("#d-disposal").value, distance: mo.root.querySelector("#d-distance").value };
      const raw = mo.root.querySelector("#d-hauler").value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      if (!raw.length) { if (!silent) toast("Isi minimal 1 hauler"); return; }
      saved = true;
      try {
        if (existing) { await Store.updateHauler(existing.id, { hauler: resolveLambung(raw[0]), ...common }); }
        else { const names = raw.map(resolveLambung); await Store.createHaulersBulk(loaderId, names, common); if (!silent) toast(`${names.length} hauler ditambahkan`); }
        mo.close(); renderLoaderDetail(loaderId);
      } catch (e) { saved = false; toast(e.message); }
    };
    mo.root.querySelector('[data-act="save-hauler"]').onclick = () => doSave(false);
    mo.root.querySelector('[data-act="cancel"]').onclick = mo.close;
    mo.onDismiss = () => { if (!mo.root.querySelector("#d-hauler").value.trim()) { mo.close(); return; } doSave(true); };
  }

  /* --- Tab 2: RITASE GRID --- */
  function ritaseSection(l, haulers) {
    if (!haulers.length) return `<div class="empty">Belum ada hauler.<br/>Tambahkan dulu di tab <b>1. Fleet</b>.</div>`;
    const jams = jamListFor(l.shift);
    const head = `<tr><th class="sticky-col">Hauler</th>${jams.map((j) => `<th class="num">${j.slice(0, 2)}</th>`).join("")}<th class="num">ΣRit</th><th class="num">ΣVol</th></tr>`;
    const body = haulers.map((h) => {
      const cells = jams.map((j) => `<td class="num"><input class="grid-in" type="number" inputmode="numeric" min="0" data-hid="${h.id}" data-jam="${j}" value="${(h.rit && h.rit[j] != null) ? esc(h.rit[j]) : ""}"></td>`).join("");
      return `<tr><td class="sticky-col" title="${esc(h.material)} → ${esc(h.disposal || "-")}">${esc(h.hauler)}</td>${cells}<td class="num rowrit" data-hid="${h.id}">0</td><td class="num rowvol" data-hid="${h.id}">0</td></tr>`;
    }).join("");
    const foot = `<tr class="foot"><td class="sticky-col">TOTAL</td>${jams.map((j) => `<td class="num coltot" data-jam="${j}">0</td>`).join("")}<td class="num" id="grand-rit">0</td><td class="num" id="grand-vol">0</td></tr>`;
    return `<div class="hint" style="margin-bottom:10px">Ketik jumlah rit tiap jam. Volume & total otomatis. Tersimpan otomatis. Geser ke samping untuk jam berikutnya.</div>
      <div class="table-wrap"><table class="grid">${`<thead>${head}</thead>`}<tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>
      <div style="margin-top:14px; display:flex; align-items:center; gap:16px; flex-wrap:wrap">
        <span class="saved" id="save-ind"><span class="c">✓</span> Otomatis tersimpan</span>
        <button class="btn" data-act="tab" data-tab="loss">Lanjut ke Loss →</button>
      </div>`;
  }
  function flashSaved() { const el = document.getElementById("save-ind"); if (!el) return; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
  function recalcGrid() {
    const pr = perRit();
    const colTot = {}, rowTot = {}; let grand = 0;
    document.querySelectorAll(".grid-in").forEach((inp) => {
      const v = num(inp.value), hid = inp.dataset.hid, jam = inp.dataset.jam;
      rowTot[hid] = (rowTot[hid] || 0) + v; colTot[jam] = (colTot[jam] || 0) + v; grand += v;
    });
    document.querySelectorAll(".rowrit").forEach((td) => { const r = rowTot[td.dataset.hid] || 0; td.textContent = r; });
    document.querySelectorAll(".rowvol").forEach((td) => { td.textContent = (rowTot[td.dataset.hid] || 0) * pr; });
    document.querySelectorAll(".coltot").forEach((td) => { td.textContent = colTot[td.dataset.jam] || 0; });
    const gr = document.getElementById("grand-rit"), gv = document.getElementById("grand-vol");
    if (gr) gr.textContent = grand; if (gv) gv.textContent = grand * pr;
  }
  function bindGrid(loaderId) {
    recalcGrid();
    const body = document.getElementById("sec-2") || document.getElementById("detail-body");
    if (!body) return;
    body.addEventListener("input", (e) => { if (e.target.classList.contains("grid-in")) recalcGrid(); });
    body.addEventListener("change", async (e) => { if (e.target.classList.contains("grid-in")) { await Store.setRit(e.target.dataset.hid, e.target.dataset.jam, e.target.value); flashSaved(); } });
  }

  /* --- Tab 3: LOSS --- */
  function lossSection(l, losses) {
    const jams = jamListFor(l.shift);
    const order = (a, b) => jams.indexOf(a.jam) - jams.indexOf(b.jam);
    const sorted = losses.slice().sort(order);
    const typeLabel = (t) => ({ problem: "Problem", idle: "Idle", delay: "Delay" }[t] || t);
    const total = losses.reduce((a, x) => a + num(x.duration), 0);
    const rows = sorted.length ? sorted.map((x) => `<tr>
        <td class="num">${esc(x.jam)}</td><td><span class="chip">${typeLabel(x.type)}</span></td><td>${esc(x.category)}</td>
        <td class="num">${esc(x.duration || 0)}'</td><td>${esc(x.remark || "-")} ${x.auto ? '<span class="chip wait">auto</span>' : ""}</td>
        <td class="actions"><button class="iconbtn" data-act="edit-loss" data-id="${x.id}" title="Edit">${icon("edit")}</button><button class="iconbtn" data-act="del-loss" data-id="${x.id}" title="Hapus">${icon("delete")}</button></td>
      </tr>`).join("") : `<tr><td colspan="6" class="empty">Belum ada loss.</td></tr>`;
    return `<div class="hint" style="margin-bottom:10px">Problem = penghambat (loader tak stop). Idle/Delay = stop, isi <b>durasi menit</b> untuk hitung loss. Meal & Break / Change Shift terisi otomatis.</div>
      <div class="table-wrap"><table><thead><tr><th class="num">Jam</th><th>Tipe</th><th>Kategori</th><th class="num">Durasi</th><th>Remark</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="total-bar"><span>Total Loss: <b>${total} menit</b></span></div>
      <div style="margin-top:14px"><button class="btn primary" data-act="add-loss">＋ Tambah Loss</button></div>`;
  }
  function lossModal(loaderId, existing, shift) {
    const m = state.master;
    const jams = jamListFor(shift);
    const d = existing || { jam: jams[0], type: "delay", category: "", duration: 30, remark: "" };
    const catFor = (t) => (t === "problem" ? m.problems : t === "idle" ? m.idle : m.delay);
    const body = `
      <div class="row2">
        <div class="field"><label>Jam</label><select id="l-jam">${optionList(jams, d.jam)}</select></div>
        <div class="field"><label>Tipe</label><select id="l-type">
          <option value="problem" ${d.type === "problem" ? "selected" : ""}>Problem</option>
          <option value="idle" ${d.type === "idle" ? "selected" : ""}>Idle</option>
          <option value="delay" ${d.type === "delay" ? "selected" : ""}>Delay</option>
        </select></div>
      </div>
      <div class="field"><label>Kategori</label><select id="l-cat">${optionList(catFor(d.type), d.category)}</select></div>
      <div class="row2">
        <div class="field"><label>Durasi (menit)</label><input id="l-dur" type="number" min="0" value="${esc(d.duration)}" /></div>
        <div class="field"><label>Remark</label><input id="l-remark" value="${esc(d.remark)}" /></div>
      </div>
      <div class="modal-actions"><button class="btn primary block" data-act="save-loss">Simpan</button><button class="btn block" data-act="cancel">Batal</button></div>`;
    const mo = openModal(existing ? "Edit Loss" : "Tambah Loss", body);
    mo.root.querySelector("#l-type").onchange = (e) => { mo.root.querySelector("#l-cat").innerHTML = optionList(catFor(e.target.value), ""); };
    let saved = false;
    const doSave = async (silent) => {
      if (saved) return;
      const data = { loader_id: loaderId, jam: mo.root.querySelector("#l-jam").value, type: mo.root.querySelector("#l-type").value, category: mo.root.querySelector("#l-cat").value, duration: num(mo.root.querySelector("#l-dur").value), remark: mo.root.querySelector("#l-remark").value.trim(), auto: false };
      if (!data.category) { if (!silent) toast("Pilih kategori"); return; }
      saved = true;
      try { if (existing) await Store.updateLoss(existing.id, data); else await Store.createLoss(data); mo.close(); renderLoaderDetail(loaderId); } catch (e) { saved = false; toast(e.message); }
    };
    mo.root.querySelector('[data-act="save-loss"]').onclick = () => doSave(false);
    mo.root.querySelector('[data-act="cancel"]').onclick = mo.close;
    mo.onDismiss = () => { if (!mo.root.querySelector("#l-cat").value) { mo.close(); return; } doSave(true); };
  }

  /* ---------- REPORT ---------- */
  async function renderReport() {
    const jams = jamListFor(state.shift);
    const jamOpts = `<option value="">— Semua jam (rekap shift) —</option>` + jams.map((j) => `<option value="${j}">${j}</option>`).join("");
    const shiftOpts = state.master.shifts.map((s) => `<option value="${s.kode}" ${s.kode === state.shift ? "selected" : ""}>${esc(s.label)}</option>`).join("");
    app.innerHTML = `${appbar({ back: true, menu: true, crumb: "Laporan WhatsApp" })}<div class="container">
      <div class="toolbar">
        <div><label>Tanggal</label><input type="date" id="r-tgl" value="${state.tanggal}"></div>
        <div><label>Shift</label><select id="r-shift">${shiftOpts}</select></div>
        <div class="grow"><label>Jam</label><select id="r-jam">${jamOpts}</select></div>
        <button class="btn primary" data-act="gen-report">Buat Laporan</button>
      </div>
      <div style="margin-top:10px"><label>Keterangan Tambahan <span class="hint">(opsional — muncul di bawah garis)</span></label>
        <textarea id="r-ket" rows="2" placeholder="cth: 5 Operator Izin, 2 Operator Sakit, 1 Operator MCU"></textarea></div>
      <div class="report-box" id="report-out" style="margin-top:10px">Pilih jam lalu klik <b>Buat Laporan</b>.</div>
      <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap">
        <button class="btn primary btn-ic" data-act="wa-report">${icon("send", 18)} Salin &amp; buka WhatsApp</button>
        <button class="btn btn-ic" data-act="copy-report">${icon("copy", 18)} Salin saja</button>
        <button class="btn btn-ic" data-act="ss6-hpr-export">${icon("download", 18)} Export SS6 (HPR) .xlsx</button>
        <button class="btn btn-ic" data-act="ss6-ore-export">${icon("download", 18)} Export SS6 (ORE) .xlsx</button>
        <button class="btn btn-ic" data-act="csv-export">${icon("download", 18)} Export CSV</button>
      </div></div>`;
    document.getElementById("r-tgl").onchange = (e) => { state.tanggal = e.target.value; };
    document.getElementById("r-shift").onchange = (e) => { state.shift = e.target.value; renderReport(); };
    // datang dari Papan Shift → pilih jam & langsung buat laporan
    if (state.__reportJam != null) {
      const jsel = document.getElementById("r-jam"); jsel.value = state.__reportJam; state.__reportJam = null;
      const out = document.getElementById("report-out"); out.textContent = "Membuat...";
      buildReport(jsel.value).then((txt) => { out.textContent = txt; out._txt = txt; out.classList.add("wa"); });
    }
  }
  // Format baru (sesuai laporan WA asli): daftar kendala per jam + keterangan tambahan.
  // - Problem  : TANPA menit  ->  "E5312 : Perbaikan Front"
  // - Delay/Idle: PAKAI menit ->  "E5168 : 60' No Opt Truck"
  // - Remark ada -> "(...)"; remark kosong -> tanpa kurung.
  async function buildReport(jam) {
    const { loaders, losses } = await Store.listAll(state.tanggal, state.shift);
    const lByL = {}; losses.forEach((x) => (lByL[x.loader_id] = lByL[x.loader_id] || []).push(x));
    const ketEl = document.getElementById("r-ket");
    const ket = ((ketEl && ketEl.value) || "").trim();

    const fmtLoss = (x) => {
      const menit = x.type === "problem" ? "" : `${num(x.duration)}' `;
      const rmk = x.remark ? ` (${x.remark})` : "";
      return `${menit}${x.category}${rmk}`;
    };
    const blockFor = (jm) => {
      const out = [`PER JAM ${jm}`];
      let any = false;
      loaders.forEach((l) => {
        const ls = (lByL[l.id] || []).filter((x) => String(x.jam) === String(jm));
        if (!ls.length) return;
        any = true;
        out.push(`${l.loader} : ${ls.map(fmtLoss).join(", ")}`);
      });
      if (!any) out.push("(Tidak ada kendala)");
      return out.join("\n");
    };

    const L = [`${fmtID(state.tanggal)} SHIFT ${state.shift}`];
    if (jam) {
      L.push(blockFor(jam));
    } else {
      const jams = jamListFor(state.shift);
      const withLoss = jams.filter((jm) => loaders.some((l) => (lByL[l.id] || []).some((x) => String(x.jam) === String(jm))));
      if (!withLoss.length) L.push("(Belum ada kendala tercatat di shift ini)");
      else withLoss.forEach((jm) => { L.push(""); L.push(blockFor(jm)); });
    }
    if (ket) { L.push("---------------------------"); L.push(ket); }
    return L.join("\n");
  }

  /* Klasifikasi material untuk pelaporan. Quarry = gabungan Quarry/Inpit/Infra. */
  const CLASS_ORDER = ["ORE_GETTING", "ORE_HAULING", "OB", "QUARRY", "OTHER"];
  const CLASS_LABEL = { ORE_GETTING: "Ore Getting", ORE_HAULING: "Ore Hauling", OB: "Overburden", QUARRY: "Quarry (total)", OTHER: "Material Lainnya" };
  function matClass(m) {
    const s = String(m || "").trim();
    if (/ore\s*haul/i.test(s)) return "ORE_HAULING";
    if (/ore\s*getting/i.test(s)) return "ORE_GETTING";
    if (/quarry/i.test(s)) return "QUARRY";
    if (/^ob\b|overburden/i.test(s)) return "OB";
    return "OTHER";
  }

  /* ---------- LAPORAN PRODUKSI (rentang tanggal) ---------- */
  // Perhitungan dipakai bersama oleh tampilan & export → angka selalu identik.
  async function produksiData() {
    if (!state.prodFrom) { state.prodFrom = state.tanggal; state.prodTo = state.tanggal; state.prodShift = ""; }
    const { loaders, haulers, losses } = await Store.listRange(state.prodFrom, state.prodTo, state.prodShift);
    const byId = {}; loaders.forEach((l) => (byId[l.id] = l));
    let totRit = 0, totBcm = 0, totLoss = 0;
    const perTgl = {}, perMat = {}, perLoader = {}, perClass = {}, detail = [];
    haulers.forEach((h) => {
      const l = byId[h.loader_id]; if (!l) return;
      const f = bcmPerRit(l.loader, h.material);
      const r = Object.values(h.rit || {}).reduce((a, b) => a + num(b), 0);
      const b = r * f; totRit += r; totBcm += b;
      const t = perTgl[l.tanggal] = perTgl[l.tanggal] || { rit: 0, bcm: 0, loss: 0 }; t.rit += r; t.bcm += b;
      const mm = normMat(h.material); const pm = perMat[mm] = perMat[mm] || { rit: 0, bcm: 0 }; pm.rit += r; pm.bcm += b;
      const ck = matClass(h.material);
      const pc = perClass[ck] = perClass[ck] || { key: ck, label: CLASS_LABEL[ck], rit: 0, bcm: 0, sub: {} };
      pc.rit += r; pc.bcm += b;
      const sb = pc.sub[mm] = pc.sub[mm] || { rit: 0, bcm: 0 }; sb.rit += r; sb.bcm += b;
      const pl = perLoader[l.loader] = perLoader[l.loader] || { rit: 0, bcm: 0 }; pl.rit += r; pl.bcm += b;
      Object.keys(h.rit || {}).sort().forEach((j) => {
        const rr = num(h.rit[j]); if (rr <= 0) return;
        detail.push([l.tanggal, "Shift " + l.shift, j, l.loader, h.hauler, mm, h.disposal || "", num(h.distance), rr, rr * f, pengawasNama(l.pengawas) || l.pengawas_nama || "", l.pengawas || ""]);
      });
    });
    const perLossCat = {};
    losses.forEach((x) => {
      const l = byId[x.loader_id]; if (!l) return;
      const d = num(x.duration); totLoss += d;
      if (perTgl[l.tanggal]) perTgl[l.tanggal].loss += d;
      const key = (x.type || "") + "|" + (x.category || "-");
      const c = perLossCat[key] = perLossCat[key] || { type: x.type, cat: x.category || "-", menit: 0, n: 0, kode: resolveCode(x.type, x.category).code || "" };
      c.menit += d; c.n += 1;
    });
    const lossRows = losses.map((x) => { const l = byId[x.loader_id] || {}; return [l.tanggal || "", "Shift " + (l.shift || ""), x.jam, l.loader || "", (x.type || "").toUpperCase(), x.category || "", num(x.duration), resolveCode(x.type, x.category).code || "", x.remark || ""]; })
      .sort((a, b) => (a[0] + a[2]).localeCompare(b[0] + b[2]));
    return { loaders, haulers, losses, totRit, totBcm, totLoss, perTgl, perMat, perLoader, perClass, perLossCat, detail, lossRows };
  }

  async function renderProduksi() {
    const D = await produksiData();
    const { totRit, totBcm, totLoss, perTgl, perMat, perLoader, perClass, perLossCat, lossRows } = D;
    const tgls = Object.keys(perTgl).sort();
    const clsRows = CLASS_ORDER.filter((k) => perClass[k]).map((k) => {
      const c = perClass[k];
      const subs = Object.keys(c.sub).sort();
      const showSub = subs.length > 1;
      const pct = totBcm > 0 ? (c.bcm / totBcm) * 100 : 0;
      return `<tr class="cls-main"><td><b>${esc(c.label)}</b></td><td class="num">${fmtNum(c.rit)}</td><td class="num"><b>${fmtNum(Math.round(c.bcm))}</b></td><td class="num">${pct.toFixed(1)}%</td></tr>`
        + (showSub ? subs.map((s) => `<tr class="cls-sub"><td>${esc(s)}</td><td class="num">${fmtNum(c.sub[s].rit)}</td><td class="num">${fmtNum(Math.round(c.sub[s].bcm))}</td><td></td></tr>`).join("") : "");
    }).join("") || `<tr><td colspan="4" class="empty">Tidak ada data pada rentang ini.</td></tr>`;
    const tipeChip = (t) => `<span class="chip ${t === "problem" ? "" : t === "idle" ? "wait" : "loss"}">${esc((t || "").toUpperCase())}</span>`;
    const cats = Object.keys(perLossCat).map((k) => perLossCat[k]).sort((a, b) => b.menit - a.menit);
    const rowsCat = cats.length ? cats.map((c) => `<tr><td>${esc(c.cat)}</td><td>${tipeChip(c.type)}</td><td>${esc(c.kode) || "—"}</td><td class="num">${fmtNum(c.n)}×</td><td class="num">${fmtNum(c.menit)}'</td></tr>`).join("")
      : `<tr><td colspan="5" class="empty">Tidak ada loss pada rentang ini.</td></tr>`;
    const rowsLoss = lossRows.length ? lossRows.map((r) => `<tr><td>${esc(fmtID(r[0]))}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${tipeChip((r[4] || "").toLowerCase())}</td><td>${esc(r[5])}</td><td class="num">${fmtNum(r[6])}'</td><td>${esc(r[8]) || "—"}</td></tr>`).join("")
      : `<tr><td colspan="7" class="empty">Tidak ada loss pada rentang ini.</td></tr>`;
    const rowsTgl = tgls.length ? tgls.map((t) => `<tr><td>${esc(fmtID(t))}</td><td class="num">${fmtNum(perTgl[t].rit)}</td><td class="num">${fmtNum(Math.round(perTgl[t].bcm))}</td><td class="num">${fmtNum(perTgl[t].loss)}'</td></tr>`).join("")
      : `<tr><td colspan="4" class="empty">Tidak ada data pada rentang ini.</td></tr>`;
    const rowsMat = Object.keys(perMat).sort().map((k) => `<tr><td>${esc(k)}</td><td class="num">${fmtNum(perMat[k].rit)}</td><td class="num">${fmtNum(Math.round(perMat[k].bcm))}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">—</td></tr>`;
    const rowsLd = Object.keys(perLoader).sort().map((k) => `<tr><td>${esc(k)}</td><td class="num">${fmtNum(perLoader[k].rit)}</td><td class="num">${fmtNum(Math.round(perLoader[k].bcm))}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">—</td></tr>`;
    const shiftOpts = `<option value="">Semua shift</option>` + state.master.shifts.map((s) => `<option value="${s.kode}" ${s.kode === state.prodShift ? "selected" : ""}>${esc(s.label)}</option>`).join("");
    app.innerHTML = `${appbar({ crumb: "Laporan Produksi" })}<div class="container">
      <div class="page-title">Laporan Produksi</div>
      <div class="toolbar">
        <div><label>Dari tanggal</label><input type="date" id="p-from" value="${state.prodFrom}"></div>
        <div><label>Sampai tanggal</label><input type="date" id="p-to" value="${state.prodTo}"></div>
        <div class="grow"><label>Shift</label><select id="p-shift">${shiftOpts}</select></div>
        <button class="btn" data-act="prod-bulan">Bulan ini</button>
        <button class="btn primary" data-act="prod-export">${icon("download", 18)} Export Excel</button>
      </div>
      <div class="dstats">
        <div class="dcard"><span class="dic blue">${icon("truck", 20)}</span><div><div class="n">${fmtNum(totRit)}</div><div class="t">Total Ritase</div></div></div>
        <div class="dcard"><span class="dic green">${icon("box", 20)}</span><div><div class="n">${fmtNum(Math.round(totBcm))}</div><div class="t">Total BCM</div></div></div>
        <div class="dcard"><span class="dic amber">${icon("clock", 20)}</span><div><div class="n">${fmtNum(totLoss)}<span class="ns">'</span></div><div class="t">Total Loss</div></div></div>
      </div>
      <div class="card sect"><div class="sect-h"><span>Per Tanggal</span><span class="chip">${tgls.length} hari</span></div><div class="sect-b">
        <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th class="num">Ritase</th><th class="num">BCM</th><th class="num">Loss</th></tr></thead><tbody>${rowsTgl}</tbody></table></div></div></div>
      <div class="card sect"><div class="sect-h"><span>Klasifikasi Material</span><span class="chip">${fmtNum(Math.round(totBcm))} BCM</span></div><div class="sect-b">
        <div class="table-wrap"><table><thead><tr><th>Klasifikasi</th><th class="num">Ritase</th><th class="num">BCM</th><th class="num">% BCM</th></tr></thead><tbody>${clsRows}</tbody>
        <tfoot><tr><td><b>TOTAL</b></td><td class="num"><b>${fmtNum(totRit)}</b></td><td class="num"><b>${fmtNum(Math.round(totBcm))}</b></td><td class="num"><b>100%</b></td></tr></tfoot></table></div></div></div>
      <div class="card sect"><div class="sect-h"><span>Per Material (rinci)</span></div><div class="sect-b">
        <div class="table-wrap"><table><thead><tr><th>Material</th><th class="num">Ritase</th><th class="num">BCM</th></tr></thead><tbody>${rowsMat}</tbody></table></div></div></div>
      <div class="card sect"><div class="sect-h"><span>Per Loader</span></div><div class="sect-b">
        <div class="table-wrap"><table><thead><tr><th>Loader</th><th class="num">Ritase</th><th class="num">BCM</th></tr></thead><tbody>${rowsLd}</tbody></table></div></div></div>
      <div class="card sect"><div class="sect-h"><span>Rekap Loss per Keterangan</span><span class="chip">${cats.length}</span></div><div class="sect-b">
        <div class="table-wrap"><table class="sortable"><thead><tr><th class="sortable">Keterangan ${sortChev}</th><th>Tipe</th><th>Kode</th><th class="sortable num" data-num="1">Kejadian ${sortChev}</th><th class="sortable num" data-num="1">Total ${sortChev}</th></tr></thead><tbody>${rowsCat}</tbody></table></div></div></div>
      <div class="card sect"><div class="sect-h"><span>Detail Loss</span><span class="chip">${lossRows.length}</span></div><div class="sect-b">
        <div class="table-wrap"><table class="sortable"><thead><tr><th class="sortable">Tanggal ${sortChev}</th><th class="sortable">Jam ${sortChev}</th><th class="sortable">Loader ${sortChev}</th><th>Tipe</th><th class="sortable">Keterangan ${sortChev}</th><th class="sortable num" data-num="1">Durasi ${sortChev}</th><th>Remark</th></tr></thead><tbody>${rowsLoss}</tbody></table></div></div></div>
      <div class="hint">Sumber data: ${Store.mode === "supabase" ? "database online (Supabase)" : "penyimpanan lokal browser ini"}.</div>
    </div>`;
    document.getElementById("p-from").onchange = (e) => { state.prodFrom = e.target.value; renderProduksi(); };
    document.getElementById("p-to").onchange = (e) => { state.prodTo = e.target.value; renderProduksi(); };
    document.getElementById("p-shift").onchange = (e) => { state.prodShift = e.target.value; renderProduksi(); };
  }

  /* Export Laporan Produksi → 1 file Excel, 5 sheet. */
  async function exportProduksi() {
    if (!window.XLSX) { toast("Library Excel belum termuat"); return; }
    const D = await produksiData();
    if (!D.loaders.length) { toast("Tidak ada data pada rentang ini"); return; }
    const R = (n) => Math.round(n * 100) / 100;
    const shiftLbl = state.prodShift ? "Shift " + state.prodShift : "Semua shift";
    const wb = XLSX.utils.book_new();
    const add = (nama, aoa) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), nama);

    add("Ringkasan", [
      ["LAPORAN PRODUKSI — CCR"], [CFG.COMPANY], [],
      ["Periode", fmtID(state.prodFrom) + " s/d " + fmtID(state.prodTo)],
      ["Shift", shiftLbl],
      ["Dibuat oleh", (state.user && state.user.nama) || ""],
      ["Dibuat pada", new Date().toLocaleString("id-ID")], [],
      ["Total Ritase", D.totRit],
      ["Total BCM", R(D.totBcm)],
      ["Total Loss (menit)", D.totLoss],
      ["Jumlah hari", Object.keys(D.perTgl).length],
      ["Jumlah loader", D.loaders.length],
    ]);

    const tgls = Object.keys(D.perTgl).sort();
    add("Per Tanggal", [["Tanggal", "Ritase", "BCM", "Loss (menit)"]]
      .concat(tgls.map((t) => [t, D.perTgl[t].rit, R(D.perTgl[t].bcm), D.perTgl[t].loss]))
      .concat([["TOTAL", D.totRit, R(D.totBcm), D.totLoss]]));

    const clsAoa = [["Klasifikasi", "Material", "Ritase", "BCM", "% BCM"]];
    CLASS_ORDER.filter((k) => D.perClass[k]).forEach((k) => {
      const c = D.perClass[k];
      clsAoa.push([c.label, "", c.rit, R(c.bcm), D.totBcm > 0 ? R((c.bcm / D.totBcm) * 100) : 0]);
      Object.keys(c.sub).sort().forEach((s) => clsAoa.push(["", s, c.sub[s].rit, R(c.sub[s].bcm), ""]));
    });
    clsAoa.push(["TOTAL", "", D.totRit, R(D.totBcm), 100]);
    add("Klasifikasi Material", clsAoa);

    add("Per Material", [["Material", "Ritase", "BCM"]]
      .concat(Object.keys(D.perMat).sort().map((k) => [k, D.perMat[k].rit, R(D.perMat[k].bcm)]))
      .concat([["TOTAL", D.totRit, R(D.totBcm)]]));

    add("Per Loader", [["Loader", "Ritase", "BCM"]]
      .concat(Object.keys(D.perLoader).sort().map((k) => [k, D.perLoader[k].rit, R(D.perLoader[k].bcm)]))
      .concat([["TOTAL", D.totRit, R(D.totBcm)]]));

    add("Detail Ritase", [["Tanggal", "Shift", "Jam", "Loader", "Hauler", "Material", "Disposal", "Jarak (m)", "Ritase", "BCM", "Pengawas", "NRP"]]
      .concat(D.detail.map((r) => r.slice(0, 9).concat([R(r[9]), r[10], r[11]]))));

    const cats = Object.keys(D.perLossCat).map((k) => D.perLossCat[k]).sort((a, b) => b.menit - a.menit);
    add("Rekap Loss", [["Keterangan", "Tipe", "Kode SS6", "Kejadian", "Total (menit)"]]
      .concat(cats.map((c) => [c.cat, (c.type || "").toUpperCase(), c.kode, c.n, c.menit]))
      .concat([["TOTAL", "", "", cats.reduce((a, c) => a + c.n, 0), D.totLoss]]));

    add("Detail Loss", [["Tanggal", "Shift", "Jam", "Loader", "Tipe", "Keterangan", "Durasi (menit)", "Kode SS6", "Remark"]]
      .concat(D.lossRows));

    XLSX.writeFile(wb, `Laporan_Produksi_${state.prodFrom}_sd_${state.prodTo}.xlsx`);
    toast("Laporan diunduh");
  }

  /* ---------- GAIN & LOSS (waterfall: MOHH → Loss → EWH → BCM) ----------
     MOHH   = jam tersedia (tiap jam pada shift = 60 menit)
     Loss   = delay + idle + breakdown (menit, dari input CCR)
     EWH    = MOHH - Loss
     Plan   = plan produktivitas (BCM/jam) × MOHH
     Time Loss (BCM)      = plan/jam × Loss(jam)          → kehilangan karena waktu
     Prod Gain/Loss (BCM) = Actual - (plan/jam × EWH)     → selisih produktivitas
     Total  = Actual - Plan  ( = Prod Gain/Loss - Time Loss ) */
  const matGroup = (m) => (/ore/i.test(String(m || "")) ? "ore" : "ob");
  function planPdty(loader, material) {
    const g = matGroup(material);
    const u = (CFG.PLAN_PDTY_UNIT || {})[loader];
    if (u && u[g] != null) return num(u[g]);
    const model = (CFG.UNIT_MODEL || {})[loader];
    const pm = (CFG.PLAN_PDTY_MODEL || {})[model];
    return pm && pm[g] != null ? num(pm[g]) : 0;
  }
  async function gainLossData() {
    const { loaders, haulers, losses } = await Store.listRange(state.prodFrom, state.prodTo, state.prodShift);
    const byId = {}; loaders.forEach((l) => (byId[l.id] = l));
    // loss per loader per jam (menit)
    const lossLJ = {};
    losses.forEach((x) => { const lj = lossLJ[x.loader_id] = lossLJ[x.loader_id] || {}; lj[x.jam] = (lj[x.jam] || 0) + num(x.duration); });
    // ritase & material dominan per loader per jam
    const ritLJ = {}, matLJ = {};
    haulers.forEach((h) => {
      const l = byId[h.loader_id]; if (!l) return;
      const f = bcmPerRit(l.loader, h.material);
      Object.keys(h.rit || {}).forEach((j) => {
        const r = num(h.rit[j]); if (r <= 0) return;
        (ritLJ[h.loader_id] = ritLJ[h.loader_id] || {})[j] = ((ritLJ[h.loader_id] || {})[j] || 0) + r * f;
        const mm = (matLJ[h.loader_id] = matLJ[h.loader_id] || {}); mm[j] = mm[j] || {}; mm[j][h.material] = (mm[j][h.material] || 0) + r;
      });
    });
    const perPC = {}, hourly = [];
    loaders.forEach((l) => {
      const jams = String(l.shift) === "2" ? state.master.jam_shift2 : state.master.jam_shift1;
      const rj = ritLJ[l.id] || {}, lj = lossLJ[l.id] || {}, mj = matLJ[l.id] || {};
      jams.forEach((j) => {
        const actual = num(rj[j]);
        const lossMin = Math.min(60, num(lj[j]));
        const matsAtJ = mj[j] || {};
        const domMat = Object.keys(matsAtJ).sort((a, b) => matsAtJ[b] - matsAtJ[a])[0] || "OB";
        const pp = planPdty(l.loader, domMat);
        const ewhH = (60 - lossMin) / 60, mohhH = 1;
        const planBcm = pp * mohhH;
        const timeLoss = pp * (lossMin / 60);
        const prodVar = actual - pp * ewhH;
        const p = perPC[l.loader] = perPC[l.loader] || { unit: l.loader, model: (CFG.UNIT_MODEL || {})[l.loader] || "-", pp, mohh: 0, loss: 0, ewh: 0, plan: 0, actual: 0, timeLoss: 0, prodVar: 0 };
        p.pp = pp; p.mohh += mohhH; p.loss += lossMin / 60; p.ewh += ewhH;
        p.plan += planBcm; p.actual += actual; p.timeLoss += timeLoss; p.prodVar += prodVar;
        hourly.push({ tanggal: l.tanggal, shift: l.shift, jam: j, unit: l.loader, mat: domMat, pp, lossMin, ewhH, planBcm, actual, timeLoss, prodVar, total: actual - planBcm });
      });
    });
    // ---- Plan vs Actual: Idle / Delay / Breakdown ----
    // Actual dikelompokkan per kode SS6; plan diskalakan ke MOHH yang tercatat.
    const mohhTotalH = Object.keys(perPC).reduce((a, k) => a + perPC[k].mohh, 0);
    const grupOf = (type, code) => (String(code).toUpperCase() === "B01" ? "breakdown" : type === "idle" ? "idle" : "delay");
    const actByCode = {};
    losses.forEach((x) => {
      const l = byId[x.loader_id]; if (!l) return;
      const code = (resolveCode(x.type, x.category).code || "").split(",")[0].trim().toUpperCase();
      const key = code || ("~" + (x.category || "-"));
      const a = actByCode[key] = actByCode[key] || { code, label: x.category || "-", grup: grupOf(x.type, code), menit: 0, n: 0 };
      a.menit += num(x.duration); a.n += 1;
    });
    const planRows = (CFG.LOSS_PLAN || []).map((p) => {
      const perDay = p.perDay != null ? p.perDay : (p.perWeek || 0) / 7;
      const planMnt = perDay * (mohhTotalH / 24);
      const act = actByCode[p.code];
      if (act) act.__planned = true;
      return { code: p.code, label: p.label, grup: p.grup, plan: planMnt, actual: act ? act.menit : 0, n: act ? act.n : 0 };
    });
    // loss aktual yang tak ada di plan
    Object.keys(actByCode).forEach((k) => { const a = actByCode[k]; if (a.__planned) return; planRows.push({ code: a.code || "—", label: a.label, grup: a.grup, plan: 0, actual: a.menit, n: a.n, extra: true }); });
    const planSum = { breakdown: { plan: 0, actual: 0 }, idle: { plan: 0, actual: 0 }, delay: { plan: 0, actual: 0 } };
    planRows.forEach((r) => { const s = planSum[r.grup] || planSum.delay; s.plan += r.plan; s.actual += r.actual; });

    const list = Object.keys(perPC).sort().map((k) => { const p = perPC[k]; p.total = p.actual - p.plan; p.actProd = p.ewh > 0 ? p.actual / p.ewh : 0; return p; });
    const T = list.reduce((a, p) => ({ mohh: a.mohh + p.mohh, loss: a.loss + p.loss, ewh: a.ewh + p.ewh, plan: a.plan + p.plan, actual: a.actual + p.actual, timeLoss: a.timeLoss + p.timeLoss, prodVar: a.prodVar + p.prodVar }), { mohh: 0, loss: 0, ewh: 0, plan: 0, actual: 0, timeLoss: 0, prodVar: 0 });
    T.total = T.actual - T.plan;
    return { list, T, hourly, loaders, planRows, planSum };
  }
  async function renderGainLoss() {
    if (!state.prodFrom) { state.prodFrom = state.tanggal; state.prodTo = state.tanggal; state.prodShift = ""; }
    const { list, T, hourly, planRows, planSum } = await gainLossData();
    const R1 = (n) => (Math.round(n * 10) / 10).toLocaleString("id-ID");
    const sign = (n) => (n >= 0 ? "+" : "") + R1(n);
    const cls = (n) => (n >= 0 ? "gl-up" : "gl-dn");
    const rows = list.length ? list.map((p) => `<tr>
        <td><b>${esc(p.unit)}</b><div class="hint" style="margin:0">${esc(p.model)}</div></td>
        <td class="num">${R1(p.mohh)}</td><td class="num">${R1(p.loss)}</td><td class="num">${R1(p.ewh)}</td>
        <td class="num">${R1(p.pp)}</td><td class="num">${R1(p.actProd)}</td>
        <td class="num">${R1(p.plan)}</td><td class="num">${R1(p.actual)}</td>
        <td class="num gl-dn">−${R1(p.timeLoss)}</td>
        <td class="num ${cls(p.prodVar)}">${sign(p.prodVar)}</td>
        <td class="num ${cls(p.total)}"><b>${sign(p.total)}</b></td></tr>`).join("")
      : `<tr><td colspan="11" class="empty">Tidak ada data pada rentang ini.</td></tr>`;
    const hRows = hourly.filter((h) => h.actual > 0 || h.lossMin > 0).sort((a, b) => (a.tanggal + a.jam + a.unit).localeCompare(b.tanggal + b.jam + b.unit)).slice(0, 400)
      .map((h) => `<tr><td>${esc(fmtID(h.tanggal))}</td><td>${esc(h.jam)}</td><td>${esc(h.unit)}</td><td>${esc(normMat(h.mat))}</td>
        <td class="num">${R1(h.pp)}</td><td class="num">${h.lossMin}'</td><td class="num">${R1(h.planBcm)}</td><td class="num">${R1(h.actual)}</td>
        <td class="num ${cls(h.total)}">${sign(h.total)}</td></tr>`).join("") || `<tr><td colspan="9" class="empty">—</td></tr>`;
    const shiftOpts = `<option value="">Semua shift</option>` + state.master.shifts.map((s) => `<option value="${s.kode}" ${s.kode === state.prodShift ? "selected" : ""}>${esc(s.label)}</option>`).join("");
    // ---- Plan vs Actual (idle/delay/breakdown) ----
    const GRP = [["breakdown", "Breakdown"], ["idle", "Idle"], ["delay", "Delay"]];
    let totPlanM = 0, totActM = 0;
    const pvaRows = GRP.map(([g, gl]) => {
      const rows = planRows.filter((r) => r.grup === g).sort((a, b) => b.actual - a.actual || b.plan - a.plan);
      if (!rows.length) return "";
      const s = planSum[g] || { plan: 0, actual: 0 };
      totPlanM += s.plan; totActM += s.actual;
      const dS = s.actual - s.plan;
      const head = `<tr class="cls-main"><td><b>${gl}</b></td><td></td><td class="num"><b>${R1(s.plan / 60)}</b></td><td class="num"><b>${R1(s.actual / 60)}</b></td><td class="num ${dS <= 0 ? "gl-up" : "gl-dn"}"><b>${sign(dS / 60)}</b></td><td>${dS <= 0 ? '<span class="chip ok">di bawah plan</span>' : '<span class="chip loss">lewat plan</span>'}</td></tr>`;
      const body = rows.map((r) => {
        const d = r.actual - r.plan;
        return `<tr class="cls-sub"><td>${esc(r.label)}${r.extra ? ' <span class="chip wait">tanpa plan</span>' : ""}</td><td>${esc(r.code)}</td><td class="num">${R1(r.plan / 60)}</td><td class="num">${R1(r.actual / 60)}</td><td class="num ${d <= 0 ? "gl-up" : "gl-dn"}">${sign(d / 60)}</td><td>${r.n ? r.n + "×" : "—"}</td></tr>`;
      }).join("");
      return head + body;
    }).join("") || `<tr><td colspan="6" class="empty">Tidak ada data pada rentang ini.</td></tr>`;
    // waterfall bar sederhana
    const maxV = Math.max(T.plan, T.actual, 1);
    const wf = `<div class="wf">
      <div class="wf-row"><span class="wf-l">Plan (MOHH)</span><span class="wf-b"><i style="width:${(T.plan / maxV) * 100}%;background:var(--muted)"></i></span><span class="wf-v">${R1(T.plan)}</span></div>
      <div class="wf-row"><span class="wf-l">Time Loss</span><span class="wf-b"><i style="width:${(T.timeLoss / maxV) * 100}%;background:#ffcc00"></i></span><span class="wf-v gl-dn">−${R1(T.timeLoss)}</span></div>
      <div class="wf-row"><span class="wf-l">Produktivitas</span><span class="wf-b"><i style="width:${(Math.abs(T.prodVar) / maxV) * 100}%;background:${T.prodVar >= 0 ? "#34c759" : "var(--danger)"}"></i></span><span class="wf-v ${cls(T.prodVar)}">${sign(T.prodVar)}</span></div>
      <div class="wf-row"><span class="wf-l">Actual</span><span class="wf-b"><i style="width:${(T.actual / maxV) * 100}%;background:var(--primary)"></i></span><span class="wf-v">${R1(T.actual)}</span></div>
    </div>`;
    app.innerHTML = `${appbar({ crumb: "Gain & Loss" })}<div class="container">
      <div class="page-title">Gain &amp; Loss (BCM)</div>
      <div class="toolbar">
        <div><label>Dari tanggal</label><input type="date" id="g-from" value="${state.prodFrom}"></div>
        <div><label>Sampai tanggal</label><input type="date" id="g-to" value="${state.prodTo}"></div>
        <div class="grow"><label>Shift</label><select id="g-shift">${shiftOpts}</select></div>
        <button class="btn primary" data-act="gl-export">${icon("download", 18)} Export Excel</button>
      </div>
      <div class="dstats">
        <div class="dcard"><span class="dic blue">${icon("box", 20)}</span><div><div class="n">${R1(T.plan)}</div><div class="t">Plan BCM (MOHH)</div></div></div>
        <div class="dcard"><span class="dic green">${icon("truck", 20)}</span><div><div class="n">${R1(T.actual)}</div><div class="t">Actual BCM</div></div></div>
        <div class="dcard"><span class="dic ${T.total >= 0 ? "green" : "amber"}">${icon("clock", 20)}</span><div><div class="n ${cls(T.total)}">${sign(T.total)}</div><div class="t">Total Gain / Loss</div></div></div>
      </div>
      <div class="card sect"><div class="sect-h"><span>Waterfall</span><span class="chip">${R1(T.mohh)} jam MOHH · ${R1(T.ewh)} jam EWH</span></div><div class="sect-b">${wf}</div></div>
      <div class="card sect"><div class="sect-h"><span>Per PC (Unit)</span><span class="chip">${list.length}</span></div><div class="sect-b">
        <div class="table-wrap"><table><thead><tr><th>Unit</th><th class="num">MOHH<br><small>jam</small></th><th class="num">Loss<br><small>jam</small></th><th class="num">EWH<br><small>jam</small></th><th class="num">Plan<br><small>BCM/jam</small></th><th class="num">Actual<br><small>BCM/jam</small></th><th class="num">Plan<br><small>BCM</small></th><th class="num">Actual<br><small>BCM</small></th><th class="num">Time Loss<br><small>BCM</small></th><th class="num">Prod. G/L<br><small>BCM</small></th><th class="num">Total G/L<br><small>BCM</small></th></tr></thead><tbody>${rows}</tbody></table></div></div></div>
      <div class="card sect"><div class="sect-h"><span>Plan vs Actual — Idle / Delay / Breakdown</span><span class="chip">jam</span></div><div class="sect-b">
        <div class="table-wrap"><table><thead><tr><th>Keterangan</th><th>Kode</th><th class="num">Plan</th><th class="num">Actual</th><th class="num">Selisih</th><th>Status</th></tr></thead><tbody>${pvaRows}</tbody>
        <tfoot><tr><td><b>TOTAL</b></td><td></td><td class="num"><b>${R1(totPlanM / 60)}</b></td><td class="num"><b>${R1(totActM / 60)}</b></td><td class="num ${totActM - totPlanM <= 0 ? "gl-up" : "gl-dn"}"><b>${sign((totActM - totPlanM) / 60)}</b></td><td></td></tr></tfoot></table></div>
        <div class="hint">Plan diskalakan ke MOHH yang tercatat (${R1(T.mohh)} jam). <b>Selisih negatif = lebih baik dari plan</b> (loss lebih sedikit).</div></div></div>
      <div class="card sect"><div class="sect-h"><span>Detail per Jam</span><span class="chip">${hourly.filter((h) => h.actual > 0 || h.lossMin > 0).length}</span></div><div class="sect-b">
        <div class="table-wrap"><table class="sortable"><thead><tr><th class="sortable">Tanggal ${sortChev}</th><th class="sortable">Jam ${sortChev}</th><th class="sortable">Unit ${sortChev}</th><th>Material</th><th class="num">Plan/jam</th><th class="num">Loss</th><th class="num">Plan BCM</th><th class="num">Actual BCM</th><th class="sortable num" data-num="1">Gain/Loss ${sortChev}</th></tr></thead><tbody>${hRows}</tbody></table></div>
        <div class="hint">MOHH tiap jam = 60 menit. EWH = 60 − (delay + idle + breakdown). Jam tanpa input dihitung sebagai kehilangan waktu.</div></div></div>
    </div>`;
    document.getElementById("g-from").onchange = (e) => { state.prodFrom = e.target.value; renderGainLoss(); };
    document.getElementById("g-to").onchange = (e) => { state.prodTo = e.target.value; renderGainLoss(); };
    document.getElementById("g-shift").onchange = (e) => { state.prodShift = e.target.value; renderGainLoss(); };
  }
  async function exportGainLoss() {
    if (!window.XLSX) { toast("Library Excel belum termuat"); return; }
    const dataPVA = await gainLossData();
    const { list, T, hourly } = dataPVA;
    if (!list.length) { toast("Tidak ada data pada rentang ini"); return; }
    const R = (n) => Math.round(n * 100) / 100;
    const wb = XLSX.utils.book_new();
    const add = (n, aoa) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n);
    add("Ringkasan", [["GAIN & LOSS (BCM) — CCR"], [CFG.COMPANY], [],
      ["Periode", fmtID(state.prodFrom) + " s/d " + fmtID(state.prodTo)],
      ["Shift", state.prodShift ? "Shift " + state.prodShift : "Semua shift"], [],
      ["MOHH (jam)", R(T.mohh)], ["Loss (jam)", R(T.loss)], ["EWH (jam)", R(T.ewh)], [],
      ["Plan BCM (MOHH)", R(T.plan)], ["Time Loss (BCM)", -R(T.timeLoss)], ["Produktivitas (BCM)", R(T.prodVar)], ["Actual BCM", R(T.actual)],
      ["TOTAL GAIN/LOSS (BCM)", R(T.total)]]);
    add("Per PC", [["Unit", "Model", "MOHH (jam)", "Loss (jam)", "EWH (jam)", "Plan (BCM/jam)", "Actual (BCM/jam)", "Plan BCM", "Actual BCM", "Time Loss (BCM)", "Prod Gain/Loss (BCM)", "Total Gain/Loss (BCM)"]]
      .concat(list.map((p) => [p.unit, p.model, R(p.mohh), R(p.loss), R(p.ewh), R(p.pp), R(p.actProd), R(p.plan), R(p.actual), -R(p.timeLoss), R(p.prodVar), R(p.total)]))
      .concat([["TOTAL", "", R(T.mohh), R(T.loss), R(T.ewh), "", "", R(T.plan), R(T.actual), -R(T.timeLoss), R(T.prodVar), R(T.total)]]));
    const gl2 = { breakdown: "Breakdown", idle: "Idle", delay: "Delay" };
    const pva = [["Grup", "Keterangan", "Kode", "Plan (jam)", "Actual (jam)", "Selisih (jam)", "Kejadian"]];
    ["breakdown", "idle", "delay"].forEach((g) => {
      const rows = (dataPVA.planRows || []).filter((r) => r.grup === g).sort((a, b) => b.actual - a.actual);
      if (!rows.length) return;
      const s = dataPVA.planSum[g];
      pva.push([gl2[g], "SUBTOTAL", "", R(s.plan / 60), R(s.actual / 60), R((s.actual - s.plan) / 60), ""]);
      rows.forEach((r) => pva.push(["", r.label, r.code, R(r.plan / 60), R(r.actual / 60), R((r.actual - r.plan) / 60), r.n || 0]));
    });
    add("Plan vs Actual Loss", pva);

    add("Per Jam", [["Tanggal", "Shift", "Jam", "Unit", "Material", "Plan (BCM/jam)", "Loss (menit)", "EWH (jam)", "Plan BCM", "Actual BCM", "Time Loss (BCM)", "Prod G/L (BCM)", "Total G/L (BCM)"]]
      .concat(hourly.map((h) => [h.tanggal, "Shift " + h.shift, h.jam, h.unit, normMat(h.mat), R(h.pp), h.lossMin, R(h.ewhH), R(h.planBcm), R(h.actual), -R(h.timeLoss), R(h.prodVar), R(h.total)])));
    XLSX.writeFile(wb, `Gain_Loss_${state.prodFrom}_sd_${state.prodTo}.xlsx`);
    toast("Laporan Gain & Loss diunduh");
  }

  /* ---------- IMPORT DATA HPR / ORE ---------- */
  // kode SS6 → label kategori di app (kebalikan APP_TO_CODE)
  function labelForCode(type, code) {
    if (!code) return "";
    const c = String(code).split(",")[0].trim().toUpperCase();
    const tbl = (window.SS6_CODES && window.SS6_CODES.APP_TO_CODE && window.SS6_CODES.APP_TO_CODE[type]) || {};
    const hit = Object.keys(tbl).find((k) => tbl[k] === c);
    if (hit) return hit;
    const dict = type === "idle" ? (window.SS6_CODES || {}).IDLE : type === "delay" ? (window.SS6_CODES || {}).DELAY : (window.SS6_CODES || {}).PDTY;
    return (dict && dict[c]) || c;
  }
  const toISO = (v) => {
    if (v == null || v === "") return "";
    if (v instanceof Date) { const p = (n) => String(n).padStart(2, "0"); return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`; }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); // M/D/YY (format SS6)
    if (m) { let y = +m[3]; if (y < 100) y += 2000; const p = (n) => String(n).padStart(2, "0"); return `${y}-${p(+m[1])}-${p(+m[2])}`; }
    if (typeof v === "number" && v > 20000) { const d = new Date(Date.UTC(1899, 11, 30 + v)); const p = (n) => String(n).padStart(2, "0"); return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`; }
    return "";
  };
  const jamKey = (v) => { const s = String(v == null ? "" : v).trim(); const m = s.match(/(\d{1,2})[:.]/) || s.match(/^(\d{1,2})$/); return m ? String(m[1]).padStart(2, "0") + ".00" : ""; };
  const shiftOfJam = (j) => (parseInt(j, 10) >= 7 && parseInt(j, 10) <= 18 ? "1" : "2");

  function parseImport(wb) {
    const pack = { loaders: [], haulers: [], losses: [] }, lmap = {}, hmap = {}, lossSeen = {};
    let kind = "", rows = 0, skipped = 0;
    const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();
    for (const sname of wb.SheetNames) {
      const ws = wb.Sheets[sname];
      if (!ws || !ws["!ref"]) continue;
      // Deteksi header TANPA mengonversi seluruh sheet (hemat memori pada workbook besar).
      const rg = XLSX.utils.decode_range(ws["!ref"]);
      const lastC = Math.min(rg.e.c, rg.s.c + 80);
      const rowAt = (r) => { const o = []; for (let c = rg.s.c; c <= lastC; c++) { const cl = ws[XLSX.utils.encode_cell({ r, c })]; o.push(norm(cl ? (cl.w != null ? cl.w : cl.v) : "")); } return o; };
      let hr = -1, isHPR = false, isORE = false;
      for (let i = rg.s.r; i < Math.min(rg.s.r + 8, rg.e.r + 1); i++) {
        const r = rowAt(i);
        if (r.includes("id_hpr") || (r.includes("ritasi") && r.includes("loader"))) { hr = i; isHPR = true; break; }
        if (r.includes("ritase") && (r.includes("activity") || r.includes("tonnage"))) { hr = i; isORE = true; break; }
      }
      if (hr < 0) continue; // sheet tak relevan → lewati tanpa konversi
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", range: hr });
      if (!aoa.length) continue;
      hr = 0; // setelah range:hr, header ada di baris 0
      const H = aoa[hr].map(norm);
      const ix = (...names) => { for (const n of names) { const k = H.indexOf(n); if (k >= 0) return k; } return -1; };
      const cT = ix("tanggal"), cJam = ix("jam", "time"), cLd = ix("loader"), cHl = ix("hauler"),
        cMat = ix("material", "activity"), cDis = ix("dispo", "disposal", "dump"), cDist = ix("distance"),
        cRit = ix("ritasi", "ritase"), cPeng = ix("pengawas"), cPit = ix("pit"), cGrade = ix("grade"),
        cIdle = ix("idledelay", "idle"), cIdleC = ix("idledelay_code", "kode idle"), cDelay = ix("delay"), cDelayC = ix("kode delay"),
        cPT = ix("prdty_problem_time", "pdty"), cPC = ix("prdty_problem_code", "kode pdty"), cRem = ix("remark"), cShift = ix("shift");
      if (cT < 0 || cLd < 0 || cRit < 0) continue;
      kind = kind ? (kind === (isHPR ? "HPR" : "ORE") ? kind : "HPR+ORE") : (isHPR ? "HPR" : "ORE");
      for (let i = hr + 1; i < aoa.length; i++) {
        const r = aoa[i]; if (!r || !r.length) continue;
        const tgl = toISO(r[cT]), loader = String(r[cLd] || "").trim().toUpperCase();
        if (!tgl || !loader) { if (String(r[cT] || "").trim()) skipped++; continue; }
        const jam = jamKey(r[cJam]); if (!jam) { skipped++; continue; }
        let shift = cShift >= 0 ? String(r[cShift] || "").trim() : "";
        shift = /night|2/i.test(shift) ? "2" : /day|1/i.test(shift) ? "1" : shiftOfJam(jam);
        const lk = tgl + "|" + shift + "|" + loader;
        if (!lmap[lk]) {
          lmap[lk] = true;
          const nrp = cPeng >= 0 ? String(r[cPeng] || "").trim() : "";
          pack.loaders.push({ _k: lk, tanggal: tgl, shift, loader, pengawas: nrp, pengawas_nama: pengawasNama(nrp), pit: String((r[cPit] || "")).replace(/^PIT\s+/i, "").trim() || "MYARA", area: "", gl_pit: pengawasNama(nrp), gl_road: "", gl_disposal: "" });
        }
        const hauler = String(r[cHl] || "").trim().toUpperCase();
        const mat = String(r[cMat] || "").trim(), disp = String(r[cDis] || "").trim();
        const rit = num(r[cRit]);
        if (hauler && rit > 0) {
          const hk = lk + "|" + hauler + "|" + mat + "|" + disp;
          let h = hmap[hk];
          if (!h) { h = hmap[hk] = { _lk: lk, hauler, material: mat, disposal: disp, distance: cDist >= 0 ? num(r[cDist]) : 0, grade: cGrade >= 0 ? String(r[cGrade] || "").trim() : "", rit: {} }; pack.haulers.push(h); }
          h.rit[jam] = (h.rit[jam] || 0) + rit;
        }
        // losses — 1x per (loader,jam) walau baris berulang
        const remark = cRem >= 0 ? String(r[cRem] || "").trim() : "";
        const addLoss = (type, dur, code) => {
          if (!(dur > 0)) return;
          const key = lk + "|" + jam + "|" + type + "|" + (code || "");
          if (lossSeen[key]) return; lossSeen[key] = 1;
          pack.losses.push({ _lk: lk, jam, type, category: labelForCode(type, code) || (type === "problem" ? "Problem" : type === "idle" ? "Idle" : "Delay"), duration: dur, remark, auto: false });
        };
        if (isHPR) {
          const mnt = cIdle >= 0 ? num(r[cIdle]) : 0, code = cIdleC >= 0 ? String(r[cIdleC] || "").trim() : "";
          if (mnt > 0) addLoss(/^I/i.test(code) ? "idle" : "delay", mnt, code);
          if (cPT >= 0 && num(r[cPT]) > 0) addLoss("problem", num(r[cPT]), cPC >= 0 ? String(r[cPC] || "").trim() : "");
        } else {
          if (cDelay >= 0 && num(r[cDelay]) > 0) addLoss("delay", num(r[cDelay]), cDelayC >= 0 ? String(r[cDelayC] || "").trim() : "");
          if (cIdle >= 0 && num(r[cIdle]) > 0) addLoss("idle", num(r[cIdle]), cIdleC >= 0 ? String(r[cIdleC] || "").trim() : "");
          if (cPT >= 0 && num(r[cPT]) > 0) addLoss("problem", num(r[cPT]), cPC >= 0 ? String(r[cPC] || "").trim() : "");
        }
        rows++;
      }
    }
    const tgls = pack.loaders.map((l) => l.tanggal).sort();
    return { pack, kind: kind || "?", rows, skipped, from: tgls[0] || "", to: tgls[tgls.length - 1] || "" };
  }

  function renderImport() {
    app.innerHTML = `${appbar({ crumb: "Import Data" })}<div class="container">
      <div class="page-title">Import Data HPR / ORE</div>
      <div class="card sect"><div class="sect-h"><span>Pilih File</span></div><div class="sect-b">
        <div class="hint" style="margin:12px 0">Pilih file Excel hasil export SS6 (<b>.xlsx</b> / <b>.xlsb</b>). Format <b>HPR</b> (OB/Quarry) dan <b>ORE</b> dikenali otomatis — boleh satu file berisi keduanya.</div>
        <input type="file" id="imp-file" accept=".xlsx,.xlsb,.xls,.csv" />
        <div id="imp-out" style="margin-top:14px"></div>
      </div></div>
      <div class="card sect"><div class="sect-h"><span>Hapus Semua Data</span></div><div class="sect-b">
        <div class="hint" style="margin:12px 0">Menghapus <b>seluruh</b> data ritase, fleet, dan loss ${Store.mode === "supabase" ? "di database" : "di browser ini"}. Data Master (pengawas, material, kode) tidak ikut terhapus. <b>Tidak bisa dibatalkan.</b></div>
        <button class="btn danger" data-act="wipe-all">${icon("delete", 18)} Hapus Semua Data Ritase</button>
      </div></div>
    </div>`;
    const out = document.getElementById("imp-out");
    document.getElementById("imp-file").onchange = (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      if (!window.XLSX) { out.innerHTML = `<div class="login-err">Library Excel belum termuat.</div>`; return; }
      out.innerHTML = `<div class="hint">Membaca ${esc(f.name)}…</div>`;
      const rd = new FileReader();
      rd.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          // Baca daftar sheet dulu (ringan), lalu HANYA parse sheet yang relevan —
          // workbook besar (25 sheet) bisa menghabiskan memori kalau diparse semua.
          let wb;
          const meta = XLSX.read(data, { type: "array", bookSheets: true });
          const names = meta.SheetNames || [];
          const pref = names.filter((n) => /^(hpr|ore|upload)\b/i.test(String(n).trim()));
          if (pref.length) wb = XLSX.read(data, { type: "array", cellDates: true, sheets: pref });
          else if (names.length > 6) {
            wb = { SheetNames: [], Sheets: {} }; // sheet demi sheet agar memori aman
            for (const n of names) {
              const one = XLSX.read(data, { type: "array", cellDates: true, sheets: [n] });
              const ws = one.Sheets[n];
              if (ws && ws["!ref"]) { wb.SheetNames.push(n); wb.Sheets[n] = ws; }
            }
          } else wb = XLSX.read(data, { type: "array", cellDates: true });
          const res = parseImport(wb);
          if (!res.pack.loaders.length) { out.innerHTML = `<div class="login-err">Tidak ada baris yang bisa dibaca. Pastikan file berisi sheet HPR/ORE hasil export SS6.</div>`; return; }
          state.__imp = res;
          out.innerHTML = `<div class="card" style="margin-top:6px">
            <div style="font-weight:600;margin-bottom:10px">Siap diimpor — ${esc(res.kind)}</div>
            <div class="meta" style="display:flex;flex-wrap:wrap;gap:8px 14px">
              <span class="chip">${fmtNum(res.rows)} baris terbaca</span>
              <span class="chip ok">${fmtNum(res.pack.loaders.length)} loader-shift</span>
              <span class="chip">${fmtNum(res.pack.haulers.length)} fleet</span>
              <span class="chip loss">${fmtNum(res.pack.losses.length)} loss</span>
              ${res.skipped ? `<span class="chip wait">${fmtNum(res.skipped)} baris dilewati</span>` : ""}
            </div>
            <div class="hint">Periode: <b>${esc(fmtID(res.from))}</b> s/d <b>${esc(fmtID(res.to))}</b></div>
            <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn primary" data-act="imp-go">${icon("save", 18)} Impor Sekarang</button>
              <button class="btn" data-act="imp-cancel">Batal</button>
            </div></div>`;
        } catch (err) { out.innerHTML = `<div class="login-err">Gagal membaca file: ${esc(err.message)}</div>`; }
      };
      rd.readAsArrayBuffer(f);
    };
  }

  /* ---------- SETTING ---------- */
  function renderSetting() {
    const m = state.master;
    const D = window.SS6_CODES || { PDTY: {}, IDLE: {}, DELAY: {} };
    const dl = (id, obj) => `<datalist id="${id}">${Object.keys(obj).sort().map((c) => `<option value="${esc(c)}">${esc(obj[c])}</option>`).join("")}</datalist>`;
    const codeOf = (kind, label) => { const map = kind === "problem" ? m.problem_codes : kind === "idle" ? m.idle_codes : m.delay_codes; return (map && map[label]) || (resolveCode(kind, label).code) || ""; };
    // daftar sederhana (chip) utk Material & Grade
    const chips = (kind, arr) => (arr || []).length
      ? `<div class="chiplist">${arr.map((v, i) => `<span class="mchip">${esc(v)}<button class="mx" data-act="ms-del" data-kind="${kind}" data-i="${i}" title="Hapus">${icon("close", 13)}</button></span>`).join("")}</div>`
      : `<div class="hint">Belum ada data.</div>`;
    // tabel berkode utk Problem / Idle / Delay
    const codeTable = (kind, arr) => (arr || []).length
      ? `<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Kode</th><th>Aksi</th></tr></thead><tbody>${arr.map((v, i) => `<tr><td>${esc(v)}</td><td>${esc(codeOf(kind, v)) || "—"}</td><td class="actions"><button class="iconbtn" data-act="ms-del" data-kind="${kind}" data-i="${i}" title="Hapus">${icon("delete")}</button></td></tr>`).join("")}</tbody></table></div>`
      : `<div class="hint">Belum ada data.</div>`;
    const pg = m.pengawas || [];
    app.innerHTML = `${appbar({ crumb: "Setting" })}<div class="container">
      <div class="page-head"><div class="page-title">Data Master</div>
        <div class="actions"><button class="btn" data-act="reset-master">Kembalikan Default</button></div></div>

      <div class="card sect"><div class="sect-h"><span>GL (Pengawas)</span><span class="chip">${pg.length}</span></div><div class="sect-b">
        ${pg.length ? `<div class="table-wrap"><table><thead><tr><th>Nama Pengawas</th><th>NRP</th><th>Aksi</th></tr></thead><tbody>${pg.map((p, i) => `<tr><td>${esc(p.nama)}</td><td>${esc(p.nrp)}</td><td class="actions"><button class="iconbtn" data-act="ms-del" data-kind="pengawas" data-i="${i}" title="Hapus">${icon("delete")}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="hint">Belum ada pengawas.</div>`}
        <div class="ms-form row2">
          <div><label>Nama Pengawas</label><input id="f-pg-nama" placeholder="cth: Abdul Gafar" /></div>
          <div><label>NRP</label><input id="f-pg-nrp" inputmode="numeric" placeholder="cth: 17052197" /></div>
        </div>
        <button class="btn primary sm" data-act="ms-add" data-kind="pengawas">${icon("add", 16)} Tambah Pengawas</button>
      </div></div>

      <div class="card sect"><div class="sect-h"><span>Material</span><span class="chip">${(m.materials || []).length}</span></div><div class="sect-b">
        ${chips("materials", m.materials)}
        <div class="ms-form"><div><label>Material</label><input id="f-mat" placeholder="cth: Quarry Inpit" /></div></div>
        <button class="btn primary sm" data-act="ms-add" data-kind="materials">${icon("add", 16)} Tambah Material</button>
      </div></div>

      <div class="card sect"><div class="sect-h"><span>Problem</span><span class="chip">${(m.problems || []).length}</span></div><div class="sect-b">
        ${codeTable("problem", m.problems)}
        <div class="ms-form row2">
          <div><label>Problem</label><input id="f-prb" placeholder="cth: Pindah Front" /></div>
          <div><label>Kode</label><input id="f-prb-kode" list="dl-pdty" placeholder="cth: P27" /></div>
        </div>
        <button class="btn primary sm" data-act="ms-add" data-kind="problem">${icon("add", 16)} Tambah Problem</button>
      </div></div>

      <div class="card sect"><div class="sect-h"><span>Idle / Delay</span><span class="chip">${(m.idle || []).length + (m.delay || []).length}</span></div><div class="sect-b">
        <div class="ms-sub">Idle</div>
        ${codeTable("idle", m.idle)}
        <div class="ms-form row2">
          <div><label>Idle</label><input id="f-idl" placeholder="cth: Hujan" /></div>
          <div><label>Kode</label><input id="f-idl-kode" list="dl-idle" placeholder="cth: I01" /></div>
        </div>
        <button class="btn primary sm" data-act="ms-add" data-kind="idle">${icon("add", 16)} Tambah Idle</button>
        <div class="ms-sub" style="margin-top:18px">Delay</div>
        ${codeTable("delay", m.delay)}
        <div class="ms-form row2">
          <div><label>Delay</label><input id="f-dly" placeholder="cth: Meal & Break" /></div>
          <div><label>Kode</label><input id="f-dly-kode" list="dl-delay" placeholder="cth: D09" /></div>
        </div>
        <button class="btn primary sm" data-act="ms-add" data-kind="delay">${icon("add", 16)} Tambah Delay</button>
      </div></div>

      <div class="card sect"><div class="sect-h"><span>Grade Ore</span><span class="chip">${(m.grades || []).length}</span></div><div class="sect-b">
        ${chips("grades", m.grades)}
        <div class="ms-form"><div><label>Grade Ore</label><input id="f-grd" placeholder="cth: SAP3-SSP" /></div></div>
        <button class="btn primary sm" data-act="ms-add" data-kind="grades">${icon("add", 16)} Tambah Grade</button>
      </div></div>

      <div class="card sect"><div class="sect-h"><span>Disposal / Dump</span><span class="chip">${(m.disposals || []).length}</span></div><div class="sect-b">
        ${chips("disposals", m.disposals)}
        <div class="ms-form"><div><label>Disposal / Dump</label><input id="f-dsp" placeholder="cth: Disposal Balado" /></div></div>
        <button class="btn primary sm" data-act="ms-add" data-kind="disposals">${icon("add", 16)} Tambah Disposal</button>
      </div></div>

      <div class="card sect"><div class="sect-h"><span>Lokasi</span><span class="chip">${(m.areas || []).length + (m.pits || []).length}</span></div><div class="sect-b">
        <div class="ms-sub">Area</div>${chips("areas", m.areas)}
        <div class="ms-form"><div><label>Area</label><input id="f-area" placeholder="cth: BAHODOPI BLOCK 1" /></div></div>
        <button class="btn primary sm" data-act="ms-add" data-kind="areas">${icon("add", 16)} Tambah Area</button>
        <div class="ms-sub" style="margin-top:18px">PIT</div>${chips("pits", m.pits)}
        <div class="ms-form"><div><label>PIT</label><input id="f-pit" placeholder="cth: MYARA" /></div></div>
        <button class="btn primary sm" data-act="ms-add" data-kind="pits">${icon("add", 16)} Tambah PIT</button>
      </div></div>
      ${dl("dl-pdty", D.PDTY)}${dl("dl-idle", D.IDLE)}${dl("dl-delay", D.DELAY)}
    </div>`;
  }
  const MS_SIMPLE = { materials: "f-mat", grades: "f-grd", disposals: "f-dsp", areas: "f-area", pits: "f-pit" };
  async function msAdd(kind) {
    const m = state.master, $ = (id) => document.getElementById(id);
    const val = (id) => ($(id) ? $(id).value.trim() : "");
    if (kind === "pengawas") {
      const nama = val("f-pg-nama"), nrp = val("f-pg-nrp");
      if (!nama || !nrp) { toast("Isi Nama Pengawas & NRP"); return; }
      m.pengawas = m.pengawas || [];
      if (m.pengawas.some((p) => p.nrp === nrp)) { toast("NRP sudah ada"); return; }
      m.pengawas.push({ nrp, nama });
    } else if (kind === "problem" || kind === "idle" || kind === "delay") {
      const idp = kind === "problem" ? "f-prb" : kind === "idle" ? "f-idl" : "f-dly";
      const nama = val(idp), kode = val(idp + "-kode").toUpperCase();
      if (!nama) { toast("Isi nama " + kind); return; }
      const listKey = kind === "problem" ? "problems" : kind;
      m[listKey] = m[listKey] || [];
      if (m[listKey].includes(nama)) { toast("Sudah ada"); return; }
      m[listKey].push(nama);
      if (kode) { const ck = kind === "problem" ? "problem_codes" : kind === "idle" ? "idle_codes" : "delay_codes"; m[ck] = m[ck] || {}; m[ck][nama] = kode; }
    } else {
      const v = val(MS_SIMPLE[kind]); if (!v) { toast("Isi dulu"); return; }
      m[kind] = m[kind] || [];
      if (m[kind].includes(v)) { toast("Sudah ada"); return; }
      m[kind].push(v);
    }
    await Store.saveMaster(m); toast("Tersimpan"); renderSetting();
  }
  async function msDel(kind, i) {
    const m = state.master;
    if (kind === "pengawas") { (m.pengawas || []).splice(i, 1); }
    else if (kind === "problem" || kind === "idle" || kind === "delay") {
      const listKey = kind === "problem" ? "problems" : kind;
      const gone = (m[listKey] || [])[i]; (m[listKey] || []).splice(i, 1);
      const ck = kind === "problem" ? "problem_codes" : kind === "idle" ? "idle_codes" : "delay_codes";
      if (gone && m[ck]) delete m[ck][gone];
    } else { (m[kind] || []).splice(i, 1); }
    await Store.saveMaster(m); toast("Dihapus"); renderSetting();
  }

  /* ---------- ACCOUNT ---------- */
  function renderAccount() {
    app.innerHTML = `${appbar({ crumb: "Account" })}<div class="container">
      <div class="page-title">Akun</div>
      <div class="card stack">
        <div><label>Nama</label><div style="font-size:17px;font-weight:600">${esc(state.user.nama)}</div></div>
        <div><label>NRP</label><div>${esc(state.user.nrp)}</div></div>
        <div><label>Mode Data</label><div>${Store.mode === "supabase" ? "ONLINE (Supabase)" : "LOKAL (browser ini)"}</div></div>
        <button class="btn danger" data-act="logout">Keluar (Logout)</button>
      </div></div>`;
  }

  /* ---------- EXPORT CSV ---------- */
  async function exportCSV() {
    const { loaders, haulers } = await Store.listAll(state.tanggal, state.shift);
    const byId = {}; loaders.forEach((l) => (byId[l.id] = l));
    const head = ["Tanggal", "Shift", "Loader", "Area", "PIT", "GL Pit", "GL Road", "GL Disposal", "Hauler", "Material", "Disposal", "Distance", "Jam", "Rit", "Volume"];
    const rows = [head];
    haulers.forEach((h) => { const l = byId[h.loader_id] || {}; Object.keys(h.rit || {}).forEach((j) => { rows.push([fmtID(l.tanggal), l.shift, l.loader, l.area, l.pit, l.gl_pit, l.gl_road, l.gl_disposal, h.hauler, h.material, h.disposal, h.distance, j, h.rit[j], num(h.rit[j]) * perRit()]); }); });
    const csv = rows.map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })); a.download = `ritase_${state.tanggal}_shift${state.shift}.csv`; a.click(); toast("CSV diunduh");
  }

  /* ---------- EXPORT SS6 (skema sheet HPR: OB / Quarry / Quarry Inpit) ----------
     Menghasilkan baris SIAP-PASTE ke sheet "HPR" pada workbook Hourly Report.
     29 kolom persis + helper. Kode P../D../I.. dari window.SS6_CODES. */
  const SS6_HPR_HEADER = ["id_hpr","tanggal","pit","jam","pengawas","loader","hauler","material","seam","elv_pit","dispo","elv_dispo","ritasi","produksi","distance","duration","idledelay","prdty_problem_time","prdty_problem_code","created_by","created_date","remark","source","idledelay_code"];
  const SS6_SOURCE = "UPLOAD WEB"; // nilai sumber yang sudah diterima report (bukan "COE APP MOBILE")
  const DISPO_MAP = { "Disposal Balado": "DSP_BALADO", "Disposal Zizi": "DSP_ZIZI", "Rompile Alkafa": "ROM_ALKAFA", "Rompile Zizi": "ROM_ZIZI", "Jalan": "JALAN MYARA" };
  const uuid4 = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 0x3) | 0x8).toString(16); });
  const jamHHMMSS = (j) => String(j).replace(".", ":") + ":00";          // "07.00" -> "07:00:00"
  const jamHour = (j) => parseInt(String(j).split(/[.:]/)[0], 10);       // "07.00" -> 7
  const normDispo = (d) => DISPO_MAP[d] || String(d || "").toUpperCase();
  const normMat = (mm) => String(mm || "").toUpperCase();
  function tsNow() { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }

  async function exportSS6_HPR() {
    if (!window.XLSX) { toast("Library Excel belum termuat"); return; }
    const codes = window.SS6_CODES;
    const { loaders, haulers, losses } = await Store.listAll(state.tanggal, state.shift);
    if (!loaders.length) { toast("Belum ada data loader di tanggal/shift ini"); return; }
    const jams = jamListFor(state.shift);
    const shiftLbl = "SHIFT " + state.shift;
    const createdBy = (state.user && state.user.nrp) || "";
    const rowsByLoader = {}; loaders.forEach((l) => (rowsByLoader[l.id] = []));
    haulers.forEach((h) => rowsByLoader[h.loader_id] && rowsByLoader[h.loader_id].push(h));

    // batch id per (tanggal+jam), meniru pola COE (id sama utk satu jam)
    const batchId = {}; const idFor = (jam) => (batchId[jam] || (batchId[jam] = uuid4()));

    const aoa = [SS6_HPR_HEADER];
    for (const l of loaders) {
      const lossOf = losses.filter((x) => x.loader_id === l.id);
      const fleet = rowsByLoader[l.id] || [];
      for (const h of fleet) {
        const matU = normMat(h.material);
        if (!(matU === "OB" || matU.startsWith("QUARRY"))) continue; // Ore -> export ORE (tahap lain)
        for (const jam of jams) {
          const rit = num((h.rit || {})[jam]);
          const lj = lossOf.filter((x) => String(x.jam) === String(jam));
          if (rit <= 0 && lj.length === 0) continue; // aturan #2: skip rit0 tanpa loss

          // aturan #3: tempel loss loader pada baris ini
          let idleMin = 0, delayIdleCodes = [], probTime = 0, probCode = "", remark = "";
          for (const x of lj) {
            if (x.remark && !remark) remark = x.remark;
            if (x.type === "problem") {
              const c = resolveCode("problem", x.category);
              if (!probCode) { probCode = c.code; probTime = num(x.duration); }
            } else { // idle | delay
              idleMin += num(x.duration);
              const c = resolveCode(x.type, x.category);
              if (c.code) delayIdleCodes.push(c.code);
            }
          }
          const duration = Math.max(0, 60 - idleMin);
          aoa.push([
            idFor(jam), l.tanggal, "PIT " + (l.pit || ""), jamHHMMSS(jam), l.pengawas || "0",
            l.loader, h.hauler, matU, "", 0, normDispo(h.disposal), "", rit, rit * perRit(),
            num(h.distance), duration, idleMin, probTime, probCode, createdBy, tsNow(),
            remark, SS6_SOURCE, delayIdleCodes.join(","),
          ]);
        }
      }
    }
    if (aoa.length <= 1) { toast("Tidak ada baris OB/Quarry untuk diekspor"); return; }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HPR");
    XLSX.writeFile(wb, `SS6_HPR_${state.tanggal}_shift${state.shift}.xlsx`);
    toast(`Export ${aoa.length - 1} baris → Excel`);
  }

  /* ---------- EXPORT SS6 (skema sheet ORE: Ore Getting / Ore Hauling) ----------
     TONNAGE = BCM × 1.59 ; BCM = rit × faktor (getting 13 / hauling 23 / unit kecil 9). */
  const SS6_ORE_HEADER = ["TANGGAL","HAULER","TIME","ACTIVITY","LOADER","KODE DOME","GRADE","PIT","TONNAGE","DUMP","ORE GETTING","SHIFT","DISTANCE","Ritase","Working Time","Delay","Kode Delay","Idle","Kode Idle","Kode Pdty","Pdty","SPACE","JAM","SHIFT2","BCM","Tanggal 2"];
  const ORE_DENSITY = 1.59;
  const UNIT_BCM = { E5153: 9, E5157: 9 }; // faktor BCM/rit khusus unit kecil (default getting 13)
  const bcmPerRit = (loader, material) => (/hauling/i.test(material) ? 23 : (UNIT_BCM[loader] || 13));
  const tanggalMDY = (iso) => { const [y, m, d] = String(iso).split("-"); return `${+m}/${+d}/${String(y).slice(2)}`; }; // 2026-08-01 -> 8/1/26
  const jamHHMM = (j) => String(j).replace(".", ":"); // "07.00" -> "07:00"

  async function exportSS6_ORE() {
    if (!window.XLSX) { toast("Library Excel belum termuat"); return; }
    const codes = window.SS6_CODES;
    const { loaders, haulers, losses } = await Store.listAll(state.tanggal, state.shift);
    if (!loaders.length) { toast("Belum ada data loader di tanggal/shift ini"); return; }
    const jams = jamListFor(state.shift);
    const shiftLbl = "SHIFT " + state.shift;
    const dayNight = String(state.shift) === "2" ? "NIGHT" : "DAY";
    const rowsByLoader = {}; loaders.forEach((l) => (rowsByLoader[l.id] = []));
    haulers.forEach((h) => rowsByLoader[h.loader_id] && rowsByLoader[h.loader_id].push(h));

    const aoa = [SS6_ORE_HEADER];
    for (const l of loaders) {
      const lossOf = losses.filter((x) => x.loader_id === l.id);
      for (const h of rowsByLoader[l.id] || []) {
        if (!/ore/i.test(String(h.material || ""))) continue; // hanya material Ore -> ORE
        const bpr = bcmPerRit(l.loader, h.material);
        for (const jam of jams) {
          const rit = num((h.rit || {})[jam]);
          const lj = lossOf.filter((x) => String(x.jam) === String(jam));
          if (rit <= 0 && lj.length === 0) continue;
          let delayMin = 0, idleMin = 0, delayCodes = [], idleCodes = [], probCode = "";
          for (const x of lj) {
            if (x.type === "problem") { const c = resolveCode("problem", x.category); if (!probCode) probCode = c.code; }
            else if (x.type === "idle") { idleMin += num(x.duration); const c = resolveCode("idle", x.category); if (c.code) idleCodes.push(c.code); }
            else { delayMin += num(x.duration); const c = resolveCode("delay", x.category); if (c.code) delayCodes.push(c.code); }
          }
          const bcm = rit * bpr;
          const tonnage = Math.round(bcm * ORE_DENSITY * 100) / 100;
          const workTime = Math.max(0, 60 - delayMin - idleMin);
          aoa.push([
            tanggalMDY(l.tanggal), h.hauler, jamHHMM(jam), h.material, l.loader, "", h.grade || "SAP3-SSP", "PIT " + (l.pit || ""),
            tonnage, h.disposal || "", "AMM", dayNight, num(h.distance), rit, workTime,
            delayMin, delayCodes.join(","), idleMin, idleCodes.join(","), probCode || 0, "", "", jamHour(jam), shiftLbl, bcm, l.tanggal,
          ]);
        }
      }
    }
    if (aoa.length <= 1) { toast("Tidak ada baris Ore untuk diekspor"); return; }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ORE");
    XLSX.writeFile(wb, `SS6_ORE_${state.tanggal}_shift${state.shift}.xlsx`);
    toast(`Export ${aoa.length - 1} baris Ore → Excel`);
  }

  /* ---------- EVENTS ---------- */
  app.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-act]"); if (!el) return;
    const act = el.getAttribute("data-act"), id = el.getAttribute("data-id");
    const LID = app._loaderId;
    switch (act) {
      case "back": history.back(); break;
      case "go-menu": location.hash = "#/"; break;
      case "drawer": openDrawer(); break;
      case "nav": location.hash = el.getAttribute("data-to"); break;
      case "logout": confirmModal("Keluar dari akun CCR?", async () => { await Store.signOut(); state.user = null; state.master = null; renderLogin(); }, "Ya, keluar"); break;
      case "add-unit": unitModal(); break;
      case "add-delay": delayModal(); break;
      case "del-unit": { const kind = el.getAttribute("data-kind"), uid2 = el.getAttribute("data-id"); confirmModal(`Hapus unit ${uid2}?`, async () => { const m = state.master; if (kind === "dt") m.haulers_master = (m.haulers_master || []).filter((u) => u.lambung !== uid2); else m.loaders = (m.loaders || []).filter((l) => l.kode !== uid2); await Store.saveMaster(m); toast("Unit dihapus"); renderUnit(); }); break; }
      case "del-delay": { const di = +el.getAttribute("data-i"); confirmModal("Hapus delay ini?", async () => { const m = state.master; const d = (m.delay_extra || [])[di]; (m.delay_extra || []).splice(di, 1); if (d) m.delay = (m.delay || []).filter((x) => x !== d.desc); await Store.saveMaster(m); toast("Delay dihapus"); renderDelay(); }); break; }
      case "tab": { const t = el.getAttribute("data-tab"); const n = t === "fleet" ? 1 : t === "ritase" ? 2 : 3; const s = document.getElementById("sec-" + n); if (s) s.scrollIntoView({ behavior: "smooth", block: "start" }); break; }
      case "d-gen-report": {
        const jam = document.getElementById("d-rjam").value;
        const out = document.getElementById("report-out"); out.textContent = "Membuat...";
        const txt = await buildReport(jam); out.textContent = txt; out._txt = txt; out.classList.add("wa");
        break; }
      // loader
      case "add-loader": loaderModal(null); break;
      case "edit-loader": loaderModal(await Store.getLoader(id)); break;
      case "del-loader": confirmModal("Hapus loader ini beserta semua hauler & loss-nya?", async () => { await Store.deleteLoader(id); toast("Loader dihapus"); renderLoaders(); }); break;
      case "open-loader": state.detailTab = "fleet"; location.hash = "#/loader/detail/" + id; break;
      case "open-ritase": state.detailTab = "ritase"; location.hash = "#/loader/detail/" + id; break;
      case "report-now": state.__reportJam = el.getAttribute("data-jam"); location.hash = "#/report"; break;
      case "dup-loader": { const src = await Store.getLoader(id); loaderModal({ ...src, id: null, loader: "" }); break; }
      // hauler
      case "add-hauler": haulerModal(LID, null); break;
      case "edit-hauler": { const hs = await Store.listHaulers(LID); haulerModal(LID, hs.find((x) => x.id === id)); break; }
      case "del-hauler": confirmModal("Hapus hauler ini?", async () => { await Store.deleteHauler(id); toast("Hauler dihapus"); renderLoaderDetail(LID); }); break;
      // loss
      case "add-loss": { const l = await Store.getLoader(LID); lossModal(LID, null, l.shift); break; }
      case "edit-loss": { const l = await Store.getLoader(LID); const ls = await Store.listLosses(LID); lossModal(LID, ls.find((x) => x.id === id), l.shift); break; }
      case "del-loss": confirmModal("Hapus loss ini?", async () => { await Store.deleteLoss(id); toast("Loss dihapus"); renderLoaderDetail(LID); }); break;
      // report
      case "gen-report": { const jam = document.getElementById("r-jam").value; state.tanggal = document.getElementById("r-tgl").value; const out = document.getElementById("report-out"); out.textContent = "Membuat..."; const txt = await buildReport(jam); out.textContent = txt; out._txt = txt; out.classList.add("wa"); break; }
      case "copy-report": { const t = (document.getElementById("report-out")._txt) || document.getElementById("report-out").textContent; try { await navigator.clipboard.writeText(t); toast("Disalin ✅"); } catch { toast("Salin manual: blok lalu Ctrl+C"); } break; }
      case "wa-report": { const t = (document.getElementById("report-out")._txt) || document.getElementById("report-out").textContent; try { await navigator.clipboard.writeText(t); toast("Disalin ✅"); } catch {} window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank"); break; }
      case "csv-export": await exportCSV(); break;
      case "ss6-hpr-export": await exportSS6_HPR(); break;
      case "ss6-ore-export": await exportSS6_ORE(); break;
      // setting
      case "prod-export": await exportProduksi(); break;
      case "gl-export": await exportGainLoss(); break;
      case "imp-cancel": state.__imp = null; renderImport(); break;
      case "imp-go": {
        const res = state.__imp; if (!res) break;
        el.disabled = true; el.textContent = "Mengimpor…";
        try {
          const n = await Store.importBulk(res.pack); state.__imp = null;
          toast("Impor selesai: " + n.loaders + " loader, " + n.haulers + " fleet, " + n.losses + " loss");
          state.tanggal = res.from || state.tanggal; state.prodFrom = res.from; state.prodTo = res.to;
          location.hash = "#/produksi";
        } catch (e) { toast("Gagal impor: " + e.message); el.disabled = false; el.textContent = "Impor Sekarang"; }
        break; }
      case "wipe-all": confirmModal("HAPUS SEMUA data ritase, fleet, dan loss? Tindakan ini tidak bisa dibatalkan.", async () => { const n = await Store.clearAll(); toast("Semua data dihapus (" + n + " loader)"); renderImport(); }, "Ya, hapus semua"); break;
      case "prod-bulan": { const d = new Date(state.prodTo || todayISO()); const p = (n) => String(n).padStart(2, "0"); const y = d.getFullYear(), mo = d.getMonth(); state.prodFrom = `${y}-${p(mo + 1)}-01`; state.prodTo = `${y}-${p(mo + 1)}-${p(new Date(y, mo + 1, 0).getDate())}`; renderProduksi(); break; }
      case "ms-add": await msAdd(el.getAttribute("data-kind")); break;
      case "ms-del": { const k = el.getAttribute("data-kind"), ix = +el.getAttribute("data-i"); confirmModal("Hapus item ini dari Data Master?", async () => { await msDel(k, ix); }); break; }
      case "reset-master": confirmModal("Kembalikan data master ke default?", async () => { state.master = JSON.parse(JSON.stringify(window.SEED)); await Store.saveMaster(state.master); route(); }, "Ya, kembalikan"); break;
    }
  });

  /* ---------- INIT ---------- */
  /* ============================================================
     ENHANCER VISUAL (refresh): custom select ber-panel + tabel sortable + footer
     Progressive: native <select> tetap ada (tersembunyi) → semua .value/onchange lama jalan.
     ============================================================ */
  const CHEV_DOWN = '<svg class="ic chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>';
  const CHK = '<svg class="ic chk" viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 12.75 6 6 9-13.5"/></svg>';
  const sortChev = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 15.75 7.5-7.5 7.5 7.5"/></svg>';
  function closeSelects() { document.querySelectorAll(".xselect.open").forEach((x) => x.classList.remove("open")); }
  function enhanceSelect(sel) {
    if (sel.dataset.enh || sel.multiple) return;
    sel.dataset.enh = "1";
    const wrap = document.createElement("div"); wrap.className = "xselect";
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel); sel.classList.add("native");
    const trg = document.createElement("button"); trg.type = "button"; trg.className = "trigger";
    const panel = document.createElement("div"); panel.className = "panel"; panel.setAttribute("role", "listbox");
    wrap.appendChild(trg); wrap.appendChild(panel);
    const getOpts = () => [].slice.call(sel.options).map((o) => ({ value: o.value, text: o.textContent }));
    function render() {
      const arr = getOpts(); const v = sel.value; const cur = arr.find((o) => o.value === v);
      const lbl = cur ? cur.text : "";
      const isPh = (v == null || v === "");
      trg.innerHTML = '<span class="val' + (isPh ? " ph" : "") + '">' + (esc(lbl) || "Pilih…") + "</span>" + CHEV_DOWN;
      panel.innerHTML = arr.map((o) => '<div class="opt" role="option" data-v="' + esc(o.value) + '" aria-selected="' + (o.value === v) + '"><span class="olbl">' + esc(o.text) + "</span>" + CHK + "</div>").join("");
      panel.querySelectorAll(".opt").forEach((op) => op.addEventListener("click", (e) => {
        e.stopPropagation(); sel.value = op.getAttribute("data-v");
        sel.dispatchEvent(new Event("change", { bubbles: true })); wrap.classList.remove("open"); render();
      }));
    }
    function positionPanel() {
      const r = trg.getBoundingClientRect();
      panel.style.left = r.left + "px"; panel.style.width = r.width + "px";
      const spaceBelow = window.innerHeight - r.bottom, need = Math.min(panel.scrollHeight + 4, window.innerHeight * 0.5);
      if (spaceBelow < need && r.top > spaceBelow) { panel.style.top = "auto"; panel.style.bottom = (window.innerHeight - r.top + 6) + "px"; }
      else { panel.style.bottom = "auto"; panel.style.top = (r.bottom + 6) + "px"; }
    }
    trg.addEventListener("click", (e) => {
      e.stopPropagation(); const was = wrap.classList.contains("open"); closeSelects();
      if (!was) { wrap.classList.add("open"); positionPanel(); }
    });
    sel.addEventListener("change", render);
    // opsi dinamis (mis. kategori loss ikut tipe) → render ulang panel
    new MutationObserver(render).observe(sel, { childList: true });
    render();
  }
  function enhanceSortableTables(root) {
    (root || document).querySelectorAll("table.sortable:not([data-enh])").forEach((tbl) => {
      tbl.dataset.enh = "1"; const tb = tbl.querySelector("tbody"); if (!tb) return;
      tbl.querySelectorAll("th.sortable").forEach((th) => th.addEventListener("click", () => {
        const cells = [].slice.call(th.parentNode.children); const k = cells.indexOf(th); const isNum = th.hasAttribute("data-num");
        const asc = th.getAttribute("aria-sort") !== "ascending";
        th.parentNode.querySelectorAll("th").forEach((h) => h.removeAttribute("aria-sort"));
        th.setAttribute("aria-sort", asc ? "ascending" : "descending");
        const rows = [].slice.call(tb.querySelectorAll("tr"));
        rows.sort((a, b) => {
          let x = (a.children[k] ? a.children[k].textContent : "").trim(), y = (b.children[k] ? b.children[k].textContent : "").trim();
          if (isNum) { x = parseFloat(x.replace(/[^\d.-]/g, "")) || 0; y = parseFloat(y.replace(/[^\d.-]/g, "")) || 0; return asc ? x - y : y - x; }
          return asc ? x.localeCompare(y) : y.localeCompare(x);
        });
        rows.forEach((r) => tb.appendChild(r));
      }));
    });
  }
  function enhanceUI(root) {
    // Custom select DIMATIKAN — pakai <select> bawaan (scroll & simetri sempurna, ramah HP).
    enhanceSortableTables(root);
  }

  /* ---------- Footer lengkap ---------- */
  function mountFooter() {
    if (document.querySelector(".site-footer")) return;
    const soc = (name, href, ext) => `<a class="soc" href="${href}"${ext ? ' target="_blank" rel="noreferrer"' : ""} title="${name}">${icon(name === "email" ? "mail" : name)}</a>`;
    const f = document.createElement("footer"); f.className = "site-footer";
    f.innerHTML = `
      <div class="foot-top">
        <span class="foot-logo">${LOGO_SVG}</span>
        <p class="foot-desc">CCR — aplikasi pencatatan ritase &amp; laporan produksi per jam untuk PT Antareja Mahada Makmur. Input ritase per loader, hitung loss otomatis, buat laporan WhatsApp, dan export ke format SS6 (HPR &amp; ORE) secara cepat, rapi, dan konsisten.</p>
      </div>
      <div class="foot-div"></div>
      <div class="foot-nav">
        <div class="col"><h4>Aplikasi</h4><ul><li><a data-go="#/form">Form Ritase</a></li><li><a data-go="#/form">Papan Shift</a></li><li><a data-go="#/report">Laporan WhatsApp</a></li></ul></div>
        <div class="col"><h4>Export SS6</h4><ul><li><a data-go="#/report">Format HPR</a></li><li><a data-go="#/report">Format ORE</a></li><li><a data-go="#/report">Export CSV</a></li></ul></div>
        <div class="col"><h4>Data</h4><ul><li><a data-go="#/form">Loader &amp; Fleet</a></li><li><a data-go="#/setting">Pengawas &amp; Unit</a></li><li><a data-go="#/setting">Setting</a></li></ul></div>
        <div class="col"><h4>Bantuan</h4><ul><li><a data-go="#/">Menu Utama</a></li><li><a href="mailto:mtaufikhid15@gmail.com">Kontak</a></li></ul></div>
      </div>
      <div class="foot-div"></div>
      <div class="foot-social">
        ${soc("email", "mailto:mtaufikhid15@gmail.com")}
        ${soc("x", "#")}
        ${soc("instagram", "https://instagram.com/mtaufikhid", true)}
        ${soc("threads", "#")}
        ${soc("whatsapp", "#")}
        ${soc("behance", "#")}
        ${soc("facebook", "#")}
        ${soc("linkedin", "#")}
        ${soc("youtube", "#")}
        <div class="pill-toggle">
          <button data-ft="light" title="Terang">${icon("sun")}</button>
          <button data-ft="top" title="Ke atas"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"/></svg></button>
          <button data-ft="dark" title="Gelap">${icon("moon")}</button>
        </div>
      </div>
      <div class="footer-credit">© ${new Date().getFullYear()} · Created by <a href="https://instagram.com/mtaufikhid" target="_blank" rel="noreferrer">Taufik Hidayat</a></div>`;
    f.addEventListener("click", (e) => {
      const g = e.target.closest("[data-go]"); if (g) { location.hash = g.getAttribute("data-go"); return; }
      const ft = e.target.closest("[data-ft]"); if (!ft) return;
      const a = ft.getAttribute("data-ft");
      if (a === "top") window.scrollTo({ top: 0, behavior: "smooth" });
      else { document.documentElement.setAttribute("data-theme", a); localStorage.setItem("hpr_theme", a); }
    });
    document.body.appendChild(f);
  }

  // Tooltip detail untuk bar Papan Shift (hover) — dipasang sekali, delegasi.
  function initCbarTip() {
    const tip = document.createElement("div"); tip.className = "cbar-tip"; tip.style.display = "none"; document.body.appendChild(tip);
    const show = (b) => {
      tip.textContent = b.getAttribute("data-tip") || ""; tip.style.display = "block";
      const r = b.getBoundingClientRect();
      tip.style.left = Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2)) + "px";
      let top = r.top - tip.offsetHeight - 8; if (top < 8) top = r.bottom + 8;
      tip.style.top = top + "px";
    };
    const hide = () => { tip.style.display = "none"; };
    document.addEventListener("mouseover", (e) => { const b = e.target.closest && e.target.closest(".cbar[data-tip]"); if (b) show(b); });
    document.addEventListener("mouseout", (e) => { if (e.target.closest && e.target.closest(".cbar[data-tip]")) hide(); });
    document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest(".cbar[data-tip]"); if (b) { show(b); setTimeout(hide, 1800); } });
  }

  async function boot() {
    initTheme();
    try { await Store.init(); } catch (e) {}
    try { state.user = await Store.currentUser(); } catch (e) { state.user = null; }
    window.addEventListener("hashchange", route);
    route();
    enhanceUI(document);
    initCbarTip();
    new MutationObserver(() => { requestAnimationFrame(() => enhanceUI(document)); }).observe(document.body, { childList: true, subtree: true });
  }
  boot();
})();
