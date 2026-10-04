import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Mail, Sparkles, Zap, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { seedDefaultPlans, type FeatureValue } from "@/lib/plans-config";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Harga Paket - PlanKan",
  description: "Paket PlanKan: Free, Starter, Plus, Pro, dan Family beserta kuota OCR & suara, dompet, dan budget.",
};

export const dynamic = "force-dynamic";

const TIER_STYLES: Record<string, { root: string; badge: string | null }> = {
  FREE: { root: "", badge: null },
  STARTER: { root: "", badge: null },
  PLUS: {
    root: "border-2 border-indigo-500 ring-4 ring-indigo-500/10",
    badge: "bg-indigo-600 text-white",
  },
  PRO: {
    root: "border-2 border-amber-500 ring-4 ring-amber-500/10",
    badge: "bg-amber-500 text-white",
  },
  FAMILY: { root: "", badge: null },
};

function displayValue(v: FeatureValue): string {
  if (typeof v === "boolean") return "";
  if (typeof v === "number") return v.toLocaleString("id-ID");
  if (v === null) return "Tanpa batas";
  return String(v);
}

interface FeatureRow {
  key: string;
  label: string;
  format: (v: FeatureValue) => string;
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    key: "ocr.monthly_limit",
    label: "Struk OCR & Suara / bulan",
    format: (v) => (v === null ? "Tanpa batas" : displayValue(v)),
  },
  {
    key: "ocr.welcome_bonus",
    label: "Bonus selamat datang",
    format: (v) => `+${displayValue(v)}`,
  },
  {
    key: "wallet.limit",
    label: "Jumlah dompet",
    format: (v) => (v === null ? "Tanpa batas" : displayValue(v)),
  },
  {
    key: "budget.limit",
    label: "Jumlah budget",
    format: (v) => (v === null ? "Tanpa batas" : displayValue(v)),
  },
  {
    key: "export.csv",
    label: "Ekspor CSV",
    format: () => "",
  },
  {
    key: "export.excel",
    label: "Ekspor Excel",
    format: () => "",
  },
  {
    key: "ai.auto_category",
    label: "AI kategorisasi otomatis",
    format: () => "",
  },
  {
    key: "ai.monthly_review",
    label: "Ulasan bulanan AI",
    format: () => "",
  },
  {
    key: "ai.financial_goals",
    label: "Tujuan keuangan AI",
    format: () => "",
  },
  {
    key: "ai.forecast",
    label: "Ramalan (forecast)",
    format: () => "",
  },
  {
    key: "history.years",
    label: "Riwayat data",
    format: (v) => (v === null ? "Selamanya" : `${displayValue(v)} tahun`),
  },
];

export default async function PricingPage() {
  await seedDefaultPlans();

  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { entitlements: true },
  });

  const plansWithMap = plans.map((plan) => {
    const m: Record<string, FeatureValue> = {};
    for (const e of plan.entitlements) m[e.feature] = e.value as FeatureValue;
    return { ...plan, map: m };
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <Package className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Berlangganan PlanKan
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Kuota OCR struk dan input suara memakai satu kolam yang sama per bulan. Kuota tidak
            di-rollover ke bulan berikutnya. Semua paket berisi pencatatan transaksi, dompet, dan
            budget tanpa batas jumlah.
          </p>
        </header>

        <main className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {plansWithMap.map((plan) => {
            const style = TIER_STYLES[plan.key] ?? TIER_STYLES.FREE;
            const planLimit = plan.map["ocr.monthly_limit"];
            const isBest = plan.key === "PLUS";
            return (
              <section
                key={plan.key}
                className={cn(
                  "flex flex-col rounded-2xl border border-border bg-background p-5 shadow-sm transition-shadow hover:shadow-md relative",
                  style.root
                )}
              >
                <div className="flex items-center gap-2">
                  {style.badge && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm", style.badge)}>
                      {isBest ? "POPULER" : "TERBAIK"}
                    </span>
                  )}
                  <h2 className="text-base font-bold tracking-tight">{plan.name}</h2>
                </div>
                <p className="mt-1 text-2xl font-extrabold tracking-tight">
                  {plan.priceMonthly === 0 ? (
                    "Gratis"
                  ) : (
                    <>
                      Rp{plan.priceMonthly.toLocaleString("id-ID")}
                      <span className="text-xs font-medium text-muted-foreground">/bulan</span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {planLimit === null ? "OCR & suara tanpa batas" : `${displayValue(planLimit)} kali OCR/suara per bulan`}
                </p>

                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  {FEATURE_ROWS.map((row) => {
                    const v = plan.map[row.key] ?? null;
                    if (typeof v === "boolean") {
                      return (
                        <li key={row.key} className="flex items-start gap-2">
                          {v ? (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                          )}
                          <span className={cn(v ? "" : "text-muted-foreground")}>{row.label}</span>
                        </li>
                      );
                    }
                    return (
                      <li key={row.key} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-semibold">{row.format(v)}</span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-5">
                  {plan.key === "FREE" ? (
                    <div className="rounded-lg bg-muted px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                      Terpasang otomatis
                    </div>
                  ) : (
                    <Link
                      href={`mailto:fajarsidik1999@gmail.com?subject=${encodeURIComponent(
                        `Aktivasi Paket ${plan.name} PlanKan`
                      )}`}
                      className={cn(
                        "inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                        plan.key === "PLUS"
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : plan.key === "PRO"
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      <Mail className="h-4 w-4" />
                      Aktifkan Paket
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </main>

        <section className="mt-12 rounded-2xl border border-border bg-background p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1 text-sm leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">Cara berlangganan saat ini</p>
              <p>
                Aktivasi paket masih dilakukan manual oleh tim PlanKan. Kirim email permohonan
                melalui tombol <strong>Aktifkan Paket</strong>, dan setelah pembayaran kami arahkan
                selesai, kuota paket kamu aktif langsung. Untuk keluarga (Family) — kuota OCR
                dibagi satu rumah tangga.
              </p>
              <p className="flex items-center gap-1.5 text-xs">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Belum punya akun?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Daftar gratis dulu
                </Link>
                , lalu aktifkan paket dari akunmu.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}