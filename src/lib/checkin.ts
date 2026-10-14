/**
 * Bilan : questionnaire (générique + personnalisable), mesures, planification
 * (notifications répétées + événement dans le Calendrier de l'iPhone).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';
import { CheckinQuestion, Measurements, WeeklyCheckin, FeelingLevel, SleepQuality } from '../types';
import { localDateStr } from '../utils/helpers';

// ─── Questionnaire ────────────────────────────────────────────────────────────

const QUESTIONS_KEY = '@fitness/checkin_questions';

export const DEFAULT_QUESTIONS: CheckinQuestion[] = [
  { id: 'energy', label: "Niveau d'énergie cette semaine", type: 'scale', min: 1, max: 5, minLabel: 'Épuisé', maxLabel: 'Au top', active: true, builtin: true },
  { id: 'mood', label: 'Moral / ressenti général', type: 'scale', min: 1, max: 5, minLabel: 'Très bas', maxLabel: 'Excellent', active: true, builtin: true },
  { id: 'sleep_hours', label: 'Sommeil moyen par nuit', type: 'number', unit: 'h', active: true, builtin: true },
  { id: 'sleep_quality', label: 'Qualité du sommeil', type: 'scale', min: 1, max: 5, minLabel: 'Mauvaise', maxLabel: 'Excellente', active: true, builtin: true },
  { id: 'hunger', label: 'Faim au quotidien', type: 'scale', min: 1, max: 5, minLabel: 'Aucune faim', maxLabel: 'Faim permanente', active: true, builtin: true },
  { id: 'stress', label: 'Niveau de stress', type: 'scale', min: 1, max: 5, minLabel: 'Aucun', maxLabel: 'Très élevé', active: true, builtin: true },
  { id: 'digestion', label: 'Digestion', type: 'scale', min: 1, max: 5, minLabel: 'Difficile', maxLabel: 'Parfaite', active: true, builtin: true },
  { id: 'diet_adherence', label: 'Respect du plan alimentaire', type: 'number', unit: '%', active: true, builtin: true },
  { id: 'sessions_done', label: 'Séances réalisées cette semaine', type: 'number', unit: 'séances', active: true, builtin: true },
  { id: 'performance', label: "Performances à l'entraînement", type: 'scale', min: 1, max: 5, minLabel: 'En baisse', maxLabel: 'En hausse', active: true, builtin: true },
  { id: 'pain', label: 'Douleur ou gêne à signaler ?', type: 'yesno', active: true, builtin: true },
  { id: 'win', label: 'Ta plus grande victoire de la semaine', type: 'text', active: true, builtin: true },
  { id: 'struggle', label: 'Ta plus grande difficulté', type: 'text', active: true, builtin: true },
  { id: 'comment', label: 'Commentaire libre', type: 'text', active: true, builtin: true },
];

export async function getQuestions(): Promise<CheckinQuestion[]> {
  try {
    const raw = await AsyncStorage.getItem(QUESTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_QUESTIONS;
}

export async function saveQuestions(list: CheckinQuestion[]) {
  await AsyncStorage.setItem(QUESTIONS_KEY, JSON.stringify(list));
}

export async function resetQuestions() {
  await AsyncStorage.removeItem(QUESTIONS_KEY);
}

/** Remplit les anciens champs obligatoires (ressenti, sommeil) depuis le questionnaire. */
export function legacyFieldsFromAnswers(answers: Record<string, any>): { feeling: FeelingLevel; sleepHours: number; sleepQuality: SleepQuality } {
  const clamp15 = (v: any, d: number) => { const n = Math.round(Number(v)); return (n >= 1 && n <= 5 ? n : d) as any; };
  return {
    feeling: clamp15(answers.mood, 3),
    sleepHours: Number(answers.sleep_hours) || 0,
    sleepQuality: clamp15(answers.sleep_quality, 3),
  };
}

/** Réponse à une question pour un bilan (y compris bilans anciens sans questionnaire). */
export function answerFor(c: WeeklyCheckin, id: string): any {
  if (c.answers && c.answers[id] !== undefined) return c.answers[id];
  if (id === 'mood') return c.feeling;
  if (id === 'sleep_hours') return c.sleepHours;
  if (id === 'sleep_quality') return c.sleepQuality;
  return undefined;
}

