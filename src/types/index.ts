// ─── Workout ──────────────────────────────────────────────────────────────────

export interface ExerciseSet {
  id: string;
  reps: number;
  weight: number; // kg
  completed: boolean;
  targetRepsRange?: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
  sets: ExerciseSet[];
  targetRepsRange?: string;
  restSeconds?: number;
  videoUrl?: string;
  notes?: string;
}

export interface Workout {
  id: string;
  name: string;
  date: string; // ISO date string
  duration: number; // seconds
  exercises: Exercise[];
  notes?: string;
  programId?: string;
}

// ─── Workout Programs (templates) ─────────────────────────────────────────────

export interface ProgramSet {
  id: string;
  repsRange: string; // e.g. "8-12" or "12-15" — per individual set
}

export interface ProgramExercise {
  id: string;
  name: string;
  muscleGroup?: string;
  sets: ProgramSet[];        // one entry per set, each with its own rep target
  targetWeight?: number;
  restSeconds?: number;
  videoUrl?: string;
  notes?: string;
}

export interface WorkoutProgram {
  id: string;
  name: string;
  exercises: ProgramExercise[];
  createdAt: string;
  updatedAt: string;
}

// ─── Weekly Schedule ──────────────────────────────────────────────────────────

// Keys: '0'=Dimanche '1'=Lundi … '6'=Samedi (JS getDay())
export type WeeklyTemplate = Partial<Record<string, string>>; // dayIndex → programId

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  firstName: string;
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;  // g
  carbs: number;    // g
  fat: number;      // g
  qty: number;
  cat?: string;
}

export type MealType = 'Petit-déjeuner' | 'Déjeuner' | 'Dîner' | 'Collation';

export interface Meal {
  id: string;
  type: MealType;
  foods: Food[];
  time: string;
}

export interface NutritionDay {
  id: string;
  date: string; // YYYY-MM-DD
  meals: Meal[];
  waterMl: number;
}

// ─── Body Stats / Bilan ───────────────────────────────────────────────────────

export type FeelingLevel = 1 | 2 | 3 | 4 | 5;
export type SleepQuality = 1 | 2 | 3 | 4 | 5;

export interface Measurements {
  chest?: number;
  waist?: number;
  hips?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
}

export interface WeeklyCheckin {
  id: string;
  date: string;
  weight?: number;
  measurements?: Measurements;
  photoUri?: string;
  feeling: FeelingLevel;
  sleepHours: number;
  sleepQuality: SleepQuality;
  notes?: string;
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export interface UserGoals {
  weightGoal?: number;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  workoutsPerWeek: number;
  bodyWeight: number;
  proteinMult: number;
  fatMult: number;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootTabParamList = {
  Dashboard: undefined;
  WorkoutTab: undefined;
  NutritionTab: undefined;
  BodyTab: undefined;
  StatsTab: undefined;
};

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutSession: { workoutId?: string; programId?: string };
  CreateProgram: { programId?: string };
  ExerciseHistory: { exerciseName: string };
  WeeklySchedule: undefined;
};

export type BodyStackParamList = {
  BodyList: undefined;
  NewCheckin: { checkinId?: string };
};
