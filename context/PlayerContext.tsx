import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type { CourseTree } from "@/models/course";
import { applyMediaVolume } from "@/lib/audioBooster";

export type CourseTreeModule = CourseTree["modules"][number];
export type CourseTreeLesson = CourseTreeModule["lessons"][number];
export type CourseTreeMaterial = CourseTreeLesson["materials"][number];

export interface FlatItem {
  material: CourseTreeMaterial;
  lesson: CourseTreeLesson;
  module: CourseTreeModule;
  index: number;
}

export interface CountdownState {
  active: boolean;
  secondsLeft: number;
  target: FlatItem | null;
}

export interface ResumeToastState {
  visible: boolean;
  time: number;
}

interface PlayerContextType {
  course: CourseTree | null;
  activeItem: FlatItem | null;
  flatItems: FlatItem[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  theaterMode: boolean;
  focusMode: boolean;
  audioMode: boolean;
  miniPlayer: boolean;
  completedIds: string[];
  countdown: CountdownState | null;
  resumeToast: ResumeToastState | null;
  shortcutsModalOpen: boolean;

  // Actions
  setCourse: (course: CourseTree) => void;
  selectMaterial: (materialId: string, autoPlay?: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlay: () => void;
  seek: (delta: number) => void;
  seekTo: (time: number) => void;
  onTimeProgress: (time: number, newDuration?: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleTheater: () => void;
  toggleFocusMode: () => void;
  toggleAudioMode: () => void;
  setMiniPlayer: (active: boolean) => void;
  closeMiniPlayer: () => void;
  toggleShortcutsModal: () => void;
  toggleCompleted: (materialId: string) => void;
  dismissCountdown: () => void;
  dismissResumeToast: () => void;
  triggerCountdownTarget: () => void;

  // Ref hook to video element/player instance
  playerRef: React.MutableRefObject<any>;
  pendingModeSwitchTimeRef: React.MutableRefObject<number | null>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [course, setCourseState] = useState<CourseTree | null>(null);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [audioMode, setAudioMode] = useState(false);
  const [miniPlayer, setMiniPlayerState] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [resumeToast, setResumeToast] = useState<ResumeToastState | null>(null);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const playerRef = useRef<any>(null);
  const pendingModeSwitchTimeRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingResumeTimeRef = useRef<number | null>(null);
  const lastHeartbeatTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  currentTimeRef.current = currentTime;

  // Load preferences from localStorage and server
  useEffect(() => {
    try {
      const savedRate = localStorage.getItem("cdf_playback_rate");
      if (savedRate) setPlaybackRateState(parseFloat(savedRate));

      const savedVolume = localStorage.getItem("cdf_volume");
      if (savedVolume) setVolumeState(parseFloat(savedVolume));

      const savedTheater = localStorage.getItem("cdf_theater");
      if (savedTheater) setTheaterMode(savedTheater === "true");

      const savedCompleted = localStorage.getItem("cdf_completed_materials");
      if (savedCompleted) setCompletedIds(JSON.parse(savedCompleted));
    } catch {
      // Ignore localStorage read errors
    }

    // Carrega preferências sincronizadas do servidor
    fetch("/api/v1/me/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.playback_rate) setPlaybackRateState(data.playback_rate);
          if (data.volume !== undefined) setVolumeState(data.volume);
          if (typeof data.theater_mode === "boolean") setTheaterMode(data.theater_mode);
        }
      })
      .catch(() => {});
  }, []);

  // Heartbeat a cada 15 segundos durante a reprodução
  useEffect(() => {
    if (!isPlaying || !activeMaterialId) return;

    const interval = setInterval(() => {
      const pos = currentTimeRef.current;
      const delta = Math.max(0, pos - lastHeartbeatTimeRef.current);
      lastHeartbeatTimeRef.current = pos;

      fetch(`/api/v1/progress/${activeMaterialId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_seconds: Math.round(pos * 10) / 10,
          watched_delta: Math.round(Math.min(30, delta) * 10) / 10,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.is_completed) {
            setCompletedIds((prev) =>
              prev.includes(activeMaterialId) ? prev : [...prev, activeMaterialId],
            );
          }
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, [isPlaying, activeMaterialId]);

  // Flush do buffer ao fechar a aba ou janela
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!activeMaterialId) return;
      const pos = currentTimeRef.current;
      const payload = JSON.stringify({
        items: [
          {
            material_id: activeMaterialId,
            position_seconds: Math.round(pos * 10) / 10,
            watched_delta: 0,
          },
        ],
      });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/v1/progress/batch", payload);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeMaterialId]);

  // Flatten course items for easy next/prev navigation
  const flatItems: FlatItem[] = useMemo(() => {
    if (!course?.modules) return [];
    const items: FlatItem[] = [];
    let idx = 0;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        for (const mat of lesson.materials) {
          items.push({
            material: mat,
            lesson,
            module: mod,
            index: idx++,
          });
        }
      }
    }
    return items;
  }, [course]);

  // Current active item
  const activeItem = useMemo(() => {
    if (!activeMaterialId) return flatItems[0] ?? null;
    return flatItems.find((item) => item.material.id === activeMaterialId) ?? flatItems[0] ?? null;
  }, [flatItems, activeMaterialId]);

  const setCourse = useCallback(
    (newCourse: CourseTree) => {
      setCourseState(newCourse);

      // Consulta os progressos deste curso salvos no banco de dados
      fetch(`/api/v1/progress?course_id=${newCourse.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.items) {
            const serverCompleted = data.items
              .filter((i: any) => i.is_completed)
              .map((i: any) => i.material_id);
            setCompletedIds(serverCompleted);
          }

          // Se o usuário estava assistindo uma aula anteriormente, retoma nela!
          if (!activeMaterialId) {
            if (data?.summary?.last_material_id) {
              setActiveMaterialId(data.summary.last_material_id);
              if (data.summary.last_position_seconds > 5) {
                pendingResumeTimeRef.current = data.summary.last_position_seconds;
              }
            } else if (newCourse.modules) {
              // Ou prioriza o primeiro vídeo do curso
              const allMats: Array<{ matId: string; kind: string }> = [];
              for (const mod of newCourse.modules) {
                for (const les of mod.lessons) {
                  for (const mat of les.materials) {
                    allMats.push({ matId: mat.id, kind: mat.kind });
                  }
                }
              }
              const firstVideo = allMats.find((m) => m.kind === "video") || allMats[0];
              if (firstVideo) {
                setActiveMaterialId(firstVideo.matId);
              }
            }
          }
        })
        .catch(() => {});
    },
    [activeMaterialId],
  );

  const dismissCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  }, []);

