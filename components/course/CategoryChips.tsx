import React from "react";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  id: string;
  slug: string;
  name: string;
}

interface CategoryChipsProps {
  categories: CategoryOption[];
  value: string | null;
  onChange: (slug: string | null) => void;
  allLabel?: string;
  className?: string;
}

export function CategoryChips({
  categories,
  value,
  onChange,
  allLabel = "Todos",
  className,
}: CategoryChipsProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="Filtrar por categoria"
    >
      <button
        type="button"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
        className={cn(
          "min-h-9 rounded-full border px-3.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0c]",
          value === null
            ? "border-[#d4af37] bg-[#d4af37]/15 text-[#d4af37]"
            : "border-[#2a2a2e] bg-[#131315] text-[#9a978f] hover:border-[#d4af37]/50 hover:text-[#ece9e2]",
        )}
      >
        {allLabel}
      </button>

      {categories.map((category) => {
        const isActive = value === category.slug;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(category.slug)}
            className={cn(
              "min-h-9 rounded-full border px-3.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0c]",
              isActive
                ? "border-[#d4af37] bg-[#d4af37]/15 text-[#d4af37]"
                : "border-[#2a2a2e] bg-[#131315] text-[#9a978f] hover:border-[#d4af37]/50 hover:text-[#ece9e2]",
            )}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
