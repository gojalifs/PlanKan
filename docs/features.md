# Features

## Transaksi

- Tipe: income, expense, transfer.
- Saldo dompet diperbarui atomik melalui Prisma transaction.
- Edit/hapus transaksi membalik saldo sebelum menerapkan perubahan.
- `idempotencyKey` mencegah duplikasi saat retry.
- Lampiran diunggah ke MinIO dan disimpan sebagai path same-origin.
- Deteksi anomali expense menggunakan modified z-score 90 hari pada kategori induk.

## OCR Struk

- Endpoint `POST /api/receipts` menerima gambar multipart.
- Gemini Vision mengekstrak tanggal dan item.
- Prompt menangani format ribuan Indonesia, diskon, dan barang ditimbang.
- Auto-match kategori bila entitlement `ai.auto_category` aktif.
- Gambar sementara disimpan di disk dengan UUID dan TTL.
- Fallback stub digunakan bila `GEMINI_API_KEY` kosong.

## Budget

- Budget per kategori dengan progres terpakai/sisa.
- Periode fleksibel: `LAST_WORKING_DAY`, `FIXED_DAY`, override per bulan.
- Agregasi kategori induk dan subkategori.

## Laporan

- `GET /api/reports` mengembalikan tren 6 bulan, breakdown kategori, pengeluaran harian, dan top subkategori.
- Dashboard menampilkan net worth, cashflow bulan ini, dan transaksi terbaru.

## Goals

- Target keuangan dengan progress.
- Auto-complete saat target tercapai.
- Gated oleh entitlement `ai.financial_goals`.

## Workspace Family

- Plan FAMILY diperlukan.
- Owner mengundang hingga 4 member.
- Resource bersama melalui `workspaceId`.
- Akses scope memfilter data personal dan workspace aktif.
- Undangan berlaku 7 hari.

## Monetisasi dan Kuota

- Plan dan entitlement disimpan di database.
- Subscription dapat dimiliki user atau workspace.
- Usage lease race-safe untuk OCR, voice, wallet, budget, goal.
- Shared OCR pool untuk OCR dan voice.
- Admin dapat grant/cancel subscription.

## Voice

- Web Speech API di client.
- `/api/voice` memakai Gemini function calling untuk membuat draft transaksi.
- Nama wallet/kategori dicocokkan ke ID.

## Monitoring

- Log request API dan pemanggilan Gemini.
- Dashboard owner di `/monitoring`.
- Retention cleanup berdasarkan hari.
EOF