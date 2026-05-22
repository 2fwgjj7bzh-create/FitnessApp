import { Meal, NutritionDay } from '../types';

// ─── IDs ──────────────────────────────────────────────────────────────────────

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  if (m > 0) return `${m}min${s > 0 ? String(s).padStart(2, '0') + 's' : ''}`;
  return `${s}s`;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Nutrition calculations ────────────────────────────────────────────────────

export function calcMealNutrition(meal: Meal) {
  return meal.foods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function calcDayNutrition(day: NutritionDay) {
  return day.meals.reduce(
    (acc, meal) => {
      const n = calcMealNutrition(meal);
      return {
        calories: acc.calories + n.calories,
        protein: acc.protein + n.protein,
        carbs: acc.carbs + n.carbs,
        fat: acc.fat + n.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// ─── Feelings / Stars ─────────────────────────────────────────────────────────

export const FEELING_LABELS: Record<number, string> = {
  1: 'Très mauvais',
  2: 'Mauvais',
  3: 'Moyen',
  4: 'Bien',
  5: 'Excellent',
};

export const SLEEP_QUALITY_LABELS: Record<number, string> = {
  1: 'Très mauvais',
  2: 'Mauvais',
  3: 'Correct',
  4: 'Bon',
  5: 'Excellent',
};
