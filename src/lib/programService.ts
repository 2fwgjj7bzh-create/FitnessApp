import { supabase } from './supabase';

// ─── Calcul 1RM (Epley, fallback Brzycki ≤10 reps) ──────────────────────────

export function estimateOneRM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps <= 10) return weight * 36 / (37 - reps); // Brzycki
  return weight * (1 + reps / 30);                  // Epley
}

// Retourne le poids pour un % de 1RM donné, arrondi au 0.5 kg près
export function weightFromPercent(oneRM: number, percent: number): number {
  const raw = oneRM * (percent / 100);
  return Math.round(raw * 2) / 2;
}

// ─── Types locaux pour les données de programme ──────────────────────────────

export type ProgramSetData = {
  id: string;
  exercise_id: string;
  exercise_nom: string;
  exercise_groupe: string | null;
  ordre: number;
  type_set: 'warmup' | 'normal' | 'dropset' | 'failure';
  reps_cible: number | null;
  rep_range: string | null;
  charge_cible: number | null;
  pourcentage_1rm: number | null;
  rpe_cible: number | null;
  superset_group: string | null;
  note: string | null;
};

export type ProgramDayData = {
  id: string;
  nom: string;
  numero_jour: number;
  sets: ProgramSetData[];
};

export type ProgramWeekData = {
  id: string;
  numero_semaine: number;
  note: string | null;
  days: ProgramDayData[];
};

export type ProgramFullData = {
  id: string;
  nom: string;
  objectif: string | null;
  duree_semaines: number | null;
  frequence_hebdo: number | null;
  description: string | null;
  weeks: ProgramWeekData[];
};

// ─── Chargement d'un programme complet ───────────────────────────────────────

export async function loadFullProgram(programId: string): Promise<ProgramFullData | null> {
  // 1. Données du programme
  const { data: prog, error: progErr } = await supabase
    .from('programs')
    .select('id, nom, objectif, duree_semaines, frequence_hebdo, description')
    .eq('id', programId)
    .single() as unknown as { data: any; error: any };

  if (progErr || !prog) return null;

  // 2. Semaines
  const { data: weeks, error: weeksErr } = await supabase
    .from('program_weeks')
    .select('id, numero_semaine, note')
    .eq('program_id', programId)
    .order('numero_semaine') as unknown as { data: any[]; error: any };

  if (weeksErr || !weeks?.length) return { ...prog, weeks: [] };

  const weekIds = weeks.map((w: any) => w.id);

  // 3. Jours
  const { data: days, error: daysErr } = await supabase
    .from('program_days')
    .select('id, program_week_id, numero_jour, nom')
    .in('program_week_id', weekIds)
    .order('numero_jour') as unknown as { data: any[]; error: any };

  if (daysErr || !days?.length) return { ...prog, weeks: weeks.map((w: any) => ({ ...w, days: [] })) };

  const dayIds = days.map((d: any) => d.id);

  // 4. Séries + exercices (jointure)
  const { data: sets, error: setsErr } = await supabase
    .from('program_sets')
    .select(`
      id, program_day_id, exercise_id, ordre, type_set,
      reps_cible, rep_range, charge_cible, pourcentage_1rm, rpe_cible, superset_group, note,
      exercises (nom, groupe_musculaire)
    `)
    .in('program_day_id', dayIds)
    .order('ordre') as unknown as { data: any[]; error: any };

  const setsData: any[] = setsErr ? [] : (sets ?? []);

  // 5. Assemblage
  return {
    ...prog,
    weeks: weeks.map((w: any) => ({
      ...w,
      days: days
        .filter((d: any) => d.program_week_id === w.id)
        .map((d: any) => ({
          ...d,
          sets: setsData
            .filter((s: any) => s.program_day_id === d.id)
            .map((s: any) => ({
              id: s.id,
              exercise_id: s.exercise_id,
              exercise_nom: s.exercises?.nom ?? 'Exercice inconnu',
              exercise_groupe: s.exercises?.groupe_musculaire ?? null,
              ordre: s.ordre,
              type_set: s.type_set,
              reps_cible: s.reps_cible,
              rep_range: s.rep_range,
              charge_cible: s.charge_cible,
              pourcentage_1rm: s.pourcentage_1rm,
              rpe_cible: s.rpe_cible,
              superset_group: s.superset_group,
              note: s.note,
            })),
        })),
    })),
  };
}

// ─── Conversion d'un ProgramDay en exercices prêts à logger ──────────────────

export type PreparedExercise = {
  id: string;           // ID temporaire pour la session
  exercise_id: string;
  name: string;
  muscleGroup: string | null;
  sets: PreparedSet[];
  superset_group?: string;
  notes?: string;
};

export type PreparedSet = {
  id: string;
  type: 'warmup' | 'normal' | 'dropset' | 'failure';
  targetReps: number | null;
  targetRepsRange: string | null;
  targetWeight: number;    // charge calculée (kg), 0 si inconnue
  targetWeightLabel: string; // affichage lisible : "80 kg" ou "75% = ~80 kg"
  targetRpe: number | null;
  completed: boolean;
  reps: number;
  weight: number;
};

type OneRMMap = Record<string, number>; // exercise_nom → 1RM estimé

