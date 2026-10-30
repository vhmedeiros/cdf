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
  Users,
  Eye,
  EyeOff,
  UserCheck,
  Search,
  X,
  Check,
  Trash2,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import UserMenu from "@/components/ui/UserMenu";

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
  enrollments_count?: number;
  last_synced_at: string | null;
  created_at: string;
}

interface StudentEnrollmentItem {
  id: string;
  email: string;
  display_name: string;
  is_enrolled: boolean;
  enrolled_at: string | null;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados do Modal de Gerenciamento de Alunos
  const [managingCourse, setManagingCourse] = useState<CourseAdminItem | null>(null);
  const [students, setStudents] = useState<StudentEnrollmentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [togglingStudentId, setTogglingStudentId] = useState<string | null>(null);

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

  const handleTogglePublish = async (courseId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/courses/${courseId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao alterar status do curso.");
      setSuccessMsg(data.message);
      await loadCourses();
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao alterar status.");
    }
  };

  const handleEnrollAll = async (courseId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/courses/${courseId}/enroll-all`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao matricular alunos.");
      setSuccessMsg(data.message);
      await loadCourses();
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao matricular alunos.");
    }
  };

  const handleDeleteCourse = async (course: CourseAdminItem) => {
    const confirm = window.confirm(
      `Tem certeza que deseja excluir o curso "${course.title}"?\n\nTodas as aulas, notas e matrículas deste curso serão removidas. Os arquivos no seu Google Drive NÃO serão apagados.`,
    );
    if (!confirm) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/courses/${course.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao excluir curso.");
      setSuccessMsg(data.message || "Curso excluído com sucesso.");
      await loadCourses();
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao excluir curso.");
    }
  };

  const openEnrollmentsModal = async (course: CourseAdminItem) => {
    setManagingCourse(course);
    setStudentsLoading(true);
    setStudentSearch("");
    try {
      const res = await fetch(`/api/v1/admin/courses/${course.id}/enrollments`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch {
      setErrorMsg("Erro ao carregar lista de alunos.");
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleToggleStudent = async (userId: string, currentEnrolled: boolean) => {
    if (!managingCourse) return;
    setTogglingStudentId(userId);
    try {
      const res = await fetch(`/api/v1/admin/courses/${managingCourse.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, enrolled: !currentEnrolled }),
      });
      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) => (s.id === userId ? { ...s, is_enrolled: !currentEnrolled } : s)),
        );
        await loadCourses();
      }
    } catch {
      setErrorMsg("Erro ao atualizar matrícula do aluno.");
    } finally {
      setTogglingStudentId(null);
    }
  };

  const handleBatchStudents = async (enrolled: boolean) => {
    if (!managingCourse) return;
    const targetIds = students.map((s) => s.id);
    setStudentsLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/courses/${managingCourse.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: targetIds, enrolled }),
      });
      if (res.ok) {
        setStudents((prev) => prev.map((s) => ({ ...s, is_enrolled: enrolled })));
        await loadCourses();
      }
    } catch {
      setErrorMsg("Erro na atualização em massa.");
    } finally {
      setStudentsLoading(false);
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

            <div className="flex items-center gap-3">
              <Link
                href="/admin/courses/new"
                className="px-4 py-2 rounded-xl bg-[#d4af37] text-black hover:bg-[#f5d76e] text-xs font-semibold transition flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Novo Curso
              </Link>
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-8 space-y-6">
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
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Publicar / Despublicar */}
                        <button
                          onClick={() => handleTogglePublish(course.id)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 ${
                            course.status === "published"
                              ? "bg-[#6fbf73]/10 border-[#6fbf73]/40 text-[#6fbf73] hover:bg-[#e5484d]/10 hover:border-[#e5484d]/40 hover:text-[#e5484d]"
                              : "bg-[#d4af37]/10 border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37]/20"
                          }`}
                          title={
                            course.status === "published"
                              ? "Clique para despublicar (tornar rascunho)"
                              : "Clique para publicar e liberar para os alunos"
                          }
                        >
                          {course.status === "published" ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Publicado</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Publicar Curso</span>
                            </>
                          )}
                        </button>

                        {/* Gerenciar Alunos & Matrículas */}
                        <button
                          onClick={() => openEnrollmentsModal(course)}
                          className="px-3 py-1.5 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] text-xs font-semibold text-[#ece9e2] hover:text-[#d4af37] transition flex items-center gap-1.5 shadow-sm"
                          title="Selecionar quais alunos têm acesso a este curso"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>Alunos & Acesso ({course.enrollments_count ?? 0})</span>
                        </button>

                        <button
                          onClick={() => handleSyncCourse(course.id)}
                          disabled={isSyncing}
                          className="px-3.5 py-1.5 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] text-xs font-semibold text-[#ece9e2] hover:text-[#d4af37] transition flex items-center gap-1.5 disabled:opacity-50"
                          title="Recarregar e reindexar arquivos do Google Drive"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#d4af37]" : ""}`}
                          />
                          {isSyncing ? "Sincronizando..." : "Sincronizar"}
                        </button>

                        <Link
                          href={`/courses/${course.slug}`}
                          className="px-3.5 py-1.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37] hover:text-black transition text-xs font-semibold flex items-center gap-1"
                        >
                          <span>Assistir</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleDeleteCourse(course)}
                          className="p-1.5 px-2 rounded-xl bg-[#e5484d]/10 border border-[#e5484d]/30 text-[#e5484d] hover:bg-[#e5484d] hover:text-white transition text-xs font-semibold flex items-center gap-1"
                          title="Excluir este curso permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Excluir</span>
                        </button>
                      </div>
                    </div>

                    {/* Métricas e Detalhes */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div className="bg-[#1b1b1e] p-2.5 rounded-xl border border-[#2a2a2e] flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-[#6fbf73] shrink-0" />
                        <div>
                          <span className="block font-bold text-[#ece9e2] font-mono">
                            {course.enrollments_count ?? 0}
                          </span>
                          <span className="text-[#9a978f] text-[10px]">Alunos Matriculados</span>
                        </div>
                      </div>

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

        {/* Modal de Gerenciamento de Alunos do Curso */}
        {managingCourse && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setManagingCourse(null)}
          >
            <div
              className="bg-[#131315] border border-[#2a2a2e] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div className="flex items-center justify-between p-5 border-b border-[#2a2a2e] bg-[#1b1b1e]">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#ece9e2]">Alunos do Curso</h3>
                  <p className="text-xs text-[#9a978f] mt-0.5">
                    Curso:{" "}
                    <span className="text-[#d4af37] font-semibold">{managingCourse.title}</span>
                  </p>
                </div>
                <button
                  onClick={() => setManagingCourse(null)}
                  className="p-1.5 rounded-lg text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#2a2a2e] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Filtro e Ações em Massa */}
              <div className="p-4 border-b border-[#2a2a2e] space-y-3 bg-[#131315]">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9a978f]" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Buscar aluno por nome ou e-mail..."
                    className="w-full pl-9 pr-3 py-2 bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl text-xs text-[#ece9e2] placeholder-[#9a978f] outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9a978f]">
                    {students.filter((s) => s.is_enrolled).length} de {students.length} alunos
                    matriculados
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBatchStudents(true)}
                      disabled={studentsLoading}
                      className="px-2.5 py-1 rounded-lg bg-[#6fbf73]/10 text-[#6fbf73] border border-[#6fbf73]/30 hover:bg-[#6fbf73]/20 transition text-[11px] font-semibold disabled:opacity-50"
                    >
                      Matricular Todos
                    </button>
                    <button
                      onClick={() => handleBatchStudents(false)}
                      disabled={studentsLoading}
                      className="px-2.5 py-1 rounded-lg bg-[#e5484d]/10 text-[#e5484d] border border-[#e5484d]/30 hover:bg-[#e5484d]/20 transition text-[11px] font-semibold disabled:opacity-50"
                    >
                      Remover Todos
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Alunos com Toggle */}
              <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-96">
                {studentsLoading ? (
                  <div className="py-12 text-center text-xs text-[#9a978f]">
                    Carregando alunos...
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#9a978f]">
                    Nenhum aluno cadastrado no sistema ainda.
                  </div>
                ) : (
                  students
                    .filter(
                      (s) =>
                        s.display_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.email?.toLowerCase().includes(studentSearch.toLowerCase()),
                    )
                    .map((student) => {
                      const isToggling = togglingStudentId === student.id;

                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#3a3a3e] transition gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#131315] border border-[#2a2a2e] flex items-center justify-center font-bold text-xs text-[#d4af37] shrink-0">
                              {(student.display_name || student.email)[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-[#ece9e2] truncate">
                                {student.display_name || "Sem nome"}
                              </p>
                              <p className="text-[11px] text-[#9a978f] font-mono truncate">
                                {student.email}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleStudent(student.id, student.is_enrolled)}
                            disabled={isToggling}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                              student.is_enrolled
                                ? "bg-[#6fbf73]/15 border-[#6fbf73]/40 text-[#6fbf73] hover:bg-[#e5484d]/10 hover:border-[#e5484d]/40 hover:text-[#e5484d]"
                                : "bg-[#131315] border-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] hover:border-[#d4af37]"
                            }`}
                          >
                            {student.is_enrolled ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Matriculado</span>
                              </>
                            ) : (
                              <span>Sem Acesso</span>
                            )}
                          </button>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="p-4 border-t border-[#2a2a2e] bg-[#1b1b1e] flex justify-end">
                <button
                  onClick={() => setManagingCourse(null)}
                  className="px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#f5d76e] text-black font-semibold text-xs rounded-xl hover:opacity-95 transition shadow-sm"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
