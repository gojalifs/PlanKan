"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Wallet, Loader2, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Silakan lengkapi semua kolom pendaftaran");
      return;
    }

    if (password.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }

    setIsLoading(true);
    try {
      const res = await signUp.email({
        name,
        email,
        password,
      });

      if (res?.error) {
        toast.error(res.error.message || "Gagal mendaftar akun");
      } else {
        setRegisteredEmail(email);
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat registrasi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border-border/80 rounded-2xl overflow-hidden backdrop-blur-xs">
          {registeredEmail ? (
            <>
              <CardHeader className="space-y-3 text-center pb-4 pt-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-md shadow-primary/10"
                >
                  <Mail className="h-7 w-7" />
                </motion.div>
                <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Cek Email Anda
                </CardTitle>
                <CardDescription className="text-sm max-w-xs mx-auto">
                  Kami telah mengirim link verifikasi ke{" "}
                  <span className="font-medium text-foreground">{registeredEmail}</span>. Klik link tersebut untuk mengaktifkan akun Anda.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col px-6 sm:px-8 pb-8 pt-2 space-y-3">
                <p className="text-xs text-muted-foreground text-center">
                  Tidak menerima email? Cek folder spam, atau{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={async () => {
                      try {
                        await fetch(`${window.location.origin}/api/auth/send-verification-email`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: registeredEmail }),
                        });
                        toast.success("Email verifikasi baru telah dikirim!");
                      } catch {
                        toast.error("Gagal mengirim email verifikasi");
                      }
                    }}
                  >
                    kirim ulang
                  </button>
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                  <Button asChild className="w-full h-10 font-semibold shadow-md shadow-primary/20">
                    <Link href="/login">
                      Lanjut ke Login
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="space-y-3 text-center pb-4 pt-8">
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.05 }}
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25"
                >
                  <Wallet className="h-7 w-7" />
                </motion.div>
                <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Buat Akun PlanKan
                </CardTitle>
                <CardDescription className="text-sm max-w-xs mx-auto">
                  Mulai kelola keuangan Anda secara rapi dan bebas cemas hari ini
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 sm:px-8 pt-0">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 font-semibold border-border/80"
                    onClick={() => signIn.social({ provider: "google" })}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Daftar dengan Google
                  </Button>
                </motion.div>

                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    atau
                  </span>
                </div>
              </CardContent>

              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4 px-6 sm:px-8">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Nama Lengkap</Label>
                    <Input
                      id="name"
                      placeholder="Contoh: Budi Pratama"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 text-sm rounded-lg"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 text-sm rounded-lg"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimal 8 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 text-sm rounded-lg"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Fitur Instan Setelah Daftar:
                    </div>
                    <p>• Otomatis dibuatkan Dompet Tunai & Rekening Bank</p>
                    <p>• Kategori pengeluaran & pemasukan siap pakai</p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-3 px-6 sm:px-8 pb-8 pt-2">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                    <Button type="submit" className="w-full h-10 font-semibold shadow-md shadow-primary/20" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Mendaftarkan...
                        </>
                      ) : (
                        <>
                          Daftar Sekarang
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <p className="text-center text-sm text-muted-foreground pt-1">
                    Sudah punya akun?{" "}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                      Masuk di sini
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
