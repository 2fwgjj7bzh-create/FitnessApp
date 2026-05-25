import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getPrograms, getWeeklyTemplate, saveWeeklyTemplate, getWorkouts } from '../storage';
import { WorkoutProgram, WeeklyTemplate, WorkoutStackParamList, Workout } from '../types';

type NavProp = NativeStackNavigationProp<WorkoutStackParamList, 'WeeklySchedule'>;

const DAYS: { key: string; label: string; short: string }[] = [
  { key: '1', label: 'Lundi',    short: 'LUN' },
  { key: '2', label: 'Mardi',    short: 'MAR' },
  { key: '3', label: 'Mercredi', short: 'MER' },
  { key: '4', label: 'Jeudi',    short: 'JEU' },
  { key: '5', label: 'Vendredi', short: 'VEN' },
  { key: '6', label: 'Samedi',   short: 'SAM' },
  { key: '0', label: 'Dimanche', short: 'DIM' },
];

export default function WeeklyScheduleScreen() {
  const navigation = useNavigation<NavProp>();
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [template, setTemplate] = useState<WeeklyTemplate>({});
  const [pickingDay, setPickingDay] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const load = useCallback(async () => {
    const [progs, tmpl, ws] = await Promise.all([getPrograms(), getWeeklyTemplate(), getWorkouts()]);
    setPrograms(progs);
    setTemplate(tmpl);
    setWorkouts(ws);
  }, []);

  // Last workout per programId — fallback when template has 0 exercises
  const lastWorkoutByProgramId = React.useMemo(() => {
    const map: Record<string, Workout> = {};
    workouts.forEach(w => {
      if (w.programId && (!map[w.programId] || new Date(w.date) > new Date(map[w.programId].date))) {
        map[w.programId] = w;
      }
    });
    return map;
  }, [workouts]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const todayKey = String(new Date().getDay());

  const assignProgram = async (dayKey: string, programId: string | null) => {
    const next = { ...template };
    if (programId === null) { delete next[dayKey]; }
    else { next[dayKey] = programId; }
    setTemplate(next);
    await saveWeeklyTemplate(next);
    setPickingDay(null);
  };

  const getProgramName = (id?: string) => {
    if (!id) return null;
    return programs.find(p => p.id === id)?.name ?? null;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Planning de la semaine</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Assigne un programme à chaque jour pour préparer ta semaine.
        </Text>

        {DAYS.map(day => {
          const assignedId = template[day.key];
          const programName = getProgramName(assignedId);
          const isToday = day.key === todayKey;

          return (
            <TouchableOpacity
              key={day.key}
              style={[styles.dayCard, isToday && styles.dayCardToday]}
              onPress={() => setPickingDay(day.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.dayBadge, isToday && styles.dayBadgeToday]}>
                <Text style={[styles.dayShort, isToday && styles.dayShortToday]}>{day.short}</Text>
              </View>

              <View style={styles.dayContent}>
                <Text style={styles.dayLabel}>{day.label}</Text>
                {programName ? (
                  <View style={styles.assignedRow}>
                    <Ionicons name="barbell-outline" size={13} color={colors.primary} />
                    <Text style={styles.programName}>{programName}</Text>
                  </View>
                ) : (
                  <Text style={styles.restLabel}>Repos</Text>
                )}
              </View>

              <View style={styles.dayRight}>
                {isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Aujourd'hui</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Program picker modal */}
      <Modal visible={pickingDay !== null} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>
              {pickingDay ? DAYS.find(d => d.key === pickingDay)?.label : ''}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Repos option */}
              <TouchableOpacity
                style={[modalStyles.option, !template[pickingDay ?? ''] && modalStyles.optionActive]}
                onPress={() => assignProgram(pickingDay!, null)}
              >
                <View style={[modalStyles.optionIcon, { backgroundColor: colors.border + '55' }]}>
                  <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
                </View>
                <Text style={modalStyles.optionName}>Repos</Text>
                {!template[pickingDay ?? ''] && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>

              {programs.length === 0 && (
                <Text style={modalStyles.emptyText}>
                  Aucun programme créé. Crée d'abord un programme dans l'onglet Workout.
                </Text>
              )}

              {programs.map(p => {
                const isSelected = template[pickingDay ?? ''] === p.id;
                const lastW = lastWorkoutByProgramId[p.id];
                const exCount = p.exercises.length > 0 ? p.exercises.length : (lastW?.exercises.length ?? 0);
                const setCount = p.exercises.length > 0
                  ? p.exercises.reduce((a, e) => a + e.sets.length, 0)
                  : (lastW?.exercises.reduce((a, e) => a + e.sets.length, 0) ?? 0);
                const fromLastSession = p.exercises.length === 0 && lastW != null;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[modalStyles.option, isSelected && modalStyles.optionActive]}
                    onPress={() => assignProgram(pickingDay!, p.id)}
                  >
                    <View style={[modalStyles.optionIcon, { backgroundColor: colors.primary + '22' }]}>
                      <Ionicons name="barbell-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={modalStyles.optionTextBlock}>
                      <Text style={modalStyles.optionName}>{p.name}</Text>
                      <Text style={modalStyles.optionSub}>
                        {exCount} exercice{exCount !== 1 ? 's' : ''}
                        {' · '}
                        {setCount} séries
                        {fromLastSession ? ' · dernière séance' : ''}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}

              <View style={{ height: 20 }} />
            </ScrollView>

            <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setPickingDay(null)}>
              <Text style={modalStyles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg, maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '11' },
  optionIcon: { width: 40, height: 40, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  optionTextBlock: { flex: 1 },
  optionName: { ...typography.bodyBold, color: colors.text },
  optionSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  emptyText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  cancelBtn: {
    backgroundColor: colors.card, borderRadius: borderRadius.round,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { ...typography.bodyBold, color: colors.textSecondary },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.h3, color: colors.text },
  content: { padding: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  dayCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
    gap: spacing.md, ...shadows.sm,
  },
  dayCardToday: { borderColor: colors.primary + '80', backgroundColor: colors.primary + '0A' },
  dayBadge: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  dayBadgeToday: { backgroundColor: colors.primary + '22' },
  dayShort: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  dayShortToday: { color: colors.primary },
  dayContent: { flex: 1 },
  dayLabel: { ...typography.bodyBold, color: colors.text },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  programName: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  restLabel: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  todayBadge: {
    backgroundColor: colors.primary, borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  todayBadgeText: { ...typography.tiny, color: '#FFFFFF', fontWeight: '700' },
});