  const selectMaterial = useCallback(
    (materialId: string, autoPlay = true) => {
      dismissCountdown();
      setActiveMaterialId(materialId);
      setCurrentTime(0);
      lastHeartbeatTimeRef.current = 0;
      if (autoPlay) {
        setIsPlaying(true);
      }

      // Consulta se há posição salva no servidor para este material
      fetch(`/api/v1/progress/${materialId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.position_seconds > 5 && !data.is_completed) {
            pendingResumeTimeRef.current = data.position_seconds;
          }
        })
        .catch(() => {});
    },
    [dismissCountdown],
  );

  const playNext = useCallback(() => {
    if (!activeItem) return;
    const nextIdx = activeItem.index + 1;
    if (nextIdx < flatItems.length) {
      selectMaterial(flatItems[nextIdx].material.id, true);
    }
  }, [activeItem, flatItems, selectMaterial]);

  const playPrevious = useCallback(() => {
    if (!activeItem) return;
    const prevIdx = activeItem.index - 1;
    if (prevIdx >= 0) {
      selectMaterial(flatItems[prevIdx].material.id, true);
    }
  }, [activeItem, flatItems, selectMaterial]);

  const triggerCountdownTarget = useCallback(() => {
    if (countdown?.target) {
      const targetId = countdown.target.material.id;
      dismissCountdown();
      selectMaterial(targetId, true);
    }
  }, [countdown, dismissCountdown, selectMaterial]);

  // Start 5s countdown when video ends
  const handleVideoEnded = useCallback(() => {
    if (!activeItem) return;
    const nextIdx = activeItem.index + 1;
    if (nextIdx < flatItems.length) {
      const target = flatItems[nextIdx];
      let remaining = 5;
      setCountdown({ active: true, secondsLeft: remaining, target });

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCountdown(null);
          selectMaterial(target.material.id, true);
        } else {
          setCountdown({ active: true, secondsLeft: remaining, target });
        }
      }, 1000);
    }
  }, [activeItem, flatItems, selectMaterial]);

  const togglePlay = useCallback(() => {
    if (playerRef.current) {
      if (playerRef.current.paused) {
        playerRef.current.play?.();
        setIsPlaying(true);
      } else {
        playerRef.current.pause?.();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, []);

  const seek = useCallback(
    (delta: number) => {
      if (playerRef.current) {
        const newTime = Math.max(
          0,
          Math.min(duration, (playerRef.current.currentTime || 0) + delta),
        );
        playerRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      } else {
        setCurrentTime((prev) => Math.max(0, Math.min(duration, prev + delta)));
      }
    },
    [duration],
  );

  const seekTo = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(duration || 999999, time));
      if (playerRef.current) {
        playerRef.current.currentTime = clamped;
      }
      setCurrentTime(clamped);
    },
    [duration],
  );

  const onTimeProgress = useCallback((time: number, newDuration?: number) => {
    setCurrentTime(time);
    if (newDuration && !isNaN(newDuration) && newDuration > 0) {
      setDuration(newDuration);
    }

    // Aplica retomada de onde parou do servidor
    if (pendingResumeTimeRef.current !== null && pendingResumeTimeRef.current > 5) {
      const resumeSeconds = pendingResumeTimeRef.current;
      pendingResumeTimeRef.current = null;
      if (playerRef.current && Math.abs(time - resumeSeconds) > 3) {
        playerRef.current.currentTime = resumeSeconds;
        setCurrentTime(resumeSeconds);
        setResumeToast({ visible: true, time: resumeSeconds });
        setTimeout(() => setResumeToast(null), 4000);
      }
    }
  }, []);

  const dismissResumeToast = useCallback(() => {
    setResumeToast(null);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.5, Math.min(2.5, Math.round(rate * 10) / 10));
    setPlaybackRateState(clamped);
    if (playerRef.current) {
      playerRef.current.playbackRate = clamped;
    }
    try {
      localStorage.setItem("cdf_playback_rate", clamped.toString());
      fetch("/api/v1/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playback_rate: clamped }),
      }).catch(() => {});
    } catch {}
  }, []);

  const setVolume = useCallback(
    (vol: number) => {
      // Suporta amplificação até 200% (2.0)
      const clamped = Math.max(0, Math.min(2.0, Math.round(vol * 100) / 100));
      setVolumeState(clamped);
      if (playerRef.current) {
        applyMediaVolume(playerRef.current, clamped, isMuted);
      }
      try {
        localStorage.setItem("cdf_volume", clamped.toString());
        fetch("/api/v1/me/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ volume: clamped }),
        }).catch(() => {});
      } catch {}
    },
    [isMuted],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (playerRef.current) {
        applyMediaVolume(playerRef.current, volume, next);
      }
      return next;
    });
  }, [volume]);

  const toggleTheater = useCallback(() => {
    setTheaterMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cdf_theater", next.toString());
        fetch("/api/v1/me/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theater_mode: next }),
        }).catch(() => {});
      } catch {}
      return next;
    });
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => !prev);
  }, []);

  const toggleAudioMode = useCallback(() => {
    // Captura o segundo atual exato do player ativo antes de alternar para não reiniciar do zero
    const currentPos =
      playerRef.current?.currentTime ?? currentTimeRef.current ?? currentTime;
    if (currentPos > 0) {
      pendingModeSwitchTimeRef.current = currentPos;
    }
    setAudioMode((prev) => !prev);
  }, [currentTime]);

  const setMiniPlayer = useCallback((active: boolean) => {
    setMiniPlayerState(active);
  }, []);

  const closeMiniPlayer = useCallback(() => {
    setMiniPlayerState(false);
  }, []);

  const toggleShortcutsModal = useCallback(() => {
    setShortcutsModalOpen((prev) => !prev);
  }, []);

  const toggleCompleted = useCallback((materialId: string) => {
    setCompletedIds((prev) => {
      const exists = prev.includes(materialId);
      const nextCompleted = !exists;
      const updated = nextCompleted
        ? [...prev, materialId]
        : prev.filter((id) => id !== materialId);

      // Sincroniza com o Postgres
      fetch(`/api/v1/progress/${materialId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_seconds: Math.round(currentTimeRef.current * 10) / 10,
          completed: nextCompleted,
        }),
      }).catch(() => {});

      try {
        localStorage.setItem("cdf_completed_materials", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        course,
        activeItem,
        flatItems,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        volume,
        isMuted,
        theaterMode,
        focusMode,
        audioMode,
        miniPlayer,
        completedIds,
        countdown,
        resumeToast,
        shortcutsModalOpen,
        setCourse,
        selectMaterial,
        playNext,
        playPrevious,
        togglePlay,
        seek,
        seekTo,
        onTimeProgress,
        setPlaybackRate,
        setVolume,
        toggleMute,
        toggleTheater,
        toggleFocusMode,
        toggleAudioMode,
        setMiniPlayer,
        closeMiniPlayer,
        toggleShortcutsModal,
        toggleCompleted,
        dismissCountdown,
        dismissResumeToast,
        triggerCountdownTarget,
        playerRef,
        pendingModeSwitchTimeRef,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
