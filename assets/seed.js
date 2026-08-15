/* ============================================================
   DATA MASTER / SEED
   ------------------------------------------------------------
   Ini adalah daftar pilihan (dropdown) yang dipakai di form supaya
   tidak ada salah ketik. Semua diambil dari dokumen workflow Anda.
   Anda bisa mengubahnya lewat menu SETTING di aplikasi.
   ============================================================ */

window.SEED = {
  // Loader (Exca). material_default = material yang paling sering.
  loaders: [
    { kode: "E5416", material_default: "OB",     keterangan: "Bisa Ore bisa Quarry" },
    { kode: "E5418", material_default: "OB",     keterangan: "Bisa Ore bisa Quarry" },
    { kode: "E5314", material_default: "Ore",    keterangan: "Bisa OB bisa Quarry" },
    { kode: "E5312", material_default: "Ore",    keterangan: "Bisa Ore bisa Quarry" },
    { kode: "E5168", material_default: "Quarry", keterangan: "Bisa OB" },
    { kode: "E5422", material_default: "Ore Hauling", keterangan: "Ore Hauling Alkafa-Petstock" },
  ],

  // Material yang dilaporkan operator (OB + Quarry utk HPR; Ore utk ORE)
  materials: [
    "OB",
    "Quarry",
    "Quarry Inpit",
    "Quarry Infra",
    "SOIL",
    "MUD",
    "Slag",
    "Reject",
    "Ore Getting",
    "Ore Hauling",
    "Ore Getting +6",
    "LGL",
    "Ore MGO",
    "Ore HGO Direct",
    "Ore MGO Direct",
    "Ore LGL Direct",
  ],

  // Grade ore (untuk export ORE). Dari Source-Ore SS6.
  grades: ["SAP3-SSP", "SAP1-SSP", "SAP2-SSP", "SAP3-ROM", "SAP1-ROM", "SAP2-ROM", "LG-ROM", "ORE-Plus6"],

  // Tujuan dumping. OB/HPR (atas) + ROM/Dump ORE (bawah, dari Source-Ore SS6).
  disposals: [
    "Disposal Balado",
    "Disposal Zizi",
    "Rompile Alkafa",
    "Inpit",
    "Jalan",
    "ROM ZIZI", "ROM ZIZI A", "ROM ZIZI B", "ROM ZIZI C", "ROM ZIZI D", "ROM ZIZI E",
    "ROM ALKAFA", "ROM ALKAFA A", "ROM ALKAFA B", "ROM ALKAFA C",
    "ROM BALONTI", "ROM LMR 02", "ROM LMR 03", "ROM LAM", "ROM LYLA",
    "PETSTOCK 01", "PETSTOCK 02", "PETSTOCK 1A", "PETSTOCK 1B", "PETSTOCK 2A", "PETSTOCK D1C5",
    "DSP KATHRYN",
  ],

  // Area & Pit
  areas: ["BAHODOPI BLOCK 1", "BB1"],
  pits: ["MYARA"],

  // Nama-nama GL (pengawas). Bisa ditambah di Setting.
  gl_pit: ["DAVID"],
  gl_road: ["BRIAL"],
  gl_disposal: ["JEFRY"],

  // Shift
  shifts: [
    { kode: "1", label: "Shift 1 (07.00 - 18.00)" },
    { kode: "2", label: "Shift 2 (19.00 - 06.00)" },
  ],

  // Jam untuk shift 1 dan shift 2
  jam_shift1: ["07.00","08.00","09.00","10.00","11.00","12.00","13.00","14.00","15.00","16.00","17.00","18.00"],
  jam_shift2: ["19.00","20.00","21.00","22.00","23.00","00.00","01.00","02.00","03.00","04.00","05.00","06.00"],

  // PROBLEM = penghambat produksi tapi loader TIDAK stop
  problems: [
    "Disposal Crowded",
    "DT Breakdown (DT BD)",
    "Jalan Crowded",
    "Jalan Licin",
    "Material Boulder",
    "Perbaikan Front",
    "Pindah Front",
    "Tes Fatigue",
    "Switch Hauler",
    "Road Maintenance",
    "Jalan Berdebu",
  ],

  // IDLE = kondisi berhenti (mesin sehat). Sesuai dokumen.
  idle: [
    "Hujan",
    "Slippery",
    "Haze/Kabut",
    "Demo",
    "Customer Problem",
  ],

  // DELAY = penyebab stop lainnya. Sesuai dokumen.
  delay: [
    "Breakdown",
    "P2H/P5M",
    "Refueling",
    "BD Matching Fleet",
    "Meal & Break",
    "Tidak Ada Pengawas",
    "No Opt Exca",
    "Change Shift",
    "Jalan Berdebu",
    "Praying",
    "Commisioning",
    "Prepare Front",
    "Prepare Disposal",
    "No Support",
    "Wait Opt Exca",
    "Matching Fleet",
    "Friday Pray",
    "General Safety Talk",
    "Fasting",
    "Maintenance Road",
    "Loading Ore",
    "No Opt Hauler",
    "No Material Ore",
    "Wait Opt Hauler",
    "Wait GC",
    "General",
    "No Operator Truck",
  ],

  // PENGAWAS (GL). Trigger di form = NAMA; NRP dipakai saat export SS6.
  pengawas: [
    { nrp: "17123144", nama: "Syaiful Anwar" },
    { nrp: "21002328", nama: "Seldi" },
    { nrp: "22001548", nama: "Rusdi" },
    { nrp: "22004528", nama: "Andi Kusnali" },
    { nrp: "17052197", nama: "Abdul Gafar" },
    { nrp: "16011146", nama: "Enra Yusak Banne Tasik" },
    { nrp: "24005671", nama: "Kristian Lebang Pe" },
    { nrp: "25000872", nama: "Muhammad Iqbal Tryono" },
    { nrp: "25000836", nama: "Novry Helmus Lolo" },
    { nrp: "19005966", nama: "Rizal Pahlapi" },
    { nrp: "17062394", nama: "Syahril" },
    { nrp: "25000660", nama: "Wansiporus Manca Kalambe" },
    { nrp: "25001810", nama: "Jeprika Rante Batara" },
    { nrp: "25001639", nama: "David Patandung" },
    { nrp: "25001809", nama: "Muhammad Ruchli Hadiyana" },
    { nrp: "25002014", nama: "Muh Brial Brais Baden" },
    { nrp: "25003730", nama: "Adrian Adodin" },
    { nrp: "25003727", nama: "Yusrifal" },
    { nrp: "25003725", nama: "Alwi" },
    { nrp: "26000492", nama: "Hezron Reskiano" },
    { nrp: "25003730", nama: "Adrian A" },
    { nrp: "17102817", nama: "Saharuddin" },
    { nrp: "26000483", nama: "Dzaki Zarfan Yugis" },
  ],

  // Nomor lambung DT per tonase. Trigger di form hauler = 3 (atau 4) angka terakhir.
  haulers_master: [
    // 20 Ton
    { lambung: "DA25174PPA", ton: 20 }, { lambung: "DA25176PPA", ton: 20 },
    { lambung: "DA52536", ton: 20 }, { lambung: "DA52537", ton: 20 }, { lambung: "DA52538", ton: 20 },
    // 30 Ton
    { lambung: "DA54227", ton: 30 }, { lambung: "DA54228", ton: 30 }, { lambung: "DA54229", ton: 30 },
    { lambung: "DA54230", ton: 30 }, { lambung: "DA54231", ton: 30 }, { lambung: "DA54232", ton: 30 },
    { lambung: "DA54233", ton: 30 }, { lambung: "DA54234", ton: 30 }, { lambung: "DA54235", ton: 30 },
    { lambung: "DA54236", ton: 30 }, { lambung: "DA54249", ton: 30 }, { lambung: "DA54250", ton: 30 },
    { lambung: "DA54251", ton: 30 }, { lambung: "DA54252", ton: 30 }, { lambung: "DA54253", ton: 30 },
    { lambung: "DA54254", ton: 30 }, { lambung: "DA54255", ton: 30 }, { lambung: "DA54256", ton: 30 },
    { lambung: "DA54257", ton: 30 }, { lambung: "DA54258", ton: 30 }, { lambung: "DA54259", ton: 30 },
    { lambung: "DA54260", ton: 30 }, { lambung: "DA54261", ton: 30 }, { lambung: "DA54262", ton: 30 },
    { lambung: "DA54263", ton: 30 }, { lambung: "DA54264", ton: 30 }, { lambung: "DA54265", ton: 30 },
    // 40 Ton
    { lambung: "DA54880", ton: 40 }, { lambung: "DA54881", ton: 40 }, { lambung: "DA54882", ton: 40 },
    { lambung: "DA54883", ton: 40 }, { lambung: "DA54884", ton: 40 }, { lambung: "DA54885", ton: 40 },
    { lambung: "DA54886", ton: 40 }, { lambung: "DA54887", ton: 40 }, { lambung: "DA54888", ton: 40 },
    { lambung: "DA54889", ton: 40 }, { lambung: "DA54890", ton: 40 }, { lambung: "DA54891", ton: 40 },
    { lambung: "DA54892", ton: 40 }, { lambung: "DA54893", ton: 40 }, { lambung: "DA54894", ton: 40 },
    { lambung: "DA54895", ton: 40 }, { lambung: "DA54896", ton: 40 }, { lambung: "DA54897", ton: 40 },
    { lambung: "DA54898", ton: 40 }, { lambung: "DA54899", ton: 40 }, { lambung: "DA548100", ton: 40 },
    { lambung: "DA548101", ton: 40 }, { lambung: "DA548102", ton: 40 }, { lambung: "DA548103", ton: 40 },
    { lambung: "DA548104", ton: 40 }, { lambung: "DA548105", ton: 40 }, { lambung: "DA548106", ton: 40 },
    { lambung: "DA548107", ton: 40 }, { lambung: "DA548121", ton: 40 }, { lambung: "DA548122", ton: 40 },
  ],
};
