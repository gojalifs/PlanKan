import "dotenv/config";
import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";
import { ensureUserStarterData } from "../lib/default-categories";

async function main() {
  console.log("🌱 Mulai seeding database PlanKan...");

  // Check if demo user exists
  let user = await prisma.user.findUnique({
    where: { email: "demo@plankan.app" },
  });

  if (!user) {
    // Create demo user using Better Auth API
    const created = await auth.api.signUpEmail({
      body: {
        name: "Demo User",
        email: "demo@plankan.app",
        password: "password123",
      },
    });

    if (created && created.user) {
      user = await prisma.user.findUnique({ where: { id: created.user.id } });
    }
  }

  if (!user) {
    console.error("Gagal mendapatkan demo user");
    return;
  }

  console.log("👤 Demo user siap:", user.email);

  // Ensure starter wallets and categories
  await ensureUserStarterData(user.id);

  // Fetch wallets
  const wallets = await prisma.wallet.findMany({ where: { userId: user.id } });
  console.log(`💳 Dompet (${wallets.length}):`, wallets.map((w) => w.name).join(", "));

  // Fetch categories
  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  console.log(`🏷️ Kategori (${categories.length}):`, categories.map((c) => c.name).join(", "));

  // Seed sample transactions if none exist
  const txCount = await prisma.transaction.count({ where: { userId: user.id } });
  if (txCount === 0 && wallets.length >= 2) {
    const cashWallet = wallets.find((w) => w.type === "CASH") || wallets[0];
    const bankWallet = wallets.find((w) => w.type === "BANK") || wallets[1];
    const salaryCat = categories.find((c) => c.name === "Gaji & Upah");
    const foodCat = categories.find((c) => c.name === "Makanan & Minuman");

    // 1. Income: Gaji Rp 10.000.000 ke Bank
    await prisma.transaction.create({
      data: {
        userId: user.id,
        walletId: bankWallet.id,
        categoryId: salaryCat?.id,
        type: "INCOME",
        amount: 10000000,
        date: new Date(),
        note: "Gaji bulanan",
      },
    });
    await prisma.wallet.update({
      where: { id: bankWallet.id },
      data: { balance: { increment: 10000000 } },
    });

    // 2. Transfer: Tarik tunai Rp 1.500.000 dari Bank ke Dompet Tunai
    await prisma.transaction.create({
      data: {
        userId: user.id,
        walletId: bankWallet.id,
        destinationWalletId: cashWallet.id,
        type: "TRANSFER",
        amount: 1500000,
        date: new Date(),
        note: "Tarik tunai ATM",
      },
    });
    await prisma.wallet.update({
      where: { id: bankWallet.id },
      data: { balance: { decrement: 1500000 } },
    });
    await prisma.wallet.update({
      where: { id: cashWallet.id },
      data: { balance: { increment: 1500000 } },
    });

    // 3. Expense: Makan siang Rp 45.000 dari Dompet Tunai
    await prisma.transaction.create({
      data: {
        userId: user.id,
        walletId: cashWallet.id,
        categoryId: foodCat?.id,
        type: "EXPENSE",
        amount: 45000,
        date: new Date(),
        note: "Makan siang ayam geprek",
      },
    });
    await prisma.wallet.update({
      where: { id: cashWallet.id },
      data: { balance: { decrement: 45000 } },
    });

    console.log("✅ Berhasil membuat 3 contoh transaksi (Pemasukan, Transfer, Pengeluaran)!");
  }

  console.log("🎉 Seeding selesai!");
}

main().catch(console.error);
