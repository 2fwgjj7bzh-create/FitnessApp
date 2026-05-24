import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform, Modal, FlatList, Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getPrograms, saveProgram } from '../storage';
import { uid } from '../utils/helpers';
import { ProgramExercise, ProgramSet, WorkoutProgram, WorkoutStackParamList } from '../types';
import { EXERCISE_DATABASE, MUSCLE_GROUPS, MUSCLE_GROUP_COLORS, EQUIPMENT_LIST, EQUIPMENT_ICONS, EQUIPMENT_COLORS, Equipment } from '../data/exerciseDatabase';

type NavProp = NativeStackNavigationProp<WorkoutStackParamList, 'CreateProgram'>;
type RoutePropType = RouteProp<WorkoutStackParamList, 'CreateProgram'>;

const REST_OPTIONS = [30, 60, 90, 120, 180, 240, 300];

function formatRest(sec?: number) {
  if (!sec) return null;
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}min` : `${m}min${s}s`;
}

export default function CreateProgramScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const editId = route.params?.programId;

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerGroup, setPickerGroup] = useState('Tous');
  const [pickerEquipment, setPickerEquipment] = useState<Equipment | 'Tous'>('Tous');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (editId) {
      getPrograms().then(list => {
        const prog = list.find(p => p.id === editId);
        if (prog) { setName(prog.name); setExercises(prog.exercises); }
      });
    }
  }, [editId]);

  const addExercise = (exName: string, muscleGroup?: string) => {
    const ex: ProgramExercise = {
      id: uid(), name: exName, muscleGroup,
      sets: [
        { id: uid(), repsRange: '8-12' },
        { id: uid(), repsRange: '8-12' },
        { id: uid(), repsRange: '8-12' },
      ],
      targetWeight: 0, restSeconds: 90, videoUrl: '',
    };
    setExercises(prev => [...prev, ex]);
    setExpandedId(ex.id);
    setShowPicker(false);
    setPickerSearch('');
    setPickerGroup('Tous');
  };

  const removeExercise = (id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateExercise = (id: string, patch: Partial<ProgramExercise>) => {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const addSet = (exId: string) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      const last = e.sets[e.sets.length - 1];
      return { ...e, sets: [...e.sets, { id: uid(), repsRange: last?.repsRange ?? '8-12', targetWeight: last?.targetWeight }] };
    }));
  };

  const removeSet = (exId: string, setId: string) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId || e.sets.length <= 1) return e;
      return { ...e, sets: e.sets.filter(s => s.id !== setId) };
    }));
  };

  const updateSet = (exId: string, setId: string, repsRange: string) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      return { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, repsRange } : s) };
    }));
  };

  const updateSetWeight = (exId: string, setId: string, weight: number | undefined) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      return { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, targetWeight: weight } : s) };
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Nom requis', 'Donne un nom à ton programme.'); return; }
    if (exercises.length === 0) { Alert.alert('Programme vide', 'Ajoute au moins un exercice.'); return; }
    const now = new Date().toISOString();
    const prog: WorkoutProgram = {
      id: editId ?? uid(), name: name.trim(),
      exercises, createdAt: now, updatedAt: now,
    };
    await saveProgram(prog);
    navigation.goBack();
  };

  const filtered = EXERCISE_DATABASE.filter(e => {
    const matchGroup = pickerGroup === 'Tous' || e.muscleGroup === pickerGroup;
    const matchEquip = pickerEquipment === 'Tous' || e.equipment === pickerEquipment;
    const matchSearch = !pickerSearch || e.name.toLowerCase().includes(pickerSearch.toLowerCase());
    return matchGroup && matchEquip && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editId ? 'Modifier le programme' : 'Nouveau programme'}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Nom du programme..."
            placeholderTextColor={colors.textMuted}
          />

          {exercises.map((ex, idx) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              index={idx}
              expanded={expandedId === ex.id}
              onToggle={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
              onRemove={() => removeExercise(ex.id)}
              onUpdate={patch => updateExercise(ex.id, patch)}
              onAddSet={() => addSet(ex.id)}
              onRemoveSet={sid => removeSet(ex.id, sid)}
              onUpdateSet={(sid, reps) => updateSet(ex.id, sid, reps)}
              onUpdateSetWeight={(sid, w) => updateSetWeight(ex.id, sid, w)}
            />
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addBtnText}>Ajouter un exercice</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exercise Picker */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.sheet}>
            <View style={pickerStyles.handle} />
            <Text style={pickerStyles.title}>Choisir un exercice</Text>
            <TextInput
              style={pickerStyles.search}
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder="Rechercher..."
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pickerStyles.groupScroll}>
              {MUSCLE_GROUPS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[pickerStyles.groupChip, pickerGroup === g && pickerStyles.groupChipActive]}
                  onPress={() => setPickerGroup(g)}
                >
                  <Text style={[pickerStyles.groupChipText, pickerGroup === g && pickerStyles.groupChipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pickerStyles.groupScroll}>
              {(['Tous', ...EQUIPMENT_LIST] as const).map(eq => {
                const active = pickerEquipment === eq;
                const color = eq === 'Tous' ? colors.primary : EQUIPMENT_COLORS[eq as Equipment];
                return (
                  <TouchableOpacity
                    key={eq}
                    style={[pickerStyles.equipChip, active && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setPickerEquipment(eq as Equipment | 'Tous')}
                  >
                    {eq !== 'Tous' && (
                      <Ionicons name={EQUIPMENT_ICONS[eq as Equipment] as any} size={12} color={active ? '#fff' : color} />
                    )}
                    <Text style={[pickerStyles.equipChipText, active && { color: '#fff' }, !active && eq !== 'Tous' && { color }]}>
                      {eq}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <FlatList
              data={filtered}
              keyExtractor={(item, i) => `${item.name}-${i}`}
              style={{ flex: 1 }}
              ListHeaderComponent={
                pickerSearch.length > 0 && !EXERCISE_DATABASE.some(e => e.name.toLowerCase() === pickerSearch.toLowerCase()) ? (
                  <TouchableOpacity style={pickerStyles.item} onPress={() => addExercise(pickerSearch)}>
                    <View style={pickerStyles.itemLeft}>
                      <Ionicons name="add-circle" size={18} color={colors.primary} />
                      <Text style={[pickerStyles.itemName, { color: colors.primary }]}>Créer "{pickerSearch}"</Text>
                    </View>
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={pickerStyles.item} onPress={() => addExercise(item.name, item.muscleGroup)}>
                  <View style={pickerStyles.itemLeft}>
                    <Text style={pickerStyles.itemName}>{item.name}</Text>
                  </View>
                  <View style={[pickerStyles.groupTag, { backgroundColor: (MUSCLE_GROUP_COLORS[item.muscleGroup] ?? colors.primary) + '33' }]}>
                    <Text style={[pickerStyles.groupTagText, { color: MUSCLE_GROUP_COLORS[item.muscleGroup] ?? colors.primary }]}>
                      {item.muscleGroup}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListFooterComponent={<View style={{ height: 20 }} />}
            />
            <TouchableOpacity style={pickerStyles.closeBtn} onPress={() => setShowPicker(false)}>
              <Text style={pickerStyles.closeBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

interface ExerciseRowProps {
  exercise: ProgramExercise;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<ProgramExercise>) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, repsRange: string) => void;
  onUpdateSetWeight: (setId: string, weight: number | undefined) => void;
}

function ExerciseRow({ exercise, index, expanded, onToggle, onRemove, onUpdate, onAddSet, onRemoveSet, onUpdateSet, onUpdateSetWeight }: ExerciseRowProps) {
  const [showRestPicker, setShowRestPicker] = useState(false);
  const tagColor = MUSCLE_GROUP_COLORS[exercise.muscleGroup ?? ''] ?? colors.primary;
  const hasVideo = !!exercise.videoUrl?.trim();

  const openVideo = () => {
    const url = exercise.videoUrl?.trim();
    if (url) Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien.'));
  };

  const uniqueRanges = [...new Set(exercise.sets.map(s => s.repsRange).filter(Boolean))];
  const summary = `${exercise.sets.length} série${exercise.sets.length > 1 ? 's' : ''} · ${uniqueRanges.join(', ')} reps`;

  return (
    <View style={rowStyles.card}>
      <TouchableOpacity style={rowStyles.header} onPress={onToggle} activeOpacity={0.8}>
        <View style={rowStyles.badge}>
          <Text style={rowStyles.badgeText}>{index + 1}</Text>
        </View>
        <View style={rowStyles.headerMid}>
          <Text style={rowStyles.name} numberOfLines={1}>{exercise.name}</Text>
          <View style={rowStyles.headerMeta}>
            {exercise.muscleGroup && (
              <View style={[rowStyles.muscleTag, { backgroundColor: tagColor + '22' }]}>
                <Text style={[rowStyles.muscleTagText, { color: tagColor }]}>{exercise.muscleGroup}</Text>
              </View>
            )}
            <Text style={rowStyles.summary}>{summary}</Text>
          </View>
        </View>
        <View style={rowStyles.headerRight}>
          {hasVideo && (
            <TouchableOpacity onPress={openVideo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="videocam" size={18} color={colors.info} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={17} color={colors.error} />
          </TouchableOpacity>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={rowStyles.details}>

          {/* ── Séries avec cible individuelle ─── */}
          <Text style={rowStyles.sectionLabel}>SÉRIES &amp; REPS CIBLES</Text>
          <Text style={rowStyles.hint}>Personnalise chaque série indépendamment (top set, back off…)</Text>

          {exercise.sets.map((s, si) => (
            <View key={s.id} style={rowStyles.setRow}>
              <View style={rowStyles.setNumBadge}>
                <Text style={rowStyles.setNumText}>{si + 1}</Text>
              </View>
              <TextInput
                style={rowStyles.repsInput}
                value={s.repsRange}
                onChangeText={v => onUpdateSet(s.id, v)}
                placeholder="8-12"
                placeholderTextColor={colors.textMuted}
                keyboardType="default"
              />
              <Text style={rowStyles.repsLabel}>reps</Text>
              <TextInput
                style={[rowStyles.repsInput, { flex: 0.8 }]}
                value={s.targetWeight && s.targetWeight > 0 ? String(s.targetWeight) : ''}
                onChangeText={v => { const n = parseFloat(v); onUpdateSetWeight(s.id, isNaN(n) ? undefined : n); }}
                placeholder="kg"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
              {exercise.sets.length > 1 && (
                <TouchableOpacity onPress={() => onRemoveSet(s.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="remove-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={rowStyles.addSetBtn} onPress={onAddSet}>
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
            <Text style={rowStyles.addSetText}>Ajouter une série</Text>
          </TouchableOpacity>

          {/* ── Poids de départ ─── */}
          <View style={rowStyles.weightSection}>
            <Text style={rowStyles.sectionLabel}>POIDS DE DÉPART (kg)</Text>
            <TextInput
              style={rowStyles.weightInput}
              value={exercise.targetWeight && exercise.targetWeight > 0 ? String(exercise.targetWeight) : ''}
              onChangeText={v => { const n = parseFloat(v); onUpdate({ targetWeight: isNaN(n) ? 0 : n }); }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* ── Repos ─── */}
          <View style={rowStyles.restSection}>
            <Text style={rowStyles.sectionLabel}>TEMPS DE REPOS</Text>
            <TouchableOpacity style={rowStyles.restBtn} onPress={() => setShowRestPicker(v => !v)}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={rowStyles.restBtnText}>{exercise.restSeconds ? formatRest(exercise.restSeconds) : 'Choisir'}</Text>
              <Ionicons name={showRestPicker ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {showRestPicker && (
            <View style={rowStyles.restOptions}>
              {REST_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[rowStyles.restOption, exercise.restSeconds === s && rowStyles.restOptionActive]}
                  onPress={() => { onUpdate({ restSeconds: s }); setShowRestPicker(false); }}
                >
                  <Text style={[rowStyles.restOptionText, exercise.restSeconds === s && rowStyles.restOptionTextActive]}>
                    {formatRest(s)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Vidéo ─── */}
          <View style={rowStyles.videoRow}>
            <Ionicons name="videocam-outline" size={15} color={colors.textSecondary} />
            <TextInput
              style={rowStyles.videoInput}
              value={exercise.videoUrl ?? ''}
              onChangeText={v => onUpdate({ videoUrl: v })}
              placeholder="URL vidéo explicative (YouTube, etc.)"
              placeholderTextColor={colors.textMuted}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {hasVideo && (
              <TouchableOpacity onPress={openVideo}>
                <Ionicons name="open-outline" size={17} color={colors.info} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Notes ─── */}
          <TextInput
            style={rowStyles.notesInput}
            value={exercise.notes ?? ''}
            onChangeText={v => onUpdate({ notes: v })}
            placeholder="Notes, consignes, tempo..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const rowStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    ...shadows.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  badge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  headerMid: { flex: 1, gap: 4 },
  name: { ...typography.bodyBold, color: colors.text },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  muscleTag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.round },
  muscleTagText: { ...typography.tiny, fontWeight: '600' },
  summary: { ...typography.caption, color: colors.textSecondary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  details: {
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: spacing.sm, paddingTop: spacing.md,
  },
  sectionLabel: { ...typography.tiny, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  hint: { ...typography.tiny, color: colors.textMuted, fontStyle: 'italic', marginTop: -4 },
  // Per-set rows
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setNumBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  setNumText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  repsInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.bodyBold,
    color: colors.text,
    textAlign: 'center',
  },
  repsLabel: { ...typography.caption, color: colors.textMuted, width: 28 },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  addSetText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  // Weight
  weightSection: { gap: 6 },
  weightInput: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    ...typography.body, color: colors.text, textAlign: 'center',
  },
  // Rest
  restSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  restBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.inputBg, borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  restBtnText: { ...typography.caption, color: colors.textSecondary },
  restOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  restOption: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  restOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  restOptionText: { ...typography.caption, color: colors.textSecondary },
  restOptionTextActive: { color: colors.text, fontWeight: '600' },
  // Video
  videoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.inputBg, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  videoInput: { flex: 1, ...typography.caption, color: colors.text, paddingVertical: 8 },
  // Notes
  notesInput: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 10,
    ...typography.caption, color: colors.text, minHeight: 48, textAlignVertical: 'top',
  },
});

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg, height: '85%',
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  search: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    ...typography.body, color: colors.text, marginBottom: spacing.sm,
  },
  groupScroll: { marginBottom: spacing.sm },
  groupChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.round, backgroundColor: colors.card,
    marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  groupChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  groupChipTextActive: { color: colors.text },
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  itemName: { ...typography.body, color: colors.text },
  groupTag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.round },
  groupTagText: { ...typography.tiny, fontWeight: '600' },
  closeBtn: {
    backgroundColor: colors.card, borderRadius: borderRadius.round,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  closeBtnText: { ...typography.bodyBold, color: colors.textSecondary },
  equipChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.round, backgroundColor: colors.card,
    marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  equipChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h3, color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    paddingVertical: 8, borderRadius: borderRadius.round,
  },
  saveBtnText: { ...typography.bodyBold, color: colors.text },
  content: { padding: spacing.md },
  nameInput: {
    ...typography.h2, color: colors.text,
    borderBottomWidth: 2, borderBottomColor: colors.primary,
    paddingBottom: spacing.sm, marginBottom: spacing.lg,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 2, borderColor: colors.primary,
    borderRadius: borderRadius.lg, borderStyle: 'dashed',
    padding: spacing.md, justifyContent: 'center', marginVertical: spacing.md,
  },
  addBtnText: { ...typography.bodyBold, color: colors.primary },
});
