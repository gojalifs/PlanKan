"use client";

import React, { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Wallet, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Silakan isi email Anda");
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      setSent(true);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim email reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
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
              <CardTitle className="text-xl font-bold">Email Terkirim!</CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kami telah mengirim link reset password ke <strong className="text-foreground">{email}</strong>.
                Silakan cek email Anda dan ikuti instruksi di dalamnya.
              </p>
              <Link href="/login" className="pt-2">
                <Button variant="outline" className="font-semibold">
                  Kembali ke Login
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
              Lupa Password?
            </CardTitle>
            <CardDescription className="text-sm max-w-xs mx-auto">
              Masukkan email Anda dan kami akan mengirimkan link untuk mereset password.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-6 sm:px-8">
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
                  autoFocus
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 px-6 sm:px-8 pb-8 pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                <Button type="submit" className="w-full h-10 font-semibold shadow-md shadow-primary/20" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      Kirim Link Reset
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
