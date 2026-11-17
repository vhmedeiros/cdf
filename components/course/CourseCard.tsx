import React from "react";
import Link from "next/link";
import { Clock, Play, Layers } from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { getDeterministicGradient } from "@/lib/course";
import type { Course } from "@/models/course";

interface CourseCardProps {
  course: Course;
  categoryName?: string | null;
  variant?: "default" | "compact";
  showDescription?: boolean;
  showStatus?: boolean;
}

export function CourseCard({
  course,
  categoryName,
  variant = "default",
  showDescription = true,
  showStatus = false,
}: CourseCardProps) {
  const gradient = getDeterministicGradient(course.slug);
  const isCompact = variant === "compact";

  return (
    <Link
      href={`/courses/${course.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-[#2a2a2e] bg-[#131315] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d4af37]/60 hover:shadow-xl hover:shadow-[#d4af37]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0c]",
        isCompact ? "h-56" : "h-full",
      )}
    >
      <div
        className={cn(
          "relative flex flex-col justify-between overflow-hidden bg-gradient-to-br p-5",
          gradient,
          isCompact ? "h-28" : "h-36 sm:h-40",
        )}
      >
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 flex flex-wrap items-start gap-2">
          {categoryName && (
            <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-mono font-medium text-[#d4af37] backdrop-blur-sm">
              {categoryName}
            </span>
          )}
          {showStatus && (
            <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-mono text-[#ece9e2]/80 backdrop-blur-sm">
              {course.status === "published" ? "Publicado" : "Rascunho"}
            </span>
          )}
        </div>

        <h3
          className={cn(
            "relative z-10 line-clamp-2 font-serif font-bold leading-tight text-[#ece9e2] transition group-hover:text-[#f5d76e]",
            isCompact ? "text-base" : "text-xl",
          )}
        >
          {course.title}
        </h3>

        <div className="pointer-events-none absolute inset-0 bg-radial from-[#d4af37]/10 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
        {showDescription && (
          <p className="line-clamp-2 text-xs leading-relaxed text-[#9a978f]">
            {course.description || "Sem descrição informada."}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-[#1b1b1e] pt-2 text-xs">
          <div className="flex min-w-0 items-center gap-3 text-[#9a978f]">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="font-mono tabular-nums">{course.materials_count}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">
                {formatDuration(course.total_duration_seconds)}
              </span>
            </span>
          </div>

          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#d4af37] transition group-hover:translate-x-0.5">
            Acessar <Play className="h-3 w-3 fill-current" />
          </span>
        </div>
      </div>
    </Link>
  );
}
