import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getWorkouts, deleteWorkout, getPrograms, deleteProgram } from '../storage';
import { formatDate } from '../utils/helpers';
import { Workout, WorkoutProgram, WorkoutStackParamList } from '../types';
import { MUSCLE_GROUP_COLORS } from '../data/exerciseDatabase';

type NavProp = NativeStackNavigationProp<WorkoutStackParamList, 'WorkoutList'>;

export default function WorkoutListScreen() {
  const navigation = useNavigation<NavProp>();
  const [tab, setTab] = useState<'sessions' | 'programs'>('sessions');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);

  const load = useCallback(async () => {
    const [ws, ps] = await Promise.all([getWorkouts(), getPrograms()]);
    setWorkouts(ws);
    setPrograms(ps);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDeleteWorkout = (id: string, name: string) => {
    Alert.alert('Supprimer', `Supprimer "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteWorkout(id); load(); } },
    ]);
  };

  const handleDeleteProgram = (id: string, name: string) => {
    Alert.alert('Supprimer', `Supprimer le programme "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteProgram(id); load(); } },
    ]);
  };

  const startFreeSession = useCallback(() => {
    setShowStartModal(false);
    navigation.navigate('WorkoutSession', {});
  }, [navigation]);

  const startProgramSession = useCallback((programId: string) => {
    setShowStartModal(false);
    navigation.navigate('WorkoutSession', { programId });
  }, [navigation]);

  const renderSession = useCallback(({ item: w }: { item: Workout }) => (
    <WorkoutCard
      workout={w}
      onDelete={() => handleDeleteWorkout(w.id, w.name)}
      onViewHistory={name => navigation.navigate('ExerciseHistory', { exerciseName: name })}
    />
  ), [handleDeleteWorkout, navigation]);

  const renderProgram = useCallback(({ item: p }: { item: WorkoutProgram }) => (
    <ProgramCard
      program={p}
      onEdit={() => navigation.navigate('CreateProgram', { programId: p.id })}
      onDelete={() => handleDeleteProgram(p.id, p.name)}
      onStart={() => startProgramSession(p.id)}
    />
  ), [handleDeleteProgram, navigation, startProgramSession]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Entraînements</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={() => navigation.navigate('WeeklySchedule')}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => tab === 'sessions' ? setShowStartModal(true) : navigation.navigate('CreateProgram', {})}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'sessions' && styles.tabBtnActive]}
          onPress={() => setTab('sessions')}
        >
          <Text style={[styles.tabBtnText, tab === 'sessions' && styles.tabBtnTextActive]}>Séances</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'programs' && styles.tabBtnActive]}
          onPress={() => setTab('programs')}
        >
          <Text style={[styles.tabBtnText, tab === 'programs' && styles.tabBtnTextActive]}>Programmes</Text>
        </TouchableOpacity>
      </View>

      {tab === 'sessions' ? (
        <FlatList
          data={workouts}
          renderItem={renderSession}
          keyExtractor={w => w.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Aucune séance</Text>
              <Text style={styles.emptySubtitle}>Lance ta première séance !</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowStartModal(true)}>
                <Text style={styles.emptyBtnText}>Commencer une séance</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      ) : (
        <FlatList
          data={programs}
          renderItem={renderProgram}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Aucun programme</Text>
              <Text style={styles.emptySubtitle}>Crée un programme réutilisable !</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateProgram', {})}>
                <Text style={styles.emptyBtnText}>Créer un programme</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      )}

      {/* Start Session Modal */}
      <Modal visible={showStartModal} animationType="slide" transparent>
        <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={() => setShowStartModal(false)}>
          <View style={modalStyles.sheet} onStartShouldSetResponder={() => true}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Démarrer une séance</Text>

            {/* Free session option */}
            <TouchableOpacity style={modalStyles.option} onPress={startFreeSession}>
              <View style={[modalStyles.optionIcon, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              </View>
              <View style={modalStyles.optionText}>
                <Text style={modalStyles.optionTitle}>Séance libre</Text>
                <Text style={modalStyles.optionSub}>Construis ta séance librement</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {programs.length > 0 && (
              <>
                <Text style={modalStyles.sectionLabel}>Depuis un programme</Text>
                {programs.map(p => (
                  <TouchableOpacity key={p.id} style={modalStyles.option} onPress={() => startProgramSession(p.id)}>
                    <View style={[modalStyles.optionIcon, { backgroundColor: colors.secondary + '22' }]}>
                      <Ionicons name="list" size={22} color={colors.secondary} />
                    </View>
                    <View style={modalStyles.optionText}>
                      <Text style={modalStyles.optionTitle}>{p.name}</Text>
                      <Text style={modalStyles.optionSub}>
                        {p.exercises.length} exercice{p.exercises.length > 1 ? 's' : ''}
                        {' · '}
                        {p.exercises.reduce((a, e) => a + e.sets.length, 0)} séries
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setShowStartModal(false)}>
              <Text style={modalStyles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Workout Card ─────────────────────────────────────────────────────────────

function WorkoutCard({ workout, onDelete, onViewHistory }: {
  workout: Workout;
  onDelete: () => void;
  onViewHistory: (name: string) => void;
}) {
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = workout.exercises.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0);

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.colorBar} />
      <View style={cardStyles.body}>
        <View style={cardStyles.top}>
          <Text style={cardStyles.name}>{workout.name}</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={17} color={colors.error} />
          </TouchableOpacity>
        </View>
        <Text style={cardStyles.date}>{formatDate(workout.date.split('T')[0])}</Text>

        <View style={cardStyles.chips}>
          <Chip icon="fitness-outline" label={`${workout.exercises.length} exo`} />
          <Chip icon="checkmark-circle-outline" label={`${doneSets}/${totalSets} séries`} />
        </View>

        {workout.exercises.length > 0 && (
          <View style={cardStyles.exList}>
            {workout.exercises.slice(0, 4).map(e => (
              <TouchableOpacity key={e.id} style={cardStyles.exRow} onPress={() => onViewHistory(e.name)}>
                <View style={[cardStyles.exDot, { backgroundColor: MUSCLE_GROUP_COLORS[e.muscleGroup ?? ''] ?? colors.primary }]} />
                <Text style={cardStyles.exName} numberOfLines={1}>{e.name}</Text>
                <Text style={cardStyles.exSets}>{e.sets.length} × {e.sets[0]?.reps || '—'}</Text>
                <Ionicons name="stats-chart-outline" size={12} color={colors.primary} />
              </TouchableOpacity>
            ))}
            {workout.exercises.length > 4 && (
              <Text style={cardStyles.exMore}>+{workout.exercises.length - 4} autres exercices</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={cardStyles.chip}>
      <Ionicons name={icon as any} size={12} color={colors.textSecondary} />
      <Text style={cardStyles.chipText}>{label}</Text>
    </View>
  );
}

// ─── Program Card ─────────────────────────────────────────────────────────────

function ProgramCard({ program, onEdit, onDelete, onStart }: {
  program: WorkoutProgram;
  onEdit: () => void;
  onDelete: () => void;
  onStart: () => void;
}) {
  return (
    <View style={progStyles.card}>
      <View style={progStyles.colorBar} />
      <View style={progStyles.body}>
        <View style={progStyles.top}>
          <Text style={progStyles.name}>{program.name}</Text>
          <View style={progStyles.actions}>
            <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil-outline" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={17} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={progStyles.subtitle}>
          {program.exercises.length} exercice{program.exercises.length > 1 ? 's' : ''}
          {' · '}
          {program.exercises.reduce((a, e) => a + e.sets.length, 0)} séries
        </Text>

        <View style={progStyles.exList}>
          {program.exercises.slice(0, 4).map(e => {
            const c = MUSCLE_GROUP_COLORS[e.muscleGroup ?? ''] ?? colors.primary;
            return (
              <View key={e.id} style={progStyles.exRow}>
                <View style={[progStyles.exDot, { backgroundColor: c }]} />
                <Text style={progStyles.exName} numberOfLines={1}>{e.name}</Text>
                <Text style={progStyles.exDetail}>
                  {e.sets.length} série{e.sets.length > 1 ? 's' : ''}
                </Text>
              </View>
            );
          })}
          {program.exercises.length > 4 && (
            <Text style={progStyles.exMore}>+{program.exercises.length - 4} autres</Text>
          )}
        </View>

        <TouchableOpacity style={progStyles.startBtn} onPress={onStart}>
          <Ionicons name="play" size={15} color={colors.text} />
          <Text style={progStyles.startBtnText}>Démarrer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg,
  },
  title: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  sectionLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  optionIcon: { width: 44, height: 44, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  optionText: { flex: 1 },
  optionTitle: { ...typography.bodyBold, color: colors.text },
  optionSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  cancelBtn: {
    backgroundColor: colors.card, borderRadius: borderRadius.round,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { ...typography.bodyBold, color: colors.textSecondary },
});

const progStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    marginBottom: spacing.sm, flexDirection: 'row',
    overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  colorBar: { width: 4, backgroundColor: colors.secondary },
  body: { flex: 1, padding: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyBold, color: colors.text, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.md },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  exList: { marginBottom: spacing.md },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  exDot: { width: 6, height: 6, borderRadius: 3 },
  exName: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  exDetail: { ...typography.caption, color: colors.textMuted },
  exMore: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: borderRadius.round, paddingVertical: spacing.sm,
  },
  startBtnText: { ...typography.bodyBold, color: colors.text },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    marginBottom: spacing.sm, flexDirection: 'row',
    overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  colorBar: { width: 4, backgroundColor: colors.primary },
  body: { flex: 1, padding: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyBold, color: colors.text, flex: 1 },
  date: { ...typography.caption, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.surface, paddingHorizontal: spacing.sm,
    paddingVertical: 3, borderRadius: borderRadius.round,
  },
  chipText: { ...typography.tiny, color: colors.textSecondary },
  exList: {},
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  exDot: { width: 6, height: 6, borderRadius: 3 },
  exName: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  exSets: { ...typography.caption, color: colors.textMuted },
  exMore: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { ...typography.h1, color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  calendarBtn: {
    width: 40, height: 40, borderRadius: borderRadius.round,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    backgroundColor: colors.primary, width: 40, height: 40,
    borderRadius: borderRadius.round, justifyContent: 'center', alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.round, padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.round, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { ...typography.bodyBold, color: colors.textSecondary },
  tabBtnTextActive: { color: colors.text },
  content: { paddingHorizontal: spacing.md },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptySubtitle: { ...typography.body, color: colors.textMuted },
  emptyBtn: {
    marginTop: spacing.sm, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
  },
  emptyBtnText: { ...typography.bodyBold, color: colors.text },
});
