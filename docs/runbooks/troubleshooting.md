# Troubleshooting

## OCR Tidak Berjalan

- Pastikan `GEMINI_API_KEY` terisi.
- Jika kosong, sistem memakai stub.

## Email Tidak Terkirim

- Periksa konfigurasi SMTP.
- Aplikasi tetap berjalan jika SMTP tidak diset.

## Lampiran Tidak Tampil

- Periksa MinIO endpoint dan bucket.
- Pastikan user adalah owner transaksi.

## Database Test Gagal

- Pastikan `DATABASE_URL_TEST` valid.
- Jalankan `pnpm prisma db push` pada DB test.
EOF