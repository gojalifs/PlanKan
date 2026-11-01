# API Reference

Semua endpoint berada di bawah `/api`, kecuali route khusus yang disebutkan. Sesi dibaca melalui Better Auth. Endpoint yang memerlukan owner/admin ditandai.

## Auth

| Method | Path | Keterangan |
|---|---|---|
| GET/POST | `/api/auth/[...all]` | Better Auth catch-all |
| GET | `/verify-email` | Redirect verifikasi email |

## Wallets

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/wallets` | List dompet sesuai access scope + total balance |
| POST | `/api/wallets` | Buat dompet; enforce `wallet.limit` |
| GET/PUT/DELETE | `/api/wallets/[id]` | CRUD dompet |
| POST | `/api/wallets/batch` | Buat hingga 20 dompet; enforce limit |

## Categories

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/categories` | List kategori; filter type/parentOnly |
| POST | `/api/categories` | Buat kategori |
| PUT/DELETE | `/api/categories/[id]` | Update/hapus kategori |

## Transactions

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/transactions` | List + filter + summary |
| POST | `/api/transactions` | Buat income/expense/transfer |
| GET/PUT/DELETE | `/api/transactions/[id]` | Detail, update, hapus |
| GET | `/transactions/[...path]` | Proxy lampiran MinIO, owner-only |

## Budgets

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/budgets` | Progress budget berdasarkan periode |
| POST | `/api/budgets` | Upsert budget; enforce `budget.limit` |
| DELETE | `/api/budgets/[id]` | Hapus budget |
| GET/PUT | `/api/budget-period/setting` | Setting periode global |
| GET/POST/DELETE | `/api/budget-period/overrides` | Override per bulan |

## Receipts

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/receipts` | Upload gambar dan OCR |
| GET/DELETE | `/api/receipts/[id]` | Ambil/hapus gambar sementara |

## Reports and Summary

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/reports` | Tren, breakdown, daily expense, top subkategori |
| GET | `/api/summary` | Net worth, cashflow, transaksi terbaru, anomali |

## Monthly Review

| Method | Path | Keterangan |
|---|---|---|
| GET/POST | `/api/monthly-review` | Ringkasan AI bulanan; gated `ai.monthly_review` |

## Voice

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/voice` | Parse teks menjadi draft transaksi |

## Goals

| Method | Path | Keterangan |
|---|---|---|
| GET/POST | `/api/goals` | List/buat goal; gated `ai.financial_goals` |
| PUT/DELETE | `/api/goals/[id]` | Update/hapus goal |

## Usage

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/me/usage` | Plan, entitlement, usage |

## Monitoring

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/monitoring/overview` | Statistik 7 hari, Gemini, error; owner-gated |
| GET | `/api/monitoring/ai` | Rollup Gemini harian; owner-gated |
| GET | `/api/monitoring/requests` | p95/p99 per route; owner-gated |
| GET | `/api/monitoring/access` | Gate akses client |

## Admin Billing

| Method | Path | Keterangan |
|---|---|---|
| GET/POST | `/api/admin/subscriptions` | List/grant subscription; billing-admin-gated |
| DELETE | `/api/admin/subscriptions/[id]` | Cancel subscription |

## Workspaces

| Method | Path | Keterangan |
|---|---|---|
| GET/POST | `/api/workspaces` | List/buat workspace |
| GET/PATCH/DELETE | `/api/workspaces/[id]` | Detail/update/hapus workspace |
| GET/POST/DELETE | `/api/workspaces/[id]/invitations` | Kelola undangan |
| GET/DELETE | `/api/workspaces/[id]/members` | List/hapus member |
| POST | `/api/workspaces/[id]/leave` | Keluar workspace |
| GET/POST/DELETE | `/api/workspace/invitations/[token]` | Detail/terima/tolak undangan |
EOF