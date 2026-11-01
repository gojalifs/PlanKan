# ADR 0002: Atomic Wallet Balance Updates

## Status
Accepted

## Context
Transaksi income, expense, dan transfer harus menjaga konsistensi saldo.

## Decision
Semua perubahan saldo dibungkus Prisma `$transaction`. Edit dan delete membalik saldo sebelum menerapkan perubahan baru.

## Consequences
- Saldo tidak boleh diupdate parsial.
- Idempotency key mencegah duplikasi saat retry.
- Logika anomaly dihitung ulang saat update.
EOF