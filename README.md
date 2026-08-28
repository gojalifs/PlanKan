# 💰 PlanKan - Aplikasi Manajemen Budget & Pengeluaran Harian

**PlanKan** adalah aplikasi manajemen anggaran dan pencatatan keuangan harian modern yang dibangun dengan arsitektur fullstack Next.js App Router, Prisma ORM, PostgreSQL, Better Auth, TanStack Query, dan antarmuka berbasis shadcn/ui & Tailwind CSS.

---

## 🚀 Fitur Utama (Phase 1: MVP Core)

- 🔐 **Autentikasi Aman & Cepat (Better Auth)**
  - Register & Login (Email & Password)
  - Auto-create dompet default (Kas Tunai & Rekening Bank) dan 15+ kategori Indonesia saat pertama kali mendaftar.
- 💳 **CRUD Multi-Dompet (Wallets)**
  - Tambah, ubah, dan hapus berbagai dompet (Rekening Bank, Kas Tunai, E-Wallet, Tabungan, Investasi, dll).
  - Opsi sembunyikan dompet dari kalkulasi Total Kekayaan.
  - Pilihan warna kustom dan visual icon.
- 🏷️ **CRUD Kategori Transaksi (Categories)**
  - Pengelompokan kategori **Pengeluaran (Expense)** & **Pemasukan (Income)**.
  - Warna kustom & manajemen kategori.
- 💸 **Pencatatan Transaksi Manual Terpadu (Transactions)**
  - **Pemasukan (Income)**: Otomatis menambah saldo dompet tujuan.
  - **Pengeluaran (Expense)**: Otomatis mengurangi saldo dompet asal.
  - **Transfer Antar Dompet**: Mengurangi saldo dompet asal dan menambah saldo dompet tujuan dalam satu transaksi atomik.
  - **Revert & Rollback Aman**: Edit dan hapus transaksi secara otomatis mengoreksi saldo dompet terkait via Prisma Transaction.
  - **Filter Interaktif**: Filter berdasarkan tipe (Pemasukan/Pengeluaran/Transfer), dompet, kategori, dan rentang tanggal.
- 📊 **Dashboard Ringkasan Keuangan**
  - Total Saldo / Kekayaan Bersih (Net Worth).
  - Pemasukan Bulan Ini, Pengeluaran Bulan Ini, dan Arus Kas Bersih (Cashflow).
  - Distribusi persentase pengeluaran per kategori.
  - Riwayat 10 transaksi terbaru.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router, React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) Primitives (Radix UI)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM 7](https://www.prisma.io/) (dengan `@prisma/adapter-pg`)
- **Authentication**: [Better Auth](https://better-auth.com/)
- **Server State / Data Fetching**: [TanStack Query v5](https://tanstack.com/query) (React Query)
- **Form & Validation**: [Zod](https://zod.dev) & [React Hook Form](https://react-hook-form.com/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📂 Struktur Proyek

```
plan-kan/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx        # Halaman Login
│   │   └── register/page.tsx     # Halaman Register
│   ├── api/
│   │   ├── auth/[...all]/        # Better Auth API Handler
│   │   ├── wallets/              # GET & POST Wallets
│   │   ├── wallets/[id]/         # GET, PUT & DELETE Wallet
│   │   ├── categories/           # GET & POST Categories
│   │   ├── categories/[id]/      # PUT & DELETE Category
│   │   ├── transactions/         # GET & POST Transactions
│   │   ├── transactions/[id]/    # GET, PUT & DELETE Transaction
│   │   └── summary/              # GET Dashboard Summary Metrics
│   ├── wallets/page.tsx          # Manajemen Dompet
│   ├── categories/page.tsx       # Manajemen Kategori
│   ├── transactions/page.tsx     # Riwayat & Filter Transaksi
│   ├── layout.tsx                # Root Layout + Providers + Navbar
│   ├── page.tsx                  # Landing Hero / Dashboard
│   └── globals.css               # Theme & Tailwind Tokens
├── components/
│   ├── layout/navbar.tsx         # Navbar responsif
│   ├── providers/                # TanStack Query Provider
│   ├── transactions/             # Modal Catat & Edit Transaksi
│   ├── wallets/                  # Modal Tambah & Edit Dompet
│   ├── categories/               # Modal Tambah & Edit Kategori
│   └── ui/                       # shadcn/ui primitives
├── lib/
│   ├── auth.ts                   # Konfigurasi Server Better Auth
│   ├── auth-client.ts            # Client SDK Better Auth
│   ├── auth-server.ts            # Server session helpers
│   ├── prisma.ts                 # Prisma Client Singleton + Driver Adapter
│   ├── default-categories.ts     # Data kategori default & auto-seed
│   ├── utils.ts                  # Currency & Date Formatters, `cn`
│   └── hooks/                    # Custom TanStack Query Hooks
├── prisma/
│   ├── schema.prisma             # Schema PostgreSQL
│   └── seed.ts                   # Seeding akun & data dummy
└── prisma.config.ts              # Konfigurasi Prisma 7
```

---

## ⚙️ Cara Menjalankan

### 1. Setup Environment
Pastikan file `.env` sudah terkonfigurasi dengan connection string PostgreSQL dan secret Better Auth:
```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/plankan"
BETTER_AUTH_SECRET="your-super-secret-key-at-least-32-chars-long"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Sinkronisasi Database & Generate Client
```bash
npx prisma db push
npx prisma generate
```

### 3. (Opsional) Seeding Data Demo
```bash
pnpm seed
```
> **Akun Demo Bawaan:**
> - Email: `demo@plankan.app`
> - Password: `password123`

### 4. Jalankan Development Server
```bash
pnpm dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

