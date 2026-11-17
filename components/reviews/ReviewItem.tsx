import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Play } from "lucide-react";
import type { ReviewWithDetails } from "@/models/review";

export const REVIEW_STAGE_LABELS: Record<string, { label: string; desc: string }> = {
  "1d": { label: "1º Dia (D+1)", desc: "Fixação imediata após 24h" },
  "7d": { label: "7º Dia (D+7)", desc: "Consolidação de médio prazo" },
  "30d": { label: "30º Dia (D+30)", desc: "Memória de longo prazo" },
};

interface ReviewItemProps {
  review: ReviewWithDetails;
  onCompleted?: (reviewId: string) => void;
}

export function ReviewItem({ review, onCompleted }: ReviewItemProps) {
  const [completing, setCompleting] = useState(false);
  const stageInfo = REVIEW_STAGE_LABELS[review.stage] || {
    label: review.stage,
    desc: "Revisão agendada",
  };

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/v1/me/reviews/${review.id}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        onCompleted?.(review.id);
      }
    } catch {
      // Mantém o item na lista para nova tentativa.
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="group flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded border border-[#d4af37]/20 bg-[#d4af37]/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#d4af37]">
            {stageInfo.label}
          </span>
          <span className="truncate text-xs text-[#9a978f]">{review.course_title}</span>
        </div>
        <h4 className="truncate text-sm font-medium text-[#ece9e2] transition group-hover:text-[#f5d76e]">
          {review.material_title}
        </h4>
        <p className="truncate text-[11px] text-[#9a978f]">
          {review.lesson_title} &bull; {stageInfo.desc}
        </p>
      </div>

      <div className="flex w-full items-center gap-2 pt-1 sm:w-auto sm:pt-0">
        <Link
          href={`/courses/${review.course_slug}?material=${review.material_id}`}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#2a2a2e] bg-[#1b1b1e] px-3 text-xs text-[#ece9e2] transition hover:border-[#d4af37] hover:text-[#d4af37] sm:min-h-9 sm:flex-initial"
        >
          <Play className="h-3.5 w-3.5" />
          <span>Revisar</span>
        </Link>

        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#6fbf73]/30 bg-[#6fbf73]/10 px-3 text-xs text-[#6fbf73] transition hover:bg-[#6fbf73]/20 disabled:opacity-50 sm:min-h-9 sm:flex-initial"
          title="Marcar como revisada"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{completing ? "Salvando..." : "Concluir"}</span>
        </button>
      </div>
    </div>
  );
}
