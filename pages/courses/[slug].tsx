import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { usePlayer } from "@/context/PlayerContext";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { useShortcuts } from "@/hooks/useShortcuts";
import { i18n } from "@/i18n/pt-BR";
import { formatDuration } from "@/lib/utils";
import type { CourseTree } from "@/models/course";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Tv,
  Keyboard,
  CheckCircle2,
  Circle,
  FileText,
  AlertCircle,
  Download,
  BookOpen,
  Target,
  X,
  Shield,
  Headphones,
  Video,
  StickyNote,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import PomodoroTimer from "@/components/player/PomodoroTimer";
import NotesSection from "@/components/player/NotesSection";
import UserMenu from "@/components/ui/UserMenu";
import { useUser } from "@/hooks/useUser";

const VideoPlayer = dynamic(() => import("@/components/player/VideoPlayer"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-[#131315] animate-pulse rounded-xl flex items-center justify-center text-[#9a978f] border border-[#2a2a2e]">
      {i18n.common.loading}
    </div>
  ),
});

const PdfViewer = dynamic(() => import("@/components/player/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-[#131315] animate-pulse rounded-xl flex items-center justify-center text-[#9a978f] border border-[#2a2a2e]">
      {i18n.common.loading}
    </div>
  ),
});

const DocumentViewer = dynamic(() => import("@/components/player/DocumentViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-[#131315] animate-pulse rounded-xl flex items-center justify-center text-[#9a978f] border border-[#2a2a2e]">
      Carregando visualizador de documento...
    </div>
  ),
});

const AudioPlayer = dynamic(() => import("@/components/player/AudioPlayer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-[#131315] animate-pulse rounded-xl flex items-center justify-center text-[#9a978f] border border-[#2a2a2e]">
      {i18n.common.loading}
    </div>
  ),
});

