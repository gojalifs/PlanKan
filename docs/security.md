# Security

## Authentication

- Better Auth menangani session, email/password, dan Google OAuth.
- Verifikasi email wajib.
- Reset password melalui SMTP.
- `BETTER_AUTH_SECRET` minimal 32 karakter.

## Authorization

- Handler membaca sesi server melalui `lib/auth-server.ts`.
- `getAccessScope` di `lib/workspace.ts` memfilter resource personal dan workspace aktif.
- Mutasi workspace dibatasi owner.
- Admin billing dibatasi `requireBillingAdmin` (fail-closed).

## Attachment Access

- Path `/transactions/[...path]` memerlukan sesi.
- Objek hanya dapat diakses jika ada transaksi milik user dengan `attachmentUrl` yang cocok.

## Receipt Storage

- ID receipt divalidasi sebagai UUID.
- Guard path traversal mencegah akses file di luar direktori temp.
- Header no-store digunakan.

## Input Validation

- Semua route mutasi memakai Zod.
- Upload gambar dibatasi tipe dan ukuran 10MB.
- Receipt ID divalidasi.

## Secrets

- Kredensial dibaca dari environment.
- SMTP opsional; aplikasi tetap berjalan jika tidak diset.
- Tidak ada secret hardcoded kecuali fallback auth yang tidak aman untuk dev.

## Quotas and Limits

- OCR, voice, wallet, budget, dan goal dibatasi server-side.
- Usage lease memakai transaksi database untuk mencegah race condition.
- Shared OCR pool digunakan untuk OCR dan voice.
EOF