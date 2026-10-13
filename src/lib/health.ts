/**
 * Accès à Apple Santé (HealthKit) — lecture seule : pas, énergie active, entraînements.
 *
 * HealthKit n'existe PAS dans Expo Go : il faut la version compilée de l'appli (EAS build).
 * Le module natif est donc chargé à la demande, dans un try/catch, pour que l'appli
 * continue de fonctionner normalement dans Expo Go (saisie manuelle des pas à la place).
 */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export type HealthStatus =
  | 'available'      // version compilée sur iPhone : on peut demander l'accès
  | 'expo-go'        // Expo Go : HealthKit indisponible
  | 'not-ios'        // Android / web
  | 'unavailable';   // module absent ou Santé non disponible sur l'appareil

export interface HealthDay {
  date: string;          // AAAA-MM-JJ (local)
  steps: number;
  activeKcal: number;    // énergie active (au-dessus du métabolisme de base)
  workoutKcal: number;   // énergie active pendant les entraînements enregistrés dans Santé
  workoutMinutes: number;
}

let hk: any | null | undefined;

function loadHealthKit(): any | null {
  if (hk !== undefined) return hk;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    hk = require('@kingstinct/react-native-healthkit');
  } catch (e) {
    console.warn('[health] module HealthKit indisponible', e);
    hk = null;
  }
  return hk;
}

export function healthStatus(): HealthStatus {
  if (Platform.OS !== 'ios') return 'not-ios';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'expo-go';
  const mod = loadHealthKit();
  if (!mod) return 'unavailable';
  try {
    return mod.isHealthDataAvailable() ? 'available' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKWorkoutTypeIdentifier',
] as const;

/** Affiche la fenêtre d'autorisation Santé (une seule fois ; ensuite iOS ne la remontre plus). */
export async function requestHealthAccess(): Promise<boolean> {
  if (healthStatus() !== 'available') return false;
  try {
    return await loadHealthKit().requestAuthorization({ toRead: READ_TYPES });
  } catch (e) {
    console.warn('[health] autorisation refusée', e);
    return false;
  }
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}

/**
 * Totaux par jour sur les `days` derniers jours (aujourd'hui inclus, partiel).
 * Lève une erreur si Santé n'est pas disponible.
 */
export async function readHealthDays(days = 14): Promise<HealthDay[]> {
  if (healthStatus() !== 'available') throw new Error('Apple Santé indisponible');
  const mod = loadHealthKit();
  await requestHealthAccess();

  const end = new Date();
  const start = startOfDay(new Date(Date.now() - (days - 1) * 86400000));
  const anchor = startOfDay(end);
  const filter = { date: { startDate: start, endDate: end } };

  const byDate: Record<string, HealthDay> = {};
  for (let i = 0; i < days; i++) {
    const d = localDate(new Date(start.getTime() + i * 86400000 + 12 * 3600000));
    byDate[d] = { date: d, steps: 0, activeKcal: 0, workoutKcal: 0, workoutMinutes: 0 };
  }

  const [steps, energy, workouts] = await Promise.all([
    mod.queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], anchor, { day: 1 }, { filter, unit: 'count' }).catch(() => []),
    mod.queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], anchor, { day: 1 }, { filter, unit: 'kcal' }).catch(() => []),
    mod.queryWorkoutSamples({ limit: 0, filter }).catch(() => []),
  ]);

  for (const s of steps as any[]) {
    if (!s.startDate) continue;
    const d = localDate(new Date(s.startDate));
    if (byDate[d]) byDate[d].steps = Math.round(s.sumQuantity?.quantity ?? 0);
  }
  for (const s of energy as any[]) {
    if (!s.startDate) continue;
    const d = localDate(new Date(s.startDate));
    if (byDate[d]) byDate[d].activeKcal = Math.round(s.sumQuantity?.quantity ?? 0);
  }
  for (const w of workouts as any[]) {
    const d = localDate(new Date(w.startDate));
    if (!byDate[d]) continue;
    const q = w.totalEnergyBurned;
    let kcal = q?.quantity ?? 0;
    if (q?.unit === 'kJ') kcal = kcal / 4.184;
    byDate[d].workoutKcal += Math.round(kcal);
    const minutes = (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 60000;
    byDate[d].workoutMinutes += Math.round(minutes);
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}
