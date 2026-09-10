"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatAmountInput } from "@/lib/format";

interface AmountInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange"
  > {
  /** The formatted display string (see lib/format). */
  value: string;
  /** Called with the re-formatted display string on every keystroke. */
  onValueChange: (formatted: string) => void;
  /** Prefix symbol rendered inside the field. */
  prefix?: string;
  className?: string;
}

/**
 * Money input with an inline "Rp" prefix and Indonesian thousand-separator
 * formatting while typing (e.g. `1.250.000`). The value state is the
 * formatted string; parse with `parseAmountInput` before submitting.
 */
export function AmountInput({
  value,
  onValueChange,
  prefix = "Rp",
  className,
  ...props
}: AmountInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
        {prefix}
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={value}
        onChange={(e) => onValueChange(formatAmountInput(e.target.value, value))}
        className={cn("pl-10 font-bold", className)}
        {...props}
      />
    </div>
  );
}