import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getWorkouts, getCheckins, getNutritionDays } from '../storage';
import { calcDayNutrition, formatDate } from '../utils/helpers';
import { Workout, WeeklyCheckin, NutritionDay } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - spacing.md * 2 - 2;

const chartConfig = {
  backgroundColor: colors.card,
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(124, 111, 247, ${opacity})`,
  labelColor: () => colors.textSecondary,
  style: { borderRadius: borderRadius.lg },
  propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
  propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '4' },
};

type Period = '1M' | '3M' | '6M' | 'Tout';

function cutoffDate(p: Period): Date {
  const d = new Date();
  if (p === '1M') d.setMonth(d.getMonth() - 1);
  else if (p === '3M') d.setMonth(d.getMonth() - 3);
  else if (p === '6M') d.setMonth(d.getMonth() - 6);
  else d.setFullYear(2000);
  return d;
}

export default function StatsScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([]);
  const [nutritionDays, setNutritionDays] = useState<NutritionDay[]>([]);
  const [period, setPeriod] = useState<Period>('3M');

  const load = useCallback(async () => {
    const [w, c, n] = await Promise.all([getWorkouts(), getCheckins(), getNutritionDays()]);
    setWorkouts(w);
    setCheckins(c);
    setNutritionDays(n);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cutoff = useMemo(() => cutoffDate(period), [period]);

  const weightData = useMemo(() =>
    checkins.filter(c => new Date(c.date) >= cutoff && c.weight).slice(0, 10).reverse(),
    [checkins, cutoff]
  );

  const filteredWorkouts = useMemo(() =>
    workouts.filter(w => new Date(w.date) >= cutoff),
    [workouts, cutoff]
  );

  const { weekLabels, weekValues } = useMemo(() => {
    const weekMap: Record<string, number> = {};
    filteredWorkouts.forEach(w => {
      const d = new Date(w.date);
      const week = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`;
      weekMap[week] = (weekMap[week] || 0) + 1;
    });
    const labels = Object.keys(weekMap).slice(-8);
    return { weekLabels: labels, weekValues: labels.map(k => weekMap[k]) };
  }, [filteredWorkouts]);

  const filteredNutrition = useMemo(() =>
    nutritionDays.filter(d => new Date(d.date) >= cutoff).slice(0, 14).reverse(),
    [nutritionDays, cutoff]
  );

  const calData = useMemo(() =>
    filteredNutrition.map(d => Math.round(calcDayNutrition(d).calories)),
    [filteredNutrition]
  );

  const totalWorkouts = filteredWorkouts.length;

  const totalDuration = useMemo(() =>
    filteredWorkouts.reduce((acc, w) => acc + w.duration, 0),
    [filteredWorkouts]
  );

  const avgCalories = useMemo(() =>
    calData.length > 0 ? Math.round(calData.reduce((a, b) => a + b, 0) / calData.length) : 0,
    [calData]
  );

  const weightDiff = useMemo(() => {
    const latestWeight = checkins.find(c => c.weight)?.weight;
    const earliestWeight = [...checkins].reverse().find(c => c.weight && new Date(c.date) >= cutoff)?.weight;
    return latestWeight && earliestWeight ? (latestWeight - earliestWeight).toFixed(1) : null;
  }, [checkins, cutoff]);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Statistiques</Text>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period selector */}
        <View style={styles.periodRow}>
          {(['1M', '3M', '6M', 'Tout'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary KPIs */}
        <View style={styles.kpiRow}>
          <KpiCard label="Séances" value={String(totalWorkouts)} icon="barbell-outline" color={colors.primary} />
          <KpiCard
            label="Volume total"
            value={totalDuration >= 3600
              ? `${Math.floor(totalDuration / 3600)}h${String(Math.floor((totalDuration % 3600) / 60)).padStart(2, '0')}`
              : `${Math.floor(totalDuration / 60)}min`}
            icon="time-outline"
            color={colors.success}
          />
          <KpiCard
            label="Poids"
            value={weightDiff ? `${parseFloat(weightDiff) > 0 ? '+' : ''}${weightDiff}kg` : '—'}
            icon="scale-outline"
            color={weightDiff ? (parseFloat(weightDiff) <= 0 ? colors.success : colors.secondary) : colors.textMuted}
          />
          <KpiCard label="Moy. cal." value={avgCalories > 0 ? `${avgCalories}` : '—'} icon="flame-outline" color={colors.warning} />
        </View>

        {/* Weight chart */}
        {weightData.length >= 2 ? (
          <ChartCard title="Évolution du poids (kg)" icon="scale-outline">
            <LineChart
              data={{
                labels: weightData.map(c => formatDate(c.date).split(' ')[1] ?? ''),
                datasets: [{ data: weightData.map(c => c.weight!) }],
              }}
              width={CHART_W}
              height={180}
              chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(78, 205, 196, ${o})` }}
              bezier
              style={chartStyles.chart}
              withInnerLines
              withOuterLines={false}
              formatYLabel={v => `${parseFloat(v).toFixed(1)}`}
            />
          </ChartCard>
        ) : (
          <EmptyChart title="Évolution du poids" message="Ajoute au moins 2 bilans avec ton poids" icon="scale-outline" />
        )}

        {/* Workout frequency chart */}
        {weekValues.length >= 2 ? (
          <ChartCard title="Séances par semaine" icon="barbell-outline">
            <BarChart
              data={{
                labels: weekLabels.map((_, i) => `S${i + 1}`),
                datasets: [{ data: weekValues }],
              }}
              width={CHART_W}
              height={160}
              chartConfig={chartConfig}
              style={chartStyles.chart}
              withInnerLines={false}
              showValuesOnTopOfBars
              yAxisLabel=""
              yAxisSuffix=""
            />
          </ChartCard>
        ) : (
          <EmptyChart title="Séances par semaine" message="Enregistre des séances pour voir ta fréquence" icon="barbell-outline" />
        )}

        {/* Calorie chart */}
        {calData.length >= 2 ? (
          <ChartCard title="Calories journalières (kcal)" icon="flame-outline">
            <LineChart
              data={{
                labels: filteredNutrition.map(d => formatDate(d.date).split(' ')[1] ?? ''),
                datasets: [{ data: calData }],
              }}
              width={CHART_W}
              height={180}
              chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(255, 107, 107, ${o})` }}
              bezier
              style={chartStyles.chart}
              withInnerLines
              withOuterLines={false}
              formatYLabel={v => `${Math.round(parseFloat(v))}`}
            />
          </ChartCard>
        ) : (
          <EmptyChart title="Calories journalières" message="Log ta nutrition pour voir les graphiques" icon="flame-outline" />
        )}

        {/* Personal records */}
        <PersonalRecords workouts={workouts} />

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Personal Records ─────────────────────────────────────────────────────────

