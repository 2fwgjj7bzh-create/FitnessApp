/**
 * Couche de synchronisation : sauvegarde une séance localement (AsyncStorage)
 * ET dans Supabase quand un user est connecté.
 * Permet au WorkoutSessionScreen existant de continuer à fonctionner
 * sans réécriture, tout en activant la persistence cloud.
 */

import { saveWorkout, getWorkouts } from '../storage';
import { saveWorkoutToSupabase, estimateOneRM, type SetToLog } from './programService';
import { supabase } from './supabase';
import type { Workout } from '../types';

export async function syncWorkout(
  workout: Workout,
  programDayId?: string
): Promise<{ prs: string[] }> {
  // 0. Records détectés en local (fonctionne sans compte) — comparés à l'historique AVANT sauvegarde
  let localPrs: string[] = [];
  try {
    const previous = (await getWorkouts()).filter(w => w.id !== workout.id);
    localPrs = detectLocalPRs(workout, previous);
  } catch (e) {
    console.warn('[PR local]', e);
  }

  // 1. Toujours sauvegarder localement (offline-first)
  await saveWorkout(workout);

  // 2. Si connecté, synchroniser avec Supabase
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { prs: localPrs };

  const sets: SetToLog[] = workout.exercises.flatMap((ex, _ei) =>
    ex.sets.map((s, si) => ({
      exercise_nom: ex.name,
      ordre: si + 1,
      type_set: s.type === 'warmup' ? ('warmup' as const) : ('normal' as const),
      reps: s.reps,
      charge: s.weight,
      completed: s.completed,
    }))
  );

  const date = workout.date.split('T')[0];
  const { prs } = await saveWorkoutToSupabase({
    userId: session.user.id,
    programDayId,
    date,
    duree: workout.duration,
    note: workout.notes,
    sets,
  });

  return { prs: prs.length > 0 ? prs : localPrs };
}

/**
 * Record = meilleur 1RM estimé (Brzycki ≤ 10 reps, Epley au-delà) battu sur un exercice
 * déjà pratiqué. Les séries d'échauffement et non validées sont ignorées.
 * Une première fois sur un exercice n'est pas un record (rien à battre).
 */
export function detectLocalPRs(workout: Workout, previous: Workout[]): string[] {
  const valid = (s: { completed: boolean; weight: number; reps: number; type?: string }) =>
    s.completed && s.type !== 'warmup' && s.weight > 0 && s.reps > 0;

  const best: Record<string, number> = {};
  previous.forEach(w => w.exercises.forEach(ex => ex.sets.forEach(s => {
    if (!valid(s)) return;
    const e1rm = estimateOneRM(s.weight, s.reps);
    if (e1rm > (best[ex.name] ?? 0)) best[ex.name] = e1rm;
  })));

  const prs: string[] = [];
  workout.exercises.forEach(ex => {
    let top = 0; let label = '';
    ex.sets.forEach(s => {
      if (!valid(s)) return;
      const e1rm = estimateOneRM(s.weight, s.reps);
      if (e1rm > top) { top = e1rm; label = `${s.weight} kg × ${s.reps}`; }
    });
    const prev = best[ex.name];
    if (top > 0 && prev !== undefined && top > prev + 0.01) prs.push(`${ex.name} (${label})`);
  });
  return prs;
}

/**
 * Récupère le 1RM estimé pour un exercice depuis les PR Supabase ou calcule
 * à partir de l'historique local.
 */
export async function getOneRMForExercise(
  exerciseName: string,
  localWorkouts?: Array<{ exercises: Array<{ name: string; sets: Array<{ reps: number; weight: number; completed: boolean }> }> }>
): Promise<number> {
  // Cherche d'abord dans Supabase
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const db = supabase as any;
    const { data } = await db
      .from('personal_records')
      .select('value')
      .eq('user_id', session.user.id)
      .eq('exercise_nom', exerciseName)
      .eq('record_type', '1rm_estimated')
      .single();
    if (data?.value) return data.value;
  }

  // Fallback : calcule depuis l'historique local
  if (!localWorkouts?.length) return 0;
  let best = 0;
  for (const w of localWorkouts) {
    for (const ex of w.exercises) {
      if (ex.name !== exerciseName) continue;
      for (const s of ex.sets) {
        if (s.completed && s.reps > 0 && s.weight > 0) {
          const est = estimateOneRM(s.weight, s.reps);
          if (est > best) best = est;
        }
      }
    }
  }
  return Math.round(best * 10) / 10;
}
