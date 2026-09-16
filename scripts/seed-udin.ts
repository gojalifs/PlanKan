/**
 * Seed data dummy untuk user "udin" (fs684009@gmail.com).
 *
 * Membaca prisma/seed-data/udin-2026.json → menyisipkan transaksi Jan–Agu 2026
 * dengan penyelarasan saldo dompet (bank/cash) seperti logika POST /api/transactions.
 *
 * Aman: TIDAK menghapus apa pun. Jika user sudah punya transaksi, skrip menolak
 * jalan kecuali diberi flag `--wipe` (menghapus transaksi user tsb + reset saldo).
 *
 * Jalan:  pnpm exec tsx scripts/seed-udin.ts [--wipe]
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { ensureUserStarterData } from "../lib/default-categories";
import { detectAnomaly, ANOMALY_WINDOW_DAYS } from "../lib/anomaly";
import seedData from "../prisma/seed-data/udin-2026.json";

type SeedTx = (typeof seedData.transactions)[number];
type WalletKey = "bank" | "cash";

const WIB_OFFSET_HOURS = 7;

/** Saldo awal (realistis) sebelum periode data Januar–Agustus 2026. */
const BEGINNING_BALANCE = { bank: 2_500_000, cash: 900_000 };

async function main() {
  const wipe = process.argv.includes("--wipe");
  const { userEmail, walletKeys } = seedData.meta;

  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    console.error(`User "${userEmail}" tidak ditemukan. Login dulu lewat aplikasi (Google), lalu ulangi seed.`);
    process.exit(1);
  }
  console.log(`👤 User ditemukan: ${user.name} (${user.email})`);

  await ensureUserStarterData(user.id);

  // ── Wallet map (key → row) ──
  const wallets = await prisma.wallet.findMany({ where: { userId: user.id } });
  const walletByName = new Map(wallets.map((w) => [w.name, w]));
  const bank = walletByName.get(walletKeys.bank);
  const cash = walletByName.get(walletKeys.cash);
  if (!bank || !cash) {
    console.error("Wallet starter (Rekening Bank / Dompet Utama (Cash)) tidak ditemukan.");
    process.exit(1);
  }

  // ── Category lookup "Parent/Child" → id (child lebih spesifik; fallback parent) ──
  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catLookup = new Map<string, string>();
  for (const c of categories) {
    if (c.parentId) {
      const p = catById.get(c.parentId);
      if (p) catLookup.set(`${p.name}/${c.name}`, c.id);
    } else {
      catLookup.set(c.name, c.id);
    }
  }

  // ── Guard: jangan menimpa data riil tanpa --wipe ──
  const existing = await prisma.transaction.count({ where: { userId: user.id } });
  if (existing > 0 && !wipe) {
    console.error(
      `User sudah punya ${existing} transaksi. Gunakan --wipe untuk menghapus transaksi user tsb & reset saldo sebelum seed ulang.`,
    );
    process.exit(1);
  }
  if (wipe && existing > 0) {
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.monthlyReview.deleteMany({ where: { userId: user.id } });
    console.log(`🧹 Menghapus ${existing} transaksi lama (termasuk monthly review).`);
  }

  // Saldo awal realistis (sisa tabungan sebelum periode Jan–Agu 2026), supaya tidak
  // ada wallet yang minus di hari-hari awal dan hasil akhir terlihat wajar.
  await prisma.wallet.update({ where: { id: bank.id }, data: { balance: BEGINNING_BALANCE.bank } });
  await prisma.wallet.update({ where: { id: cash.id }, data: { balance: BEGINNING_BALANCE.cash } });
  console.log(
    `💰 Saldo awal: Rekening Bank ${BEGINNING_BALANCE.bank.toLocaleString("id-ID")}, Dompet ${BEGINNING_BALANCE.cash.toLocaleString("id-ID")}`,
  );

  // ── Insert (diproses kronologis agar baseline anomali benar: hanya pengeluaran
  // ── sebelum tanggal tadi yang masuk window 90 hari, seperti logika write-time POST).
  const ordered = [...seedData.transactions].sort((a, b) => a.date.localeCompare(b.date));
  const balanceDelta = new Map<string, number>([
    [bank.id, 0],
    [cash.id, 0],
  ]);
  let unresolved = new Set<string>();
  let created = 0;
  const flagged: string[] = [];
  /** bucket key (parent category id) → prior expense samples {amount, date} */
  const anomalySamples = new Map<string, { name: string; amount: number; date: Date }[]>();

  for (const t of ordered) {
    const date = new Date(`${t.date}T12:00:00+07:00`);

    if (t.type === "TRANSFER") {
      const wFrom = walletKeys[t.wallet as WalletKey];
      const wTo = walletKeys[t.to as WalletKey];
      const from = walletByName.get(wFrom);
      const to = walletByName.get(wTo);
      if (!from || !to) {
        console.error(`Wallet transfer tidak valid: ${t.wallet} → ${t.to}`);
        process.exit(1);
      }
      await prisma.transaction.create({
        data: {
          userId: user.id,
          walletId: from.id,
          destinationWalletId: to.id,
          type: "TRANSFER",
          amount: t.amount,
          date,
          note: t.note,
        },
      });
      balanceDelta.set(from.id, (balanceDelta.get(from.id) ?? 0) - t.amount);
      balanceDelta.set(to.id, (balanceDelta.get(to.id) ?? 0) + t.amount);
      created++;
      continue;
    }

    const rawCategory = (t as { category?: string }).category;
    if (!rawCategory) {
      unresolved.add("(tanpa kategori)");
      continue;
    }
    const categoryId = catLookup.get(rawCategory);
    if (!categoryId) {
      unresolved.add(rawCategory);
      continue;
    }

    const catRow = catById.get(categoryId)!;
    const parentKey = catRow.parentId ?? categoryId;

    // ── Anomali: bandingkan dengan sampel bucket (parent) 90 hari sebelum tgl ini,
    //    persis seperti logika write-time di POST /api/transactions ──
    let isAnomaly = false;
    let anomalyReason: string | null = null;
    if (t.type === "EXPENSE") {
      const parentName = catRow.parentId ? (catById.get(catRow.parentId)?.name ?? catRow.name) : catRow.name;
      const cutoff = new Date(date.getTime() - ANOMALY_WINDOW_DAYS * 24 * 3600 * 1000);
      const hist = (anomalySamples.get(parentKey) ?? []).filter((s) => s.date >= cutoff).map((s) => s.amount);
      const det = detectAnomaly(
        { amount: t.amount, categoryId, parentCategoryId: parentKey, parentCategoryName: parentName },
        hist,
      );
      isAnomaly = det.isAnomaly;
      anomalyReason = det.reason;
      if (det.isAnomaly) {
        flagged.push(
          `${t.date}  ${parentName}: ${t.amount.toLocaleString("id-ID")}  (median ${det.median.toLocaleString("id-ID")}, n=${det.sampleCount})`,
        );
      }
    }

    await prisma.transaction.create({
      data: {
        userId: user.id,
        walletId: t.wallet === "bank" ? bank.id : cash.id,
        categoryId,
        type: t.type as "INCOME" | "EXPENSE",
        amount: t.amount,
        date,
        note: t.note,
        ...(t.type === "EXPENSE" ? { isAnomaly, anomalyReason } : {}),
      },
    });
    if (t.type === "EXPENSE") {
      const parentName = catRow.parentId ? (catById.get(catRow.parentId)?.name ?? catRow.name) : catRow.name;
      anomalySamples.set(parentKey, [
        ...(anomalySamples.get(parentKey) ?? []),
        { name: parentName, amount: t.amount, date },
      ]);
    }
    const wId = t.wallet === "bank" ? bank.id : cash.id;
    balanceDelta.set(wId, (balanceDelta.get(wId) ?? 0) + (t.type === "INCOME" ? t.amount : -t.amount));
    created++;
  }

  if (unresolved.size > 0) {
    console.error("❌ Kategori tidak ditemukan:", [...unresolved].join(", "));
    process.exit(1);
  }

  // ── Terapkan saldo ──
  for (const [walletId, delta] of balanceDelta) {
    await prisma.wallet.update({
      where: { id: walletId },
      data: { balance: { increment: delta } },
    });
  }

  // ── Ringkasan ──
  console.log(`✅ ${created} transaksi dibuat.`);
  const finalWallets = await prisma.wallet.findMany({ where: { id: { in: [bank.id, cash.id] } } });
  for (const w of finalWallets) {
    console.log(`💳 ${w.name}: ${Number(w.balance).toLocaleString("id-ID")}`);
  }

  // Per-bulan income/expense/net dari data JSON (verifikasi cepat)
  const byMonth = new Map<number, { income: number; expense: number }>();
  for (const t of seedData.transactions) {
    if (t.type === "TRANSFER") continue;
    const m = new Date(`${t.date}T12:00:00+07:00`).getMonth() + 1;
    const cur = byMonth.get(m) ?? { income: 0, expense: 0 };
    if (t.type === "INCOME") cur.income += t.amount;
    else cur.expense += t.amount;
    byMonth.set(m, cur);
  }
  console.log("\n📆 Ringkasan per bulan (dari JSON):");
  for (const [m, s] of [...byMonth.entries()].sort()) {
    const net = s.income - s.expense;
    console.log(
      `  ${String(m).padStart(2, "0")}/2026  in ${s.income.toLocaleString("id-ID")}  out ${s.expense.toLocaleString("id-ID")}  net ${net.toLocaleString("id-ID")}`,
    );
  }

  if (flagged.length > 0) {
    console.log("\n🚨 Transaksi ditandai anomali oleh seed (isAnomaly=true):");
    for (const f of flagged) console.log(`  ⚠ ${f}`);
  } else {
    console.log("\nℹ Tidak ada transaksi yang ditandai anomali.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});