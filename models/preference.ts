import database from "@/infra/database";
import { z } from "zod";

export const updatePreferencesSchema = z.object({
  pomodoro_focus_minutes: z.number().int().min(1).max(120).optional(),
  pomodoro_short_break_minutes: z.number().int().min(1).max(60).optional(),
  pomodoro_long_break_minutes: z.number().int().min(1).max(60).optional(),
  pomodoro_sound_enabled: z.boolean().optional(),
  playback_rate: z.number().min(0.5).max(2.5).optional(),
  volume: z.number().min(0).max(1).optional(),
  autoplay_next: z.boolean().optional(),
  theater_mode: z.boolean().optional(),
});

export type UserPreferences = {
  user_id: string;
  pomodoro_focus_minutes: number;
  pomodoro_short_break_minutes: number;
  pomodoro_long_break_minutes: number;
  pomodoro_sound_enabled: boolean;
  playback_rate: number;
  volume: number;
  autoplay_next: boolean;
  theater_mode: boolean;
  created_at: Date;
  updated_at: Date;
};

const DEFAULT_PREFERENCES: Omit<UserPreferences, "user_id" | "created_at" | "updated_at"> = {
  pomodoro_focus_minutes: 25,
  pomodoro_short_break_minutes: 5,
  pomodoro_long_break_minutes: 15,
  pomodoro_sound_enabled: true,
  playback_rate: 1.0,
  volume: 1.0,
  autoplay_next: true,
  theater_mode: false,
};

async function findByUserId(userId: string): Promise<UserPreferences> {
  const result = await database.query<UserPreferences>(
    `SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1`,
    [userId],
  );

  if (result.rows[0]) {
    const row = result.rows[0];
    return {
      ...row,
      playback_rate: parseFloat(row.playback_rate as any),
      volume: parseFloat(row.volume as any),
    };
  }

  // Se não existir registro no banco, retorna defaults
  return {
    user_id: userId,
    ...DEFAULT_PREFERENCES,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

async function upsert(
  userId: string,
  data: Partial<Omit<UserPreferences, "user_id" | "created_at" | "updated_at">>,
): Promise<UserPreferences> {
  const current = await findByUserId(userId);
  const next = {
    ...current,
    ...data,
  };

  const result = await database.query<UserPreferences>(
    `INSERT INTO user_preferences (
       user_id,
       pomodoro_focus_minutes,
       pomodoro_short_break_minutes,
       pomodoro_long_break_minutes,
       pomodoro_sound_enabled,
       playback_rate,
       volume,
       autoplay_next,
       theater_mode,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (user_id) DO UPDATE SET
       pomodoro_focus_minutes = EXCLUDED.pomodoro_focus_minutes,
       pomodoro_short_break_minutes = EXCLUDED.pomodoro_short_break_minutes,
       pomodoro_long_break_minutes = EXCLUDED.pomodoro_long_break_minutes,
       pomodoro_sound_enabled = EXCLUDED.pomodoro_sound_enabled,
       playback_rate = EXCLUDED.playback_rate,
       volume = EXCLUDED.volume,
       autoplay_next = EXCLUDED.autoplay_next,
       theater_mode = EXCLUDED.theater_mode,
       updated_at = now()
     RETURNING *`,
    [
      userId,
      next.pomodoro_focus_minutes,
      next.pomodoro_short_break_minutes,
      next.pomodoro_long_break_minutes,
      next.pomodoro_sound_enabled,
      next.playback_rate,
      next.volume,
      next.autoplay_next,
      next.theater_mode,
    ],
  );

  const row = result.rows[0];
  return {
    ...row,
    playback_rate: parseFloat(row.playback_rate as any),
    volume: parseFloat(row.volume as any),
  };
}

const PreferenceModel = {
  findByUserId,
  upsert,
};

export default PreferenceModel;
