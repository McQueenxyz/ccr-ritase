/* ============================================================
   SS6 CODE LEGEND + PEMETAAN  (di-ekstrak dari sheet "HPR",
   Hourly Report Agustus 2026.xlsb, 10 Agu 2026)
   ------------------------------------------------------------
   Dipakai saat EXPORT ke format SS6 (skema HPR): mengubah label
   kategori app CCR → kode resmi SS6 (P.. / D.. / I..).
   Sumber kebenaran = kolom legend AD:AL di sheet HPR itu sendiri.
   ============================================================ */
(function () {
  // ---- IDLE (mesin sehat, kondisi berhenti) : kode I.. ----
  const IDLE = {
    I01: "RAIN", I02: "SLIPPERY", I03: "DEMO", I04: "CUST. PROBLEM", I05: "HAZE",
  };

  // ---- DELAY (stop, penyebab lain) : kode D.. (+ A11, B01) ----
  const DELAY = {
    A11: "BANTU TARIK HDPE", B01: "BREAKDOWN",
    D01: "P2H & P5M", D02: "REFUELING", D03: "CHECK TYRE", D04: "SWITCH HAULER",
    D05: "BD MATCHING FLEET", D06: "WAIT PENGUKURAN SURVEY", D07: "WAIT BLASTING",
    D08: "WASHING", D09: "MEAL & BREAK", D10: "TIDAK ADA PENGAWAS", D11: "OVER CAPACITY",
    D12: "NO OPERATOR EXCA", D13: "CHANGE SHIFT", D14: "JALAN BERDEBU", D15: "PRAYING",
    D16: "COMISIONING", D17: "PREPARE FRONT", D18: "PREPARE DISPOSAL", D19: "NO MATERIAL BL",
    D20: "OFF HIRE (UNIT READY)", D21: "SQUENCE TERGANGGU", D22: "WAITING RIPPING",
    D23: "NO SUPPORT", D24: "WAIT OPT EXCA", D25: "ISI LUBE", D26: "MATCHING FLEET",
    D27: "FRIDAY PRAY", D28: "GENERAL SAFETY TALK", D29: "FASTING", D30: "MAINTENANCE ROAD",
    D31: "PUBLIC HOLIDAY", D32: "LOADING COAL", D33: "LOADING ORE", D34: "FRONT MOVEMENT",
    D35: "INSPECTION FATIQUE", D50: "NO FRONT", D51: "PIT BANJIR", D52: "WAIT INSPEKSI CUSTOMER",
    D53: "PROBLEM DISPOSAL", D54: "RECALL ACCIDENT", D55: "HOLIDAYS / MINE SHUTDOWN",
    D56: "LOADING NON VOLUME", D57: "GENERAL", D58: "NO OPERATOR TRUCK", D59: "WAIT OPT TRUCK",
  };

  // ---- PRODUCTIVITY PROBLEM (loader tak stop) : kode P.. ----
  const PDTY = {
    P01: "DISPOSAL AMBLAS", P02: "DISPOSAL CROWDED", P03: "DOUBLE BENCH", P04: "FRONT MELORONG",
    P05: "FRONT AMBLAS", P06: "FRONT BERAIR", P07: "FRONT CROWDED", P08: "FRONT LEMBEK",
    P09: "FRONT MENANJAK", P10: "FRONT SEMPIT", P11: "HAULER KURANG DT/HD BD", P12: "HD / DT INPIT DUMP",
    P13: "SWITCH OPT HD / EXCA", P14: "JALAN UNDULATING", P15: "JALAN CROWDED", P16: "JALAN LICIN",
    P17: "DT/HD MUNDUR JAUH", P18: "MATERIAL BOULDER", P19: "MATERIAL KERAS ORI", P20: "FRONT UNDULATING",
    P21: "MATERIAL TIPIS", P22: "OPT HD/DT TEST FATIGUE", P23: "JALAN SEMPIT", P24: "PEMBENTUKAN FRONT BARU",
    P25: "PERBAIKAN FRONT", P26: "PERBAIKAN JALAN", P27: "PINDAH FRONT", P28: "TES FATIQUE",
    P29: "BLASTINGAN KERAS", P30: "TOP LOADING", P31: "TRAVEL BLASTING", P32: "WAIT PREPARE JALAN",
    P33: "BLASTINGAN KERAS", P34: "LOAD COAL", P35: "WAIT HD AMBLAS DI DIFRONT", P36: "BACK LOADING",
    P37: "EXPOSE", P38: "SWITCH HAULER", P39: "EXCA GANTUNG", P40: "JALAN BERDEBU",
  };

  /* ---- Pemetaan label SEED app CCR → kode SS6 ----
     type app: "problem" -> P.. (kolom prdty_problem_code)
               "idle"    -> I.. (kolom idledelay_code)
               "delay"   -> D.. (kolom idledelay_code)
     Baris ber-tag CONFIRM = kandidat terbaik, minta user pastikan. */
  const APP_TO_CODE = {
    problem: {
      "Disposal Crowded": "P02",
      "DT Breakdown (DT BD)": "P11",      // P11 HAULER KURANG DT/HD BD (verified via Source-Ore)
      "Jalan Crowded": "P15",
      "Jalan Licin": "P16",
      "Material Boulder": "P18",
      "Perbaikan Front": "P25",
      "Pindah Front": "P27",
      "Tes Fatigue": "P28",               // P28 TES FATIQUE (verified)
      "Switch Hauler": "P38",
      "Road Maintenance": "P26",          // P26 PERBAIKAN JALAN
      "Jalan Berdebu": "P40",
    },
    idle: {
      "Hujan": "I01",
      "Slippery": "I02",
      "Haze/Kabut": "I05",
      "Demo": "I03",
      "Customer Problem (RKAB)": "I04",
    },
    delay: {
      "Breakdown": "B01",
      "P2H/P5M": "D01",
      "Refueling": "D02",
      "BD Matching Fleet": "D05",
      "Meal & Break": "D09",
      "Tidak Ada Pengawas": "D10",
      "No Opt Exca": "D12",
      "Change Shift": "D13",
      "Jalan Berdebu": "D14",
      "Praying": "D15",
      "Commisioning": "D16",
      "Prepare Front": "D17",
      "Prepare Disposal": "D18",
      "No Support": "D23",
      "Wait Opt Exca": "D24",
      "Matching Fleet": "D26",
      "Friday Pray": "D27",
      "General Safety Talk": "D28",
      "Fasting": "D29",
      "Maintenance Road": "D30",
      "Loading Ore": "D33",
      "No Opt Hauler": "D58",             // D58 NO OPERATOR TRUCK (verified)
      "No Material Ore": "D19",           // D19 NO MATERIAL ORE (verified via Source-Ore)
      "Wait Opt Hauler": "D59",           // D59 WAIT OPT TRUCK
      "Wait GC": "D59",                   // D59 WAIT GC (verified via Source-Ore)
      "General": "D57",
      "No Operator Truck": "D58",
    },
  };

  // resolver: (type, label) -> {code, desc} | null
  function codeFor(type, label) {
    const tbl = APP_TO_CODE[type] || {};
    const code = tbl[label] || "";
    if (!code) return { code: "", desc: "" };
    const dict = type === "idle" ? IDLE : type === "delay" ? DELAY : PDTY;
    return { code, desc: dict[code] || "" };
  }

  window.SS6_CODES = { IDLE, DELAY, PDTY, APP_TO_CODE, codeFor };
})();
