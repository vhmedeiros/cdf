import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import useSWR from "swr";
import { BookOpen, Loader2, Plus, Search, Shield, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import UserMenu from "@/components/ui/UserMenu";
import { CourseCard } from "@/components/course/CourseCard";
import { CategoryChips } from "@/components/course/CategoryChips";
import type { Category } from "@/models/category";
import type { Course } from "@/models/course";

const PAGE_SIZE = 12;

export default function CoursesListPage() {
  const router = useRouter();
  const { isAdmin } = useUser();

  const initialQuery = typeof router.query.q === "string" ? router.query.q : "";
  const initialCategory =
    typeof router.query.category === "string" && router.query.category
      ? router.query.category
      : null;

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [extraCourses, setExtraCourses] = useState<Course[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const hydratedFromUrl = useRef(false);

  const { data: categories } = useSWR<Category[]>("/api/v1/categories");

  useEffect(() => {
    if (!router.isReady || hydratedFromUrl.current) return;

    const q = typeof router.query.q === "string" ? router.query.q : "";
    const c =
      typeof router.query.category === "string" && router.query.category
        ? router.query.category
        : null;

    hydratedFromUrl.current = true;
    setSearchTerm(q);
    setDebouncedQuery(q);
    setCategory(c);
  }, [router.isReady, router.query.q, router.query.category]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchTerm.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    setExtraCourses([]);
    setHasMore(true);
  }, [debouncedQuery, category]);

  useEffect(() => {
    if (!router.isReady || !hydratedFromUrl.current) return;

    const nextQuery: Record<string, string> = {};
    if (debouncedQuery) nextQuery.q = debouncedQuery;
    if (category) nextQuery.category = category;

    router.replace({ pathname: "/courses", query: nextQuery }, undefined, { shallow: true });
  }, [router, router.isReady, debouncedQuery, category]);

  const coursesKey = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    params.set("limit", String(PAGE_SIZE));
    return `/api/v1/courses?${params.toString()}`;
  }, [debouncedQuery, category]);

  const { data: firstPage, error, isLoading, isValidating } = useSWR<Course[]>(coursesKey);

  const courses = useMemo(() => [...(firstPage ?? []), ...extraCourses], [firstPage, extraCourses]);

  const categoryNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of categories ?? []) {
      map.set(item.id, item.name);
    }
    return map;
  }, [categories]);

  const categoryOptions = categories?.map(({ id, slug, name }) => ({ id, slug, name })) ?? [];

  const hasFilters = Boolean(debouncedQuery || category);
  const canLoadMore = Boolean(firstPage && firstPage.length === PAGE_SIZE && hasMore);

  async function loadMoreCourses() {
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (category) params.set("category", category);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(courses.length));

      const res = await fetch(`/api/v1/courses?${params.toString()}`);
      if (!res.ok) throw new Error("load failed");

      const data: Course[] = await res.json();
      setExtraCourses((prev) => [...prev, ...data]);
      if (data.length < PAGE_SIZE) setHasMore(false);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setDebouncedQuery("");
    setCategory(null);
  }

  return (
    <>
      <Head>
        <title>Meus Cursos — Aula</title>
      </Head>

      <div className="min-h-[100dvh] bg-[#0b0b0c] pt-[env(safe-area-inset-top)] text-[#ece9e2]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#2a2a2e] bg-[#131315]/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="group flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#d4af37] to-[#f5d76e] font-serif font-bold text-black shadow-sm transition group-hover:scale-105">
                A
              </span>
              <span className="font-serif text-lg font-bold tracking-wide text-[#ece9e2]">
                Aula
              </span>
            </Link>

            <nav className="hidden items-center gap-1 text-xs sm:flex">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-[#9a978f] transition hover:bg-[#1b1b1e] hover:text-[#ece9e2]"
              >
                Início
              </Link>
              <Link
                href="/courses"
                className="rounded-lg bg-[#1b1b1e] px-3 py-1.5 font-medium text-[#d4af37]"
              >
                Cursos
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin/courses"
                className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-semibold text-[#d4af37] shadow-sm transition hover:bg-[#d4af37]/20"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Painel Admin</span>
              </Link>
            )}
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
          <div className="space-y-2">
            <h1 className="text-balance font-serif text-2xl font-bold text-[#ece9e2] sm:text-3xl">
              Meus Cursos
            </h1>
            <p className="text-sm text-[#9a978f]">
              Busque, filtre por categoria e continue de onde parou.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-[#2a2a2e] bg-[#131315] p-4 sm:p-5">
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                setDebouncedQuery(searchTerm.trim());
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <label htmlFor="course-search" className="sr-only">
                Buscar cursos
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a978f]" />
                <input
                  id="course-search"
                  type="search"
                  enterKeyHint="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por título ou descrição..."
                  className="min-h-11 w-full rounded-xl border border-[#2a2a2e] bg-[#1b1b1e] pl-10 pr-10 text-sm text-[#ece9e2] placeholder-[#9a978f] outline-none transition focus:border-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37]/40"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#9a978f] transition hover:bg-[#2a2a2e] hover:text-[#ece9e2]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-11 rounded-xl border border-[#2a2a2e] bg-[#1b1b1e] px-4 text-xs font-medium text-[#9a978f] transition hover:border-[#d4af37]/50 hover:text-[#ece9e2]"
                >
                  Limpar filtros
                </button>
              )}
            </form>

            {categoryOptions.length > 0 && (
              <CategoryChips
                categories={categoryOptions}
                value={category}
                onChange={setCategory}
                allLabel="Todos"
              />
            )}
          </div>

          <div className="flex items-center justify-between" aria-live="polite">
            <p className="text-xs text-[#9a978f]">
              {isLoading
                ? "Carregando cursos..."
                : `${courses?.length ?? 0} curso${(courses?.length ?? 0) === 1 ? "" : "s"} encontrado${(courses?.length ?? 0) === 1 ? "" : "s"}`}
            </p>
            {isValidating && !isLoading && (
              <span className="flex items-center gap-1.5 text-xs text-[#9a978f]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-2xl border border-[#2a2a2e] bg-[#131315]"
                />
              ))}
            </div>
          ) : error ? (
            <div className="space-y-3 rounded-2xl border border-[#2a2a2e] bg-[#131315] p-8 text-center">
              <p className="text-xs text-[#9a978f]">
                {error.status === 401
                  ? "Você precisa entrar com sua conta para ver seus cursos."
                  : "Não foi possível carregar os cursos. Por favor, tente novamente."}
              </p>
              {error.status === 401 && (
                <Link
                  href="/login"
                  className="inline-block min-h-11 rounded-lg bg-[#d4af37] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#f5d76e]"
                >
                  Fazer Login
                </Link>
              )}
            </div>
          ) : courses && courses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    categoryName={course.category_id ? categoryNames.get(course.category_id) : null}
                  />
                ))}
              </div>

              {canLoadMore && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={loadMoreCourses}
                    disabled={loadingMore}
                    className="flex min-h-11 items-center gap-2 rounded-xl border border-[#2a2a2e] bg-[#1b1b1e] px-5 text-xs font-semibold text-[#ece9e2] transition hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-60"
                  >
                    {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                    Carregar mais
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4 rounded-2xl border border-[#2a2a2e] bg-[#131315] p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-[#d4af37] opacity-80" />

              {hasFilters ? (
                <>
                  <h3 className="text-balance font-semibold text-base text-[#ece9e2]">
                    Nenhum curso encontrado
                  </h3>
                  <p className="mx-auto max-w-sm text-xs text-[#9a978f]">
                    Tente outro termo, remova a categoria selecionada ou veja todos os cursos.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d4af37] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#f5d76e]"
                  >
                    Limpar filtros
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-balance font-semibold text-base text-[#ece9e2]">
                    {isAdmin ? "Nenhum curso cadastrado ainda" : "Nenhum curso matriculado"}
                  </h3>
                  <p className="mx-auto max-w-sm text-xs text-[#9a978f]">
                    {isAdmin
                      ? "Você está conectado como Administrador. Cadastre seu primeiro curso a partir de uma pasta do Google Drive."
                      : "Você ainda não possui matrículas ativas. Entre em contato com seu administrador."}
                  </p>
                  {isAdmin && (
                    <div className="pt-2">
                      <Link
                        href="/admin/courses/new"
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f5d76e] px-4 py-2 text-xs font-semibold text-black shadow-md transition hover:opacity-95"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Cadastrar Primeiro Curso</span>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
