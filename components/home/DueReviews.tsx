import React, { useState } from "react";
import Link from "next/link";
import { RotateCw, CheckCircle2, Play, Calendar, Sparkles } from "lucide-react";
import type { ReviewWithDetails } from "@/models/review";

interface DueReviewsProps {
  reviews: ReviewWithDetails[];
  onReviewCompleted?: (reviewId: string) => void;
}

export default function DueReviews({ reviews, onReviewCompleted }: DueReviewsProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  async function handleComplete(reviewId: string) {
    setCompletingId(reviewId);
    try {
      const res = await fetch(`/api/v1/me/reviews/${reviewId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        onReviewCompleted?.(reviewId);
      }
    } catch (err) {
      console.error("Erro ao concluir revisão:", err);
    } finally {
      setCompletingId(null);
    }
  }

  const STAGE_LABELS: Record<string, { label: string; desc: string }> = {
    "1d": { label: "1º Dia (D+1)", desc: "Fixação imediata após 24h" },
    "7d": { label: "7º Dia (D+7)", desc: "Consolidação de médio prazo" },
    "30d": { label: "30º Dia (D+30)", desc: "Memória de longo prazo" },
  };

  return (
    <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCw className="w-5 h-5 text-[#d4af37]" />
          <h3 className="font-serif font-bold text-base text-[#ece9e2]">
            Revisões Espaçadas de Hoje
          </h3>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1b1b1e] text-[#9a978f] border border-[#2a2a2e]">
          {reviews.length} {reviews.length === 1 ? "aula" : "aulas"}
        </span>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <div className="w-10 h-10 rounded-full bg-[#1b1b1e] border border-[#2a2a2e] flex items-center justify-center mx-auto text-[#6fbf73]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-[#ece9e2]">
            Você não tem revisões pendentes para hoje!
          </p>
          <p className="text-xs text-[#9a978f] max-w-sm mx-auto">
            Ao concluir novas aulas, o sistema agendará suas revisões automáticas em 1, 7 e 30 dias.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#1b1b1e] space-y-1">
          {reviews.map((rev) => {
            const stageInfo = STAGE_LABELS[rev.stage] || {
              label: rev.stage,
              desc: "Revisão agendada",
            };
            const isCompleting = completingId === rev.id;

            return (
              <div
                key={rev.id}
                className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 font-semibold">
                      {stageInfo.label}
                    </span>
                    <span className="text-xs text-[#9a978f] truncate">{rev.course_title}</span>
                  </div>
                  <h4 className="text-sm font-medium text-[#ece9e2] group-hover:text-[#f5d76e] transition truncate">
                    {rev.material_title}
                  </h4>
                  <p className="text-[11px] text-[#9a978f]">
                    {rev.lesson_title} &bull; {stageInfo.desc}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/courses/${rev.course_slug}?material=${rev.material_id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1b1b1e] border border-[#2a2a2e] text-xs text-[#ece9e2] hover:text-[#d4af37] hover:border-[#d4af37] transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Revisar</span>
                  </Link>

                  <button
                    onClick={() => handleComplete(rev.id)}
                    disabled={isCompleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6fbf73]/10 border border-[#6fbf73]/30 text-xs text-[#6fbf73] hover:bg-[#6fbf73]/20 transition disabled:opacity-50"
                    title="Marcar como revisada"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isCompleting ? "Salvando..." : "Concluir"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
