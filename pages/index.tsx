import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Search, ArrowRight, Shield } from "lucide-react";
import HeroResume from "@/components/home/HeroResume";
import StudyStreak from "@/components/home/StudyStreak";
import DueReviews from "@/components/home/DueReviews";
import StudyHeatmap from "@/components/home/StudyHeatmap";
import PomodoroTimer from "@/components/player/PomodoroTimer";
import UserMenu from "@/components/ui/UserMenu";
import { CourseCard } from "@/components/course/CourseCard";
import { CategoryChips } from "@/components/course/CategoryChips";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { UserStats } from "@/models/stats";
import type { ReviewWithDetails } from "@/models/review";
import type { Category } from "@/models/category";
import type { Course } from "@/models/course";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [courseSearch, setCourseSearch] = useState("");

  const { data: user, error: userError } = useSWR<{
    id: string;
    email: string;
    display_name: string;
    features: string[];
  }>("/api/v1/user");

  const isAdmin = Boolean(
    user?.features &&
      (user.features.includes("create:course") ||
        user.features.includes("create:invite") ||
        user.features.includes("read:course:all")),
  );

  const { data: stats, mutate: mutateStats } = useSWR<UserStats>(user ? "/api/v1/me/stats" : null);

  const { data: reviewsData, mutate: mutateReviews } = useSWR<{
    pending_count: number;
    reviews: ReviewWithDetails[];
  }>(user ? "/api/v1/me/reviews?limit=3" : null);

  const { data: courses } = useSWR<Course[]>("/api/v1/courses?limit=6");
  const { data: categories } = useSWR<Category[]>("/api/v1/categories");

  const categoryNames = new Map((categories ?? []).map((item) => [item.id, item.name]));
  const categoryOptions = categories?.map(({ id, slug, name }) => ({ id, slug, name })) ?? [];

  function openCommandPalette() {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  }

  function handleReviewCompleted() {
    mutateReviews();
    mutateStats();
  }

  return (
    <>
      <Head>
        <title>Início — Aula</title>
        <meta
          name="description"
          content="Ambiente de estudos diário de alto rendimento com repetição espaçada, player de alta performance e anotações."
        />
      </Head>

      <div className="min-h-[100dvh] bg-[#0b0b0c] pt-[env(safe-area-inset-top)] text-[#ece9e2]">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#2a2a2e] bg-[#131315]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#f5d76e] flex items-center justify-center font-bold text-black font-serif shadow-sm group-hover:scale-105 transition">
                A
              </span>
              <span className="font-serif font-bold text-lg text-[#ece9e2] tracking-wide">
                Aula
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1 text-xs">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-[#d4af37] bg-[#1b1b1e] font-medium"
              >
                Início
              </Link>
              <Link
                href="/courses"
                className="px-3 py-1.5 rounded-lg text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e] transition"
              >
                Cursos
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/courses"
                  className="px-3 py-1.5 rounded-lg text-[#d4af37] hover:bg-[#d4af37]/10 transition flex items-center gap-1 font-medium border border-[#d4af37]/30"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão Admin destacado */}
            {isAdmin && (
              <Link
                href="/admin/courses"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37]/20 transition text-xs font-semibold shadow-sm"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Painel Admin</span>
              </Link>
            )}

            {/* Botão de Busca / Command Palette */}
            <button
              onClick={openCommandPalette}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] text-xs text-[#9a978f] hover:text-[#ece9e2] hover:border-[#d4af37] transition shadow-inner"
              title="Buscar (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Buscar cursos, aulas, notas...</span>
              <span className="md:hidden">Buscar...</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#9a978f] bg-[#2a2a2e] rounded ml-1">
                Ctrl+K
              </kbd>
            </button>

            {/* Pomodoro Timer */}
            <div className="hidden sm:block">
              <PomodoroTimer />
            </div>

            {/* Menu do Usuário com Login, Logout e Alterar Senha */}
            <div className="pl-2 border-l border-[#2a2a2e]">
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-8 space-y-8">
          {/* 1. Hero: Continuar de onde parou */}
          <HeroResume lastStudied={stats?.last_studied || null} />

          {/* 2. Streak e Metas */}
          <StudyStreak stats={stats || null} />

          {/* 3. Grid: Revisões Espaçadas & Mapa de Calor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DueReviews
              reviews={reviewsData?.reviews || []}
              pendingCount={reviewsData?.pending_count}
              onReviewCompleted={handleReviewCompleted}
            />
            <StudyHeatmap activity={stats?.heatmap || []} />
          </div>

          {/* 4. Cursos */}
          <section className="space-y-5">
            <SectionHeader
              title="Meus Cursos em Andamento"
              description="Acesse suas aulas estruturadas e materiais de apoio."
              actionHref="/courses"
              actionLabel="Ver todos"
            />

            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                const term = courseSearch.trim();
                router.push(term ? `/courses?q=${encodeURIComponent(term)}` : "/courses");
              }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <label htmlFor="home-course-search" className="sr-only">
                Buscar cursos
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a978f]" />
                <input
                  id="home-course-search"
                  type="search"
                  enterKeyHint="search"
                  value={courseSearch}
                  onChange={(event) => setCourseSearch(event.target.value)}
                  placeholder="Buscar cursos por título ou descrição..."
                  className="min-h-11 w-full rounded-xl border border-[#2a2a2e] bg-[#1b1b1e] pl-10 pr-3 text-sm text-[#ece9e2] placeholder-[#9a978f] outline-none transition focus:border-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37]/40"
                />
              </div>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-[#d4af37] px-5 text-xs font-semibold text-black transition hover:bg-[#f5d76e]"
              >
                Buscar
              </button>
            </form>

            {categoryOptions.length > 0 && (
              <CategoryChips
                categories={categoryOptions}
                value={null}
                allLabel="Todas as categorias"
                onChange={(slug) => {
                  router.push(slug ? `/courses?category=${slug}` : "/courses");
                }}
              />
            )}

            {courses && courses.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    variant="compact"
                    showDescription={false}
                    showStatus
                    categoryName={course.category_id ? categoryNames.get(course.category_id) : null}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-[#2a2a2e] bg-[#131315] p-8 text-center">
                <p className="text-xs text-[#9a978f]">Nenhum curso matriculado no momento.</p>
                <Link
                  href="/courses"
                  className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-[#d4af37] transition hover:underline"
                >
                  Explorar catálogo de cursos
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
