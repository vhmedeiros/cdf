import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}

export function SectionHeader({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-balance font-serif text-xl font-bold text-[#ece9e2] sm:text-2xl">
          {title}
        </h2>
        {description && <p className="mt-1 text-xs text-[#9a978f] sm:text-sm">{description}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {children}
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-[#d4af37] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0c]"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
