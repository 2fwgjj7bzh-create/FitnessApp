/**
 * Carte hydratation : objectif, progression, ajouts rapides, historique 7 jours, rappels.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getNutritionDays } from '../storage';
import { localDateStr } from '../utils/helpers';
import { getWaterSettings, saveWaterSettings, WaterSettings, DEFAULT_WATER } from '../lib/water';

const WATER = '#4FC3F7';

export default function WaterCard({ date, waterMl, onAdd }: { date: string; waterMl: number; onAdd: (deltaMl: number) => void }) {
  const [settings, setSettings] = useState<WaterSettings>(DEFAULT_WATER);
  const [history, setHistory] = useState<{ date: string; ml: number }[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [custom, setCustom] = useState('');
  const [goalInput, setGoalInput] = useState('');

  const loadHistory = useCallback(async () => {
    const days = await getNutritionDays();
    const out: { date: string; ml: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() - i);
      const key = localDateStr(d);
      out.push({ date: key, ml: key === date ? waterMl : (days.find(x => x.date === key)?.waterMl ?? 0) });
    }
    setHistory(out);
  }, [date, waterMl]);

  useEffect(() => { getWaterSettings().then(s => { setSettings(s); setGoalInput(String(s.goalMl / 1000)); }); }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const pct = Math.min(1, waterMl / Math.max(1, settings.goalMl));
  const reached = waterMl >= settings.goalMl;
  const daysReached = history.filter(h => h.ml >= settings.goalMl).length;

  const saveSettings = async (patch: Partial<WaterSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveWaterSettings(next);
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Ionicons name="water" size={20} color={WATER} />
        <Text style={styles.value}>{(waterMl / 1000).toFixed(2).replace(/0$/, '')} L</Text>
        <Text style={styles.goal}>/ {(settings.goalMl / 1000).toFixed(1)} L</Text>
        <View style={{ flex: 1 }} />
        {reached && <View style={styles.badge}><Ionicons name="checkmark" size={12} color="#0A0A0A" /><Text style={styles.badgeText}>Objectif atteint</Text></View>}
        <TouchableOpacity onPress={() => setShowSettings(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.bar}><View style={[styles.fill, { width: `${pct * 100}%` }]} /></View>

      <View style={styles.btns}>
        <TouchableOpacity style={styles.btnMinus} onPress={() => onAdd(-250)}><Text style={styles.btnMinusText}>−250</Text></TouchableOpacity>
        {[250, 500, 1000].map(v => (
          <TouchableOpacity key={v} style={styles.btn} onPress={() => onAdd(v)}>
            <Text style={styles.btnText}>+{v >= 1000 ? '1 L' : `${v}`}</Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.custom} value={custom} onChangeText={setCustom} keyboardType="number-pad"
          placeholder="ml" placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => { const n = parseInt(custom, 10); if (n > 0) onAdd(n); setCustom(''); }}
          returnKeyType="done"
        />
      </View>

      <View style={styles.histRow}>
        {history.map(h => {
          const r = Math.min(1, h.ml / Math.max(1, settings.goalMl));
          const d = new Date(h.date + 'T12:00:00');
          return (
            <View key={h.date} style={styles.histCol}>
              <View style={styles.histTrack}><View style={[styles.histFill, { height: `${r * 100}%`, backgroundColor: r >= 1 ? WATER : WATER + '66' }]} /></View>
              <Text style={styles.histLabel}>{['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()]}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.foot}>Objectif atteint {daysReached}/7 jours</Text>

      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Hydratation</Text>
            <Text style={styles.sub}>Objectif quotidien (litres)</Text>
            <TextInput
              style={styles.input} value={goalInput} onChangeText={setGoalInput} keyboardType="decimal-pad"
              placeholder="2.5" placeholderTextColor={colors.textMuted}
            />
            <View style={styles.toggle}>
              <Text style={styles.toggleText}>Rappels toutes les {settings.everyHours} h ({settings.startHour}h–{settings.endHour}h)</Text>
              <Switch value={settings.reminders} onValueChange={v => saveSettings({ reminders: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#FFFFFF" ios_backgroundColor={colors.border} />
            </View>
            <View style={styles.freqRow}>
              {[1, 2, 3].map(h => (
                <TouchableOpacity key={h} style={[styles.freq, settings.everyHours === h && styles.freqActive]} onPress={() => saveSettings({ everyHours: h })}>
                  <Text style={[styles.freqText, settings.everyHours === h && { color: colors.onPrimary }]}>Toutes les {h} h</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.save}
              onPress={async () => {
                const l = parseFloat(goalInput.replace(',', '.'));
                if (l > 0 && l < 10) await saveSettings({ goalMl: Math.round(l * 1000) });
                setShowSettings(false);
              }}
            >
              <Text style={styles.saveText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { ...typography.h2, color: colors.text },
  goal: { ...typography.caption, color: colors.textMuted, marginTop: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: WATER, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  badgeText: { ...typography.tiny, color: '#0A0A0A' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.inputBg, marginVertical: spacing.sm, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: WATER, borderRadius: 4 },
  btns: { flexDirection: 'row', gap: 6 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: borderRadius.md, backgroundColor: WATER + '22', alignItems: 'center' },
  btnText: { ...typography.bodyBold, color: WATER },
  btnMinus: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: borderRadius.md, backgroundColor: colors.inputBg, alignItems: 'center' },
  btnMinusText: { ...typography.bodyBold, color: colors.textSecondary },
  custom: { width: 64, borderRadius: borderRadius.md, backgroundColor: colors.inputBg, color: colors.text, textAlign: 'center', ...typography.body },
  histRow: { flexDirection: 'row', gap: 6, marginTop: spacing.md, height: 56 },
  histCol: { flex: 1, alignItems: 'center', gap: 4 },
  histTrack: { flex: 1, width: 12, borderRadius: 6, backgroundColor: colors.inputBg, justifyContent: 'flex-end', overflow: 'hidden' },
  histFill: { width: '100%', borderRadius: 6 },
  histLabel: { ...typography.tiny, color: colors.textMuted },
  foot: { ...typography.tiny, color: colors.textMuted, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.sm },
  sheetTitle: { ...typography.h2, color: colors.text },
  sub: { ...typography.caption, color: colors.textMuted },
  input: { ...typography.h2, color: colors.text, backgroundColor: colors.inputBg, borderRadius: borderRadius.md, padding: spacing.sm, textAlign: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  toggleText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  freqRow: { flexDirection: 'row', gap: 6 },
  freq: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  freqActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  freqText: { ...typography.caption, color: colors.textSecondary },
  save: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 12, alignItems: 'center', marginTop: spacing.sm },
  saveText: { ...typography.bodyBold, color: colors.onPrimary },
});
