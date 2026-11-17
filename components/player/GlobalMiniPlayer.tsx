import React from "react";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/lib/utils";
import { Play, Pause, X, Maximize2, SkipForward, PlayCircle } from "lucide-react";

export function GlobalMiniPlayer() {
  const {
    activeItem,
    course,
    isPlaying,
    currentTime,
    duration,
    miniPlayer,
    closeMiniPlayer,
    togglePlay,
    playNext,
  } = usePlayer();

  if (!miniPlayer || !activeItem) return null;

  const handleReturnToClass = () => {
    closeMiniPlayer();
    if (course?.slug) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-2xl bg-[#131315]/95 border border-[#2a2a2e] shadow-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
      {/* Compact preview without opening a second media stream */}
      <div className="relative h-24 bg-gradient-to-br from-[#1b1b1e] to-[#0b0b0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-1">
          <PlayCircle className="w-8 h-8 text-[#d4af37]" />
          <span className="text-[10px] uppercase tracking-widest text-[#9a978f]">Mini player</span>
        </div>

        {/* Floating Top Controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90">
          <button
            onClick={handleReturnToClass}
            className="flex min-h-9 min-w-9 items-center justify-center rounded-md bg-black/60 text-[#ece9e2] hover:text-[#d4af37] hover:bg-black/90 transition touch-manipulation"
            title="Expandir para aula completa"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={closeMiniPlayer}
            className="flex min-h-9 min-w-9 items-center justify-center rounded-md bg-black/60 text-[#ece9e2] hover:text-[#e5484d] hover:bg-black/90 transition touch-manipulation"
            title="Fechar mini player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/60 border border-white/20 text-white transition hover:scale-105 touch-manipulation"
          aria-label={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current" />
          )}
        </button>

        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
          <div
            className="h-full bg-[#d4af37] transition-[width] duration-300"
            style={{
              width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Info & Bottom Controls */}
      <div className="p-3 bg-[#131315]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="min-w-0 pr-2">
            <h4 className="text-xs font-semibold text-[#ece9e2] truncate">
              {activeItem.material.title}
            </h4>
            <p className="text-[10px] text-[#9a978f] truncate">{course?.title}</p>
          </div>
          <span className="font-mono text-[10px] text-[#d4af37] tabular-nums shrink-0">
            {formatDuration(currentTime)} /{" "}
            {formatDuration(duration || activeItem.material.duration_seconds)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#1b1b1e]">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="flex min-h-11 min-w-11 items-center justify-center rounded text-[#ece9e2] hover:text-[#d4af37] transition touch-manipulation"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>
            <button
              onClick={playNext}
              className="flex min-h-11 min-w-11 items-center justify-center rounded text-[#9a978f] hover:text-[#ece9e2] transition touch-manipulation"
              title="Próxima aula"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleReturnToClass}
            className="text-[10px] font-medium text-[#d4af37] hover:underline"
          >
            Voltar à aula
          </button>
        </div>
      </div>
    </div>
  );
}
