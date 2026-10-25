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
  audioMode: boolean;
  miniPlayer: boolean;
  completedIds: string[];
  countdown: CountdownState | null;
  shortcutsModalOpen: boolean;

  // Actions
  setCourse: (course: CourseTree) => void;
  selectMaterial: (materialId: string, autoPlay?: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlay: () => void;
  seek: (delta: number) => void;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleTheater: () => void;
  toggleAudioMode: () => void;
  setMiniPlayer: (active: boolean) => void;
  closeMiniPlayer: () => void;
  toggleShortcutsModal: () => void;
  toggleCompleted: (materialId: string) => void;
  dismissCountdown: () => void;
  triggerCountdownTarget: () => void;

  // Ref hook to video element/player instance
  playerRef: React.MutableRefObject<any>;
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
  const [audioMode, setAudioMode] = useState(false);
  const [miniPlayer, setMiniPlayerState] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const playerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences from localStorage on mount
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
  }, []);

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
      if (!activeMaterialId && newCourse.modules?.[0]?.lessons?.[0]?.materials?.[0]) {
        setActiveMaterialId(newCourse.modules[0].lessons[0].materials[0].id);
      }
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
      if (autoPlay) {
        setIsPlaying(true);
      }
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

  const setPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.5, Math.min(2.5, Math.round(rate * 10) / 10));
    setPlaybackRateState(clamped);
    if (playerRef.current) {
      playerRef.current.playbackRate = clamped;
    }
    try {
      localStorage.setItem("cdf_playback_rate", clamped.toString());
    } catch {}
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (playerRef.current) {
      playerRef.current.volume = clamped;
    }
    try {
      localStorage.setItem("cdf_volume", clamped.toString());
    } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (playerRef.current) {
        playerRef.current.muted = next;
      }
      return next;
    });
  }, []);

  const toggleTheater = useCallback(() => {
    setTheaterMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cdf_theater", next.toString());
      } catch {}
      return next;
    });
  }, []);

  const toggleAudioMode = useCallback(() => {
    setAudioMode((prev) => !prev);
  }, []);

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
      const updated = exists ? prev.filter((id) => id !== materialId) : [...prev, materialId];
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
        audioMode,
        miniPlayer,
        completedIds,
        countdown,
        shortcutsModalOpen,
        setCourse,
        selectMaterial,
        playNext,
        playPrevious,
        togglePlay,
        seek,
        seekTo,
        setPlaybackRate,
        setVolume,
        toggleMute,
        toggleTheater,
        toggleAudioMode,
        setMiniPlayer,
        closeMiniPlayer,
        toggleShortcutsModal,
        toggleCompleted,
        dismissCountdown,
        triggerCountdownTarget,
        playerRef,
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
