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
import { Loader2 } from "lucide-react";

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryToEdit?: Category | null;
  defaultType?: "EXPENSE" | "INCOME";
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
}: CategoryModalProps) {
  const { createCategory, updateCategory, isCreating, isUpdating } = useCategories();

  const [name, setName] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">(defaultType);
  const [color, setColor] = useState<string>("#f43f5e");

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.type);
      setColor(categoryToEdit.color);
    } else {
      setName("");
      setType(defaultType);
      setColor(defaultType === "EXPENSE" ? "#f43f5e" : "#10b981");
    }
  }, [categoryToEdit, open, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (categoryToEdit) {
        await updateCategory({
          id: categoryToEdit.id,
          name: name.trim(),
          type,
          color,
        });
      } else {
        await createCategory({
          name: name.trim(),
          type,
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
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {categoryToEdit ? "Edit Kategori" : "Tambah Kategori Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Nama Kategori</Label>
            <Input
              id="category-name"
              placeholder="Contoh: Kopi & Nongkrong, Langganan Streaming"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tipe Transaksi</Label>
            <Select value={type} onValueChange={(val) => setType(val as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE">Pengeluaran (Expense)</SelectItem>
                <SelectItem value="INCOME">Pemasukan (Income)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Warna Badge</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${
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