// ─── Mensurations ─────────────────────────────────────────────────────────────

export const MEASUREMENT_FIELDS: { key: keyof Measurements; label: string; side?: 'G' | 'D' }[] = [
  { key: 'chest', label: 'Poitrine' },
  { key: 'shoulders', label: 'Épaules' },
  { key: 'waist', label: 'Tour de taille' },
  { key: 'hips', label: 'Hanches' },
  { key: 'bicepsL', label: 'Biceps', side: 'G' },
  { key: 'bicepsR', label: 'Biceps', side: 'D' },
  { key: 'thighL', label: 'Cuisse', side: 'G' },
  { key: 'thighR', label: 'Cuisse', side: 'D' },
  { key: 'calfL', label: 'Mollet', side: 'G' },
  { key: 'calfR', label: 'Mollet', side: 'D' },
];

/** Normalise les anciens champs (leftArm…) vers les nouveaux (bicepsL…). */
export function normalizeMeasurements(m?: Measurements): Measurements {
  if (!m) return {};
  return {
    ...m,
    bicepsL: m.bicepsL ?? m.leftArm, bicepsR: m.bicepsR ?? m.rightArm,
    thighL: m.thighL ?? m.leftThigh, thighR: m.thighR ?? m.rightThigh,
  };
}

export function photosOf(c: WeeklyCheckin) {
  return { front: c.photos?.front ?? c.photoUri, back: c.photos?.back, side: c.photos?.side };
}

// ─── Planification ────────────────────────────────────────────────────────────

const SCHEDULE_KEY = '@fitness/checkin_schedule';
const NOTIF_PREFIX = 'checkin-';

export interface CheckinSchedule {
  enabled: boolean;
  weekday: number;      // 0 = dimanche … 6 = samedi (JS getDay)
  hour: number;
  minute: number;
  everyWeeks: 1 | 2;
  startDate: string;    // AAAA-MM-JJ du premier bilan (ancre pour « toutes les 2 semaines »)
  reminderNextDay: boolean;
  addToCalendar: boolean;
  calendarEventId?: string;
}

export const DEFAULT_SCHEDULE: CheckinSchedule = {
  enabled: false, weekday: 1, hour: 8, minute: 0, everyWeeks: 1,
  startDate: localDateStr(), reminderNextDay: true, addToCalendar: true,
};

export async function getSchedule(): Promise<CheckinSchedule> {
  try { const raw = await AsyncStorage.getItem(SCHEDULE_KEY); if (raw) return { ...DEFAULT_SCHEDULE, ...JSON.parse(raw) }; } catch {}
  return DEFAULT_SCHEDULE;
}

/** Prochaines dates de bilan (à partir d'aujourd'hui inclus). */
export function nextOccurrences(s: CheckinSchedule, count: number, from: Date = new Date()): Date[] {
  const out: Date[] = [];
  const anchor = new Date(s.startDate + 'T12:00:00');
  // premier jour ≥ ancre correspondant au jour de semaine choisi
  const first = new Date(anchor);
  first.setDate(first.getDate() + ((s.weekday - first.getDay() + 7) % 7));
  first.setHours(s.hour, s.minute, 0, 0);
  const step = 7 * s.everyWeeks;
  const d = new Date(first);
  // avancer jusqu'à la première occurrence non passée
  while (d.getTime() < from.getTime() - 60000) d.setDate(d.getDate() + step);
  for (let i = 0; i < count; i++) {
    out.push(new Date(d));
    d.setDate(d.getDate() + step);
  }
  return out;
}

export function dueDateFor(s: CheckinSchedule, now: Date = new Date()): Date | null {
  if (!s.enabled) return null;
  // occurrence la plus récente déjà passée (ou aujourd'hui)
  const back = new Date(now); back.setDate(back.getDate() - 7 * s.everyWeeks);
  const occ = nextOccurrences(s, 2, back);
  const past = occ.filter(o => o.getTime() <= now.getTime());
  return past.length ? past[past.length - 1] : null;
}

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export function describeSchedule(s: CheckinSchedule): string {
  if (!s.enabled) return 'Non planifié';
  const hh = `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`;
  return `${s.everyWeeks === 1 ? 'Chaque' : 'Un'} ${WEEKDAYS[s.weekday]}${s.everyWeeks === 2 ? ' sur deux' : ''} à ${hh}`;
}

