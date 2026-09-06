"use client";

import React, { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useCategories, Category } from "@/lib/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CategoryModal } from "@/components/categories/category-modal";
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Tag,
  CornerDownRight,
  FolderTree,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export default function CategoriesPage() {
  const { data: session, isPending: isAuthPending } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const { categories, isLoading, deleteCategory, isDeleting } = useCategories(activeTab);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  if (isAuthPending) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    router.push("/login");
    return null;
  }

  const handleEdit = (c: Category) => {
    setCategoryToEdit(c);
    setDefaultParentId(c.parentId || null);
    setIsModalOpen(true);
  };

  const handleOpenAdd = (parentId?: string | null) => {
    setCategoryToEdit(null);
    setDefaultParentId(parentId || null);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    await deleteCategory(categoryToDelete.id);
    setCategoryToDelete(null);
  };

  // Group parent categories (parentId === null) and their children
  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Kategori & Sub-Kategori
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelompokkan pos transaksi utama dan rincian sub-kategori untuk pengeluaran & pemasukan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => handleOpenAdd(null)}
              className="flex items-center gap-1.5 shadow-sm shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              Tambah Kategori
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Tabs for Expense vs Income */}
      <motion.div variants={itemVariants}>
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "EXPENSE" | "INCOME")}
          className="w-full space-y-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 p-1">
            <TabsTrigger
              value="EXPENSE"
              className="data-[state=active]:bg-rose-500 data-[state=active]:text-white gap-2 transition-all font-medium text-xs sm:text-sm"
            >
              <ArrowUpRight className="h-4 w-4" />
              Pengeluaran (Expense)
            </TabsTrigger>
            <TabsTrigger
              value="INCOME"
              className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-2 transition-all font-medium text-xs sm:text-sm"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Pemasukan (Income)
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 focus-visible:outline-none">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="h-48 animate-pulse bg-muted/50 rounded-2xl" />
                ))}
              </div>
            ) : parentCategories.length === 0 ? (
              <Card className="border-dashed p-12 text-center rounded-2xl">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                  <Tags className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold">Belum Ada Kategori</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Buat kategori pertama Anda untuk mengelompokkan catatan transaksi.
                </p>
                <Button onClick={() => handleOpenAdd(null)} className="mt-4" size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Tambah Kategori
                </Button>
              </Card>
            ) : (
              <motion.div
                layout
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {parentCategories.map((parent) => {
                    const children = parent.children || [];
                    const totalTx =
                      (parent._count?.transactions || 0) +
                      children.reduce((acc, c: any) => acc + (c._count?.transactions || 0), 0);

                    return (
                      <motion.div
                        layout
                        key={parent.id}
                        variants={itemVariants}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -3, transition: { duration: 0.15 } }}
                        className="h-full"
                      >
                        <Card className="border-border/80 shadow-xs hover:shadow-md transition-all group h-full rounded-2xl overflow-hidden flex flex-col justify-between">
                          <div>
                            {/* Top Color Accent */}
                            <div
                              className="h-1.5 w-full"
                              style={{ backgroundColor: parent.color }}
                            />

                            {/* Parent Header */}
                            <CardHeader className="p-4 pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                                    style={{ backgroundColor: parent.color }}
                                  >
                                    <Tag className="h-5 w-5" />
                                  </div>
                                  <div className="truncate">
                                    <CardTitle className="text-base font-bold truncate">
                                      {parent.name}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {children.length} sub-kategori • {parent._count?.transactions || 0} transaksi
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                    onClick={() => handleEdit(parent)}
                                    title="Edit Kategori Induk"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    onClick={() => setCategoryToDelete(parent)}
                                    title="Hapus Kategori Induk"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>

                            {/* Sub-Categories Section */}
                            <CardContent className="p-4 pt-1 space-y-2">
                              <div className="space-y-1.5 pt-2 border-t border-border/50">
                                {children.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic py-1">
                                    Belum ada sub-kategori.
                                  </p>
                                ) : (
                                  children.map((sub: any) => {
                                    // Find complete category item
                                    const fullSub = categories.find((c) => c.id === sub.id) || sub;

                                    return (
                                      <div
                                        key={sub.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors group/sub text-xs"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                          <div
                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: sub.color || parent.color }}
                                          />
                                          <span className="font-medium text-foreground truncate">
                                            {sub.name}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-60 group-hover/sub:opacity-100 transition-opacity shrink-0 ml-2">
                                          <button
                                            onClick={() => handleEdit(fullSub)}
                                            className="p-1 hover:text-primary transition-colors"
                                            title="Edit Sub-Kategori"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => setCategoryToDelete(fullSub)}
                                            className="p-1 hover:text-destructive transition-colors"
                                            title="Hapus Sub-Kategori"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </CardContent>
                          </div>

                          {/* Add Sub Category Quick Button */}
                          <div className="p-4 pt-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAdd(parent.id)}
                              className="w-full text-xs h-8 gap-1.5 border-dashed hover:border-primary hover:text-primary transition-all"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Tambah Sub-Kategori
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Add / Edit Category Modal */}
      <CategoryModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        categoryToEdit={categoryToEdit}
        defaultType={activeTab}
        defaultParentId={defaultParentId}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive">
              Hapus Kategori
            </DialogTitle>
            <DialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus kategori{" "}
              <span className="font-semibold text-foreground">
                "{categoryToDelete?.name}"
              </span>
              ? {categoryToDelete?.children && categoryToDelete.children.length > 0 && "Sub-kategori yang berada di bawahnya juga akan terhapus. "}
              Transaksi terkait akan tetap tersimpan tanpa kategori.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setCategoryToDelete(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
