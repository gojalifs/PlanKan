# ADR 0003: Same-Origin Attachment Proxy

## Status
Accepted

## Context
Browser tidak seharusnya mengakses MinIO internal langsung.

## Decision
Lampiran diproksi melalui route `/transactions/<object>` dengan pemeriksaan owner transaksi.

## Consequences
- Akses attachment dibatasi pemilik transaksi.
- MinIO internal tetap privat.
- Route harus memvalidasi sesi dan ownership.
EOF