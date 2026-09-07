"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function EmailVerifiedPage() {
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
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-md shadow-emerald-200"
            >
              <ShieldCheck className="h-7 w-7" />
            </motion.div>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Email Terverifikasi!
            </CardTitle>
            <CardDescription className="text-sm max-w-xs mx-auto">
              Email Anda telah berhasil diverifikasi. Anda sekarang bisa login dengan email & password, atau hubungkan akun Google Anda.
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex flex-col px-6 sm:px-8 pb-8 pt-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
              <Button asChild className="w-full h-10 font-semibold shadow-md shadow-primary/20">
                <Link href="/login">
                  Masuk ke Akun
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}