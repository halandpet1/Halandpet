Kamu adalah senior full-stack engineer yang bertanggung jawab membawa repo Next.js 16 "HaLand PetCare" (App Router, TypeScript, Prisma 7 + PostgreSQL, Zod, Vitest) dari kondisi saat ini menjadi PRODUCTION READY, dengan PRD-haland.md di root repo sebagai single source of truth utama.

======================================================================
KONTEKS PENTING — BACA DULU SEBELUM MULAI
======================================================================
1. PRD-haland.md TERPOTONG. Bab 1–8 (Executive Summary, Product Goals, Business Rules,
   Permission Matrix, Tech Stack, Architecture, Database Design, Master Data) LENGKAP dan
   WAJIB kamu ikuti secara ketat. Bab 9–30 (spesifikasi 8 modul detail, UI/UX Guidelines,
   Workflow, Automation, Validation Rules, Reporting, Notification, Security, API/Server
   Action pattern, Coding Standard, Folder Structure, Development Rules, Testing,
   Deployment, Roadmap) TIDAK ADA di file — dokumen berhenti dengan catatan "akan
   dilanjutkan pada bagian berikutnya". JANGAN mengarang isi bab yang hilang.
   Untuk area yang tidak dicover PRD, turunkan requirement dari: (a) Bab 1–8 yang ada,
   (b) skema Prisma & pola kode existing di src/actions & src/validators sebagai
   "extended source of truth", (c) konvensi yang sudah dipakai di file lain dalam repo
   yang sama (naming, response shape ActionResult<T>, pola requireRole/assertRole,
   pola $transaction). Konsisten > kreatif.
2. JANGAN membuat file dokumentasi/markdown baru (README tambahan, report, summary, dsb).
   Folder /Doc sudah berisi banyak laporan self-certified yang OVERCLAIM kesiapan produksi
   (mis. GA_READINESS_SUMMARY.md bilang "READY FOR STAGING" padahal 5 module actions
   paling kritikal tanpa test). Kerjaanmu adalah KODE, TEST, DAN WORKFLOW — bukan dokumen.
   Jika sebuah file di /Doc jadi salah/menyesatkan setelah perubahanmu, cukup update
   baris yang relevan seperlunya, jangan buat file baru.
3. Kerjakan dalam PHASE berurutan di bawah. Tiap phase harus lulus `npm run lint`,
   `npx tsc --noEmit`, `npm run test`, dan `npm run build` sebelum lanjut ke phase
   berikutnya. Commit per-phase dengan pesan jelas.
4. Jangan pernah hapus kolom `deletedAt` (soft delete wajib — aturan 3.1.3), jangan pernah
   update kolom stok langsung di luar StockMovement (aturan 3.1.2), dan setiap operasi
   multi-tabel WAJIB pakai `db.$transaction` (aturan 3.1.6) — ikuti pola yang sudah ada
   di sales.actions.ts / inventory.actions.ts.

======================================================================
PHASE 0 — BASELINE & INVENTARISASI
======================================================================
- Jalankan lint, typecheck, test, build, dan catat status awal (jangan buat file laporan,
  cukup tampilkan di chat/terminal untuk referensimu sendiri selama sesi ini).
- Baca ulang PRD-haland.md Bab 3 (Business Rules), Bab 4 (Permission Matrix & Workflow
  Matrix), Bab 6 (Architecture: Server Action Pattern, Transaction Pattern, Error
  Handling, Logging), Bab 7 (Database Design) secara utuh sebelum mengubah apa pun.
- Petakan setiap baris Permission Matrix (4.2.1–4.2.8) ke fungsi actions yang relevan.
  Untuk tiap fungsi, catat role yang SEHARUSNYA diizinkan vs role yang SAAT INI diizinkan
  di kode (lihat implementasi assertRole/requireRole masing-masing file). Perbaiki semua
  penyimpangan di Phase 2.

