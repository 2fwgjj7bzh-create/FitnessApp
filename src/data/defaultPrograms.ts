import { WorkoutProgram } from '../types';

const now = new Date().toISOString();

function makeProgram(id: string, name: string): WorkoutProgram {
  return { id, name, exercises: [], createdAt: now, updatedAt: now };
}

// ─── Upper / Lower (2j, 4j ou 6j) ────────────────────────────────────────────
// Utilise les paires dont tu as besoin : A seul = 2j, A+B = 4j, A+B+C = 6j

const upperLower: WorkoutProgram[] = [
  makeProgram('tpl-ul-upper-a', 'Upper/Lower — Upper A'),
  makeProgram('tpl-ul-lower-a', 'Upper/Lower — Lower A'),
  makeProgram('tpl-ul-upper-b', 'Upper/Lower — Upper B'),
  makeProgram('tpl-ul-lower-b', 'Upper/Lower — Lower B'),
  makeProgram('tpl-ul-upper-c', 'Upper/Lower — Upper C'),
  makeProgram('tpl-ul-lower-c', 'Upper/Lower — Lower C'),
];

// ─── Split 5 jours ───────────────────────────────────────────────────────────
// Pectoraux / Dos / Épaules / Jambes / Bras & Abdos

const split5j: WorkoutProgram[] = [
  makeProgram('tpl-s5-pec',    'Split 5j — Pectoraux'),
  makeProgram('tpl-s5-dos',    'Split 5j — Dos'),
  makeProgram('tpl-s5-epaule', 'Split 5j — Épaules'),
  makeProgram('tpl-s5-jambe',  'Split 5j — Jambes'),
  makeProgram('tpl-s5-bras',   'Split 5j — Bras & Abdos'),
];

// ─── Push / Pull / Legs ──────────────────────────────────────────────────────
// 3j (PPL × 1) ou 6j (PPL × 2) : assigne les mêmes séances 2 fois dans le planning

const ppl: WorkoutProgram[] = [
  makeProgram('tpl-ppl-push', 'PPL — Push'),
  makeProgram('tpl-ppl-pull', 'PPL — Pull'),
  makeProgram('tpl-ppl-legs', 'PPL — Legs'),
];

// ─── PPL + Upper / Lower (5j) ────────────────────────────────────────────────
// Lun Push · Mar Pull · Mer Legs · Jeu Upper · Ven Lower

const pplUL: WorkoutProgram[] = [
  makeProgram('tpl-pu-push',  'PPL+UL — Push'),
  makeProgram('tpl-pu-pull',  'PPL+UL — Pull'),
  makeProgram('tpl-pu-legs',  'PPL+UL — Legs'),
  makeProgram('tpl-pu-upper', 'PPL+UL — Upper'),
  makeProgram('tpl-pu-lower', 'PPL+UL — Lower'),
];

export const DEFAULT_PROGRAMS: WorkoutProgram[] = [
  ...upperLower,
  ...split5j,
  ...ppl,
  ...pplUL,
];
