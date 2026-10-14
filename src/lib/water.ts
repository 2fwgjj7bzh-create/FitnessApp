/**
 * Hydratation : objectif quotidien réglable + rappels optionnels.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const KEY = '@fitness/water_settings';
const PREFIX = 'water-';

export interface WaterSettings {
  goalMl: number;
  reminders: boolean;
  startHour: number;
  endHour: number;
  everyHours: number;
}

export const DEFAULT_WATER: WaterSettings = { goalMl: 2500, reminders: false, startHour: 9, endHour: 21, everyHours: 2 };

export async function getWaterSettings(): Promise<WaterSettings> {
  try { const raw = await AsyncStorage.getItem(KEY); if (raw) return { ...DEFAULT_WATER, ...JSON.parse(raw) }; } catch {}
  return DEFAULT_WATER;
}

export async function saveWaterSettings(s: WaterSettings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
  await rescheduleWaterReminders(s);
}

export async function rescheduleWaterReminders(s?: WaterSettings) {
  if (Platform.OS === 'web') return;
  const settings = s ?? await getWaterSettings();
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter(n => n.identifier.startsWith(PREFIX)).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    if (!settings.reminders) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && !(await Notifications.requestPermissionsAsync()).granted) return;
    for (let h = settings.startHour; h <= settings.endHour; h += Math.max(1, settings.everyHours)) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${h}`,
        content: { title: 'Hydratation 💧', body: `Pense à boire un verre d'eau (objectif : ${(settings.goalMl / 1000).toFixed(1)} L).`, sound: false },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: 0 },
      });
    }
  } catch (e) {
    console.warn('[water] rappels impossibles', e);
  }
}
