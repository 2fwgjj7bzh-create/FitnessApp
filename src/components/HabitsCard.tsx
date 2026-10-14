/**
 * Habitudes du jour (accueil) : coches automatiques + manuelles, série de jours réussis.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Switch, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { localDateStr } from '../utils/helpers';
import { habitStates, habitStreak, toggleManual, HabitState, getHabitDefs, saveHabitDefs, HabitDef, newHabit } from '../lib/habits';

export default function HabitsCard() {
  const [states, setStates] = useState<HabitState[]>([]);
  const [streak, setStreak] = useState(0);
  const [editing, setEditing] = useState(false);
  const [defs, setDefs] = useState<HabitDef[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const today = localDateStr();

  const load = useCallback(async () => {
    setStates(await habitStates(today));
    habitStreak().then(setStreak).catch(() => {});
  }, [today]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const done = states.filter(s => s.done).length;

  const openEditor = async () => { setDefs(await getHabitDefs()); setEditing(true); };
  const closeEditor = async () => { await saveHabitDefs(defs); setEditing(false); load(); };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="checkmark-done-outline" size={18} color={colors.primaryLight} />
        <Text style={styles.title}>Habitudes du jour</Text>
        <Text style={styles.count}>{done}/{states.length}</Text>
        <View style={{ flex: 1 }} />
        {streak > 0 && (
          <View style={styles.streak}><Ionicons name="flame" size={13} color={colors.warning} /><Text style={styles.streakText}>{streak} j</Text></View>
        )}
        <TouchableOpacity onPress={openEditor} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="create-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {states.map(s => (
        <TouchableOpacity
          key={s.def.id}
          style={styles.row}
          activeOpacity={s.manual ? 0.6 : 1}
          onPress={async () => { if (s.manual) { await toggleManual(today, s.def.id); load(); } }}
        >
          <Ionicons name={s.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={s.done ? colors.success : colors.textMuted} />
          <Ionicons name={s.def.icon as any} size={16} color={colors.textSecondary} />
          <Text style={[styles.label, s.done && styles.labelDone]} numberOfLines={1}>{s.def.label}</Text>
          {s.detail ? <Text style={styles.detail}>{s.detail}</Text> : null}
          {!s.manual && <Ionicons name="flash-outline" size={12} color={colors.textMuted} />}
        </TouchableOpacity>
      ))}
      <Text style={styles.foot}>⚡ = coché automatiquement à partir de tes données</Text>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Mes habitudes</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {defs.map(d => (
                <View key={d.id} style={styles.editRow}>
                  <Switch value={d.active} onValueChange={v => setDefs(list => list.map(x => x.id === d.id ? { ...x, active: v } : x))} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#FFFFFF" ios_backgroundColor={colors.border} />
                  <Text style={styles.editLabel}>{d.label}</Text>
                  {d.auto === 'steps' && (
                    <TextInput
                      style={styles.target} keyboardType="number-pad" value={String(d.target ?? 8000)}
                      onChangeText={t => setDefs(list => list.map(x => x.id === d.id ? { ...x, target: parseInt(t, 10) || 0 } : x))}
                    />
                  )}
                  {!d.auto && d.id.startsWith('h_') && (
                    <TouchableOpacity onPress={() => setDefs(list => list.filter(x => x.id !== d.id))}><Ionicons name="trash-outline" size={16} color={colors.error} /></TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.addRow}>
              <TextInput style={styles.input} value={newLabel} onChangeText={setNewLabel} placeholder="Nouvelle habitude (ex. 10 min de mobilité)" placeholderTextColor={colors.textMuted} />
              <TouchableOpacity style={styles.addBtn} onPress={() => { if (newLabel.trim()) { setDefs(l => [...l, newHabit(newLabel.trim())]); setNewLabel(''); } }}>
                <Ionicons name="add" size={20} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.save} onPress={closeEditor}><Text style={styles.saveText}>Enregistrer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, marginTop: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text },
  count: { ...typography.caption, color: colors.textMuted },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.warning + '22', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6 },
  streakText: { ...typography.tiny, color: colors.warning },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
  label: { ...typography.body, color: colors.text, flex: 1 },
  labelDone: { color: colors.textSecondary },
  detail: { ...typography.caption, color: colors.textMuted },
  foot: { ...typography.tiny, color: colors.textMuted, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.sm },
  sheetTitle: { ...typography.h2, color: colors.text },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  editLabel: { ...typography.body, color: colors.text, flex: 1 },
  target: { ...typography.bodyBold, color: colors.text, backgroundColor: colors.inputBg, borderRadius: borderRadius.sm, width: 72, textAlign: 'center', paddingVertical: 4 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, ...typography.body, color: colors.text, backgroundColor: colors.inputBg, borderRadius: borderRadius.md, padding: spacing.sm },
  addBtn: { width: 44, borderRadius: borderRadius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  save: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 12, alignItems: 'center' },
  saveText: { ...typography.bodyBold, color: colors.onPrimary },
});
