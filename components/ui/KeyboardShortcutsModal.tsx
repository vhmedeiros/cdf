import React from "react";
import { usePlayer } from "@/context/PlayerContext";
import { i18n } from "@/i18n/pt-BR";
import { X, Keyboard } from "lucide-react";

export function KeyboardShortcutsModal() {
  const { shortcutsModalOpen, toggleShortcutsModal } = usePlayer();

  if (!shortcutsModalOpen) return null;

  const shortcutsList = [
    { key: "Espaço ou K", desc: i18n.shortcuts.playPause },
    { key: "← / →", desc: "Voltar / Avançar 5s" },
    { key: "J / L", desc: "Voltar / Avançar 10s" },
    { key: "Shift + N", desc: i18n.shortcuts.nextLesson },
    { key: "Shift + P", desc: i18n.shortcuts.previousLesson },
    { key: "F", desc: i18n.shortcuts.fullscreen },
    { key: "T", desc: i18n.shortcuts.theater },
    { key: "[ / ]", desc: "Diminuir / Aumentar velocidade" },
    { key: "M", desc: "Mutar / Desmutar áudio" },
    { key: "A", desc: i18n.shortcuts.toggleAudio },
    { key: "N", desc: i18n.shortcuts.newNote },
    { key: "?", desc: i18n.shortcuts.help },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={toggleShortcutsModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#131315] border border-[#2a2a2e] p-6 shadow-2xl text-[#ece9e2]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1b1b1e] border border-[#2a2a2e] text-[#d4af37]">
              <Keyboard className="w-5 h-5" />
            </div>
            <h2 id="shortcuts-title" className="text-lg font-semibold text-[#ece9e2]">
              {i18n.shortcuts.title}
            </h2>
          </div>
          <button
            onClick={toggleShortcutsModal}
            className="p-1 rounded-lg text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e] transition"
            aria-label={i18n.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto">
          {shortcutsList.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2 rounded-lg bg-[#1b1b1e]/60 border border-[#2a2a2e]/60"
            >
              <span className="text-sm text-[#9a978f]">{item.desc}</span>
              <kbd className="px-2 py-1 text-xs font-mono font-medium text-[#d4af37] bg-[#0b0b0c] border border-[#2a2a2e] rounded shadow-sm">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-[#2a2a2e] text-center text-xs text-[#9a978f]">
          Pressione <kbd className="font-mono text-[#d4af37]">?</kbd> a qualquer momento para
          alternar este painel.
        </div>
      </div>
    </div>
  );
}
