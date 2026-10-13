/**
 * Réglages persistants de l'onglet Métabolisme + mise à jour automatique des objectifs
 * quand le mode « Mesuré (NEAT) » est choisi.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGoals, saveGoals, getProfile, getWorkouts } from '../storage';
import { calcBMR, computeGoals, measuredTDEE, MEASURED_ACTIVITY, MeasuredBreakdown, Sex } from '../utils/metabolism';
import { getNeatDays, syncNeatFromHealth, weekAverage, WeekAverage } from './neat';
import { healthStatus } from './health';
import { localDateStr } from '../utils/helpers';

const KEY = '@fitness/metabolism';

export interface MetabolismSettings {
  age: string;
  height: string;
  sex: Sex;
  bf: string;
  formula: string;
  activity: number;        // multiplicateur, ou MEASURED_ACTIVITY
  adjust: number;          // % déficit / surplus
  autoUpdate: boolean;     // mode Mesuré : objectifs recalculés chaque jour
  watchDuringWorkouts: boolean;
  lastAutoUpdate?: string; // AAAA-MM-JJ
}

export async function getMetabolismSettings(): Promise<MetabolismSettings> {
  let saved: Partial<MetabolismSettings> = {};
  try { const raw = await AsyncStorage.getItem(KEY); if (raw) saved = JSON.parse(raw); } catch {}
  const profile = await getProfile();
  return {
    age: saved.age ?? (profile.age ? String(profile.age) : '25'),
    height: saved.height ?? (profile.heightCm ? String(profile.heightCm) : '175'),
    sex: saved.sex ?? profile.gender ?? 'male',
    bf: saved.bf ?? '15',
    formula: saved.formula ?? 'mifflin',
    activity: saved.activity ?? 1.55,
    adjust: saved.adjust ?? 0,
    autoUpdate: saved.autoUpdate ?? true,
    watchDuringWorkouts: saved.watchDuringWorkouts ?? false,
    lastAutoUpdate: saved.lastAutoUpdate,
  };
}

export async function saveMetabolismSettings(patch: Partial<MetabolismSettings>) {
  const current = await getMetabolismSettings();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
}

export interface MeasuredResult extends MeasuredBreakdown {
  week: WeekAverage;
  final: number;            // après ajustement %
  usable: boolean;          // au moins 3 jours de NEAT sur 7
}

export const MIN_DAYS_FOR_MEASURED = 3;

/** Calcule la dépense mesurée à partir des réglages + NEAT + séances. */
export async function computeMeasured(settings: MetabolismSettings, weightKg: number): Promise<MeasuredResult> {
  const [neatDays, workouts] = await Promise.all([getNeatDays(), getWorkouts()]);
  const h = parseFloat(settings.height) || 175;
  const body = { weightKg, heightCm: h, sex: settings.sex, watchDuringWorkouts: settings.watchDuringWorkouts };
  const week = weekAverage(neatDays, workouts, body);
  const bmr = calcBMR(settings.formula, weightKg, h, parseInt(settings.age) || 25, settings.sex, parseFloat(settings.bf) || 15);
  const m = measuredTDEE(bmr, week.neatAvg ?? 0, week.eatAvg);
  return { ...m, week, final: Math.round(m.tdee * (1 + settings.adjust / 100)), usable: week.daysWithData >= MIN_DAYS_FOR_MEASURED };
}

/**
 * À l'ouverture de l'appli : en mode Mesuré + mise à jour auto, synchronise Santé et
 * recalcule les objectifs une fois par jour. Ne touche à rien si les données sont insuffisantes.
 * Renvoie le nouvel objectif calorique s'il a changé.
 */
export async function autoUpdateGoalsIfNeeded(): Promise<number | null> {
  try {
    const settings = await getMetabolismSettings();
    if (settings.activity !== MEASURED_ACTIVITY || !settings.autoUpdate) return null;
    const todayStr = localDateStr();
    if (settings.lastAutoUpdate === todayStr) return null;
    if (healthStatus() === 'available') await syncNeatFromHealth(14).catch(() => 0);
    const goals = await getGoals();
    const result = await computeMeasured(settings, goals.bodyWeight);
    if (!result.usable) return null;
    const updated = computeGoals(goals.bodyWeight, result.final, goals.proteinMult, goals.fatMult, goals);
    await saveGoals(updated);
    await saveMetabolismSettings({ lastAutoUpdate: todayStr });
    return updated.calorieGoal;
  } catch (e) {
    console.warn('[metabolism] mise à jour auto impossible', e);
    return null;
  }
}