======================================================================
PHASE 1 — PERBAIKAN BUG & DATA INTEGRITY KRITIKAL
======================================================================
1.1 Invoice numbering (src/actions/sales.actions.ts, fungsi createInvoiceNumber):
    - Ganti `INV-${yearMonth}-${Date.now().slice(-5)}` dengan sequential counter 5 digit
      per bulan yang benar-benar atomic dan unik, sesuai aturan 3.3.2:
      format INV-YYYYMM-00001, reset tiap awal bulan, nomor TIDAK BOLEH dipakai ulang
      walau invoice di-void. Implementasikan via transaksi database yang menghitung
      COUNT/MAX invoice bulan berjalan di dalam db.$transaction yang sama dengan
      pembuatan invoice (hindari race condition), atau tambahkan model counter khusus
      (mis. `InvoiceSequence` per periode YYYYMM) di schema.prisma dengan upsert atomic
      increment. Buat migration Prisma yang sesuai. Terapkan pola yang sama untuk semua
      nomor dokumen lain yang punya kebutuhan serupa (poNumber, receiptNo, bookingNo,
      requestNo, returnNo, disposalNo, transferNo, invoiceNo supplier) — audit semua
      dan perbaiki yang masih pakai Date.now()/random tanpa jaminan uniqueness/sequence.
