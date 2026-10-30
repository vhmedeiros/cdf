import React from "react";
import Head from "next/head";
import Link from "next/link";
import useSWR from "swr";
import {
  Search,
  BookOpen,
  GraduationCap,
  Sparkles,
  ArrowRight,
  LogOut,
  User,
  Clock,
  Play,
  Layers,
  Shield,
} from "lucide-react";
import HeroResume from "@/components/home/HeroResume";
import StudyStreak from "@/components/home/StudyStreak";
import DueReviews from "@/components/home/DueReviews";
import StudyHeatmap from "@/components/home/StudyHeatmap";
import PomodoroTimer from "@/components/player/PomodoroTimer";
import UserMenu from "@/components/ui/UserMenu";
import type { UserStats } from "@/models/stats";
import type { ReviewWithDetails } from "@/models/review";
import type { Course } from "@/models/course";

function getDeterministicGradient(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    "from-[#1b1b1e] via-[#2a2a2e] to-[#0b0b0c]",
    "from-[#24211a] via-[#1b1b1e] to-[#0b0b0c]",
    "from-[#1f1a14] via-[#2a2216] to-[#0b0b0c]",
    "from-[#181d18] via-[#152016] to-[#0b0b0c]",
    "from-[#261f2d] via-[#1d1724] to-[#0b0b0c]",
  ];
  return gradients[Math.abs(hash) % gradients.length];
}

export default function StudentDashboardPage() {
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
  }>(user ? "/api/v1/me/reviews" : null);

  const { data: courses } = useSWR<Course[]>("/api/v1/courses");

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

      <div className="min-h-screen bg-[#0b0b0c] text-[#ece9e2]">
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] text-xs text-[#9a978f] hover:text-[#ece9e2] hover:border-[#d4af37] transition shadow-inner"
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
              onReviewCompleted={handleReviewCompleted}
            />
            <StudyHeatmap activity={stats?.heatmap || []} />
          </div>

          {/* 4. Meus Cursos em Andamento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#ece9e2]">
                  Meus Cursos em Andamento
                </h3>
                <p className="text-xs text-[#9a978f] mt-0.5">
                  Acesse suas aulas estruturadas e materiais de apoio.
                </p>
              </div>
              <Link
                href="/courses"
                className="text-xs text-[#d4af37] hover:underline flex items-center gap-1"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {courses && courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((course) => {
                  const gradient = getDeterministicGradient(course.slug);
                  return (
                    <Link
                      key={course.id}
                      href={`/courses/${course.slug}`}
                      className="group flex flex-col justify-between h-56 rounded-2xl bg-[#131315] border border-[#2a2a2e] hover:border-[#d4af37]/60 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#d4af37]/5 relative"
                    >
                      <div
                        className={`h-28 p-5 bg-gradient-to-br ${gradient} flex flex-col justify-between relative overflow-hidden`}
                      >
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="relative z-10 flex justify-between items-start">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/40 text-[#ece9e2]/80 backdrop-blur-sm border border-white/10">
                            {course.status === "published" ? "Publicado" : "Rascunho"}
                          </span>
                        </div>
                        <h4 className="relative z-10 font-serif font-bold text-base text-[#ece9e2] group-hover:text-[#f5d76e] transition line-clamp-2">
                          {course.title}
                        </h4>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between bg-[#131315]">
                        <div className="flex items-center justify-between text-xs text-[#9a978f]">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
                            {course.materials_count} materiais
                          </span>
                          <span className="flex items-center gap-1 text-[#ece9e2] font-medium group-hover:text-[#d4af37] transition">
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Acessar
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#131315] border border-[#2a2a2e] text-center space-y-2">
                <p className="text-xs text-[#9a978f]">Nenhum curso matriculado no momento.</p>
                <Link
                  href="/courses"
                  className="inline-block text-xs text-[#d4af37] hover:underline"
                >
                  Explorar catálogo de cursos
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
