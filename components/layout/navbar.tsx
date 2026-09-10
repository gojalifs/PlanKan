"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { useMonitoringAccess } from "@/lib/hooks/use-monitoring-access";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Wallet,
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  Target,
  PlusCircle,
  LogOut,
  User,
  Menu,
  X,
  BarChart3,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TransactionModal } from "@/components/transactions/transaction-modal";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { data: monitoringAccess } = useMonitoringAccess();
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Monitoring is admin-only: hide the link until access is confirmed,
  // then keep it hidden for non-admins.
  const canMonitor = monitoringAccess?.canAccess ?? false;

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Transaksi", href: "/transactions", icon: ArrowLeftRight },
    { label: "Budget", href: "/budgets", icon: Target },
    { label: "Laporan", href: "/reports", icon: BarChart3 },
    { label: "Monitoring", href: "/monitoring", icon: Activity },
    { label: "Dompet", href: "/wallets", icon: Wallet },
    { label: "Kategori", href: "/categories", icon: Tags },
  ].filter((item) => item.href !== "/monitoring" || canMonitor);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  // If on auth pages, don't show full nav
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-lg transition-all">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-primary group">
              <motion.div
                whileHover={{ rotate: 10, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              >
                <Wallet className="h-5 w-5" />
              </motion.div>
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-extrabold tracking-tight">
                PlanKan
              </span>
            </Link>

            {/* Desktop Navigation with Animated Pill Indicator */}
            {session?.user && (
              <nav className="hidden md:flex items-center gap-1 relative">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="navbar-indicator"
                          className="absolute inset-0 rounded-lg bg-primary/10 -z-10"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {isPending ? (
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            ) : session?.user ? (
              <>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => setIsTxModalOpen(true)}
                    className="hidden sm:inline-flex items-center gap-1.5 shadow-sm shadow-primary/20"
                    size="sm"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Catat Transaksi</span>
                  </Button>
                </motion.div>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{session.user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/budgets" className="cursor-pointer">
                        <Target className="mr-2 h-4 w-4" />
                        Anggaran (Budget)
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/wallets" className="cursor-pointer">
                        <Wallet className="mr-2 h-4 w-4" />
                        Kelola Dompet
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/categories" className="cursor-pointer">
                        <Tags className="mr-2 h-4 w-4" />
                        Kelola Kategori
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-rose-600 focus:text-rose-600 cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild size="sm">
                  <Link href="/login">Masuk</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Daftar Akun</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer with AnimatePresence */}
        <AnimatePresence>
          {session?.user && isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="border-b border-border bg-background/95 backdrop-blur-md px-4 py-3 md:hidden overflow-hidden"
            >
              <div className="flex flex-col space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsTxModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Catat Transaksi
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Quick Add Transaction Modal */}
      {session?.user && (
        <TransactionModal
          open={isTxModalOpen}
          onOpenChange={setIsTxModalOpen}
        />
      )}
    </>
  );
}
