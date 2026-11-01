# Database

Prisma schema berada di `prisma/schema.prisma`. Client dihasilkan ke `lib/generated/prisma` dan menggunakan `@prisma/adapter-pg`.

## Enums

| Enum | Nilai |
|---|---|
| `WalletType` | `CASH`, `BANK`, `E_WALLET`, `INVESTMENT`, `SAVINGS`, `OTHER` |
| `TransactionType` | `INCOME`, `EXPENSE`, `TRANSFER` |
| `SubscriptionStatus` | `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED` |
| `GoalStatus` | `ACTIVE`, `COMPLETED`, `ARCHIVED` |

## Model Utama

### Auth
- `User`: identitas, profil, relasi dompet/kategori/transaksi/budget/goal/subscription/workspace.
- `Session`, `Account`, `Verification`: model Better Auth.

### Finansial
- `Wallet`: saldo `Decimal(15,2)`, mata uang, warna/ikon, `isExcludedFromTotal`, opsional `workspaceId`.
- `Category`: hierarki via `parentId`, tipe income/expense, `isDefault`, opsional `workspaceId`.
- `Transaction`: tipe, jumlah, tanggal, catatan, lampiran, `idempotencyKey` unik, flag anomali, wallet asal/tujuan, kategori, opsional `workspaceId`.
- `Budget`: jumlah, periode, bulan/tahun opsional, unik per user dan kategori.

### Budget Period
- `BudgetPeriodSetting`: metode `LAST_WORKING_DAY` atau `FIXED_DAY`, `fixedDay`.
- `BudgetPeriodOverride`: override tanggal mulai per bulan/tahun.

### Monitoring
- `ApiLog`: method, route, status, durasi, error, waktu.
- `GeminiCallLog`: model, status, durasi, token, biaya, error.

### AI Review
- `MonthlyReview`: ringkasan AI per user/bulan/tahun.

### Goals
- `FinancialGoal`: target/current amount, tanggal target, status, opsional wallet/workspace.

### Monetisasi
- `Plan`: plan key unik, harga, status aktif, sort.
- `PlanEntitlement`: fitur per plan dengan nilai JSON.
- `Subscription`: user/workspace, plan, status, periode, provider.
- `UsageRecord`: ledger penggunaan.
- `UsageLease`: kuota used/limit/bonus per user/feature/periode.

### Workspace
- `Workspace`: nama, tipe, owner.
- `WorkspaceMember`: membership, role, status.
- `WorkspaceInvitation`: email, status, token unik, masa berlaku.

## Migrations

- `20260904130338_baseline`
- `20260906120000_add_transaction_idempotency`
- `20260907152024_add_monitoring`
- `20260914120000_add_anomaly_and_monthly_review`
- `20260920120000_add_monetization_phase2`
- `20260920150000_add_financial_goals_phase4`
- `20261001000000_add_workspace_family`

## Seed

- `prisma/seed.ts`: seeds plan, membuat demo user `demo@plankan.app` / `password123`, wallet/kategori default, dan transaksi sampel jika belum ada.
- `scripts/seed-plans.ts`: upsert idempotent 5 plan dan entitlements.
- Test setup `tests/global-setup.ts`: `prisma db push`, truncate tabel, seed plan.
EOF