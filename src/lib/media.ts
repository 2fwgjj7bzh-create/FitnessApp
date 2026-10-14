/**
 * Les photos choisies avec l'appareil photo / la galerie arrivent dans un dossier
 * temporaire qu'iOS peut vider : on les copie dans le dossier Documents de l'appli.
 */
import { Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';

export async function persistImage(uri: string, folder = 'checkins'): Promise<string> {
  if (Platform.OS === 'web' || !uri) return uri;
  try {
    const dir = new Directory(Paths.document, folder);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const ext = ((uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase()).slice(0, 4);
    const dest = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`);
    await new File(uri).copy(dest);
    return dest.uri;
  } catch (e) {
    console.warn('[media] copie impossible, on garde l\'URI d\'origine', e);
    return uri;
  }
}
