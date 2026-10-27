import database from "@/infra/database";
import ReviewModel from "@/models/review";

export type DailyActivity = {
  date: string; // YYYY-MM-DD
  seconds: number;
  materials_completed: number;
};

export type LastStudiedMaterial = {
  material_id: string;
  material_title: string;
  material_kind: string;
  lesson_title: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  position_seconds: number;
  duration_seconds: number;
  is_completed: boolean;
  last_interaction_at: Date;
};

export type UserStats = {
  streak: {
    current: number;
    longest: number;
  };
  total_seconds: number;
  completed_materials: number;
  pending_reviews_today: number;
  heatmap: DailyActivity[];
  last_studied: LastStudiedMaterial | null;
};

/**
 * Calcula a sequência atual (current streak) e a maior sequência histórica (longest streak)
 * a partir das datas em que o usuário teve atividade.
 */
function calculateStreaks(datesDescending: string[]): { current: number; longest: number } {
  if (datesDescending.length === 0) {
    return { current: 0, longest: 0 };
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const dateSet = new Set(datesDescending);

  // Calcula current streak
  let current = 0;
  let checkDate = new Date();

  // Se não estudou hoje, verifica se estudou ontem para manter o streak ativo
  if (!dateSet.has(todayStr)) {
    if (!dateSet.has(yesterdayStr)) {
      current = 0;
    } else {
      checkDate = yesterday;
    }
  }

  if (dateSet.has(checkDate.toISOString().split("T")[0])) {
    while (true) {
      const dStr = checkDate.toISOString().split("T")[0];
      if (dateSet.has(dStr)) {
        current += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calcula longest streak
  // Ordena datas em ordem crescente
  const sortedAsc = Array.from(dateSet).sort();
  let longest = 0;
  let running = 0;
  let prevTimestamp = 0;

  for (const dateStr of sortedAsc) {
    const currentTimestamp = new Date(dateStr + "T00:00:00Z").getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (running === 0) {
      running = 1;
    } else if (currentTimestamp - prevTimestamp === oneDayMs) {
      running += 1;
    } else if (currentTimestamp - prevTimestamp > oneDayMs) {
      running = 1;
    }

    if (running > longest) {
      longest = running;
    }

    prevTimestamp = currentTimestamp;
  }

  return { current, longest };
}

/**
 * Obtém o resumo consolidado de estatísticas de estudo do usuário.
 */
async function getUserStats(userId: string): Promise<UserStats> {
  // 1. Busca histórico de atividades (study_days) dos últimos 365 dias
  const studyDaysRes = await database.query<{
    date: string;
    seconds: number;
    materials_completed: number;
  }>(
    `SELECT 
       to_char(date, 'YYYY-MM-DD') as date,
       seconds,
       materials_completed
     FROM study_days
     WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '365 days'
     ORDER BY date ASC`,
    [userId],
  );

  const heatmap: DailyActivity[] = studyDaysRes.rows.map((row) => ({
    date: row.date,
    seconds: parseInt(row.seconds as any, 10) || 0,
    materials_completed: parseInt(row.materials_completed as any, 10) || 0,
  }));

  // 2. Busca todas as datas ativas para cálculo do streak
  const allActiveDatesRes = await database.query<{ date: string }>(
    `SELECT to_char(date, 'YYYY-MM-DD') as date
     FROM study_days
     WHERE user_id = $1 AND (seconds > 0 OR materials_completed > 0)
     ORDER BY date DESC`,
    [userId],
  );

  const activeDates = allActiveDatesRes.rows.map((r) => r.date);
  const streak = calculateStreaks(activeDates);

  // 3. Totais acumulados
  const totalsRes = await database.query<{
    total_seconds: string;
    completed_materials: string;
  }>(
    `SELECT 
       COALESCE(SUM(watched_seconds), 0) as total_seconds,
       COUNT(*) FILTER (WHERE is_completed = true) as completed_materials
     FROM progress
     WHERE user_id = $1`,
    [userId],
  );

  const total_seconds = Math.round(parseFloat(totalsRes.rows[0]?.total_seconds || "0"));
  const completed_materials = parseInt(totalsRes.rows[0]?.completed_materials || "0", 10);

  // 4. Revisões pendentes hoje
  const pending_reviews_today = await ReviewModel.countPendingToday(userId);

  // 5. Último material estudado ("Continuar de onde parou")
  const lastStudiedRes = await database.query<{
    material_id: string;
    material_title: string;
    material_kind: string;
    lesson_title: string;
    course_id: string;
    course_title: string;
    course_slug: string;
    position_seconds: string;
    duration_seconds: string;
    is_completed: boolean;
    last_interaction_at: Date;
  }>(
    `SELECT 
       p.material_id,
       m.title as material_title,
       m.kind as material_kind,
       l.title as lesson_title,
       c.id as course_id,
       c.title as course_title,
       c.slug as course_slug,
       p.position_seconds,
       m.duration_seconds,
       p.is_completed,
       p.last_interaction_at
     FROM progress p
     INNER JOIN materials m ON m.id = p.material_id
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN courses c ON c.id = p.course_id
     WHERE p.user_id = $1
     ORDER BY p.last_interaction_at DESC
     LIMIT 1`,
    [userId],
  );

  let last_studied: LastStudiedMaterial | null = null;
  if (lastStudiedRes.rows[0]) {
    const row = lastStudiedRes.rows[0];
    last_studied = {
      material_id: row.material_id,
      material_title: row.material_title,
      material_kind: row.material_kind,
      lesson_title: row.lesson_title,
      course_id: row.course_id,
      course_title: row.course_title,
      course_slug: row.course_slug,
      position_seconds: parseFloat(row.position_seconds as any) || 0,
      duration_seconds: parseFloat(row.duration_seconds as any) || 0,
      is_completed: row.is_completed,
      last_interaction_at: row.last_interaction_at,
    };
  }

  return {
    streak,
    total_seconds,
    completed_materials,
    pending_reviews_today,
    heatmap,
    last_studied,
  };
}

const StatsModel = {
  getUserStats,
  calculateStreaks,
};

export default StatsModel;
