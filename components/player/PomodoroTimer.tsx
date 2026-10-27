import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Coffee, Flame, Settings, X, Volume2, VolumeX } from "lucide-react";

type PomodoroMode = "focus" | "shortBreak" | "longBreak";

interface PomodoroTimerProps {
  onFocusEnd?: () => void;
}

export default function PomodoroTimer({ onFocusEnd }: PomodoroTimerProps) {
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega preferências do servidor ou localStorage
  useEffect(() => {
    fetch("/api/v1/me/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.pomodoro_focus_minutes) setFocusMinutes(data.pomodoro_focus_minutes);
          if (data.pomodoro_short_break_minutes)
            setShortBreakMinutes(data.pomodoro_short_break_minutes);
          if (data.pomodoro_long_break_minutes)
            setLongBreakMinutes(data.pomodoro_long_break_minutes);
          if (typeof data.pomodoro_sound_enabled === "boolean")
            setSoundEnabled(data.pomodoro_sound_enabled);
          setSecondsLeft(data.pomodoro_focus_minutes * 60);
        }
      })
      .catch(() => {});
  }, []);

  const totalSecondsForMode = useCallback(
    (m: PomodoroMode) => {
      if (m === "focus") return focusMinutes * 60;
      if (m === "shortBreak") return shortBreakMinutes * 60;
      return longBreakMinutes * 60;
    },
    [focusMinutes, shortBreakMinutes, longBreakMinutes],
  );

  // Som suave de sino via Web Audio API (sem dependência de arquivos externos)
  const playChime = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // Ignora erro de áudio se o navegador bloquear autoplay
    }
  }, [soundEnabled]);

  const switchMode = useCallback(
    (newMode: PomodoroMode) => {
      setIsRunning(false);
      setMode(newMode);
      setSecondsLeft(totalSecondsForMode(newMode));
    },
    [totalSecondsForMode],
  );

  // Efeito do timer
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          playChime();
          setIsRunning(false);
          if (mode === "focus") {
            onFocusEnd?.();
            switchMode("shortBreak");
          } else {
            switchMode("focus");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, onFocusEnd, playChime, switchMode]);

  const toggleRun = () => setIsRunning((r) => !r);

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(totalSecondsForMode(mode));
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsOpen(false);
    setSecondsLeft(totalSecondsForMode(mode));

    // Salva no banco
    try {
      await fetch("/api/v1/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pomodoro_focus_minutes: focusMinutes,
          pomodoro_short_break_minutes: shortBreakMinutes,
          pomodoro_long_break_minutes: longBreakMinutes,
          pomodoro_sound_enabled: soundEnabled,
        }),
      });
    } catch {}
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progressPercent = Math.max(
    0,
    Math.min(100, ((totalSecondsForMode(mode) - secondsLeft) / totalSecondsForMode(mode)) * 100),
  );

  return (
    <div className="relative inline-flex items-center">
      {/* Widget principal do Pomodoro no topo da sala */}
      <div className="flex items-center gap-2 bg-[#131315]/90 border border-[#2a2a2e] rounded-xl px-3 py-1.5 shadow-md">
        {/* Ícone de modo */}
        <button
          onClick={() => switchMode(mode === "focus" ? "shortBreak" : "focus")}
          title={`Modo: ${mode === "focus" ? "Foco (clique para pausa)" : "Pausa (clique para foco)"}`}
          className="p-1 rounded-lg hover:bg-[#1b1b1e] transition text-[#d4af37]"
        >
          {mode === "focus" ? (
            <Flame className="w-4 h-4 fill-[#d4af37]/20 text-[#d4af37]" />
          ) : (
            <Coffee className="w-4 h-4 text-[#6fbf73]" />
          )}
        </button>

        {/* Relógio Digital */}
        <div className="flex flex-col">
          <span className="font-mono text-sm font-semibold text-[#ece9e2] tabular-nums leading-none">
            {timeFormatted}
          </span>
          {/* Micro barra dourada de progresso do ciclo */}
          <div className="w-12 h-1 bg-[#2a2a2e] rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-500 ${
                mode === "focus" ? "bg-[#d4af37]" : "bg-[#6fbf73]"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Botão Play / Pause */}
        <button
          onClick={toggleRun}
          title={isRunning ? "Pausar foco" : "Iniciar foco"}
          className="p-1.5 rounded-lg bg-[#1b1b1e] hover:bg-[#2a2a2e] text-[#ece9e2] transition ml-1"
        >
          {isRunning ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
        </button>

        {/* Botão Reset */}
        <button
          onClick={resetTimer}
          title="Reiniciar ciclo"
          className="p-1.5 rounded-lg hover:bg-[#1b1b1e] text-[#9a978f] hover:text-[#ece9e2] transition"
        >
          <RotateCcw className="w-3 h-3" />
        </button>

        {/* Botão Configurações */}
        <button
          onClick={() => setSettingsOpen((s) => !s)}
          title="Configurações do Pomodoro"
          className="p-1.5 rounded-lg hover:bg-[#1b1b1e] text-[#9a978f] hover:text-[#d4af37] transition"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>

      {/* Modal / Popover de Configurações do Pomodoro */}
      {settingsOpen && (
        <div className="absolute top-12 right-0 z-50 w-72 bg-[#131315] border border-[#2a2a2e] rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2e] mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
              Ajustar Pomodoro
            </h4>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-[#9a978f] hover:text-[#ece9e2]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={saveSettings} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#9a978f] mb-1">Tempo de Foco (minutos)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={focusMinutes}
                onChange={(e) => setFocusMinutes(parseInt(e.target.value, 10) || 25)}
                className="w-full bg-[#1b1b1e] border border-[#2a2a2e] rounded-lg px-2.5 py-1.5 text-[#ece9e2] focus:border-[#d4af37] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#9a978f] mb-1">Pausa Curta (min)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={shortBreakMinutes}
                  onChange={(e) => setShortBreakMinutes(parseInt(e.target.value, 10) || 5)}
                  className="w-full bg-[#1b1b1e] border border-[#2a2a2e] rounded-lg px-2.5 py-1.5 text-[#ece9e2] focus:border-[#d4af37] outline-none"
                />
              </div>
              <div>
                <label className="block text-[#9a978f] mb-1">Pausa Longa (min)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={longBreakMinutes}
                  onChange={(e) => setLongBreakMinutes(parseInt(e.target.value, 10) || 15)}
                  className="w-full bg-[#1b1b1e] border border-[#2a2a2e] rounded-lg px-2.5 py-1.5 text-[#ece9e2] focus:border-[#d4af37] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[#9a978f] flex items-center gap-1.5">
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                Som de conclusão
              </span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="accent-[#d4af37] w-4 h-4 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 mt-2 bg-[#d4af37] hover:bg-[#f5d76e] text-black font-semibold rounded-lg transition"
            >
              Salvar Preferências
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
