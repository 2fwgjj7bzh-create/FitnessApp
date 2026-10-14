/** Lien vidéo de démonstration par exercice (ta propre vidéo : YouTube, Instagram, Drive…). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

const KEY = '@fitness/exercise_videos';

export async function getVideoLinks(): Promise<Record<string, string>> {
  try { const raw = await AsyncStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch {}
  return {};
}
export async function setVideoLink(exercise: string, url: string | undefined) {
  const all = await getVideoLinks();
  if (url && url.trim()) all[exercise] = url.trim(); else delete all[exercise];
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}
export function openVideo(url: string) {
  const u = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  Linking.openURL(u).catch(() => {});
}
export function searchDemo(exercise: string) {
  Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise + ' technique exécution')}`).catch(() => {});
}
