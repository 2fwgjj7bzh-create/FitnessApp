/**
 * Rappel « séance du jour » : une notification hebdomadaire pour chaque jour où un
 * programme est prévu dans le planning de la semaine.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getPrograms, getWeeklyTemplate } from '../storage';

const KEY = '@fitness/reminders';
const PREFIX = 'workout-';

export interface ReminderSettings { workout: { enabled: boolean; hour: number; minute: number } }
export const DEFAULT_REMINDERS: ReminderSettings = { workout: { enabled: false, hour: 17, minute: 0 } };

export async function getReminderSettings(): Promise<ReminderSettings> {
  try { const raw = await AsyncStorage.getItem(KEY); if (raw) return { ...DEFAULT_REMINDERS, ...JSON.parse(raw) }; } catch {}
  return DEFAULT_REMINDERS;
}

export async function saveReminderSettings(s: ReminderSettings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
  await rescheduleWorkoutReminders(s);
}

export async function rescheduleWorkoutReminders(s?: ReminderSettings): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const settings = s ?? await getReminderSettings();
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter(n => n.identifier.startsWith(PREFIX)).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    if (!settings.workout.enabled) return 0;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && !(await Notifications.requestPermissionsAsync()).granted) return 0;
    const [template, programs] = await Promise.all([getWeeklyTemplate(), getPrograms()]);
    let n = 0;
    for (const [day, programId] of Object.entries(template)) {
      const prog = programs.find(p => p.id === programId);
      if (!prog) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${day}`,
        content: { title: 'Séance du jour 🏋️', body: `${prog.name} — ${prog.exercises.length} exercice${prog.exercises.length > 1 ? 's' : ''}. On y va !`, sound: true },
        // expo : 1 = dimanche … 7 = samedi ; JS getDay : 0 = dimanche … 6 = samedi
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: Number(day) + 1, hour: settings.workout.hour, minute: settings.workout.minute },
      });
      n++;
    }
    return n;
  } catch (e) {
    console.warn('[reminders]', e);
    return 0;
  }
}
