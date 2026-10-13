/**
 * NEAT (thermogenèse hors exercice) et dépense des séances, jour par jour.
 *
 * Sources, par ordre de priorité :
 *  1. Apple Santé : énergie active − énergie des entraînements = NEAT ; énergie des entraînements = EAT.
 *  2. Saisie manuelle des pas (Expo Go, ou jour sans données Santé) : NEAT estimé depuis les pas.
 *  3. Séances enregistrées dans l'appli, si Santé n'a pas d'entraînement ce jour-là :
 *     EAT estimé via les METs (Compendium of Physical Activities).
 *
 * Les moyennes portent sur les 7 derniers jours COMPLETS (hier et avant) : la journée en
 * cours est partielle et ferait baisser artificiellement la moyenne.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout } from '../types';
import { localDateStr } from '../utils/helpers';
import { readHealthDays, healthStatus } from './health';

const KEY = '@fitness/neat_days';
const META_KEY = '@fitness/neat_meta';

export interface NeatDay {
  date: string;
  steps?: number;
  activeKcal?: number;     // Santé uniquement
  workoutKcal?: number;    // Santé uniquement
  source: 'health' | 'manual';
  updatedAt: string;
}

export interface NeatMeta { lastHealthSync?: string }

// ─── Constantes physiologiques (documentées) ─────────────────────────────────

/** Longueur de pas ≈ 0,415 × taille (hommes), 0,413 × taille (femmes). */
export const STRIDE_FACTOR = { male: 0.415, female: 0.413 } as const;
/**
 * Coût NET de la marche (au-dessus du repos) ≈ 0,5 kcal·kg⁻¹·km⁻¹ à allure normale,
 * à peu près indépendant de la vitesse entre 3 et 6 km/h.
 */
export const NET_WALK_KCAL_PER_KG_KM = 0.5;
/**
 * Musculation : 3,5 à 6 METs selon l'intensité (Compendium 2024). On retient 5 METs
 * pour une séance de musculation hypertrophie avec repos, soit 4 METs NETS
 * (on retire le MET de repos déjà compté dans le métabolisme de base).
 */
export const STRENGTH_NET_METS = 4;
/** Séance sans durée enregistrée (anciennes séances) : ~2,5 min par série validée, repos inclus. */
export const MINUTES_PER_SET_FALLBACK = 2.5;

export function kcalPerStep(weightKg: number, heightCm: number, sex: 'male' | 'female' = 'male'): number {
  const strideM = STRIDE_FACTOR[sex] * (heightCm / 100);
  return NET_WALK_KCAL_PER_KG_KM * weightKg * (strideM / 1000);
}

// ─── Stockage ─────────────────────────────────────────────────────────────────

