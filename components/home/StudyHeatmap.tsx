import React, { useMemo, useState } from "react";
import { Calendar, Flame } from "lucide-react";
import type { DailyActivity } from "@/models/stats";

interface StudyHeatmapProps {
  activity: DailyActivity[];
}

export default function StudyHeatmap({ activity }: StudyHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    minutes: number;
    completed: number;
  } | null>(null);

  // Mapeia data string -> minutos estudados
  const activityMap = useMemo(() => {
    const map = new Map<string, { seconds: number; completed: number }>();
    for (const item of activity) {
      map.set(item.date, {
        seconds: item.seconds,
        completed: item.materials_completed,
      });
    }
    return map;
  }, [activity]);

  // Gera os últimos 140 dias (20 semanas) terminando no próximo sábado
  const weeks = useMemo(() => {
    const result: { date: string; minutes: number; completed: number }[][] = [];
    const today = new Date();

    // Começa 20 semanas atrás no domingo
    const totalWeeks = 20;
    const daysToShow = totalWeeks * 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToShow + 1);

    // Ajusta startDate para o último domingo
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    let current = new Date(startDate);
    let currentWeek: { date: string; minutes: number; completed: number }[] = [];

    while (current <= today || currentWeek.length > 0) {
      const dateStr = current.toISOString().split("T")[0];
      const data = activityMap.get(dateStr) || { seconds: 0, completed: 0 };
      const minutes = Math.round(data.seconds / 60);

      currentWeek.push({
        date: dateStr,
        minutes,
        completed: data.completed,
      });

      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
        if (current > today) break;
      }

      current.setDate(current.getDate() + 1);
    }

    return result;
  }, [activityMap]);

  function getColor(minutes: number): string {
    if (minutes === 0) return "bg-[#1b1b1e] border-[#2a2a2e]";
    if (minutes < 15) return "bg-[#5a4613] border-[#7d6118]";
    if (minutes < 40) return "bg-[#a8892c] border-[#c4a133]";
    return "bg-[#f5d76e] border-[#fde48b]";
  }

  function formatDateBR(dateStr: string): string {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  return (
    <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#d4af37]" />
          <h3 className="font-serif font-bold text-base text-[#ece9e2]">
            Mapa de Calor de Estudos
          </h3>
        </div>

        {/* Status do hover ou dica */}
        <div className="text-xs text-[#9a978f] min-h-[1.25rem]">
          {hoveredDay ? (
            <span className="text-[#ece9e2] font-mono">
              <strong className="text-[#d4af37]">{formatDateBR(hoveredDay.date)}:</strong>{" "}
              {hoveredDay.minutes} min estudados
              {hoveredDay.completed > 0 ? `, ${hoveredDay.completed} aulas concluídas` : ""}
            </span>
          ) : (
            <span>Passe o mouse sobre os dias para ver detalhes</span>
          )}
        </div>
      </div>

      {/* Grid de semanas */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="inline-flex gap-1.5 min-w-full justify-start sm:justify-center">
          {/* Rótulos dos dias da semana */}
          <div className="flex flex-col justify-between py-0.5 text-[9px] text-[#9a978f] font-mono pr-1 select-none">
            <span>D</span>
            <span>S</span>
            <span>T</span>
            <span>Q</span>
            <span>Q</span>
            <span>S</span>
            <span>S</span>
          </div>

          {/* Colunas de semanas */}
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {week.map((day) => (
                <div
                  key={day.date}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`w-3.5 h-3.5 rounded-sm border transition-all cursor-pointer ${getColor(
                    day.minutes,
                  )} hover:scale-125 hover:z-10`}
                  title={`${formatDateBR(day.date)}: ${day.minutes} min`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-end gap-2 text-[11px] text-[#9a978f] pt-1">
        <span>Menos</span>
        <div className="w-3 h-3 rounded-sm bg-[#1b1b1e] border border-[#2a2a2e]" />
        <div className="w-3 h-3 rounded-sm bg-[#5a4613] border-[#7d6118]" />
        <div className="w-3 h-3 rounded-sm bg-[#a8892c] border-[#c4a133]" />
        <div className="w-3 h-3 rounded-sm bg-[#f5d76e] border-[#fde48b]" />
        <span>Mais</span>
      </div>
    </div>
  );
}