1.2 Hapus SEMUA string placeholder yang tembus ke output (grep "placeholder" di
    src/actions/clinical-slice2.actions.ts — 'Diagnosis placeholder', 'Treatment
    placeholder', 'Prescription placeholder' pada timelineItems). Ganti dengan title
    yang benar dan bermakna berdasarkan data asli (mis. judul dari primaryDiagnosis,
    dari treatment plan, dari nama obat resep pertama), termasuk fallback title yang
    proper saat data kosong (bukan kata "placeholder").
1.3 Konsolidasikan RBAC: hapus semua fungsi lokal `assertRole()` yang terduplikasi di
    src/actions/*.ts (clinical, clinical-slice2, clinical-slice3, customer, hotel,
    inventory, sales, enterprise, reporting, medical-history) dan ganti semuanya memakai
    SATU implementasi bersama `requireRole` di src/lib/action-utils.ts. Pastikan
    parameter allowedRoles untuk setiap action PERSIS mengikuti Permission Matrix
    4.2.1–4.2.8 (bukan tebakan asal — cocokkan baris per baris). Untuk fungsi yang
    sebelumnya assertRole() tanpa parameter (enterprise.actions.ts, reporting.actions.ts,
    medical-history.actions.ts), definisikan array allowedRoles eksplisit sesuai tabel
    permission modul terkait, jangan hardcode ulang logic query user di tiap file.
    Tambahkan unit test yang membuktikan setiap action menolak role yang tidak diizinkan
    dan menerima role yang diizinkan (lihat contoh pola di auth.actions.test.ts).
1.4 portal.actions.ts (getPortalCustomerContext dkk): tambahkan pengecekan eksplisit
    bahwa session user memiliki role CUSTOMER sebelum mengizinkan akses portal, jangan
    hanya bergantung pada ada/tidaknya baris Customer dengan userId cocok — cegah
    kemungkinan user internal mengakses endpoint portal secara tidak sengaja.
1.5 Perbaiki model `Attachment` di prisma/schema.prisma: relasi `pet` saat ini secara
    keliru mem-FK-kan `entityId` langsung ke tabel Pet padahal `entityType` dipakai
    generic ('Pet', 'MR', dsb — lihat pemakaian entityType: 'MR' di
    clinical-slice2.actions.ts). Redesain jadi polymorphic association yang benar:
    hapus relasi Prisma langsung ke Pet, jadikan entityId murni sebagai reference id
    tanpa FK constraint (atau buat tabel relasi terpisah per entity type jika perlu
    referential integrity penuh), lalu update semua query yang membaca Attachment
    supaya join manual sesuai entityType. Tambahkan test.
1.6 Tambah model `HotelRoomType` (id, name, description, minWeight, maxWeight,
    ratePerNight, capacity, isActive, timestamps, soft delete) sesuai Master Data
    8.1/8.2 (Small/Medium/Large/XL/VIP), hubungkan HotelRoom.roomTypeId dan
    HotelBooking.roomTypeId sebagai foreign key yang valid (bukan string bebas seperti
    sekarang), buat migration, seed data sesuai 8.2, dan sediakan CRUD action + validator
    Zod (src/validators/hotel.schema.ts) untuk role OWNER/ADMIN mengelola Room Type.
1.7 Audit ulang seluruh schema.prisma untuk field id relasi (`*Id`) yang TIDAK punya
    `@relation` yang sesuai (roomTypeId di HotelRoom/HotelBooking sebelum diperbaiki di
    1.6, dan field serupa lain jika ditemukan) dan perbaiki semuanya menjadi FK yang benar
    dengan index yang sesuai.

======================================================================
PHASE 2 — MELENGKAPI MODUL SESUAI PERMISSION MATRIX & BUSINESS RULES
======================================================================
2.1 Manajemen User Internal (Bab 3.2.2, Permission Matrix 4.2.1 "Manage Users"):
    - src/app/(dashboard)/admin/page.tsx saat ini HANYA menampilkan daftar user (read
      only). Tambahkan UI + server action (Owner-only, gunakan requireRole(['OWNER']))
      untuk: create user internal (ADMIN/DOCTOR/CASHIER/STAFF) dengan validasi username
      unik min 3 karakter alfanumerik+underscore dan PIN 6 digit (hash bcrypt 10 rounds
      via src/lib/auth.ts), deactivate/reactivate user, reset PIN, ubah role.
    - Tambahkan action & UI untuk Admin/Owner membuat akun Customer baru (Bab 3.2.3):
      auto-generate username format cust_[nama_lowercase]_[random4digit] dan PIN 6 digit
      random, set mustChangePin=true, simpan histori PIN awal, sediakan tampilan/print
      "Kartu Akun" (nama, username, PIN awal) dalam bentuk halaman print-friendly
      (bukan file PDF baru, cukup route/komponen print via window.print()).
    - Implementasikan enforcement "wajib ganti PIN saat first login" (mustChangePin)
      di flow login/portal: jika true, redirect paksa ke halaman ganti PIN sebelum akses
      lain, dan validasi PIN baru tidak boleh sama dengan 5 PIN terakhir (field
      pinHistory sudah ada di schema — pakai itu, jangan buat kolom baru).
2.2 Settings (Bab 4.2.1 "Manage Clinic Settings", Owner-only):
    - src/app/(dashboard)/settings/page.tsx sekarang read-only padahal action
      upsertSystemSettings sudah ada di enterprise.actions.ts. Bangun form edit (React
      Hook Form + Zod resolver, ikuti pola form lain di repo) yang memanggil action
      tersebut, dengan requireRole(['OWNER']) di actionnya (perbaiki assertRole() yang
      sekarang generic OWNER/ADMIN jika PRD menghendaki Owner-only — cek ulang tabel 4.2.1).
2.3 Master Data CRUD (Bab 8.1, Permission Matrix 4.2.1 "Manage Master Data" — Owner/
    Admin/Staff): buat validator, server actions (create/update/soft-delete/list, pakai
    requireRole yang benar), dan halaman UI sederhana namun fungsional (bukan raw ID
    input) untuk: Species, Breed (per species), Color, Treatment Category, Treatment
    (dengan harga), Product Category. Sediakan seed data awal sesuai Bab 8.2 lewat
    prisma/seed atau src/app/api/seed/route.ts yang sudah ada (extend, jangan duplikasi
    mekanisme seeding).
2.4 Pet Hotel — lengkapi Workflow Matrix 4.3.3:
    - Tambahkan status/step approval booking (Admin approve booking sebelum check-in
      dimungkinkan) sesuai workflow "RESERVED → (approve) → CHECKED_IN". Jika enum
      HotelBookingStatus saat ini tidak cukup mengekspresikan "menunggu approval" vs
      "sudah disetujui", tambahkan field/flag yang sesuai (mis. approvedAt/approvedBy)
      tanpa merusak data existing — buat migration additive.
    - Implementasikan validasi vaksin rabies di checkInHotelBooking (Bab 3.6.2): tolak
      check-in jika VaccinationRecord rabies terakhir untuk pet tersebut sudah lebih dari
      1 tahun atau tidak ada, KECUALI di-override eksplisit oleh role OWNER (sediakan
      parameter override + catat alasan override ke AuditLog).
2.5 Reporting (Bab 4.2.7) — pecah getEnterpriseReportingSummary yang monolitik menjadi
    fungsi-fungsi terpisah sesuai matrix: Financial Report (Owner/Admin), Sales Report
    (Owner/Admin/Cashier), Medical Report (Owner/Admin/Doctor), Inventory Report
    (Owner/Admin/Staff), Pet Hotel Report (Owner/Admin/Staff), Doctor Performance
    (Owner/Admin). Setiap fungsi punya requireRole sendiri sesuai kolom di tabel 4.2.7.
    Tambahkan kemampuan Export Report (Owner/Admin only) minimal dalam format CSV
    (generate on the fly di server action, kembalikan sebagai string/buffer untuk
    diunduh via route handler — tidak perlu library berat, gunakan format CSV manual atau
    library ringan yang sudah lazim di ekosistem Next.js).
2.6 Void/Refund Invoice — pastikan aturan 3.3.4 diterapkan penuh: void hanya untuk
    invoice yang belum dibayar ATAU dibayar HARI INI, refund untuk yang dibayar di hari
    sebelumnya (cek logic tanggal saat ini di sales.actions.ts, perbaiki jika belum
    membedakan kedua kasus tersebut secara eksplisit), keduanya wajib field alasan
    (sudah ada) dan tercatat AuditLog (sudah ada) — verifikasi & tambahkan test yang
    membuktikan pembedaan void vs refund berdasarkan tanggal pembayaran.
2.7 Prescription lock rule (Bab 3.5.2): pastikan status DISPENSED tidak bisa diubah lagi
    — cari semua mutation terhadap Prescription dan tambahkan guard eksplisit
    `if (status === 'DISPENSED') return error` bila belum ada.
2.8 Medical Record lock rule (Bab 3.5.1): pastikan Medical Record tidak bisa diubah
    setelah Appointment berstatus COMPLETED — audit semua fungsi update terhadap
    MedicalRecord/Diagnosis/TreatmentPlan/SoapNote dan tambahkan guard yang konsisten
    (banyak model punya field isLocked — pastikan dipakai secara nyata sebagai enforcement,
    bukan sekadar kolom yang tidak pernah dicek).

======================================================================
PHASE 3 — UI/UX: HILANGKAN RAW ID INPUT
======================================================================
Ganti semua `<input placeholder="Customer ID">`, `"Pet ID"`, `"Room ID"`, `"Doctor ID"`,
`"Booking ID"`, `"ID rekam medis"` (ditemukan di hotel-page-client.tsx, pos-page-client.tsx,
clinical-page-client.tsx, clinical-slice2-client.tsx) dengan komponen search/select yang
proper:
- Buat komponen reusable combobox/typeahead (client component sederhana, tanpa
  dependency baru — cukup fetch via server action + input debounce + dropdown list)
  untuk memilih Customer, Pet (terfilter by customer terpilih), Doctor (dari User
  role DOCTOR), Room (dari HotelRoom yang AVAILABLE), Booking, Medical Record.
- Setiap combobox menampilkan nama/label yang manusiawi (nama customer + no HP, nama
  pet + species, nama dokter, no kamar + tipe) sambil tetap mengirim id sebagai value
  ke server action.
- Terapkan pola ini konsisten ke SEMUA halaman dashboard yang saat ini pakai raw id
  text input: pos-page-client.tsx, hotel-page-client.tsx, clinical-page-client.tsx,
  clinical-slice2-client.tsx.
- Jangan install library UI baru kecuali benar-benar diperlukan; utamakan konsistensi
  dengan styling Tailwind yang sudah dipakai di seluruh repo.

======================================================================
PHASE 4 — TESTING (UNIT, INTEGRASI, E2E)
======================================================================
4.1 Unit test WAJIB dibuat untuk file yang saat ini nol test:
    - src/actions/clinical.actions.ts
    - src/actions/clinical-slice2.actions.ts
    - src/actions/clinical-slice3.actions.ts
    - src/actions/customer.actions.ts
    - src/actions/medical-history.actions.ts
    Ikuti pola mocking yang sudah dipakai di sales.actions.test.ts / hotel.actions.test.ts
    / inventory.actions.test.ts (mock db, mock session). Setiap fungsi minimal punya test:
    happy path, role ditolak (RBAC), validasi Zod gagal, dan satu edge case bisnis
    spesifik dari Bab 3 (contoh: MedicalRecord tidak bisa diupdate setelah Appointment
    COMPLETED; Prescription DISPENSED tidak bisa diubah).
4.2 Tambahkan integration test (boleh tetap pakai Vitest, dengan db yang di-mock secara
    lebih menyeluruh atau — jika memungkinkan di lingkungan Codespace — jalan terhadap
    Postgres nyata via testcontainers/service container) untuk alur bisnis lintas modul
    yang menjadi inti PRD:
    a) "Dokter Input Sekali": create Appointment → dokter isi Medical Record → verifikasi
       otomatis: Invoice PENDING terbuat, StockMovement OUT tercatat dari batch FEFO yang
       benar, AuditLog tercatat — tanpa kasir input ulang apa pun.
    b) FEFO end-to-end: dua batch produk sama dengan expiry berbeda, resepkan qty yang
       memaksa pengambilan dari 2 batch sekaligus, verifikasi urutan pengambilan dan sisa
       qty tiap batch benar.
    c) POS walk-in checkout → stok berkurang → invoice PAID → payment tercatat →
       loyalty/membership (jika customer terdaftar) ter-update.
    d) Void invoice (dibayar hari ini) vs Refund invoice (dibayar hari sebelumnya) →
       stok dikembalikan via StockMovement type RETURN, AuditLog tercatat.
    e) Hotel booking lifecycle penuh: booking → approve → check-in (dengan & tanpa
       vaksin valid) → daily log → check-out → invoice otomatis kamar+layanan tambahan.
    f) Invoice numbering: buat >5 invoice "bersamaan" (Promise.all) dalam bulan yang
       sama, pastikan semua invoiceNo unik dan sequential tanpa gap/duplikasi.
4.3 Setup E2E testing dengan Playwright (tambahkan sebagai devDependency, buat
    playwright.config.ts, folder e2e/, script `test:e2e` di package.json). Tulis
    skenario E2E minimal: login per role (Owner/Admin/Doctor/Cashier/Staff/Customer)
    dan verifikasi menu/halaman yang boleh/tidak boleh diakses sesuai Permission Matrix
    4.2, plus satu skenario end-to-end POS checkout penuh dari UI (bukan langsung
    panggil action).
4.4 Tambahkan target coverage minimum di vitest.config.ts sesuai Technical Goal TG-05
    (>80% untuk critical paths — tentukan file mana yang "critical" berdasarkan Bab 3,
    minimal semua src/actions/*.ts non-test), dan buat CI gagal jika coverage di bawah
    threshold.

======================================================================
PHASE 5 — CI/CD & PRODUCTION READINESS
======================================================================
5.1 Perluas .github/workflows/ci.yml (atau pecah jadi beberapa workflow file) supaya:
    - Punya service container PostgreSQL untuk menjalankan `prisma migrate deploy` +
      test integrasi yang butuh DB nyata (bukan cuma prisma validate).
    - Menjalankan `npm audit --audit-level=high` (atau setara) dan gagal build jika ada
      kerentanan high/critical.
    - Menjalankan job E2E Playwright terpisah (boleh non-blocking di awal, tapi harus ada).
    - Cache dependency dengan benar, jalan di matrix Node LTS yang relevan.
5.2 Buat file `.env.example` di root berisi semua environment variable yang dibutuhkan
    aplikasi (DATABASE_URL, SESSION_SECRET, dan lainnya yang kamu temukan dipakai via
    process.env di seluruh src/), dengan komentar singkat tiap variable dan nilai contoh
    yang aman (bukan secret asli).
5.3 Putuskan status dependency `next-auth`: karena implementasi sesi aktual adalah
    custom HMAC cookie (src/lib/session.ts) dan TIDAK memakai next-auth sama sekali,
    HAPUS dependency next-auth dari package.json (dan @auth/* terkait jika ada) untuk
    mengurangi attack surface & bundle size — KECUALI kamu menemukan bukti pemakaian
    tersembunyi di kode (cek dulu dengan grep sebelum menghapus). Dokumentasikan
    keputusan ini singkat sebagai code comment di session.ts, bukan file markdown baru.
5.4 Tinjau src/lib/session.ts: signing key fallback 'dev-session-secret-change-me' untuk
    non-production sudah ada, tapi pastikan tidak ada jalur di mana signature verification
    bisa dilewati. Tambahkan rotasi/expiry check yang sudah ada (exp field) ke dalam test
    khusus session (encode → tunggu expired secara simulasi waktu → decode harus null).
5.5 Perkuat middleware.ts: saat ini hanya membedakan akses '/admin', padahal Permission
    Matrix 4.2 punya aturan granular per modul (mis. Cashier tidak boleh akses halaman
    Clinical/Inventory management, Doctor tidak boleh akses POS, Staff tidak boleh akses
    Reports finansial, dst). Tambahkan pemetaan path→allowedRoles di middleware sebagai
    lapisan pertahanan kedua di level route (defense in depth) — TIDAK menggantikan
    requireRole di server actions (Phase 1.3), melainkan melengkapi supaya user dengan
    role salah bahkan tidak bisa melihat halaman UI-nya sama sekali, sesuai kolom
    permission per modul di Bab 4.2.1–4.2.8.
5.6 Perbaiki isi Doc/GA_READINESS_SUMMARY.md, Doc/PRODUCTION_RELEASE_CHECKLIST.md, dan
    Doc/TEST_COVERAGE_REPORT.md HANYA jika klaim di dalamnya sudah tidak akurat setelah
    perubahanmu (edit ringkas file existing, JANGAN buat file baru, JANGAN menulis ulang
    jadi dokumen panjang baru).

======================================================================
KRITERIA SELESAI (DoD) — WAJIB SEMUA TERPENUHI
======================================================================
[ ] npm run lint, npx tsc --noEmit, npm run test, npm run test:coverage, npm run build,
    npx prisma validate — semua hijau tanpa warning baru yang disengaja diabaikan.
[ ] Setiap baris di Permission Matrix Bab 4.2.1–4.2.8 punya bukti test yang membuktikan
    role yang tidak diizinkan ditolak dan role yang diizinkan diterima.
[ ] Tidak ada lagi string literal "placeholder" pada data yang ditampilkan ke user.
[ ] Tidak ada lagi input teks bebas untuk memilih Customer/Pet/Doctor/Room/Booking/
    Medical Record di UI dashboard — semua pakai search/select.
[ ] Invoice/PO/booking/dsb numbering terbukti sequential & unik di bawah concurrency
    (dibuktikan test Promise.all).
[ ] clinical.actions.ts, clinical-slice2/3.actions.ts, customer.actions.ts,
    medical-history.actions.ts masing-masing punya file test dengan coverage berarti
    (bukan sekadar 1 smoke test).
[ ] Playwright E2E berjalan di CI.
[ ] .env.example ada dan lengkap.
[ ] Tidak ada file dokumentasi/markdown BARU yang kamu tambahkan selama proses ini.

Kerjakan phase demi phase, tampilkan ringkasan perubahan tiap phase di chat (bukan file
terpisah), dan berhenti untuk konfirmasi jika kamu menemukan ambiguitas antara PRD Bab
1–8 dan kode existing yang tidak bisa kamu selesaikan sendiri secara aman.
