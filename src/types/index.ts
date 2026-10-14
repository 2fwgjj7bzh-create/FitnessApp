// ─── Workout ──────────────────────────────────────────────────────────────────

export interface ExerciseSet {
  id: string;
  reps: number;
  weight: number; // kg
  completed: boolean;
  targetRepsRange?: string;
  rir?: number;               // répétitions en réserve (0 = échec)
  type?: 'normal' | 'warmup'; // échauffement = exclu des records et du pré-remplissage
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
  photoUri?: string;
}

export interface DraftSession {
  workoutName: string;
  exercises: Exercise[];
  notes: string;
  programId?: string;
  savedAt: string;
  startedAt?: string;
}

export interface UserExercise {
  id: string;
  name: string;
  muscleGroup?: string;
  photoUri?: string;
  createdAt: string;
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
  repsRange: string;      // e.g. "8-12" or "12-15"
  targetWeight?: number;  // poids cible pour cette série
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

export type Gender = 'male' | 'female';
export type FitnessGoal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfile {
  firstName: string;
  lastName?: string;
  age?: number;
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  goal?: FitnessGoal;
  activityLevel?: ActivityLevel;
  macroMode?: 'auto' | 'manual';
  isSetupComplete?: boolean;
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
  chest?: number;      // poitrine
  shoulders?: number;  // épaules
  waist?: number;      // tour de taille
  hips?: number;       // hanches
  bicepsL?: number; bicepsR?: number;
  thighL?: number;  thighR?: number;
  calfL?: number;   calfR?: number;
  // Anciens champs (bilans créés avant oct. 2026) — lus pour compatibilité
  leftArm?: number; rightArm?: number; leftThigh?: number; rightThigh?: number;
}

export interface CheckinPhotos {
  front?: string;
  back?: string;
  side?: string;
}

export type QuestionType = 'scale' | 'number' | 'text' | 'yesno';

export interface CheckinQuestion {
  id: string;
  label: string;
  type: QuestionType;
  min?: number;          // échelle : 1
  max?: number;          // échelle : 5
  minLabel?: string;     // libellé du minimum (ex. « très faible »)
  maxLabel?: string;
  unit?: string;         // nombre : unité (h, %, …)
  active: boolean;
  builtin?: boolean;     // question du questionnaire générique
}

export type CheckinAnswer = number | string | boolean;

export interface WeeklyCheckin {
  id: string;
  date: string;
  weight?: number;
  measurements?: Measurements;
  photoUri?: string;            // ancien champ (1 photo)
  photos?: CheckinPhotos;       // face / dos / profil
  feeling: FeelingLevel;
  sleepHours: number;
  sleepQuality: SleepQuality;
  answers?: Record<string, CheckinAnswer>;
  questionsSnapshot?: { id: string; label: string; type: QuestionType; unit?: string }[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type AuthStackParamList = {
  Welcome: undefined;
  ProfileSetup: undefined;
};

export type RootTabParamList = {
  Dashboard:    undefined;
  ProgramsTab:  undefined;
  WorkoutTab:   undefined;
  ProgressTab:  undefined;
  ProfileTab:   undefined;
  // Conservés pour compatibilité avec les refs existantes
  NutritionTab: undefined;
  BodyTab:      undefined;
  StatsTab:     undefined;
};

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutSession: { workoutId?: string; programId?: string };
  CreateProgram: { programId?: string };
  ExerciseHistory: { exerciseName: string };
  WeeklySchedule: undefined;
  ExerciseGuide: { exerciseName?: string } | undefined;
};

export type BodyStackParamList = {
  BodyList: undefined;
  NewCheckin: { checkinId?: string };
  CheckinCompare: { fromId?: string; toId?: string } | undefined;
  CheckinSettings: undefined;
};
