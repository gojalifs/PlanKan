import { prisma } from "@/lib/prisma";

export const DEFAULT_CATEGORIES = [
  // Expense
  { name: "Makanan & Minuman", type: "EXPENSE", icon: "Utensils", color: "#f43f5e" },
  { name: "Belanja Harian", type: "EXPENSE", icon: "ShoppingCart", color: "#e11d48" },
  { name: "Transportasi", type: "EXPENSE", icon: "Car", color: "#ea580c" },
  { name: "Tagihan & Utilitas", type: "EXPENSE", icon: "Receipt", color: "#d97706" },
  { name: "Tempat Tinggal", type: "EXPENSE", icon: "Home", color: "#ca8a04" },
  { name: "Hiburan & Hobi", type: "EXPENSE", icon: "Film", color: "#8b5cf6" },
  { name: "Kesehatan", type: "EXPENSE", icon: "HeartPulse", color: "#ec4899" },
  { name: "Pendidikan", type: "EXPENSE", icon: "GraduationCap", color: "#3b82f6" },
  { name: "Donasi & Zakat", type: "EXPENSE", icon: "HeartHandshake", color: "#14b8a6" },
  { name: "Lainnya (Pengeluaran)", type: "EXPENSE", icon: "CircleEllipsis", color: "#64748b" },

  // Income
  { name: "Gaji & Upah", type: "INCOME", icon: "Briefcase", color: "#10b981" },
  { name: "Bonus & THR", type: "INCOME", icon: "Gift", color: "#059669" },
  { name: "Bisnis & Jualan", type: "INCOME", icon: "Store", color: "#0d9488" },
  { name: "Investasi & Dividen", type: "INCOME", icon: "TrendingUp", color: "#0284c7" },
  { name: "Lainnya (Pemasukan)", type: "INCOME", icon: "Sparkles", color: "#6366f1" },
] as const;

export async function ensureUserStarterData(userId: string) {
  // Check if user has wallets
  const walletCount = await prisma.wallet.count({ where: { userId } });
  if (walletCount === 0) {
    await prisma.wallet.createMany({
      data: [
        {
          userId,
          name: "Dompet Utama (Cash)",
          type: "CASH",
          balance: 0,
          currency: "IDR",
          color: "#10b981",
          icon: "Banknote",
        },
        {
          userId,
          name: "Rekening Bank",
          type: "BANK",
          balance: 0,
          currency: "IDR",
          color: "#0284c7",
          icon: "Building2",
        },
      ],
    });
  }

  // Check if user has categories
  const categoryCount = await prisma.category.count({ where: { userId } });
  if (categoryCount === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        userId,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      })),
    });
  }
}
