/**
 * Bilans : planification, évolution (poids, mensurations, réponses), comparaison photos
 * et historique.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, RefreshControl, Dimensions, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getCheckins, deleteCheckin } from '../storage';
import { formatDate, formatDateLong, localDateStr } from '../utils/helpers';
import { WeeklyCheckin, BodyStackParamList, CheckinQuestion } from '../types';
import {
  getQuestions, getSchedule, describeSchedule, nextOccurrences, dueDateFor, answerFor,
  MEASUREMENT_FIELDS, normalizeMeasurements, photosOf, CheckinSchedule,
} from '../lib/checkin';

type Nav = NativeStackNavigationProp<BodyStackParamList, 'BodyList'>;
const W = Dimensions.get('window').width;

interface Metric { key: string; label: string; unit: string; get: (c: WeeklyCheckin) => number | undefined }

export default function BodyListScreen() {
  const navigation = useNavigation<Nav>();
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([]);
  const [questions, setQuestions] = useState<CheckinQuestion[]>([]);
  const [schedule, setSchedule] = useState<CheckinSchedule | null>(null);
  const [metric, setMetric] = useState('weight');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [c, q, s] = await Promise.all([getCheckins(), getQuestions(), getSchedule()]);
    setCheckins([...c].sort((a, b) => b.date.localeCompare(a.date)));
    setQuestions(q);
    setSchedule(s);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const metrics: Metric[] = useMemo(() => {
    const base: Metric[] = [{ key: 'weight', label: 'Poids', unit: 'kg', get: c => c.weight }];
    MEASUREMENT_FIELDS.forEach(f => base.push({
      key: f.key, label: f.side ? `${f.label} ${f.side}` : f.label, unit: 'cm',
      get: c => normalizeMeasurements(c.measurements)[f.key],
    }));
    questions.filter(q => q.type === 'scale' || q.type === 'number').forEach(q => base.push({
      key: 'q:' + q.id, label: q.label, unit: q.type === 'scale' ? `/${q.max ?? 5}` : (q.unit ?? ''),
      get: c => { const v = answerFor(c, q.id); const n = Number(v); return v === undefined || isNaN(n) || n === 0 && q.id === 'sleep_hours' ? undefined : n; },
    }));
    // ne garder que les métriques renseignées au moins une fois
    return base.filter(m => m.key === 'weight' || checkins.some(c => m.get(c) !== undefined));
  }, [questions, checkins]);

  const current = metrics.find(m => m.key === metric) ?? metrics[0];
  const series = useMemo(() => [...checkins].reverse().filter(c => current.get(c) !== undefined).slice(-12), [checkins, current]);

  const withWeight = checkins.filter(c => c.weight);
  const latestW = withWeight[0]?.weight;
  const firstW = withWeight[withWeight.length - 1]?.weight;

  const due = schedule ? dueDateFor(schedule) : null;
  const dueDone = due ? checkins.some(c => c.date >= localDateStr(due)) : true;
  const next = schedule?.enabled ? nextOccurrences(schedule, 1)[0] : null;

  const handleDelete = (id: string) => {
    const go = async () => { await deleteCheckin(id); load(); };
    if (Platform.OS === 'web') { if (window.confirm('Supprimer ce bilan ?')) go(); return; }
    Alert.alert('Supprimer', 'Supprimer ce bilan ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Bilans</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CheckinSettings')}>
          <Ionicons name="settings-outline" size={20} color={colors.primaryLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewCheckin', {})}>
          <Ionicons name="add" size={22} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        {/* Planification */}
        {due && !dueDone ? (
          <TouchableOpacity style={styles.dueCard} onPress={() => navigation.navigate('NewCheckin', {})} activeOpacity={0.85}>
            <Ionicons name="alarm-outline" size={22} color={colors.onPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dueTitle}>Ton bilan est à faire</Text>
              <Text style={styles.dueSub}>Prévu le {formatDate(localDateStr(due))} · 5 minutes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.scheduleCard} onPress={() => navigation.navigate('CheckinSettings')} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={20} color={colors.primaryLight} />
            <View style={{ flex: 1 }}>
              <Text style={styles.scheduleTitle}>{schedule ? describeSchedule(schedule) : '…'}</Text>
              <Text style={styles.scheduleSub}>
                {next ? `Prochain bilan : ${formatDate(localDateStr(next))}` : 'Planifie tes bilans pour recevoir un rappel'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Chiffres clés */}
        <View style={styles.statsRow}>
          <Stat label="Bilans" value={String(checkins.length)} />
          <Stat label="Poids actuel" value={latestW ? `${latestW}` : '—'} unit="kg" />
          <Stat
            label="Depuis le début"
            value={latestW && firstW && withWeight.length > 1 ? `${latestW - firstW >= 0 ? '+' : ''}${(latestW - firstW).toFixed(1)}` : '—'}
            unit="kg"
          />
        </View>

        {/* Évolution */}
        <View style={styles.card}>
          <Text style={styles.label}>ÉVOLUTION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            {metrics.map(m => (
              <TouchableOpacity key={m.key} style={[styles.chip, current.key === m.key && styles.chipActive]} onPress={() => setMetric(m.key)}>
                <Text style={[styles.chipText, current.key === m.key && styles.chipTextActive]} numberOfLines={1}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {series.length >= 2 ? (
            <LineChart
              data={{
                labels: series.map(c => { const d = new Date(c.date + 'T12:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; }),
                datasets: [{ data: series.map(c => current.get(c) as number) }],
              }}
              width={W - spacing.md * 4 - 2}
              height={190}
              yAxisSuffix={current.unit === 'kg' || current.unit === 'cm' ? '' : ''}
              chartConfig={{
                backgroundColor: colors.card, backgroundGradientFrom: colors.card, backgroundGradientTo: colors.card,
                decimalPlaces: 1, color: (o = 1) => `rgba(200, 16, 46, ${o})`, labelColor: () => colors.textSecondary,
                propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
                propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '4' },
              }}
              bezier
              style={{ marginLeft: -12 }}
            />
          ) : (
            <Text style={styles.empty}>Il faut au moins 2 bilans avec « {current.label} » pour tracer la courbe.</Text>
          )}
          {series.length >= 2 && (
            <Text style={styles.foot}>
              {series.length} bilans · {current.label} : {current.get(series[0])} → {current.get(series[series.length - 1])} {current.unit}
            </Text>
          )}
        </View>

        {/* Comparaison */}
        {checkins.filter(c => Object.values(photosOf(c)).some(Boolean)).length >= 2 && (
          <TouchableOpacity style={styles.compareBtn} onPress={() => navigation.navigate('CheckinCompare')}>
            <Ionicons name="git-compare-outline" size={18} color={colors.primaryLight} />
            <Text style={styles.compareText}>Comparer les photos avant / après</Text>
          </TouchableOpacity>
        )}

        {/* Historique */}
        <Text style={styles.section}>HISTORIQUE</Text>
        {checkins.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="body-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucun bilan</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('NewCheckin', {})}>
              <Text style={styles.emptyBtnText}>Faire mon premier bilan</Text>
            </TouchableOpacity>
          </View>
        )}
        {checkins.map((c, i) => {
          const prev = checkins.slice(i + 1).find(x => x.weight);
          const diff = c.weight && prev?.weight ? c.weight - prev.weight : null;
          const ph = photosOf(c);
          const m = normalizeMeasurements(c.measurements);
          const open = expanded === c.id;
          return (
            <TouchableOpacity key={c.id} style={styles.item} onPress={() => setExpanded(open ? null : c.id)} activeOpacity={0.85}>
              <View style={styles.itemTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemDate}>{formatDateLong(c.date)}</Text>
                  <Text style={styles.itemSub}>
                    {c.weight ? `${c.weight} kg` : 'Poids non renseigné'}
                    {diff !== null ? `  (${diff >= 0 ? '+' : ''}${diff.toFixed(1)})` : ''}
                  </Text>
                </View>
                <View style={styles.thumbs}>
                  {(['front', 'back', 'side'] as const).map(k => ph[k] ? <Image key={k} source={{ uri: ph[k] }} style={styles.thumb} /> : null)}
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('NewCheckin', { checkinId: c.id })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(c.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
              {open && (
                <View style={styles.detail}>
                  {MEASUREMENT_FIELDS.filter(f => m[f.key]).map(f => (
                    <Text key={f.key} style={styles.detailLine}>{f.label}{f.side ? ` ${f.side}` : ''} : {m[f.key]} cm</Text>
                  ))}
                  {(c.questionsSnapshot ?? questions).map(q => {
                    const v = answerFor(c, q.id);
                    if (v === undefined || v === '') return null;
                    const txt = typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : `${v}${'unit' in q && q.unit ? ` ${q.unit}` : ''}`;
                    return <Text key={q.id} style={styles.detailLine}><Text style={{ color: colors.textMuted }}>{q.label} : </Text>{txt}</Text>;
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}{unit && value !== '—' ? <Text style={styles.statUnit}> {unit}</Text> : null}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  title: { ...typography.h1, fontSize: 38, color: colors.text, flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingTop: 0 },
  dueCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm,
  },
  dueTitle: { ...typography.bodyBold, color: colors.onPrimary },
  dueSub: { ...typography.caption, color: colors.onPrimary, opacity: 0.85 },
  scheduleCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card,
    borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder,
  },
  scheduleTitle: { ...typography.bodyBold, color: colors.text },
  scheduleSub: { ...typography.caption, color: colors.textMuted },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder },
  statValue: { ...typography.h2, color: colors.text },
  statUnit: { ...typography.caption, color: colors.textMuted },
  statLabel: { ...typography.tiny, color: colors.textMuted },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.sm, overflow: 'hidden' },
  label: { ...typography.label, color: colors.primaryLight, marginBottom: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, marginRight: 6, maxWidth: 220 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.onPrimary },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.lg, textAlign: 'center' },
  foot: { ...typography.tiny, color: colors.textMuted, marginTop: 4 },
  compareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.md,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primary + '66', marginBottom: spacing.sm,
  },
  compareText: { ...typography.bodyBold, color: colors.primaryLight },
  section: { ...typography.label, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
  item: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.sm },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemDate: { ...typography.bodyBold, color: colors.text, textTransform: 'capitalize' },
  itemSub: { ...typography.caption, color: colors.textSecondary },
  thumbs: { flexDirection: 'row', gap: 4 },
  thumb: { width: 30, height: 40, borderRadius: 4 },
  detail: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 4 },
  detailLine: { ...typography.caption, color: colors.text },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  emptyBtnText: { ...typography.bodyBold, color: colors.onPrimary },
});
