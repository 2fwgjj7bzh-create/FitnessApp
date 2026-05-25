import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getCheckins, deleteCheckin } from '../storage';
import { formatDateLong, FEELING_LABELS, SLEEP_QUALITY_LABELS } from '../utils/helpers';
import { WeeklyCheckin, BodyStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<BodyStackParamList, 'BodyList'>;

const FEELING_EMOJIS: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '😊', 5: '🤩' };
const SLEEP_EMOJIS: Record<number, string> = { 1: '😴', 2: '😪', 3: '😑', 4: '😌', 5: '✨' };

export default function BodyListScreen() {
  const navigation = useNavigation<NavProp>();
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getCheckins();
    setCheckins(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer ce bilan ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          await deleteCheckin(id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Bilans</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewCheckin', {})}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={checkins}
        keyExtractor={c => c.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item: c, index: i }) => (
          <CheckinCard
            checkin={c}
            isFirst={i === 0}
            prevCheckin={i < checkins.length - 1 ? checkins[i + 1] : null}
            expanded={expanded === c.id}
            onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
            onEdit={() => navigation.navigate('NewCheckin', { checkinId: c.id })}
            onDelete={() => handleDelete(c.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="body-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucun bilan</Text>
            <Text style={styles.emptySubtitle}>Commence à suivre tes progrès corporels</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('NewCheckin', {})}>
              <Text style={styles.emptyBtnText}>Créer mon premier bilan</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={checkins.length > 0 ? <View style={{ height: 20 }} /> : null}
      />
    </SafeAreaView>
  );
}

// ─── Checkin Card ─────────────────────────────────────────────────────────────

interface CheckinCardProps {
  checkin: WeeklyCheckin;
  isFirst: boolean;
  prevCheckin: WeeklyCheckin | null;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CheckinCard({ checkin, isFirst, prevCheckin, expanded, onToggle, onEdit, onDelete }: CheckinCardProps) {
  const weightDiff = checkin.weight && prevCheckin?.weight
    ? (checkin.weight - prevCheckin.weight).toFixed(1)
    : null;

  const weightDiffNum = weightDiff ? parseFloat(weightDiff) : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onToggle} activeOpacity={0.8}>
      {isFirst && <View style={styles.latestBadge}><Text style={styles.latestBadgeText}>Dernier</Text></View>}

      {/* Summary row */}
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardDate}>{formatDateLong(checkin.date)}</Text>
          <View style={styles.cardStats}>
            {checkin.weight && (
              <View style={styles.cardStat}>
                <Text style={styles.cardStatValue}>{checkin.weight} kg</Text>
                {weightDiffNum !== null && (
                  <Text style={[styles.weightDiff, { color: weightDiffNum <= 0 ? colors.success : colors.secondary }]}>
                    {weightDiffNum > 0 ? '+' : ''}{weightDiff}
                  </Text>
                )}
              </View>
            )}
            <Text style={styles.feelingEmoji}>{FEELING_EMOJIS[checkin.feeling]}</Text>
            <View style={styles.sleepStat}>
              <Ionicons name="moon-outline" size={14} color={colors.info} />
              <Text style={styles.sleepText}>{checkin.sleepHours}h</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </View>
      </View>

      {/* Expanded details */}
      {expanded && (
        <View style={styles.expanded}>
          {checkin.photoUri && (
            <Image source={{ uri: checkin.photoUri }} style={styles.photo} resizeMode="cover" />
          )}

          {/* Feeling & Sleep */}
          <View style={styles.detailRow}>
            <DetailItem icon="happy-outline" label="Forme" value={FEELING_LABELS[checkin.feeling]} emoji={FEELING_EMOJIS[checkin.feeling]} color={colors.warning} />
            <DetailItem icon="moon-outline" label="Sommeil" value={`${checkin.sleepHours}h — ${SLEEP_QUALITY_LABELS[checkin.sleepQuality]}`} emoji={SLEEP_EMOJIS[checkin.sleepQuality]} color={colors.info} />
          </View>

          {/* Measurements */}
          {checkin.measurements && Object.keys(checkin.measurements).length > 0 && (
            <View style={styles.measurements}>
              <Text style={styles.measureTitle}>Mensurations</Text>
              <View style={styles.measureGrid}>
                {(Object.entries(checkin.measurements) as [string, number | undefined][]).map(([key, val]) => {
                  if (!val) return null;
                  const labels: Record<string, string> = {
                    chest: 'Poitrine', waist: 'Taille', hips: 'Hanches',
                    leftArm: 'Bras G', rightArm: 'Bras D',
                    leftThigh: 'Cuisse G', rightThigh: 'Cuisse D',
                  };
                  return (
                    <View key={key} style={styles.measureItem}>
                      <Text style={styles.measureValue}>{val} cm</Text>
                      <Text style={styles.measureLabel}>{labels[key] ?? key}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {checkin.notes ? (
            <View style={styles.noteBox}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
              <Text style={styles.noteText}>{checkin.notes}</Text>
            </View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

function DetailItem({ icon, label, value, emoji, color }: { icon: string; label: string; value: string; emoji: string; color: string }) {
  return (
    <View style={detailStyles.item}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{emoji} {value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  item: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm },
  label: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  value: { ...typography.label, color: colors.text, marginTop: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { ...typography.h1, color: colors.text },
  addBtn: {
    backgroundColor: colors.primary, width: 40, height: 40,
    borderRadius: borderRadius.round, justifyContent: 'center', alignItems: 'center',
  },
  content: { paddingHorizontal: spacing.md },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { ...typography.h3, color: colors.textSecondary, marginTop: spacing.lg },
  emptySubtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  emptyBtn: {
    marginTop: spacing.lg, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.round,
  },
  emptyBtnText: { ...typography.bodyBold, color: '#FFFFFF' },
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
    overflow: 'hidden',
  },
  latestBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderTopRightRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.sm,
  },
  latestBadgeText: { ...typography.tiny, color: '#FFFFFF', fontWeight: '700' },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardLeft: { flex: 1 },
  cardDate: { ...typography.label, color: colors.textSecondary },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatValue: { ...typography.bodyBold, color: colors.text },
  weightDiff: { ...typography.caption, fontWeight: '600' },
  feelingEmoji: { fontSize: 20 },
  sleepStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sleepText: { ...typography.label, color: colors.info },
  cardActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  expanded: { marginTop: spacing.md, gap: spacing.sm },
  photo: { width: '100%', height: 200, borderRadius: borderRadius.md },
  detailRow: { flexDirection: 'row', gap: spacing.sm },
  measurements: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md },
  measureTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  measureItem: { backgroundColor: colors.card, borderRadius: borderRadius.sm, padding: spacing.sm, minWidth: 80, alignItems: 'center' },
  measureValue: { ...typography.bodyBold, color: colors.text },
  measureLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  noteBox: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm },
  noteText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
});
