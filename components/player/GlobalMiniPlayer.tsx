import React from "react";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/lib/utils";
import { Play, Pause, X, Maximize2, SkipForward } from "lucide-react";
import useRouter from "next/router";

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
      {/* Video preview / compact bar */}
      <div className="relative aspect-video bg-black flex items-center justify-center group">
        <video
          src={`/api/v1/stream/${activeItem.material.id}`}
          className="w-full h-full object-contain"
          playsInline
          muted
          autoPlay
          onTimeUpdate={(e) => {
            // Keep preview synced
          }}
        />

        {/* Floating Top Controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90">
          <button
            onClick={handleReturnToClass}
            className="p-1 rounded-md bg-black/60 text-[#ece9e2] hover:text-[#d4af37] hover:bg-black/90 transition"
            title="Expandir para aula completa"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closeMiniPlayer}
            className="p-1 rounded-md bg-black/60 text-[#ece9e2] hover:text-[#e5484d] hover:bg-black/90 transition"
            title="Fechar mini player"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Play/Pause Center on Hover */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:scale-105"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
        </button>
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
              className="p-1 rounded text-[#ece9e2] hover:text-[#d4af37] transition"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>
            <button
              onClick={playNext}
              className="p-1 rounded text-[#9a978f] hover:text-[#ece9e2] transition"
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
