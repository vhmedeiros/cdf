import React from "react";
import Link from "next/link";
import { Play, RotateCcw, Clock, BookOpen, Sparkles } from "lucide-react";
import type { LastStudiedMaterial } from "@/models/stats";

interface HeroResumeProps {
  lastStudied: LastStudiedMaterial | null;
}

export default function HeroResume({ lastStudied }: HeroResumeProps) {
  if (!lastStudied) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#131315] via-[#1b1b1e] to-[#131315] border border-[#2a2a2e] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20 text-xs text-[#d4af37]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bem-vindo à Biblioteca Noturna</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#ece9e2]">
              Comece sua jornada de estudos
            </h2>
            <p className="text-sm text-[#9a978f] leading-relaxed">
              Explore o catálogo de cursos e dê o primeiro passo para a sua aprovação.
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#a8892c] text-black font-semibold text-sm hover:brightness-110 transition shadow-lg shadow-[#d4af37]/10 shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            <span>Ver Cursos Disponíveis</span>
          </Link>
        </div>
      </div>
    );
  }

  const {
    material_id,
    material_title,
    lesson_title,
    course_title,
    course_slug,
    position_seconds,
    duration_seconds,
    is_completed,
  } = lastStudied;

  const percent =
    duration_seconds > 0
      ? Math.min(100, Math.round((position_seconds / duration_seconds) * 100))
      : 0;

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const resumeUrl = `/courses/${course_slug}?material=${material_id}`;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#131315] via-[#1b1b1e] to-[#131315] border border-[#d4af37]/30 p-6 sm:p-8 shadow-xl shadow-black/40 group hover:border-[#d4af37]/50 transition duration-300">
      {/* Glow dourado de fundo */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-xs font-medium text-[#d4af37]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
              Continuar de onde você parou
            </span>
            <span className="text-xs text-[#9a978f]">• {course_title}</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#ece9e2] group-hover:text-[#f5d76e] transition">
              {material_title}
            </h2>
            <p className="text-xs sm:text-sm text-[#9a978f] mt-0.5">Aula: {lesson_title}</p>
          </div>

          {/* Barra de progresso */}
          <div className="max-w-md pt-1 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#9a978f] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(position_seconds)} / {formatTime(duration_seconds)}
              </span>
              <span className="font-mono text-[#d4af37] font-semibold">{percent}%</span>
            </div>
            <div className="w-full h-2 bg-[#0b0b0c] rounded-full overflow-hidden border border-[#2a2a2e]">
              <div
                className="h-full bg-gradient-to-r from-[#d4af37] to-[#f5d76e] transition-all duration-500 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Botão de ação direta */}
        <div className="shrink-0 flex items-center gap-3">
          <Link
            href={resumeUrl}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#a8892c] text-black font-semibold text-sm hover:brightness-110 active:scale-95 transition shadow-lg shadow-[#d4af37]/15"
          >
            {is_completed ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Reassistir Aula</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Retomar em {formatTime(position_seconds)}</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