export default function CourseClassroomPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { isAdmin } = useUser();

  const {
    course,
    setCourse,
    activeItem,
    audioMode,
    toggleAudioMode,
    theaterMode,
    toggleTheater,
    focusMode,
    toggleFocusMode,
    toggleShortcutsModal,
    completedIds,
    toggleCompleted,
    playNext,
    playPrevious,
  } = usePlayer();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "materials">("overview");
  const [mobileTab, setMobileTab] = useState<"lessons" | "notes" | "materials">("lessons");

  // Fetch course tree
  const { data, error, isLoading } = useSWR<CourseTree>(slug ? `/api/v1/courses/${slug}` : null);

  // Sync loaded course tree with player context
  useEffect(() => {
    if (data && (!course || course.id !== data.id)) {
      setCourse(data);
    }
  }, [data, course, setCourse]);

  // Global keyboard shortcuts hook
  useShortcuts();

  const isCompleted = activeItem ? completedIds.includes(activeItem.material.id) : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0b0c] flex items-center justify-center text-[#9a978f]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">{i18n.common.loading}</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isForbidden = error.status === 403;
    return (
      <div className="min-h-screen bg-[#0b0b0c] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-[#d4af37] mx-auto" />
          <h1 className="text-lg font-semibold text-[#ece9e2]">
            {isForbidden ? i18n.course.notEnrolled : i18n.common.error}
          </h1>
          <p className="text-xs text-[#9a978f]">
            {error.message || "Não foi possível carregar as informações desta aula."}
          </p>
          <Link
            href="/courses"
            className="inline-block px-4 py-2 bg-[#d4af37] text-black font-semibold text-xs rounded-lg hover:bg-[#f5d76e] transition"
          >
            Voltar para Cursos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{course ? `${course.title} — Aula` : "Aula"}</title>
      </Head>

      <div className="min-h-screen flex flex-col bg-[#0b0b0c] text-[#ece9e2]">
        {/* Top Navbar ou Floating Focus Bar */}
        {focusMode ? (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-[#131315]/95 backdrop-blur-md border border-[#d4af37]/40 px-3.5 py-1.5 rounded-xl shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
              <span className="text-xs font-medium text-[#d4af37]">Modo Foco</span>
            </div>
            <PomodoroTimer />
            <button
              onClick={toggleFocusMode}
              className="p-1.5 rounded-lg bg-[#1b1b1e] hover:bg-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] transition flex items-center gap-1.5 text-xs ml-2"
              title="Sair do Modo Foco (Shift+F)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Sair (Shift+F)</span>
            </button>
          </div>
        ) : (
          <header className="h-16 border-b border-[#2a2a2e] bg-[#131315]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/courses"
                className="p-2 rounded-lg bg-[#1b1b1e] border border-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] hover:border-[#d4af37] transition"
                title="Voltar para lista de cursos"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>

              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-[#ece9e2] truncate font-serif">
                  {course?.title || "Carregando curso..."}
                </h1>
                {activeItem && (
                  <p className="text-xs text-[#9a978f] truncate">
                    {activeItem.module.title} &bull; {activeItem.lesson.title}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Painel Admin (apenas para administradores) */}
              {isAdmin && (
                <Link
                  href="/admin/courses"
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37]/20 transition text-xs font-semibold shadow-sm"
                  title="Painel Admin"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </Link>
              )}

              {/* Pomodoro Timer */}
              <PomodoroTimer />

              {/* Link para o Caderno do Curso */}
              {slug && (
                <Link
                  href={`/courses/${slug}/caderno`}
                  className="hidden lg:flex items-center gap-1.5 p-2 rounded-lg text-xs text-[#9a978f] hover:text-[#d4af37] hover:bg-[#1b1b1e] transition border border-transparent hover:border-[#2a2a2e]"
                  title="Abrir Caderno de Estudos do Curso"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Caderno</span>
                </Link>
              )}

              <button
                onClick={toggleShortcutsModal}
                className="p-2 rounded-lg text-[#9a978f] hover:text-[#d4af37] hover:bg-[#1b1b1e] transition"
                title="Atalhos do teclado (?)"
              >
                <Keyboard className="w-4 h-4" />
              </button>

              <button
                onClick={toggleFocusMode}
                className={`hidden sm:flex p-2 rounded-lg transition ${
                  focusMode
                    ? "text-[#d4af37] bg-[#1b1b1e]"
                    : "text-[#9a978f] hover:text-[#d4af37] hover:bg-[#1b1b1e]"
                }`}
                title="Modo Foco (Shift+F)"
              >
                <Target className="w-4 h-4" />
              </button>

              <button
                onClick={toggleTheater}
                className={`hidden sm:flex p-2 rounded-lg transition ${
                  theaterMode
                    ? "text-[#d4af37] bg-[#1b1b1e]"
                    : "text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e]"
                }`}
                title="Modo Teatro (T)"
              >
                <Tv className="w-4 h-4" />
              </button>

              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e] transition"
                title="Abrir conteúdo do curso"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="pl-1 border-l border-[#2a2a2e]">
                <UserMenu />
              </div>
            </div>
          </header>
        )}

        {/* Main Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row min-w-0">
          {/* Main Media & Details Area */}
          <main
            className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 transition-all duration-300 ${
              theaterMode ? "max-w-none" : "max-w-6xl mx-auto"
            }`}
          >
            {/* Player Container */}
            <div className="mb-6">
              {activeItem ? (
                audioMode || activeItem.material.kind === "audio" ? (
                  <AudioPlayer />
                ) : activeItem.material.kind === "video" ? (
                  <VideoPlayer />
                ) : (
                  <DocumentViewer
                    materialId={activeItem.material.id}
                    driveFileId={activeItem.material.drive_file_id}
                    title={activeItem.material.title}
                    mime={activeItem.material.mime}
                    kind={activeItem.material.kind}
                    sizeBytes={activeItem.material.size_bytes}
                  />
                )
              ) : (
                <div className="w-full aspect-video bg-[#131315] rounded-xl flex items-center justify-center text-[#9a978f] border border-[#2a2a2e]">
                  Selecione uma aula na barra lateral para começar
                </div>
              )}
            </div>

            {/* Lesson Title & Quick Actions */}
            {activeItem && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a2e]">
                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-bold text-[#ece9e2]">
                      {activeItem.material.title}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-[#9a978f]">
                      <span>{activeItem.lesson.title}</span>
                      {activeItem.material.duration_seconds > 0 && (
                        <>
                          <span>&bull;</span>
                          <span className="font-mono tabular-nums">
                            {formatDuration(activeItem.material.duration_seconds)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mark Completed + Navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCompleted(activeItem.material.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        isCompleted
                          ? "bg-[#6fbf73]/10 border-[#6fbf73]/40 text-[#6fbf73]"
                          : "bg-[#1b1b1e] border-[#2a2a2e] text-[#ece9e2] hover:border-[#d4af37]"
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Concluída</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-[#9a978f]" />
                          <span>Marcar Concluída</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={playPrevious}
                      className="p-1.5 rounded-lg bg-[#1b1b1e] border border-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] hover:border-[#d4af37] transition"
                      title="Aula anterior (Shift+P)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={playNext}
                      className="p-1.5 rounded-lg bg-[#1b1b1e] border border-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] hover:border-[#d4af37] transition"
                      title="Próxima aula (Shift+N)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {/* Alternância de Áudio/Vídeo rápida */}
                    <button
                      onClick={toggleAudioMode}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${audioMode ? "bg-[#d4af37]/15 border-[#d4af37]/40 text-[#d4af37]" : "bg-[#1b1b1e] border-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] hover:border-[#d4af37]"}`}
                      title={audioMode ? "Voltar ao Vídeo (A)" : "Modo Áudio (A)"}
                    >
                      {audioMode ? (
                        <>
                          <Video className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Voltar ao Vídeo</span>
                        </>
                      ) : (
                        <>
                          <Headphones className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Modo Áudio</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Mobile Tabs Controller (Visível em smartphones < md) */}
                <div className="md:hidden space-y-4 pt-2">
                  <div className="flex bg-[#131315] border border-[#2a2a2e] rounded-xl p-1 gap-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setMobileTab("lessons")}
                      className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                        mobileTab === "lessons"
                          ? "bg-[#1b1b1e] text-[#d4af37] shadow-sm border border-[#d4af37]/30"
                          : "text-[#9a978f] hover:text-[#ece9e2]"
                      }`}
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Aulas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileTab("notes")}
                      className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                        mobileTab === "notes"
                          ? "bg-[#1b1b1e] text-[#d4af37] shadow-sm border border-[#d4af37]/30"
                          : "text-[#9a978f] hover:text-[#ece9e2]"
                      }`}
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                      <span>Anotações</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileTab("materials")}
                      className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                        mobileTab === "materials"
                          ? "bg-[#1b1b1e] text-[#d4af37] shadow-sm border border-[#d4af37]/30"
                          : "text-[#9a978f] hover:text-[#ece9e2]"
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Materiais ({activeItem.lesson.materials.length})</span>
                    </button>
                  </div>

                  {/* Aba Mobile: Grade de Aulas do Curso */}
                  {mobileTab === "lessons" && (
                    <div className="animate-in fade-in duration-200">
                      <CourseSidebar variant="inline" />
                    </div>
                  )}

                  {/* Aba Mobile: Anotações com Timestamp */}
                  {mobileTab === "notes" && (
                    <div className="animate-in fade-in duration-200">
                      <NotesSection />
                    </div>
                  )}

                  {/* Aba Mobile: Materiais de Apoio e Downloads */}
                  {mobileTab === "materials" && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 gap-2">
                        {activeItem.lesson.materials.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-3.5 rounded-xl bg-[#131315] border border-[#2a2a2e]"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-medium text-[#ece9e2] truncate">
                                {m.title}
                              </p>
                              <span className="text-[10px] uppercase font-mono text-[#9a978f]">
                                {m.kind}
                              </span>
                            </div>
                            <a
                              href={`/api/v1/stream/${m.id}`}
                              download
                              className="p-2 rounded-lg bg-[#1b1b1e] border border-[#2a2a2e] text-[#9a978f] hover:text-[#d4af37] transition"
                              title="Baixar material"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                      {course?.description && (
                        <div className="p-4 rounded-xl bg-[#131315] border border-[#2a2a2e] text-xs text-[#9a978f] leading-relaxed">
                          <p className="font-semibold text-[#ece9e2] mb-1">Sobre o curso:</p>
                          <p>{course.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop Tabs & Notes Section (Visível apenas em md+) */}
                <div className="hidden md:block space-y-4 pt-2">
                  <div className="flex gap-4 border-b border-[#2a2a2e]">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`pb-2 text-xs font-medium border-b-2 transition ${
                        activeTab === "overview"
                          ? "border-[#d4af37] text-[#d4af37]"
                          : "border-transparent text-[#9a978f] hover:text-[#ece9e2]"
                      }`}
                    >
                      Visão Geral
                    </button>
                    <button
                      onClick={() => setActiveTab("materials")}
                      className={`pb-2 text-xs font-medium border-b-2 transition ${
                        activeTab === "materials"
                          ? "border-[#d4af37] text-[#d4af37]"
                          : "border-transparent text-[#9a978f] hover:text-[#ece9e2]"
                      }`}
                    >
                      Materiais da Aula ({activeItem.lesson.materials.length})
                    </button>
                  </div>

                  {activeTab === "overview" ? (
                    <div className="text-xs text-[#9a978f] leading-relaxed space-y-2">
                      <p>
                        Esta aula faz parte do módulo{" "}
                        <strong className="text-[#ece9e2]">{activeItem.module.title}</strong>.
                      </p>
                      {course?.description && (
                        <p className="pt-2 text-[#ece9e2]/80">{course.description}</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeItem.lesson.materials.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#131315] border border-[#2a2a2e]"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-medium text-[#ece9e2] truncate">{m.title}</p>
                            <span className="text-[10px] uppercase font-mono text-[#9a978f]">
                              {m.kind}
                            </span>
                          </div>
                          <a
                            href={`/api/v1/stream/${m.id}`}
                            download
                            className="p-1 rounded text-[#9a978f] hover:text-[#d4af37] transition"
                            title="Baixar material"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Seção de Anotações com Timestamp */}
                  <div className="pt-4">
                    <NotesSection />
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Sidebar */}
          {!focusMode && (
            <CourseSidebar
              isOpenMobile={mobileSidebarOpen}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          )}
        </div>
      </div>
    </>
  );
}
