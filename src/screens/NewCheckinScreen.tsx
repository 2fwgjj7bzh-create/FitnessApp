/**
 * Nouveau bilan / modification : poids, photos (face, dos, profil), mensurations
 * gauche/droite et questionnaire (générique ou personnalisé).
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getCheckins, saveCheckin } from '../storage';
import { uid, today, formatDateLong } from '../utils/helpers';
import {
  BodyStackParamList, CheckinAnswer, CheckinPhotos, CheckinQuestion, Measurements, WeeklyCheckin,
} from '../types';
import {
  getQuestions, legacyFieldsFromAnswers, answerFor, MEASUREMENT_FIELDS, normalizeMeasurements,
  photosOf, rescheduleCheckinNotifications,
} from '../lib/checkin';
import { persistImage } from '../lib/media';

type Nav = NativeStackNavigationProp<BodyStackParamList, 'NewCheckin'>;
type Route = RouteProp<BodyStackParamList, 'NewCheckin'>;

const POSES: { key: keyof CheckinPhotos; label: string }[] = [
  { key: 'front', label: 'Face' },
  { key: 'back', label: 'Dos' },
  { key: 'side', label: 'Profil' },
];

export default function NewCheckinScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.checkinId;

  const [existing, setExisting] = useState<WeeklyCheckin | null>(null);
  const [questions, setQuestions] = useState<CheckinQuestion[]>([]);
  const [weight, setWeight] = useState('');
  const [photos, setPhotos] = useState<CheckinPhotos>({});
  const [meas, setMeas] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, CheckinAnswer>>({});
  const [saving, setSaving] = useState(false);
  const [lastWeight, setLastWeight] = useState<number | undefined>();

  useEffect(() => {
    (async () => {
      const [qs, list] = await Promise.all([getQuestions(), getCheckins()]);
      const c = editId ? list.find(x => x.id === editId) ?? null : null;
      setExisting(c);
      setLastWeight(list.find(x => x.id !== editId && x.weight)?.weight);
      if (c) {
        setWeight(c.weight ? String(c.weight) : '');
        setPhotos(photosOf(c));
        const m = normalizeMeasurements(c.measurements);
        const mm: Record<string, string> = {};
        MEASUREMENT_FIELDS.forEach(f => { const v = m[f.key]; if (v) mm[f.key] = String(v); });
        setMeas(mm);
        const a: Record<string, CheckinAnswer> = {};
        qs.forEach(q => { const v = answerFor(c, q.id); if (v !== undefined) a[q.id] = v; });
        setAnswers(a);
        // questions du bilan d'origine qui ne sont plus actives : on les garde affichées
        setQuestions(qs.filter(q => q.active || (c.answers && c.answers[q.id] !== undefined)));
      } else {
        setQuestions(qs.filter(q => q.active));
      }
    })();
  }, [editId]);

  const pick = async (pose: keyof CheckinPhotos) => {
    const fromCamera = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission refusée', "Autorise l'appareil photo dans les réglages."); return; }
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!r.canceled) setPhotos(p => ({ ...p, [pose]: r.assets[0].uri }));
    };
    const fromLibrary = async () => {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!r.canceled) setPhotos(p => ({ ...p, [pose]: r.assets[0].uri }));
    };
    if (Platform.OS === 'web') { fromLibrary(); return; }
    const opts: any[] = [
      { text: 'Appareil photo', onPress: fromCamera },
      { text: 'Galerie', onPress: fromLibrary },
    ];
    if (photos[pose]) opts.push({ text: 'Supprimer', style: 'destructive', onPress: () => setPhotos(p => ({ ...p, [pose]: undefined })) });
    opts.push({ text: 'Annuler', style: 'cancel' });
    Alert.alert(`Photo ${POSES.find(x => x.key === pose)?.label}`, 'Même lumière, même tenue, même distance à chaque bilan.', opts);
  };

  const num = (s: string | undefined) => {
    const n = parseFloat(String(s ?? '').replace(',', '.'));
    return isNaN(n) ? undefined : n;
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const keptPhotos: CheckinPhotos = {};
      for (const p of POSES) {
        const uri = photos[p.key];
        if (!uri) continue;
        const original = existing ? photosOf(existing)[p.key] : undefined;
        keptPhotos[p.key] = uri === original ? uri : await persistImage(uri, 'checkins');
      }
      const measurements: Measurements = {};
      MEASUREMENT_FIELDS.forEach(f => { const v = num(meas[f.key]); if (v !== undefined) (measurements as any)[f.key] = v; });
      const now = new Date().toISOString();
      const checkin: WeeklyCheckin = {
        id: existing?.id ?? uid(),
        date: existing?.date ?? today(),
        weight: num(weight),
        measurements,
        photos: keptPhotos,
        answers,
        questionsSnapshot: questions.map(q => ({ id: q.id, label: q.label, type: q.type, unit: q.unit })),
        ...legacyFieldsFromAnswers(answers),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await saveCheckin(checkin);
      rescheduleCheckinNotifications(await getCheckins()).catch(() => {});
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Enregistrement impossible', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const setAnswer = (id: string, v: CheckinAnswer | undefined) =>
    setAnswers(a => { const n = { ...a }; if (v === undefined || v === '') delete n[id]; else n[id] = v; return n; });

  const w = num(weight);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>{existing ? 'Modifier le bilan' : 'Nouveau bilan'}</Text>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <Text style={styles.saveText}>Enregistrer</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.date}>{formatDateLong(existing?.date ?? today())}</Text>

          {/* Poids */}
          <View style={styles.card}>
            <Text style={styles.label}>POIDS</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput} value={weight} onChangeText={setWeight}
                keyboardType="decimal-pad" placeholder={lastWeight ? String(lastWeight) : '0'} placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>
            {w !== undefined && lastWeight !== undefined && (
              <Text style={styles.hint}>
                {w - lastWeight >= 0 ? '+' : ''}{(w - lastWeight).toFixed(1)} kg depuis le dernier bilan
              </Text>
            )}
            <Text style={styles.hint}>Le matin, à jeun, après être passé aux toilettes.</Text>
          </View>

          {/* Photos */}
          <View style={styles.card}>
            <Text style={styles.label}>PHOTOS</Text>
            <View style={styles.photoRow}>
              {POSES.map(p => (
                <TouchableOpacity key={p.key} style={styles.photoSlot} onPress={() => pick(p.key)} activeOpacity={0.8}>
                  {photos[p.key]
                    ? <Image source={{ uri: photos[p.key] }} style={styles.photo} />
                    : <Ionicons name="camera-outline" size={26} color={colors.textMuted} />}
                  <View style={styles.photoTag}><Text style={styles.photoTagText}>{p.label}</Text></View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Mensurations */}
          <View style={styles.card}>
            <Text style={styles.label}>MENSURATIONS (cm)</Text>
            {['chest', 'shoulders', 'waist', 'hips'].map(k => {
              const f = MEASUREMENT_FIELDS.find(x => x.key === k)!;
              return (
                <View key={k} style={styles.measRow}>
                  <Text style={styles.measLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.measInput} value={meas[k] ?? ''} onChangeText={v => setMeas(m => ({ ...m, [k]: v }))}
                    keyboardType="decimal-pad" placeholder="—" placeholderTextColor={colors.textMuted}
                  />
                </View>
              );
            })}
            {[['bicepsL', 'bicepsR', 'Biceps'], ['thighL', 'thighR', 'Cuisses'], ['calfL', 'calfR', 'Mollets']].map(([l, r, label]) => (
              <View key={label} style={styles.measRow}>
                <Text style={styles.measLabel}>{label}</Text>
                <Text style={styles.side}>G</Text>
                <TextInput
                  style={styles.measInputSmall} value={meas[l] ?? ''} onChangeText={v => setMeas(m => ({ ...m, [l]: v }))}
                  keyboardType="decimal-pad" placeholder="—" placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.side}>D</Text>
                <TextInput
                  style={styles.measInputSmall} value={meas[r] ?? ''} onChangeText={v => setMeas(m => ({ ...m, [r]: v }))}
                  keyboardType="decimal-pad" placeholder="—" placeholderTextColor={colors.textMuted}
                />
              </View>
            ))}
            <Text style={styles.hint}>Mesure au même endroit à chaque fois, mètre ruban à plat, sans serrer.</Text>
          </View>

          {/* Questionnaire */}
          <View style={styles.card}>
            <Text style={styles.label}>QUESTIONNAIRE</Text>
            {questions.map(q => (
              <View key={q.id} style={styles.question}>
                <Text style={styles.qLabel}>{q.label}</Text>
                {q.type === 'scale' && (
                  <>
                    <View style={styles.scaleRow}>
                      {Array.from({ length: (q.max ?? 5) - (q.min ?? 1) + 1 }, (_, i) => (q.min ?? 1) + i).map(v => (
                        <TouchableOpacity
                          key={v}
                          style={[styles.scaleBtn, answers[q.id] === v && styles.scaleBtnActive]}
                          onPress={() => setAnswer(q.id, answers[q.id] === v ? undefined : v)}
                        >
                          <Text style={[styles.scaleText, answers[q.id] === v && styles.scaleTextActive]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {(q.minLabel || q.maxLabel) && (
                      <View style={styles.scaleLabels}>
                        <Text style={styles.scaleHint}>{q.minLabel}</Text>
                        <Text style={styles.scaleHint}>{q.maxLabel}</Text>
                      </View>
                    )}
                  </>
                )}
                {q.type === 'number' && (
                  <View style={styles.numRow}>
                    <TextInput
                      style={styles.numInput}
                      value={answers[q.id] !== undefined ? String(answers[q.id]) : ''}
                      onChangeText={v => { const n = num(v); setAnswer(q.id, v === '' ? undefined : (n ?? v)); }}
                      keyboardType="decimal-pad" placeholder="—" placeholderTextColor={colors.textMuted}
                    />
                    {q.unit ? <Text style={styles.unit}>{q.unit}</Text> : null}
                  </View>
                )}
                {q.type === 'yesno' && (
                  <View style={styles.scaleRow}>
                    {[true, false].map(v => (
                      <TouchableOpacity
                        key={String(v)}
                        style={[styles.yesNo, answers[q.id] === v && styles.scaleBtnActive]}
                        onPress={() => setAnswer(q.id, answers[q.id] === v ? undefined : v)}
                      >
                        <Text style={[styles.scaleText, answers[q.id] === v && styles.scaleTextActive]}>{v ? 'Oui' : 'Non'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {q.type === 'text' && (
                  <TextInput
                    style={styles.textInput} multiline
                    value={answers[q.id] !== undefined ? String(answers[q.id]) : ''}
                    onChangeText={v => setAnswer(q.id, v)}
                    placeholder="Ta réponse…" placeholderTextColor={colors.textMuted}
                  />
                )}
              </View>
            ))}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.h3, color: colors.text, flex: 1, textAlign: 'center' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 8, minWidth: 100, alignItems: 'center' },
  saveText: { ...typography.bodyBold, color: colors.onPrimary },
  content: { padding: spacing.md },
  date: { ...typography.h2, color: colors.text, marginBottom: spacing.sm, textTransform: 'capitalize' },
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.sm,
  },
  label: { ...typography.label, color: colors.primaryLight, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: 6 },
  weightRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  weightInput: { ...typography.h1, color: colors.text, minWidth: 120, padding: 0 },
  weightUnit: { ...typography.h3, color: colors.textSecondary },
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  photoSlot: {
    flex: 1, aspectRatio: 3 / 4, borderRadius: borderRadius.md, backgroundColor: colors.inputBg,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoTag: { position: 'absolute', bottom: 6, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  photoTagText: { ...typography.tiny, color: '#FFFFFF' },
  measRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  measLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  measInput: { ...typography.bodyBold, color: colors.text, backgroundColor: colors.inputBg, borderRadius: borderRadius.sm, width: 90, paddingVertical: 8, textAlign: 'center' },
  measInputSmall: { ...typography.bodyBold, color: colors.text, backgroundColor: colors.inputBg, borderRadius: borderRadius.sm, width: 64, paddingVertical: 8, textAlign: 'center' },
  side: { ...typography.caption, color: colors.textMuted },
  question: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  qLabel: { ...typography.bodyBold, color: colors.text, marginBottom: 8 },
  scaleRow: { flexDirection: 'row', gap: 8 },
  scaleBtn: { flex: 1, height: 42, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  scaleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleText: { ...typography.bodyBold, color: colors.textSecondary },
  scaleTextActive: { color: colors.onPrimary },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  scaleHint: { ...typography.tiny, color: colors.textMuted },
  yesNo: { flex: 1, height: 42, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numInput: { ...typography.bodyBold, color: colors.text, backgroundColor: colors.inputBg, borderRadius: borderRadius.sm, width: 100, paddingVertical: 8, textAlign: 'center' },
  unit: { ...typography.body, color: colors.textSecondary },
  textInput: {
    ...typography.body, color: colors.text, backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    padding: spacing.sm, minHeight: 64, textAlignVertical: 'top',
  },
});
