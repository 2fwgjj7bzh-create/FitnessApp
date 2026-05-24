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
import { today, formatDate } from '../utils/helpers';
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

  const firstName = profile.firstName;
  const todayLabel = DAY_NAMES[new Date().getDay()];
  const avatarLetter = firstName ? firstName[0].toUpperCase() : '?';

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
          <TouchableOpacity style={styles.headerLeft} onPress={() => { setNameInput(firstName); setShowNameModal(true); }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
            <View>
              <View style={styles.greetingRow}>
                <Text style={styles.greeting}>
                  {firstName ? `Bonjour ${firstName}` : 'Bonjour'}
                </Text>
                <Ionicons name="flash" size={18} color={colors.primary} />
              </View>
              <Text style={styles.date}>{formatDate(today())}</Text>
            </View>
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
            <View style={styles.todayBannerAccent} />
            <View style={styles.todayBannerLeft}>
              <View style={styles.todayBannerIcon}>
                <Ionicons name="barbell" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.todayBannerLabel}>PROGRAMME DU JOUR</Text>
                <Text style={styles.todayBannerTitle}>{todayProgram.name}</Text>
                <Text style={styles.todayBannerSub}>
                  {todayProgram.exercises.length} exercice{todayProgram.exercises.length > 1 ? 's' : ''} · Prêt à démarrer
                </Text>
              </View>
            </View>
            <View style={styles.playBtn}>
              <Ionicons name="play" size={18} color={colors.text} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.todayRestBanner}
            onPress={() => (navigation as any).navigate('WorkoutTab', { screen: 'WeeklySchedule' })}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.todayRestText}>
              {`${todayLabel.charAt(0).toUpperCase()}${todayLabel.slice(1)}`} · Planifier ma semaine
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Progress cards */}
        <Text style={styles.sectionTitle}>Aujourd'hui</Text>
        <View style={styles.progressRow}>
          <ProgressCard
            label="Calories" value={todayCalories} goal={goals.calorieGoal}
            unit="kcal" percent={caloriePercent} color={colors.secondary}
            icon="flame-outline"
          />
          <ProgressCard
            label="Protéines" value={todayProtein} goal={goals.proteinGoal}
            unit="g" percent={proteinPercent} color={colors.success}
            icon="barbell-outline"
          />
        </View>

        {/* Weekly workout */}
        <TouchableOpacity
          style={styles.weekCard}
          onLongPress={() => { setGoalInput(String(goals.workoutsPerWeek)); setShowGoalModal(true); }}
          activeOpacity={0.9}
        >
          <View style={styles.weekCardHeader}>
            <Ionicons name="trophy-outline" size={18} color={colors.primary} />
            <Text style={styles.weekCardTitle}>Séances cette semaine</Text>
            <TouchableOpacity
              style={styles.weekCardBadge}
              onPress={() => { setGoalInput(String(goals.workoutsPerWeek)); setShowGoalModal(true); }}
            >
              <Text style={styles.weekCardCount}>{weekWorkouts}/{goals.workoutsPerWeek}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dotRow}>
            {Array.from({ length: goals.workoutsPerWeek }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < weekWorkouts && styles.dotDone, { flex: 1, marginHorizontal: 2 }]}
              />
            ))}
          </View>
          {weekWorkouts >= goals.workoutsPerWeek && (
            <View style={styles.weekComplete}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.weekCompleteText}>Objectif atteint !</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Latest check-in */}
        {latestCheckin && (
          <>
            <Text style={styles.sectionTitle}>Dernier bilan</Text>
            <TouchableOpacity style={styles.checkinCard} onPress={() => (navigation as any).navigate('BodyTab')}>
              <View style={styles.checkinRow}>
                {latestCheckin.weight && (
                  <View style={styles.checkinStat}>
                    <View style={styles.checkinIconRow}>
                      <Ionicons name="scale-outline" size={14} color={colors.secondary} />
                      <Text style={styles.checkinValue}>{latestCheckin.weight}</Text>
                    </View>
                    <Text style={styles.checkinUnit}>kg</Text>
                    <Text style={styles.checkinLabel}>Poids</Text>
                  </View>
                )}
                <View style={styles.checkinDivider} />
                <View style={styles.checkinStat}>
                  <View style={styles.starsRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < latestCheckin.feeling ? 'star' : 'star-outline'}
                        size={14}
                        color={i < latestCheckin.feeling ? colors.warning : colors.textMuted}
                      />
                    ))}
                  </View>
                  <Text style={styles.checkinLabel}>Forme</Text>
                </View>
                <View style={styles.checkinDivider} />
                <View style={styles.checkinStat}>
                  <View style={styles.checkinIconRow}>
                    <Ionicons name="moon-outline" size={14} color={colors.info} />
                    <Text style={styles.checkinValue}>{latestCheckin.sleepHours}</Text>
                  </View>
                  <Text style={styles.checkinUnit}>heures</Text>
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
          <TouchableOpacity
            style={styles.emptyCard}
            onPress={() => (navigation as any).navigate('WorkoutTab', { screen: 'WorkoutList' })}
          >
            <View style={styles.emptyIconRing}>
              <Ionicons name="barbell-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyText}>Aucune séance enregistrée</Text>
            <Text style={styles.emptySubText}>Lance ta première séance dès maintenant</Text>
            <View style={styles.emptyBtn}>
              <Ionicons name="add" size={14} color={colors.text} />
              <Text style={styles.emptyBtnText}>Commencer</Text>
            </View>
          </TouchableOpacity>
        ) : (
          recentWorkouts.map(w => (
            <View key={w.id} style={styles.workoutCard}>
              <View style={styles.workoutAccent} />
              <View style={styles.workoutCardLeft}>
                <Text style={styles.workoutName}>{w.name}</Text>
                <Text style={styles.workoutMeta}>
                  {formatDate(w.date.split('T')[0])} · {w.exercises.length} exercice{w.exercises.length > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.workoutBadge}>
                <Text style={styles.workoutBadgeText}>
                  {w.exercises.reduce((a, e) => a + e.sets.length, 0)} séries
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
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

function ProgressCard({ label, value, goal, unit, percent, color, icon }: {
  label: string; value: number; goal: number; unit: string; percent: number; color: string; icon: string;
}) {
  return (
    <View style={[progressStyles.card, shadows.sm]}>
      <View style={[progressStyles.topAccent, { backgroundColor: color }]} />
      <View style={progressStyles.labelRow}>
        <Ionicons name={icon as any} size={13} color={color} />
        <Text style={progressStyles.label}>{label}</Text>
      </View>
      <Text style={progressStyles.value}>
        {value}<Text style={progressStyles.unit}> {unit}</Text>
      </Text>
      <View style={progressStyles.barBg}>
        <View style={[progressStyles.barFill, { width: `${Math.min(percent, 100)}%` as any, backgroundColor: color }]} />
      </View>
      <View style={progressStyles.footer}>
        <Text style={progressStyles.goal}>/ {goal}</Text>
        <Text style={[progressStyles.percent, { color }]}>{Math.round(percent)}%</Text>
      </View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs / 2, borderWidth: 1, borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  topAccent: { height: 3, width: '100%' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: spacing.md, paddingBottom: 4 },
  label: { ...typography.label, color: colors.textSecondary },
  value: { ...typography.h2, color: colors.text, paddingHorizontal: spacing.md },
  unit: { ...typography.label, color: colors.textSecondary },
  barBg: { height: 6, backgroundColor: colors.border, marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  goal: { ...typography.caption, color: colors.textMuted },
  percent: { ...typography.caption, fontWeight: '700' as const },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  box: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.lg, width: '82%',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  boxTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    ...typography.h3, color: colors.text, textAlign: 'center',
    marginBottom: spacing.sm,
  },
  boxHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  cancel: {
    flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.round,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { ...typography.bodyBold, color: colors.textSecondary },
  confirm: {
    flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.round,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmText: { ...typography.bodyBold, color: colors.text },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingTop: spacing.lg },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '22',
    borderWidth: 2, borderColor: colors.primary + '55',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { ...typography.h3, color: colors.primary, fontWeight: '700' as const },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greeting: { ...typography.h3, color: colors.text, fontWeight: '700' as const },
  date: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: borderRadius.round, gap: 4,
    minHeight: 44,
  },
  startBtnText: { ...typography.bodyBold, color: colors.text },

  // Today banner
  todayBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg, overflow: 'hidden',
    marginBottom: spacing.md, ...shadows.primary,
  },
  todayBannerAccent: { width: 4, alignSelf: 'stretch', backgroundColor: colors.primary },
  todayBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, padding: spacing.md },
  todayBannerIcon: {
    width: 36, height: 36, borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '22', justifyContent: 'center', alignItems: 'center',
  },
  todayBannerLabel: { ...typography.tiny, color: colors.primary, fontWeight: '700' as const, letterSpacing: 0.5 },
  todayBannerTitle: { ...typography.bodyBold, color: colors.text, marginTop: 2 },
  todayBannerSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  playBtn: {
    width: 44, height: 44, margin: spacing.sm,
    backgroundColor: colors.primary, borderRadius: borderRadius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  todayRestBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    minHeight: 44,
  },
  todayRestText: { ...typography.caption, color: colors.textSecondary, flex: 1 },

  // Section titles
  sectionTitle: { ...typography.label, color: colors.textMuted, fontWeight: '700' as const, letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  seeAll: { ...typography.label, color: colors.primary },

  // Progress row
  progressRow: { flexDirection: 'row', marginHorizontal: -spacing.xs / 2 },

  // Weekly card
  weekCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  weekCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  weekCardTitle: { ...typography.bodyBold, color: colors.text, flex: 1 },
  weekCardBadge: {
    backgroundColor: colors.primary + '22', borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  weekCardCount: { ...typography.label, color: colors.primary, fontWeight: '700' as const },
  dotRow: { flexDirection: 'row', height: 10 },
  dot: { height: 10, backgroundColor: colors.border, borderRadius: 5 },
  dotDone: { backgroundColor: colors.primary },
  weekComplete: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  weekCompleteText: { ...typography.caption, color: colors.success, fontWeight: '600' as const },

  // Check-in card
  checkinCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  checkinRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: spacing.sm },
  checkinStat: { alignItems: 'center', gap: 3 },
  checkinIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkinValue: { ...typography.h3, color: colors.text, fontWeight: '700' as const },
  checkinUnit: { ...typography.tiny, color: colors.textMuted },
  checkinLabel: { ...typography.caption, color: colors.textSecondary },
  checkinDivider: { width: 1, height: 36, backgroundColor: colors.border },
  starsRow: { flexDirection: 'row', gap: 2 },
  checkinDate: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },

  // Workout cards
  workoutCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden',
  },
  workoutAccent: { width: 3, alignSelf: 'stretch', backgroundColor: colors.secondary + '80' },
  workoutCardLeft: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  workoutName: { ...typography.bodyBold, color: colors.text },
  workoutMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  workoutBadge: {
    backgroundColor: colors.surface, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    marginRight: spacing.md,
  },
  workoutBadgeText: { ...typography.tiny, color: colors.textMuted, fontWeight: '600' as const },

  // Empty state
  emptyCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', marginTop: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, gap: 6,
  },
  emptyIconRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primary + '15',
    borderWidth: 2, borderColor: colors.primary + '30',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: { ...typography.bodyBold, color: colors.text },
  emptySubText: { ...typography.caption, color: colors.textMuted },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary, borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md, paddingVertical: 10, marginTop: spacing.sm,
  },
  emptyBtnText: { ...typography.label, color: colors.text, fontWeight: '700' as const },
});
