import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCw } from "lucide-react";
import UserMenu from "@/components/ui/UserMenu";
import { ReviewItem } from "@/components/reviews/ReviewItem";
import type { ReviewWithDetails } from "@/models/review";

const PAGE_SIZE = 8;

export default function ReviewsPage() {
  const { data, error, isLoading, mutate } = useSWR<{
    pending_count: number;
    reviews: ReviewWithDetails[];
  }>("/api/v1/me/reviews");

  const [page, setPage] = useState(1);

  const reviews = useMemo(() => data?.reviews ?? [], [data]);
  const totalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE));

  const pageReviews = useMemo(
    () => reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [reviews, page],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
      <Head>
        <title>Revisões — Aula</title>
      </Head>

      <div className="min-h-[100dvh] bg-[#0b0b0c] pt-[env(safe-area-inset-top)] text-[#ece9e2]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#2a2a2e] bg-[#131315]/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#2a2a2e] bg-[#1b1b1e] text-[#9a978f] transition hover:border-[#d4af37] hover:text-[#ece9e2]"
              title="Voltar para o início"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate font-serif text-sm font-bold text-[#ece9e2] sm:text-base">
                Revisões Espaçadas
              </h1>
              <p className="truncate text-xs text-[#9a978f]">Revise as aulas agendadas para hoje</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto max-w-4xl space-y-5 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#2a2a2e] bg-[#131315] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-2">
              <RotateCw className="h-5 w-5 text-[#d4af37]" />
              <div>
                <h2 className="text-balance font-serif text-lg font-bold text-[#ece9e2]">
                  Revisões de Hoje
                </h2>
                <p className="text-xs text-[#9a978f]">
                  {reviews.length} {reviews.length === 1 ? "aula agendada" : "aulas agendadas"}
                </p>
              </div>
            </div>

            {reviews.length > PAGE_SIZE && (
              <span className="text-xs font-mono text-[#9a978f]">
                Página {page} de {totalPages}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3 rounded-2xl border border-[#2a2a2e] bg-[#131315] p-4 sm:p-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-xl bg-[#1b1b1e]" />
              ))}
            </div>
          ) : error ? (
            <div className="space-y-3 rounded-2xl border border-[#2a2a2e] bg-[#131315] p-8 text-center">
              <p className="text-xs text-[#9a978f]">
                {error.status === 401
                  ? "Você precisa entrar com sua conta para ver suas revisões."
                  : "Não foi possível carregar as revisões. Tente novamente."}
              </p>
              {error.status === 401 && (
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center rounded-lg bg-[#d4af37] px-4 text-xs font-semibold text-black transition hover:bg-[#f5d76e]"
                >
                  Fazer Login
                </Link>
              )}
            </div>
          ) : reviews.length === 0 ? (
            <div className="space-y-3 rounded-2xl border border-[#2a2a2e] bg-[#131315] p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#2a2a2e] bg-[#1b1b1e] text-[#6fbf73]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-balance font-semibold text-base text-[#ece9e2]">
                Nenhuma revisão pendente
              </h3>
              <p className="mx-auto max-w-sm text-xs text-[#9a978f]">
                Conclua novas aulas para o sistema agendar revisões automáticas em 1, 7 e 30 dias.
              </p>
              <Link
                href="/courses"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#d4af37] px-4 text-xs font-semibold text-black transition hover:bg-[#f5d76e]"
              >
                Ver meus cursos
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#1b1b1e] rounded-2xl border border-[#2a2a2e] bg-[#131315] p-4 sm:p-5">
                {pageReviews.map((review) => (
                  <ReviewItem
                    key={review.id}
                    review={review}
                    onCompleted={() => {
                      mutate();
                    }}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#2a2a2e] bg-[#1b1b1e] px-4 text-xs font-semibold text-[#ece9e2] transition hover:border-[#d4af37] hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Anterior
                  </button>

                  <span className="font-mono text-xs text-[#9a978f]" aria-live="polite">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#2a2a2e] bg-[#1b1b1e] px-4 text-xs font-semibold text-[#ece9e2] transition hover:border-[#d4af37] hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
