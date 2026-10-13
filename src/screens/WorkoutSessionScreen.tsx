import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform, Modal, FlatList, Linking, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useKeepAwake } from 'expo-keep-awake';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getPrograms, getWorkouts, saveProgram, getDraftSession, saveDraftSession, clearDraftSession, getUserExercises, saveUserExercise } from '../storage';
import { syncWorkout } from '../lib/workoutSync';
import { DEFAULT_REST_SECONDS, scheduleRestEnd, cancelRestEnd, restEndFeedback, lightTap, formatClock } from '../lib/restTimer';
import { uid, formatDateLong } from '../utils/helpers';
import { Exercise, ExerciseSet, Workout, WorkoutStackParamList, ProgramExercise, UserExercise } from '../types';
import { EXERCISE_GUIDE } from '../data/exerciseGuide';
import { EXERCISE_DATABASE, MUSCLE_GROUPS, MUSCLE_GROUP_COLORS, EQUIPMENT_LIST, EQUIPMENT_ICONS, EQUIPMENT_COLORS, Equipment, ExerciseTemplate } from '../data/exerciseDatabase';

type PickerItem = ExerciseTemplate & { photoUri?: string };

type NavProp = NativeStackNavigationProp<WorkoutStackParamList, 'WorkoutSession'>;
type RoutePropType = RouteProp<WorkoutStackParamList, 'WorkoutSession'>;

const REST_OPTIONS = [30, 60, 90, 120, 180, 240, 300];

