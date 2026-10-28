import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import useSWR from "swr";
import {
  UserPlus,
  Copy,
  Check,
  GraduationCap,
  Users,
  ChevronLeft,
  Mail,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export default function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<{
    email: string;
    token: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: user } = useSWR<{ features: string[] }>("/api/v1/user");

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
              className="px-3 py-1.5 rounded-lg text-[#9a978f] hover:text-[#ece9e2] transition ml-2 border-l border-[#2a2a2e] pl-4"
            >
              Ver Plataforma
            </Link>
          </nav>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#ece9e2]">Convites & Alunos</h1>
            <p className="text-xs text-[#9a978f] mt-1">
              Gere links exclusivos de cadastro para convidar alunos para a plataforma. Ao aceitar o
              convite, o aluno terá acesso imediato aos cursos publicados.
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

            <form onSubmit={handleCreateInvite} className="space-y-4 max-w-lg">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-[#e5484d]/10 border border-[#e5484d]/30 text-xs text-[#e5484d] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#9a978f]">E-mail do Aluno</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9a978f] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="aluno@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#a8892c] text-black font-semibold text-xs hover:brightness-110 active:scale-95 transition shadow-lg shadow-[#d4af37]/10 disabled:opacity-50"
              >
                {submitting ? "Gerando link..." : "Gerar Link de Convite"}
              </button>
            </form>

            {/* Link Gerado com Sucesso */}
            {generatedInvite && (
              <div className="p-4 rounded-xl bg-[#6fbf73]/10 border border-[#6fbf73]/30 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-xs text-[#6fbf73] font-medium">
                  <Check className="w-4 h-4" />
                  <span>Convite gerado com sucesso para {generatedInvite.email}!</span>
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
        </main>
      </div>
    </>
  );
}
