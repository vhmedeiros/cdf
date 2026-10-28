import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Command } from "cmdk";
import {
  Search,
  BookOpen,
  Play,
  FileText,
  Target,
  Flame,
  Home,
  GraduationCap,
  Sparkles,
  Clock,
  X,
  Shield,
  Plus,
  HelpCircle,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useUser } from "@/hooks/useUser";
import type { SearchResults } from "@/models/search";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    courses: [],
    materials: [],
    notes: [],
  });

  const router = useRouter();
  const { toggleFocusMode } = usePlayer();
  const { isAdmin } = useUser();

  // Escuta atalhos Ctrl+K e Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const handleCustomOpen = () => setOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, []);

  // Busca debounced conforme digitação
  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setResults({ courses: [], materials: [], notes: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(search.trim())}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setResults(data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [search]);

  function navigateTo(url: string) {
    setOpen(false);
    setSearch("");
    router.push(url);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-2xl bg-[#131315] border border-[#2a2a2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Busca global e comandos" className="flex flex-col h-full">
          {/* Header de busca */}
          <div className="flex items-center px-4 py-3.5 border-b border-[#2a2a2e] gap-3 bg-[#1b1b1e]/50">
            <Search className="w-5 h-5 text-[#9a978f] shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar aulas, cursos, anotações ou ações..."
              className="flex-1 bg-transparent text-sm text-[#ece9e2] placeholder-[#9a978f] outline-none font-sans"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="p-1 rounded text-[#9a978f] hover:text-[#ece9e2]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-[#9a978f] bg-[#2a2a2e] rounded">
              ESC
            </kbd>
          </div>

          {/* Lista de resultados */}
          <Command.List className="overflow-y-auto p-2 space-y-2 flex-1 scrollbar-thin">
            {loading && (
              <div className="p-4 text-center text-xs text-[#9a978f] flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-ping" />
                <span>Buscando na biblioteca...</span>
              </div>
            )}

            {!loading &&
              search.length >= 2 &&
              results.courses.length === 0 &&
              results.materials.length === 0 &&
              results.notes.length === 0 && (
                <div className="p-8 text-center text-xs text-[#9a978f] space-y-1">
                  <p className="text-[#ece9e2] font-medium">Nenhum resultado encontrado</p>
                  <p>Tente buscar por outro termo ou conceito.</p>
                </div>
              )}

            {/* Ações Rápidas do Sistema */}
            {search.length === 0 && (
              <Command.Group
                heading="Ações Rápidas"
                className="text-[11px] font-medium text-[#9a978f] px-2 py-1 uppercase tracking-wider"
              >
                <div className="space-y-1 pt-1">
                  <Command.Item
                    onSelect={() => navigateTo("/")}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] cursor-pointer transition select-none"
                  >
                    <Home className="w-4 h-4 text-[#d4af37]" />
                    <span className="font-medium">Início / Continuar Estudos</span>
                    <span className="text-[10px] text-[#9a978f] ml-auto">Dashboard</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => navigateTo("/courses")}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] cursor-pointer transition select-none"
                  >
                    <GraduationCap className="w-4 h-4 text-[#d4af37]" />
                    <span className="font-medium">Meus Cursos</span>
                    <span className="text-[10px] text-[#9a978f] ml-auto">Todos os cursos</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => navigateTo("/questions")}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] cursor-pointer transition select-none"
                  >
                    <HelpCircle className="w-4 h-4 text-[#d4af37]" />
                    <span className="font-medium">Banco de Questões</span>
                    <span className="text-[10px] text-[#9a978f] ml-auto">Treino</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => {
                      setOpen(false);
                      toggleFocusMode();
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] cursor-pointer transition select-none"
                  >
                    <Target className="w-4 h-4 text-[#d4af37]" />
                    <span className="font-medium">Alternar Modo Foco</span>
                    <kbd className="text-[10px] text-[#9a978f] bg-[#2a2a2e] px-1.5 py-0.5 rounded ml-auto">
                      Shift+F
                    </kbd>
                  </Command.Item>

                  {isAdmin && (
                    <>
                      <Command.Item
                        onSelect={() => navigateTo("/admin/courses")}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] cursor-pointer transition select-none"
                      >
                        <Shield className="w-4 h-4 text-[#d4af37]" />
                        <span className="font-medium">Painel Admin — Cursos</span>
                        <span className="text-[10px] text-[#9a978f] ml-auto">Gerenciar</span>
                      </Command.Item>

                      <Command.Item
                        onSelect={() => navigateTo("/admin/invites")}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] cursor-pointer transition select-none"
                      >
                        <Shield className="w-4 h-4 text-[#d4af37]" />
                        <span className="font-medium">Painel Admin — Convites & Alunos</span>
                        <span className="text-[10px] text-[#9a978f] ml-auto">Convidar</span>
                      </Command.Item>

                      <Command.Item
                        onSelect={() => navigateTo("/admin/courses/new")}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] cursor-pointer transition select-none"
                      >
                        <Plus className="w-4 h-4 text-[#d4af37]" />
                        <span className="font-medium">Cadastrar Novo Curso</span>
                        <span className="text-[10px] text-[#9a978f] ml-auto">Google Drive</span>
                      </Command.Item>
                    </>
                  )}
                </div>
              </Command.Group>
            )}

            {/* Cursos Encontrados */}
            {results.courses.length > 0 && (
              <Command.Group
                heading="Cursos"
                className="text-[11px] font-medium text-[#9a978f] px-2 py-1 uppercase tracking-wider"
              >
                <div className="space-y-1 pt-1">
                  {results.courses.map((course) => (
                    <Command.Item
                      key={course.id}
                      onSelect={() => navigateTo(`/courses/${course.slug}`)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] cursor-pointer transition select-none group"
                    >
                      <GraduationCap className="w-4 h-4 text-[#d4af37] group-hover:scale-110 transition shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{course.title}</span>
                        <span className="text-[11px] text-[#9a978f]">
                          {course.materials_count} materiais
                        </span>
                      </div>
                    </Command.Item>
                  ))}
                </div>
              </Command.Group>
            )}

            {/* Aulas e Materiais */}
            {results.materials.length > 0 && (
              <Command.Group
                heading="Aulas e Materiais"
                className="text-[11px] font-medium text-[#9a978f] px-2 py-1 uppercase tracking-wider"
              >
                <div className="space-y-1 pt-1">
                  {results.materials.map((mat) => (
                    <Command.Item
                      key={mat.id}
                      onSelect={() => navigateTo(`/courses/${mat.course_slug}?material=${mat.id}`)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] cursor-pointer transition select-none group"
                    >
                      <Play className="w-4 h-4 text-[#6fbf73] group-hover:scale-110 transition shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium truncate">{mat.title}</span>
                        <span className="text-[10px] text-[#9a978f] truncate">
                          {mat.course_title} &bull; {mat.module_title}
                        </span>
                      </div>
                      {mat.duration_seconds > 0 && (
                        <span className="text-[10px] font-mono text-[#9a978f] shrink-0">
                          {formatTime(mat.duration_seconds)}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </div>
              </Command.Group>
            )}

            {/* Anotações Pessoais */}
            {results.notes.length > 0 && (
              <Command.Group
                heading="Minhas Anotações"
                className="text-[11px] font-medium text-[#9a978f] px-2 py-1 uppercase tracking-wider"
              >
                <div className="space-y-1 pt-1">
                  {results.notes.map((note) => (
                    <Command.Item
                      key={note.id}
                      onSelect={() =>
                        navigateTo(`/courses/${note.course_slug}?material=${note.material_id}`)
                      }
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#ece9e2] hover:bg-[#1b1b1e] hover:text-[#d4af37] cursor-pointer transition select-none group"
                    >
                      <FileText className="w-4 h-4 text-[#f5d76e] group-hover:scale-110 transition shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-[#ece9e2] line-clamp-1">{note.body}</span>
                        <span className="text-[10px] text-[#9a978f] truncate">
                          Aula: {note.material_title} ({note.course_title})
                        </span>
                      </div>
                      {note.timestamp_seconds !== null && (
                        <span className="text-[10px] font-mono text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded shrink-0">
                          ▶ {formatTime(note.timestamp_seconds)}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </div>
              </Command.Group>
            )}
          </Command.List>

          {/* Footer de navegação */}
          <div className="px-4 py-2 border-t border-[#2a2a2e] bg-[#1b1b1e]/50 flex items-center justify-between text-[11px] text-[#9a978f]">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1.5 py-0.5 bg-[#2a2a2e] rounded text-[10px] font-mono text-[#ece9e2] mr-1">
                  &uarr;&darr;
                </kbd>
                Navegar
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-[#2a2a2e] rounded text-[10px] font-mono text-[#ece9e2] mr-1">
                  Enter
                </kbd>
                Selecionar
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#d4af37]">
              <Sparkles className="w-3 h-3" />
              <span>Busca inteligente ativa</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
