import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, RotateCw } from "lucide-react";
import { ReviewItem } from "@/components/reviews/ReviewItem";
import type { ReviewWithDetails } from "@/models/review";

interface DueReviewsProps {
  reviews: ReviewWithDetails[];
  pendingCount?: number;
  onReviewCompleted?: (reviewId: string) => void;
}

export default function DueReviews({ reviews, pendingCount, onReviewCompleted }: DueReviewsProps) {
  const total = pendingCount ?? reviews.length;

  return (
    <div className="space-y-3 rounded-2xl border border-[#2a2a2e] bg-[#131315] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCw className="h-5 w-5 text-[#d4af37]" />
          <h3 className="text-balance font-serif text-base font-bold text-[#ece9e2]">
            Revisões de Hoje
          </h3>
        </div>
        <span className="rounded-full border border-[#2a2a2e] bg-[#1b1b1e] px-2.5 py-0.5 text-xs text-[#9a978f]">
          {total} {total === 1 ? "aula" : "aulas"}
        </span>
      </div>

      {reviews.length === 0 ? (
        <div className="space-y-2 py-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#2a2a2e] bg-[#1b1b1e] text-[#6fbf73]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-[#ece9e2]">
            Você não tem revisões pendentes para hoje!
          </p>
          <p className="mx-auto max-w-sm text-xs text-[#9a978f]">
            Ao concluir novas aulas, o sistema agendará suas revisões automáticas em 1, 7 e 30 dias.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-[#1b1b1e]">
            {reviews.map((review) => (
              <ReviewItem key={review.id} review={review} onCompleted={onReviewCompleted} />
            ))}
          </div>

          {total > reviews.length && (
            <Link
              href="/reviews"
              className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-[#d4af37] transition hover:underline"
            >
              Ver todas as {total} revisões
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </>
      )}
    </div>
  );
}
