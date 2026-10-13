/**
 * Calcul métabolique — moteur unique de l'appli.
 *
 * Les formules du métabolisme de base et le calcul des macros sont EXACTEMENT ceux de
 * l'onglet Nutrition › Métabolisme (déplacés ici pour être partagés, sans modification).
 *
 * Nouveauté : le mode « Mesuré » remplace le multiplicateur d'activité par la dépense
 * réellement enregistrée (NEAT + séances), cf. measuredTDEE().
 */
import { UserGoals } from '../types';

export type Sex = 'male' | 'female';
export type FormulaId = 'mifflin' | 'harris' | 'katch';

export const FORMULAS: { id: FormulaId; name: string; desc: string; requiresBf: boolean }[] = [
  { id: 'mifflin', name: 'Mifflin-St Jeor', desc: 'Recommandée, la plus précise', requiresBf: false },
  { id: 'harris', name: 'Harris-Benedict', desc: 'Formule révisée classique', requiresBf: false },
  { id: 'katch', name: 'Katch-McArdle', desc: 'Utilise le % de masse grasse', requiresBf: true },
];

/** Multiplicateur spécial : « Mesuré » (NEAT réel) au lieu d'un coefficient fixe. */
export const MEASURED_ACTIVITY = -1;

export const ACTIVITY_LEVELS = [
  { label: 'Sédentaire', desc: 'Peu ou pas d\'exercice', mult: 1.2 },
  { label: 'Légèrement actif', desc: '1–3 séances/semaine', mult: 1.375 },
  { label: 'Modérément actif', desc: '3–5 séances/semaine', mult: 1.55 },
  { label: 'Très actif', desc: '6–7 séances/semaine', mult: 1.725 },
  { label: 'Athlète', desc: '2× par jour, sport intense', mult: 1.9 },
];

export function calcBMR(formula: string, weight: number, height: number, age: number, sex: Sex, bf: number): number {
  switch (formula) {
    case 'mifflin':
      return sex === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
    case 'harris':
      return sex === 'male'
        ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
        : 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
    case 'katch': {
      const lbm = weight * (1 - bf / 100);
      return 370 + 21.6 * lbm;
    }
    default: return 0;
  }
}

export const DEFAULT_GOALS: UserGoals = {
  calorieGoal: 2000, proteinGoal: 160, carbsGoal: 200,
  fatGoal: 70, workoutsPerWeek: 4, bodyWeight: 80, proteinMult: 2.2, fatMult: 0.4,
};

/** Protéines et lipides en g/kg, glucides = le reste des calories. */
export function computeGoals(weight: number, kcal: number, pm: number, fm: number, base: UserGoals = DEFAULT_GOALS): UserGoals {
  const protein = Math.round(weight * pm);
  const fat = Math.round(weight * fm);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { ...base, bodyWeight: weight, calorieGoal: kcal, proteinGoal: protein, carbsGoal: carbs, fatGoal: fat, proteinMult: pm, fatMult: fm };
}

// ─── Mode « Mesuré » ──────────────────────────────────────────────────────────

/**
 * Effet thermique des aliments ≈ 10 % de l'apport (8–15 % selon la composition des repas).
 * À l'équilibre, apport ≈ dépense, d'où DET = (MB + NEAT + EAT) / (1 − 0,10).
 */
export const TEF_FRACTION = 0.10;

export interface MeasuredBreakdown {
  bmr: number;
  neat: number;   // moyenne/jour
  eat: number;    // moyenne/jour (séances)
  tef: number;
  tdee: number;
}

export function measuredTDEE(bmr: number, neatAvg: number, eatAvg: number): MeasuredBreakdown {
  const tdee = (bmr + neatAvg + eatAvg) / (1 - TEF_FRACTION);
  return {
    bmr: Math.round(bmr),
    neat: Math.round(neatAvg),
    eat: Math.round(eatAvg),
    tef: Math.round(tdee * TEF_FRACTION),
    tdee: Math.round(tdee),
  };
}
