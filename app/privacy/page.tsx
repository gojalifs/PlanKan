import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Kebijakan Privasi - PlanKan",
  description:
    "Kebijakan privasi PlanKan: data apa yang kami kumpulkan, bagaimana kami gunakan, dan hak Anda.",
};

const effectiveDate = "7 September 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Kebijakan Privasi
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            PlanKan · Berlaku sejak <span className="font-medium text-foreground">{effectiveDate}</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-prose">
            Kebijakan ini menjelaskan bagaimana PlanKan (&quot;kami&quot;, di alamat{" "}
            <span className="font-medium text-foreground">budget.twogether.click</span>) mengumpulkan,
            menggunakan, dan melindungi data pribadi Anda saat menggunakan layanan kami.
          </p>
        </header>

        <main className="space-y-8">
          <Section title="1. Data yang Kami Kumpulkan">
            <p>
              Kami hanya mengumpulkan data yang dibutuhkan untuk menjalankan layanan pencatatan
              keuangan Anda. Beberapa data dikumpulkan langsung dari Anda, sebagian lainnya dari
              penyedia login atau dari aktivitas Anda di aplikasi.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Data akun:</strong> nama, alamat email, dan kata sandi (tersimpan sebagai
                hash/terenkripsi). Jika Anda mendaftar/masuk dengan akun Google, kami menerima
                nama, email, dan foto profil yang Anda setujui untuk dibagikan.
              </li>
              <li>
                <strong>Data keuangan:</strong> transaksi, kategori, anggaran (budget), dan dompet
                (saldo) yang Anda catat di aplikasi.
              </li>
              <li>
                <strong>Gambar struk:</strong> foto atau gambar bukti transaksi yang Anda unggah
                untuk fitur pemindai (OCR). Gambar ini diproses agar isinya terbaca menjadi item
                transaksi.
              </li>
              <li>
                <strong>Data teknis:</strong> alamat IP, user-agent, waktu login, dan cookie sesi —
                digunakan untuk menjaga keamanan sesi login Anda.
              </li>
            </ul>
          </Section>

          <Section title="2. Bagaimana Data Kami Gunakan">
            <p>
              Data yang Anda berikan digunakan hanya untuk tujuan berikut:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Menyediakan dan mengoperasikan dashboard keuangan, laporan, dan fitur budget.</li>
              <li>Memverifikasi identitas saat login (email/password atau Google).</li>
              <li>
                Memproses gambar struk melalui layanan OCR untuk mengubahnya menjadi transaksi.
              </li>
              <li>
                Mengirim email yang Anda minta, misalnya tautan reset password atau notifikasi akun.
              </li>
              <li>Melindungi akun dari akses yang tidak sah.</li>
            </ul>
            <p className="mt-3">
              Kami <strong>tidak</strong> menjual data pribadi Anda kepada pihak mana pun.
            </p>
          </Section>

          <Section title="3. Penyedia Pihak Ketiga">
            <p>
              Untuk menjalankan layanan, kami bekerja sama dengan sejumlah penyedia teknologi.
              Setiap penyedia hanya menerima data yang diperlukan untuk fungsinya masing-masing:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Google OAuth</strong> — memverifikasi identitas Anda saat memilih
                &quot;Masuk dengan Google&quot;. Kami menerima profil dasar (nama, email, avatar)
                yang Anda setujui di layar persetujuan Google.
              </li>
              <li>
                <strong>Google Gemini</strong> — memproses gambar struk untuk fitur OCR. Gambar
                dikirim ke layanan ini demi pembacaan isi struk.
              </li>
              <li>
                <strong>Penyedia e-mail/SMTP</strong> — mengirim email transaksional seperti tautan
                reset password.
              </li>
              <li>
                <strong>Penyimpanan objek (object storage)</strong> — menyimpan gambar struk yang
                Anda unggah agar dapat ditampilkan kembali di riwayat transaksi.
              </li>
            </ul>
          </Section>

          <Section title="4. Cookies dan Sesi">
            <p>
              Kami menggunakan cookie sesi untuk menjaga Anda tetap masuk. Cookie ini hanya berisi
              token sesi yang tidak dapat dibaca pihak lain dan tidak digunakan untuk pelacakan
              iklan. Anda dapat keluar kapan saja, dan menutup sesi dengan tombol
              &quot;Keluar&quot; di aplikasi.
            </p>
          </Section>

          <Section title="5. Penyimpanan dan Keamanan">
            <p>
              Data Anda tersimpan pada database dan penyimpanan yang kami kelola sendiri dengan
              akses terbatas. Kata sandi disimpan dalam bentuk hash (tidak dapat dibaca balik).
              Kami menerapkan langkah yang wajar untuk melindungi data dari akses, perubahan, atau
              penghapusan yang tidak sah.
            </p>
          </Section>

          <Section title="6. Hak Anda">
            <p>Anda berhak untuk:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Mengakses dan melihat data Anda di dalam aplikasi.</li>
              <li>Mengoreksi data yang tidak akurat (misalnya nama dan email).</li>
              <li>Menghapus akun beserta data keuangannya kapan saja.</li>
              <li>
                Menarik persetujuan Anda untuk menghubungkan akun Google kapan saja melalui
                pengaturan akun Google Anda.
              </li>
            </ul>
          </Section>

          <Section title="7. Retensi Data">
            <p>
              Kami menyimpan data Anda selama akun Anda aktif dan diperlukan untuk layanan. Apabila
              Anda menghapus akun, data pribadi dan catatan keuangan Anda akan dihapus secara
              permanen, kecuali ada kewajiban hukum untuk menyimpannya.
            </p>
          </Section>

          <Section title="8. Perubahan Kebijakan">
            <p>
              Kebijakan ini dapat diperbarui sewaktu-waktu. Setiap perubahan akan diumumkan di
              halaman ini dengan tanggal berlaku yang baru. Penggunaan layanan setelah perubahan
              dianggap sebagai persetujuan atas kebijakan terbaru.
            </p>
          </Section>

          <Section title="9. Hubungi Kami">
            <p>
              Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, silakan hubungi kami
              melalui email di bawah ini.
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
            <Link href="/terms" className="font-medium text-primary hover:underline">
              Syarat &amp; Ketentuan
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