/**
 * Habitudes quotidiennes. Certaines se cochent toutes seules à partir des données
 * de l'appli (eau, protéines, pas, séance), les autres se cochent à la main.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGoals, getNutritionDay, getWorkouts, getWeeklyTemplate } from '../storage';
import { calcDayNutrition, localDateStr, uid } from '../utils/helpers';
import { getWaterSettings } from './water';
import { getNeatDays } from './neat';

const DEFS_KEY = '@fitness/habits';
const LOG_KEY = '@fitness/habit_log';

export type AutoKind = 'water' | 'protein' | 'steps' | 'workout';

export interface HabitDef {
  id: string;
  label: string;
  icon: string;          // Ionicons
  auto?: AutoKind;
  target?: number;       // pas
  active: boolean;
}

export const DEFAULT_HABITS: HabitDef[] = [
  { id: 'workout', label: 'Séance prévue faite', icon: 'barbell-outline', auto: 'workout', active: true },
  { id: 'protein', label: 'Objectif de protéines', icon: 'nutrition-outline', auto: 'protein', active: true },
  { id: 'water', label: "Objectif d'eau", icon: 'water-outline', auto: 'water', active: true },
  { id: 'steps', label: 'Pas', icon: 'footsteps-outline', auto: 'steps', target: 8000, active: true },
  { id: 'sleep', label: 'Au moins 7 h de sommeil', icon: 'moon-outline', active: true },
  { id: 'supplements', label: 'Compléments pris', icon: 'medkit-outline', active: false },
];

export async function getHabitDefs(): Promise<HabitDef[]> {
  try { const raw = await AsyncStorage.getItem(DEFS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return DEFAULT_HABITS;
}
export async function saveHabitDefs(list: HabitDef[]) { await AsyncStorage.setItem(DEFS_KEY, JSON.stringify(list)); }
export function newHabit(label: string): HabitDef { return { id: 'h_' + uid(), label, icon: 'checkmark-circle-outline', active: true }; }

type Log = Record<string, Record<string, boolean>>;
async function getLog(): Promise<Log> {
  try { const raw = await AsyncStorage.getItem(LOG_KEY); if (raw) return JSON.parse(raw); } catch {}
  return {};
}
export async function toggleManual(date: string, id: string) {
  const log = await getLog();
  log[date] = { ...(log[date] ?? {}), [id]: !(log[date]?.[id]) };
  // garder ~1 an
  const keys = Object.keys(log).sort();
  while (keys.length > 400) delete log[keys.shift()!];
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(log));
}

export interface HabitState { def: HabitDef; done: boolean; detail?: string; manual: boolean }

/** État des habitudes pour une date (AAAA-MM-JJ). */
export async function habitStates(date: string, defs?: HabitDef[]): Promise<HabitState[]> {
  const list = (defs ?? await getHabitDefs()).filter(h => h.active);
  const [log, goals, day, workouts, template, water, neat] = await Promise.all([
    getLog(), getGoals(), getNutritionDay(date), getWorkouts(), getWeeklyTemplate(), getWaterSettings(), getNeatDays(),
  ]);
  const d = new Date(date + 'T12:00:00');
  const planned = !!template[String(d.getDay())];
  const trained = workouts.some(w => localDateStr(new Date(w.date)) === date);
  const protein = day ? Math.round(calcDayNutrition(day).protein) : 0;
  const waterMl = day?.waterMl ?? 0;
  const steps = neat.find(n => n.date === date)?.steps;

  return list.map(def => {
    switch (def.auto) {
      case 'workout':
        return { def, manual: false, done: trained || !planned, detail: trained ? 'Fait' : planned ? 'Prévue aujourd\'hui' : 'Jour de repos' };
      case 'protein':
        return { def, manual: false, done: protein >= goals.proteinGoal, detail: `${protein} / ${goals.proteinGoal} g` };
      case 'water':
        return { def, manual: false, done: waterMl >= water.goalMl, detail: `${(waterMl / 1000).toFixed(1)} / ${(water.goalMl / 1000).toFixed(1)} L` };
      case 'steps': {
        const t = def.target ?? 8000;
        return { def, manual: false, done: (steps ?? 0) >= t, detail: steps !== undefined ? `${steps.toLocaleString('fr')} / ${t.toLocaleString('fr')}` : `objectif ${t.toLocaleString('fr')}` };
      }
      default:
        return { def, manual: true, done: !!log[date]?.[def.id] };
    }
  });
}

/** Nombre de jours consécutifs (avant aujourd'hui, + aujourd'hui s'il est complet) où tout est coché. */
export async function habitStreak(): Promise<number> {
  const defs = await getHabitDefs();
  let streak = 0;
  const today = localDateStr();
  const todayStates = await habitStates(today, defs);
  if (todayStates.length && todayStates.every(s => s.done)) streak++;
  for (let i = 1; i <= 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const states = await habitStates(localDateStr(d), defs);
    if (states.length && states.every(s => s.done)) streak++; else break;
  }
  return streak;
}