export function prepareDayFromProgram(
  day: ProgramDayData,
  oneRMs: OneRMMap
): PreparedExercise[] {
  // Regroupe les sets par exercice (en maintenant l'ordre)
  const exerciseMap = new Map<string, { exercise_id: string; nom: string; groupe: string | null; sets: ProgramSetData[]; superset?: string; note?: string }>();

  for (const s of day.sets) {
    const key = s.exercise_id;
    if (!exerciseMap.has(key)) {
      exerciseMap.set(key, {
        exercise_id: s.exercise_id,
        nom: s.exercise_nom,
        groupe: s.exercise_groupe,
        sets: [],
        superset: s.superset_group ?? undefined,
        note: s.note ?? undefined,
      });
    }
    exerciseMap.get(key)!.sets.push(s);
  }

  return Array.from(exerciseMap.values()).map(ex => ({
    id: `tmp-${ex.exercise_id}-${Date.now()}`,
    exercise_id: ex.exercise_id,
    name: ex.nom,
    muscleGroup: ex.groupe,
    superset_group: ex.superset,
    sets: ex.sets.map(s => {
      const oneRM = oneRMs[ex.nom] ?? 0;
      let targetWeight = 0;
      let label = '—';

      if (s.charge_cible && s.charge_cible > 0) {
        targetWeight = s.charge_cible;
        label = `${targetWeight} kg`;
      } else if (s.pourcentage_1rm && oneRM > 0) {
        targetWeight = weightFromPercent(oneRM, s.pourcentage_1rm);
        label = `${s.pourcentage_1rm}% ≈ ${targetWeight} kg`;
      } else if (s.pourcentage_1rm && oneRM === 0) {
        label = `${s.pourcentage_1rm}% (1RM inconnu)`;
      }

      return {
        id: `set-${s.id}-${Math.random().toString(36).slice(2)}`,
        type: s.type_set,
        targetReps: s.reps_cible,
        targetRepsRange: s.rep_range,
        targetWeight,
        targetWeightLabel: label,
        targetRpe: s.rpe_cible,
        completed: false,
        reps: s.reps_cible ?? 0,
        weight: targetWeight,
      };
    }),
  }));
}

// ─── Récupère les 1RM estimés de l'utilisateur depuis les PR enregistrés ─────

export async function getUserOneRMs(userId: string): Promise<OneRMMap> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise_nom, value')
    .eq('user_id', userId)
    .eq('record_type', '1rm_estimated') as unknown as {
      data: Array<{ exercise_nom: string; value: number }> | null;
      error: any;
    };

  if (error || !data) return {};
  return Object.fromEntries(data.map(r => [r.exercise_nom, r.value]));
}

// ─── Sauvegarde d'une séance (workouts + logged_sets) dans Supabase ──────────

export type SetToLog = {
  exercise_id?: string;
  exercise_nom: string;
  ordre: number;
  type_set: 'warmup' | 'normal' | 'dropset' | 'failure';
  reps: number;
  charge: number;
  rpe?: number;
  completed: boolean;
  note?: string;
};

export async function saveWorkoutToSupabase(params: {
  userId: string;
  programDayId?: string;
  date: string;
  duree: number;
  note?: string;
  sets: SetToLog[];
}): Promise<{ workoutId: string | null; prs: string[] }> {
  // 1. Créer la séance
  const { data: workout, error: wErr } = await (supabase
    .from('workouts') as any)
    .insert({
      user_id: params.userId,
      program_day_id: params.programDayId ?? null,
      date: params.date,
      duree: params.duree,
      note: params.note ?? null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: any };

  if (wErr || !workout) return { workoutId: null, prs: [] };

  const workoutId = workout.id;

  // 2. Détecter les PRs et logger les sets
  const prs: string[] = [];
  const existingPRs = await supabase
    .from('personal_records')
    .select('exercise_nom, value')
    .eq('user_id', params.userId)
    .eq('record_type', '1rm_estimated') as unknown as {
      data: Array<{ exercise_nom: string; value: number }> | null;
      error: any;
    };

  const prMap = new Map((existingPRs.data ?? []).map((r: any) => [r.exercise_nom, r.value]));

  const logsToInsert = params.sets
    .filter(s => s.completed && s.reps > 0 && s.charge > 0)
    .map((s, i) => {
      const estimated1rm = estimateOneRM(s.charge, s.reps);
      const current = prMap.get(s.exercise_nom) ?? 0;
      const isPR = estimated1rm > current;
      if (isPR) {
        prMap.set(s.exercise_nom, estimated1rm);
        prs.push(s.exercise_nom);
      }
      return {
        workout_id: workoutId,
        exercise_id: s.exercise_id ?? null,
        exercise_nom: s.exercise_nom,
        ordre: i + 1,
        type_set: s.type_set,
        reps: s.reps,
        charge: s.charge,
        rpe: s.rpe ?? null,
        is_pr: isPR,
        completed: s.completed,
        note: s.note ?? null,
      };
    });

  const db = supabase as any;

  if (logsToInsert.length > 0) {
    await db.from('logged_sets').insert(logsToInsert);
  }

  // 3. Mettre à jour les PRs en base
  for (const [exerciseNom, value] of prMap) {
    if (prs.includes(exerciseNom)) {
      await db.from('personal_records').upsert({
        user_id: params.userId,
        exercise_nom: exerciseNom,
        record_type: '1rm_estimated',
        value,
        achieved_at: params.date,
        workout_id: workoutId,
      });
    }
  }

  return { workoutId, prs };
}
