# Development

## Prerequisites

- Node.js 22
- pnpm 11
- PostgreSQL
- MinIO untuk lampiran
- Opsional: Gemini API key, SMTP

## Setup

```bash
pnpm install
cp .env.example .env
pnpm prisma generate
pnpm prisma migrate deploy
pnpm seed
pnpm dev
```

## Scripts

| Script | Keterangan |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | ESLint |
| `pnpm seed` | Seed data demo |
| `pnpm seed:plans` | Seed plan dan entitlement |
| `pnpm test` | Vitest |
| `pnpm test:watch` | Vitest watch |

## Testing

- Framework: Vitest.
- Global setup: `tests/global-setup.ts`.
- DB test menggunakan `DATABASE_URL_TEST`.
- Worker serial untuk stabilitas database.

## Lint and Typecheck

```bash
pnpm lint
npx tsc --noEmit
```

## Conventions

- Validasi input dengan Zod.
- Route handler dibungkus `withMonitoring` bila sesuai.
- Perubahan saldo dompet dibungkus Prisma transaction.
- Gunakan access scope untuk filter resource.
- Hook client berbasis TanStack Query.
- UI memakai shadcn/ui dan Tailwind CSS v4.
EOF