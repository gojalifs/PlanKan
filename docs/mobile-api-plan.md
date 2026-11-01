# Plan: REST API untuk Aplikasi Mobile PlanKan

## 1. Tujuan

Menyediakan REST API yang dapat dikonsumsi aplikasi mobile (Flutter/React Native) dengan tetap mempertahankan satu sumber kebenaran di backend Next.js yang sudah ada. Web app tetap berjalan tanpa perubahan perilaku.

## 2. Keputusan Arsitektur

- **Reuse, bukan rewrite**: mobile memakai endpoint `/api/*` yang sama dengan web. Tidak membuat backend paralel.
- **Auth Bearer**: mobile tidak bisa mengandalkan cookie same-origin. Aktifkan Better Auth `bearer()` plugin agar `Authorization: Bearer <token>` dikonversi menjadi session.
- **Versioning**: tambahkan prefix `/api/v1/*` sebagai alias stabil; `/api/*` lama tetap (deprecated bertahap).
- **Attachment**: ganti proxy same-origin dengan presigned URL MinIO (TTL pendek) agar mobile bisa akses langsung.
- **Offline**: dukungan sync berbasis cursor (`updatedAt`/`id`) + idempotency key.

## 3. Fase Implementasi

### Fase 0 — Persiapan (1-2 hari)
- Aktifkan `bearer()` di `lib/auth.ts` (server) dan client Better Auth.
- Tambah env `MOBILE_ALLOWED_ORIGINS`, `ATTACHMENT_PRESIGNED_TTL_SEC`.
- Dokumentasikan kontrak error (kode + pesan) untuk mobile.

### Fase 1 — Auth Mobile (2-3 hari)
- Endpoint auth via Better Auth: register, login, verify email, forgot/reset password, logout.
- Token disimpan client di secure storage (Keychain/Keystore).
- Refresh: Better Auth session expiry; mobile re-login bila 401.
- Google OAuth mobile: pakai flow native/WebView yang mengembalikan token; verifikasi di server.

### Fase 2 — CORS & Middleware (1 hari)
- Middleware CORS untuk origin mobile (custom scheme + domain).
- Preflight `OPTIONS` untuk semua `/api/*`.
- Pertahankan same-origin untuk web (no CORS needed).

### Fase 3 — Kompatibilitas Endpoint (3-5 hari)
- Pastikan semua route handler membaca session dari Bearer (via `getServerSession`).
- Tambah `/api/v1` re-export/alias ke handler yang sama.
- OpenAPI spec (manual atau generated) + contoh request.

### Fase 4 — File & Lampiran (2-3 hari)
- Receipt upload multipart (sudah ada) tetap; pastikan limit 10MB & tipe.
- Attachment transaksi: endpoint `GET /api/v1/transactions/[id]/attachment` mengembalikan presigned URL.
- Hapus ketergantungan `/transactions/[...path]` untuk mobile (tetap untuk web).

### Fase 5 — Sync & Offline (3-5 hari)
- Endpoint list dengan cursor: `?cursor=&limit=&since=`.
- Idempotency-Key header untuk POST transaksi/wallet/budget.
- Konflik: last-write-wins + version field; kembalikan 409 + server state.
- Queue client untuk retry.

### Fase 6 — Push & Device (2-4 hari, opsional)
- Tabel `DeviceToken` (userId, platform, token, lastSeenAt).
- Endpoint register/unregister device.
- Integrasi FCM/APNs untuk reminder budget/goal.

### Fase 7 — Monitoring & Versioning (1-2 hari)
- Header `X-API-Version`, `X-Request-Id`.
- Rate limit per user/device.
- Deprecation policy untuk `/api/*` non-v1.

## 4. Perubahan Data Model

- `DeviceToken` (baru, fase 6).
- Tambah kolom `updatedAt` index pada `Transaction`, `Wallet`, `Budget`, `Category` untuk sync.
- Tambah `idempotencyKey` unik (opsional) pada `Transaction`.

## 5. Keamanan

- Bearer token wajib HTTPS.
- Certificate pinning di client (opsional fase lanjut).
- Rotasi token saat logout; revoke session server-side.
- Rate limit per IP/user untuk auth endpoints.
- Tetap enforced: Zod validation, workspace scope (`getAccessScope`), billing admin fail-closed.
- Upload guard: UUID receipt, path traversal guard, no-store header.

## 6. Testing

- Unit/integration Vitest: panggil handler dengan header `Authorization: Bearer`.
- Mock session tetap via `getServerSession` (sudah dipakai tests).
- Tambah test CORS preflight.
- E2E mobile (Maestro/Detox): login, create transaction, upload receipt, view report.

## 7. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Cookie vs Bearer mismatch | Better Auth bearer plugin resmi; test integration |
| Attachment access bocor | Presigned URL TTL pendek + verifikasi ownership |
| Offline conflict | Idempotency + version + 409 server state |
| CORS membuka web | Origin allowlist ketat, bukan `*` |
| Token bocor di client | Secure storage + rotasi + revoke |

## 8. Deliverable

- Dokumen OpenAPI (`docs/openapi.yaml`) — fase 3.
- SDK TypeScript/Dart (opsional) — fase 5.
- Migration Prisma untuk DeviceToken & index.
- Update `docs/api.md` dengan bagian mobile.

## 9. Estimasi Total

~14-22 hari kerja (tergantung offline & push).

## 10. Langkah Berikutnya

1. Aktifkan `bearer()` plugin + test login mobile via curl.
2. Tambah middleware CORS.
3. Buat alias `/api/v1`.
4. Implement presigned attachment URL.
5. Baru kerjakan sync/offline.
