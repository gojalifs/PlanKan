"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Wallet, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="shadow-lg border-border/80 rounded-2xl overflow-hidden backdrop-blur-xs">
            <CardContent className="flex flex-col items-center space-y-4 px-6 sm:px-8 py-12 text-center">
              <CardTitle className="text-xl font-bold">Link Tidak Valid</CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Token reset password tidak ditemukan atau telah kedaluwarsa.
              </p>
              <Link href="/forgot-password" className="pt-2">
                <Button className="font-semibold shadow-md shadow-primary/20">
                  Minta Link Baru
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Password baru dan konfirmasi password tidak cocok");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({
        newPassword,
        token,
      });
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || "Gagal mereset password. Token mungkin sudah kedaluwarsa.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="shadow-lg border-border/80 rounded-2xl overflow-hidden backdrop-blur-xs">
            <CardContent className="flex flex-col items-center space-y-4 px-6 sm:px-8 py-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
              >
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </motion.div>
              <CardTitle className="text-xl font-bold">Password Berhasil Diubah!</CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Password Anda telah berhasil diubah. Silakan login dengan password baru Anda.
              </p>
              <Link href="/login" className="pt-2">
                <Button className="font-semibold shadow-md shadow-primary/20">
                  Login Sekarang
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border-border/80 rounded-2xl overflow-hidden backdrop-blur-xs">
          <CardHeader className="space-y-3 text-center pb-4 pt-8">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.05 }}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25"
            >
              <Wallet className="h-7 w-7" />
            </motion.div>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Reset Password
            </CardTitle>
            <CardDescription className="text-sm max-w-xs mx-auto">
              Masukkan password baru Anda di bawah ini.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-6 sm:px-8">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 text-sm rounded-lg"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 text-sm rounded-lg"
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 px-6 sm:px-8 pb-8 pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                <Button type="submit" className="w-full h-10 font-semibold shadow-md shadow-primary/20" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mereset...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>

              <p className="text-center text-sm text-muted-foreground pt-1">
                Ingat password Anda?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Kembali ke Login
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
