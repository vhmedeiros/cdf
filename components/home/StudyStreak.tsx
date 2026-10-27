import React from "react";
import { Flame, Clock, CheckCircle2, RotateCw, Trophy } from "lucide-react";
import type { UserStats } from "@/models/stats";

interface StudyStreakProps {
  stats: UserStats | null;
}

export default function StudyStreak({ stats }: StudyStreakProps) {
  const currentStreak = stats?.streak.current || 0;
  const longestStreak = stats?.streak.longest || 0;
  const totalSeconds = stats?.total_seconds || 0;
  const completedCount = stats?.completed_materials || 0;
  const pendingReviews = stats?.pending_reviews_today || 0;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Ofensiva Atual */}
      <div className="bg-[#131315] border border-[#2a2a2e] hover:border-[#d4af37]/40 p-4 rounded-2xl transition space-y-2 group">
        <div className="flex items-center justify-between text-[#9a978f]">
          <span className="text-xs font-medium">Ofensiva</span>
          <Flame
            className={`w-4 h-4 transition ${
              currentStreak > 0
                ? "text-[#d4af37] fill-[#d4af37]/30 group-hover:scale-125"
                : "text-[#9a978f]"
            }`}
          />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#ece9e2]">
              {currentStreak}
            </span>
            <span className="text-xs text-[#9a978f]">dias</span>
          </div>
          <p className="text-[11px] text-[#9a978f] mt-1 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-[#d4af37]" />
            Recorde: {longestStreak} dias
          </p>
        </div>
      </div>

      {/* 2. Tempo de Estudo */}
      <div className="bg-[#131315] border border-[#2a2a2e] hover:border-[#d4af37]/40 p-4 rounded-2xl transition space-y-2 group">
        <div className="flex items-center justify-between text-[#9a978f]">
          <span className="text-xs font-medium">Tempo Estudado</span>
          <Clock className="w-4 h-4 text-[#9a978f] group-hover:text-[#d4af37] transition" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#ece9e2]">
              {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
            </span>
          </div>
          <p className="text-[11px] text-[#9a978f] mt-1">Horas dedicadas</p>
        </div>
      </div>

      {/* 3. Aulas Concluídas */}
      <div className="bg-[#131315] border border-[#2a2a2e] hover:border-[#d4af37]/40 p-4 rounded-2xl transition space-y-2 group">
        <div className="flex items-center justify-between text-[#9a978f]">
          <span className="text-xs font-medium">Aulas Concluídas</span>
          <CheckCircle2 className="w-4 h-4 text-[#6fbf73] group-hover:scale-110 transition" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#ece9e2]">
              {completedCount}
            </span>
            <span className="text-xs text-[#9a978f]">aulas</span>
          </div>
          <p className="text-[11px] text-[#9a978f] mt-1">Passos para aprovação</p>
        </div>
      </div>

      {/* 4. Revisões de Hoje */}
      <div className="bg-[#131315] border border-[#2a2a2e] hover:border-[#d4af37]/40 p-4 rounded-2xl transition space-y-2 group">
        <div className="flex items-center justify-between text-[#9a978f]">
          <span className="text-xs font-medium">Revisões Hoje</span>
          <RotateCw
            className={`w-4 h-4 transition ${
              pendingReviews > 0 ? "text-[#f5d76e] animate-spin-slow" : "text-[#9a978f]"
            }`}
          />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl sm:text-3xl font-serif font-bold ${
                pendingReviews > 0 ? "text-[#f5d76e]" : "text-[#ece9e2]"
              }`}
            >
              {pendingReviews}
            </span>
            <span className="text-xs text-[#9a978f]">pendentes</span>
          </div>
          <p className="text-[11px] text-[#9a978f] mt-1">
            {pendingReviews > 0 ? "Revisão espaçada ativa" : "Tudo em dia!"}
          </p>
        </div>
      </div>
    </div>
  );
}
