import React from "react";
import Head from "next/head";
import Link from "next/link";
import useSWR from "swr";
import { formatDuration } from "@/lib/utils";
import { Play, BookOpen, Clock, FileText, Shield, Plus } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import UserMenu from "@/components/ui/UserMenu";
import type { Course } from "@/models/course";

// Deterministic gradient generator based on slug string
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
  const idx = Math.abs(hash) % gradients.length;
  return gradients[idx];
}

export default function CoursesListPage() {
  const { data: courses, error, isLoading } = useSWR<Course[]>("/api/v1/courses");
  const { isAdmin } = useUser();

  return (
    <>
      <Head>
        <title>Meus Cursos — Aula</title>
      </Head>

      <div className="min-h-screen bg-[#0b0b0c] text-[#ece9e2]">
        {/* Header */}
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
                className="px-3 py-1.5 rounded-lg text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e] transition"
              >
                Início
              </Link>
              <Link
                href="/courses"
                className="px-3 py-1.5 rounded-lg text-[#d4af37] bg-[#1b1b1e] font-medium"
              >
                Cursos
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin/courses"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37]/20 transition text-xs font-semibold shadow-sm"
              >
                <Shield className="w-4 h-4" />
                <span>Painel Admin</span>
              </Link>
            )}
            <UserMenu />
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#ece9e2]">
              Meus Cursos
            </h1>
            <p className="text-sm text-[#9a978f] mt-1">
              Continue seus estudos exatamente de onde parou.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-2xl bg-[#131315] border border-[#2a2a2e] animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 rounded-2xl bg-[#131315] border border-[#2a2a2e] text-center space-y-3">
              <p className="text-xs text-[#9a978f]">
                {error.status === 401
                  ? "Você precisa entrar com sua conta para ver seus cursos."
                  : "Não foi possível carregar os cursos. Por favor, tente novamente."}
              </p>
              {error.status === 401 && (
                <Link
                  href="/login"
                  className="inline-block px-4 py-2 bg-[#d4af37] text-black font-semibold text-xs rounded-lg hover:bg-[#f5d76e] transition"
                >
                  Fazer Login
                </Link>
              )}
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((c) => {
                const gradient = getDeterministicGradient(c.slug);

                return (
                  <Link
                    key={c.id}
                    href={`/courses/${c.slug}`}
                    className="group flex flex-col rounded-2xl bg-[#131315] border border-[#2a2a2e] overflow-hidden hover:border-[#d4af37]/60 hover:shadow-xl hover:shadow-[#d4af37]/5 transition-all duration-300"
                  >
                    {/* Course Cover Card */}
                    <div
                      className={`h-40 bg-gradient-to-br ${gradient} p-6 flex flex-col justify-between relative overflow-hidden border-b border-[#2a2a2e]`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-1 rounded-full bg-black/50 border border-white/10 text-[10px] font-mono font-medium text-[#d4af37] backdrop-blur-sm">
                          {c.materials_count} materiais
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-xl text-[#ece9e2] leading-tight group-hover:text-[#d4af37] transition">
                        {c.title}
                      </h3>

                      {/* Golden subtle hover glow */}
                      <div className="absolute inset-0 bg-radial from-[#d4af37]/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                    </div>

                    {/* Course Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <p className="text-xs text-[#9a978f] line-clamp-2 leading-relaxed">
                        {c.description || "Sem descrição informada."}
                      </p>

                      <div className="pt-2 border-t border-[#1b1b1e] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-[#9a978f]">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-mono tabular-nums">
                            {formatDuration(c.total_duration_seconds)}
                          </span>
                        </div>

                        <span className="flex items-center gap-1 text-[#d4af37] font-semibold text-xs group-hover:translate-x-0.5 transition">
                          Acessar <Play className="w-3 h-3 fill-current ml-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-[#131315] border border-[#2a2a2e] text-center space-y-4">
              <BookOpen className="w-10 h-10 text-[#d4af37] mx-auto opacity-80" />
              <h3 className="font-semibold text-base text-[#ece9e2]">
                {isAdmin ? "Nenhum curso cadastrado ainda" : "Nenhum curso matriculado"}
              </h3>
              <p className="text-xs text-[#9a978f] max-w-sm mx-auto">
                {isAdmin
                  ? "Você está conectado como Administrador. Cadastre seu primeiro curso a partir de uma pasta do Google Drive."
                  : "Você ainda não possui matrículas ativas. Entre em contato com seu administrador."}
              </p>
              {isAdmin && (
                <div className="pt-2">
                  <Link
                    href="/admin/courses/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#f5d76e] text-black font-semibold text-xs rounded-xl hover:opacity-95 transition shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Primeiro Curso</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
