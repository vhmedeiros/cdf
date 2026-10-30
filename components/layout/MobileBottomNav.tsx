import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, BookOpen, Search, User, LogIn, LogOut, KeyRound, Shield, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import ChangePasswordModal from "@/components/ui/ChangePasswordModal";

export default function MobileBottomNav() {
  const router = useRouter();
  const { user, isAdmin, isLoading, mutate } = useUser();
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Não exibe a barra inferior na tela de login
  if (router.pathname === "/login") {
    return null;
  }

  const isHomeActive = router.pathname === "/";
  const isCoursesActive =
    router.pathname.startsWith("/courses") && !router.pathname.includes("/caderno");

  function openSearch() {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  }

  const handleLogout = () => {
    fetch("/api/v1/sessions", { method: "DELETE" }).catch(() => {});
    mutate(undefined, { revalidate: false });
    setAccountDrawerOpen(false);
    window.location.href = "/login";
  };

  const initial = (user?.display_name || user?.email || "U")[0].toUpperCase();

  return (
    <>
      {/* Mobile Bottom Dock (Visível apenas em telas menores que md) */}
      <nav
        aria-label="Navegação móvel principal"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#131315]/95 backdrop-blur-md border-t border-[#2a2a2e] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* 1. Início */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 active:scale-95 ${
              isHomeActive ? "text-[#d4af37]" : "text-[#9a978f] hover:text-[#ece9e2]"
            }`}
          >
            <div className="relative">
              <Home className="w-5 h-5" />
              {isHomeActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#d4af37]" />
              )}
            </div>
            <span className="text-[10px] font-medium mt-1 tracking-tight">Início</span>
          </Link>

          {/* 2. Cursos */}
          <Link
            href="/courses"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 active:scale-95 ${
              isCoursesActive ? "text-[#d4af37]" : "text-[#9a978f] hover:text-[#ece9e2]"
            }`}
          >
            <div className="relative">
              <BookOpen className="w-5 h-5" />
              {isCoursesActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#d4af37]" />
              )}
            </div>
            <span className="text-[10px] font-medium mt-1 tracking-tight">Cursos</span>
          </Link>

          {/* 3. Buscar */}
          <button
            type="button"
            onClick={openSearch}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[#9a978f] hover:text-[#ece9e2] active:scale-95 transition-all duration-150"
            title="Buscar (Ctrl+K)"
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1 tracking-tight">Buscar</span>
          </button>

          {/* 4. Conta / Perfil */}
          {user ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAccountDrawerOpen((prev) => !prev);
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 active:scale-95 ${
                accountDrawerOpen ? "text-[#d4af37]" : "text-[#9a978f] hover:text-[#ece9e2]"
              }`}
              title="Menu do Usuário"
            >
              <div className="relative">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#d4af37] to-[#997b1e] flex items-center justify-center text-[10px] font-bold text-black shadow-sm">
                  {initial}
                </div>
                {accountDrawerOpen && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#d4af37]" />
                )}
              </div>
              <span className="text-[10px] font-medium mt-1 tracking-tight">Perfil</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[#9a978f] hover:text-[#d4af37] active:scale-95 transition-all duration-150"
            >
              <LogIn className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1 tracking-tight">Entrar</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Bottom Sheet de Conta para Mobile */}
      {accountDrawerOpen && user && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop escurecido */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setAccountDrawerOpen(false)}
          />

          {/* Painel que sobe da base da tela */}
          <div
            data-testid="mobile-account-drawer"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full bg-[#131315] border-t border-[#2a2a2e] rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-200 space-y-4"
          >
            {/* Barra de arraste visual */}
            <div className="w-12 h-1 bg-[#2a2a2e] rounded-full mx-auto" />

            {/* Cabeçalho do usuário */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2e]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4af37] to-[#997b1e] flex items-center justify-center font-bold text-sm text-black shadow">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#ece9e2] truncate">
                    {user.display_name || "Usuário"}
                  </p>
                  <p className="text-xs text-[#9a978f] truncate font-mono">{user.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAccountDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#9a978f] hover:text-[#ece9e2] bg-[#1b1b1e] border border-[#2a2a2e]"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Badge de Administrador se aplicável */}
            {isAdmin && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#d4af37]" />
                  <span className="text-xs font-semibold text-[#d4af37]">
                    Acesso de Administrador
                  </span>
                </div>
                <Link
                  href="/admin/courses"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-[#d4af37] text-black font-semibold text-xs shadow-sm hover:opacity-90 transition"
                >
                  Painel Admin
                </Link>
              </div>
            )}

            {/* Ações da Conta */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setAccountDrawerOpen(false);
                  setPasswordModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs text-[#ece9e2] bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] transition font-medium"
              >
                <KeyRound className="w-4 h-4 text-[#d4af37]" />
                <span>Alterar Senha de Acesso</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs text-[#e5484d] bg-[#1b1b1e] border border-[#2a2a2e] hover:bg-[#e5484d]/10 transition font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alteração de Senha */}
      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </>
  );
}
