---
name: plan-kan
description: PlanKan development skill for Next.js finance app: architecture, Prisma, auth, API routes, OCR receipts, budgets, reports, workspaces, tests, and docs. Use when changing or documenting this repository.
license: MIT
metadata:
  audience: developers
  project: plan-kan
---

# PlanKan Development Skill

Use this skill when working in the `plan-kan` repository.

## Project
- Fullstack Next.js 16 App Router + React 19 finance tracking app.
- PostgreSQL via Prisma 7, Better Auth, MinIO attachments, Gemini OCR, Docker/Traefik.
- Main docs: `README.md`, `docs/documentation-plan.md`.

## Commands
- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Tests: `pnpm test`
- Seed: `pnpm seed`, `pnpm seed:plans`
- Prisma client: `pnpm prisma generate` if needed after schema changes.
- Migrations: follow `prisma/migrations`; inspect schema before editing.

## Structure
- `app/`: pages and API routes.
- `app/api/*`: REST endpoints.
- `components/`: UI components.
- `lib/`: domain logic, hooks, auth, storage, monitoring.
- `prisma/`: schema, migrations, seed.
- `tests/`: Vitest tests.
- `docs/`: documentation and plans.

## Conventions
- Keep edits minimal and idiomatic.
- Do not add comments unless requested.
- Run `pnpm lint` and `pnpm test` after changes.
- Use existing libraries; check imports and neighboring code.
- Preserve transaction balance logic and idempotency behavior.
- Protect attachment access by transaction owner.

## Data and Auth
- Prisma schema is source of truth for models and relations.
- Better Auth handles sessions and OAuth.
- Wallet balances are updated atomically in transactions.
- Workspace family features share resources by `workspaceId`.

## Documentation and Skills
- OpenCode skills live in `.opencode/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md`, or `.agents/skills/*/SKILL.md`.
- Existing Prisma skills are under `.agents/skills/`.
- When documenting skills, include location, frontmatter, discovery, and permissions.
- Keep skill names unique across all locations.

## Verification
- `pnpm lint`
- `pnpm test`
- `pnpm build` for production-sensitive changes.
EOF