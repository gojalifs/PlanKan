# 💰 PlanKan

Aplikasi pencatatan keuangan & manajemen anggaran harian. Fullstack Next.js (App Router, React 19) dengan PostgreSQL via Prisma 7, autentikasi Better Auth, OCR struk belanja, dan deployment Docker + Traefik.

**Live**: [budget.twogether.click](https://budget.twogether.click)

---

## Fitur

- **Autentikasi** — register/login email+password (Better Auth); auto-seed dompet default & 15+ kategori Indonesia saat signup.
- **Multi-Dompet** — kelola dompet (bank, e-wallet, kas tunai, tabungan, investasi) dengan warna & ikon kustom; opsi sembunyikan dari net worth.
- **Transaksi** — catat pemasukan, pengeluaran, dan transfer antar dompet; saldo terkoreksi otomatis via Prisma transaction.
- **Budget & Anggaran** — set budget per kategori per periode (bulanan/mingguan), dengan override periode untuk kasus khusus.
- **Struk / Receipt OCR** — upload foto struk, ekstraksi otomatis melalui OCR, review & konfirmasi sebelum disimpan.
- **Dashboard** — ringkasan net worth, cashflow bulanan, distribusi pengeluaran per kategori, 10 transaksi terbaru.
- **Filter & Pencarian** — filter transaksi berdasarkan tipe, dompet, kategori, dan rentang tanggal.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| Database | PostgreSQL + Prisma ORM 7 (`@prisma/adapter-pg`) |
| Auth | Better Auth |
| State / Fetching | TanStack Query v5 |
| Form & Validation | React Hook Form + Zod |
| Object Storage | MinIO (upload struk) |
| Icons | Lucide React |
| Notifications | Sonner |

---

## Struktur Proyek

```
app/
  (auth)/login, register      # Halaman autentikasi
  api/
    auth/                      # Better Auth handler
    wallets/, categories/      # CRUD dompet & kategori
    transactions/              # CRUD transaksi
    budgets/, budget-period/    # Budget & override periode
    receipts/                  # Upload & OCR struk
    reports/                   # Laporan
    summary/                   # Metrik dashboard
  wallets/, categories/,
  transactions/, budgets/      # Halaman UI
components/                    # Modal transaksi, dompet, kategori, budget, receipt, UI primitif
lib/                           # Auth, prisma client, hooks, formatters, receipt OCR pipeline
prisma/schema.prisma           # Database schema
```

---

## Jalankan

### Prasyarat
- Node.js ≥ 18, pnpm
- PostgreSQL
- MinIO (opsional, untuk upload struk)

### Development

```bash
# 1. Install dependencies
pnpm install

# 2. Setup env
cp .env.example .env   # isi DATABASE_URL, BETTER_AUTH_SECRET, MINIO_*, dll

# 3. Push schema & generate client
npx prisma db push
npx prisma generate

# 4. (Opsional) Seed data demo — email: demo@plankan.app, password: password123
pnpm seed

# 5. Jalankan dev server
pnpm dev
# → http://localhost:3000
```

### Production (Docker)

```bash
docker compose up -d
```

Traefik reverse-proxy sudah terkonfigurasi di `docker-compose.yml` (domain `budget.twogether.click`).

---

## Backup Database

```bash
pg_dump plankan > .backups/plankan-YYYYMMDD-HHMMSS.sql
```

