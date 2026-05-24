import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, NutritionDay, WeeklyCheckin, UserGoals, WorkoutProgram, WeeklyTemplate, UserProfile, DraftSession, UserExercise } from '../types';

const KEYS = {
  WORKOUTS: '@fitness/workouts',
  NUTRITION: '@fitness/nutrition',
  CHECKINS: '@fitness/checkins',
  GOALS: '@fitness/goals',
  PROGRAMS: '@fitness/programs',
  WEEKLY_TEMPLATE: '@fitness/weekly_template',
  PROFILE: '@fitness/profile',
  DRAFT_SESSION: '@fitness/draft_session',
  USER_EXERCISES: '@fitness/user_exercises',
};

async function getList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveList<T>(key: string, list: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.error(`[storage] Failed to save ${key}:`, err);
    throw err;
  }
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export const getWorkouts = (): Promise<Workout[]> => getList<Workout>(KEYS.WORKOUTS);

export async function saveWorkout(workout: Workout): Promise<void> {
  const list = await getWorkouts();
  const idx = list.findIndex(w => w.id === workout.id);
  if (idx >= 0) list[idx] = workout; else list.unshift(workout);
  await saveList(KEYS.WORKOUTS, list);
}

export async function deleteWorkout(id: string): Promise<void> {
  const list = await getWorkouts();
  await saveList(KEYS.WORKOUTS, list.filter(w => w.id !== id));
}

// ─── Programs ─────────────────────────────────────────────────────────────────

export const getPrograms = (): Promise<WorkoutProgram[]> => getList<WorkoutProgram>(KEYS.PROGRAMS);

export async function saveProgram(program: WorkoutProgram): Promise<void> {
  const list = await getPrograms();
  const idx = list.findIndex(p => p.id === program.id);
  if (idx >= 0) list[idx] = program; else list.unshift(program);
  await saveList(KEYS.PROGRAMS, list);
}

export async function deleteProgram(id: string): Promise<void> {
  const list = await getPrograms();
  await saveList(KEYS.PROGRAMS, list.filter(p => p.id !== id));
}

export async function createProgramsFromTemplate(sessions: string[]): Promise<WorkoutProgram[]> {
  const now = new Date().toISOString();
  const existing = await getPrograms();
  const newPrograms: WorkoutProgram[] = sessions.map(name => ({
    id: `prog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    exercises: [],
    createdAt: now,
    updatedAt: now,
  }));
  await saveList(KEYS.PROGRAMS, [...existing, ...newPrograms]);
  return newPrograms;
}

// ─── Weekly Template ──────────────────────────────────────────────────────────

export async function getWeeklyTemplate(): Promise<WeeklyTemplate> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.WEEKLY_TEMPLATE);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function saveWeeklyTemplate(template: WeeklyTemplate): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.WEEKLY_TEMPLATE, JSON.stringify(template));
  } catch (err) {
    console.error('[storage] Failed to save weekly template:', err);
    throw err;
  }
}

// ─── User Profile ─────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = { firstName: '' };

export async function getProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROFILE);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch { return DEFAULT_PROFILE; }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('[storage] Failed to save profile:', err);
    throw err;
  }
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export const getNutritionDays = (): Promise<NutritionDay[]> => getList<NutritionDay>(KEYS.NUTRITION);

export async function getNutritionDay(date: string): Promise<NutritionDay | null> {
  const list = await getNutritionDays();
  return list.find(d => d.date === date) ?? null;
}

export async function saveNutritionDay(day: NutritionDay): Promise<void> {
  const list = await getNutritionDays();
  const idx = list.findIndex(d => d.id === day.id);
  if (idx >= 0) list[idx] = day; else list.unshift(day);
  await saveList(KEYS.NUTRITION, list);
}

// ─── Check-ins ────────────────────────────────────────────────────────────────

export const getCheckins = (): Promise<WeeklyCheckin[]> => getList<WeeklyCheckin>(KEYS.CHECKINS);

export async function saveCheckin(checkin: WeeklyCheckin): Promise<void> {
  const list = await getCheckins();
  const idx = list.findIndex(c => c.id === checkin.id);
  if (idx >= 0) list[idx] = checkin; else list.unshift(checkin);
  await saveList(KEYS.CHECKINS, list);
}

export async function deleteCheckin(id: string): Promise<void> {
  const list = await getCheckins();
  await saveList(KEYS.CHECKINS, list.filter(c => c.id !== id));
}

// ─── Draft Session ────────────────────────────────────────────────────────────

export async function getDraftSession(): Promise<DraftSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.DRAFT_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveDraftSession(draft: DraftSession): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DRAFT_SESSION, JSON.stringify(draft));
  } catch (err) {
    console.error('[storage] Failed to save draft:', err);
  }
}

export async function clearDraftSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.DRAFT_SESSION);
  } catch {}
}

// ─── User Exercises ───────────────────────────────────────────────────────────

export const getUserExercises = (): Promise<UserExercise[]> => getList<UserExercise>(KEYS.USER_EXERCISES);

export async function saveUserExercise(exercise: UserExercise): Promise<void> {
  const list = await getUserExercises();
  const idx = list.findIndex(e => e.id === exercise.id);
  if (idx >= 0) list[idx] = exercise; else list.unshift(exercise);
  await saveList(KEYS.USER_EXERCISES, list);
}

// ─── Goals ────────────────────────────────────────────────────────────────────

const DEFAULT_GOALS: UserGoals = {
  calorieGoal: 2000, proteinGoal: 160, carbsGoal: 200,
  fatGoal: 70, workoutsPerWeek: 4, bodyWeight: 80, proteinMult: 2.2, fatMult: 0.4,
};

export async function getGoals(): Promise<UserGoals> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.GOALS);
    return raw ? { ...DEFAULT_GOALS, ...JSON.parse(raw) } : DEFAULT_GOALS;
  } catch { return DEFAULT_GOALS; }
}

export async function saveGoals(goals: UserGoals): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
  } catch (err) {
    console.error('[storage] Failed to save goals:', err);
    throw err;
  }
}
