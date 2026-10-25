import { useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";

interface ShortcutHandlers {
  onNewNote?: () => void;
  onToggleFullscreen?: () => void;
}

export function useShortcuts(handlers?: ShortcutHandlers) {
  const {
    togglePlay,
    seek,
    playNext,
    playPrevious,
    playbackRate,
    setPlaybackRate,
    toggleTheater,
    toggleMute,
    toggleAudioMode,
    toggleShortcutsModal,
  } = usePlayer();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't intercept when user is typing in inputs or textareas
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ignore if modifier keys like Ctrl, Alt, Meta (Cmd) are held (unless Shift)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      switch (event.key) {
        case " ":
        case "k":
        case "K":
          event.preventDefault();
          togglePlay();
          break;

        case "ArrowLeft":
          event.preventDefault();
          seek(-5);
          break;

        case "ArrowRight":
          event.preventDefault();
          seek(5);
          break;

        case "j":
        case "J":
          event.preventDefault();
          seek(-10);
          break;

        case "l":
        case "L":
          event.preventDefault();
          seek(10);
          break;

        case "N":
          if (event.shiftKey) {
            event.preventDefault();
            playNext();
          }
          break;

        case "P":
          if (event.shiftKey) {
            event.preventDefault();
            playPrevious();
          }
          break;

        case "n":
          // Open new note at current timestamp
          event.preventDefault();
          handlers?.onNewNote?.();
          break;

        case "f":
        case "F":
          event.preventDefault();
          handlers?.onToggleFullscreen?.();
          break;

        case "t":
        case "T":
          event.preventDefault();
          toggleTheater();
          break;

        case "[":
          event.preventDefault();
          setPlaybackRate(playbackRate - 0.25);
          break;

        case "]":
          event.preventDefault();
          setPlaybackRate(playbackRate + 0.25);
          break;

        case "m":
        case "M":
          event.preventDefault();
          toggleMute();
          break;

        case "a":
        case "A":
          event.preventDefault();
          toggleAudioMode();
          break;

        case "?":
          event.preventDefault();
          toggleShortcutsModal();
          break;

        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    togglePlay,
    seek,
    playNext,
    playPrevious,
    playbackRate,
    setPlaybackRate,
    toggleTheater,
    toggleMute,
    toggleAudioMode,
    toggleShortcutsModal,
    handlers,
  ]);
}
