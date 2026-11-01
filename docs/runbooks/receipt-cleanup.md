# Receipt Cleanup

Gambar struk sementara disimpan di `RECEIPT_TMP_DIR` dan dibersihkan saat flow selesai atau setelah TTL (`RECEIPT_MAX_AGE_MS`).

## Manual Cleanup

- Hapus file lama di direktori temp.
- Pastikan tidak ada proses upload aktif.

## Monitoring

- Gunakan `GET /api/receipts/[id]` untuk verifikasi akses.
- Receipt yang kadaluarsa tidak boleh dapat diakses.
EOF