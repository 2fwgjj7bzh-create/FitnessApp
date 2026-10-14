/**
 * Zones du mannequin → muscles → exercices de la base (data/exerciseDatabase.ts).
 * Chaque muscle filtre les exercices par groupe musculaire et/ou mots-clés du nom.
 */
import { EXERCISE_DATABASE, ExerciseTemplate } from './exerciseDatabase';

export type ZoneId =
  | 'pecs' | 'delts_front' | 'biceps' | 'forearms' | 'abs' | 'obliques' | 'quads' | 'adductors' | 'tibialis'
  | 'traps' | 'delts_rear' | 'lats' | 'triceps' | 'lowerback' | 'glutes' | 'hamstrings' | 'calves';

export interface MuscleDef {
  name: string;
  info: string;
  match: (e: ExerciseTemplate) => boolean;
}

export interface ZoneDef {
  id: ZoneId;
  label: string;
  view: 'front' | 'back';
  muscles: MuscleDef[];
}

const has = (e: ExerciseTemplate, ...words: string[]) => words.some(w => e.name.toLowerCase().includes(w.toLowerCase()));
const grp = (e: ExerciseTemplate, ...groups: string[]) => groups.includes(e.muscleGroup);

export const ZONES: ZoneDef[] = [
  // ─── Face ────────────────────────────────────────────────────────────────
  {
    id: 'pecs', label: 'Pectoraux', view: 'front', muscles: [
      { name: 'Grand pectoral — haut (chef claviculaire)', info: 'Développés et écartés inclinés (~30°).', match: e => grp(e, 'Pectoraux') && has(e, 'incliné', 'poulie basse') },
      { name: 'Grand pectoral — milieu et bas', info: 'Développés à plat et déclinés, écartés, dips, pompes.', match: e => grp(e, 'Pectoraux') && !has(e, 'incliné', 'poulie basse') },
    ],
  },
  {
    id: 'delts_front', label: 'Épaules', view: 'front', muscles: [
      { name: 'Deltoïde antérieur', info: 'Développés au-dessus de la tête, élévations frontales.', match: e => grp(e, 'Épaules') && has(e, 'développé', 'frontale', 'arnold', 'push-up') },
      { name: 'Deltoïde moyen (latéral)', info: 'Élévations latérales, tirage menton.', match: e => grp(e, 'Épaules') && has(e, 'latérale', 'tirage menton', 'lu raises') },
    ],
  },
  {
    id: 'biceps', label: 'Biceps', view: 'front', muscles: [
      { name: 'Biceps brachial', info: 'Curls supination, curl incliné, chin-ups.', match: e => grp(e, 'Biceps') && !has(e, 'marteau', 'reverse', 'zottman') },
      { name: 'Brachial', info: 'Curls prise neutre ou pronation, curl pupitre.', match: e => grp(e, 'Biceps') && has(e, 'marteau', 'reverse', 'zottman', 'pupitre') },
    ],
  },
  {
    id: 'forearms', label: 'Avant-bras', view: 'front', muscles: [
      { name: 'Brachio-radial et fléchisseurs', info: 'Curls marteau / pronation, portés lourds.', match: e => has(e, 'marteau', 'reverse curl', 'zottman', 'farmer') },
    ],
  },
  {
    id: 'abs', label: 'Abdominaux', view: 'front', muscles: [
      { name: 'Grand droit', info: 'Crunchs, relevés de jambes, enroulements.', match: e => grp(e, 'Abdominaux') && has(e, 'crunch', 'relevé', 'toes', 'v-up', 'dragon', 'ab wheel') && !has(e, 'bicycle') },
      { name: 'Transverse / gainage', info: 'Planches, dead bug, hollow, anti-extension.', match: e => grp(e, 'Abdominaux') && has(e, 'planche', 'dead bug', 'hollow', 'l-sit', 'ab wheel', 'mountain') },
    ],
  },
  {
    id: 'obliques', label: 'Obliques', view: 'front', muscles: [
      { name: 'Obliques', info: 'Rotations, anti-rotation, planche latérale.', match: e => grp(e, 'Abdominaux') && has(e, 'russian', 'bicycle', 'latérale', 'pallof', 'landmine') },
    ],
  },
  {
    id: 'quads', label: 'Quadriceps', view: 'front', muscles: [
      { name: 'Vastes (latéral, médial, intermédiaire)', info: 'Squats, presse, hack squat, fentes.', match: e => grp(e, 'Quadriceps') && !has(e, 'extension quadriceps', 'sissy') },
      { name: 'Droit fémoral', info: 'Seul chef bi-articulaire : extension de jambes, sissy squat. Peu sollicité par le squat.', match: e => grp(e, 'Quadriceps') && has(e, 'extension quadriceps', 'sissy') },
    ],
  },
  {
    id: 'adductors', label: 'Adducteurs', view: 'front', muscles: [
      { name: 'Adducteurs', info: 'Adduction machine / poulie, squats et fentes larges.', match: e => grp(e, 'Adducteurs') },
    ],
  },
  {
    id: 'tibialis', label: 'Tibial antérieur', view: 'front', muscles: [
      { name: 'Tibial antérieur', info: 'Relevés de pointes de pieds.', match: e => has(e, 'tibialis') },
    ],
  },
  // ─── Dos ─────────────────────────────────────────────────────────────────
  {
    id: 'traps', label: 'Trapèzes', view: 'back', muscles: [
      { name: 'Trapèze supérieur', info: 'Shrugs, tirage menton.', match: e => has(e, 'shrugs', 'tirage menton') },
      { name: 'Trapèze moyen et inférieur', info: 'Rowings coudes ouverts, face pull, oiseau.', match: e => has(e, 'face pull', 'oiseau', 'rowing câble prise large', 'rear delt') },
    ],
  },
  {
    id: 'delts_rear', label: 'Deltoïdes postérieurs', view: 'back', muscles: [
      { name: 'Deltoïde postérieur', info: 'Oiseau, face pull, rear delt machine.', match: e => has(e, 'oiseau', 'face pull', 'rear delt') },
    ],
  },
  {
    id: 'lats', label: 'Dorsaux', view: 'back', muscles: [
      { name: 'Grand dorsal', info: 'Tractions, tirages verticaux, pull-over.', match: e => grp(e, 'Dos') && has(e, 'traction', 'tirage poulie', 'pull-over', 'chin') || has(e, 'pull-over') },
      { name: 'Rhomboïdes et milieu du dos', info: 'Rowings (barre, haltère, câble, machine).', match: e => grp(e, 'Dos') && has(e, 'rowing', 'inverted') },
    ],
  },
  {
    id: 'triceps', label: 'Triceps', view: 'back', muscles: [
      { name: 'Long chef', info: 'Extensions bras au-dessus de la tête (le plus efficace pour lui).', match: e => grp(e, 'Triceps') && has(e, 'nuque', 'overhead', 'skull') },
      { name: 'Chefs latéral et médial', info: 'Pushdowns, dips, développé prise serrée, kickback.', match: e => grp(e, 'Triceps') && !has(e, 'nuque', 'overhead') },
    ],
  },
  {
    id: 'lowerback', label: 'Lombaires', view: 'back', muscles: [
      { name: 'Érecteurs du rachis', info: 'Soulevés de terre, good morning, hyperextensions.', match: e => has(e, 'soulevé de terre', 'good morning', 'hyperextension') },
    ],
  },
  {
    id: 'glutes', label: 'Fessiers', view: 'back', muscles: [
      { name: 'Grand fessier', info: 'Hip thrust, ponts, squats profonds, fentes.', match: e => grp(e, 'Fessiers') && !has(e, 'abduction', 'clamshell', 'fire hydrant') },
      { name: 'Moyen fessier', info: 'Abductions, clamshell, marche latérale élastique.', match: e => grp(e, 'Abducteurs') || has(e, 'abduction', 'clamshell', 'fire hydrant', 'monster walk') },
    ],
  },
  {
    id: 'hamstrings', label: 'Ischio-jambiers', view: 'back', muscles: [
      { name: 'Ischio-jambiers', info: 'Leg curls (assis de préférence), RDL, Nordic curl.', match: e => grp(e, 'Ischio-jambiers') },
    ],
  },
  {
    id: 'calves', label: 'Mollets', view: 'back', muscles: [
      { name: 'Gastrocnémiens', info: 'Mollets genoux tendus (debout, presse).', match: e => grp(e, 'Mollets') && !has(e, 'assis', 'tibialis') },
      { name: 'Soléaire', info: 'Mollets genoux fléchis (assis).', match: e => grp(e, 'Mollets') && has(e, 'assis') },
    ],
  },
];

export function exercisesFor(m: MuscleDef): ExerciseTemplate[] {
  const seen = new Set<string>();
  return EXERCISE_DATABASE.filter(e => {
    if (seen.has(e.name) || !m.match(e)) return false;
    seen.add(e.name); return true;
  });
}
