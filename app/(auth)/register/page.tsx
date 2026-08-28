"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Wallet, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        toast.success("Akun berhasil dibuat! Mengalihkan ke dashboard...");
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat registrasi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Wallet className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Buat Akun PlanKan
          </CardTitle>
          <CardDescription>
            Mulai kelola keuangan Anda secara rapi dan bebas cemas hari ini
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                placeholder="Contoh: Budi Pratama"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Fitur Instan Setelah Daftar:
              </div>
              <p>• Otomatis dibuatkan Dompet Tunai & Rekening Bank</p>
              <p>• Kategori pengeluaran & pemasukan siap pakai</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
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

            <p className="text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Masuk di sini
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
