import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import useSWR from "swr";
import {
  UserPlus,
  Copy,
  Check,
  ChevronLeft,
  Mail,
  BookOpen,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import UserMenu from "@/components/ui/UserMenu";

interface CourseItem {
  id: string;
  title: string;
  slug: string;
}

interface InviteItem {
  id: string;
  email: string;
  token: string;
  features: string[];
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface RegisteredStudent {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  enrolled_courses: Array<{ id: string; title: string; slug: string }>;
}

export default function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<{
    email: string;
    token: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: user } = useSWR<{ id?: string; features: string[] }>("/api/v1/user");
  const { data: invitesList, mutate: mutateInvites } =
    useSWR<InviteItem[]>("/api/v1/admin/invites");
  const { data: registeredStudents, mutate: mutateRegisteredStudents } =
    useSWR<RegisteredStudent[]>("/api/v1/admin/enrollments");
  const { data: allCourses } = useSWR<CourseItem[]>("/api/v1/admin/courses");
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  async function handleToggleStudentCourse(
    userId: string,
    courseId: string,
    currentEnrolled: boolean,
  ) {
    const key = `${userId}_${courseId}`;
    setTogglingKey(key);

    // Atualização otimista imediata na interface
    const updatedStudents = registeredStudents?.map((s) => {
      if (s.id !== userId) return s;
      const courseObj = allCourses?.find((c) => c.id === courseId);
      let newEnrolled = s.enrolled_courses ? [...s.enrolled_courses] : [];
      if (currentEnrolled) {
        newEnrolled = newEnrolled.filter((c) => c.id !== courseId);
      } else if (courseObj) {
        newEnrolled.push({ id: courseObj.id, title: courseObj.title, slug: courseObj.slug });
      }
      return { ...s, enrolled_courses: newEnrolled };
    });

    if (updatedStudents) {
      mutateRegisteredStudents(updatedStudents, false);
    }

    try {
      const res = await fetch("/api/v1/admin/enrollments", {
        method: currentEnrolled ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, course_id: courseId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erro ao alterar matrícula.");
      }
    } catch (err: any) {
      alert(err.message || "Falha ao alterar matrícula do curso.");
    } finally {
      setTogglingKey(null);
      mutateRegisteredStudents();
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setGeneratedInvite(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Informe um e-mail válido.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          features: ["read:course", "create:note", "create:answer"],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Erro ao criar convite.");
      }

      const data = await res.json();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const inviteUrl = `${origin}/invites/${data.token}`;

      setGeneratedInvite({
        email: data.email,
        token: data.token,
        url: inviteUrl,
      });
      setEmail("");
      mutateInvites();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao gerar convite.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function handleCopyToken(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${origin}/invites/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  }

  async function handleDeleteInvite(inviteId: string) {
    if (!window.confirm("Tem certeza que deseja revogar e excluir este convite?")) return;
    try {
      const res = await fetch(`/api/v1/admin/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao revogar convite.");
      mutateInvites();
    } catch (err: any) {
      alert(err.message || "Erro ao revogar convite.");
    }
  }

  async function handleDeleteStudent(student: RegisteredStudent) {
    if (student.id === user?.id) {
      alert("Você não pode excluir sua própria conta de administrador.");
      return;
    }

    const confirm = window.confirm(
      `Tem certeza que deseja excluir o aluno "${student.display_name || student.email}"?\n\nEsta ação removerá o usuário, seus registros, anotações e progresso permanentemente.`,
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${student.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao excluir aluno.");
      mutateRegisteredStudents();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir aluno.");
    }
  }

  return (
    <>
      <Head>
        <title>Convites e Alunos — Painel Admin</title>
      </Head>

      <div className="min-h-screen bg-[#0b0b0c] text-[#ece9e2]">
        {/* Navbar Admin */}
        <header className="h-16 border-b border-[#2a2a2e] bg-[#131315]/90 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/courses"
              className="p-2 rounded-lg bg-[#1b1b1e] border border-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] transition"
              title="Voltar para Cursos"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
              <span className="font-serif font-bold text-base text-[#ece9e2]">
                Painel do Administrador
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 text-xs">
              <Link
                href="/admin/courses"
                className="px-3 py-1.5 rounded-lg text-[#9a978f] hover:text-[#ece9e2] transition"
              >
                Cursos
              </Link>
              <Link
                href="/admin/invites"
                className="px-3 py-1.5 rounded-lg bg-[#1b1b1e] text-[#d4af37] font-semibold border border-[#2a2a2e]"
              >
                Convites & Alunos
              </Link>
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-[#9a978f] hover:text-[#ece9e2] transition ml-2 border-l border-[#2a2a2e] pl-4 hidden sm:inline-block"
              >
                Ver Plataforma
              </Link>
            </nav>

            <UserMenu />
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-10 space-y-8">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#ece9e2]">Convites & Alunos</h1>
            <p className="text-xs text-[#9a978f] mt-1">
              Gere links exclusivos de cadastro para convidar alunos. Você pode acompanhar quem já
              aceitou ou excluir alunos e convites a qualquer momento.
            </p>
          </div>

          {/* Card: Gerar Novo Convite */}
          <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-3 pb-4 border-b border-[#2a2a2e]">
              <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#ece9e2]">Gerar Novo Convite</h3>
                <p className="text-xs text-[#9a978f]">
                  O link de convite é de uso único e expira em 7 dias.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#ece9e2] mb-1.5">
                  E-mail do Aluno
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9a978f]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aluno@email.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#0b0b0c] border border-[#2a2a2e] rounded-xl text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37] transition"
                  />
                </div>
              </div>

              {errorMsg && <p className="text-xs text-[#e5484d]">{errorMsg}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f5d76e] text-black font-semibold text-xs hover:opacity-95 transition disabled:opacity-50 shadow-md"
              >
                {submitting ? "Gerando link..." : "Gerar Link de Convite"}
              </button>
            </form>

            {/* Sucesso: Link Gerado */}
            {generatedInvite && (
              <div className="p-4 rounded-xl bg-[#6fbf73]/10 border border-[#6fbf73]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#6fbf73]">
                    Convite criado para {generatedInvite.email}!
                  </span>
                  <span className="text-[11px] text-[#9a978f]">Válido por 7 dias</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInvite.url}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-[#0b0b0c] border border-[#2a2a2e] rounded-lg text-[#ece9e2] select-all outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      copied
                        ? "bg-[#6fbf73] text-black"
                        : "bg-[#1b1b1e] border border-[#2a2a2e] text-[#ece9e2] hover:border-[#d4af37]"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-[#9a978f]">
                  Envie este link para o aluno (via WhatsApp, e-mail, etc.). Ao abrir, ele definirá
                  seu nome e senha e terá acesso instantâneo.
                </p>
              </div>
            )}
          </div>

          {/* Seção: Histórico de Convites Gerados */}
          <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2e]">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#ece9e2]">Convites Enviados</h2>
                <p className="text-xs text-[#9a978f] mt-0.5">
                  Lista de todos os links de convite gerados e seus status
                </p>
              </div>
              <span className="text-xs font-mono text-[#d4af37] bg-[#1b1b1e] px-2.5 py-1 rounded-lg border border-[#2a2a2e]">
                {invitesList?.length ?? 0} {invitesList?.length === 1 ? "convite" : "convites"}
              </span>
            </div>

            {!invitesList ? (
              <div className="py-8 text-center text-xs text-[#9a978f]">
                Carregando lista de convites...
              </div>
            ) : invitesList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9a978f]">
                Nenhum convite gerado ainda. Crie seu primeiro acima!
              </div>
            ) : (
              <div className="space-y-3">
                {invitesList.map((inv) => {
                  const isUsed = !!inv.used_at;
                  const isExpired = !isUsed && new Date(inv.expires_at) < new Date();
                  const isPending = !isUsed && !isExpired;

                  return (
                    <div
                      key={inv.id}
                      className="p-3.5 sm:p-4 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#ece9e2] truncate font-mono">
                            {inv.email}
                          </span>
                          {isUsed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#6fbf73]/15 text-[#6fbf73] border border-[#6fbf73]/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Aceito
                            </span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#e5484d]/15 text-[#e5484d] border border-[#e5484d]/30">
                              <XCircle className="w-3 h-3" />
                              Expirado
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                              <Clock className="w-3 h-3" />
                              Pendente
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#9a978f] mt-1 flex items-center gap-2">
                          <span>Criado em: {new Date(inv.created_at).toLocaleDateString("pt-BR")}</span>
                          <span>&bull;</span>
                          <span>
                            {isUsed
                              ? `Aceito em: ${new Date(inv.used_at!).toLocaleDateString("pt-BR")}`
                              : `Expira em: ${new Date(inv.expires_at).toLocaleDateString("pt-BR")}`}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {isPending && (
                          <button
                            onClick={() => handleCopyToken(inv.token)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131315] border border-[#2a2a2e] text-[#ece9e2] hover:border-[#d4af37] transition flex items-center gap-1.5"
                            title="Copiar link deste convite"
                          >
                            {copiedToken === inv.token ? (
                              <>
                                <Check className="w-3 h-3 text-[#6fbf73]" />
                                <span className="text-[#6fbf73]">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-[#9a978f]" />
                                <span>Copiar Link</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteInvite(inv.id)}
                          className="p-1.5 rounded-lg bg-[#e5484d]/10 border border-[#e5484d]/30 text-[#e5484d] hover:bg-[#e5484d] hover:text-white transition text-xs font-semibold"
                          title="Revogar e excluir convite"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lista de Alunos e Cursos Ativos */}
          <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#2a2a2e] gap-3">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#ece9e2]">
                  Alunos Cadastrados na Plataforma
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#9a978f] mt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6fbf73]" />
                    <strong className="text-[#ece9e2]">Verde</strong> = Acesso Liberado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e5484d]" />
                    <strong className="text-[#ece9e2]">Vermelho</strong> = Acesso Bloqueado
                  </span>
                  <span className="text-[#9a978f]/70 italic">(Clique no curso para alternar)</span>
                </div>
              </div>
              <Link
                href="/admin/courses"
                className="px-3 py-1.5 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] text-xs font-semibold text-[#ece9e2] hover:text-[#d4af37] transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Gerenciar por Curso</span>
              </Link>
            </div>

            {!registeredStudents ? (
              <div className="py-8 text-center text-xs text-[#9a978f]">
                Carregando lista de alunos...
              </div>
            ) : registeredStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9a978f]">
                Nenhum aluno cadastrado ainda. Crie seu primeiro convite acima!
              </div>
            ) : (
              <div className="space-y-3">
                {registeredStudents.map((student) => {
                  const isCurrentAdmin = student.id === user?.id;

                  return (
                    <div
                      key={student.id}
                      className="p-4 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#131315] border border-[#2a2a2e] flex items-center justify-center font-bold text-xs text-[#d4af37] shrink-0">
                          {(student.display_name || student.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-xs text-[#ece9e2] truncate">
                              {student.display_name || "Sem nome"}
                            </p>
                            {isCurrentAdmin && (
                              <span className="px-1.5 py-0.5 rounded bg-[#d4af37]/15 border border-[#d4af37]/30 text-[9px] font-semibold text-[#d4af37]">
                                Você (Admin)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#9a978f] font-mono truncate">
                            {student.email}
                          </p>
                        </div>
                      </div>

                      {/* Cursos Matriculados e Ações */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xl">
                          {allCourses && allCourses.length > 0 ? (
                            allCourses.map((course) => {
                              const isEnrolled = student.enrolled_courses?.some(
                                (ec) => ec.id === course.id,
                              );
                              const isToggling = togglingKey === `${student.id}_${course.id}`;

                              return (
                                <button
                                  key={course.id}
                                  type="button"
                                  disabled={isToggling}
                                  onClick={() =>
                                    handleToggleStudentCourse(
                                      student.id,
                                      course.id,
                                      !!isEnrolled,
                                    )
                                  }
                                  className={`group px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm select-none ${
                                    isEnrolled
                                      ? "bg-[#6fbf73]/15 border-[#6fbf73]/40 text-[#6fbf73] hover:bg-[#e5484d]/15 hover:border-[#e5484d]/40 hover:text-[#e5484d]"
                                      : "bg-[#e5484d]/10 border-[#e5484d]/30 text-[#e5484d] hover:bg-[#6fbf73]/15 hover:border-[#6fbf73]/40 hover:text-[#6fbf73]"
                                  } ${isToggling ? "opacity-40 animate-pulse pointer-events-none" : ""}`}
                                  title={
                                    isEnrolled
                                      ? `Curso ATIVO para ${student.display_name || student.email}. Clique para REMOVER o acesso a "${course.title}".`
                                      : `Curso BLOQUEADO para ${student.display_name || student.email}. Clique para LIBERAR o acesso a "${course.title}".`
                                  }
                                >
                                  {isEnrolled ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-[#6fbf73] group-hover:hidden shrink-0" />
                                      <X className="w-3.5 h-3.5 text-[#e5484d] hidden group-hover:inline shrink-0" />
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-3.5 h-3.5 text-[#e5484d] group-hover:hidden shrink-0" />
                                      <Check className="w-3.5 h-3.5 text-[#6fbf73] hidden group-hover:inline shrink-0" />
                                    </>
                                  )}
                                  <span>{course.title}</span>
                                </button>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-[#9a978f] italic">
                              Nenhum curso cadastrado ainda
                            </span>
                          )}
                        </div>

                        {!isCurrentAdmin && (
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="p-1.5 rounded-lg bg-[#e5484d]/10 border border-[#e5484d]/30 text-[#e5484d] hover:bg-[#e5484d] hover:text-white transition text-xs font-semibold ml-2"
                            title="Excluir aluno da plataforma"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
