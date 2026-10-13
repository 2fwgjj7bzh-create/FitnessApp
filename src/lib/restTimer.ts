/**
 * Minuteur de repos entre les séries.
 * - Le décompte se base sur une heure de fin (pas sur un compteur) : il reste juste
 *   même si l'appli passe en arrière-plan ou si le téléphone se verrouille.
 * - Une notification locale est programmée pour la fin du repos : elle sonne/vibre
 *   écran verrouillé. Elle est annulée si on passe ou modifie le repos.
 */
import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

export const DEFAULT_REST_SECONDS = 90;

let permissionAsked = false;
let handlerSet = false;

function ensureHandler() {
  if (handlerSet) return;
  handlerSet = true;
  // Appli ouverte : on ne montre pas la bannière (le minuteur à l'écran vibre déjà).
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (permissionAsked) return false;
    permissionAsked = true;
    const res = await Notifications.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

/** Programme la notification de fin de repos. Renvoie son id (ou null si indisponible). */
export async function scheduleRestEnd(seconds: number, exerciseName?: string): Promise<string | null> {
  if (Platform.OS === 'web' || seconds <= 0) return null;
  try {
    ensureHandler();
    if (!(await ensurePermission())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Repos terminé 💪',
        body: exerciseName ? `Série suivante : ${exerciseName}` : 'Série suivante !',
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)) },
    });
  } catch (e) {
    console.warn('[restTimer] notification impossible', e);
    return null;
  }
}

export async function cancelRestEnd(id: string | null | undefined) {
  if (!id || Platform.OS === 'web') return;
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* déjà partie */ }
}

/** Signal de fin de repos quand l'appli est à l'écran. */
export function restEndFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  Vibration.vibrate(Platform.OS === 'android' ? [0, 400, 200, 400] : 400);
}

export function lightTap() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}
