import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import {
  getWorkouts, getNutritionDay, getCheckins, getGoals, saveGoals,
  getWeeklyTemplate, getPrograms, getProfile, saveProfile,
} from '../storage';
import { calcDayNutrition } from '../utils/helpers';
import { today, formatDate, formatDuration } from '../utils/helpers';
import { Workout, WeeklyCheckin, UserGoals, RootTabParamList, WorkoutStackParamList, WorkoutProgram, UserProfile } from '../types';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<WorkoutStackParamList>
>;

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export default function DashboardScreen() {
  const navigation = useNavigation<NavProp>();
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [latestCheckin, setLatestCheckin] = useState<WeeklyCheckin | null>(null);
  const [goals, setGoals] = useState<UserGoals>({ calorieGoal: 2000, proteinGoal: 150, carbsGoal: 200, fatGoal: 70, workoutsPerWeek: 4, bodyWeight: 80, proteinMult: 2.2, fatMult: 0.4 });
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [todayProgram, setTodayProgram] = useState<WorkoutProgram | null>(null);
  const [profile, setProfile] = useState<UserProfile>({ firstName: '' });

  // Modal states
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const load = useCallback(async () => {
    const [workouts, nutritionDay, checkins, g, template, programs, prof] = await Promise.all([
      getWorkouts(),
      getNutritionDay(today()),
      getCheckins(),
      getGoals(),
      getWeeklyTemplate(),
      getPrograms(),
      getProfile(),
    ]);

    setGoals(g);
    setProfile(prof);
    setRecentWorkouts(workouts.slice(0, 3));

    // Workouts this week (Mon–Sun current week)
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekCount = workouts.filter(w => new Date(w.date) >= startOfWeek).length;
    setWeekWorkouts(weekCount);

    // Today's program from weekly template
    const todayKey = String(now.getDay());
    const programId = template[todayKey];
    const prog = programId ? programs.find(p => p.id === programId) ?? null : null;
    setTodayProgram(prog);

    if (nutritionDay) {
      const { calories, protein } = calcDayNutrition(nutritionDay);
      setTodayCalories(Math.round(calories));
      setTodayProtein(Math.round(protein));
    } else {
      setTodayCalories(0);
      setTodayProtein(0);
    }
    setLatestCheckin(checkins[0] ?? null);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const caloriePercent = Math.min((todayCalories / goals.calorieGoal) * 100, 100);
  const proteinPercent = Math.min((todayProtein / goals.proteinGoal) * 100, 100);
  const workoutPercent = Math.min((weekWorkouts / goals.workoutsPerWeek) * 100, 100);

  const handleSaveGoal = async () => {
    const n = parseInt(goalInput, 10);
    if (isNaN(n) || n < 1 || n > 14) { Alert.alert('Valeur invalide', 'Entre un nombre entre 1 et 14.'); return; }
    const updated = { ...goals, workoutsPerWeek: n };
    setGoals(updated);
    await saveGoals(updated);
    setShowGoalModal(false);
  };

  const handleSaveName = async () => {
    const prof: UserProfile = { firstName: nameInput.trim() };
    setProfile(prof);
    await saveProfile(prof);
    setShowNameModal(false);
  };

  const greeting = profile.firstName ? `Bonjour ${profile.firstName} 💪` : 'Bonjour 💪';
  const todayLabel = DAY_NAMES[new Date().getDay()];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setNameInput(profile.firstName); setShowNameModal(true); }}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.date}>{formatDate(today())}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => (navigation as any).navigate('WorkoutTab', { screen: 'WorkoutList' })}
          >
            <Ionicons name="add" size={20} color={colors.text} />
            <Text style={styles.startBtnText}>Séance</Text>
          </TouchableOpacity>
        </View>

        {/* Today's session banner */}
        {todayProgram ? (
          <TouchableOpacity
            style={styles.todayBanner}
            onPress={() => (navigation as any).navigate('WorkoutTab', {
              screen: 'WorkoutSession', params: { programId: todayProgram.id }
            })}
            activeOpacity={0.85}
          >
            <View style={styles.todayBannerLeft}>
              <Ionicons name="barbell" size={20} color={colors.primary} />
              <View>
                <Text style={styles.todayBannerTitle}>
                  Aujourd'hui · <Text style={{ color: colors.primary }}>{todayProgram.name}</Text> t'attend !
                </Text>
                <Text style={styles.todayBannerSub}>
                  {todayProgram.exercises.length} exercice{todayProgram.exercises.length > 1 ? 's' : ''} planifiés
                </Text>
              </View>
            </View>
            <Ionicons name="play-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.todayRestBanner}
            onPress={() => (navigation as any).navigate('WorkoutTab', { screen: 'WeeklySchedule' })}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.todayRestText}>
              {`${todayLabel.charAt(0).toUpperCase()}${todayLabel.slice(1)}`} · Planifier ma semaine →
            </Text>
          </TouchableOpacity>
        )}

        {/* Progress cards */}
        <Text style={styles.sectionTitle}>Aujourd'hui</Text>
        <View style={styles.progressRow}>
          <ProgressCard
            label="Calories" value={todayCalories} goal={goals.calorieGoal}
            unit="kcal" percent={caloriePercent} color={colors.secondary}
          />
          <ProgressCard
            label="Protéines" value={todayProtein} goal={goals.proteinGoal}
            unit="g" percent={proteinPercent} color={colors.success}
          />
        </View>

        {/* Weekly workout — tap to change goal */}
        <TouchableOpacity
          style={styles.weekCard}
          onLongPress={() => { setGoalInput(String(goals.workoutsPerWeek)); setShowGoalModal(true); }}
          activeOpacity={0.9}
        >
          <View style={styles.weekCardHeader}>
            <Ionicons name="barbell-outline" size={18} color={colors.primary} />
            <Text style={styles.weekCardTitle}>Séances cette semaine</Text>
            <TouchableOpacity onPress={() => { setGoalInput(String(goals.workoutsPerWeek)); setShowGoalModal(true); }}>
              <Text style={styles.weekCardCount}>{weekWorkouts} / {goals.workoutsPerWeek}</Text>
            </TouchableOpacity>
          </View>
          {/* Dot indicators */}
          <View style={styles.dotRow}>
            {Array.from({ length: goals.workoutsPerWeek }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < weekWorkouts && styles.dotDone,
                  { flex: 1, marginHorizontal: 2 },
                ]}
              />
            ))}
          </View>
        </TouchableOpacity>

        {/* Latest check-in */}
        {latestCheckin && (
          <>
            <Text style={styles.sectionTitle}>Dernier bilan</Text>
            <TouchableOpacity style={styles.checkinCard} onPress={() => (navigation as any).navigate('BodyTab')}>
              <View style={styles.checkinRow}>
                {latestCheckin.weight && (
                  <View style={styles.checkinStat}>
                    <Text style={styles.checkinValue}>{latestCheckin.weight} kg</Text>
                    <Text style={styles.checkinLabel}>Poids</Text>
                  </View>
                )}
                <View style={styles.checkinStat}>
                  <Text style={styles.checkinValue}>{'⭐'.repeat(latestCheckin.feeling)}</Text>
                  <Text style={styles.checkinLabel}>Forme</Text>
                </View>
                <View style={styles.checkinStat}>
                  <Text style={styles.checkinValue}>{latestCheckin.sleepHours}h</Text>
                  <Text style={styles.checkinLabel}>Sommeil</Text>
                </View>
              </View>
              <Text style={styles.checkinDate}>{formatDate(latestCheckin.date)}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Recent workouts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dernières séances</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('WorkoutTab')}>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {recentWorkouts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>Aucune séance enregistrée</Text>
            <Text style={styles.emptySubText}>Lance ta première séance !</Text>
          </View>
        ) : (
          recentWorkouts.map(w => (
            <View key={w.id} style={styles.workoutCard}>
              <View style={styles.workoutCardLeft}>
                <Text style={styles.workoutName}>{w.name}</Text>
                <Text style={styles.workoutMeta}>
                  {formatDate(w.date.split('T')[0])}  ·  {w.exercises.length} exo
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Goal modal */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.boxTitle}>Objectif séances / semaine</Text>
            <TextInput
              style={modalStyles.input}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="number-pad"
              placeholder="Ex: 5"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <Text style={modalStyles.boxHint}>Entre 1 et 14 séances par semaine</Text>
            <View style={modalStyles.btnRow}>
              <TouchableOpacity style={modalStyles.cancel} onPress={() => setShowGoalModal(false)}>
                <Text style={modalStyles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.confirm} onPress={handleSaveGoal}>
                <Text style={modalStyles.confirmText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Name modal */}
      <Modal visible={showNameModal} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.boxTitle}>Ton prénom</Text>
            <TextInput
              style={modalStyles.input}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Ex: Alex"
              placeholderTextColor={colors.textMuted}
              autoFocus
              autoCapitalize="words"
            />
            <View style={modalStyles.btnRow}>
              <TouchableOpacity style={modalStyles.cancel} onPress={() => setShowNameModal(false)}>
                <Text style={modalStyles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.confirm} onPress={handleSaveName}>
                <Text style={modalStyles.confirmText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Progress Card ────────────────────────────────────────────────────────────

function ProgressCard({ label, value, goal, unit, percent, color }: {
  label: string; value: number; goal: number; unit: string; percent: number; color: string;
}) {
  return (
    <View style={[progressStyles.card, shadows.sm]}>
      <Text style={progressStyles.label}>{label}</Text>
      <Text style={progressStyles.value}>{value}<Text style={progressStyles.unit}> {unit}</Text></Text>
      <Text style={progressStyles.goal}>/ {goal} {unit}</Text>
      <View style={progressStyles.barBg}>
        <View style={[progressStyles.barFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      <Text style={[progressStyles.percent, { color }]}>{Math.round(percent)}%</Text>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, marginHorizontal: spacing.xs / 2,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: 4 },
  value: { ...typography.h2, color: colors.text },
  unit: { ...typography.label, color: colors.textSecondary },
  goal: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  barBg: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  percent: { ...typography.caption, marginTop: 4, fontWeight: '600' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  box: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.lg, width: '80%',
  },
  boxTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    ...typography.h3, color: colors.text, textAlign: 'center',
    marginBottom: spacing.sm,
  },
  boxHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  cancel: {
    flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.round,
    padding: spacing.md, alignItems: 'center',
  },
  cancelText: { ...typography.bodyBold, color: colors.textSecondary },
  confirm: {
    flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.round,
    padding: spacing.md, alignItems: 'center',
  },
  confirmText: { ...typography.bodyBold, color: colors.text },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  greeting: { ...typography.h1, color: colors.text },
  date: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: borderRadius.round, gap: 4,
  },
  startBtnText: { ...typography.bodyBold, color: colors.text },
  // Today banner
  todayBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary + '18',
    borderWidth: 1, borderColor: colors.primary + '55',
    borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.md, gap: spacing.md,
    ...shadows.sm,
  },
  todayBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  todayBannerTitle: { ...typography.bodyBold, color: colors.text },
  todayBannerSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  todayRestBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  todayRestText: { ...typography.caption, color: colors.textSecondary },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  seeAll: { ...typography.label, color: colors.primary },
  progressRow: { flexDirection: 'row', marginHorizontal: -spacing.xs / 2 },
  weekCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  weekCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  weekCardTitle: { ...typography.bodyBold, color: colors.text, flex: 1 },
  weekCardCount: { ...typography.bodyBold, color: colors.primary },
  dotRow: { flexDirection: 'row', height: 8 },
  dot: { height: 8, backgroundColor: colors.border, borderRadius: 4 },
  dotDone: { backgroundColor: colors.primary },
  checkinCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  checkinRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.sm },
  checkinStat: { alignItems: 'center' },
  checkinValue: { ...typography.h3, color: colors.text },
  checkinLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  checkinDate: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  workoutCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  workoutCardLeft: { flex: 1 },
  workoutName: { ...typography.bodyBold, color: colors.text },
  workoutMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  emptyCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', marginTop: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder,
  },
  emptyText: { ...typography.bodyBold, color: colors.textSecondary, marginTop: spacing.sm },
  emptySubText: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