function PersonalRecords({ workouts }: { workouts: Workout[] }) {
  const prs: Record<string, { weight: number; date: string }> = {};

  workouts.forEach(w => {
    w.exercises.forEach(e => {
      e.sets.forEach(s => {
        if (s.weight > 0) {
          if (!prs[e.name] || s.weight > prs[e.name].weight) {
            prs[e.name] = { weight: s.weight, date: w.date };
          }
        }
      });
    });
  });

  const entries = Object.entries(prs).sort((a, b) => b[1].weight - a[1].weight).slice(0, 8);

  if (entries.length === 0) return null;

  return (
    <View style={prStyles.container}>
      <View style={prStyles.header}>
        <Ionicons name="trophy-outline" size={18} color={colors.warning} />
        <Text style={prStyles.title}>Records personnels</Text>
      </View>
      {entries.map(([name, { weight, date }]) => (
        <View key={name} style={prStyles.row}>
          <Text style={prStyles.name}>{name}</Text>
          <Text style={prStyles.weight}>{weight} kg</Text>
          <Text style={prStyles.date}>{formatDate(date.split('T')[0])}</Text>
        </View>
      ))}
    </View>
  );
}

const prStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { ...typography.bodyBold, color: colors.text },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  name: { ...typography.label, color: colors.text, flex: 2 },
  weight: { ...typography.bodyBold, color: colors.warning, flex: 1, textAlign: 'center' },
  date: { ...typography.caption, color: colors.textMuted, flex: 1, textAlign: 'right' },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={kpiStyles.card}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[kpiStyles.value, { color }]}>{value}</Text>
      <Text style={kpiStyles.label}>{label}</Text>
    </View>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={chartStyles.card}>
      <View style={chartStyles.header}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={chartStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function EmptyChart({ title, message, icon }: { title: string; message: string; icon: string }) {
  return (
    <View style={chartStyles.emptyCard}>
      <View style={chartStyles.header}>
        <Ionicons name={icon as any} size={16} color={colors.textMuted} />
        <Text style={[chartStyles.title, { color: colors.textMuted }]}>{title}</Text>
      </View>
      <View style={chartStyles.emptyBody}>
        <Text style={chartStyles.emptyText}>{message}</Text>
      </View>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.sm, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.cardBorder, marginHorizontal: 2,
    ...shadows.sm,
  },
  value: { fontSize: 16, fontWeight: '700' },
  label: { ...typography.tiny, color: colors.textMuted, textAlign: 'center' },
});

const chartStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { ...typography.bodyBold, color: colors.text },
  chart: { borderRadius: borderRadius.md, marginLeft: -spacing.sm },
  emptyBody: { height: 80, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, padding: spacing.md },
  content: { paddingHorizontal: spacing.md },
  periodRow: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: borderRadius.md, padding: 3, marginBottom: spacing.md,
  },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm, alignItems: 'center' },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: { ...typography.label, color: colors.textSecondary },
  periodTextActive: { color: '#FFFFFF', fontWeight: '600' },
  kpiRow: { flexDirection: 'row', marginBottom: spacing.sm },
});
