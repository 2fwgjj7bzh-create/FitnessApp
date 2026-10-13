/**
 * Carte NEAT de l'accueil : pas et NEAT du jour, moyenne 7 jours, synchro Apple Santé
 * ou saisie manuelle des pas. Déclenche aussi la mise à jour auto des objectifs (mode Mesuré).
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getGoals, getWorkouts } from '../storage';
import { localDateStr } from '../utils/helpers';
import { MEASURED_ACTIVITY } from '../utils/metabolism';
import { healthStatus, requestHealthAccess } from '../lib/health';
import { getNeatDays, saveManualSteps, syncNeatFromHealth, energyForDay, weekAverage, DayEnergy, WeekAverage } from '../lib/neat';
import { getMetabolismSettings, autoUpdateGoalsIfNeeded } from '../lib/metabolismSettings';

export default function NeatCard({ onGoalsUpdated }: { onGoalsUpdated?: () => void }) {
  const [todayE, setTodayE] = useState<DayEnergy | null>(null);
  const [week, setWeek] = useState<WeekAverage | null>(null);
  const [measuredMode, setMeasuredMode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualDay, setManualDay] = useState<'today' | 'yesterday'>('yesterday');
  const [manualSteps, setManualSteps] = useState('');
  const status = healthStatus();

  const refresh = useCallback(async () => {
    const [neatDays, workouts, goals, settings] = await Promise.all([getNeatDays(), getWorkouts(), getGoals(), getMetabolismSettings()]);
    const body = {
      weightKg: goals.bodyWeight, heightCm: parseFloat(settings.height) || 175, sex: settings.sex,
      watchDuringWorkouts: settings.watchDuringWorkouts,
    };
    setTodayE(energyForDay(localDateStr(), neatDays, workouts, body));
    setWeek(weekAverage(neatDays, workouts, body));
    setMeasuredMode(settings.activity === MEASURED_ACTIVITY);
  }, []);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      await refresh();
      const updated = await autoUpdateGoalsIfNeeded();
      if (alive && updated !== null) { onGoalsUpdated?.(); await refresh(); }
    })();
    return () => { alive = false; };
  }, [refresh, onGoalsUpdated]));

  const sync = async () => {
    setSyncing(true);
    try {
      await requestHealthAccess();
      await syncNeatFromHealth(14);
      await refresh();
    } catch (e: any) {
      Alert.alert('Synchronisation impossible', e?.message ?? String(e));
    } finally { setSyncing(false); }
  };

  const saveManual = async () => {
    const n = parseInt(manualSteps.replace(/\s/g, ''), 10);
    if (isNaN(n) || n < 0 || n > 100000) {
      if (Platform.OS === 'web') window.alert('Nombre de pas invalide'); else Alert.alert('Nombre de pas invalide');
      return;
    }
    const d = new Date(); if (manualDay === 'yesterday') d.setDate(d.getDate() - 1);
    await saveManualSteps(localDateStr(d), n);
    setShowManual(false); setManualSteps('');
    await refresh();
  };

  const sourceLabel = status === 'available' ? 'Apple Santé'
    : status === 'expo-go' ? 'Saisie manuelle (Santé : version installée requise)'
    : 'Saisie manuelle';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="footsteps-outline" size={18} color={colors.primaryLight} />
        <Text style={styles.title}>NEAT</Text>
        {measuredMode && <View style={styles.badge}><Text style={styles.badgeText}>CALCUL AUTO</Text></View>}
        <View style={{ flex: 1 }} />
        {status === 'available' ? (
          <TouchableOpacity style={styles.action} onPress={sync} disabled={syncing}>
            {syncing ? <ActivityIndicator size="small" color={colors.primaryLight} /> : <Ionicons name="sync" size={16} color={colors.primaryLight} />}
            <Text style={styles.actionText}>Santé</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.action} onPress={() => setShowManual(true)}>
            <Ionicons name="create-outline" size={16} color={colors.primaryLight} />
            <Text style={styles.actionText}>Saisir mes pas</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.row}>
        <Stat label="Pas aujourd'hui" value={todayE?.steps !== undefined ? todayE.steps.toLocaleString('fr') : '—'} />
        <Stat label="NEAT aujourd'hui" value={todayE?.neat != null ? `${todayE.neat}` : '—'} unit="kcal" />
        <Stat label="Moyenne 7 j" value={week?.neatAvg != null ? `${Math.round(week.neatAvg)}` : '—'} unit="kcal" accent />
      </View>
      <Text style={styles.foot}>
        {sourceLabel} · {week ? `${week.daysWithData}/7 jours renseignés` : ''}
        {week?.stepsAvg ? ` · ${Math.round(week.stepsAvg).toLocaleString('fr')} pas/j` : ''}
      </Text>

      <Modal visible={showManual} transparent animationType="fade" onRequestClose={() => setShowManual(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Saisir mes pas</Text>
            <Text style={styles.sheetHint}>Recopie le total de l'app Santé (Parcourir › Activité › Pas). Saisis la journée d'hier une fois terminée : c'est elle qui compte dans la moyenne.</Text>
            <View style={styles.dayRow}>
              {(['yesterday', 'today'] as const).map(d => (
                <TouchableOpacity key={d} style={[styles.dayBtn, manualDay === d && styles.dayBtnActive]} onPress={() => setManualDay(d)}>
                  <Text style={[styles.dayText, manualDay === d && styles.dayTextActive]}>{d === 'yesterday' ? 'Hier' : "Aujourd'hui"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input} value={manualSteps} onChangeText={setManualSteps}
              keyboardType="number-pad" placeholder="ex. 8500" placeholderTextColor={colors.textMuted} autoFocus
            />
            <View style={styles.dayRow}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setShowManual(false)}>
                <Text style={styles.btnGhostText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={saveManual}>
                <Text style={styles.btnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: colors.primaryLight }]}>
        {value}{unit && value !== '—' ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder, marginTop: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text },
  badge: { backgroundColor: colors.primaryMuted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { ...typography.tiny, color: colors.primaryLight, letterSpacing: 0.6 },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: colors.primary + '66',
  },
  actionText: { ...typography.caption, color: colors.primaryLight },
  row: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1 },
  statValue: { ...typography.h2, color: colors.text },
  statUnit: { ...typography.caption, color: colors.textMuted },
  statLabel: { ...typography.tiny, color: colors.textMuted },
  foot: { ...typography.tiny, color: colors.textMuted, marginTop: spacing.sm },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.md },
  sheetTitle: { ...typography.h2, color: colors.text },
  sheetHint: { ...typography.caption, color: colors.textSecondary },
  dayRow: { flexDirection: 'row', gap: spacing.sm },
  dayBtn: { flex: 1, paddingVertical: 10, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  dayBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { ...typography.bodyBold, color: colors.textSecondary },
  dayTextActive: { color: colors.onPrimary },
  input: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md, padding: spacing.md,
    ...typography.h2, color: colors.text, textAlign: 'center',
  },
  btn: { flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 12, alignItems: 'center' },
  btnText: { ...typography.bodyBold, color: colors.onPrimary },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnGhostText: { ...typography.bodyBold, color: colors.textSecondary },
});
