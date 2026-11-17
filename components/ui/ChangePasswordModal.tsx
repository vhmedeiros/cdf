import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  X,
} from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

async function readJsonSafely(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      message:
        text.trim().slice(0, 200) ||
        "O servidor retornou uma resposta inválida. Tente novamente em instantes.",
    };
  }
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswords(false);
    setError(null);
    setSuccess(null);

    const timeout = setTimeout(() => currentPasswordRef.current?.focus(), 50);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const hasMinLength = newPassword.length >= 8;
  const canSubmit = currentPassword.length > 0 && hasMinLength && passwordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Informe sua senha atual para confirmar a alteração.");
      return;
    }

    if (!hasMinLength) {
      setError("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (!passwordsMatch) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await readJsonSafely(res);
      if (!res.ok) {
        throw new Error(data.message || "Erro ao alterar a senha.");
      }

      setSuccess(data.message || "Sua senha foi alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Falha ao atualizar senha.");
    } finally {
      setLoading(false);
    }
  };

  const inputType = showPasswords ? "text" : "password";

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
          className="w-full max-w-md overflow-hidden rounded-2xl border border-[#2a2a2e] bg-[#131315] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#2a2a2e] bg-[#1b1b1e] p-5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 p-2 text-[#d4af37]">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h3
                  id="change-password-title"
                  className="text-balance font-serif text-base font-bold text-[#ece9e2]"
                >
                  Alterar Senha
                </h3>
                <p className="text-xs text-[#9a978f]">Defina uma nova senha para sua conta</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#9a978f] transition hover:bg-[#2a2a2e] hover:text-[#ece9e2]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-[#e5484d]/30 bg-[#e5484d]/10 p-3 text-xs text-[#e5484d]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-[#6fbf73]/30 bg-[#6fbf73]/10 p-3 text-xs text-[#6fbf73]">
                <Check className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="current-password" className="text-xs font-medium text-[#9a978f]">
                Senha Atual
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a978f]" />
                <input
                  id="current-password"
                  ref={currentPasswordRef}
                  type={inputType}
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Sua senha atual"
                  className="min-h-11 w-full rounded-xl border border-[#2a2a2e] bg-[#1b1b1e] pl-9 pr-11 text-sm text-[#ece9e2] placeholder-[#9a978f] outline-none transition focus:border-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37]/40"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="new-password" className="text-xs font-medium text-[#9a978f]">
                Nova Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a978f]" />
                <input
                  id="new-password"
                  type={inputType}
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  className="min-h-11 w-full rounded-xl border border-[#2a2a2e] bg-[#1b1b1e] pl-9 pr-11 text-sm text-[#ece9e2] placeholder-[#9a978f] outline-none transition focus:border-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37]/40"
                />
              </div>

              {newPassword.length > 0 && (
                <ul className="space-y-1 pt-1 text-[11px]">
                  <li
                    className={`flex items-center gap-1.5 ${
                      hasMinLength ? "text-[#6fbf73]" : "text-[#9a978f]"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Pelo menos 8 caracteres
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${
                      passwordsMatch ? "text-[#6fbf73]" : "text-[#9a978f]"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    As duas senhas são iguais
                  </li>
                </ul>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="confirm-password" className="text-xs font-medium text-[#9a978f]">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a978f]" />
                <input
                  id="confirm-password"
                  type={inputType}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="min-h-11 w-full rounded-xl border border-[#2a2a2e] bg-[#1b1b1e] pl-9 pr-11 text-sm text-[#ece9e2] placeholder-[#9a978f] outline-none transition focus:border-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37]/40"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords((value) => !value)}
              className="inline-flex min-h-9 items-center gap-1.5 text-xs text-[#9a978f] transition hover:text-[#ece9e2]"
              aria-pressed={showPasswords}
            >
              {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPasswords ? "Ocultar senhas" : "Mostrar senhas"}
            </button>

            <div className="flex items-center justify-end gap-2 border-t border-[#2a2a2e] pt-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-xl px-4 text-xs text-[#9a978f] transition hover:bg-[#1b1b1e] hover:text-[#ece9e2]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f5d76e] px-5 text-xs font-semibold text-black shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {loading ? "Salvando..." : "Salvar Senha"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