export async function getNeatDays(): Promise<NeatDay[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveNeatDays(list: NeatDay[]) {
  const trimmed = [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 400);
  await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
}

export async function getNeatMeta(): Promise<NeatMeta> {
  try { const raw = await AsyncStorage.getItem(META_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

/** Saisie manuelle des pas pour une date (ne remplace pas une journée venue de Santé avec énergie active). */
export async function saveManualSteps(date: string, steps: number) {
  const list = await getNeatDays();
  const idx = list.findIndex(d => d.date === date);
  const day: NeatDay = { date, steps: Math.max(0, Math.round(steps)), source: 'manual', updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = { ...list[idx], ...day, activeKcal: undefined, workoutKcal: undefined };
  else list.push(day);
  await saveNeatDays(list);
}

/** Importe les 14 derniers jours depuis Apple Santé. Renvoie le nombre de jours mis à jour. */
export async function syncNeatFromHealth(days = 14): Promise<number> {
  if (healthStatus() !== 'available') return 0;
  const health = await readHealthDays(days);
  const list = await getNeatDays();
  let n = 0;
  for (const h of health) {
    if (h.steps === 0 && h.activeKcal === 0) continue; // téléphone/montre non portés : on garde une éventuelle saisie
    const day: NeatDay = {
      date: h.date, steps: h.steps, activeKcal: h.activeKcal, workoutKcal: h.workoutKcal,
      source: 'health', updatedAt: new Date().toISOString(),
    };
    const idx = list.findIndex(d => d.date === h.date);
    if (idx >= 0) list[idx] = day; else list.push(day);
    n++;
  }
  await saveNeatDays(list);
  await AsyncStorage.setItem(META_KEY, JSON.stringify({ lastHealthSync: new Date().toISOString() } as NeatMeta));
  return n;
}

// ─── Calculs ──────────────────────────────────────────────────────────────────

export interface Body {
  weightKg: number; heightCm: number; sex: 'male' | 'female';
  /** Apple Watch portée pendant les séances : leur dépense est déjà dans l'énergie active de Santé. */
  watchDuringWorkouts?: boolean;
}

export interface DayEnergy {
  date: string;
  neat: number | null;          // null = pas de donnée ce jour
  eat: number;
  steps?: number;
  neatSource?: 'health' | 'steps';
  eatSource?: 'health' | 'app' | 'none';
}

function appWorkoutKcal(workouts: Workout[], date: string, weightKg: number): number {
  return workouts
    .filter(w => localDateStr(new Date(w.date)) === date)
    .reduce((sum, w) => {
      const done = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0);
      if (done === 0) return sum;
      const minutes = w.duration > 0 ? w.duration / 60 : done * MINUTES_PER_SET_FALLBACK;
      return sum + STRENGTH_NET_METS * weightKg * (minutes / 60);
    }, 0);
}

export function energyForDay(date: string, neatDays: NeatDay[], workouts: Workout[], body: Body): DayEnergy {
  const nd = neatDays.find(d => d.date === date);
  let neat: number | null = null;
  let neatSource: DayEnergy['neatSource'];
  let healthWorkout = 0;

  if (nd?.source === 'health' && (nd.activeKcal ?? 0) > 0) {
    healthWorkout = nd.workoutKcal ?? 0;
    neat = Math.max(0, (nd.activeKcal ?? 0) - healthWorkout);
    neatSource = 'health';
  } else if (nd?.steps !== undefined && nd.steps > 0) {
    neat = nd.steps * kcalPerStep(body.weightKg, body.heightCm, body.sex);
    neatSource = 'steps';
  }

  let eat = 0;
  let eatSource: DayEnergy['eatSource'] = 'none';
  if (healthWorkout > 0) { eat = healthWorkout; eatSource = 'health'; }
  else if (neatSource === 'health' && body.watchDuringWorkouts) {
    // Séance non enregistrée comme entraînement dans Santé mais montre portée :
    // sa dépense est déjà dans l'énergie active (donc dans le NEAT). On ne l'ajoute pas deux fois.
    eatSource = 'none';
  } else {
    const app = appWorkoutKcal(workouts, date, body.weightKg);
    if (app > 0) { eat = app; eatSource = 'app'; }
  }
  return { date, neat: neat === null ? null : Math.round(neat), eat: Math.round(eat), steps: nd?.steps, neatSource, eatSource };
}

export interface WeekAverage {
  days: DayEnergy[];        // 7 derniers jours complets, du plus ancien au plus récent
  daysWithData: number;
  neatAvg: number | null;   // null si aucune donnée
  eatAvg: number;
  stepsAvg: number | null;
}

export function lastCompleteDays(n = 7, from: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(from); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
    out.push(localDateStr(d));
  }
  return out;
}

export function weekAverage(neatDays: NeatDay[], workouts: Workout[], body: Body, from: Date = new Date()): WeekAverage {
  const days = lastCompleteDays(7, from).map(d => energyForDay(d, neatDays, workouts, body));
  const withNeat = days.filter(d => d.neat !== null);
  const withSteps = days.filter(d => (d.steps ?? 0) > 0);
  return {
    days,
    daysWithData: withNeat.length,
    neatAvg: withNeat.length ? withNeat.reduce((a, d) => a + (d.neat ?? 0), 0) / withNeat.length : null,
    // EAT : moyenne sur 7 jours calendaires (les jours sans séance comptent pour 0)
    eatAvg: days.reduce((a, d) => a + d.eat, 0) / 7,
    stepsAvg: withSteps.length ? withSteps.reduce((a, d) => a + (d.steps ?? 0), 0) / withSteps.length : null,
  };
}
