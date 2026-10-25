import React, { useRef, useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/lib/utils";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Headphones,
  Tv,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
} from "lucide-react";

export default function AudioPlayer() {
  const {
    activeItem,
    course,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    playerRef,
    togglePlay,
    seek,
    seekTo,
    setPlaybackRate,
    setVolume,
    toggleMute,
    toggleAudioMode,
    playNext,
    playPrevious,
  } = usePlayer();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const materialId = activeItem?.material.id;
  const streamSrc = materialId ? `/api/v1/stream/${materialId}` : "";

  // Assign internal audio ref to playerRef
  useEffect(() => {
    if (audioRef.current) {
      playerRef.current = audioRef.current;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [playerRef, playbackRate, volume, isMuted]);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.play().catch(() => {});
    }
  }, [materialId, isPlaying]);

  return (
    <div className="w-full bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-[#ece9e2] shadow-xl relative overflow-hidden">
      <audio
        ref={audioRef}
        src={streamSrc}
        onTimeUpdate={(e) => seekTo(e.currentTarget.currentTime)}
        onEnded={playNext}
      />

      {/* Decorative Golden Audio Glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Audio Icon / Album Art */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#1b1b1e] to-[#0b0b0c] border border-[#2a2a2e] flex items-center justify-center shadow-lg mb-6 relative group">
        <Headphones className="w-10 h-10 sm:w-12 sm:h-12 text-[#d4af37] animate-pulse" />
        {activeItem?.material.kind === "video" && (
          <button
            onClick={toggleAudioMode}
            className="absolute inset-0 bg-black/70 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-xs text-[#d4af37] transition font-medium gap-1"
          >
            <Tv className="w-5 h-5" />
            Voltar ao Vídeo
          </button>
        )}
      </div>

      {/* Title & Course Info */}
      <div className="text-center max-w-lg mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-[#ece9e2] truncate mb-1">
          {activeItem?.material.title}
        </h3>
        <p className="text-xs text-[#9a978f] truncate">
          {course?.title} • {activeItem?.lesson.title}
        </p>
      </div>

      {/* Progress Timeline */}
      <div className="w-full max-w-md mb-6">
        <input
          type="range"
          min={0}
          max={duration || activeItem?.material.duration_seconds || 100}
          value={currentTime}
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-[#2a2a2e] accent-[#d4af37] rounded-lg cursor-pointer"
        />
        <div className="flex justify-between items-center text-xs font-mono text-[#9a978f] mt-2">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration || activeItem?.material.duration_seconds)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-4 sm:gap-6 mb-4">
        <button
          onClick={playPrevious}
          className="p-2 rounded-full hover:bg-[#1b1b1e] text-[#9a978f] hover:text-[#ece9e2] transition"
          title="Aula Anterior"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={() => seek(-10)}
          className="p-2 rounded-full hover:bg-[#1b1b1e] text-[#9a978f] hover:text-[#ece9e2] transition"
          title="Voltar 10s"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-[#d4af37] text-black hover:bg-[#f5d76e] flex items-center justify-center shadow-lg transition hover:scale-105"
          title={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-1" />
          )}
        </button>

        <button
          onClick={() => seek(10)}
          className="p-2 rounded-full hover:bg-[#1b1b1e] text-[#9a978f] hover:text-[#ece9e2] transition"
          title="Avançar 10s"
        >
          <RotateCw className="w-5 h-5" />
        </button>

        <button
          onClick={playNext}
          className="p-2 rounded-full hover:bg-[#1b1b1e] text-[#9a978f] hover:text-[#ece9e2] transition"
          title="Próxima Aula"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Speed & Volume Row */}
      <div className="flex items-center gap-4 text-xs">
        <button
          onClick={() => setPlaybackRate(playbackRate >= 2 ? 0.75 : playbackRate + 0.25)}
          className="px-2.5 py-1 rounded bg-[#1b1b1e] border border-[#2a2a2e] font-mono text-[#d4af37] font-semibold hover:border-[#d4af37] transition"
        >
          {playbackRate}x
        </button>

        <div className="flex items-center gap-1.5 text-[#9a978f]">
          <button onClick={toggleMute} className="hover:text-[#ece9e2]">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-[#2a2a2e] accent-[#d4af37] rounded"
          />
        </div>
      </div>
    </div>
  );
}
