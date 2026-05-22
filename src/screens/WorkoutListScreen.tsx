import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal, ScrollView, TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getWorkouts, deleteWorkout, getPrograms, deleteProgram, createProgramsFromTemplate } from '../storage';
import { formatDate } from '../utils/helpers';
import { Workout, WorkoutProgram, WorkoutStackParamList } from '../types';
import { MUSCLE_GROUP_COLORS } from '../data/exerciseDatabase';
import { PROGRAM_TEMPLATES, ProgramTemplate, ProgramVariant } from '../data/programTemplates';

type NavProp = NativeStackNavigationProp<WorkoutStackParamList, 'WorkoutList'>;

export default function WorkoutListScreen() {
  const navigation = useNavigation<NavProp>();
  const [tab, setTab] = useState<'sessions' | 'programs' | 'calc'>('sessions');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | null>(null);

  const load = useCallback(async () => {
    const [ws, ps] = await Promise.all([getWorkouts(), getPrograms()]);
    setWorkouts(ws);
    setPrograms(ps);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDeleteWorkout = useCallback((id: string, name: string) => {
    Alert.alert('Supprimer', `Supprimer "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteWorkout(id); load(); } },
    ]);
  }, [load]);

  const handleDeleteProgram = useCallback((id: string, name: string) => {
    Alert.alert('Supprimer', `Supprimer "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteProgram(id); load(); } },
    ]);
  }, [load]);

  const startFreeSession = useCallback(() => {
    setShowStartModal(false);
    navigation.navigate('WorkoutSession', {});
  }, [navigation]);

  const startProgramSession = useCallback((programId: string) => {
    setShowStartModal(false);
    navigation.navigate('WorkoutSession', { programId });
  }, [navigation]);

  const handleSelectTemplate = useCallback((template: ProgramTemplate) => {
    if (template.variants.length === 1) {
      // Pas de choix de fréquence → création directe
      Alert.alert(
        `Créer ${template.name}`,
        `${template.variants[0].sublabel} seront créées.\n\nTu pourras ajouter les exercices ensuite.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Créer', onPress: async () => {
              setShowTemplateModal(false);
              await createProgramsFromTemplate(template.variants[0].sessions);
              load();
            },
          },
        ]
      );
    } else {
      setSelectedTemplate(template);
    }
  }, [load]);

  const handleSelectVariant = useCallback(async (variant: ProgramVariant) => {
    setShowTemplateModal(false);
    setSelectedTemplate(null);
    await createProgramsFromTemplate(variant.sessions);
    load();
  }, [load]);

  const openTemplateModal = useCallback(() => {
    setSelectedTemplate(null);
    setShowTemplateModal(true);
  }, []);

  const renderSession = useCallback(({ item: w }: { item: Workout }) => (
    <WorkoutCard
      workout={w}
      onDelete={() => handleDeleteWorkout(w.id, w.name)}
      onViewHistory={name => navigation.navigate('ExerciseHistory', { exerciseName: name })}
    />
  ), [handleDeleteWorkout, navigation]);

  const renderProgram = useCallback(({ item: p }: { item: WorkoutProgram }) => (
    <ProgramCard
      program={p}
      onEdit={() => navigation.navigate('CreateProgram', { programId: p.id })}
      onDelete={() => handleDeleteProgram(p.id, p.name)}
      onStart={() => startProgramSession(p.id)}
    />
  ), [handleDeleteProgram, navigation, startProgramSession]);

  const addBtnPress = useCallback(() => {
    if (tab === 'sessions') setShowStartModal(true);
    else if (tab === 'programs') openTemplateModal();
  }, [tab, openTemplateModal]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Entraînements</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.calendarBtn} onPress={() => navigation.navigate('WeeklySchedule')}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          {tab !== 'calc' && (
            <TouchableOpacity style={styles.addBtn} onPress={addBtnPress}>
              <Ionicons name="add" size={22} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'sessions' && styles.tabBtnActive]} onPress={() => setTab('sessions')}>
          <Text style={[styles.tabBtnText, tab === 'sessions' && styles.tabBtnTextActive]}>Séances</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'programs' && styles.tabBtnActive]} onPress={() => setTab('programs')}>
          <Text style={[styles.tabBtnText, tab === 'programs' && styles.tabBtnTextActive]}>Programmes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'calc' && styles.tabBtnActive]} onPress={() => setTab('calc')}>
          <Text style={[styles.tabBtnText, tab === 'calc' && styles.tabBtnTextActive]}>1RM</Text>
        </TouchableOpacity>
      </View>

      {tab === 'sessions' ? (
        <FlatList
          data={workouts}
          renderItem={renderSession}
          keyExtractor={w => w.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Aucune séance</Text>
              <Text style={styles.emptySubtitle}>Lance ta première séance !</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowStartModal(true)}>
                <Text style={styles.emptyBtnText}>Commencer une séance</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      ) : tab === 'programs' ? (
        <FlatList
          data={programs}
          renderItem={renderProgram}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Aucun programme</Text>
              <Text style={styles.emptySubtitle}>Crée un programme depuis un modèle</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openTemplateModal}>
                <Text style={styles.emptyBtnText}>Choisir un modèle</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      ) : (
        <RMCalculator />
      )}

      {/* ── Start Session Modal ── */}
      <Modal visible={showStartModal} animationType="slide" transparent>
        <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={() => setShowStartModal(false)}>
          <View style={modalStyles.sheet} onStartShouldSetResponder={() => true}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Démarrer une séance</Text>
            <TouchableOpacity style={modalStyles.option} onPress={startFreeSession}>
              <View style={[modalStyles.optionIcon, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              </View>
              <View style={modalStyles.optionText}>
                <Text style={modalStyles.optionTitle}>Séance libre</Text>
                <Text style={modalStyles.optionSub}>Construis ta séance librement</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {programs.length > 0 && (
              <>
                <Text style={modalStyles.sectionLabel}>Depuis un programme</Text>
                {programs.map(p => (
                  <TouchableOpacity key={p.id} style={modalStyles.option} onPress={() => startProgramSession(p.id)}>
                    <View style={[modalStyles.optionIcon, { backgroundColor: colors.secondary + '22' }]}>
                      <Ionicons name="list" size={22} color={colors.secondary} />
                    </View>
                    <View style={modalStyles.optionText}>
                      <Text style={modalStyles.optionTitle}>{p.name}</Text>
                      <Text style={modalStyles.optionSub}>
                        {p.exercises.length} exercice{p.exercises.length !== 1 ? 's' : ''} · {p.exercises.reduce((a, e) => a + e.sets.length, 0)} séries
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </>
            )}
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setShowStartModal(false)}>
              <Text style={modalStyles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Template Picker Modal ── */}
      <Modal visible={showTemplateModal} animationType="slide" transparent>
        <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={() => { setShowTemplateModal(false); setSelectedTemplate(null); }}>
          <View style={[modalStyles.sheet, { maxHeight: '85%' }]} onStartShouldSetResponder={() => true}>
            <View style={modalStyles.handle} />

            {selectedTemplate === null ? (
              /* Step 1 — Choix du type de programme */
              <>
                <Text style={modalStyles.title}>Choisir un modèle</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={tplStyles.grid}>
                    {PROGRAM_TEMPLATES.map(t => (
                      <TouchableOpacity key={t.id} style={tplStyles.card} onPress={() => handleSelectTemplate(t)} activeOpacity={0.8}>
                        <View style={[tplStyles.iconBox, { backgroundColor: t.color + '22' }]}>
                          <Ionicons name={t.icon as any} size={28} color={t.color} />
                        </View>
                        <Text style={tplStyles.cardName}>{t.name}</Text>
                        <Text style={tplStyles.cardDesc}>{t.description}</Text>
                        {t.variants.length > 1 && (
                          <View style={tplStyles.badge}>
                            <Text style={tplStyles.badgeText}>{t.variants.length} fréquences</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={tplStyles.manualBtn}
                    onPress={() => { setShowTemplateModal(false); navigation.navigate('CreateProgram', {}); }}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    <Text style={tplStyles.manualBtnText}>Créer manuellement</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : (
              /* Step 2 — Choix de la fréquence */
              <>
                <TouchableOpacity style={tplStyles.backBtn} onPress={() => setSelectedTemplate(null)}>
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                  <Text style={tplStyles.backBtnText}>{selectedTemplate.name}</Text>
                </TouchableOpacity>
                <Text style={[modalStyles.title, { marginTop: spacing.sm }]}>Choisir la fréquence</Text>
                {selectedTemplate.variants.map(v => (
                  <TouchableOpacity key={v.id} style={modalStyles.option} onPress={() => handleSelectVariant(v)}>
                    <View style={[modalStyles.optionIcon, { backgroundColor: selectedTemplate.color + '22' }]}>
                      <Ionicons name={selectedTemplate.icon as any} size={22} color={selectedTemplate.color} />
                    </View>
                    <View style={modalStyles.optionText}>
                      <Text style={modalStyles.optionTitle}>{v.label}</Text>
                      <Text style={modalStyles.optionSub}>{v.sublabel}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            <TouchableOpacity style={[modalStyles.cancelBtn, { marginTop: spacing.sm }]} onPress={() => { setShowTemplateModal(false); setSelectedTemplate(null); }}>
              <Text style={modalStyles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Workout Card ─────────────────────────────────────────────────────────────

function WorkoutCard({ workout, onDelete, onViewHistory }: {
  workout: Workout;
  onDelete: () => void;
  onViewHistory: (name: string) => void;
}) {
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = workout.exercises.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0);

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.colorBar} />
      <View style={cardStyles.body}>
        <View style={cardStyles.top}>
          <Text style={cardStyles.name}>{workout.name}</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={17} color={colors.error} />
          </TouchableOpacity>
        </View>
        <Text style={cardStyles.date}>{formatDate(workout.date.split('T')[0])}</Text>
        <View style={cardStyles.chips}>
          <Chip icon="fitness-outline" label={`${workout.exercises.length} exo`} />
          <Chip icon="checkmark-circle-outline" label={`${doneSets}/${totalSets} séries`} />
        </View>
        {workout.exercises.length > 0 && (
          <View style={cardStyles.exList}>
            {workout.exercises.slice(0, 4).map(e => (
              <TouchableOpacity key={e.id} style={cardStyles.exRow} onPress={() => onViewHistory(e.name)}>
                <View style={[cardStyles.exDot, { backgroundColor: MUSCLE_GROUP_COLORS[e.muscleGroup ?? ''] ?? colors.primary }]} />
                <Text style={cardStyles.exName} numberOfLines={1}>{e.name}</Text>
                <Text style={cardStyles.exSets}>{e.sets.length} × {e.sets[0]?.reps || '—'}</Text>
                <Ionicons name="stats-chart-outline" size={12} color={colors.primary} />
              </TouchableOpacity>
            ))}
            {workout.exercises.length > 4 && (
              <Text style={cardStyles.exMore}>+{workout.exercises.length - 4} autres exercices</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={cardStyles.chip}>
      <Ionicons name={icon as any} size={12} color={colors.textSecondary} />
      <Text style={cardStyles.chipText}>{label}</Text>
    </View>
  );
}

// ─── Program Card ─────────────────────────────────────────────────────────────

function ProgramCard({ program, onEdit, onDelete, onStart }: {
  program: WorkoutProgram;
  onEdit: () => void;
  onDelete: () => void;
  onStart: () => void;
}) {
  return (
    <View style={progStyles.card}>
      <View style={progStyles.colorBar} />
      <View style={progStyles.body}>
        <View style={progStyles.top}>
          <Text style={progStyles.name}>{program.name}</Text>
          <View style={progStyles.actions}>
            <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil-outline" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={17} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={progStyles.subtitle}>
          {program.exercises.length} exercice{program.exercises.length !== 1 ? 's' : ''} · {program.exercises.reduce((a, e) => a + e.sets.length, 0)} séries
        </Text>
        <View style={progStyles.exList}>
          {program.exercises.slice(0, 4).map(e => {
            const c = MUSCLE_GROUP_COLORS[e.muscleGroup ?? ''] ?? colors.primary;
            return (
              <View key={e.id} style={progStyles.exRow}>
                <View style={[progStyles.exDot, { backgroundColor: c }]} />
                <Text style={progStyles.exName} numberOfLines={1}>{e.name}</Text>
                <Text style={progStyles.exDetail}>{e.sets.length} série{e.sets.length !== 1 ? 's' : ''}</Text>
              </View>
            );
          })}
          {program.exercises.length > 4 && (
            <Text style={progStyles.exMore}>+{program.exercises.length - 4} autres</Text>
          )}
        </View>
        <TouchableOpacity style={progStyles.startBtn} onPress={onStart}>
          <Ionicons name="play" size={15} color={colors.text} />
          <Text style={progStyles.startBtnText}>Démarrer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const tplStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  card: {
    width: '47%', backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  iconBox: { width: 48, height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  cardName: { ...typography.bodyBold, color: colors.text, marginBottom: 2 },
  cardDesc: { ...typography.tiny, color: colors.textMuted, lineHeight: 16 },
  badge: {
    marginTop: spacing.sm, backgroundColor: colors.primary + '22',
    borderRadius: borderRadius.round, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  badgeText: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
  manualBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
  },
  manualBtnText: { ...typography.label, color: colors.textSecondary },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  backBtnText: { ...typography.bodyBold, color: colors.text },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingBottom: 32,
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  title: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  sectionLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder,
  },
  optionIcon: { width: 44, height: 44, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  optionText: { flex: 1 },
  optionTitle: { ...typography.bodyBold, color: colors.text },
  optionSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  cancelBtn: {
    backgroundColor: colors.card, borderRadius: borderRadius.round,
    padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { ...typography.bodyBold, color: colors.textSecondary },
});

const progStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    marginBottom: spacing.sm, flexDirection: 'row',
    overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  colorBar: { width: 4, backgroundColor: colors.secondary },
  body: { flex: 1, padding: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyBold, color: colors.text, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.md },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  exList: { marginBottom: spacing.md },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  exDot: { width: 6, height: 6, borderRadius: 3 },
  exName: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  exDetail: { ...typography.caption, color: colors.textMuted },
  exMore: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: borderRadius.round, paddingVertical: spacing.sm,
  },
  startBtnText: { ...typography.bodyBold, color: colors.text },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    marginBottom: spacing.sm, flexDirection: 'row',
    overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  colorBar: { width: 4, backgroundColor: colors.primary },
  body: { flex: 1, padding: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyBold, color: colors.text, flex: 1 },
  date: { ...typography.caption, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.surface, paddingHorizontal: spacing.sm,
    paddingVertical: 3, borderRadius: borderRadius.round,
  },
  chipText: { ...typography.tiny, color: colors.textSecondary },
  exList: {},
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  exDot: { width: 6, height: 6, borderRadius: 3 },
  exName: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  exSets: { ...typography.caption, color: colors.textMuted },
  exMore: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
});

// ─── 1RM Calculator ───────────────────────────────────────────────────────────

type Formula = 'brzycki' | 'epley';

// Brzycki est fiable uniquement jusqu'à 10 reps — au-delà le dénominateur (37-r) devient trop petit
function effectiveFormula(f: Formula, r: number): Formula {
  return f === 'brzycki' && r > 10 ? 'epley' : f;
}

function oneRM(w: number, r: number, f: Formula): number {
  if (r === 1) return w;
  const ef = effectiveFormula(f, r);
  if (ef === 'epley') return w * (1 + r / 30);
  return w * 36 / (37 - r); // Brzycki (r ≤ 10)
}

function pctAt(reps: number, f: Formula): number {
  const ef = effectiveFormula(f, reps);
  if (ef === 'epley') return 1 / (1 + reps / 30);
  return (37 - reps) / 36; // Brzycki (reps ≤ 10)
}

function RMCalculator() {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [formula, setFormula] = useState<Formula>('brzycki');

  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  const valid = !isNaN(w) && w > 0 && !isNaN(r) && r >= 1 && r <= 20;
  const max = valid ? oneRM(w, r, formula) : null;

  return (
    <ScrollView contentContainerStyle={calcStyles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Inputs */}
      <View style={calcStyles.inputRow}>
        <View style={calcStyles.inputGroup}>
          <Text style={calcStyles.inputLabel}>POIDS (kg)</Text>
          <TextInput
            style={calcStyles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="80"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={calcStyles.inputGroup}>
          <Text style={calcStyles.inputLabel}>RÉPÉTITIONS</Text>
          <View style={calcStyles.stepper}>
            <TouchableOpacity
              style={calcStyles.stepBtn}
              onPress={() => setReps(v => String(Math.max(1, parseInt(v || '1', 10) - 1)))}
            >
              <Ionicons name="remove" size={22} color={colors.primary} />
            </TouchableOpacity>
            <Text style={calcStyles.stepValue}>{reps || '—'}</Text>
            <TouchableOpacity
              style={calcStyles.stepBtn}
              onPress={() => setReps(v => String(Math.min(20, parseInt(v || '0', 10) + 1)))}
            >
              <Ionicons name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Formula selector */}
      <View style={calcStyles.formulaRow}>
        <Text style={calcStyles.formulaLabel}>Formule</Text>
        {(['brzycki', 'epley'] as Formula[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[calcStyles.fChip, formula === f && calcStyles.fChipActive]}
            onPress={() => setFormula(f)}
          >
            <Text style={[calcStyles.fChipText, formula === f && calcStyles.fChipTextActive]}>
              {f === 'brzycki' ? 'Brzycki' : 'Epley'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 1RM result card */}
      <View style={calcStyles.resultCard}>
        <Text style={calcStyles.resultLabel}>1RM ESTIMÉ</Text>
        <Text style={calcStyles.resultValue}>
          {max !== null ? `${(Math.round(max * 10) / 10).toFixed(1)} kg` : '—'}
        </Text>
        {valid && (
          <>
            <Text style={calcStyles.resultSub}>
              {w} kg × {r} rép{r > 1 ? 's' : ''} · {effectiveFormula(formula, r) === 'brzycki' ? 'Brzycki' : 'Epley'}
            </Text>
            {formula === 'brzycki' && r > 10 && (
              <Text style={calcStyles.resultWarn}>
                ⚠️ Brzycki invalide au-delà de 10 reps — Epley utilisé
              </Text>
            )}
          </>
        )}
      </View>

      {/* Table reps 1-12 */}
      {max !== null && (
        <View style={calcStyles.table}>
          <View style={calcStyles.tableHead}>
            <Text style={[calcStyles.thText, { flex: 1 }]}>Reps</Text>
            <Text style={[calcStyles.thText, { flex: 1.2, textAlign: 'center' }]}>% 1RM</Text>
            <Text style={[calcStyles.thText, { flex: 2, textAlign: 'right' }]}>Poids estimé</Text>
          </View>
          {Array.from({ length: 12 }, (_, i) => {
            const rep = i + 1;
            const pct = pctAt(rep, formula);
            const est = Math.round(max * pct * 4) / 4; // arrondi au 0.25 kg
            const active = rep === r;
            return (
              <View key={rep} style={[calcStyles.tableRow, active && calcStyles.tableRowActive]}>
                <Text style={[calcStyles.tdText, { flex: 1 }, active && calcStyles.tdActive]}>{rep}</Text>
                <Text style={[calcStyles.tdText, { flex: 1.2, textAlign: 'center' }, active && calcStyles.tdActive]}>
                  {Math.round(pct * 100)}%
                </Text>
                <Text style={[calcStyles.tdText, { flex: 2, textAlign: 'right' }, active && calcStyles.tdActive]}>
                  {est.toFixed(2).replace(/\.?0+$/, '')} kg
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const calcStyles = StyleSheet.create({
  container: { padding: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  inputGroup: { flex: 1, gap: spacing.xs },
  inputLabel: { ...typography.tiny, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  input: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 28, fontWeight: '700' as const, color: colors.text, textAlign: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  formulaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  formulaLabel: { ...typography.caption, color: colors.textMuted, marginRight: 4 },
  fChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.round,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  fChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  fChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  fChipTextActive: { color: colors.text },
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
  },
  stepBtn: {
    width: 40, height: 40, borderRadius: borderRadius.round,
    backgroundColor: colors.primary + '22', justifyContent: 'center', alignItems: 'center',
  },
  stepValue: {
    fontSize: 28, fontWeight: '700' as const, color: colors.text, minWidth: 40, textAlign: 'center',
  },
  resultCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.xl,
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.cardBorder, ...shadows.md,
  },
  resultLabel: { ...typography.tiny, color: colors.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
  resultValue: { fontSize: 52, fontWeight: '800' as const, color: colors.primary, letterSpacing: -1 },
  resultSub: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  resultWarn: { ...typography.caption, color: colors.warning, marginTop: spacing.xs, textAlign: 'center' },
  table: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder,
  },
  tableHead: {
    flexDirection: 'row', backgroundColor: colors.surface,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  thText: { ...typography.tiny, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border + '55',
  },
  tableRowActive: { backgroundColor: colors.primary + '18' },
  tdText: { ...typography.body, color: colors.text },
  tdActive: { color: colors.primary, fontWeight: '700' as const },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { ...typography.h1, color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  calendarBtn: {
    width: 40, height: 40, borderRadius: borderRadius.round,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    backgroundColor: colors.primary, width: 40, height: 40,
    borderRadius: borderRadius.round, justifyContent: 'center', alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.round, padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.round, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { ...typography.bodyBold, color: colors.textSecondary },
  tabBtnTextActive: { color: colors.text },
  content: { paddingHorizontal: spacing.md },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptySubtitle: { ...typography.body, color: colors.textMuted },
  emptyBtn: {
    marginTop: spacing.sm, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.round,
  },
  emptyBtnText: { ...typography.bodyBold, color: colors.text },
});
