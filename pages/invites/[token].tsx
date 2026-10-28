import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Sparkles, Lock, User, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";

export default function AcceptInvitePage() {
  const router = useRouter();
  const { token } = router.query;

  const {
    data: invite,
    error,
    isLoading,
  } = useSWR<{
    email: string;
    features: string[];
    expires_at: string;
  }>(token ? `/api/v1/invites/${token}` : null);

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!displayName.trim()) {
      setFormError("Informe o seu nome.");
      return;
    }

    if (password.length < 8) {
      setFormError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/v1/invites/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao aceitar convite.");
      }

      // Redireciona diretamente para a Home com a sessão já ativa
      router.push("/");
    } catch (err: any) {
      setFormError(err.message || "Ocorreu um erro ao criar sua conta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Aceitar Convite — Aula | Biblioteca Noturna</title>
      </Head>

      <div className="min-h-screen bg-[#0b0b0c] text-[#ece9e2] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#f5d76e] text-black font-serif font-bold text-2xl shadow-lg shadow-[#d4af37]/10 mb-2">
              A
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#ece9e2]">Bem-vindo ao Aula</h1>
            <p className="text-xs text-[#9a978f]">
              Você foi convidado para a nossa plataforma de estudos.
            </p>
          </div>

          <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-[#9a978f] animate-pulse">
                Carregando dados do convite...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-[#e5484d]/10 border border-[#e5484d]/30 text-xs text-[#e5484d] space-y-2 text-center">
                <AlertCircle className="w-5 h-5 mx-auto" />
                <p className="font-semibold">{error.message || "Convite inválido ou expirado."}</p>
                <p className="text-[11px] text-[#ece9e2]/80">
                  Solicite um novo convite ao administrador da plataforma.
                </p>
              </div>
            ) : invite ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-[#e5484d]/10 border border-[#e5484d]/30 text-xs text-[#e5484d]">
                    {formError}
                  </div>
                )}

                {/* E-mail (Somente leitura) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#9a978f]">E-mail Convidado</label>
                  <input
                    type="text"
                    value={invite.email}
                    disabled
                    className="w-full px-3 py-2 text-xs bg-[#1b1b1e]/50 border border-[#2a2a2e] rounded-xl text-[#9a978f] cursor-not-allowed"
                  />
                </div>

                {/* Nome Completo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#ece9e2]">Seu Nome Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#9a978f] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Ana Silva"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#ece9e2]">Crie uma Senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9a978f] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      placeholder="Mínimo de 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#ece9e2]">Confirme a Senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9a978f] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      placeholder="Repita sua senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#a8892c] text-black font-semibold text-xs hover:brightness-110 active:scale-95 transition shadow-lg shadow-[#d4af37]/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{submitting ? "Criando sua conta..." : "Começar a Estudar"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
