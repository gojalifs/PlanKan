# 💰 PlanKan

Aplikasi pencatatan keuangan & manajemen anggaran harian. Fullstack Next.js (App Router, React 19) dengan PostgreSQL via Prisma 7, autentikasi Better Auth, OCR struk belanja bertenaga Gemini Vision, penyimpanan lampiran MinIO, dan deployment Docker + Traefik.

**Live**: [budget.twogether.click](https://budget.twogether.click)

---

## ✨ Fitur

### 🔐 Autentikasi (Better Auth)
- Register & login **email + password**.
- **Reset password via email** (SMTP/Nodemailer) — tombol "Lupa password" mengirim link reset.
- **Auto-seed data awal** saat user pertama kali mendaftar:
  - 2 dompet default: **Dompet Utama (Cash)** dan **Rekening Bank**.
  - 15+ kategori Indonesia dengan pohon sub-kategori (parent → child), mis. *Makanan & Minuman → Restoran, Bahan Makanan, Kopi & Minuman*.

### 💳 Multi-Dompet (Wallets)
- CRUD dompet dari berbagai tipe: `CASH`, `BANK`, `E_WALLET`, `INVESTMENT`, `SAVINGS`, `OTHER`.
- Warna & ikon kustom, mata uang (default IDR).
- Opsi **sembunyikan dompet dari Total Kekayaan (Net Worth)** via `isExcludedFromTotal`.

### 🏷️ Kategori (Categories)
- Kategori bertingkat (**parent & sub-kategori**) untuk pengelompokan yang rapi.
- Tipe **Pengeluaran (EXPENSE)** vs **Pemasukan (INCOME)**, warna & ikon kustom.
- Default kategori pra-seed khusus Indonesia: Makanan & Minuman, Transportasi, Tagihan & Utilitas, Belanja Harian, Hiburan & Hobi, Kesehatan, Pendidikan, Donasi & Zakat, Gaji & Upah, Bonus & THR, Bisnis & Jualan, Investasi & Dividen — masing-masing dengan sub-kategori.

### 💸 Transaksi
- Tiga tipe: **Pemasukan (INCOME)**, **Pengeluaran (EXPENSE)**, **Transfer antar dompet**.
- **Saldo dompet terkoreksi otomatis & atomik** via Prisma Transaction:
  - Income → menambah saldo dompet tujuan.
  - Expense → mengurangi saldo dompet asal.
  - Transfer → mengurangi asal + menambah tujuan, satu transaksi.
  - **Edit/hapus transaksi otomatis reverse saldo** (rollback aman).
- **Idempotency key** — retry simpan yang responsnya hilang (mis. proxy timeout setelah commit) memakai key yang sama dan mengembalikan baris yang sudah ada, **tanpa duplikasi**.
- **Lampiran foto**: tangkap langsung dari **kamera** atau pilih dari galeri; gambar **dikompres ke ~1MB otomatis** (Canvas API, binary-search kualitas) dan bisa **diputar 90°** sebelum diunggah.
- **Filter & pagination**: filter per tipe, dompet, kategori (termasuk sub-kategori otomatis), rentang tanggal & limit.

### 🖨️ OCR Struk Belanja (Receipt)
- Upload **foto struk belanja** → **Gemini Vision OCR** (`gemini-3.5-flash-lite`, bisa diganti via `GEMINI_MODEL`) mengekstrak **tanggal transaksi** dan **setiap baris belanja**.
- Prompt dioptimalkan untuk struktur struk Indonesia:
  - Memahami pemisah ribuan dengan titik (`84.900` → 84900) dan koma desimal.
  - Menangani diskon `HEMAT/DISK/POT` — `lineTotal` selalu **harga yang benar-benar dibayar** (setelah diskon), diskon tetap ditampilkan sebagai info.
  - Barang yang **ditimbang** (sayur/buah/daging) — mempertahankan berat `810 g` asli, memahami harga per kg, tanpa membulatkan qty.
  - Baris potongan/voucher digabungkan ke item terdekat agar tidak ada transaksi bernilai negatif.
- **Auto-match kategori**: model mencocokkan tiap item ke daftar kategori user, bisa diedit manual.
- Satu baris struk = satu transaksi (catatan diisi otomatis, mis. `Gula ×2 (1kg)`), tampil di **modal review multi-transaksi** sebelum disimpan.
- **Fallback deterministik (stub)** di dev bila `GEMINI_API_KEY` belum diisi.
- Gambar struk disimpan **sementara** di disk lokal, dihapus saat selesai atau dibersihkan otomatis setelah kadaluarsa (dasar file TTL).

### 📊 Dashboard
- Kartu ringkasan: **Total Kekayaan (Net Worth)**, Pemasukan & Pengeluaran bulan ini, **Net Cashflow** (surplus/defisit).
- **Breakdown pengeluaran per kategori** (persentase + bar progres warna).
- **10 transaksi terbaru** dengan indikator tipe (masuk/keluar/transfer).

### 📈 Laporan Bulanan (Reports)
- Pilih bulan/tahun, ringkasan **Pemasukan / Pengeluaran / Net Cashflow**.
- Visualisasi (Recharts): **area chart tren 6 bulan**, **pie pengeluaran & pemasukan per kategori**, **bar chart pengeluaran harian**, **bar perbandingan bulanan**, **radar top sub-kategori**, **line chart tren net cashflow**, plus **rincian per kategori** dengan bar persentase.

### 🎯 Budget & Periode Anggaran
- Set **budget per kategori** (induk & sub) dengan jumlah nominal, progres **terpakai vs sisa** (+ peringatan kelebihan).
- **Periode budget fleksibel** (kapan bulan budget dimulai):
  - `LAST_WORKING_DAY` (default): mulai pada hari kerja terakhir bulan sebelumnya.
  - `FIXED_DAY`: hari tetap dalam sebulan (1–28), diatur global.
  - **Override per bulan**: paksa tanggal mulai khusus untuk bulan tertentu (mis. gaji cair lebih awal).

### 🖼️ Lampiran & Storage
- Lampiran dipajang dari **MinIO** dan diproksi lewat route same-origin `/transactions/<object>` — browser tidak perlu akses MinIO internal langsung.
- Akses dibatasi hanya untuk **pemilik transaksi** yang mereferensikan objek tersebut.

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| Database | PostgreSQL + Prisma ORM 7 (`@prisma/adapter-pg`, Decimal `15,2`) |
| Auth | Better Auth |
| State / Data | TanStack Query v5, React Query Hooks |
| Form & Validation | React Hook Form + Zod |
| OCR Struk | Google Gemini Vision API (`generateContent` + `responseSchema`) |
| Object Storage | MinIO |
| Email (reset password) | Nodemailer (SMTP) |
| Chart | Recharts |
| Animasi | Framer Motion |
| Icons | Lucide React |
| Notifications | Sonner |

---

## 📂 Struktur Proyek

```
app/
├── (auth)/                    # Login, Register, Forgot & Reset Password
├── api/
│   ├── auth/[...all]/         # Better Auth handler
│   ├── wallets/, categories/  # CRUD dompet & kategori
│   ├── transactions/          # CRUD transaksi + idempotency
│   ├── transactions/[...path] # Proxy lampiran dari MinIO (akses pemilik)
│   ├── budgets/, budget-period/  # Budget & pengaturan/override periode
│   ├── receipts/              # Upload → OCR → item multi-transaksi
│   ├── reports/               # Data laporan bulanan (charts)
│   └── summary/               # Metrik dashboard
├── budgets/                   # Halaman budget per periode
├── categories/, wallets/      # Manajemen kategori & dompet
├── reports/                   # Laporan bulanan (charts)
├── transactions/              # Riwayat + filter + pagination
└── page.tsx                   # Dashboard
components/
├── dashboard/                 # Kartu ringkasan & breakdown
├── transactions/              # Modal transaksi, receipt upload & review, detail
├── budgets/                   # Modal budget & setting/override periode
├── wallets/, categories/      # Modal CRUD
└── ui/                        # primitives shadcn/ui
lib/
├── auth.ts / auth-client.ts   # Konfigurasi server & client Better Auth
├── prisma.ts                  # Prisma Client singleton (driver adapter pg)
├── receipt-ocr.ts             # Pipeline OCR Gemini + parser toleran
├── receipt-storage.ts         # Temp-file store & sweeper TTL
├── receipt.ts                 # Kontrak ReceiptItem → transaksi
├── image.ts                   # Kompres & rotasi gambar (Canvas API)
├── budget-period.ts           # Resolusi periode budget (override → setting → default)
├── minio.ts                   # Client & bucket lampiran
├── default-categories.ts      # Seed kategori & dompet awal
├── format.ts / utils.ts       # Format rupiah, tanggal, `cn`
└── hooks/                     # React Query hooks per domain
prisma/
└── schema.prisma              # Schema (user, wallet, category, transaction, budget, dsb.)
```

---

## ⚙️ Deployment & Setup

### Prasyarat
- Node.js ≥ 18, pnpm
- PostgreSQL
- MinIO (untuk lampiran transaksi)
- SMTP (untuk email reset password)

### Development

```bash
# 1. Install & setup env
pnpm install
cp .env.example .env   # isi DATABASE_URL, BETTER_AUTH_SECRET, SMTP_*, MINIO_*, GEMINI_API_KEY

# 2. Sync schema & generate client
npx prisma db push
npx prisma generate

# 3. (Opsional) Seed data demo — email: demo@plankan.app / password: password123
pnpm seed

# 4. Jalankan dev server
pnpm dev
# → http://localhost:3000
```

> Tanpa `GEMINI_API_KEY`, upload struk memakai data stub (untuk pengembangan). Set key untuk OCR sungguhan.

### Production (Docker)

```bash
docker compose up -d
```

`docker-compose.yml` mengatur aplikasi + MinIO, dengan reverse-proxy **Traefik** di domain `budget.twogether.click` (TLS Let's Encrypt). MinIO console terpisah di `minio.twogether.click`.

---

## 🔑 Environment Variables

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL |
| `BETTER_AUTH_SECRET` | Secret kunci Better Auth (≥ 32 karakter) |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Basis URL aplikasi |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP untuk reset password |
| `MINIO_ENDPOINT` / `MINIO_PORT` | Alamat & port MinIO |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | Kredensial MinIO |
| `MINIO_BUCKET` | Nama bucket lampiran (default `transactions`) |
| `GEMINI_API_KEY` | Kunci Google AI untuk OCR struk (kosong = pakai stub) |
| `GEMINI_MODEL` | Model vision (default `gemini-3.5-flash-lite`) |
| `RECEIPT_TMP_DIR` | Direktori sementara gambar struk (prod diarahkan ke `/tmp`) |
| `RECEIPT_MAX_AGE_MS` | Usia maksimum file struk saat dibersihkan (default 24 jam) |

---

## 💾 Backup Database

```bash
pg_dump plankan > .backups/plankan-YYYYMMDD-HHMMSS.sql
```

Folder `.backups/` sudah ter-ignore git.