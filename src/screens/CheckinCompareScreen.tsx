/**
 * Comparaison avant / après : deux bilans côte à côte (photos face, dos, profil)
 * avec l'écart de poids et de mensurations.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getCheckins } from '../storage';
import { formatDate } from '../utils/helpers';
import { WeeklyCheckin } from '../types';
import { MEASUREMENT_FIELDS, normalizeMeasurements, photosOf } from '../lib/checkin';

const POSES = [{ key: 'front', label: 'Face' }, { key: 'back', label: 'Dos' }, { key: 'side', label: 'Profil' }] as const;

export default function CheckinCompareScreen() {
  const navigation = useNavigation();
  const [list, setList] = useState<WeeklyCheckin[]>([]);
  const [fromId, setFromId] = useState<string>();
  const [toId, setToId] = useState<string>();
  const [pose, setPose] = useState<'front' | 'back' | 'side'>('front');
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  useEffect(() => {
    getCheckins().then(all => {
      const withPhotos = [...all].filter(c => Object.values(photosOf(c)).some(Boolean)).sort((a, b) => a.date.localeCompare(b.date));
      setList(withPhotos);
      setFromId(withPhotos[0]?.id);
      setToId(withPhotos[withPhotos.length - 1]?.id);
    });
  }, []);

  const from = list.find(c => c.id === fromId);
  const to = list.find(c => c.id === toId);
  const mf = normalizeMeasurements(from?.measurements);
  const mt = normalizeMeasurements(to?.measurements);

  const Side = ({ c, which }: { c?: WeeklyCheckin; which: 'from' | 'to' }) => {
    const uri = c ? photosOf(c)[pose] : undefined;
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setPicking(picking === which ? null : which)}>
          <Text style={styles.dateText}>{c ? formatDate(c.date) : '—'}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.photoBox}>
          {uri ? <Image source={{ uri }} style={styles.photo} resizeMode="contain" /> : <Text style={styles.noPhoto}>Pas de photo</Text>}
        </View>
        <Text style={styles.weight}>{c?.weight ? `${c.weight} kg` : ''}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Avant / Après</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tabs}>
          {POSES.map(p => (
            <TouchableOpacity key={p.key} style={[styles.tab, pose === p.key && styles.tabActive]} onPress={() => setPose(p.key)}>
              <Text style={[styles.tabText, pose === p.key && styles.tabTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {picking && (
          <View style={styles.picker}>
            {list.map(c => (
              <TouchableOpacity key={c.id} style={styles.pickItem} onPress={() => { picking === 'from' ? setFromId(c.id) : setToId(c.id); setPicking(null); }}>
                <Text style={styles.pickText}>{formatDate(c.date)}{c.weight ? ` · ${c.weight} kg` : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.row}>
          <Side c={from} which="from" />
          <Side c={to} which="to" />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>ÉCARTS</Text>
          {from?.weight && to?.weight ? (
            <Line label="Poids" a={from.weight} b={to.weight} unit="kg" />
          ) : null}
          {MEASUREMENT_FIELDS.map(f => (mf[f.key] && mt[f.key]) ? (
            <Line key={f.key} label={`${f.label}${f.side ? ` ${f.side}` : ''}`} a={mf[f.key]!} b={mt[f.key]!} unit="cm" />
          ) : null)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, a, b, unit }: { label: string; a: number; b: number; unit: string }) {
  const d = b - a;
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineVal}>{a} → {b} {unit}</Text>
      <Text style={[styles.lineDiff, { color: d === 0 ? colors.textMuted : colors.primaryLight }]}>{d >= 0 ? '+' : ''}{d.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.h2, color: colors.text, flex: 1, textAlign: 'center' },
  content: { padding: spacing.md },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.bodyBold, color: colors.textSecondary },
  tabTextActive: { color: colors.onPrimary },
  picker: { backgroundColor: colors.card, borderRadius: borderRadius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  pickItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  pickText: { ...typography.body, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm },
  dateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  dateText: { ...typography.bodyBold, color: colors.text },
  photoBox: { aspectRatio: 3 / 4, backgroundColor: colors.card, borderRadius: borderRadius.md, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  photo: { width: '100%', height: '100%' },
  noPhoto: { ...typography.caption, color: colors.textMuted },
  weight: { ...typography.h3, color: colors.text, textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.cardBorder },
  label: { ...typography.label, color: colors.primaryLight, marginBottom: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  lineLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  lineVal: { ...typography.caption, color: colors.text, marginRight: spacing.sm },
  lineDiff: { ...typography.bodyBold, width: 56, textAlign: 'right' },
});