function formatRest(sec?: number) {
  if (!sec) return null;
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}min` : `${m}min${s}s`;
}

export default function WorkoutSessionScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();

  const [workoutName, setWorkoutName] = useState('Séance du jour');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [notes, setNotes] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerGroup, setPickerGroup] = useState('Tous');
  const [pickerEquipment, setPickerEquipment] = useState<Equipment | 'Tous'>('Tous');
  const [showLogbook, setShowLogbook] = useState(false);
  const [pastSessions, setPastSessions] = useState<Workout[]>([]);
  const [currentProgramId, setCurrentProgramId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionPRs, setSessionPRs] = useState<string[]>([]);
  const [userExercises, setUserExercises] = useState<UserExercise[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInitialName, setCreateInitialName] = useState('');
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [startedAt, setStartedAt] = useState<string>(() => new Date().toISOString());
  const [now, setNow] = useState(Date.now());
  const [rest, setRest] = useState<{ end: number; total: number; notifId: string | null; exName?: string } | null>(null);
  const [ready, setReady] = useState(false);       // brouillon auto activé une fois la reprise décidée
  const finishedRef = useRef(false);

  // L'écran reste allumé pendant toute la séance
  useKeepAwake();

  // Horloge : durée de séance + décompte du repos
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // Fin du repos (appli ouverte) → vibration
  useEffect(() => {
    if (rest && now >= rest.end) {
      restEndFeedback();
      setRest(null);
    }
  }, [now, rest]);

  const startRest = useCallback(async (seconds: number, exName?: string) => {
    setRest(prev => { if (prev) cancelRestEnd(prev.notifId); return null; });
    const end = Date.now() + seconds * 1000;
    setRest({ end, total: seconds, notifId: null, exName });
    const notifId = await scheduleRestEnd(seconds, exName);
    setRest(prev => (prev && prev.end === end ? { ...prev, notifId } : (cancelRestEnd(notifId), prev)));
  }, []);

  const adjustRest = useCallback(async (delta: number) => {
    if (!rest) return;
    await cancelRestEnd(rest.notifId);
    const remaining = Math.max(0, (rest.end - Date.now()) / 1000) + delta;
    if (remaining <= 0) { setRest(null); return; }
    const end = Date.now() + remaining * 1000;
    setRest({ ...rest, end, total: Math.max(rest.total + delta, remaining), notifId: null });
    const notifId = await scheduleRestEnd(remaining, rest.exName);
    setRest(prev => (prev && prev.end === end ? { ...prev, notifId } : (cancelRestEnd(notifId), prev)));
  }, [rest]);

  const skipRest = useCallback(() => {
    setRest(prev => { if (prev) cancelRestEnd(prev.notifId); return null; });
  }, []);

  // Brouillon enregistré en continu : rien n'est perdu si l'appli se ferme en pleine séance
  useEffect(() => {
    if (!ready || finishedRef.current || exercises.length === 0) return;
    const t = setTimeout(() => {
      if (finishedRef.current) return;
      saveDraftSession({ workoutName, exercises, notes, programId: currentProgramId, startedAt, savedAt: new Date().toISOString() })
        .catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [ready, workoutName, exercises, notes, currentProgramId, startedAt]);

  const loadProgramHistory = useCallback((pid: string, workouts: Workout[]) => {
    setCurrentProgramId(pid);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 84);
    setPastSessions(
      workouts
        .filter(w => w.programId === pid && new Date(w.date) >= cutoff)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  }, []);

  const loadProgram = useCallback(async (pid: string) => {
    const [list, allWorkouts] = await Promise.all([getPrograms(), getWorkouts()]);
    const prog = list.find(p => p.id === pid);
    if (prog) {
      setWorkoutName(prog.name);
      setCurrentProgramId(pid);
      setExercises(
        prog.exercises.map(pe => ({
          id: uid(),
          name: pe.name,
          muscleGroup: pe.muscleGroup,
          videoUrl: pe.videoUrl,
          restSeconds: pe.restSeconds,
          sets: pe.sets.map(ps => ({
            id: uid(),
            reps: 0,
            weight: ps.targetWeight ?? pe.targetWeight ?? 0,
            completed: false,
            targetRepsRange: ps.repsRange || undefined,
          })),
        }))
      );
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 84);
    const relevant = allWorkouts
      .filter(w => w.programId === pid && new Date(w.date) >= cutoff)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setPastSessions(relevant);
  }, []);

  useEffect(() => {
    const pid = route.params?.programId;
    Promise.all([getDraftSession(), getUserExercises(), getWorkouts()]).then(([draft, userEx, workouts]) => {
      setUserExercises(userEx);
      setAllWorkouts(workouts);
      if (draft) {
        Alert.alert(
          'Séance en cours',
          `Tu avais une séance "${draft.workoutName}" non terminée. Reprendre ?`,
          [
            {
              text: 'Reprendre',
              onPress: () => {
                setWorkoutName(draft.workoutName);
                setExercises(draft.exercises);
                setNotes(draft.notes);
                if (draft.startedAt) setStartedAt(draft.startedAt);
                if (draft.programId) loadProgramHistory(draft.programId, workouts);
                setReady(true);
              },
            },
            {
              text: 'Nouvelle séance',
              style: 'destructive',
              onPress: () => {
                clearDraftSession();
                if (pid) loadProgram(pid);
                setReady(true);
              },
            },
          ]
        );
      } else {
        if (pid) loadProgram(pid);
        setReady(true);
      }
    });
  }, []);

  // Dernière perf par exercice, toutes séances confondues (nom → séries de travail validées)
  const lastPerfMap = React.useMemo(() => {
    const map: Record<string, ExerciseSet[]> = {};
    [...allWorkouts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(session => {
        session.exercises.forEach(ex => {
          if (map[ex.name]) return;
          const work = ex.sets.filter(s => s.completed && s.type !== 'warmup' && (s.reps > 0 || s.weight > 0));
          if (work.length > 0) map[ex.name] = work;
        });
      });
    return map;
  }, [allWorkouts]);

  const updatePhoto = useCallback((exId: string, photoUri: string | undefined) => {
    setExercises(prev => prev.map(e => e.id === exId ? { ...e, photoUri } : e));
  }, []);

  const addExercise = (tpl: PickerItem) => {
    const ex: Exercise = {
      id: uid(),
      name: tpl.name,
      muscleGroup: tpl.muscleGroup,
      sets: [{ id: uid(), reps: 0, weight: 0, completed: false }],
      photoUri: tpl.photoUri,
    };
    setExercises(prev => [...prev, ex]);
    setShowPicker(false);
    setPickerSearch('');
    setPickerGroup('Tous');
  };

  const handleCreateExercise = async (name: string, muscleGroup: string | undefined, photoUri: string | undefined) => {
    const newUserEx: UserExercise = { id: uid(), name, muscleGroup, photoUri, createdAt: new Date().toISOString() };
    await saveUserExercise(newUserEx);
    setUserExercises(prev => [newUserEx, ...prev]);
    const ex: Exercise = {
      id: uid(), name, muscleGroup,
      sets: [{ id: uid(), reps: 0, weight: 0, completed: false }],
      photoUri,
    };
    setExercises(prev => [...prev, ex]);
    setShowCreateModal(false);
    setShowPicker(false);
    setPickerSearch('');
    setPickerGroup('Tous');
  };

  const removeExercise = useCallback((exId: string) => {
    setExercises(prev => prev.filter(e => e.id !== exId));
  }, []);

  const updateExercise = useCallback((exId: string, patch: Partial<Exercise>) => {
    setExercises(prev => prev.map(e => e.id === exId ? { ...e, ...patch } : e));
  }, []);

  const addSet = useCallback((exId: string) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      const last = e.sets[e.sets.length - 1];
      return {
        ...e,
        sets: [...e.sets, { id: uid(), reps: last?.reps ?? 0, weight: last?.weight ?? 0, completed: false }],
      };
    }));
  }, []);

  const removeSet = useCallback((exId: string, setId: string) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      if (e.sets.length <= 1) return e;
      return { ...e, sets: e.sets.filter(s => s.id !== setId) };
    }));
  }, []);

  const updateSet = useCallback((exId: string, setId: string, field: 'reps' | 'weight' | 'rir' | 'completed', value: string | boolean) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      return {
        ...e,
        sets: e.sets.map(s => {
          if (s.id !== setId) return s;
          if (field === 'completed') return { ...s, completed: value as boolean };
          const num = parseFloat(String(value).replace(',', '.'));
          if (field === 'rir') return { ...s, rir: isNaN(num) ? undefined : num };
          return { ...s, [field]: isNaN(num) ? 0 : num };
        }),
      };
    }));
  }, []);

  // Valider une série : complète les cases vides avec la séance précédente (ou le bas de la fourchette
  // cible), puis lance le minuteur de repos. Re-toucher une série validée la dévalide.
  const toggleSet = useCallback((exId: string, setId: string) => {
    const ex = exercises.find(e => e.id === exId);
    const idx = ex ? ex.sets.findIndex(s => s.id === setId) : -1;
    if (!ex || idx < 0) return;
    const set = ex.sets[idx];
    if (set.completed) {
      setExercises(prev => prev.map(e => e.id !== exId ? e : { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, completed: false } : s) }));
      return;
    }
    const workIndex = ex.sets.slice(0, idx).filter(s => s.type !== 'warmup').length;
    const prevSet = set.type === 'warmup' ? undefined : lastPerfMap[ex.name]?.[workIndex];
    const range = set.targetRepsRange ?? ex.targetRepsRange;
    const rangeLow = range ? parseInt(range, 10) : NaN;
    const reps = set.reps > 0 ? set.reps : (prevSet?.reps || (isNaN(rangeLow) ? 0 : rangeLow));
    const weight = set.weight > 0 ? set.weight : (prevSet?.weight ?? 0);
    setExercises(prev => prev.map(e => e.id !== exId ? e : {
      ...e, sets: e.sets.map(s => s.id === setId ? { ...s, reps, weight, completed: true } : s),
    }));
    lightTap();
    const isLastSetOfSession = exercises[exercises.length - 1]?.id === exId && idx === ex.sets.length - 1;
    if (!isLastSetOfSession) startRest(ex.restSeconds ?? DEFAULT_REST_SECONDS, ex.name);
  }, [exercises, lastPerfMap, startRest]);

  const toggleWarmup = useCallback((exId: string, setId: string) => {
    lightTap();
    setExercises(prev => prev.map(e => e.id !== exId ? e : {
      ...e, sets: e.sets.map(s => s.id === setId ? { ...s, type: s.type === 'warmup' ? 'normal' : 'warmup' } : s),
    }));
  }, []);

  const navigateToHistory = useCallback((name: string) => {
    navigation.navigate('ExerciseHistory', { exerciseName: name });
  }, [navigation]);

  const navigateToGuide = useCallback((name: string) => {
    navigation.navigate('ExerciseGuide', { exerciseName: name });
  }, [navigation]);

  const handleFinish = async () => {
    if (saving) return;
    if (exercises.length === 0) {
      Alert.alert('Séance vide', 'Ajoute au moins un exercice avant de terminer.');
      return;
    }
    setSaving(true);
    try {
      finishedRef.current = true;
      skipRest();
      const now = new Date().toISOString();
      const workoutObj = {
        id: uid(),
        name: workoutName,
        date: now,
        duration: Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)),
        exercises,
        notes,
        programId: currentProgramId,
      };

      // Sauvegarde locale + sync Supabase (avec détection PR)
      const { prs } = await syncWorkout(workoutObj, undefined);
      setSessionPRs(prs);

      // Sync exercises back to template — failure must NOT block the summary
      if (currentProgramId) {
        try {
          const progList = await getPrograms();
          const prog = progList.find(p => p.id === currentProgramId);
          if (prog) {
            const programExercises: ProgramExercise[] = exercises.map(ex => ({
              id: ex.id,
              name: ex.name,
              muscleGroup: ex.muscleGroup,
              sets: ex.sets.map(s => ({
                id: s.id,
                repsRange: s.targetRepsRange ?? (s.reps > 0 ? String(s.reps) : '8-12'),
                targetWeight: s.weight > 0 ? s.weight : undefined,
              })),
              targetWeight: ex.sets.find(s => s.weight > 0)?.weight,
              restSeconds: ex.restSeconds,
              videoUrl: ex.videoUrl,
              notes: ex.notes,
            }));
            await saveProgram({ ...prog, exercises: programExercises, updatedAt: now });
          }
        } catch (syncErr) {
          console.error('[sync]', syncErr);
        }
      }
      await clearDraftSession();
      setSaving(false);
      setShowSummary(true);
    } catch (e) {
      console.error('[handleFinish]', e);
      finishedRef.current = false;
      setSaving(false);
      Alert.alert('Sauvegarde impossible', 'La séance n\'a pas pu être enregistrée. Elle reste ouverte : réessaie « Terminer ».');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Quitter la séance',
      exercises.length > 0 ? 'Que veux-tu faire avec ta séance en cours ?' : 'Quitter sans sauvegarder ?',
      [
        { text: 'Continuer', style: 'cancel' },
        ...(exercises.length > 0 ? [{
          text: 'Sauvegarder pour plus tard',
          onPress: async () => {
            skipRest();
            await saveDraftSession({ workoutName, exercises, notes, programId: currentProgramId, startedAt, savedAt: new Date().toISOString() });
            navigation.goBack();
          },
        }] : []),
        {
          text: 'Abandonner',
          style: 'destructive' as const,
          onPress: async () => { finishedRef.current = true; skipRest(); await clearDraftSession(); navigation.goBack(); },
        },
      ]
    );
  };

  const filteredUser: PickerItem[] = userExercises
    .filter(e => {
      const matchGroup = pickerGroup === 'Tous' || e.muscleGroup === pickerGroup;
      const matchSearch = !pickerSearch || e.name.toLowerCase().includes(pickerSearch.toLowerCase());
      return matchGroup && matchSearch;
    })
    .map(e => ({ name: e.name, muscleGroup: e.muscleGroup ?? 'Autre', equipment: 'Poids libre' as Equipment, photoUri: e.photoUri }));

  const filteredDB: PickerItem[] = EXERCISE_DATABASE.filter(e => {
    const matchGroup = pickerGroup === 'Tous' || e.muscleGroup === pickerGroup;
    const matchEquip = pickerEquipment === 'Tous' || e.equipment === pickerEquipment;
    const matchSearch = !pickerSearch || e.name.toLowerCase().includes(pickerSearch.toLowerCase());
    return matchGroup && matchEquip && matchSearch;
  });

  const filtered: PickerItem[] = [...filteredUser, ...filteredDB];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.nameInput}
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholderTextColor={colors.textMuted}
          />
          {currentProgramId && (
            <TouchableOpacity style={styles.logbookBtn} onPress={() => setShowLogbook(true)}>
              <Ionicons name="book-outline" size={18} color={colors.info} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.finishBtn, saving && { opacity: 0.5 }]}
            onPress={handleFinish}
            disabled={saving}
          >
            <Text style={styles.finishBtnText}>{saving ? 'Sauvegarde...' : 'Terminer'}</Text>
          </TouchableOpacity>
        </View>

        {/* Durée + avancement */}
        <View style={styles.statusBar}>
          <Ionicons name="stopwatch-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.statusText}>{formatClock((now - new Date(startedAt).getTime()) / 1000)}</Text>
          <Text style={styles.statusDot}>·</Text>
          <Text style={styles.statusText}>
            {exercises.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0)}/{exercises.reduce((a, e) => a + e.sets.length, 0)} séries
          </Text>
          <Text style={styles.statusHint}>Appui long sur n° = échauffement</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {exercises.map((ex, idx) => (
            <ExerciseBlock
              key={ex.id}
              exercise={ex}
              index={idx}
              lastPerf={lastPerfMap[ex.name]}
              onRemove={removeExercise}
              onUpdate={updateExercise}
              onAddSet={addSet}
              onRemoveSet={removeSet}
              onUpdateSet={updateSet}
              onToggleSet={toggleSet}
              onToggleWarmup={toggleWarmup}
              onUpdatePhoto={updatePhoto}
              onViewHistory={navigateToHistory}
              onViewGuide={navigateToGuide}
            />
          ))}

          <TouchableOpacity style={styles.addExBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addExText}>Ajouter un exercice</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes de séance..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
          <View style={{ height: rest ? 120 : 40 }} />
        </ScrollView>

        {/* Minuteur de repos */}
        {rest && (
          <View style={styles.restBar}>
            <View style={[styles.restProgress, { width: `${Math.min(100, Math.max(0, ((rest.end - now) / 1000 / rest.total) * 100))}%` }]} />
            <TouchableOpacity style={styles.restAdj} onPress={() => adjustRest(-15)}>
              <Text style={styles.restAdjText}>−15</Text>
            </TouchableOpacity>
            <View style={styles.restCenter}>
              <Text style={styles.restLabel}>REPOS</Text>
              <Text style={styles.restTime}>{formatClock(Math.ceil((rest.end - now) / 1000))}</Text>
            </View>
            <TouchableOpacity style={styles.restAdj} onPress={() => adjustRest(15)}>
              <Text style={styles.restAdjText}>+15</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.restSkip} onPress={skipRest}>
              <Text style={styles.restSkipText}>Passer</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Summary Modal */}
      <SummaryModal
        visible={showSummary}
        workoutName={workoutName}
        exercises={exercises}
        prs={sessionPRs}
        onClose={() => navigation.goBack()}
      />

      {/* Logbook Modal */}
      <LogbookModal
        visible={showLogbook}
        onClose={() => setShowLogbook(false)}
        sessions={pastSessions}
        programName={workoutName}
      />

      {/* Exercise Picker Modal */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.sheet}>
            <View style={pickerStyles.handle} />
            <Text style={pickerStyles.title}>Ajouter un exercice</Text>

            <TextInput
              style={pickerStyles.search}
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder="Rechercher..."
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            {/* Muscle group filter */}
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

            {/* Equipment filter */}
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
                      <Ionicons
                        name={EQUIPMENT_ICONS[eq as Equipment] as any}
                        size={12}
                        color={active ? '#fff' : color}
                      />
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
              keyExtractor={(item, index) => `${item.name}-${index}`}
              style={{ flex: 1 }}
              ListHeaderComponent={
                pickerSearch.length > 0 &&
                !EXERCISE_DATABASE.some(e => e.name.toLowerCase() === pickerSearch.toLowerCase()) &&
                !userExercises.some(e => e.name.toLowerCase() === pickerSearch.toLowerCase())
                  ? (
                    <TouchableOpacity
                      style={pickerStyles.item}
                      onPress={() => { setCreateInitialName(pickerSearch); setShowPicker(false); setShowCreateModal(true); }}
                    >
                      <View style={pickerStyles.itemLeft}>
                        <Ionicons name="add-circle" size={18} color={colors.primary} />
                        <Text style={[pickerStyles.itemName, { color: colors.primary }]}>Créer "{pickerSearch}"</Text>
                      </View>
                    </TouchableOpacity>
                  )
                  : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={pickerStyles.item} onPress={() => addExercise(item)}>
                  <View style={pickerStyles.itemLeft}>
                    {item.photoUri
                      ? <Image source={{ uri: item.photoUri }} style={pickerStyles.itemPhoto} />
                      : null
                    }
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

      {/* Create exercise modal */}
      <CreateExerciseModal
        visible={showCreateModal}
        initialName={createInitialName}
        onConfirm={handleCreateExercise}
        onCancel={() => setShowCreateModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── Exercise Block ───────────────────────────────────────────────────────────

interface ExerciseBlockProps {
  exercise: Exercise;
  index: number;
  lastPerf?: ExerciseSet[];
  onRemove: (exId: string) => void;
  onUpdate: (exId: string, patch: Partial<Exercise>) => void;
  onAddSet: (exId: string) => void;
  onRemoveSet: (exId: string, setId: string) => void;
  onUpdateSet: (exId: string, setId: string, field: 'reps' | 'weight' | 'rir' | 'completed', value: string | boolean) => void;
  onToggleSet: (exId: string, setId: string) => void;
  onToggleWarmup: (exId: string, setId: string) => void;
  onUpdatePhoto: (exId: string, photoUri: string | undefined) => void;
  onViewHistory: (name: string) => void;
  onViewGuide: (name: string) => void;
}

const ExerciseBlock = React.memo(function ExerciseBlock({ exercise, lastPerf, onRemove, onUpdate, onAddSet, onRemoveSet, onUpdateSet, onToggleSet, onToggleWarmup, onUpdatePhoto, onViewHistory, onViewGuide }: ExerciseBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showRestPicker, setShowRestPicker] = useState(false);
  const tagColor = MUSCLE_GROUP_COLORS[exercise.muscleGroup ?? ''] ?? colors.primary;
  const hasVideo = !!exercise.videoUrl?.trim();

  const openVideo = () => {
    const url = exercise.videoUrl?.trim();
    if (url) Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien.'));
  };

  const handlePhotoPress = () => {
    const opts: any[] = [
      { text: 'Appareil photo', onPress: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission refusée', 'Active l\'accès à l\'appareil photo dans les réglages.'); return; }
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
        if (!r.canceled) onUpdatePhoto(exercise.id, r.assets[0].uri);
      }},
      { text: 'Galerie', onPress: async () => {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
        if (!r.canceled) onUpdatePhoto(exercise.id, r.assets[0].uri);
      }},
    ];
    if (exercise.photoUri) opts.push({ text: 'Supprimer la photo', style: 'destructive', onPress: () => onUpdatePhoto(exercise.id, undefined) });
    opts.push({ text: 'Annuler', style: 'cancel' });
    Alert.alert('Photo de l\'exercice', '', opts);
  };

  const completedCount = exercise.sets.filter(s => s.completed).length;

  return (
    <View style={exStyles.card}>
      {/* Exercise header */}
      <View style={exStyles.header}>
        <View style={exStyles.headerLeft}>
          <Text style={exStyles.name} numberOfLines={1}>{exercise.name}</Text>
          {exercise.muscleGroup && (
            <View style={[exStyles.muscleTag, { backgroundColor: tagColor + '22' }]}>
              <Text style={[exStyles.muscleTagText, { color: tagColor }]}>{exercise.muscleGroup}</Text>
            </View>
          )}
          {lastPerf && lastPerf.length > 0 && (
            <View style={exStyles.lastPerfRow}>
              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
              <Text style={exStyles.lastPerfText} numberOfLines={1}>
                {lastPerf.map(s => `${s.reps}r × ${s.weight}kg`).join(' · ')}
              </Text>
            </View>
          )}
        </View>
        <View style={exStyles.headerRight}>
          <TouchableOpacity onPress={handlePhotoPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {exercise.photoUri
              ? <Image source={{ uri: exercise.photoUri }} style={exStyles.photoThumb} />
              : <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
            }
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (hasVideo) openVideo();
              else Alert.prompt
                ? Alert.prompt('Lien vidéo', 'Coller l\'URL de la vidéo :', url => onUpdate(exercise.id, { videoUrl: url }))
                : onUpdate(exercise.id, { videoUrl: '' });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={hasVideo ? 'videocam' : 'videocam-outline'} size={20} color={hasVideo ? colors.info : colors.textMuted} />
          </TouchableOpacity>
          {EXERCISE_GUIDE[exercise.name] && (
            <TouchableOpacity onPress={() => onViewGuide(exercise.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="book-outline" size={18} color={colors.primaryLight} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onViewHistory(exercise.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove(exercise.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCollapsed(c => !c)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Cible + repos row */}
      <View style={exStyles.cibleRow}>
        <Text style={exStyles.cibleLabel}>Cible</Text>
        {/* Group sets by same targetRepsRange and show chips */}
        {(() => {
          const ranges = exercise.sets
            .map(s => s.targetRepsRange)
            .filter((r): r is string => !!r);
          if (ranges.length === 0 && !exercise.targetRepsRange) return null;
          // Deduplicate while keeping order
          const seen = new Map<string, number>();
          ranges.forEach(r => seen.set(r, (seen.get(r) ?? 0) + 1));
          const chips = seen.size > 0
            ? Array.from(seen.entries()).map(([r, n]) => `${n}×${r}`)
            : exercise.targetRepsRange
              ? [`${exercise.sets.length}×${exercise.targetRepsRange}`]
              : [];
          return chips.map((chip, i) => (
            <View key={i} style={exStyles.cibleChip}>
              <Text style={exStyles.cibleChipText}>{chip}</Text>
            </View>
          ));
        })()}
        <TouchableOpacity style={exStyles.restChip} onPress={() => setShowRestPicker(true)}>
          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
          <Text style={exStyles.restChipText}>
            {formatRest(exercise.restSeconds ?? DEFAULT_REST_SECONDS)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rest picker */}
      {showRestPicker && (
        <View style={exStyles.restPicker}>
          {REST_OPTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[exStyles.restOption, exercise.restSeconds === s && exStyles.restOptionActive]}
              onPress={() => { onUpdate(exercise.id, { restSeconds: s }); setShowRestPicker(false); }}
            >
              <Text style={[exStyles.restOptionText, exercise.restSeconds === s && exStyles.restOptionTextActive]}>
                {formatRest(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!collapsed && (
        <>
          {/* Column headers */}
          <View style={exStyles.colRow}>
            <Text style={[exStyles.colHeader, { width: 34 }]}>Série</Text>
            <Text style={[exStyles.colHeader, { width: 64 }]}>Préc.</Text>
            <Text style={[exStyles.colHeader, { flex: 1 }]}>kg</Text>
            <Text style={[exStyles.colHeader, { flex: 1 }]}>Reps</Text>
            <Text style={[exStyles.colHeader, { width: 44 }]}>RIR</Text>
          </View>

          {/* Sets */}
          {exercise.sets.map((set, i) => {
            const workIndex = exercise.sets.slice(0, i).filter(s => s.type !== 'warmup').length;
            const workNumber = workIndex + 1;
            const prev = set.type === 'warmup' ? undefined : lastPerf?.[workIndex];
            return (
              <SetRow
                key={set.id}
                set={set}
                label={set.type === 'warmup' ? 'É' : String(workNumber)}
                prev={prev}
                targetRepsRange={set.targetRepsRange ?? exercise.targetRepsRange}
                onToggle={() => onToggleSet(exercise.id, set.id)}
                onLongPress={() => onToggleWarmup(exercise.id, set.id)}
                onChangeReps={v => onUpdateSet(exercise.id, set.id, 'reps', v)}
                onChangeWeight={v => onUpdateSet(exercise.id, set.id, 'weight', v)}
                onChangeRir={v => onUpdateSet(exercise.id, set.id, 'rir', v)}
                onRemove={exercise.sets.length > 1 ? () => onRemoveSet(exercise.id, set.id) : undefined}
              />
            );
          })}

          {/* Footer */}
          <View style={exStyles.footer}>
            <TouchableOpacity style={exStyles.footerBtn} onPress={() => onAddSet(exercise.id)}>
              <Ionicons name="add" size={15} color={colors.primary} />
              <Text style={exStyles.footerBtnText}>Ajouter une série</Text>
            </TouchableOpacity>
            <Text style={exStyles.progressText}>
              {completedCount}/{exercise.sets.length} séries
            </Text>
          </View>
        </>
      )}
    </View>
  );
});

// ─── Set Row ─────────────────────────────────────────────────────────────────

interface SetRowProps {
  set: ExerciseSet;
  label: string;
  prev?: ExerciseSet;
  targetRepsRange?: string;
  onToggle: () => void;
  onLongPress: () => void;
  onChangeReps: (v: string) => void;
  onChangeWeight: (v: string) => void;
  onChangeRir: (v: string) => void;
  onRemove?: () => void;
}

function SetRow({ set, label, prev, targetRepsRange, onToggle, onLongPress, onChangeReps, onChangeWeight, onChangeRir, onRemove }: SetRowProps) {
  const warm = set.type === 'warmup';
  const muted = set.completed ? colors.success + '80' : colors.textMuted;
  return (
    <View style={[setStyles.row, set.completed && setStyles.rowDone]}>
      <TouchableOpacity
        style={[setStyles.circle, warm && setStyles.circleWarm, set.completed && setStyles.circleDone]}
        onPress={onToggle}
        onLongPress={onLongPress}
        delayLongPress={350}
      >
        {set.completed
          ? <Ionicons name="checkmark" size={16} color="#fff" />
          : <Text style={[setStyles.circleNum, warm && { color: colors.warning }]}>{label}</Text>
        }
      </TouchableOpacity>

      <Text style={setStyles.prev} numberOfLines={1}>
        {prev ? `${prev.weight}×${prev.reps}` : '—'}
      </Text>

      <TextInput
        style={[setStyles.input, set.completed && setStyles.inputDone]}
        value={set.weight > 0 ? String(set.weight) : ''}
        onChangeText={onChangeWeight}
        keyboardType="decimal-pad"
        placeholder={prev ? String(prev.weight) : 'kg'}
        placeholderTextColor={muted}
        editable={!set.completed}
        selectTextOnFocus
      />
      <TextInput
        style={[setStyles.input, set.completed && setStyles.inputDone]}
        value={set.reps > 0 ? String(set.reps) : ''}
        onChangeText={onChangeReps}
        keyboardType="number-pad"
        placeholder={prev ? String(prev.reps) : (targetRepsRange ?? '0')}
        placeholderTextColor={muted}
        editable={!set.completed}
        selectTextOnFocus
      />
      <TextInput
        style={[setStyles.input, setStyles.inputRir, set.completed && setStyles.inputDone]}
        value={set.rir !== undefined ? String(set.rir) : ''}
        onChangeText={onChangeRir}
        keyboardType="number-pad"
        placeholder="–"
        placeholderTextColor={muted}
        editable={!set.completed && !warm}
        maxLength={2}
      />
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="remove-circle-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      ) : <View style={{ width: 18 }} />}
    </View>
  );
}

// ─── Logbook Modal ────────────────────────────────────────────────────────────

function LogbookModal({ visible, onClose, sessions, programName }: {
  visible: boolean;
  onClose: () => void;
  sessions: Workout[];
  programName: string;
}) {
  if (!visible) return null;

  const weekLabel = (date: string) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    const w = Math.floor(days / 7) + 1;
    return `Semaine ${w}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={lbStyles.overlay}>
        <View style={lbStyles.sheet}>
          <View style={lbStyles.header}>
            <View style={lbStyles.handle} />
            <View style={lbStyles.titleRow}>
              <Ionicons name="book-outline" size={18} color={colors.info} />
              <Text style={lbStyles.title}>{programName}</Text>
              <Text style={lbStyles.subtitle}>12 semaines</Text>
            </View>
          </View>

          {sessions.length === 0 ? (
            <View style={lbStyles.empty}>
              <Ionicons name="time-outline" size={40} color={colors.textMuted} />
              <Text style={lbStyles.emptyText}>Aucune séance enregistrée{'\n'}pour ce programme</Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={s => s.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item: session }) => (
                <View style={lbStyles.sessionBlock}>
                  <View style={lbStyles.sessionHeader}>
                    <View style={lbStyles.weekBadge}>
                      <Text style={lbStyles.weekText}>{weekLabel(session.date)}</Text>
                    </View>
                    <Text style={lbStyles.sessionDate}>{formatDateLong(session.date.split('T')[0])}</Text>
                  </View>
                  {session.exercises.map(ex => (
                    <View key={ex.id} style={lbStyles.exRow}>
                      <Text style={lbStyles.exName}>{ex.name}</Text>
                      <Text style={lbStyles.exSets}>
                        {ex.sets.map(s => `${s.reps}r×${s.weight}kg`).join(' · ')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            />
          )}

          <TouchableOpacity style={lbStyles.closeBtn} onPress={onClose}>
            <Text style={lbStyles.closeBtnText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const lbStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl, padding: spacing.lg,
    paddingBottom: 32, maxHeight: '88%',
  },
  header: { marginBottom: spacing.md },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.h3, color: colors.text, flex: 1 },
  subtitle: { ...typography.caption, color: colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: 48, gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  sessionBlock: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  weekBadge: {
    backgroundColor: colors.info + '22', borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  weekText: { ...typography.tiny, color: colors.info },
  sessionDate: { ...typography.caption, color: colors.textSecondary },
  exRow: { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border + '55' },
  exName: { ...typography.label, color: colors.text, marginBottom: 2 },
  exSets: { ...typography.tiny, color: colors.textMuted, lineHeight: 16 },
  closeBtn: {
    backgroundColor: colors.card, borderRadius: borderRadius.round,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  closeBtnText: { ...typography.bodyBold, color: colors.textSecondary },
});

// ─── Summary Modal ────────────────────────────────────────────────────────────

function SummaryModal({ visible, workoutName, exercises, prs, onClose }: {
  visible: boolean;
  workoutName: string;
  exercises: Exercise[];
  prs: string[];
  onClose: () => void;
}) {
  const allDone = exercises.flatMap(ex => ex.sets.filter(s => s.completed));
  const totalSets = allDone.length;
  const totalReps = allDone.reduce((a, s) => a + s.reps, 0);
  const totalVolume = Math.round(allDone.reduce((a, s) => a + s.reps * s.weight, 0));
  const exDone = exercises.filter(ex => ex.sets.some(s => s.completed));

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={smStyles.safe}>
        <ScrollView contentContainerStyle={smStyles.content} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={smStyles.hero}>
            <View style={smStyles.trophyRing}>
              <Ionicons name="trophy" size={44} color={colors.warning} />
            </View>
            <Text style={smStyles.heroTitle}>Séance terminée !</Text>
            <Text style={smStyles.heroSub}>{workoutName}</Text>
          </View>

          {/* PRs */}
          {prs.length > 0 && (
            <View style={smStyles.prBanner}>
              <Ionicons name="ribbon" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={smStyles.prTitle}>
                  {prs.length} nouveau{prs.length > 1 ? 'x' : ''} record{prs.length > 1 ? 's' : ''} !
                </Text>
                <Text style={smStyles.prList}>{prs.join(' · ')}</Text>
              </View>
            </View>
          )}

          {/* Stats 2×2 */}
          <View style={smStyles.statsGrid}>
            {[
              { icon: 'barbell-outline',          value: String(exDone.length),             label: 'Exercices',    color: colors.primary },
              { icon: 'checkmark-circle-outline', value: String(totalSets),                 label: 'Séries',       color: colors.success },
              { icon: 'repeat-outline',           value: String(totalReps),                 label: 'Répétitions',  color: colors.info },
              { icon: 'stats-chart-outline',      value: totalVolume.toLocaleString('fr'),  label: 'kg soulevés',  color: colors.warning },
            ].map(({ icon, value, label, color }) => (
              <View key={label} style={[smStyles.statCard, { borderColor: color + '40' }]}>
                <Ionicons name={icon as any} size={20} color={color} />
                <Text style={[smStyles.statValue, { color }]}>{value}</Text>
                <Text style={smStyles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Per-exercise breakdown */}
          {exDone.length > 0 && (
            <>
              <Text style={smStyles.sectionTitle}>Détail des exercices</Text>
              {exDone.map(ex => {
                const done = ex.sets.filter(s => s.completed);
                const vol = Math.round(done.reduce((a, s) => a + s.reps * s.weight, 0));
                const reps = done.reduce((a, s) => a + s.reps, 0);
                const tagColor = MUSCLE_GROUP_COLORS[ex.muscleGroup ?? ''] ?? colors.primary;
                return (
                  <View key={ex.id} style={smStyles.exCard}>
                    <View style={smStyles.exTop}>
                      <View style={[smStyles.exDot, { backgroundColor: tagColor }]} />
                      <Text style={smStyles.exName} numberOfLines={1}>{ex.name}</Text>
                      {ex.muscleGroup && (
                        <View style={[smStyles.exTag, { backgroundColor: tagColor + '22' }]}>
                          <Text style={[smStyles.exTagText, { color: tagColor }]}>{ex.muscleGroup}</Text>
                        </View>
                      )}
                    </View>
                    <View style={smStyles.exMeta}>
                      <Text style={smStyles.exMetaText}>{done.length} série{done.length > 1 ? 's' : ''}</Text>
                      <Text style={smStyles.exMetaDot}>·</Text>
                      <Text style={smStyles.exMetaText}>{reps} reps</Text>
                      {vol > 0 && <>
                        <Text style={smStyles.exMetaDot}>·</Text>
                        <Text style={smStyles.exMetaText}>{vol.toLocaleString('fr')} kg</Text>
                      </>}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={smStyles.footer}>
          <TouchableOpacity style={smStyles.closeBtn} onPress={onClose}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={smStyles.closeBtnText}>Terminer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const smStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingTop: spacing.lg },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  trophyRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.warning + '20',
    borderWidth: 3, borderColor: colors.warning + '50',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { fontSize: 28, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
  heroSub: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  statCard: {
    flex: 1, minWidth: '45%', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, gap: 6,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  statValue: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.5 },
  statLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  sectionTitle: { ...typography.label, color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.sm },
  exCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
    gap: 6,
  },
  exTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exDot: { width: 8, height: 8, borderRadius: 4 },
  exName: { ...typography.bodyBold, color: colors.text, flex: 1 },
  exTag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.round },
  exTagText: { ...typography.tiny },
  exMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: 16 },
  exMetaText: { ...typography.caption, color: colors.textSecondary },
  exMetaDot: { ...typography.caption, color: colors.textMuted },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.md, paddingBottom: spacing.lg,
    backgroundColor: colors.background + 'EE',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  closeBtn: {
    backgroundColor: colors.success, borderRadius: borderRadius.round,
    padding: spacing.md, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  closeBtnText: { ...typography.bodyBold, color: '#FFFFFF', fontSize: 16 },
  prBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.primaryMuted, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.primary + '44',
  },
  prTitle: { ...typography.bodyBold, color: colors.primary },
  prList: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});

// ─── Create Exercise Modal ────────────────────────────────────────────────────

function CreateExerciseModal({ visible, initialName, onConfirm, onCancel }: {
  visible: boolean;
  initialName: string;
  onConfirm: (name: string, muscleGroup: string | undefined, photoUri: string | undefined) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState<string | undefined>();
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  React.useEffect(() => { if (visible) { setName(initialName); setGroup(undefined); setPhotoUri(undefined); } }, [visible, initialName]);

  const pickPhoto = () => {
    Alert.alert('Photo', 'Choisir une source', [
      { text: 'Appareil photo', onPress: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission refusée'); return; }
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
        if (!r.canceled) setPhotoUri(r.assets[0].uri);
      }},
      { text: 'Galerie', onPress: async () => {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
        if (!r.canceled) setPhotoUri(r.assets[0].uri);
      }},
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const muscleGroups = MUSCLE_GROUPS.filter(g => g !== 'Tous');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={ceStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <View style={ceStyles.sheet}>
            <View style={ceStyles.handle} />
            <Text style={ceStyles.title}>Nouvel exercice</Text>

            <TextInput
              style={ceStyles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Nom de l'exercice"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <Text style={ceStyles.label}>Groupe musculaire</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {muscleGroups.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[ceStyles.chip, group === g && ceStyles.chipActive]}
                  onPress={() => setGroup(g === group ? undefined : g)}
                >
                  <Text style={[ceStyles.chipText, group === g && ceStyles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={ceStyles.label}>Photo de la machine / exercice</Text>
            <TouchableOpacity style={ceStyles.photoPicker} onPress={pickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={ceStyles.photoPreview} />
              ) : (
                <View style={ceStyles.photoEmpty}>
                  <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                  <Text style={ceStyles.photoEmptyText}>Ajouter une photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[ceStyles.confirmBtn, !name.trim() && { opacity: 0.4 }]}
              onPress={() => name.trim() && onConfirm(name.trim(), group, photoUri)}
              disabled={!name.trim()}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={ceStyles.confirmBtnText}>Créer et ajouter à la séance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={ceStyles.cancelBtn} onPress={onCancel}>
              <Text style={ceStyles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const ceStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg, paddingBottom: 36,
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  nameInput: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    ...typography.body, color: colors.text, marginBottom: spacing.md,
  },
  label: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.round, backgroundColor: colors.card,
    marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.text },
  photoPicker: {
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: borderRadius.lg, marginBottom: spacing.md,
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: 140 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  photoEmptyText: { ...typography.caption, color: colors.textMuted },
  confirmBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.round,
    padding: spacing.md, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  confirmBtnText: { ...typography.bodyBold, color: '#FFFFFF' },
  cancelBtn: {
    backgroundColor: colors.card, borderRadius: borderRadius.round,
    padding: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { ...typography.bodyBold, color: colors.textSecondary },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const setStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '55',
  },
  rowDone: { opacity: 0.75 },
  circle: {
    width: 34, height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleDone: { backgroundColor: colors.success, borderColor: colors.success },
  circleWarm: { borderColor: colors.warning, borderStyle: 'dashed' },
  prev: { width: 64, flexShrink: 0, ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  inputRir: { flexGrow: 0, flexShrink: 0, flexBasis: 44, width: 44, paddingHorizontal: 2 },
  circleNum: { ...typography.caption, color: colors.textSecondary },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    ...typography.bodyBold,
    color: colors.text,
    textAlign: 'center',
  },
  inputDone: { color: colors.success },
});

const exStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  headerLeft: { flex: 1, gap: 4 },
  name: { ...typography.bodyBold, color: colors.text },
  muscleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  muscleTagText: { ...typography.tiny },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: 2 },
  cibleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  cibleLabel: { ...typography.caption, color: colors.textMuted },
  cibleChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cibleChipText: { ...typography.caption, color: colors.textSecondary },
  restChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restChipText: { ...typography.caption, color: colors.textSecondary },
  restPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  restOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  restOptionText: { ...typography.caption, color: colors.textSecondary },
  restOptionTextActive: { color: colors.text, fontWeight: '600' },
  colRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  colHeader: { ...typography.tiny, color: colors.textMuted, textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerBtnText: { ...typography.caption, color: colors.primary },
  progressText: { ...typography.caption, color: colors.textMuted },
  lastPerfRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  lastPerfText: { ...typography.tiny, color: colors.textMuted, flex: 1 },
  photoThumb: { width: 28, height: 28, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border },
});

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    height: '85%',
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  search: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  groupScroll: { marginBottom: spacing.sm },
  groupChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.card,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupChipText: { ...typography.caption, color: colors.textSecondary },
  groupChipTextActive: { color: colors.text },
  equipChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.round, backgroundColor: colors.card,
    marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  equipChipText: { ...typography.caption, color: colors.textSecondary },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  itemPhoto: { width: 32, height: 32, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border },
  itemName: { ...typography.body, color: colors.text },
  groupTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  groupTagText: { ...typography.tiny },
  closeBtn: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.round,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  closeBtnText: { ...typography.bodyBold, color: colors.textSecondary },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameInput: {
    flex: 1,
    ...typography.bodyBold,
    color: colors.text,
    textAlign: 'center',
  },
  logbookBtn: {
    width: 36, height: 36, borderRadius: borderRadius.round,
    backgroundColor: colors.info + '22', justifyContent: 'center', alignItems: 'center',
  },
  finishBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.round,
  },
  finishBtnText: { ...typography.bodyBold, color: '#FFFFFF' },
  content: { padding: spacing.md },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    borderStyle: 'dashed',
    padding: spacing.md,
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  addExText: { ...typography.bodyBold, color: colors.primary },
  notesInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    textAlignVertical: 'top',
    minHeight: 72,
  },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statusText: { ...typography.caption, color: colors.textSecondary },
  statusDot: { ...typography.caption, color: colors.textMuted },
  statusHint: { ...typography.tiny, color: colors.textMuted, marginLeft: 'auto' },
  restBar: {
    position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: 10, overflow: 'hidden',
    ...shadows.md,
  },
  restProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.primaryMuted },
  restAdj: {
    width: 48, height: 40, borderRadius: borderRadius.md,
    backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center',
  },
  restAdjText: { ...typography.bodyBold, color: colors.text },
  restCenter: { flex: 1, alignItems: 'center' },
  restLabel: { ...typography.label, color: colors.primaryLight },
  restTime: { ...typography.h2, color: colors.text },
  restSkip: {
    paddingHorizontal: 14, height: 40, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, justifyContent: 'center',
  },
  restSkipText: { ...typography.bodyBold, color: colors.onPrimary },
});
