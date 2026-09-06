import type { Metadata } from "next";
import Link from "next/link";
import { Scale, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan - PlanKan",
  description: "Syarat dan ketentuan penggunaan layanan PlanKan.",
};

const effectiveDate = "7 September 2026";

export default function TermsPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <Scale className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Syarat &amp; Ketentuan
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            PlanKan · Berlaku sejak <span className="font-medium text-foreground">{effectiveDate}</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-prose">
            Dengan mengakses atau menggunakan PlanKan (&quot;Layanan&quot;), Anda menyetujui
            syarat yang dijelaskan di halaman ini. Harap baca dengan saksama sebelum menggunakan
            layanan.
          </p>
        </header>

        <main className="space-y-8">
          <Section title="1. Deskripsi Layanan">
            <p>
              PlanKan adalah aplikasi pencatatan keuangan pribadi yang membantu Anda mencatat
              transaksi, mengatur kategori, mengelola dompet, dan menyusun anggaran (budget).
              Layanan tersedia melalui situs{" "}
              <span className="font-medium text-foreground">budget.twogether.click</span>.
            </p>
          </Section>

          <Section title="2. Akun Anda">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Anda dapat mendaftar dengan email dan kata sandi, atau dengan akun Google.</li>
              <li>Anda bertanggung jawab menjaga kerahasiaan kredensial akun Anda.</li>
              <li>Informasi yang Anda berikan harus benar dan terkini. Anda hanya dapat memiliki satu akun untuk satu email yang sama.</li>
              <li>Kami dapat menangguhkan atau menghapus akun yang melanggar ketentuan ini.</li>
            </ul>
          </Section>

          <Section title="3. Penggunaan yang Diizinkan">
            <p>
              Anda diizinkan menggunakan Layanan untuk kepentingan pribadi dan non-komersial.
              Anda tidak diperbolehkan untuk:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Menjual, menyewakan, atau mendistribusikan ulang Layanan tanpa izin kami.</li>
              <li>Menggunakan Layanan untuk aktivitas yang melanggar hukum, termasuk pencucian uang atau pendanaan aktivitas terlarang.</li>
              <li>Mencoba mengakses sistem, data, atau akun pengguna lain tanpa izin.</li>
              <li>Membebani atau mengganggu infrastruktur Layanan secara tidak wajar.</li>
              <li>Memasukkan data palsu atau menyesatkan ke dalam catatan keuangan Anda.</li>
            </ul>
          </Section>

          <Section title="4. Data dan Privasi">
            <p>
              Data yang Anda masukkan ke dalam Layanan dikelola sesuai dengan{" "}
              <Link
                href="/privacy"
                className="font-medium text-primary hover:underline"
              >
                Kebijakan Privasi
              </Link>
              . Dengan menggunakan Layanan, Anda menyetujui pengumpulan dan penggunaan data
              sebagaimana dijelaskan dalam kebijakan tersebut.
            </p>
          </Section>

          <Section title="5. Tanpa Jaminan Keuangan">
            <p>
              PlanKan adalah alat bantu pencatatan, bukan jasa keuangan, nasihat investasi, atau
              lembaga pembayaran. Kami tidak menjamin keakuratan laporan yang dihasilkan dari data
              yang Anda masukkan. Keputusan keuangan sepenuhnya menjadi tanggung jawab Anda.
            </p>
          </Section>

          <Section title="6. Batasan Tanggung Jawab">
            <p>
              Sepanjang diizinkan oleh hukum, PlanKan tidak bertanggung jawab atas kerugian tidak
              langsung, insidental, khusus, atau konsekuensial yang timbul dari penggunaan — atau
              ketidakmampuan menggunakan — Layanan, termasuk kehilangan data keuangan. Anda
              bertanggung jawab untuk membuat cadangan (backup) informasi penting Anda.
            </p>
          </Section>

          <Section title="7. Penghentian atau Penghapusan Akun">
            <p>
              Anda dapat berhenti menggunakan Layanan kapan saja dan menghapus akun Anda melalui
              pengaturan aplikasi. Kami juga dapat menangguhkan atau mengakhiri akses Anda bila
              terjadi pelanggaran atas ketentuan ini, tanpa mengurangi hak-hak Anda yang lain.
            </p>
          </Section>

          <Section title="8. Perubahan Syarat">
            <p>
              Kami dapat memperbarui ketentuan ini dari waktu ke waktu. Perubahan akan diumumkan
              di halaman ini dengan tanggal berlaku yang baru. Penggunaan Layanan yang berlanjut
              setelah perubahan dianggap sebagai persetujuan atas ketentuan terbaru.
            </p>
          </Section>

          <Section title="9. Hukum yang Berlaku">
            <p>
              Ketentuan ini diatur oleh hukum yang berlaku di Republik Indonesia. Perselisihan yang
              timbul akan diupayakan diselesaikan secara musyawarah terlebih dahulu melalui
              penghubung kontak di bawah.
            </p>
          </Section>

          <Section title="10. Hubungi Kami">
            <p>
              Pertanyaan seputar syarat dan ketentuan dapat disampaikan melalui email di bawah ini.
            </p>
            <div className="mt-3">
              <Link
                href="mailto:fajarsidik1999@gmail.com"
                className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                <Mail className="h-4 w-4 text-primary" />
                fajarsidik1999@gmail.com
              </Link>
            </div>
          </Section>
        </main>

        <footer className="mt-12 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          <p>
            PlanKan — Kelola budget &amp; keuangan harian Anda dengan mudah dan terencana. ·{" "}
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Kebijakan Privasi
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24">
      <h2 className="mb-3 text-lg font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}