import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  RefreshCw,
  ExternalLink,
  Clock,
  Video,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface CourseAdminItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  drive_url: string;
  drive_folder_id: string;
  status: string;
  sync_status: string;
  sync_error: string | null;
  total_duration_seconds: number;
  materials_count: number;
  last_synced_at: string | null;
  created_at: string;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/courses");
      if (res.status === 401 || res.status === 403) {
        setErrorMsg("Acesso restrito. Faça login como administrador.");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err: any) {
      setErrorMsg("Erro ao carregar lista de cursos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleSyncCourse = async (courseId: string) => {
    setSyncingId(courseId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/courses/${courseId}/sync?direct=true`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro na sincronização.");
      }
      setSuccessMsg("Curso sincronizado com o Google Drive com sucesso!");
      await loadCourses();
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao sincronizar.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Painel do Administrador — Cursos</title>
      </Head>

      <div className="min-h-screen bg-[#0b0b0c] text-[#ece9e2]">
        {/* Top Navbar */}
        <header className="border-b border-[#2a2a2e] bg-[#131315]/90 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/courses"
                className="p-2 rounded-xl bg-[#1b1b1e] hover:bg-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] transition flex items-center gap-1.5 text-xs font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Área do Aluno
              </Link>

              <div className="h-4 w-px bg-[#2a2a2e]" />

              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#d4af37]" />
                <span className="font-semibold text-sm">Painel do Administrador</span>
              </div>

              <div className="h-4 w-px bg-[#2a2a2e]" />

              <nav className="flex items-center gap-1">
                <Link
                  href="/admin/courses"
                  className="px-2.5 py-1 rounded-lg bg-[#1b1b1e] text-[#d4af37] text-xs font-semibold border border-[#2a2a2e]"
                >
                  Cursos
                </Link>
                <Link
                  href="/admin/invites"
                  className="px-2.5 py-1 rounded-lg text-[#9a978f] hover:text-[#ece9e2] text-xs transition"
                >
                  Convites & Alunos
                </Link>
              </nav>
            </div>

            <Link
              href="/admin/courses/new"
              className="px-4 py-2 rounded-xl bg-[#d4af37] text-black hover:bg-[#f5d76e] text-xs font-semibold transition flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Novo Curso
            </Link>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Banner de Mensagens */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-[#e5484d]/10 border border-[#e5484d]/30 text-[#e5484d] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-[#6fbf73]/10 border border-[#6fbf73]/30 text-[#6fbf73] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Cabeçalho da Lista */}
          <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#ece9e2] mb-1">
                Gerenciamento de Cursos
              </h1>
              <p className="text-xs sm:text-sm text-[#9a978f]">
                Conecte pastas do Google Drive para importar módulos, videoaulas e PDFs
                automaticamente.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadCourses}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] text-xs font-semibold text-[#9a978f] hover:text-[#ece9e2] transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Atualizar Lista
              </button>
            </div>
          </div>

          {/* Lista de Cursos */}
          {loading ? (
            <div className="py-16 text-center text-sm text-[#9a978f]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#d4af37] mb-2" />
              Carregando cursos cadastrados...
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-[#131315] border border-dashed border-[#2a2a2e] rounded-2xl py-16 text-center text-[#9a978f] space-y-4">
              <FolderKanban className="w-12 h-12 mx-auto text-[#d4af37] opacity-60" />
              <div>
                <h3 className="text-base font-semibold text-[#ece9e2]">
                  Nenhum curso cadastrado ainda
                </h3>
                <p className="text-xs text-[#9a978f] mt-1 max-w-sm mx-auto">
                  Clique no botão abaixo para colar o link da pasta do seu Google Drive e importar
                  seu primeiro curso.
                </p>
              </div>
              <Link
                href="/admin/courses/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#d4af37] text-black font-semibold text-xs rounded-xl hover:bg-[#f5d76e] transition shadow"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Primeiro Curso
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {courses.map((course) => {
                const isSyncing = syncingId === course.id;

                return (
                  <div
                    key={course.id}
                    className="bg-[#131315] border border-[#2a2a2e] hover:border-[#3a3a3e] rounded-2xl p-5 sm:p-6 transition shadow-lg space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2a2e]">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-lg font-bold text-[#ece9e2]">{course.title}</h2>
                          <span
                            className={`text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-full border ${
                              course.status === "published"
                                ? "bg-[#6fbf73]/10 border-[#6fbf73]/30 text-[#6fbf73]"
                                : "bg-[#f5d76e]/10 border-[#f5d76e]/30 text-[#f5d76e]"
                            }`}
                          >
                            {course.status}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-[#9a978f] mt-0.5">
                          slug: <span className="text-[#d4af37]">{course.slug}</span>
                        </p>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSyncCourse(course.id)}
                          disabled={isSyncing}
                          className="px-3.5 py-1.5 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] text-xs font-semibold text-[#ece9e2] hover:text-[#d4af37] transition flex items-center gap-1.5 disabled:opacity-50"
                          title="Recarregar e reindexar arquivos do Google Drive"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#d4af37]" : ""}`}
                          />
                          {isSyncing ? "Sincronizando..." : "Sincronizar do Drive"}
                        </button>

                        <Link
                          href={`/courses/${course.slug}`}
                          className="px-3.5 py-1.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37] hover:text-black transition text-xs font-semibold flex items-center gap-1"
                        >
                          <span>Assistir</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Métricas e Detalhes */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-[#1b1b1e] p-2.5 rounded-xl border border-[#2a2a2e] flex items-center gap-2.5">
                        <Video className="w-4 h-4 text-[#d4af37] shrink-0" />
                        <div>
                          <span className="block font-bold text-[#ece9e2] font-mono">
                            {course.materials_count}
                          </span>
                          <span className="text-[#9a978f] text-[10px]">Materiais / Aulas</span>
                        </div>
                      </div>

                      <div className="bg-[#1b1b1e] p-2.5 rounded-xl border border-[#2a2a2e] flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-[#f5d76e] shrink-0" />
                        <div>
                          <span className="block font-bold text-[#ece9e2] font-mono">
                            {formatDuration(course.total_duration_seconds)}
                          </span>
                          <span className="text-[#9a978f] text-[10px]">Duração Total</span>
                        </div>
                      </div>

                      <div className="bg-[#1b1b1e] p-2.5 rounded-xl border border-[#2a2a2e] flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-[#6fbf73] shrink-0" />
                        <div>
                          <span className="block font-bold text-[#ece9e2] font-mono capitalize">
                            {course.sync_status}
                          </span>
                          <span className="text-[#9a978f] text-[10px]">Status do Drive</span>
                        </div>
                      </div>

                      <div className="bg-[#1b1b1e] p-2.5 rounded-xl border border-[#2a2a2e] flex items-center gap-2.5">
                        <ExternalLink className="w-4 h-4 text-[#9a978f] shrink-0" />
                        <div className="min-w-0">
                          <a
                            href={course.drive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block font-bold text-[#d4af37] truncate hover:underline text-[11px]"
                          >
                            Abrir Pasta no Drive
                          </a>
                          <span className="text-[#9a978f] text-[10px] truncate block">
                            ID: {course.drive_folder_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
