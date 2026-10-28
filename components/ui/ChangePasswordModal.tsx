import React, { useState } from "react";
import { Lock, X, Check, AlertCircle, KeyRound } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword || undefined,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao alterar a senha.");
      }

      setSuccess("Sua senha foi alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Falha ao atualizar senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#131315] border border-[#2a2a2e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2e] bg-[#1b1b1e]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#ece9e2]">Alterar Senha</h3>
              <p className="text-xs text-[#9a978f]">Defina uma nova senha para sua conta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#2a2a2e] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#e5484d]/10 border border-[#e5484d]/30 text-xs text-[#e5484d] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-[#6fbf73]/10 border border-[#6fbf73]/30 text-xs text-[#6fbf73] flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-[#9a978f] font-medium">Senha Atual</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#9a978f]" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Sua senha atual"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#9a978f] font-medium">Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#9a978f]" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#9a978f] font-medium">Confirmar Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#9a978f]" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e] transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-[#d4af37] to-[#f5d76e] text-black font-semibold text-xs rounded-xl hover:opacity-95 transition shadow-sm disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar Senha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
