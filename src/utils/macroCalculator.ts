import { Gender, ActivityLevel, FitnessGoal, UserGoals } from '../types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_KCAL_DELTA: Record<FitnessGoal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

export function calcBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function calcGoalsFromProfile(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
}): UserGoals {
  const bmr = calcBMR(params.weightKg, params.heightCm, params.age, params.gender);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[params.activityLevel]);
  const calories = Math.max(1200, tdee + GOAL_KCAL_DELTA[params.goal]);

  const proteinMult = params.goal === 'lose' ? 2.2 : 2.0;
  const protein = Math.round(params.weightKg * proteinMult);
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));

  const weightGoal =
    params.goal === 'lose'
      ? Math.round((params.weightKg - 10) * 10) / 10
      : params.goal === 'gain'
        ? Math.round((params.weightKg + 5) * 10) / 10
        : undefined;

  return {
    calorieGoal: calories,
    proteinGoal: protein,
    carbsGoal: carbs,
    fatGoal: fat,
    workoutsPerWeek: params.goal === 'maintain' ? 3 : 4,
    bodyWeight: params.weightKg,
    weightGoal,
    proteinMult,
    fatMult: 0.4,
  };
}
