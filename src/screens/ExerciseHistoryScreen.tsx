import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getWorkouts } from '../storage';
import { formatDate } from '../utils/helpers';
import { Workout, WorkoutStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<WorkoutStackParamList, 'ExerciseHistory'>;
type RoutePropType = RouteProp<WorkoutStackParamList, 'ExerciseHistory'>;

const SCREEN_W = Dimensions.get('window').width;

interface WeekData {
  label: string;
  maxWeight: number;
  totalVolume: number;
  sessions: SessionEntry[];
}

interface SessionEntry {
  date: string;
  sets: { weight: number; reps: number; completed: boolean }[];
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(
    ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function weekLabel(key: string): string {
  const [year, w] = key.split('-W');
  return `S${w}`;
}

export default function ExerciseHistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { exerciseName } = route.params;

  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'weight' | 'volume'>('weight');

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    const workouts: Workout[] = await getWorkouts();
    const byWeek: Record<string, { sessions: SessionEntry[]; maxWeight: number; totalVolume: number }> = {};

    for (const workout of workouts) {
      const ex = workout.exercises.find(
        e => e.name.toLowerCase() === exerciseName.toLowerCase()
      );
      if (!ex) continue;

      const key = isoWeekKey(workout.date);
      if (!byWeek[key]) byWeek[key] = { sessions: [], maxWeight: 0, totalVolume: 0 };

      const entry: SessionEntry = {
        date: workout.date,
        sets: ex.sets.map(s => ({ weight: s.weight, reps: s.reps, completed: s.completed })),
      };

      byWeek[key].sessions.push(entry);

      for (const s of ex.sets) {
        if (s.weight > byWeek[key].maxWeight) byWeek[key].maxWeight = s.weight;
        byWeek[key].totalVolume += s.weight * s.reps;
      }
    }

    const sorted = Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, data]) => ({
        label: weekLabel(key),
        ...data,
      }));

    setWeeks(sorted);
    setLoading(false);
  }

  const chartData = weeks.map(w => (tab === 'weight' ? w.maxWeight : w.totalVolume));
  const chartLabels = weeks.map(w => w.label);
  const hasData = weeks.length >= 2;

  const allSessions = weeks
    .flatMap(w => w.sessions)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
        ) : weeks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={52} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucun historique</Text>
            <Text style={styles.emptySubtitle}>Réalise des séances avec cet exercice pour voir ta progression.</Text>
          </View>
        ) : (
          <>
            {/* Stats summary */}
            <View style={styles.statsRow}>
              <StatCard
                label="Meilleur poids"
                value={`${Math.max(...weeks.map(w => w.maxWeight))} kg`}
                icon="trophy-outline"
                color={colors.warning}
              />
              <StatCard
                label="Séances"
                value={String(allSessions.length)}
                icon="barbell-outline"
                color={colors.primary}
              />
              <StatCard
                label="Semaines"
                value={String(weeks.length)}
                icon="calendar-outline"
                color={colors.success}
              />
            </View>

            {/* Tab selector */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'weight' && styles.tabBtnActive]}
                onPress={() => setTab('weight')}
              >
                <Text style={[styles.tabBtnText, tab === 'weight' && styles.tabBtnTextActive]}>
                  Poids max (kg)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'volume' && styles.tabBtnActive]}
                onPress={() => setTab('volume')}
              >
                <Text style={[styles.tabBtnText, tab === 'volume' && styles.tabBtnTextActive]}>
                  Volume (kg×reps)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chart */}
            {hasData ? (
              <View style={styles.chartCard}>
                <LineChart
                  data={{
                    labels: chartLabels,
                    datasets: [{ data: chartData.length > 0 ? chartData : [0] }],
                  }}
                  width={SCREEN_W - spacing.md * 2 - spacing.md * 2}
                  height={200}
                  chartConfig={{
                    backgroundColor: colors.card,
                    backgroundGradientFrom: colors.card,
                    backgroundGradientTo: colors.card,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(124, 111, 247, ${opacity})`,
                    labelColor: () => colors.textSecondary,
                    propsForDots: { r: '5', strokeWidth: '2', stroke: colors.primary },
                    propsForBackgroundLines: { stroke: colors.border },
                  }}
                  bezier
                  style={{ borderRadius: borderRadius.md }}
                  withInnerLines
                  withOuterLines={false}
                />
              </View>
            ) : (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>
                  Au moins 2 semaines nécessaires pour afficher le graphique
                </Text>
              </View>
            )}

            {/* History list */}
            <Text style={styles.sectionTitle}>Historique des séances</Text>
            {allSessions.map((session, idx) => (
              <SessionCard key={idx} session={session} />
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function SessionCard({ session }: { session: SessionEntry }) {
  const maxWeight = Math.max(...session.sets.map(s => s.weight), 0);
  const totalVol = session.sets.reduce((acc, s) => acc + s.weight * s.reps, 0);
  const completedCount = session.sets.filter(s => s.completed).length;

  return (
    <View style={sessionStyles.card}>
      <View style={sessionStyles.top}>
        <Text style={sessionStyles.date}>{formatDate(session.date.split('T')[0])}</Text>
        <Text style={sessionStyles.completed}>{completedCount}/{session.sets.length} séries</Text>
      </View>
      <View style={sessionStyles.setsRow}>
        {session.sets.map((s, i) => (
          <View key={i} style={[sessionStyles.setBadge, s.completed && sessionStyles.setBadgeDone]}>
            <Text style={sessionStyles.setBadgeText}>{s.weight}kg × {s.reps}</Text>
          </View>
        ))}
      </View>
      <View style={sessionStyles.footer}>
        <Text style={sessionStyles.footerText}>Max {maxWeight} kg</Text>
        <Text style={sessionStyles.footerText}>Volume {totalVol.toFixed(0)} kg</Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  value: { ...typography.h3, color: colors.text },
  label: { ...typography.tiny, color: colors.textSecondary, textAlign: 'center' },
});

const sessionStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  date: { ...typography.bodyBold, color: colors.text },
  completed: { ...typography.caption, color: colors.textSecondary },
  setsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  setBadge: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setBadgeDone: { borderColor: colors.success, backgroundColor: `${colors.success}22` },
  setBadgeText: { ...typography.caption, color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: { ...typography.caption, color: colors.textMuted },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h3, color: colors.text, flex: 1, textAlign: 'center' },
  content: { padding: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    padding: 4,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  tabBtnTextActive: { color: colors.text },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  chartPlaceholder: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chartPlaceholderText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
