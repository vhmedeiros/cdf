import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import {
  BookOpen,
  ArrowLeft,
  Search,
  Star,
  Download,
  Play,
  Calendar,
  Layers,
  StickyNote,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface NoteDetail {
  id: string;
  material_id: string;
  course_id: string;
  timestamp_seconds: number | null;
  body: string;
  is_important: boolean;
  created_at: string;
  updated_at: string;
  material_title?: string;
  lesson_title?: string;
  module_title?: string;
}

export default function CourseNotebookPage() {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const [course, setCourse] = useState<any>(null);
  const [notes, setNotes] = useState<NoteDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyImportant, setOnlyImportant] = useState(false);

  // Carrega dados do curso e anotações
  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    fetch(`/api/v1/courses/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar curso");
        return res.json();
      })
      .then((courseData) => {
        setCourse(courseData);
        return fetch(`/api/v1/notes?course_id=${courseData.id}`);
      })
      .then((res) => (res.ok ? res.json() : []))
      .then((notesData) => {
        setNotes(notesData);
      })
      .catch((err) => {
        console.error("Erro ao carregar caderno:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  // Filtra as anotações
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (onlyImportant && !n.is_important) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesBody = n.body.toLowerCase().includes(q);
        const matchesLesson = n.lesson_title?.toLowerCase().includes(q);
        const matchesModule = n.module_title?.toLowerCase().includes(q);
        return matchesBody || matchesLesson || matchesModule;
      }
      return true;
    });
  }, [notes, onlyImportant, search]);

  // Agrupa anotações por módulo e aula
  const groupedNotes = useMemo(() => {
    const map = new Map<string, Map<string, NoteDetail[]>>();

    for (const note of filteredNotes) {
      const mod = note.module_title || "Módulo Geral";
      const les = note.lesson_title || "Aula";

      if (!map.has(mod)) {
        map.set(mod, new Map());
      }
      const modMap = map.get(mod)!;
      if (!modMap.has(les)) {
        modMap.set(les, []);
      }
      modMap.get(les)!.push(note);
    }

    return map;
  }, [filteredNotes]);

  // Função para exportar em arquivo Markdown (.md)
  const exportToMarkdown = () => {
    if (!course || notes.length === 0) return;

    let md = `# Caderno de Estudos — ${course.title}\n\n`;
    md += `*Exportado em: ${new Date().toLocaleDateString("pt-BR")}*\n`;
    md += `*Total de anotações: ${notes.length}*\n\n---\n\n`;

    for (const [modTitle, lessonsMap] of groupedNotes.entries()) {
      md += `## 📚 ${modTitle}\n\n`;
      for (const [lessonTitle, lessonNotes] of lessonsMap.entries()) {
        md += `### 📖 ${lessonTitle}\n\n`;
        for (const note of lessonNotes) {
          const time =
            note.timestamp_seconds !== null
              ? `\`[${formatDuration(note.timestamp_seconds)}]\``
              : "";
          const star = note.is_important ? " ⭐ **IMPORTANTE**" : "";
          const date = new Date(note.created_at).toLocaleDateString("pt-BR");

          md += `- ${time}${star} ${note.body} *(criado em ${date})*\n`;
        }
        md += "\n";
      }
      md += "---\n\n";
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Caderno_${course.slug}_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Head>
        <title>{course ? `Caderno de Estudos — ${course.title}` : "Caderno de Estudos"}</title>
      </Head>

      <div className="min-h-screen bg-[#0b0b0c] text-[#ece9e2]">
        {/* Barra superior de navegação */}
        <header className="border-b border-[#2a2a2e] bg-[#131315]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/courses/${slug}`}
                className="p-2 rounded-xl bg-[#1b1b1e] hover:bg-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] transition flex items-center gap-1.5 text-xs font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar à Sala de Aula
              </Link>

              <div className="h-4 w-px bg-[#2a2a2e]" />

              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-[#d4af37]" />
                <span className="font-semibold truncate max-w-xs sm:max-w-md">
                  {course?.title || "Carregando..."}
                </span>
                <span className="text-xs text-[#9a978f]">/ Caderno</span>
              </div>
            </div>

            <button
              onClick={exportToMarkdown}
              disabled={notes.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] text-xs font-semibold text-[#ece9e2] hover:text-[#d4af37] transition flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Markdown (.md)
            </button>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Título e estatísticas */}
          <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#ece9e2] mb-1">
                Caderno de Estudos Digital
              </h1>
              <p className="text-xs sm:text-sm text-[#9a978f]">
                Todas as anotações, destaques e insights que você tomou ao longo deste curso.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-[#1b1b1e] border border-[#2a2a2e] px-3 py-2 rounded-xl text-center">
                <span className="block text-base font-bold text-[#d4af37]">{notes.length}</span>
                <span className="text-[#9a978f] text-[10px]">Anotações</span>
              </div>
              <div className="bg-[#1b1b1e] border border-[#2a2a2e] px-3 py-2 rounded-xl text-center">
                <span className="block text-base font-bold text-[#f5d76e]">
                  {notes.filter((n) => n.is_important).length}
                </span>
                <span className="text-[#9a978f] text-[10px]">Importantes</span>
              </div>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131315] border border-[#2a2a2e] p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9a978f] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar em todas as anotações, aulas e módulos..."
                className="w-full bg-[#1b1b1e] border border-[#2a2a2e] rounded-lg pl-9 pr-3 py-2 text-xs text-[#ece9e2] placeholder-[#9a978f]/60 focus:border-[#d4af37] outline-none transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOnlyImportant((prev) => !prev)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                  onlyImportant
                    ? "bg-[#d4af37] text-black border-[#d4af37]"
                    : "bg-[#1b1b1e] text-[#9a978f] border-[#2a2a2e] hover:text-[#ece9e2]"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${onlyImportant ? "fill-black" : ""}`} />
                Apenas Importantes
              </button>
            </div>
          </div>

          {/* Lista agrupada de anotações */}
          {loading ? (
            <div className="py-16 text-center text-sm text-[#9a978f]">Carregando caderno...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="bg-[#131315] border border-dashed border-[#2a2a2e] rounded-2xl py-16 text-center text-[#9a978f] space-y-2">
              <StickyNote className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm font-medium">Nenhuma anotação encontrada.</p>
              <p className="text-xs text-[#9a978f]/70">
                Pressione a tecla{" "}
                <kbd className="font-mono bg-[#1b1b1e] px-1 py-0.5 rounded border border-[#2a2a2e]">
                  N
                </kbd>{" "}
                enquanto assiste às aulas para anotar momentos importantes.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(groupedNotes.entries()).map(([moduleTitle, lessonsMap]) => (
                <div
                  key={moduleTitle}
                  className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#d4af37] pb-3 border-b border-[#2a2a2e]">
                    <Layers className="w-4 h-4" />
                    <h2>{moduleTitle}</h2>
                  </div>

                  <div className="space-y-4">
                    {Array.from(lessonsMap.entries()).map(([lessonTitle, lessonNotes]) => (
                      <div key={lessonTitle} className="space-y-2.5">
                        <h3 className="text-xs font-semibold text-[#ece9e2] uppercase tracking-wider pl-1">
                          📖 {lessonTitle}
                        </h3>

                        <div className="grid gap-2.5">
                          {lessonNotes.map((note) => (
                            <div
                              key={note.id}
                              className={`bg-[#1b1b1e] border rounded-xl p-4 transition ${
                                note.is_important
                                  ? "border-[#d4af37]/60 bg-[#1b1b1e]"
                                  : "border-[#2a2a2e] hover:border-[#3a3a3e]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-xs">
                                  {note.timestamp_seconds !== null ? (
                                    <Link
                                      href={`/courses/${slug}`}
                                      className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#131315] border border-[#2a2a2e] text-[#d4af37] hover:bg-[#d4af37] hover:text-black transition"
                                      title="Abrir aula neste momento"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                      {formatDuration(note.timestamp_seconds)}
                                    </Link>
                                  ) : (
                                    <span className="text-[10px] text-[#9a978f] bg-[#131315] px-2 py-0.5 rounded border border-[#2a2a2e]">
                                      Geral
                                    </span>
                                  )}

                                  <span className="text-[11px] text-[#9a978f] flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(note.created_at).toLocaleDateString("pt-BR", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>

                                {note.is_important && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded-full border border-[#d4af37]/30">
                                    <Star className="w-3 h-3 fill-[#d4af37]" /> Importante
                                  </span>
                                )}
                              </div>

                              <p className="text-xs sm:text-sm text-[#ece9e2] whitespace-pre-wrap leading-relaxed">
                                {note.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
