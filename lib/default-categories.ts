import { prisma } from "@/lib/prisma";

export const DEFAULT_CATEGORY_TREES = [
  // Expense
  {
    name: "Makanan & Minuman",
    type: "EXPENSE" as const,
    icon: "Utensils",
    color: "#f43f5e",
    subCategories: [
      { name: "Restoran & Makan Luar", icon: "Utensils", color: "#f43f5e" },
      { name: "Bahan Makanan / Pasar", icon: "ShoppingCart", color: "#fb7185" },
      { name: "Kopi & Minuman", icon: "Coffee", color: "#fda4af" },
    ],
  },
  {
    name: "Transportasi",
    type: "EXPENSE" as const,
    icon: "Car",
    color: "#ea580c",
    subCategories: [
      { name: "Bensin / BBM", icon: "Fuel", color: "#ea580c" },
      { name: "Parkir & Tol", icon: "Receipt", color: "#f97316" },
      { name: "Ojek & Taksi Online", icon: "Smartphone", color: "#fb923c" },
      { name: "Servis & Perawatan", icon: "Wrench", color: "#fdba74" },
    ],
  },
  {
    name: "Tagihan & Utilitas",
    type: "EXPENSE" as const,
    icon: "Receipt",
    color: "#d97706",
    subCategories: [
      { name: "Listrik & Air", icon: "Zap", color: "#d97706" },
      { name: "Internet & Pulsa", icon: "Wifi", color: "#f59e0b" },
      { name: "Langganan Digital", icon: "Tv", color: "#fbbf24" },
    ],
  },
  {
    name: "Belanja Harian",
    type: "EXPENSE" as const,
    icon: "ShoppingCart",
    color: "#e11d48",
    subCategories: [
      { name: "Pakaian & Aksesoris", icon: "Shirt", color: "#e11d48" },
      { name: "Kebutuhan Rumah", icon: "Home", color: "#f43f5e" },
      { name: "Elektronik & Gadget", icon: "Laptop", color: "#fb7185" },
    ],
  },
  {
    name: "Hiburan & Hobi",
    type: "EXPENSE" as const,
    icon: "Film",
    color: "#8b5cf6",
    subCategories: [
      { name: "Nonton & Bioskop", icon: "Film", color: "#8b5cf6" },
      { name: "Liburan & Wisata", icon: "Palmtree", color: "#a78bfa" },
      { name: "Game & Hobi", icon: "Gamepad2", color: "#c4b5fd" },
    ],
  },
  {
    name: "Kesehatan",
    type: "EXPENSE" as const,
    icon: "HeartPulse",
    color: "#ec4899",
    subCategories: [
      { name: "Obat & Farmasi", icon: "Pill", color: "#ec4899" },
      { name: "Dokter & Perawatan", icon: "Hospital", color: "#f472b6" },
    ],
  },
  {
    name: "Pendidikan",
    type: "EXPENSE" as const,
    icon: "GraduationCap",
    color: "#3b82f6",
    subCategories: [
      { name: "Kursus & Buku", icon: "BookOpen", color: "#3b82f6" },
      { name: "Uang Sekolah / Kuliah", icon: "GraduationCap", color: "#60a5fa" },
    ],
  },
  {
    name: "Donasi & Zakat",
    type: "EXPENSE" as const,
    icon: "HeartHandshake",
    color: "#14b8a6",
    subCategories: [
      { name: "Zakat & Infaq", icon: "HeartHandshake", color: "#14b8a6" },
      { name: "Hadiah & Sedekah", icon: "Gift", color: "#2dd4bf" },
    ],
  },
  {
    name: "Lainnya (Pengeluaran)",
    type: "EXPENSE" as const,
    icon: "CircleEllipsis",
    color: "#64748b",
  },

  // Income
  {
    name: "Gaji & Upah",
    type: "INCOME" as const,
    icon: "Briefcase",
    color: "#10b981",
    subCategories: [
      { name: "Gaji Pokok", icon: "Briefcase", color: "#10b981" },
      { name: "Lembur & Tunjangan", icon: "Clock", color: "#34d399" },
    ],
  },
  {
    name: "Bonus & THR",
    type: "INCOME" as const,
    icon: "Gift",
    color: "#059669",
  },
  {
    name: "Bisnis & Jualan",
    type: "INCOME" as const,
    icon: "Store",
    color: "#0d9488",
    subCategories: [
      { name: "Penjualan Produk", icon: "Store", color: "#0d9488" },
      { name: "Jasa & Freelance", icon: "Laptop", color: "#14b8a6" },
    ],
  },
  {
    name: "Investasi & Dividen",
    type: "INCOME" as const,
    icon: "TrendingUp",
    color: "#0284c7",
    subCategories: [
      { name: "Dividen Saham / Reksadana", icon: "TrendingUp", color: "#0284c7" },
      { name: "Bunga Tabungan / Deposito", icon: "Banknote", color: "#38bdf8" },
    ],
  },
  {
    name: "Lainnya (Pemasukan)",
    type: "INCOME" as const,
    icon: "Sparkles",
    color: "#6366f1",
  },
];

export async function ensureUserStarterData(userId: string) {
  // 1. Check if user has wallets
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

  // 2. Check if user has categories
  const categoryCount = await prisma.category.count({ where: { userId } });
  if (categoryCount === 0) {
    for (const cat of DEFAULT_CATEGORY_TREES) {
      const parent = await prisma.category.create({
        data: {
          userId,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
        },
      });

      if ("subCategories" in cat && cat.subCategories && cat.subCategories.length > 0) {
        await prisma.category.createMany({
          data: cat.subCategories.map((sub) => ({
            userId,
            parentId: parent.id,
            name: sub.name,
            type: cat.type,
            icon: sub.icon,
            color: sub.color,
            isDefault: true,
          })),
        });
      }
    }
  }
}
