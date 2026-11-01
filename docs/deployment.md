# Deployment

## Docker

`Dockerfile` menggunakan multi-stage build:
- Node 22.23.4 Alpine.
- `pnpm install --frozen-lockfile`.
- `prisma generate`.
- `next build`.
- Runner standalone dengan user non-root dan healthcheck.

## Docker Compose

`docker-compose.yml` menjalankan:
- `plankan_app`
- MinIO
- Label Traefik untuk `budget.twogether.click` dan `minio.twogether.click`
- Network `proxy` dan `sjo_default`
- Volume `minio-data`

`docker-compose.override.yml` menyesuaikan nama container, port lokal, dan override label.

## Database

- PostgreSQL eksternal, tidak ada service DB di compose.
- `DATABASE_URL` menentukan koneksi.
- Migration dijalankan dengan Prisma.

## MinIO

- Bucket default: `transactions` (`MINIO_BUCKET`).
- Lampiran diakses same-origin melalui `/transactions/<object>`.
- Akses dibatasi owner transaksi.

## Traefik

- TLS via Let's Encrypt.
- Network `proxy` eksternal.

## Environment Variables

Lihat `.env.example`. Variabel utama:
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `RECEIPT_TMP_DIR`, `RECEIPT_MAX_AGE_MS`
- `MONITORING_ENABLED`, `MONITORING_OWNER_EMAIL`, retention vars
- `DATABASE_URL_TEST`
EOF