"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, Category } from "@/lib/hooks/use-categories";
import { Loader2, FolderTree, Tag } from "lucide-react";

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryToEdit?: Category | null;
  defaultType?: "EXPENSE" | "INCOME";
  defaultParentId?: string | null;
}

const CATEGORY_COLORS = [
  "#f43f5e", // rose
  "#e11d48", // crimson
  "#ea580c", // orange
  "#f59e0b", // amber
  "#10b981", // emerald
  "#0d9488", // teal
  "#0284c7", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#64748b", // slate
];

export function CategoryModal({
  open,
  onOpenChange,
  categoryToEdit,
  defaultType = "EXPENSE",
  defaultParentId = null,
}: CategoryModalProps) {
  const { categories, createCategory, updateCategory, isCreating, isUpdating } = useCategories(undefined, true);

  const [name, setName] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">(defaultType);
  const [isSubCategory, setIsSubCategory] = useState<boolean>(Boolean(defaultParentId));
  const [parentId, setParentId] = useState<string>(defaultParentId || "NONE");
  const [color, setColor] = useState<string>("#f43f5e");

  // Filter available parent categories for this type (exclude self if editing)
  const availableParents = categories.filter(
    (c) => c.type === type && (!categoryToEdit || c.id !== categoryToEdit.id)
  );

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.type);
      setColor(categoryToEdit.color);
      if (categoryToEdit.parentId) {
        setIsSubCategory(true);
        setParentId(categoryToEdit.parentId);
      } else {
        setIsSubCategory(false);
        setParentId("NONE");
      }
    } else {
      setName("");
      setType(defaultType);
      setColor(defaultType === "EXPENSE" ? "#f43f5e" : "#10b981");
      if (defaultParentId) {
        setIsSubCategory(true);
        setParentId(defaultParentId);
      } else {
        setIsSubCategory(false);
        setParentId("NONE");
      }
    }
  }, [categoryToEdit, open, defaultType, defaultParentId]);

  // When selecting a parent, match color if not manually changed
  const handleParentSelect = (val: string) => {
    setParentId(val);
    if (val !== "NONE") {
      const parent = availableParents.find((p) => p.id === val);
      if (parent) {
        setColor(parent.color);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const actualParentId = isSubCategory && parentId !== "NONE" ? parentId : null;

    try {
      if (categoryToEdit) {
        await updateCategory({
          id: categoryToEdit.id,
          name: name.trim(),
          type,
          parentId: actualParentId,
          color,
        });
      } else {
        await createCategory({
          name: name.trim(),
          type,
          parentId: actualParentId,
          color,
        });
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderTree className="h-4 w-4" />
            </div>
            <DialogTitle className="text-xl font-bold">
              {categoryToEdit
                ? categoryToEdit.parentId
                  ? "Edit Sub-Kategori"
                  : "Edit Kategori Utama"
                : isSubCategory
                ? "Tambah Sub-Kategori"
                : "Tambah Kategori Baru"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Transaction Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tipe Transaksi</Label>
            <Select
              value={type}
              onValueChange={(val) => {
                setType(val as any);
                setParentId("NONE");
              }}
              disabled={Boolean(categoryToEdit)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Pilih tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE">Pengeluaran (Expense)</SelectItem>
                <SelectItem value="INCOME">Pemasukan (Income)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sub-Category Toggle */}
          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="is-sub-toggle" className="text-xs font-semibold cursor-pointer">
                Jadikan sebagai Sub-Kategori
              </Label>
              <input
                type="checkbox"
                id="is-sub-toggle"
                checked={isSubCategory}
                onChange={(e) => {
                  setIsSubCategory(e.target.checked);
                  if (!e.target.checked) setParentId("NONE");
                  else if (availableParents.length > 0 && parentId === "NONE") {
                    setParentId(availableParents[0].id);
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>

            {isSubCategory && (
              <div className="space-y-1.5 pt-1.5 border-t border-border/60">
                <Label className="text-xs text-muted-foreground">Pilih Kategori Induk (Parent)</Label>
                {availableParents.length === 0 ? (
                  <p className="text-xs text-rose-500">
                    Belum ada kategori utama. Buat kategori utama terlebih dahulu.
                  </p>
                ) : (
                  <Select value={parentId} onValueChange={handleParentSelect}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Pilih Kategori Induk" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableParents.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            {p.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="category-name" className="text-xs">
              {isSubCategory ? "Nama Sub-Kategori" : "Nama Kategori Utama"}
            </Label>
            <Input
              id="category-name"
              placeholder={
                isSubCategory
                  ? "Contoh: Kopi & Nongkrong, Bensin, Restoran"
                  : "Contoh: Makanan & Minuman, Transportasi, Belanja"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="h-9"
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs">Warna Badge</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    color === c ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : categoryToEdit ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Kategori"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
