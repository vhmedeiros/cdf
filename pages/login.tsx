import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSWRConfig } from "swr";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "E-mail ou senha incorretos.");
      }

      const userData = await res.json().catch(() => ({}));

      // Atualiza o cache do SWR imediatamente para evitar estados desatualizados
      await mutate("/api/v1/user", userData, false);

      const isAdmin = Boolean(
        userData?.features?.includes("create:course") ||
          userData?.features?.includes("create:invite") ||
          userData?.features?.includes("read:course:all"),
      );

      if (isAdmin) {
        router.push("/admin/courses");
      } else {
        router.push("/courses");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Entrar — Aula</title>
      </Head>

      <div className="min-h-screen bg-[#0b0b0c] flex items-center justify-center p-4">
        {/* Glow de fundo dourado */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10">
          {/* Logo & Título */}
          <div className="text-center space-y-2">
            <span className="inline-flex w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#f5d76e] items-center justify-center font-bold text-black font-serif text-xl shadow-md mb-2">
              A
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#ece9e2]">
              Plataforma Aula
            </h1>
            <p className="text-xs text-[#9a978f]">
              Entre para acessar seus cursos e a sala de estudos
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#e5484d]/10 border border-[#e5484d]/30 text-xs text-[#e5484d] text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-[#9a978f] font-medium">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#9a978f]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-9 pr-3 py-2.5 sm:py-2 text-base sm:text-xs bg-[#1b1b1e] border border-[#2a2a2e] rounded-lg text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-[#9a978f] font-medium">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#9a978f]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 sm:py-2 text-base sm:text-xs bg-[#1b1b1e] border border-[#2a2a2e] rounded-lg text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 min-h-[44px] bg-gradient-to-r from-[#d4af37] to-[#f5d76e] text-black font-semibold text-sm sm:text-xs rounded-xl hover:opacity-95 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {loading ? (
                "Entrando..."
              ) : (
                <>
                  <span>Entrar na Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé discreto de segurança */}
          <div className="pt-4 border-t border-[#1b1b1e] text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#9a978f]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Ambiente de Estudos Seguro</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
