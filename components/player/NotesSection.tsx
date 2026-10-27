import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/lib/utils";
import {
  StickyNote,
  Plus,
  Play,
  Star,
  Trash2,
  Edit2,
  Check,
  X,
  BookOpen,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface NoteItem {
  id: string;
  material_id: string;
  course_id: string;
  timestamp_seconds: number | null;
  body: string;
  is_important: boolean;
  created_at: string;
  updated_at: string;
}

interface NotesSectionProps {
  onNoteAdded?: () => void;
}

export default function NotesSection({ onNoteAdded }: NotesSectionProps) {
  const { activeItem, currentTime, seekTo, togglePlay, isPlaying, course } = usePlayer();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [capturedTime, setCapturedTime] = useState(0);
  const [isImportant, setIsImportant] = useState(false);

  // Edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editImportant, setEditImportant] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const materialId = activeItem?.material.id;

  // Carrega anotações do material ativo
  const loadNotes = useCallback(async () => {
    if (!materialId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/notes?material_id=${materialId}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error("Erro ao carregar anotações:", err);
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Iniciar criação de nota (captura o timestamp atual e pausa se estiver tocando)
  const startNewNote = useCallback(() => {
    setCapturedTime(currentTime);
    setNewNoteBody("");
    setIsImportant(false);
    setIncludeTimestamp(true);
    setIsCreating(true);

    if (isPlaying) {
      togglePlay();
    }

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, [currentTime, isPlaying, togglePlay]);

  // Listener para atalho 'N' (global em toda a janela quando não estiver digitando)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        startNewNote();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startNewNote]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteBody.trim() || !materialId) return;

    try {
      const res = await fetch("/api/v1/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_id: materialId,
          timestamp_seconds: includeTimestamp ? capturedTime : null,
          body: newNoteBody.trim(),
          is_important: isImportant,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setNotes((prev) => [created, ...prev]);
        setIsCreating(false);
        setNewNoteBody("");
        onNoteAdded?.();
      }
    } catch (err) {
      console.error("Erro ao salvar anotação:", err);
    }
  };

  const handleUpdateNote = async (id: string) => {
    if (!editBody.trim()) return;
    try {
      const res = await fetch(`/api/v1/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: editBody.trim(),
          is_important: editImportant,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        setEditingId(null);
      }
    } catch (err) {
      console.error("Erro ao atualizar anotação:", err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta anotação?")) return;
    try {
      const res = await fetch(`/api/v1/notes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Erro ao excluir anotação:", err);
    }
  };

  const handleToggleImportant = async (note: NoteItem) => {
    try {
      const res = await fetch(`/api/v1/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_important: !note.is_important }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
      }
    } catch (err) {
      console.error("Erro ao alternar importância:", err);
    }
  };

  const handleJumpToTimestamp = (seconds: number) => {
    seekTo(seconds);
    if (!isPlaying) {
      togglePlay();
    }
  };

  return (
    <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Cabeçalho da seção de anotações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <StickyNote className="w-5 h-5 text-[#d4af37]" />
          <h3 className="font-semibold text-base text-[#ece9e2]">Anotações desta Aula</h3>
          <span className="text-xs bg-[#1b1b1e] text-[#9a978f] border border-[#2a2a2e] px-2 py-0.5 rounded-full font-mono">
            {notes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {course?.slug && (
            <Link
              href={`/courses/${course.slug}/caderno`}
              className="text-xs text-[#9a978f] hover:text-[#d4af37] flex items-center gap-1.5 transition px-2.5 py-1.5 rounded-lg hover:bg-[#1b1b1e]"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Caderno do Curso
            </Link>
          )}

          {!isCreating && (
            <button
              onClick={startNewNote}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#d4af37] text-black hover:bg-[#f5d76e] transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Nota <span className="text-[10px] opacity-75 font-mono ml-0.5">(N)</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulário de criação de nota */}
      {isCreating && (
        <form
          onSubmit={handleCreateNote}
          className="bg-[#1b1b1e] border border-[#d4af37]/40 rounded-xl p-4 space-y-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-mono text-[#d4af37] font-medium">
              <Clock className="w-3.5 h-3.5" />
              Timestamp: {formatDuration(capturedTime)}
            </span>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-[#9a978f] cursor-pointer hover:text-[#ece9e2]">
                <input
                  type="checkbox"
                  checked={includeTimestamp}
                  onChange={(e) => setIncludeTimestamp(e.target.checked)}
                  className="accent-[#d4af37] w-3.5 h-3.5 rounded"
                />
                Vincular ao momento
              </label>

              <label className="flex items-center gap-1.5 text-xs text-[#9a978f] cursor-pointer hover:text-[#d4af37]">
                <input
                  type="checkbox"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                  className="accent-[#d4af37] w-3.5 h-3.5 rounded"
                />
                Importante ⭐
              </label>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={newNoteBody}
            onChange={(e) => setNewNoteBody(e.target.value)}
            placeholder="Digite sua anotação aqui... (Ex: Lembrar que o art. 5º da CF trata dos direitos fundamentais)"
            rows={3}
            className="w-full bg-[#131315] border border-[#2a2a2e] rounded-lg p-3 text-xs sm:text-sm text-[#ece9e2] placeholder-[#9a978f]/60 focus:border-[#d4af37] outline-none resize-y"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!newNoteBody.trim()}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#d4af37] text-black hover:bg-[#f5d76e] disabled:opacity-50 transition"
            >
              Salvar Anotação
            </button>
          </div>
        </form>
      )}

      {/* Lista de anotações */}
      {loading ? (
        <div className="py-6 text-center text-xs text-[#9a978f]">Carregando anotações...</div>
      ) : notes.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#9a978f] border border-dashed border-[#2a2a2e] rounded-xl flex flex-col items-center justify-center gap-1.5">
          <StickyNote className="w-8 h-8 opacity-40 mb-1" />
          <p>Nenhuma anotação nesta aula ainda.</p>
          <p className="text-[11px] text-[#9a978f]/70">
            Pressione a tecla{" "}
            <kbd className="font-mono bg-[#1b1b1e] px-1 py-0.5 rounded border border-[#2a2a2e]">
              N
            </kbd>{" "}
            enquanto assiste para anotar uma ideia.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {notes.map((note) => {
            const isEditing = editingId === note.id;

            return (
              <div
                key={note.id}
                className={`bg-[#1b1b1e] border rounded-xl p-3.5 transition group ${
                  note.is_important ? "border-[#d4af37]/50 bg-[#1b1b1e]/90" : "border-[#2a2a2e]"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                      className="w-full bg-[#131315] border border-[#2a2a2e] rounded-lg p-2.5 text-xs text-[#ece9e2] focus:border-[#d4af37] outline-none"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <label className="flex items-center gap-1.5 text-[#9a978f] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editImportant}
                          onChange={(e) => setEditImportant(e.target.checked)}
                          className="accent-[#d4af37]"
                        />
                        Importante ⭐
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-[#9a978f] hover:text-[#ece9e2]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateNote(note.id)}
                          className="px-2.5 py-1 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-[#f5d76e]"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {note.timestamp_seconds !== null ? (
                          <button
                            onClick={() => handleJumpToTimestamp(note.timestamp_seconds!)}
                            title="Pular para este momento no vídeo"
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#131315] border border-[#2a2a2e] text-[#d4af37] hover:bg-[#d4af37] hover:text-black transition"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            {formatDuration(note.timestamp_seconds)}
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium text-[#9a978f] bg-[#131315] px-2 py-0.5 rounded-md border border-[#2a2a2e]">
                            Geral
                          </span>
                        )}

                        <span className="text-[11px] text-[#9a978f]">
                          {new Date(note.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleToggleImportant(note)}
                          title={
                            note.is_important ? "Desmarcar importante" : "Marcar como importante"
                          }
                          className={`p-1 rounded hover:bg-[#2a2a2e] transition ${
                            note.is_important
                              ? "text-[#d4af37]"
                              : "text-[#9a978f] hover:text-[#d4af37]"
                          }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${note.is_important ? "fill-[#d4af37]" : ""}`}
                          />
                        </button>

                        <button
                          onClick={() => {
                            setEditingId(note.id);
                            setEditBody(note.body);
                            setEditImportant(note.is_important);
                          }}
                          title="Editar anotação"
                          className="p-1 rounded hover:bg-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          title="Excluir anotação"
                          className="p-1 rounded hover:bg-[#2a2a2e] text-[#9a978f] hover:text-[#e5484d] transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-[#ece9e2] whitespace-pre-wrap leading-relaxed">
                      {note.body}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
