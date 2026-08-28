"use client";

import React, { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useCategories, Category } from "@/lib/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CategoriesPage() {
  const { data: session, isPending: isAuthPending } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const { categories, isLoading, deleteCategory, isDeleting } = useCategories(activeTab);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
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
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setCategoryToEdit(null);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    await deleteCategory(categoryToDelete.id);
    setCategoryToDelete(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Kategori Transaksi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelompokkan pos pengeluaran dan sumber pemasukan harian Anda.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>

      {/* Tabs for Expense vs Income */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "EXPENSE" | "INCOME")}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger
            value="EXPENSE"
            className="data-[state=active]:bg-rose-500 data-[state=active]:text-white gap-2"
          >
            <ArrowUpRight className="h-4 w-4" />
            Pengeluaran (Expense)
          </TabsTrigger>
          <TabsTrigger
            value="INCOME"
            className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-2"
          >
            <ArrowDownLeft className="h-4 w-4" />
            Pemasukan (Income)
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-24 animate-pulse bg-muted/50" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <Card className="border-dashed p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Tags className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold">Belum Ada Kategori</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Buat kategori pertama Anda untuk mengelompokkan catatan transaksi.
              </p>
              <Button onClick={handleOpenAdd} className="mt-4" size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah Kategori
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  className="border-border shadow-2xs hover:shadow-sm transition-shadow group"
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Tag className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-snug">{cat.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cat._count?.transactions || 0} transaksi
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(cat)}
                        title="Edit Kategori"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setCategoryToDelete(cat)}
                        title="Hapus Kategori"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add / Edit Category Modal */}
      <CategoryModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        categoryToEdit={categoryToEdit}
        defaultType={activeTab}
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
              ? Transaksi yang menggunakan kategori ini akan tetap tersimpan tanpa kategori.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
    </div>
  );
}
