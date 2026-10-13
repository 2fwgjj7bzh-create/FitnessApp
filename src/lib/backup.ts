/**
 * Sauvegarde / restauration de toutes les données locales de l'appli
 * (séances, programmes, nutrition, bilans, objectifs, profil, NEAT…).
 * Le fichier JSON peut être enregistré dans Fichiers / iCloud Drive / envoyé par mail.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const PREFIX = '@fitness/';
const FORMAT = 'fitnessapp-backup';

interface BackupFile {
  format: typeof FORMAT;
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

async function collect(): Promise<BackupFile> {
  const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PREFIX));
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, string> = {};
  pairs.forEach(([k, v]) => { if (v != null) data[k] = v; });
  return { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), data };
}

/** Résumé lisible (pour confirmer avant import / après export). */
export function describeBackup(b: BackupFile): string {
  const count = (key: string) => {
    try { const v = JSON.parse(b.data[PREFIX + key] ?? '[]'); return Array.isArray(v) ? v.length : 0; } catch { return 0; }
  };
  return `${count('workouts')} séances · ${count('programs')} programmes · ${count('nutrition')} jours de nutrition · ${count('checkins')} bilans`;
}

export async function exportBackup(): Promise<string> {
  const backup = await collect();
  const json = JSON.stringify(backup);
  const stamp = backup.exportedAt.slice(0, 10);
  const name = `fitnessapp-sauvegarde-${stamp}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    return describeBackup(backup);
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Enregistrer la sauvegarde', UTI: 'public.json' });
  }
  return describeBackup(backup);
}

/** Ouvre le sélecteur de fichier et renvoie la sauvegarde lue (sans l'appliquer). */
export async function pickBackup(): Promise<BackupFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  let text: string;
  if (Platform.OS === 'web' && asset.file) text = await asset.file.text();
  else text = await new File(asset.uri).text();
  const parsed = JSON.parse(text);
  if (parsed?.format !== FORMAT || typeof parsed.data !== 'object') {
    throw new Error("Ce fichier n'est pas une sauvegarde FitnessApp.");
  }
  return parsed as BackupFile;
}

/** Remplace toutes les données locales par celles de la sauvegarde. */
export async function restoreBackup(b: BackupFile): Promise<void> {
  const existing = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PREFIX));
  const entries = Object.entries(b.data).filter(([k]) => k.startsWith(PREFIX));
  await AsyncStorage.multiRemove(existing);
  await AsyncStorage.multiSet(entries);
}
