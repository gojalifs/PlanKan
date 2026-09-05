"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/lib/hooks/use-categories";

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Render a leading "Semua Kategori" option with value "ALL" (filter bars). */
  includeAllOption?: boolean;
  /** Prefix on parent options, e.g. "[Induk] " (budget modal). */
  parentPrefix?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

/**
 * Hierarchical category picker (bold parents + indented children).
 * Shared by the transaction form, the transactions filter bar and the
 * budget modal; reused by the receipt multi-transaction dialog.
 */
export function CategorySelect({
  categories,
  value,
  onValueChange,
  placeholder = "Pilih Kategori",
  includeAllOption = false,
  parentPrefix = "",
  triggerClassName,
  contentClassName,
}: CategorySelectProps) {
  const parents = categories.filter((c) => !c.parentId);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {includeAllOption && (
          <SelectItem value="ALL" className="text-xs py-1.5">
            Semua Kategori
          </SelectItem>
        )}
        {parents.map((parent) => {
          const children = categories.filter((c) => c.parentId === parent.id);
          return (
            <React.Fragment key={parent.id}>
              <SelectItem value={parent.id} className="font-semibold text-xs py-1.5">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: parent.color }}
                  />
                  {parentPrefix}
                  {parent.name}
                </span>
              </SelectItem>
              {children.map((sub) => (
                <SelectItem
                  key={sub.id}
                  value={sub.id}
                  className="text-xs pl-7 py-1 text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color || parent.color }}
                    />
                    ↳ {sub.name}
                  </span>
                </SelectItem>
              ))}
            </React.Fragment>
          );
        })}
      </SelectContent>
    </Select>
  );
}