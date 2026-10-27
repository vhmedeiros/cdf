import React, { useState, useMemo, useEffect, useRef } from "react";
import { usePlayer, type FlatItem } from "@/context/PlayerContext";
import { i18n } from "@/i18n/pt-BR";
import { formatDuration, cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  PlayCircle,
  FileText,
  Headphones,
  File,
  CheckCircle2,
  Circle,
  Search,
  ChevronsUpDown,
  X,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

interface CourseSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function CourseSidebar({ isOpenMobile, onCloseMobile }: CourseSidebarProps) {
  const { course, activeItem, flatItems, completedIds, selectMaterial, toggleCompleted } =
    usePlayer();

  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll to active item when it changes
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeItem?.material.id]);

  // Overall progress calculation
  const totalMaterials = flatItems.length;
  const completedCount = useMemo(() => {
    return flatItems.filter((item) => completedIds.includes(item.material.id)).length;
  }, [flatItems, completedIds]);

  const progressPercentage =
    totalMaterials > 0 ? Math.round((completedCount / totalMaterials) * 100) : 0;

  // Toggle collapse for all modules
  const toggleCollapseAll = () => {
    if (!course?.modules) return;
    const allCollapsed = course.modules.every((m) => collapsedModules[m.id]);
    const newState: Record<string, boolean> = {};
    if (!allCollapsed) {
      course.modules.forEach((m) => {
        newState[m.id] = true;
      });
    }
    setCollapsedModules(newState);
  };

  const toggleModule = (moduleId: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Filter modules/lessons/materials based on search term
  const filteredModules = useMemo(() => {
    if (!course?.modules) return [];
    if (!searchTerm.trim()) return course.modules;

    const term = searchTerm.toLowerCase();

    return course.modules
      .map((mod) => {
        const matchesModule = mod.title.toLowerCase().includes(term);
        const filteredLessons = mod.lessons
          .map((lesson) => {
            const matchesLesson = lesson.title.toLowerCase().includes(term);
            const matchingMaterials = lesson.materials.filter((mat) =>
              mat.title.toLowerCase().includes(term),
            );

            if (matchesLesson || matchingMaterials.length > 0) {
              return {
                ...lesson,
                materials: matchesLesson ? lesson.materials : matchingMaterials,
              };
            }
            return null;
          })
          .filter(Boolean) as typeof mod.lessons;

        if (matchesModule || filteredLessons.length > 0) {
          return {
            ...mod,
            lessons: matchesModule ? mod.lessons : filteredLessons,
          };
        }
        return null;
      })
      .filter(Boolean) as typeof course.modules;
  }, [course, searchTerm]);

  function getKindIcon(kind: string) {
    switch (kind) {
      case "video":
        return <PlayCircle className="w-4 h-4 text-[#d4af37] shrink-0" />;
      case "audio":
        return <Headphones className="w-4 h-4 text-[#6fbf73] shrink-0" />;
      case "pdf":
        return <FileText className="w-4 h-4 text-[#f5d76e] shrink-0" />;
      default:
        return <File className="w-4 h-4 text-[#9a978f] shrink-0" />;
    }
  }

  const content = (
    <div className="flex flex-col h-full bg-[#131315] border-r border-[#2a2a2e] text-[#ece9e2]">
      {/* Header & Overall Course Progress */}
      <div className="p-4 border-b border-[#2a2a2e] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide uppercase text-[#9a978f]">
            {i18n.course.modules}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleCollapseAll}
              title={i18n.common.expandAll}
              className="p-1 rounded text-xs text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e] transition"
            >
              <ChevronsUpDown className="w-4 h-4" />
            </button>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1 rounded text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-[#9a978f]">{i18n.course.progress}</span>
            <span className="font-mono text-[#d4af37] font-medium">
              {completedCount}/{totalMaterials} ({progressPercentage}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#1b1b1e] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#d4af37] to-[#f5d76e] transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Search within Course */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[#9a978f]" />
          <input
            type="text"
            placeholder={i18n.course.searchInCourse}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#1b1b1e] border border-[#2a2a2e] rounded-lg text-[#ece9e2] placeholder-[#9a978f] focus:outline-none focus:border-[#d4af37]"
          />
        </div>

        {/* Link para o Caderno de Estudos */}
        {course?.slug && (
          <Link
            href={`/courses/${course.slug}/caderno`}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] text-xs text-[#9a978f] hover:text-[#d4af37] transition font-medium"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Caderno de Estudos
          </Link>
        )}
      </div>

      {/* Modules Tree */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1b1b1e]">
        {filteredModules.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#9a978f]">{i18n.course.noLessonsFound}</div>
        ) : (
          filteredModules.map((mod) => {
            const isCollapsed = collapsedModules[mod.id];
            // Module progress
            const modMaterials = mod.lessons.flatMap((l) => l.materials);
            const modCompleted = modMaterials.filter((m) => completedIds.includes(m.id)).length;
            const isModComplete = modMaterials.length > 0 && modCompleted === modMaterials.length;

            return (
              <div key={mod.id} className="group">
                {/* Module Header Button */}
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-[#1b1b1e]/50 transition group-hover:text-[#d4af37]"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-[#9a978f] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#9a978f] shrink-0" />
                    )}
                    <span className="font-medium text-xs text-[#ece9e2] truncate group-hover:text-[#d4af37]">
                      {mod.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-[#9a978f]">
                      {modCompleted}/{modMaterials.length}
                    </span>
                    {isModComplete && <CheckCircle2 className="w-3.5 h-3.5 text-[#6fbf73]" />}
                  </div>
                </button>

                {/* Lessons & Materials in Module */}
                {!isCollapsed && (
                  <div className="pb-2 space-y-1 bg-[#0b0b0c]/40">
                    {mod.lessons.map((lesson) => (
                      <div key={lesson.id} className="px-2">
                        {/* If lesson has a distinct title or multiple materials */}
                        {mod.lessons.length > 1 && (
                          <button
                            onClick={() => {
                              const primaryMat =
                                lesson.materials.find((m) => m.kind === "video") ||
                                lesson.materials[0];
                              if (primaryMat) {
                                selectMaterial(primaryMat.id, true);
                                onCloseMobile?.();
                              }
                            }}
                            className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-[#9a978f] hover:text-[#d4af37] tracking-wide transition flex items-center justify-between"
                          >
                            <span className="truncate">{lesson.title}</span>
                          </button>
                        )}

                        {lesson.materials.map((mat) => {
                          const isActive = activeItem?.material.id === mat.id;
                          const isCompleted = completedIds.includes(mat.id);

                          return (
                            <div
                              key={mat.id}
                              className={cn(
                                "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition group/item",
                                isActive
                                  ? "bg-[#1b1b1e] border-l-2 border-[#d4af37] text-[#ece9e2] font-medium shadow-sm"
                                  : "text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e]/40",
                              )}
                            >
                              <button
                                ref={isActive ? activeItemRef : null}
                                onClick={() => {
                                  selectMaterial(mat.id, true);
                                  onCloseMobile?.();
                                }}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                              >
                                {getKindIcon(mat.kind)}
                                <span className="truncate flex-1">{mat.title}</span>
                              </button>

                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {mat.duration_seconds > 0 && (
                                  <span className="text-[10px] font-mono tabular-nums text-[#9a978f]">
                                    {formatDuration(mat.duration_seconds)}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCompleted(mat.id);
                                  }}
                                  title={
                                    isCompleted
                                      ? i18n.course.markPending
                                      : i18n.course.markCompleted
                                  }
                                  className="text-[#9a978f] hover:text-[#d4af37] transition"
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-[#6fbf73]" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-[#2a2a2e] hover:text-[#9a978f]" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-80 lg:w-96 shrink-0 h-[calc(100vh-4rem)] sticky top-16">
        {content}
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-[#131315] shadow-xl animate-in slide-in-from-right duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
