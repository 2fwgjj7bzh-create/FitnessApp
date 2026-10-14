/**
 * Réglages du bilan : planification (jour, heure, fréquence, rappel, Calendrier)
 * et personnalisation du questionnaire.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getCheckins } from '../storage';
import { uid, formatDate, localDateStr } from '../utils/helpers';
import { CheckinQuestion, QuestionType } from '../types';
import {
  getSchedule, saveSchedule, CheckinSchedule, describeSchedule, nextOccurrences,
  getQuestions, saveQuestions, resetQuestions,
} from '../lib/checkin';

const DAYS = [
  { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mer' }, { v: 4, l: 'Jeu' },
  { v: 5, l: 'Ven' }, { v: 6, l: 'Sam' }, { v: 0, l: 'Dim' },
];
const TYPES: { v: QuestionType; l: string }[] = [
  { v: 'scale', l: 'Note 1–5' }, { v: 'number', l: 'Nombre' }, { v: 'yesno', l: 'Oui / Non' }, { v: 'text', l: 'Texte' },
];

const notify = (t: string, m: string) => (Platform.OS === 'web' ? window.alert(`${t}\n\n${m}`) : Alert.alert(t, m));

export default function CheckinSettingsScreen() {
  const navigation = useNavigation();
  const [s, setS] = useState<CheckinSchedule | null>(null);
  const [qs, setQs] = useState<CheckinQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<QuestionType>('scale');
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => { getSchedule().then(setS); getQuestions().then(setQs); }, []);

  const applySchedule = async (next: CheckinSchedule) => {
    setS(next);
  };

  const saveAll = async () => {
    if (!s) return;
    setSaving(true);
    try {
      await saveQuestions(qs);
      const res = await saveSchedule({ ...s, startDate: s.startDate || localDateStr() }, await getCheckins());
      setS(res.schedule);
      notify('Enregistré', [
        res.schedule.enabled ? `${describeSchedule(res.schedule)}. Tu recevras une notification à chaque bilan.` : 'Bilans non planifiés.',
        res.calendarError ? `Calendrier : ${res.calendarError}` : (res.schedule.enabled && res.schedule.addToCalendar && Platform.OS !== 'web' ? 'Événement ajouté à ton Calendrier.' : ''),
      ].filter(Boolean).join('\n'));
      navigation.goBack();
    } catch (e: any) {
      notify('Erreur', e?.message ?? String(e));
    } finally { setSaving(false); }
  };

  const updateQ = (id: string, patch: Partial<CheckinQuestion>) => setQs(list => list.map(q => q.id === id ? { ...q, ...patch } : q));
  const moveQ = (id: string, dir: -1 | 1) => setQs(list => {
    const i = list.findIndex(q => q.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return list;
    const copy = [...list]; [copy[i], copy[j]] = [copy[j], copy[i]]; return copy;
  });
  const removeQ = (id: string) => setQs(list => list.filter(q => q.id !== id));
  const addQ = () => {
    if (!newLabel.trim()) return;
    const q: CheckinQuestion = {
      id: 'c_' + uid(), label: newLabel.trim(), type: newType, active: true,
      ...(newType === 'scale' ? { min: 1, max: 5 } : {}),
      ...(newType === 'number' && newUnit.trim() ? { unit: newUnit.trim() } : {}),
    };
    setQs(list => [...list, q]);
    setNewLabel(''); setNewUnit('');
  };
  const reset = async () => {
    const go = async () => { await resetQuestions(); setQs(await getQuestions()); };
    if (Platform.OS === 'web') { if (window.confirm('Revenir au questionnaire générique ?')) go(); return; }
    Alert.alert('Questionnaire générique', 'Remplacer tes questions par le questionnaire par défaut ?', [
      { text: 'Annuler', style: 'cancel' }, { text: 'Remplacer', style: 'destructive', onPress: go },
    ]);
  };

  if (!s) return <SafeAreaView style={styles.safe} />;
  const next = s.enabled ? nextOccurrences(s, 3) : [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Réglages du bilan</Text>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={saveAll} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.saveText}>OK</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Planification */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>PLANIFICATION</Text>
            <Switch value={s.enabled} onValueChange={v => applySchedule({ ...s, enabled: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#FFFFFF" ios_backgroundColor={colors.border} />
          </View>

          <Text style={styles.sub}>Jour</Text>
          <View style={styles.daysRow}>
            {DAYS.map(d => (
              <TouchableOpacity key={d.v} style={[styles.day, s.weekday === d.v && styles.active]} onPress={() => applySchedule({ ...s, weekday: d.v })}>
                <Text style={[styles.dayText, s.weekday === d.v && styles.activeText]}>{d.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sub}>Heure</Text>
          <View style={styles.timeRow}>
            <Stepper value={s.hour} min={0} max={23} onChange={v => applySchedule({ ...s, hour: v })} suffix="h" />
            <Stepper value={s.minute} min={0} max={45} step={15} onChange={v => applySchedule({ ...s, minute: v })} suffix="min" />
          </View>

          <Text style={styles.sub}>Fréquence</Text>
          <View style={styles.daysRow}>
            {[1, 2].map(n => (
              <TouchableOpacity key={n} style={[styles.freq, s.everyWeeks === n && styles.active]} onPress={() => applySchedule({ ...s, everyWeeks: n as 1 | 2, startDate: localDateStr() })}>
                <Text style={[styles.dayText, s.everyWeeks === n && styles.activeText]}>{n === 1 ? 'Chaque semaine' : 'Toutes les 2 semaines'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toggle}>
            <Text style={styles.toggleText}>Relance le lendemain si le bilan n'est pas fait</Text>
            <Switch value={s.reminderNextDay} onValueChange={v => applySchedule({ ...s, reminderNextDay: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#FFFFFF" ios_backgroundColor={colors.border} />
          </View>
          <View style={styles.toggle}>
            <Text style={styles.toggleText}>Ajouter au Calendrier de l'iPhone</Text>
            <Switch value={s.addToCalendar} onValueChange={v => applySchedule({ ...s, addToCalendar: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#FFFFFF" ios_backgroundColor={colors.border} />
          </View>

          {s.enabled && (
            <Text style={styles.hint}>
              {describeSchedule(s)}. Prochains : {next.map(d => formatDate(localDateStr(d))).join(', ')}
            </Text>
          )}
        </View>

        {/* Questionnaire */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>QUESTIONNAIRE</Text>
            <TouchableOpacity onPress={reset}><Text style={styles.link}>Générique</Text></TouchableOpacity>
          </View>
          <Text style={styles.hint}>Active, renomme, réordonne ou ajoute tes propres questions. Les anciens bilans gardent leurs réponses.</Text>

          {qs.map((q, i) => (
            <View key={q.id} style={[styles.q, !q.active && { opacity: 0.45 }]}>
              <View style={styles.qTop}>
                <Switch value={q.active} onValueChange={v => updateQ(q.id, { active: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#FFFFFF" ios_backgroundColor={colors.border} />
                {editing === q.id ? (
                  <TextInput style={styles.qEdit} value={q.label} onChangeText={t => updateQ(q.id, { label: t })} autoFocus onBlur={() => setEditing(null)} />
                ) : (
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditing(q.id)}>
                    <Text style={styles.qLabel}>{q.label}</Text>
                    <Text style={styles.qType}>{TYPES.find(t => t.v === q.type)?.l}{q.unit ? ` · ${q.unit}` : ''}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => moveQ(q.id, -1)} disabled={i === 0}><Ionicons name="arrow-up" size={16} color={i === 0 ? colors.textMuted : colors.textSecondary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => moveQ(q.id, 1)} disabled={i === qs.length - 1}><Ionicons name="arrow-down" size={16} color={i === qs.length - 1 ? colors.textMuted : colors.textSecondary} /></TouchableOpacity>
                {!q.builtin && (
                  <TouchableOpacity onPress={() => removeQ(q.id)}><Ionicons name="trash-outline" size={16} color={colors.error} /></TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <View style={styles.add}>
            <Text style={styles.sub}>Nouvelle question</Text>
            <TextInput style={styles.input} value={newLabel} onChangeText={setNewLabel} placeholder="Ex. : Nombre de pas moyen ?" placeholderTextColor={colors.textMuted} />
            <View style={styles.daysRow}>
              {TYPES.map(t => (
                <TouchableOpacity key={t.v} style={[styles.typeBtn, newType === t.v && styles.active]} onPress={() => setNewType(t.v)}>
                  <Text style={[styles.dayText, newType === t.v && styles.activeText]}>{t.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {newType === 'number' && (
              <TextInput style={styles.input} value={newUnit} onChangeText={setNewUnit} placeholder="Unité (facultatif) : pas, h, %…" placeholderTextColor={colors.textMuted} />
            )}
            <TouchableOpacity style={[styles.addBtn, !newLabel.trim() && { opacity: 0.4 }]} onPress={addQ} disabled={!newLabel.trim()}>
              <Ionicons name="add" size={18} color={colors.onPrimary} />
              <Text style={styles.addText}>Ajouter la question</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ value, min, max, step = 1, onChange, suffix }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix: string }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value - step < min ? max : value - step)}><Ionicons name="remove" size={18} color={colors.text} /></TouchableOpacity>
      <Text style={styles.stepVal}>{String(value).padStart(2, '0')} {suffix}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value + step > max ? min : value + step)}><Ionicons name="add" size={18} color={colors.text} /></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.h3, color: colors.text, flex: 1, textAlign: 'center' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 8, minWidth: 56, alignItems: 'center' },
  saveText: { ...typography.bodyBold, color: colors.onPrimary },
  content: { padding: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...typography.label, color: colors.primaryLight },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, marginBottom: 6 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { flexGrow: 1, minWidth: 40, paddingVertical: 8, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  freq: { flexGrow: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  typeBtn: { flexGrow: 1, paddingVertical: 8, paddingHorizontal: 8, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { ...typography.caption, color: colors.textSecondary },
  activeText: { color: colors.onPrimary },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: borderRadius.md },
  stepBtn: { padding: 10 },
  stepVal: { ...typography.bodyBold, color: colors.text, flex: 1, textAlign: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  toggleText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  link: { ...typography.caption, color: colors.primaryLight },
  q: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  qTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qLabel: { ...typography.body, color: colors.text },
  qType: { ...typography.tiny, color: colors.textMuted },
  qEdit: { flex: 1, ...typography.body, color: colors.text, backgroundColor: colors.inputBg, borderRadius: borderRadius.sm, padding: 6 },
  add: { marginTop: spacing.sm },
  input: { ...typography.body, color: colors.text, backgroundColor: colors.inputBg, borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 12, marginTop: spacing.sm },
  addText: { ...typography.bodyBold, color: colors.onPrimary },
});
