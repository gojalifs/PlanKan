# Mobile Integration Guide

## Base URL

- Production: `https://budget.twogether.click/api/v1`
- Semua endpoint identik dengan `/api/*` web.

## Authentication

1. Register/login via Better Auth:
   - `POST /api/v1/auth/sign-up/email`
   - `POST /api/v1/auth/sign-in/email`
2. Simpan nilai header response `set-auth-token` di secure storage.
3. Kirim pada setiap request:
   ```
   Authorization: Bearer <token>
   ```
4. Logout: `POST /api/v1/auth/sign-out` (token dicabut server-side).

## Headers

- `Idempotency-Key`: untuk retry aman pada POST dompet/transaksi.
- `If-Unmodified-Since`: ISO timestamp untuk deteksi konflik pada PUT.
- `X-Request-Id`: opsional, dikembalikan server untuk tracing.

## Conflict (409)

Jika `updatedAt` server lebih baru dari client, response 409 berisi state server terbaru. Client harus merge/replace lalu retry.

## Sync

- `GET /api/v1/sync?since=<ISO>&limit=500`
- Simpan `serverTime` sebagai `since` berikutnya.
- Proses `deletions` untuk menghapus data lokal.
- Ulangi jika `hasMore: true`.

## Lampiran

- `GET /api/v1/transactions/{id}/attachment` → `{ url }` (path same-origin).
- Upload transaksi via multipart/form-data field `attachment`.

## Push Token

- `POST /api/v1/devices` body `{ platform, token }`
- `DELETE /api/v1/devices?token=...`

## Error Format

```json
{ "error": "pesan" }
```

Kode umum: 401 (unauthorized), 409 (conflict/limit), 429 (rate limit).