async function cancelCheckinNotifications() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter(n => n.identifier.startsWith(NOTIF_PREFIX)).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch {}
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch { return false; }
}

/**
 * (Re)programme les notifications des 8 prochains bilans (+ relance le lendemain si pas fait).
 * Appelé à l'ouverture de l'appli, après un changement de réglage et après chaque bilan.
 */
export async function rescheduleCheckinNotifications(checkins?: WeeklyCheckin[]): Promise<void> {
  if (Platform.OS === 'web') return;
  const s = await getSchedule();
  await cancelCheckinNotifications();
  if (!s.enabled || !(await ensureNotificationPermission())) return;
  const doneDates = new Set((checkins ?? []).map(c => c.date));
  const occ = nextOccurrences(s, 8);
  for (const d of occ) {
    const key = localDateStr(d);
    if (!doneDates.has(key) && d.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${NOTIF_PREFIX}${key}`,
        content: { title: "C'est l'heure de ton bilan 📋", body: 'Poids, mensurations, photos et questionnaire : 5 minutes.', sound: true, data: { screen: 'bilan' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d },
      }).catch(() => {});
    }
    if (s.reminderNextDay) {
      const r = new Date(d); r.setDate(r.getDate() + 1);
      const done = [...doneDates].some(x => x >= key && x <= localDateStr(r));
      if (!done && r.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${NOTIF_PREFIX}relance-${key}`,
          content: { title: 'Bilan en attente', body: "Tu n'as pas encore fait ton bilan. Ça prend 5 minutes.", sound: true, data: { screen: 'bilan' } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r },
        }).catch(() => {});
      }
    }
  }
}

// ─── Calendrier iPhone ────────────────────────────────────────────────────────

async function writableCalendarId(): Promise<string | null> {
  const perm = await Calendar.requestCalendarPermissionsAsync();
  if (perm.status !== 'granted') return null;
  if (Platform.OS === 'ios') {
    try { const def = await Calendar.getDefaultCalendarAsync(); if (def?.id) return def.id; } catch {}
  }
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return cals.find(c => c.allowsModifications)?.id ?? null;
}

async function syncCalendarEvent(s: CheckinSchedule): Promise<CheckinSchedule> {
  if (Platform.OS === 'web') return s;
  // Supprime l'ancien événement s'il existe
  if (s.calendarEventId) {
    try { await Calendar.deleteEventAsync(s.calendarEventId, { futureEvents: true }); } catch {}
    s = { ...s, calendarEventId: undefined };
  }
  if (!s.enabled || !s.addToCalendar) return s;
  const calendarId = await writableCalendarId();
  if (!calendarId) throw new Error("Accès au Calendrier refusé. Autorise-le dans Réglages › Confidentialité › Calendriers.");
  const start = nextOccurrences(s, 1)[0];
  const end = new Date(start.getTime() + 15 * 60000);
  const eventId = await Calendar.createEventAsync(calendarId, {
    title: 'Bilan — suivi coaching',
    notes: 'Poids, mensurations, photos (face, dos, profil) et questionnaire dans l\'appli.',
    startDate: start,
    endDate: end,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recurrenceRule: { frequency: Calendar.Frequency.WEEKLY, interval: s.everyWeeks },
    alarms: [{ relativeOffset: 0 }],
  });
  return { ...s, calendarEventId: eventId };
}

/** Enregistre la planification, met à jour le Calendrier et les notifications. */
export async function saveSchedule(next: CheckinSchedule, checkins?: WeeklyCheckin[]): Promise<{ schedule: CheckinSchedule; calendarError?: string }> {
  let s = next;
  let calendarError: string | undefined;
  try { s = await syncCalendarEvent(s); } catch (e: any) { calendarError = e?.message ?? String(e); }
  await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(s));
  await rescheduleCheckinNotifications(checkins);
  return { schedule: s, calendarError };
}
