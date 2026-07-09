# PRD.md — HaLand PetCare
## Integrated Veterinary Clinic & Petshop Management System

**Document Version:** 1.0.0 FINAL
**Date:** July 10, 2026
**Status:** Single Source of Truth — Production Ready
**Classification:** Enterprise Internal

---

# DAFTAR ISI

1. [Executive Summary](#1-executive-summary)
2. [Product Goals](#2-product-goals)
3. [Business Rules](#3-business-rules)
4. [User Roles & Permission Matrix](#4-user-roles--permission-matrix)
5. [Tech Stack](#5-tech-stack)
6. [Software Architecture](#6-software-architecture)
7. [Database Design](#7-database-design)
8. [Master Data](#8-master-data)
9. [Modul 1 — Foundation & Administration](#9-modul-1--foundation--administration)
10. [Modul 2 — Customer & Pet Management](#10-modul-2--customer--pet-management)
11. [Modul 3 — Clinical Management](#11-modul-3--clinical-management)
12. [Modul 4 — Petshop & Inventory](#12-modul-4--petshop--inventory)
13. [Modul 5 — Sales, Billing & POS](#13-modul-5--sales-billing--pos)
14. [Modul 6 — Pet Hotel Management](#14-modul-6--pet-hotel-management)
15. [Modul 7 — Reporting & Analytics](#15-modul-7--reporting--analytics)
16. [Modul 8 — Customer Portal & Integration](#16-modul-8--customer-portal--integration)
17. [UI & UX Guidelines](#17-ui--ux-guidelines)
18. [Workflow](#18-workflow)
19. [Automation](#19-automation)
20. [Validation Rules](#20-validation-rules)
21. [Reporting](#21-reporting)
22. [Notification](#22-notification)
23. [Security](#23-security)
24. [API / Server Actions](#24-api--server-actions)
25. [Coding Standard](#25-coding-standard)
26. [Folder Structure](#26-folder-structure)
27. [Development Rules](#27-development-rules)
28. [Testing](#28-testing)
29. [Deployment](#29-deployment)
30. [Roadmap](#30-roadmap)

---

# 1. EXECUTIVE SUMMARY

## 1.1 Deskripsi Produk

**HaLand PetCare** adalah sistem manajemen terpadu (Integrated Management System) yang dirancang khusus untuk operasional klinik hewan modern yang juga menjalankan bisnis petshop, farmasi, penitipan hewan (pet hotel), dan layanan pelanggan digital. Sistem ini mengonsolidasikan seluruh proses bisnis — mulai dari pendaftaran pelanggan, pemeriksaan medis, pengelolaan inventaris, transaksi penjualan, penitipan hewan, hingga portal pelanggan — ke dalam satu platform terintegrasi.

HaLand PetCare bukan sekadar aplikasi klinik. Ia adalah **sistem operasi bisnis** untuk klinik hewan yang menghilangkan silo data, mengotomatisasi alur kerja lintas departemen, dan memberikan visibilitas real-time kepada pemilik bisnis.

## 1.2 Tujuan

| Kategori | Tujuan |
|---|---|
| **Bisnis** | Meningkatkan efisiensi operasional klinik hingga 60%, mengurangi human error, dan mempercepat layanan pelanggan. |
| **Teknis** | Menyediakan platform yang stabil, scalable, dan mudah dipelihara dengan arsitektur sederhana namun enterprise-grade. |
| **Operasional** | Menghilangkan input data berulang (double-entry), menyediakan audit trail lengkap, dan memastikan akurasi data real-time. |
| **Pengalaman** | Memberikan pengalaman kerja yang konsisten bagi staf internal dan pengalaman digital yang modern bagi pelanggan. |

## 1.3 Business Value

1. **Efisiensi Waktu**: Dokter hanya menginput data medis sekali. Sistem secara otomatis menghasilkan invoice, mengurangi stok, dan memperbarui laporan.
2. **Akurasi Data**: Single source of truth untuk data pelanggan, hewan, medis, inventaris, dan transaksi.
3. **Kontrol Inventaris**: FEFO (First Expired, First Out) otomatis untuk obat, mencegah kerugian akibat barang kedaluwarsa.
4. **Visibilitas Bisnis**: Dashboard real-time dan laporan komprehensif untuk pengambilan keputusan.
5. **Kepatuhan**: Audit log lengkap untuk setiap perubahan data kritis.
6. **Layanan Pelanggan**: Portal pelanggan yang memungkinkan akses mandiri ke riwayat medis dan transaksi.
7. **Skalabilitas**: Arsitektur modular yang memungkinkan penambahan fitur tanpa merombak sistem inti.

## 1.4 Target Pengguna

| Pengguna | Deskripsi |
|---|---|
| **Owner** | Pemilik klinik. Memiliki akses penuh ke seluruh sistem, termasuk konfigurasi dan manajemen pengguna. |
| **Admin** | Administrator operasional. Mengelola data master, pelanggan, dan operasional harian. |
| **Dokter Hewan** | Tenaga medis. Melakukan pemeriksaan, mencatat rekam medis, memberikan tindakan dan resep. |
| **Kasir** | Petugas transaksi. Memproses pembayaran dari klinik dan petshop. |
| **Staff** | Staf pendukung. Mengelola inventaris, petshop, pet hotel, dan administrasi umum. |
| **Customer** | Pelanggan klinik. Mengakses portal untuk melihat riwayat medis, transaksi, dan melakukan booking. |

## 1.5 Permasalahan yang Diselesaikan

| Permasalahan | Solusi HaLand PetCare |
|---|---|
| Input data berulang oleh dokter dan kasir | Prinsip "Dokter Input Sekali" — invoice otomatis dari rekam medis |
| Stok obat tidak akurat | Stock Movement based dengan FEFO otomatis |
| Tidak ada jejak audit | Audit Log untuk setiap perubahan data kritis |
| Data pelanggan dan hewan tersebar | Sentralisasi data Customer-Pet-Medical-Transaction |
| Tidak ada visibilitas bisnis | Dashboard KPI dan Reporting real-time |
| Pelanggan tidak punya akses ke riwayat | Customer Portal dengan akses mandiri |
| Sistem terpisah untuk klinik dan petshop | Satu platform terintegrasi |
| Kesulitan melacak barang kedaluwarsa | Batch tracking dengan expired monitoring |
| Billing manual rawan error | Auto-billing dari rekam medis dan pet hotel |

## 1.6 Vision

Menjadi sistem manajemen klinik hewan dan petshop terdepan di Indonesia yang mengintegrasikan seluruh operasional bisnis dalam satu platform sederhana, stabil, dan mudah digunakan.

## 1.7 Scope

**In Scope:**
- 8 modul utama (Foundation, Customer & Pet, Clinical, Petshop & Inventory, Sales/Billing/POS, Pet Hotel, Reporting, Customer Portal)
- Autentikasi username + PIN untuk semua pengguna
- Integrasi penuh antar modul
- Dashboard dan reporting
- Customer portal
- Audit log dan soft delete

**Out of Scope:**
- Integrasi dengan asuransi hewan
- Telemedicine / video call
- Mobile app native (portal web responsif)
- Multi-cabang / multi-clinic (single clinic only)
- Akuntansi penuh (hanya laporan keuangan dasar)
- Integrasi e-commerce eksternal

---

# 2. PRODUCT GOALS

## 2.1 Business Goals

| ID | Goal | Target |
|---|---|---|
| BG-01 | Mengurangi waktu administrasi dokter | 60% lebih cepat |
| BG-02 | Menghilangkan double-entry data | 100% eliminasi |
| BG-03 | Meningkatkan akurasi stok obat | 99.9% akurasi |
| BG-04 | Mempercepat proses checkout kasir | < 2 menit per transaksi |
| BG-05 | Meningkatkan kepuasan pelanggan | NPS > 50 |
| BG-06 | Memberikan visibilitas bisnis real-time | Dashboard < 3 detik load |

## 2.2 Technical Goals

| ID | Goal | Target |
|---|---|---|
| TG-01 | Page load time | < 2 detik |
| TG-02 | API response time | < 500ms |
| TG-03 | Database query time | < 200ms |
| TG-04 | System uptime | 99.9% |
| TG-05 | Code coverage | > 80% untuk critical paths |
| TG-06 | Zero critical bugs in production | 0 |

## 2.3 Operational Goals

| ID | Goal | Target |
|---|---|---|
| OG-01 | Onboarding new staff | < 1 jam training |
| OG-02 | System maintenance | < 2 jam per bulan |
| OG-03 | Data backup | Otomatis harian |
| OG-04 | Incident response | < 15 menit |

## 2.4 KPI & Success Metrics

| KPI | Baseline | Target | Measurement |
|---|---|---|---|
| Transactions per day | Manual tracking | 100% digital | System log |
| Stock accuracy | ~85% | 99.9% | Stock opname vs system |
| Billing errors | ~5% | < 0.1% | Void/refund rate |
| Customer portal adoption | 0% | > 40% | Active portal users |
| Doctor input time | ~10 menit/pasien | < 5 menit/pasien | Time tracking |

---

# 3. BUSINESS RULES

## 3.1 Prinsip Utama

### 3.1.1 Dokter Input Sekali (Single Entry Principle)

Dokter hanya menginput data medis **satu kali** pada Rekam Medis. Sistem secara otomatis:
- Membuat Invoice dengan status `PENDING`
- Mengurangi stok obat dari InventoryBatch (FEFO)
- Mencatat StockMovement
- Mencatat AuditLog
- Memperbarui Dashboard KPI
- Memperbarui Laporan

**Kasir TIDAK PERNAH menginput ulang tindakan atau obat.** Kasir hanya melakukan verifikasi, pembayaran, dan pencetakan invoice.

### 3.1.2 Stock Movement is King

Tidak ada kolom `stock` yang di-update langsung di tabel `Product` atau `InventoryBatch`. Semua perubahan stok **WAJIB** melalui tabel `StockMovement`. Stok saat ini adalah hasil kalkulasi:

```
Current Stock = SUM(StockMovement IN) - SUM(StockMovement OUT)
```

Untuk performa, kolom `currentQty` di `InventoryBatch` di-denormalize dan di-sync via database trigger atau transaction.

### 3.1.3 Soft Delete Mandatory

Data transaksi, pelanggan, hewan, produk, dan data bisnis lainnya **TIDAK BOLEH dihapus secara fisik (Hard Delete)**. Gunakan kolom `deletedAt` untuk soft delete. Hard delete hanya diperbolehkan untuk:
- Session token
- Temporary cache
- Error log lama (> 90 hari)

### 3.1.4 Audit Log Mandatory

Setiap perubahan pada data kritis **WAJIB** dicatat di `AuditLog`:
- CREATE, UPDATE, DELETE pada master data
- Semua transaksi (invoice, payment, stock movement)
- Login/logout
- Perubahan konfigurasi

### 3.1.5 Snapshot Harga Transaksi

Harga yang tercatat di `InvoiceItem` adalah **snapshot harga saat transaksi**. Perubahan harga master di kemudian hari **TIDAK BOLEH** mengubah harga transaksi yang sudah terjadi. Ini memastikan integritas laporan keuangan historis.

### 3.1.6 Database Transaction

Semua operasi yang melibatkan lebih dari satu tabel **WAJIB** menggunakan database transaction (`prisma.$transaction`). Ini memastikan atomicity dan consistency.

## 3.2 Aturan Autentikasi & Pengguna

### 3.2.1 Username + PIN Only

- **Hanya ada satu mekanisme autentikasi**: Username + PIN (6 digit)
- **Tidak ada**: email login, OTP, magic link, OAuth, password tradisional
- PIN di-hash menggunakan bcrypt (10 rounds)
- Session menggunakan Auth.js dengan JWT strategy
- Session duration: 8 jam (configurable)

### 3.2.2 Pembuatan Akun Internal

- **Hanya Owner** yang dapat membuat akun internal (Admin, Dokter, Kasir, Staff)
- Admin **TIDAK BOLEH** membuat akun internal
- Dokter dan Staff **TIDAK BOLEH** membuat akun apapun
- Username harus unik, minimal 3 karakter, alphanumeric + underscore
- PIN minimal 6 digit, maksimal 6 digit

### 3.2.3 Pembuatan Akun Customer

- Akun Customer **dibuat oleh Admin atau Owner** saat customer mendaftar di klinik
- Admin input: nama, no HP, email (opsional), alamat
- Sistem auto-generate: username (format: `cust_[nama_lowercase]_[random 4 digit]`) dan PIN awal (6 digit random)
- Admin mencetak "Kartu Akun" untuk diberikan ke customer
- **Tidak ada self-registration** via portal
- **Tidak ada reset PIN via email/WA** — customer datang ke klinik, Admin reset PIN setelah verifikasi identitas

### 3.2.4 First Login Customer

- Saat first login, customer **WAJIB** mengganti PIN
- PIN baru harus berbeda dari PIN lama
- PIN lama di-blacklist selama 5 pergantian terakhir

## 3.3 Aturan Transaksi

### 3.3.1 Walk-In Customer

Transaksi petshop/retail **TIDAK WAJIB** memiliki data customer lengkap. Sistem menyediakan:
- Pilih customer yang sudah terdaftar
- Gunakan "Walk-In Customer" (hanya nama, tanpa akun)
- Gunakan default Walk-In customer (sudah ada di sistem)

Walk-In Customer **TIDAK** memiliki:
- Akun portal
- Riwayat transaksi terlink
- Data pet
- Akses ke medical record

### 3.3.2 Invoice Auto-Numbering

Format nomor invoice:
```
INV-[YYYY][MM]-[sequential 5 digit]
Contoh: INV-202607-00001
```

Reset sequence setiap awal bulan. Nomor tidak pernah digunakan ulang (meskipun invoice di-void).

### 3.3.3 Payment Rules

- Satu invoice dapat memiliki multiple payments (partial payment)
- Total payment harus = total invoice untuk status `PAID`
- Metode pembayaran: CASH, CARD, QRIS, TRANSFER
- Pembayaran dicatat di tabel `Payment` terpisah
- Receipt dicetak setelah payment berhasil

### 3.3.4 Void & Refund

- **Void**: Hanya untuk invoice yang belum dibayar atau dibayar hari ini
- **Refund**: Untuk invoice yang sudah dibayar di hari sebelumnya
- Void/Refund **WAJIB** memiliki alasan dan dicatat di AuditLog
- Void/Refund hanya bisa dilakukan oleh Owner atau Admin
- Stok dikembalikan otomatis saat void/refund (via StockMovement type RETURN)

## 3.4 Aturan Inventaris

### 3.4.1 FEFO (First Expired, First Out)

Saat obat diresepkan atau dijual:
1. Sistem mencari semua batch dengan `currentQty > 0` dan `expiredAt > today`
2. Urutkan berdasarkan `expiredAt ASC`
3. Ambil dari batch paling cepat kedaluwarsa
4. Jika qty batch tidak cukup, lanjut ke batch berikutnya
5. Batch yang sudah expired **TIDAK BOLEH** digunakan (sistem auto-block)

### 3.4.2 Batch Tracking

- Setiap barang masuk (Purchase Order) **WAJIB** memiliki:
  - Nomor Batch
  - Tanggal Kedaluwarsa (untuk obat)
  - Tanggal Produksi (opsional)
  - Harga Beli
- Batch diwakili oleh tabel `InventoryBatch`
- Satu produk dapat memiliki multiple batch

### 3.4.3 Stock Adjustment

- Penyesuaian stok **WAJIB** melalui StockMovement type `ADJUSTMENT`
- **WAJIB** memiliki alasan (notes)
- **WAJIB** diapprove oleh Owner atau Admin
- Dicatat di AuditLog

### 3.4.4 Stock Opname

- Stock Opname adalah proses rekonsiliasi stok fisik vs sistem
- Hasil opname dicatat sebagai StockMovement type `OPNAME`
- Selisih positif = stock in, selisih negatif = stock out
- **WAJIB** diapprove oleh Owner

### 3.4.5 Minimum Stock Alert

- Setiap produk memiliki `minStock`
- Jika `currentQty <= minStock`, sistem men-trigger notifikasi
- Notifikasi muncul di Dashboard dan Notification Center
- Email/WA notifikasi (jika dikonfigurasi)

## 3.5 Aturan Klinis

### 3.5.1 Medical Record

- Satu Appointment = Satu Medical Record (1:1)
- Medical Record **TIDAK BOLEH** diubah setelah status Appointment = `COMPLETED`
- Hanya dokter yang membuat MR yang dapat melihat detail lengkap
- Owner dan Admin dapat melihat MR untuk keperluan audit

### 3.5.2 Prescription

- Resep otomatis tercatat di MedicalRecordItem
- Pasien dapat mengambil obat di farmasi klinik atau luar
- Status resep: `PRESCRIBED`, `DISPENSED`, `CANCELLED`
- Obat yang sudah `DISPENSED` tidak dapat diubah

### 3.5.3 Vital Sign

- Wajib dicatat untuk setiap pemeriksaan: berat badan, suhu
- Opsional: HR (heart rate), RR (respiratory rate)
- Data vital sign disimpan di `WeightHistory` dan `VitalSignRecord`
- Grafik berat badan ditampilkan di Medical Record form

## 3.6 Aturan Pet Hotel

### 3.6.1 Booking

- Satu kamar tidak dapat di-booking oleh lebih dari satu hewan pada periode yang sama
- Booking dapat dibuat untuk periode future
- Status booking: `RESERVED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`

### 3.6.2 Check-In

- Hewan wajib memiliki data lengkap (nama, species, vaksin terakhir)
- Vaksin rabies **WAJIB** masih valid (dalam 1 tahun terakhir)
- Jika vaksin tidak valid, sistem menolak check-in (kecuali di-override oleh Owner)

### 3.6.3 Daily Care

- Staf wajib mencatat kondisi hewan setiap hari
- Catatan meliputi: nafsu makan, aktivitas, buang air, kondisi umum
- Jika ada kelainan, staf dapat memanggil dokter (link ke Medical Record)

### 3.6.4 Check-Out & Billing

- Saat check-out, sistem otomatis menghitung:
  - Biaya kamar (jumlah hari × harga per hari)
  - Biaya perawatan tambahan (makanan khusus, grooming, dll)
  - Biaya obat/tindakan medis (jika ada)
- Total otomatis masuk ke Invoice
- Kasir memproses pembayaran seperti biasa

## 3.7 Aturan Portal Customer

### 3.7.1 Akses Data

Customer hanya dapat melihat:
- Data diri sendiri
- Data hewan milik sendiri
- Rekam medis hewan milik sendiri
- Invoice milik sendiri
- Booking milik sendiri

Customer **TIDAK BOLEH** melihat:
- Data customer lain
- Data internal klinik
- Laporan keuangan
- Data staf

### 3.7.2 Booking

- Customer dapat booking Appointment dan Pet Hotel
- Booking masuk dengan status `PENDING`
- Admin/Dokter approve booking → status `CONFIRMED`
- Customer dapat cancel booking (dengan alasan)

### 3.7.3 Ganti PIN

- Customer dapat ganti PIN sendiri setelah login
- PIN lama di-blacklist 5 pergantian terakhir
- PIN baru minimal 6 digit

---

# 4. USER ROLES & PERMISSION MATRIX

## 4.1 Definisi Role

| Role | Deskripsi | Scope |
|---|---|---|
| **OWNER** | Pemilik klinik. Akses penuh ke seluruh sistem. | Global |
| **ADMIN** | Administrator operasional. Mengelola data master, customer, operasional harian. | Global (kecuali konfigurasi sistem dan manajemen user internal) |
| **DOCTOR** | Dokter hewan. Fokus pada pemeriksaan medis dan rekam medis. | Clinical + Medical Record |
| **CASHIER** | Kasir. Fokus pada transaksi dan pembayaran. | POS + Billing |
| **STAFF** | Staf pendukung. Mengelola inventaris, petshop, pet hotel. | Inventory + Petshop + Pet Hotel |
| **CUSTOMER** | Pelanggan. Akses portal mandiri. | Portal only |

## 4.2 Permission Matrix

### 4.2.1 Modul 1 — Foundation & Administration

| Action | OWNER | ADMIN | DOCTOR | CASHIER | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage Users (Internal) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Audit Log | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Clinic Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Notification Center | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage Master Data | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

### 4.2.2 Modul 2 — Customer & Pet Management

| Action | OWNER | ADMIN | DOCTOR | CASHIER | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Create Customer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update Customer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Customer (Soft) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View All Customers | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Pet | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update Pet | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Own Pet | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Vaccination | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Medical History | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### 4.2.3 Modul 3 — Clinical Management

| Action | OWNER | ADMIN | DOCTOR | CASHIER | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Create Appointment | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| View All Appointments | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage Queue | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Create Medical Record | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Update Medical Record | ✅ | ❌ | ✅ (own) | ❌ | ❌ | ❌ |
| View Medical Record | ✅ | ✅ | ✅ (own) | ❌ | ❌ | ✅ (own) |
| Prescribe Medicine | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Own Medical Record | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

### 4.2.4 Modul 4 — Petshop & Inventory

| Action | OWNER | ADMIN | DOCTOR | CASHIER | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View Products | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Product | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Update Product | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Create Purchase Order | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Approve Purchase Order | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Receive Goods | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Adjust Stock | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Approve Stock Adjustment | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Stock Opname | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| View Stock Movement | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| View Expired Monitoring | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

### 4.2.5 Modul 5 — Sales, Billing & POS

| Action | OWNER | ADMIN | DOCTOR | CASHIER | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Create POS Transaction | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Pending Invoice | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Process Payment | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Void Invoice | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Refund Invoice | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Print Receipt | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| View All Invoices | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Own Invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

### 4.2.6 Modul 6 — Pet Hotel Management

| Action | OWNER | ADMIN | DOCTOR | CASHIER | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Manage Rooms | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Create Booking | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Approve Booking | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Check-In | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Daily Care Log | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Check-Out | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| View All Bookings | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| View Own Booking | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |

### 4.2.7 Modul 7 — Reporting & Analytics

| Action | OWNER | ADMIN | DOCTOR | CASHIER | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View Dashboard KPI | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Financial Report | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Sales Report | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Medical Report | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Inventory Report | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Pet Hotel Report | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Doctor Performance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export Report | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### 4.2.8 Modul 8 — Customer Portal

| Action | OWNER | ADMIN | DOCTOR | CASHIER | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Access Portal | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Profile | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Change PIN | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View My Pets | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Medical History | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View My Invoices | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Book Appointment | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Book Pet Hotel | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Notifications | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## 4.3 Workflow Matrix

### 4.3.1 Alur Pendaftaran Pasien Baru

```
[Customer Datang] 
    ↓
[Staff/Admin: Buat Customer] → [Buat Pet]
    ↓
[Staff: Buat Appointment]
    ↓
[Dokter: Periksa → Buat Medical Record]
    ↓ (auto)
[Sistem: Buat Invoice PENDING]
    ↓
[Kasir: Verifikasi & Bayar]
    ↓
[Selesai]
```

### 4.3.2 Alur Transaksi Petshop (Walk-In)

```
[Customer Datang]
    ↓
[Kasir: Pilih Walk-In Customer]
    ↓
[Kasir: Scan/Input Produk]
    ↓
[Kasir: Bayar]
    ↓ (auto)
[Sistem: Kurangi Stok via StockMovement]
    ↓
[Kasir: Cetak Struk]
    ↓
[Selesai]
```

### 4.3.3 Alur Pet Hotel

```
[Customer: Booking via Portal / Admin: Buat Booking]
    ↓
[Admin: Approve Booking]
    ↓
[Staff: Check-In] → [Verifikasi Vaksin]
    ↓
[Staff: Daily Care Log (harian)]
    ↓ (jika sakit)
[Dokter: Periksa → Medical Record → Auto Invoice]
    ↓
[Staff: Check-Out]
    ↓ (auto)
[Sistem: Generate Invoice (kamar + perawatan + obat)]
    ↓
[Kasir: Bayar]
    ↓
[Selesai]
```

---

# 5. TECH STACK

## 5.1 Core Stack

| Layer | Teknologi | Versi | Alasan |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 14.2+ | React framework production-ready, server components, server actions |
| **Language** | TypeScript | 5.4+ | Type safety, better DX, fewer runtime errors |
| **ORM** | Prisma | 5.14+ | Type-safe queries, easy migrations, great DX |
| **Database** | PostgreSQL | 15+ | Reliable, feature-rich, easy to migrate to Supabase |
| **Validation** | Zod | 3.23+ | Type-safe validation, works with RHF |
| **Authentication** | Auth.js (NextAuth) | 5.0+ | Flexible, supports credentials provider |
| **Form** | React Hook Form | 7.51+ | Performance, DX, Zod integration |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first, consistent, fast |
| **Components** | shadcn/ui | Latest | Accessible, customizable, copy-paste |

## 5.2 Backend

| Komponen | Teknologi | Alasan |
|---|---|---|
| **API Layer** | Next.js Server Actions | Tidak perlu Express/NestJS, semua di Next.js |
| **Business Logic** | Server Actions + Prisma | Simple, type-safe, transaction support |
| **Session** | Auth.js JWT | Stateless, scalable |
| **Password Hash** | bcryptjs | Industry standard, secure |

**TIDAK DIGUNAKAN:**
- ❌ Express.js
- ❌ NestJS
- ❌ Microservices
- ❌ Message Broker (RabbitMQ, Kafka)
- ❌ Event Bus
- ❌ CQRS
- ❌ GraphQL

## 5.3 Frontend

| Komponen | Teknologi | Alasan |
|---|---|---|
| **State Management** | React Server Components + URL State | Minimal client state, URL as source of truth |
| **Data Fetching** | Server Components + Server Actions | No React Query needed for most cases |
| **Tables** | TanStack Table | Headless, flexible, performant |
| **Charts** | Recharts | Simple, React-native |
| **Icons** | Lucide React | Consistent, tree-shakeable |
| **Date Handling** | date-fns | Lightweight, tree-shakeable |
| **Money Format** | Intl.NumberFormat | Native, no dependency |

## 5.4 Development Tools

| Tool | Purpose |
|---|---|
| **ESLint** | Code quality |
| **Prettier** | Code formatting |
| **Husky** | Git hooks |
| **lint-staged** | Pre-commit checks |
| **Vitest** | Unit testing |
| **Playwright** | E2E testing |
| **Prisma Studio** | Database inspection |

## 5.5 Deployment & Infrastructure

| Component | Technology | Reason |
|---|---|---|
| **Hosting** | Vercel | Native Next.js support, edge network |
| **Database (Prod)** | Supabase PostgreSQL | Managed PostgreSQL, easy migration |
| **Database (Dev)** | Local PostgreSQL / Docker | Free, fast iteration |
| **Environment** | Vercel Environment Variables | Secure, per-environment |
| **Monitoring** | Vercel Analytics + Sentry | Performance + error tracking |
| **Backup** | Supabase automatic backup | Daily, point-in-time recovery |

## 5.6 External Services (Optional)

| Service | Purpose | When Used |
|---|---|---|
| **Resend** | Email notifications | Jika admin konfigurasi |
| **Fonnte/WA API** | WhatsApp notifications | Jika admin konfigurasi |
| **Midtrans/Xendit** | Payment gateway | Jika dibutuhkan (future) |

**Prinsip**: Semua external services bersifat **optional**. Sistem dapat berjalan 100% tanpa external services.

---

# 6. SOFTWARE ARCHITECTURE

## 6.1 Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Server      │  │  Client      │  │  Shared Components   │  │
│  │  Components  │  │  Components  │  │  (shadcn/ui)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER ACTIONS LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Validation  │  │ Authorization│  │  Business Logic      │  │
│  │  (Zod)       │  │ (RBAC)       │  │  (Domain Services)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Prisma Client (Type-safe queries, transactions)         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Supabase / Local)                           │  │
│  │  - Tables, Relations, Indexes, Constraints               │  │
│  │  - Soft Delete, Audit Log, Stock Movement                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 6.2 Layer Responsibilities

### 6.2.1 Presentation Layer (Client)
- **Server Components**: Default, fetch data, compose UI
- **Client Components**: Interactivity (forms, hooks, events)
- **Shared Components**: Reusable UI primitives (shadcn/ui)

### 6.2.2 Server Actions Layer
- **Validation**: Zod schemas untuk semua input
- **Authorization**: Cek session + role
- **Business Logic**: Domain services (inventory, billing, clinical)
- **Transaction**: `prisma.$transaction` untuk multi-table operations

### 6.2.3 Data Access Layer
- **Prisma Client**: Type-safe queries
- **Repository Pattern**: Tidak digunakan (Prisma sudah cukup)
- **Transaction Management**: Explicit via `prisma.$transaction`

### 6.2.4 Database Layer
- **PostgreSQL**: Single database, semua modul
- **Migrations**: Prisma Migrate
- **Seed**: `prisma/seed.ts` untuk data awal

## 6.3 Folder Structure

```
haland-petcare/
├── prisma/
│   ├── schema.prisma              # Single source of truth DB
│   ├── migrations/                # Auto-generated
│   └── seed.ts                    # Initial data
│
├── public/
│   ├── fonts/
│   ├── icons/
│   └── logo.svg
│
├── src/
│   ├── app/                       # Routing & Pages
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx           # Dashboard KPI
│   │   │   ├── layout.tsx         # Sidebar + Navbar
│   │   │   ├── customers/
│   │   │   ├── clinical/
│   │   │   ├── inventory/
│   │   │   ├── pos/
│   │   │   ├── hotel/
│   │   │   ├── reports/
│   │   │   ├── admin/
│   │   │   └── _components/       # Shared dashboard components
│   │   ├── (portal)/
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/
│   │   │   ├── pets/
│   │   │   ├── medical/
│   │   │   ├── invoices/
│   │   │   ├── bookings/
│   │   │   └── layout.tsx
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── layout.tsx             # Root
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   ├── loading.tsx
│   │   └── globals.css
│   │
│   ├── actions/                   # Server Actions (by domain)
│   │   ├── auth.actions.ts
│   │   ├── user.actions.ts
│   │   ├── customer.actions.ts
│   │   ├── pet.actions.ts
│   │   ├── clinical.actions.ts
│   │   ├── medical-record.actions.ts
│   │   ├── inventory.actions.ts
│   │   ├── stock.actions.ts
│   │   ├── billing.actions.ts
│   │   ├── pos.actions.ts
│   │   ├── hotel.actions.ts
│   │   ├── report.actions.ts
│   │   └── portal.actions.ts
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives
│   │   ├── forms/                 # RHF wrappers
│   │   ├── tables/                # DataTable generic
│   │   ├── layout/                # Sidebar, Navbar, Breadcrumb
│   │   └── shared/                # Business shared components
│   │
│   ├── validators/                # Zod schemas
│   │   ├── auth.schema.ts
│   │   ├── user.schema.ts
│   │   ├── customer.schema.ts
│   │   ├── pet.schema.ts
│   │   ├── clinical.schema.ts
│   │   ├── inventory.schema.ts
│   │   ├── billing.schema.ts
│   │   ├── hotel.schema.ts
│   │   └── common.schema.ts
│   │
│   ├── types/                     # TypeScript types
│   │   ├── index.ts
│   │   ├── auth.types.ts
│   │   ├── domain.types.ts
│   │   └── api.types.ts
│   │
│   ├── lib/
│   │   ├── db.ts                  # Prisma singleton
│   │   ├── auth.ts                # Auth helpers
│   │   ├── auth-options.ts        # NextAuth config
│   │   ├── permissions.ts         # RBAC matrix
│   │   ├── utils.ts               # cn(), formatCurrency, etc
│   │   ├── constants.ts
│   │   ├── exceptions.ts
│   │   ├── auto-number.ts         # Auto-numbering logic
│   │   ├── stock.service.ts       # Stock movement service
│   │   └── action-utils.ts        # Action wrappers
│   │
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   ├── use-debounce.ts
│   │   └── use-pagination.ts
│   │
│   └── middleware.ts              # Auth + role guard
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 6.4 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser │────▶│  Next.js │────▶│ Auth.js  │────▶│   DB     │
│          │     │  Server  │     │          │     │  (User)  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                 │                 │                 │
     │ 1. POST /login  │                 │                 │
     │ (username+PIN)  │                 │                 │
     │────────────────▶│                 │                 │
     │                 │ 2. credentials  │                 │
     │                 │    authorize    │                 │
     │                 │────────────────▶│                 │
     │                 │                 │ 3. SELECT user  │
     │                 │                 │────────────────▶│
     │                 │                 │ 4. user row     │
     │                 │                 │◀────────────────│
     │                 │                 │ 5. bcrypt.compare
     │                 │                 │    (PIN hash)   │
     │                 │ 6. JWT token    │                 │
     │                 │◀────────────────│                 │
     │ 7. Set-Cookie   │                 │                 │
     │   (session)     │                 │                 │
     │◀────────────────│                 │                 │
```

## 6.5 Authorization Flow (Middleware)

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const pathname = request.nextUrl.pathname;
  
  // 1. Public routes
  if (pathname === '/login' || pathname === '/portal/login') {
    if (token) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }
  
  // 2. Auth check
  if (!token) {
    const redirectUrl = pathname.startsWith('/portal') 
      ? '/portal/login' 
      : '/login';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
  
  // 3. Role-based access
  const role = token.role as UserRole;
  if (!hasAccess(role, pathname)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  return NextResponse.next();
}
```

## 6.6 Server Action Pattern

```typescript
// src/actions/customer.actions.ts
'use server';

import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { customerSchema } from '@/validators/customer.schema';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit';

export async function createCustomer(
  rawData: z.infer<typeof customerSchema>
) {
  // 1. Auth check
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  
  // 2. Role check
  if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Forbidden' };
  }
  
  // 3. Validation
  const validation = customerSchema.safeParse(rawData);
  if (!validation.success) {
    return { 
      success: false, 
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors 
    };
  }
  
  // 4. Business logic
  try {
    const customer = await db.customer.create({
      data: {
        ...validation.data,
        createdBy: session.user.id,
      },
    });
    
    // 5. Audit log
    await logAudit({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Customer',
      entityId: customer.id,
      changes: validation.data,
    });
    
    // 6. Revalidate
    revalidatePath('/customers');
    
    return { success: true, data: customer };
  } catch (error) {
    return { success: false, error: 'Failed to create customer' };
  }
}
```

## 6.7 Transaction Pattern

```typescript
// Auto-billing dari Medical Record
export async function completeMedicalRecord(medicalRecordId: string) {
  const session = await auth();
  if (!session) return { success: false, error: 'Unauthorized' };
  
  return db.$transaction(async (tx) => {
    // 1. Get medical record with items
    const mr = await tx.medicalRecord.findUnique({
      where: { id: medicalRecordId },
      include: { items: true },
    });
    
    // 2. Create invoice
    const invoice = await tx.invoice.create({
      data: {
        invoiceNo: await generateInvoiceNumber(tx),
        customerId: mr.appointment.pet.customerId,
        status: 'PENDING',
        source: 'CLINIC',
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
      },
    });
    
    // 3. Create invoice items & reduce stock
    let subtotal = 0;
    for (const item of mr.items) {
      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          mrItemId: item.id,
          productName: item.name,
          qty: item.qty,
          price: item.price,
          total: item.price * item.qty,
        },
      });
      subtotal += item.price * item.qty;
      
      // 4. Reduce stock if medicine
      if (item.type === 'MEDICINE') {
        await reduceStockFEFO(tx, item.referenceId, item.qty, {
          type: 'MEDICAL',
          referenceId: mr.id,
        });
      }
    }
    
    // 5. Update invoice totals
    const tax = subtotal * (clinicSetting.taxRate / 100);
    const total = subtotal + tax;
    
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { subtotal, tax, total },
    });
    
    // 6. Update appointment status
    await tx.appointment.update({
      where: { id: mr.appointmentId },
      data: { status: 'COMPLETED' },
    });
    
    // 7. Audit log
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COMPLETE_MR',
        entity: 'MedicalRecord',
        entityId: mr.id,
        changes: { invoiceId: invoice.id },
      },
    });
    
    return { invoiceId: invoice.id };
  });
}
```

## 6.8 Error Handling

```typescript
// src/lib/exceptions.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} with id ${id} not found`, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(fieldErrors: Record<string, string[]>) {
    super('VALIDATION_ERROR', 'Validation failed', 400, fieldErrors);
  }
}

export class InsufficientStockError extends AppError {
  constructor(productName: string, available: number, requested: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Stock for ${productName} is ${available}, requested ${requested}`,
      400
    );
  }
}
```

## 6.9 Logging Strategy

```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
    // In production, send to Sentry
  },
};
```

---

# 7. DATABASE DESIGN

## 7.1 Design Principles

1. **Single Database**: Semua modul dalam satu PostgreSQL database
2. **Soft Delete**: Kolom `deletedAt` untuk semua tabel bisnis
3. **Audit Trail**: Kolom `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
4. **CUID Primary Key**: `id String @id @default(cuid())`
5. **Explicit Relations**: Foreign key dengan `onDelete: Restrict` untuk data bisnis
6. **Indexes**: Pada kolom yang sering di-query (foreign key, status, date)
7. **Enums**: Untuk field dengan nilai terbatas
8. **Decimal for Money**: `Decimal` type untuk semua nilai moneter
9. **Denormalization**: Hanya untuk performa (contoh: `currentQty` di InventoryBatch)

## 7.2 Base Entity Pattern

Setiap tabel bisnis mewarisi field berikut:

```prisma
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  
  createdBy String?
  updatedBy String?
```

## 7.3 Global Enums

```prisma
enum UserRole {
  OWNER
  ADMIN
  DOCTOR
  CASHIER
  STAFF
  CUSTOMER
}

enum Gender {
  MALE
  FEMALE
  UNKNOWN
}

enum AppointmentStatus {
  SCHEDULED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum MedicalItemType {
  TREATMENT
  MEDICINE
}

enum PrescriptionStatus {
  PRESCRIBED
  DISPENSED
  CANCELLED
}

enum StockMovementType {
  IN        // Barang masuk (dari PO)
  OUT       // Barang keluar (jual/resep)
  ADJUSTMENT // Penyesuaian manual
  RETURN    // Retur (void/refund)
  OPNAME    // Stock opname
}

enum StockMovementRef {
  PURCHASE
  SALES
  MEDICAL
  ADJUSTMENT
  OPNAME
  VOID
  REFUND
}

enum InvoiceStatus {
  DRAFT
  PENDING   // Menunggu pembayaran (dari MR)
  PAID
  PARTIAL   // Partial payment
  VOID
  REFUNDED
}

enum InvoiceSource {
  CLINIC    // Dari medical record
  POS       // Dari POS petshop
  HOTEL     // Dari pet hotel
}

enum PaymentMethod {
  CASH
  CARD
  QRIS
  TRANSFER
}

enum HotelBookingStatus {
  RESERVED
  CHECKED_IN
  CHECKED_OUT
  CANCELLED
}

enum ProductType {
  MEDICINE   // Obat (butuh batch, FEFO)
  SUPPLEMENT // Suplemen
  FOOD       // Makanan
  ACCESSORY  // Aksesoris
  SERVICE    // Layanan (grooming, dll)
  OTHER
}

enum NotificationType {
  INFO
  WARNING
  ERROR
  SUCCESS
}

enum NotificationChannel {
  SYSTEM
  EMAIL
  WHATSAPP
}
```

## 7.4 Tabel Lengkap

### 7.4.1 Modul 1 — Foundation

#### **Tabel: `User`**

**Deskripsi**: Menyimpan semua pengguna sistem (internal + customer).

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| username | String | No | Yes | - | - | Min 3, Max 50 | Unique, lowercase |
| pinHash | String | No | No | - | - | - | bcrypt hash |
| fullName | String | No | No | - | - | - | Nama lengkap |
| role | UserRole | No | No | - | - | Enum | Hak akses |
| email | String | Yes | Yes | - | - | Email format | Untuk customer |
| phone | String | Yes | No | - | - | - | No HP |
| isActive | Boolean | No | No | true | - | - | Status aktif |
| isPortalEnabled | Boolean | No | No | false | - | - | Akses portal |
| lastLoginAt | DateTime | Yes | No | - | - | - | Login terakhir |
| mustChangePin | Boolean | No | No | false | - | - | First login flag |
| pinHistory | Json | No | No | '[]' | - | - | Last 5 PIN hashes |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | Soft delete |
| createdBy | String | Yes | No | - | User | FK | - |
| updatedBy | String | Yes | No | - | User | FK | - |

**Indexes**: `username` (unique), `email` (unique, partial), `role`, `isActive`

**Contoh Data**:
```json
{
  "id": "clx123...",
  "username": "admin_john",
  "pinHash": "$2a$10$...",
  "fullName": "John Doe",
  "role": "ADMIN",
  "email": null,
  "phone": "081234567890",
  "isActive": true,
  "isPortalEnabled": false,
  "mustChangePin": false
}
```

#### **Tabel: `ClinicSetting`**

**Deskripsi**: Pengaturan global klinik. Hanya ada 1 record (singleton).

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | 'default' | - | PK | Singleton |
| clinicName | String | No | No | - | - | - | Nama klinik |
| address | String | Yes | No | - | - | - | Alamat |
| phone | String | Yes | No | - | - | - | No telp klinik |
| email | String | Yes | No | - | - | - | Email klinik |
| taxRate | Decimal | No | No | 0.00 | - | 0-100 | Persentase pajak |
| currency | String | No | No | 'IDR' | - | 3 char | Kode mata uang |
| receiptHeader | String | Yes | No | - | - | - | Header struk |
| receiptFooter | String | Yes | No | - | - | - | Footer struk |
| invoicePrefix | String | No | No | 'INV' | - | - | Prefix invoice |
| poPrefix | String | No | No | 'PO' | - | - | Prefix PO |
| sessionDuration | Int | No | No | 480 | - | minutes | Session duration |
| minPasswordLength | Int | No | No | 6 | - | - | Min PIN length |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| updatedBy | String | Yes | No | - | User | FK | - |

#### **Tabel: `AuditLog`**

**Deskripsi**: Jejak audit untuk semua perubahan data kritis.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| userId | String | Yes | No | - | User | FK | Null untuk system |
| action | String | No | No | - | - | - | CREATE, UPDATE, DELETE, LOGIN, etc |
| entity | String | No | No | - | - | - | Nama tabel |
| entityId | String | Yes | No | - | - | - | ID record |
| previousValues | Json | Yes | No | - | - | - | Data sebelum |
| newValues | Json | Yes | No | - | - | - | Data sesudah |
| ipAddress | String | Yes | No | - | - | - | IP address |
| userAgent | String | Yes | No | - | - | - | Browser info |
| createdAt | DateTime | No | No | now() | - | - | Immutable |

**Indexes**: `userId`, `entity`, `createdAt`, `(entity, entityId)`

**Business Rules**:
- AuditLog **TIDAK BOLEH** diupdate atau dihapus (immutable)
- Setiap perubahan master data wajib dicatat
- Setiap transaksi wajib dicatat
- Login/logout wajib dicatat

#### **Tabel: `Notification`**

**Deskripsi**: Notifikasi internal untuk pengguna.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| userId | String | No | No | - | User | FK | Penerima |
| title | String | No | No | - | - | - | Judul notifikasi |
| message | String | No | No | - | - | - | Isi notifikasi |
| type | NotificationType | No | No | INFO | - | Enum | - |
| channel | NotificationChannel | No | No | SYSTEM | - | Enum | - |
| isRead | Boolean | No | No | false | - | - | - |
| referenceEntity | String | Yes | No | - | - | - | Entity terkait |
| referenceId | String | Yes | No | - | - | - | ID entity |
| createdAt | DateTime | No | No | now() | - | - | - |
| readAt | DateTime | Yes | No | - | - | - | - |

### 7.4.2 Modul 2 — Customer & Pet

#### **Tabel: `Customer`**

**Deskripsi**: Data pelanggan klinik.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| userId | String | Yes | Yes | - | User | FK, Unique | Link ke akun portal |
| name | String | No | No | - | - | - | Nama pemilik |
| phone | String | Yes | No | - | - | - | No HP |
| email | String | Yes | No | - | - | Email | Email |
| address | String | Yes | No | - | - | - | Alamat |
| isWalkIn | Boolean | No | No | false | - | - | Walk-in flag |
| notes | String | Yes | No | - | - | - | Catatan |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | Soft delete |
| createdBy | String | Yes | No | - | User | FK | - |
| updatedBy | String | Yes | No | - | User | FK | - |

**Indexes**: `userId` (unique), `phone`, `name`

**Business Rules**:
- 1 Customer dapat memiliki 0 atau 1 User (untuk portal)
- Walk-In Customer memiliki `isWalkIn = true` dan `userId = null`
- Customer tidak bisa di-hard delete, hanya soft delete

#### **Tabel: `Pet`**

**Deskripsi**: Data hewan peliharaan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| customerId | String | No | No | - | Customer | FK | - |
| name | String | No | No | - | - | - | Nama hewan |
| speciesId | String | No | No | - | Species | FK | - |
| breedId | String | Yes | No | - | Breed | FK | - |
| colorId | String | Yes | No | - | Color | FK | - |
| gender | Gender | No | No | UNKNOWN | - | Enum | - |
| dateOfBirth | DateTime | Yes | No | - | - | - | Tanggal lahir |
| isSterile | Boolean | No | No | false | - | - | Status steril |
| microchipNumber | String | Yes | Yes | - | - | - | No mikrochip |
| photoUrl | String | Yes | No | - | - | - | URL foto |
| notes | String | Yes | No | - | - | - | Catatan |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | Soft delete |
| createdBy | String | Yes | No | - | User | FK | - |
| updatedBy | String | Yes | No | - | User | FK | - |

**Indexes**: `customerId`, `speciesId`, `microchipNumber` (unique)

#### **Tabel: `Species`**

**Deskripsi**: Master data jenis hewan (Kucing, Anjing, Burung, dll).

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| name | String | No | Yes | - | - | - | Unique |
| isActive | Boolean | No | No | true | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

#### **Tabel: `Breed`**

**Deskripsi**: Master data ras hewan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| speciesId | String | No | No | - | Species | FK | - |
| name | String | No | No | - | - | - | - |
| isActive | Boolean | No | No | true | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

**Unique Constraint**: `(speciesId, name)`

#### **Tabel: `Color`**

**Deskripsi**: Master data warna hewan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| name | String | No | Yes | - | - | - | Unique |
| isActive | Boolean | No | No | true | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

#### **Tabel: `VaccinationRecord`**

**Deskripsi**: Riwayat vaksinasi hewan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| petId | String | No | No | - | Pet | FK | - |
| vaccineName | String | No | No | - | - | - | Nama vaksin |
| date | DateTime | No | No | - | - | - | Tanggal vaksin |
| nextDueDate | DateTime | Yes | No | - | - | - | Jadwal berikutnya |
| batchNumber | String | Yes | No | - | - | - | No batch vaksin |
| veterinarian | String | Yes | No | - | - | - | Nama dokter |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |

**Indexes**: `petId`, `date`

#### **Tabel: `WeightHistory`**

**Deskripsi**: Riwayat berat badan hewan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| petId | String | No | No | - | Pet | FK | - |
| date | DateTime | No | No | now() | - | - | - |
| weight | Decimal | No | No | - | - | - | Berat (kg) |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |

**Indexes**: `petId`, `date`

#### **Tabel: `Allergy`**

**Deskripsi**: Riwayat alergi hewan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| petId | String | No | No | - | Pet | FK | - |
| allergen | String | No | No | - | - | - | Penyebab alergi |
| severity | String | Yes | No | - | - | - | Mild, Moderate, Severe |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |

#### **Tabel: `DiseaseHistory`**

**Deskripsi**: Riwayat penyakit hewan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| petId | String | No | No | - | Pet | FK | - |
| diseaseName | String | No | No | - | - | - | Nama penyakit |
| diagnosedDate | DateTime | No | No | - | - | - | Tanggal diagnosa |
| resolvedDate | DateTime | Yes | No | - | - | - | Tanggal sembuh |
| status | String | No | No | 'ACTIVE' | - | - | ACTIVE, RESOLVED |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |

#### **Tabel: `Attachment`**

**Deskripsi**: File attachment untuk berbagai entitas (Customer, Pet, Medical Record, dll).

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| entityType | String | No | No | - | - | - | CUSTOMER, PET, MR, dll |
| entityId | String | No | No | - | - | - | ID entitas |
| fileName | String | No | No | - | - | - | Nama file asli |
| fileUrl | String | No | No | - | - | - | URL file |
| mimeType | String | No | No | - | - | - | image/jpeg, application/pdf |
| fileSize | Int | No | No | - | - | - | Size in bytes |
| createdAt | DateTime | No | No | now() | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

**Indexes**: `(entityType, entityId)`

### 7.4.3 Modul 3 — Clinical

#### **Tabel: `Appointment`**

**Deskripsi**: Janji temu pelanggan dengan dokter.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| appointmentNo | String | No | Yes | - | - | - | Auto-number |
| petId | String | No | No | - | Pet | FK | - |
| customerId | String | No | No | - | Customer | FK | - |
| doctorId | String | Yes | No | - | User | FK | - |
| date | DateTime | No | No | - | - | - | Tanggal janji |
| duration | Int | No | No | 30 | - | - | Durasi (menit) |
| status | AppointmentStatus | No | No | SCHEDULED | - | Enum | - |
| complaint | String | Yes | No | - | - | - | Keluhan awal |
| notes | String | Yes | No | - | - | - | Catatan |
| source | String | No | No | 'MANUAL' | - | - | MANUAL, PORTAL |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |
| updatedBy | String | Yes | No | - | User | FK | - |

**Indexes**: `petId`, `doctorId`, `date`, `status`, `appointmentNo` (unique)

#### **Tabel: `MedicalRecord`**

**Deskripsi**: Rekam medis per kunjungan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| mrNo | String | No | Yes | - | - | - | Auto-number |
| appointmentId | String | Yes | Yes | - | Appointment | FK, Unique | 1:1 dengan appointment |
| petId | String | No | No | - | Pet | FK | - |
| customerId | String | No | No | - | Customer | FK | - |
| doctorId | String | No | No | - | User | FK | - |
| visitDate | DateTime | No | No | now() | - | - | Tanggal kunjungan |
| chiefComplaint | String | Yes | No | - | - | - | Keluhan utama |
| diagnosis | String | Yes | No | - | - | - | Diagnosa |
| treatment | String | Yes | No | - | - | - | Plan perawatan |
| notes | String | Yes | No | - | - | - | Catatan tambahan |
| isLocked | Boolean | No | No | false | - | - | Locked setelah selesai |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |
| updatedBy | String | Yes | No | - | User | FK | - |

**Indexes**: `appointmentId` (unique), `petId`, `doctorId`, `visitDate`, `mrNo` (unique)

#### **Tabel: `VitalSignRecord`**

**Deskripsi**: Tanda vital per kunjungan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| medicalRecordId | String | No | Yes | - | MedicalRecord | FK, Unique | 1:1 |
| weight | Decimal | Yes | No | - | - | - | Berat (kg) |
| temperature | Decimal | Yes | No | - | - | - | Suhu (°C) |
| heartRate | Int | Yes | No | - | - | - | HR (bpm) |
| respiratoryRate | Int | Yes | No | - | - | - | RR (bpm) |
| bloodPressure | String | Yes | No | - | - | - | Format: "120/80" |
| mucousMembrane | String | Yes | No | - | - | - | Pink, Pale, dll |
| capillaryRefill | String | Yes | No | - | - | - | < 2 sec |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |

#### **Tabel: `MedicalRecordItem`**

**Deskripsi**: Item dalam rekam medis (tindakan atau obat).

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| medicalRecordId | String | No | No | - | MedicalRecord | FK | - |
| type | MedicalItemType | No | No | - | - | Enum | TREATMENT / MEDICINE |
| referenceId | String | No | No | - | - | - | ID Treatment atau Product |
| name | String | No | No | - | - | - | Snapshot nama |
| qty | Int | No | No | 1 | - | Min 1 | Jumlah |
| unit | String | Yes | No | - | - | - | Satuan (tablet, ml, dll) |
| price | Decimal | No | No | - | - | - | Harga satuan (snapshot) |
| total | Decimal | No | No | - | - | - | qty × price |
| notes | String | Yes | No | - | - | - | Instruksi khusus |
| isDispensed | Boolean | No | No | false | - | - | Obat sudah diberikan |
| createdAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |

**Indexes**: `medicalRecordId`, `type`

**Business Rules**:
- Harga adalah **snapshot** saat MR dibuat
- Jika type = MEDICINE, `referenceId` mengarah ke `Product.id`
- Jika type = TREATMENT, `referenceId` mengarah ke `Treatment.id`
- Item tidak bisa diubah setelah MR locked

#### **Tabel: `Treatment`**

**Deskripsi**: Master data tindakan medis.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| categoryId | String | Yes | No | - | TreatmentCategory | FK | - |
| name | String | No | Yes | - | - | - | Unique |
| description | String | Yes | No | - | - | - | - |
| price | Decimal | No | No | 0 | - | - | Harga default |
| duration | Int | Yes | No | - | - | - | Durasi (menit) |
| isActive | Boolean | No | No | true | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

#### **Tabel: `TreatmentCategory`**

**Deskripsi**: Kategori tindakan medis.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| name | String | No | Yes | - | - | - | Unique |
| isActive | Boolean | No | No | true | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

#### **Tabel: `FollowUp`**

**Deskripsi**: Jadwal follow-up pasien.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| medicalRecordId | String | No | No | - | MedicalRecord | FK | - |
| petId | String | No | No | - | Pet | FK | - |
| followUpDate | DateTime | No | No | - | - | - | Tanggal follow-up |
| reason | String | Yes | No | - | - | - | Alasan |
| status | String | No | No | 'SCHEDULED' | - | - | SCHEDULED, COMPLETED, CANCELLED |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |

### 7.4.4 Modul 4 — Petshop & Inventory

#### **Tabel: `Product`**

**Deskripsi**: Master data produk (obat, makanan, aksesoris, dll).

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| sku | String | No | Yes | - | - | - | Unique |
| barcode | String | Yes | Yes | - | - | - | Unique, untuk scan |
| name | String | No | No | - | - | - | Nama produk |
| description | String | Yes | No | - | - | - | - |
| categoryId | String | No | No | - | ProductCategory | FK | - |
| type | ProductType | No | No | OTHER | - | Enum | - |
| unit | String | No | No | - | - | - | Satuan (pcs, box, ml) |
| sellPrice | Decimal | No | No | 0 | - | - | Harga jual default |
| minStock | Int | No | No | 0 | - | - | Alert threshold |
| isActive | Boolean | No | No | true | - | - | - |
| photoUrl | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |
| updatedBy | String | Yes | No | - | User | FK | - |

**Indexes**: `sku` (unique), `barcode` (unique), `categoryId`, `type`, `isActive`

**Business Rules**:
- Produk dengan type `MEDICINE` **WAJIB** memiliki batch tracking
- Produk dengan type `SERVICE` tidak memiliki stok
- `currentStock` dihitung dari `InventoryBatch` atau `StockMovement`

#### **Tabel: `ProductCategory`**

**Deskripsi**: Kategori produk.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| name | String | No | Yes | - | - | - | Unique |
| parentId | String | Yes | No | - | ProductCategory | FK | Self-ref |
| isActive | Boolean | No | No | true | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

#### **Tabel: `Supplier`**

**Deskripsi**: Master data supplier.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| name | String | No | No | - | - | - | Nama supplier |
| contactPerson | String | Yes | No | - | - | - | - |
| phone | String | Yes | No | - | - | - | - |
| email | String | Yes | No | - | - | - | - |
| address | String | Yes | No | - | - | - | - |
| notes | String | Yes | No | - | - | - | - |
| isActive | Boolean | No | No | true | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

#### **Tabel: `InventoryBatch`**

**Deskripsi**: Batch produk (untuk tracking stok dan kedaluwarsa).

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| productId | String | No | No | - | Product | FK | - |
| batchNo | String | No | No | - | - | - | Nomor batch |
| expiredAt | DateTime | Yes | No | - | - | - | Tgl kedaluwarsa |
| producedAt | DateTime | Yes | No | - | - | - | Tgl produksi |
| receivedAt | DateTime | No | No | now() | - | - | Tgl diterima |
| currentQty | Int | No | No | 0 | - | - | Denormalized |
| purchasePrice | Decimal | No | No | 0 | - | - | Harga beli per batch |
| supplierId | String | Yes | No | - | Supplier | FK | - |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |

**Indexes**: `productId`, `batchNo`, `expiredAt`, `(productId, batchNo)` unique

**Business Rules**:
- `currentQty` di-sync dengan `StockMovement` via transaction
- Batch dengan `expiredAt < today` **TIDAK BOLEH** digunakan untuk penjualan/resep
- FEFO: saat reduce stock, pilih batch dengan `expiredAt ASC`

#### **Tabel: `StockMovement`**

**Deskripsi**: Log pergerakan stok (single source of truth untuk stok).

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| batchId | String | No | No | - | InventoryBatch | FK | - |
| productId | String | No | No | - | Product | FK | - |
| type | StockMovementType | No | No | - | - | Enum | IN, OUT, ADJ, RETURN, OPNAME |
| referenceType | StockMovementRef | Yes | No | - | - | Enum | PURCHASE, SALES, dll |
| referenceId | String | Yes | No | - | - | - | ID PO, Invoice, dll |
| qty | Int | No | No | - | - | - | + untuk IN, - untuk OUT |
| unitCost | Decimal | Yes | No | - | - | - | Harga per unit saat movement |
| notes | String | Yes | No | - | - | - | Alasan/keterangan |
| createdAt | DateTime | No | No | now() | - | - | Immutable |
| createdBy | String | No | No | - | User | FK | - |

**Indexes**: `batchId`, `productId`, `type`, `referenceType`, `createdAt`

**Business Rules**:
- StockMovement **TIDAK BOLEH** diupdate atau dihapus (immutable)
- Setiap perubahan stok **WAJIB** melalui tabel ini
- `currentQty` di `InventoryBatch` di-update via transaction bersamaan

#### **Tabel: `PurchaseOrder`**

**Deskripsi**: Purchase Order untuk pengadaan barang.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| poNo | String | No | Yes | - | - | - | Auto-number |
| supplierId | String | No | No | - | Supplier | FK | - |
| orderDate | DateTime | No | No | now() | - | - | - |
| expectedDate | DateTime | Yes | No | - | - | - | Estimasi tiba |
| status | String | No | No | 'DRAFT' | - | - | DRAFT, SENT, RECEIVED, CANCELLED |
| subtotal | Decimal | No | No | 0 | - | - | - |
| tax | Decimal | No | No | 0 | - | - | - |
| total | Decimal | No | No | 0 | - | - | - |
| notes | String | Yes | No | - | - | - | - |
| approvedBy | String | Yes | No | - | User | FK | - |
| approvedAt | DateTime | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |

**Indexes**: `poNo` (unique), `supplierId`, `status`, `orderDate`

#### **Tabel: `PurchaseOrderItem`**

**Deskripsi**: Item dalam Purchase Order.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| purchaseOrderId | String | No | No | - | PurchaseOrder | FK | - |
| productId | String | No | No | - | Product | FK | - |
| qty | Int | No | No | - | - | Min 1 | - |
| unitCost | Decimal | No | No | - | - | - | Harga beli |
| total | Decimal | No | No | - | - | - | qty × unitCost |
| receivedQty | Int | No | No | 0 | - | - | Qty yang sudah diterima |
| batchNo | String | Yes | No | - | - | - | No batch saat receive |
| expiredAt | DateTime | Yes | No | - | - | - | Expired saat receive |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |

### 7.4.5 Modul 5 — Sales, Billing & POS

#### **Tabel: `Invoice`**

**Deskripsi**: Tagihan/transaksi.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| invoiceNo | String | No | Yes | - | - | - | Auto-number |
| customerId | String | Yes | No | - | Customer | FK | Null = walk-in |
| customerName | String | Yes | No | - | - | - | Snapshot nama (walk-in) |
| status | InvoiceStatus | No | No | DRAFT | - | Enum | - |
| source | InvoiceSource | No | No | POS | - | Enum | CLINIC, POS, HOTEL |
| sourceReferenceId | String | Yes | No | - | - | - | ID MR/Booking |
| subtotal | Decimal | No | No | 0 | - | - | - |
| tax | Decimal | No | No | 0 | - | - | - |
| discount | Decimal | No | No | 0 | - | - | - |
| total | Decimal | No | No | 0 | - | - | - |
| paidAmount | Decimal | No | No | 0 | - | - | Total pembayaran |
| remainingAmount | Decimal | No | No | 0 | - | - | Sisa tagihan |
| notes | String | Yes | No | - | - | - | - |
| voidReason | String | Yes | No | - | - | - | Alasan void |
| voidedBy | String | Yes | No | - | User | FK | - |
| voidedAt | DateTime | Yes | No | - | - | - | - |
| transactionDate | DateTime | No | No | now() | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |
| updatedBy | String | Yes | No | - | User | FK | - |

**Indexes**: `invoiceNo` (unique), `customerId`, `status`, `source`, `transactionDate`

**Business Rules**:
- Invoice dari klinik (source = CLINIC) dibuat otomatis dari Medical Record
- Invoice dari POS (source = POS) dibuat manual oleh kasir
- Invoice dari hotel (source = HOTEL) dibuat otomatis saat check-out
- Status flow: DRAFT → PENDING → PAID (atau VOID/REFUNDED)
- `paidAmount` = SUM(Payment.amount)

#### **Tabel: `InvoiceItem`**

**Deskripsi**: Item dalam invoice.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| invoiceId | String | No | No | - | Invoice | FK | - |
| mrItemId | String | Yes | Yes | - | MedicalRecordItem | FK, Unique | Link ke MR (jika dari klinik) |
| productId | String | Yes | No | - | Product | FK | Null jika service/treatment |
| productName | String | No | No | - | - | - | Snapshot nama |
| qty | Int | No | No | - | - | Min 1 | - |
| unit | String | Yes | No | - | - | - | Satuan |
| price | Decimal | No | No | - | - | - | Harga satuan (snapshot) |
| discount | Decimal | No | No | 0 | - | - | Diskon per item |
| total | Decimal | No | No | - | - | - | (qty × price) - discount |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

**Indexes**: `invoiceId`, `mrItemId` (unique), `productId`

#### **Tabel: `Payment`**

**Deskripsi**: Pembayaran invoice.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| paymentNo | String | No | Yes | - | - | - | Auto-number |
| invoiceId | String | No | No | - | Invoice | FK | - |
| method | PaymentMethod | No | No | - | - | Enum | - |
| amount | Decimal | No | No | - | - | - | Jumlah bayar |
| reference | String | Yes | No | - | - | - | No referensi (kartu, transfer) |
| paidAt | DateTime | No | No | now() | - | - | - |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | Immutable |
| createdBy | String | No | No | - | User | FK | - |

**Indexes**: `invoiceId`, `paymentNo` (unique), `paidAt`

**Business Rules**:
- Payment **TIDAK BOLEH** diupdate atau dihapus (immutable)
- Satu invoice dapat memiliki multiple payments
- Saat payment dibuat, update `Invoice.paidAmount` dan `remainingAmount`
- Jika `remainingAmount = 0`, update status ke `PAID`

#### **Tabel: `InvoiceNumberSequence`**

**Deskripsi**: Sequence untuk auto-numbering invoice per bulan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| year | Int | No | No | - | - | - | Tahun |
| month | Int | No | No | - | - | - | Bulan (1-12) |
| lastNumber | Int | No | No | 0 | - | - | Nomor terakhir |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |

**Unique Constraint**: `(year, month)`

### 7.4.6 Modul 6 — Pet Hotel

#### **Tabel: `HotelRoomType`**

**Deskripsi**: Tipe kamar (Small, Medium, Large, VIP, dll).

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| name | String | No | Yes | - | - | - | Unique |
| description | String | Yes | No | - | - | - | - |
| basePrice | Decimal | No | No | 0 | - | - | Harga per hari |
| capacity | Int | No | No | 1 | - | - | Kapasitas hewan |
| isActive | Boolean | No | No | true | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

#### **Tabel: `HotelRoom`**

**Deskripsi**: Kamar fisik pet hotel.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| roomTypeId | String | No | No | - | HotelRoomType | FK | - |
| name | String | No | Yes | - | - | - | Unique (A1, B2, dll) |
| priceOverride | Decimal | Yes | No | - | - | - | Override harga (null = pakai basePrice) |
| notes | String | Yes | No | - | - | - | - |
| isActive | Boolean | No | No | true | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

#### **Tabel: `HotelBooking`**

**Deskripsi**: Booking penitipan hewan.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| bookingNo | String | No | Yes | - | - | - | Auto-number |
| petId | String | No | No | - | Pet | FK | - |
| customerId | String | No | No | - | Customer | FK | - |
| roomId | String | No | No | - | HotelRoom | FK | - |
| checkInDate | DateTime | No | No | - | - | - | - |
| checkOutDate | DateTime | No | No | - | - | - | - |
| actualCheckIn | DateTime | Yes | No | - | - | - | - |
| actualCheckOut | DateTime | Yes | No | - | - | - | - |
| status | HotelBookingStatus | No | No | RESERVED | - | Enum | - |
| totalDays | Int | Yes | No | - | - | - | Dihitung saat check-out |
| roomCharge | Decimal | No | No | 0 | - | - | Biaya kamar |
| additionalCharge | Decimal | No | No | 0 | - | - | Biaya tambahan |
| totalCharge | Decimal | No | No | 0 | - | - | Total |
| invoiceId | String | Yes | Yes | - | Invoice | FK, Unique | Link ke invoice |
| specialInstructions | String | Yes | No | - | - | - | Instruksi khusus |
| feedingSchedule | String | Yes | No | - | - | - | Jadwal makan |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |

**Indexes**: `bookingNo` (unique), `petId`, `roomId`, `status`, `checkInDate`, `checkOutDate`, `invoiceId` (unique)

**Business Rules**:
- Satu kamar tidak dapat di-booking overlapping dengan booking lain yang status != CANCELLED
- Saat check-in, `actualCheckIn` diisi, status jadi `CHECKED_IN`
- Saat check-out, `actualCheckOut` diisi, `totalDays` dihitung, invoice dibuat otomatis

#### **Tabel: `HotelDailyLog`**

**Deskripsi**: Catatan harian perawatan hewan inap.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| bookingId | String | No | No | - | HotelBooking | FK | - |
| date | DateTime | No | No | - | - | - | Tanggal |
| appetite | String | Yes | No | - | - | - | Good, Fair, Poor |
| activity | String | Yes | No | - | - | - | Active, Normal, Lethargic |
| bowelMovement | String | Yes | No | - | - | - | Normal, Diarrhea, Constipation |
| urination | String | Yes | No | - | - | - | Normal, Abnormal |
| condition | String | Yes | No | - | - | - | Kondisi umum |
| notes | String | Yes | No | - | - | - | Catatan |
| needsAttention | Boolean | No | No | false | - | - | Butuh perhatian dokter |
| createdAt | DateTime | No | No | now() | - | - | - |
| createdBy | String | No | No | - | User | FK | - |

**Unique Constraint**: `(bookingId, date)`

#### **Tabel: `HotelAdditionalService`**

**Deskripsi**: Layanan tambahan selama penitipan (makanan khusus, grooming, obat).

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| bookingId | String | No | No | - | HotelBooking | FK | - |
| name | String | No | No | - | - | - | Nama layanan |
| qty | Int | No | No | 1 | - | - | - |
| price | Decimal | No | No | 0 | - | - | Harga |
| total | Decimal | No | No | 0 | - | - | qty × price |
| date | DateTime | No | No | now() | - | - | Tanggal layanan |
| notes | String | Yes | No | - | - | - | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| createdBy | String | Yes | No | - | User | FK | - |

### 7.4.7 Modul 8 — Customer Portal

#### **Tabel: `PortalBookingRequest`**

**Deskripsi**: Booking request dari portal customer.

| Field | Type | Nullable | Unique | Default | FK | Constraint | Business Rule |
|---|---|---|---|---|---|---|---|
| id | String | No | Yes | cuid() | - | PK | - |
| bookingNo | String | No | Yes | - | - | - | Auto-number |
| customerId | String | No | No | - | Customer | FK | - |
| petId | String | No | No | - | Pet | FK | - |
| type | String | No | No | - | - | - | APPOINTMENT atau HOTEL |
| requestedDate | DateTime | No | No | - | - | - | Tanggal yang diminta |
| requestedEndDate | DateTime | Yes | No | - | - | - | Untuk hotel |
| preferredDoctorId | String | Yes | No | - | User | FK | - |
| preferredRoomTypeId | String | Yes | No | - | HotelRoomType | FK | - |
| complaint | String | Yes | No | - | - | - | Keluhan |
| notes | String | Yes | No | - | - | - | - |
| status | String | No | No | 'PENDING' | - | - | PENDING, CONFIRMED, REJECTED, CANCELLED |
| approvedBy | String | Yes | No | - | User | FK | - |
| approvedAt | DateTime | Yes | No | - | - | - | - |
| rejectionReason | String | Yes | No | - | - | - | - |
| linkedAppointmentId | String | Yes | Yes | - | Appointment | FK | - |
| linkedBookingId | String | Yes | Yes | - | HotelBooking | FK | - |
| createdAt | DateTime | No | No | now() | - | - | - |
| updatedAt | DateTime | No | No | now() | - | - | - |
| deletedAt | DateTime | Yes | No | - | - | - | - |

**Business Rules**:
- Customer hanya bisa booking untuk pet milik sendiri
- Status PENDING → CONFIRMED (oleh Admin/Dokter) atau REJECTED
- Saat CONFIRMED, sistem auto-create Appointment atau HotelBooking
- Customer bisa cancel jika status masih PENDING

## 7.5 Relasi Diagram (Simplified)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │──────▶│  Customer   │──────▶│     Pet     │
│ (all roles) │  1:1  │             │  1:N  │             │
└─────────────┘       └─────────────┘       └─────────────┘
                            │                       │
                            │                       │
                            ▼                       ▼
                       ┌─────────────┐       ┌─────────────┐
                       │ Appointment │◀──────│Vaccination  │
                       │             │  1:1  │WeightHistory│
                       └─────────────┘       │Allergy      │
                            │                │DiseaseHist  │
                            │ 1:1            └─────────────┘
                            ▼
                       ┌─────────────┐
                       │MedicalRecord│
                       │             │
                       └─────────────┘
                            │ 1:N
                            ▼
                       ┌─────────────┐
                       │ MR Item     │──────▶ Product (reference)
                       │             │         Treatment (reference)
                       └─────────────┘
                            │ auto-create
                            ▼
                       ┌─────────────┐       ┌─────────────┐
                       │   Invoice   │──────▶│Invoice Item │
                       │             │  1:N  │             │
                       └─────────────┘       └─────────────┘
                            │ 1:N
                            ▼
                       ┌─────────────┐
                       │   Payment   │
                       └─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Product   │──────▶│InventoryBat │──────▶│StockMovement│
│             │  1:N  │             │  1:N  │             │
└─────────────┘       └─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│HotelRoomType│──────▶│ HotelRoom   │──────▶│HotelBooking │
│             │  1:N  │             │  1:N  │             │
└─────────────┘       └─────────────┘       └─────────────┘
                                                    │ 1:N
                                                    ▼
                                            ┌─────────────┐
                                            │ Daily Log   │
                                            │ Add.Service │
                                            └─────────────┘
```

---

# 8. MASTER DATA

## 8.1 Daftar Master Data

| Master Data | Modul | Deskripsi |
|---|---|---|
| Species | 2 | Jenis hewan (Kucing, Anjing, Burung, Kelinci, Reptil, dll) |
| Breed | 2 | Ras hewan per species (Persia, Husky, Golden, dll) |
| Color | 2 | Warna hewan (Hitam, Putih, Coklat, dll) |
| Treatment Category | 3 | Kategori tindakan (Konsultasi, Vaksinasi, Operasi, dll) |
| Treatment | 3 | Daftar tindakan medis dengan harga |
| Product Category | 4 | Kategori produk (Obat, Makanan, Aksesoris, dll) |
| Product | 4 | Daftar produk dengan harga dan stok minimum |
| Supplier | 4 | Daftar supplier |
| Hotel Room Type | 6 | Tipe kamar hotel (Small, Medium, Large, VIP) |
| Hotel Room | 6 | Daftar kamar fisik |
| Payment Method | 5 | Metode pembayaran (CASH, CARD, QRIS, TRANSFER) |

## 8.2 Seed Data Awal

Saat pertama kali setup, sistem menyediakan data awal:

### Species
- Kucing
- Anjing
- Burung
- Kelinci
- Hamster
- Reptil
- Ikan
- Lainnya

### Treatment Category
- Konsultasi
- Vaksinasi
- Pemeriksaan Laboratorium
- Perawatan Gigi
- Operasi
- Rawat Inap
- Grooming
- Lainnya

### Product Category
- Obat Internal
- Obat External
- Suplemen
- Makanan Kucing
- Makanan Anjing
- Snack
- Aksesoris
- Mainan
- Perlengkapan Kebersihan
- Lainnya

### Hotel Room Type
- Small (untuk hewan < 5kg)
- Medium (5-15kg)
- Large (15-30kg)
- XL (> 30kg)
- VIP (dengan AC)

### Default Walk-In Customer
Sistem membuat 1 customer default dengan:
- name: "Walk-In Customer"
- isWalkIn: true
- Digunakan untuk transaksi retail tanpa customer

---

*Dokumen ini akan dilanjutkan pada bagian berikutnya dengan detail lengkap untuk setiap modul (9-30), termasuk UI Layout, Workflow, Automation, Validation, Security, Coding Standard, dan Roadmap.*

