import React, { useRef, useEffect, useState, useCallback } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/lib/utils";
import { i18n } from "@/i18n/pt-BR";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Tv,
  Headphones,
  SkipForward,
  Settings,
} from "lucide-react";

interface VideoPlayerProps {
  onNewNote?: () => void;
}

export default function VideoPlayer({ onNewNote }: VideoPlayerProps) {
  const {
    activeItem,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    theaterMode,
    countdown,
    playerRef,
    togglePlay,
    seek,
    seekTo,
    onTimeProgress,
    setPlaybackRate,
    setVolume,
    toggleMute,
    toggleTheater,
    toggleAudioMode,
    playNext,
    dismissCountdown,
    triggerCountdownTarget,
    setMiniPlayer,
  } = usePlayer();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const materialId = activeItem?.material.id;
  const streamSrc = materialId ? `/api/v1/stream/${materialId}` : "";

  // Assign internal video ref to playerRef in context
  useEffect(() => {
    if (videoElementRef.current) {
      playerRef.current = videoElementRef.current;
      videoElementRef.current.playbackRate = playbackRate;
      videoElementRef.current.volume = volume;
      videoElementRef.current.muted = isMuted;
    }
  }, [playerRef, playbackRate, volume, isMuted]);

  // Autoplay when active item changes if playing was requested
  useEffect(() => {
    if (videoElementRef.current && isPlaying) {
      const playPromise = videoElementRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Browser prevented autoplay with sound
        });
      }
    }
  }, [activeItem?.material.id, isPlaying]);

  // IntersectionObserver to auto-activate mini player on scroll down
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // If less than 20% visible and currently playing, trigger floating mini player
        if (!entry.isIntersecting && entry.intersectionRatio < 0.2) {
          if (videoElementRef.current && !videoElementRef.current.paused) {
            setMiniPlayer(true);
          }
        } else if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          setMiniPlayer(false);
        }
      },
      { threshold: [0, 0.2, 0.5, 1.0] },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [setMiniPlayer]);

  // Hide controls after inactivity
  const handleMouseMove = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
        setShowSpeedMenu(false);
      }
    }, 3000);
  }, [isPlaying]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  }, []);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];

  if (!materialId) {
    return (
      <div className="w-full aspect-video bg-[#131315] rounded-xl flex items-center justify-center text-[#9a978f] border border-[#2a2a2e]">
        Nenhum material selecionado
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full overflow-hidden bg-black rounded-xl select-none group border border-[#2a2a2e] transition-all duration-300 ${
        theaterMode ? "aspect-[21/9] max-h-[80vh]" : "aspect-video"
      }`}
    >
      <video
        ref={videoElementRef}
        src={streamSrc}
        playsInline
        preload="metadata"
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onTimeUpdate={(e) => {
          const target = e.currentTarget;
          onTimeProgress(target.currentTime, target.duration);
        }}
        onLoadedMetadata={(e) => {
          const target = e.currentTarget;
          target.playbackRate = playbackRate;
          onTimeProgress(target.currentTime, target.duration);
        }}
        onEnded={() => {
          // Trigger next lesson countdown if available
          playNext();
        }}
      />

      {/* 5-second Autoplay Next Lesson Countdown Overlay */}
      {countdown?.active && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-[#ece9e2] animate-in fade-in duration-300">
          <div className="text-center max-w-md space-y-4">
            <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
              Próxima Aula em
            </span>
            <div className="w-16 h-16 rounded-full border-4 border-[#d4af37] flex items-center justify-center text-2xl font-bold font-mono mx-auto text-[#ece9e2]">
              {countdown.secondsLeft}
            </div>
            <p className="text-sm font-medium text-[#ece9e2] truncate">
              {countdown.target?.material.title}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={triggerCountdownTarget}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#d4af37] text-black hover:bg-[#f5d76e] transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {i18n.player.playNextNow}
              </button>
              <button
                onClick={dismissCountdown}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1b1b1e] border border-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#2a2a2e] transition"
              >
                {i18n.player.cancelCountdown}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Overlay Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Scrub Bar */}
        <div className="relative mb-3 flex items-center group/scrub">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              seekTo(val);
            }}
            className="w-full h-1.5 bg-[#2a2a2e] accent-[#d4af37] rounded-lg cursor-pointer appearance-none group-hover/scrub:h-2.5 transition-all"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-xs text-[#ece9e2]">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#ece9e2] hover:text-[#d4af37] transition"
              title={isPlaying ? "Pausar (Espaço)" : "Reproduzir (Espaço)"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </button>

            {/* Jump -5s / +5s */}
            <button
              onClick={() => seek(-5)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#9a978f] hover:text-[#ece9e2] transition"
              title="Voltar 5s (←)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => seek(5)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#9a978f] hover:text-[#ece9e2] transition"
              title="Avançar 5s (→)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[#9a978f] hover:text-[#ece9e2] transition"
                title="Mudo (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-[#e5484d]" />
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
                className="w-16 h-1 bg-[#2a2a2e] accent-[#d4af37] rounded cursor-pointer hidden group-hover/vol:block transition"
              />
            </div>

            {/* Timers */}
            <div className="font-mono text-xs text-[#9a978f] tabular-nums pl-1">
              <span className="text-[#ece9e2]">{formatDuration(currentTime)}</span> /{" "}
              <span>{formatDuration(duration || activeItem?.material.duration_seconds)}</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Speed Selector Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 rounded text-xs font-mono font-medium hover:bg-white/10 text-[#d4af37] border border-[#2a2a2e] transition"
                title="Velocidade ([ ou ])"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 py-1 bg-[#131315] border border-[#2a2a2e] rounded-lg shadow-xl text-xs z-30 min-w-24">
                  {speeds.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-[#1b1b1e] font-mono ${
                        playbackRate === rate ? "text-[#d4af37] font-semibold" : "text-[#9a978f]"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Audio Mode Toggle */}
            <button
              onClick={toggleAudioMode}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#9a978f] hover:text-[#d4af37] transition"
              title="Alternar Modo Áudio (A)"
            >
              <Headphones className="w-4 h-4" />
            </button>

            {/* Next Lesson Button */}
            <button
              onClick={playNext}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#9a978f] hover:text-[#ece9e2] transition"
              title="Próxima aula (Shift+N)"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Theater Mode Toggle */}
            <button
              onClick={toggleTheater}
              className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                theaterMode ? "text-[#d4af37]" : "text-[#9a978f] hover:text-[#ece9e2]"
              }`}
              title="Modo Teatro (T)"
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#9a978f] hover:text-[#ece9e2] transition"
              title="Tela Cheia (F)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
