# Architecture

PlanKan adalah aplikasi Next.js 16 App Router dengan React 19, TypeScript strict, PostgreSQL via Prisma 7, Better Auth, MinIO, dan Gemini OCR.

## Ringkasan Sistem

- Frontend dan backend berada dalam satu aplikasi Next.js.
- Halaman fitur utama berjalan di client dengan TanStack Query.
- API route handlers di `app/api/*` menangani validasi, otorisasi, transaksi database, dan integrasi eksternal.
- Data utama disimpan di PostgreSQL; lampiran disimpan di MinIO dan diproksi same-origin.
- Gambar struk sementara disimpan di disk lokal lalu dibersihkan setelah TTL.

## Struktur Direktori

| Path | Peran |
|---|---|
| `app/` | Halaman App Router dan route handlers |
| `app/(auth)/` | Login, register, reset password |
| `app/api/` | REST API |
| `app/transactions/[...path]/route.ts` | Proxy lampiran MinIO |
| `components/` | UI dan provider |
| `lib/` | Domain logic, auth, hooks, storage, monitoring |
| `lib/hooks/` | React Query hooks client |
| `prisma/` | Schema, migrations, seed |
| `tests/` | Vitest tests |
| `docs/` | Dokumentasi |

## Boundary Server/Client

Modul server-only:
- `lib/auth-server.ts`
- `lib/prisma.ts`
- `lib/receipt-ocr.ts`
- `lib/voice-parse.ts`
- `lib/ai-review.ts`
- `lib/monthly-review.ts`

Modul client:
- `lib/auth-client.ts`
- `lib/hooks/*`
- `lib/image.ts`
- `lib/speech.ts`
- `lib/quota-errors.ts`

## Alur Data

1. Komponen client memanggil hook di `lib/hooks/*`.
2. Hook memanggil fetch ke `/api/*`.
3. Route handler memvalidasi input dengan Zod dan memeriksa sesi.
4. Handler mengakses scope data melalui `lib/workspace.ts`.
5. Handler menjalankan Prisma; perubahan saldo dompet dibungkus `$transaction`.
6. Client melakukan invalidasi query `transactions`, `wallets`, dan `summary`.

## Autentikasi

- Better Auth dikonfigurasi di `lib/auth.ts`.
- Mendukung email/password dan Google OAuth opsional.
- Verifikasi email wajib (`requireEmailVerification: true`).
- Reset password melalui SMTP/Nodemailer.
- Sesi server dibaca melalui `lib/auth-server.ts`.

## Penyimpanan

- PostgreSQL melalui Prisma 7 dan `@prisma/adapter-pg`.
- MinIO menyimpan lampiran transaksi; `lib/minio.ts` mengunggah dan mengembalikan path same-origin.
- Receipt temp storage menyimpan gambar struk dengan UUID dan TTL; `lib/receipt-storage.ts`.

## Monitoring

- `lib/monitoring/with-monitoring.ts` membungkus route handler dan menulis `ApiLog`.
- Gemini calls dicatat ke `GeminiCallLog`.
- Akses monitoring dibatasi oleh `lib/monitoring/auth.ts`.
- Cleanup retention di `lib/monitoring/cleanup.ts`.
EOF