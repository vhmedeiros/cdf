import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { User, LogOut, KeyRound, Shield, LogIn, ChevronDown } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import ChangePasswordModal from "./ChangePasswordModal";

export default function UserMenu() {
  const router = useRouter();
  const { user, isAdmin, isLoading, mutate } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Dispara a remoção de sessão sem travar a navegação
    fetch("/api/v1/sessions", { method: "DELETE" }).catch(() => {});
    mutate(undefined, { revalidate: false });
    window.location.href = "/login";
  };

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-[#1b1b1e] animate-pulse" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f5d76e] text-black font-semibold text-xs hover:opacity-95 transition shadow-sm"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Entrar</span>
      </Link>
    );
  }

  const initial = (user.display_name || user.email || "U")[0].toUpperCase();

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] transition text-left group"
          title="Minha Conta"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d4af37] to-[#997b1e] flex items-center justify-center font-bold text-xs text-black shadow">
            {initial}
          </div>
          <span className="text-xs text-[#ece9e2] font-medium hidden sm:inline max-w-[120px] truncate">
            {user.display_name || user.email.split("@")[0]}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#9a978f] group-hover:text-[#ece9e2] transition-transform ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Popover Menu */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#131315] border border-[#2a2a2e] shadow-2xl p-2 z-50 animate-fade-in space-y-1">
            {/* User Info Header */}
            <div className="p-2.5 border-b border-[#2a2a2e]/80">
              <p className="font-semibold text-xs text-[#ece9e2] truncate">
                {user.display_name || "Usuário"}
              </p>
              <p className="text-[11px] text-[#9a978f] truncate font-mono">{user.email}</p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-[#d4af37]/15 border border-[#d4af37]/30 text-[10px] font-semibold text-[#d4af37]">
                  <Shield className="w-3 h-3" />
                  Administrador
                </span>
              )}
            </div>

            {/* Menu Links */}
            {isAdmin && (
              <Link
                href="/admin/courses"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] transition"
              >
                <Shield className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Painel Admin</span>
              </Link>
            )}

            <button
              onClick={() => {
                setMenuOpen(false);
                setPasswordModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#9a978f]" />
              <span>Alterar Senha</span>
            </button>

            <div className="pt-1 border-t border-[#2a2a2e]/80">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#e5484d] hover:bg-[#e5484d]/10 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Alteração de Senha */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  );
}
