import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { saveCheckin, getCheckins } from '../storage';
import { uid, today, FEELING_LABELS, SLEEP_QUALITY_LABELS } from '../utils/helpers';
import { WeeklyCheckin, Measurements, FeelingLevel, SleepQuality, BodyStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<BodyStackParamList, 'NewCheckin'>;
type RoutePropType = RouteProp<BodyStackParamList, 'NewCheckin'>;

const FEELING_EMOJIS = ['😞', '😕', '😐', '😊', '🤩'];
const SLEEP_EMOJIS = ['😴', '😪', '😑', '😌', '✨'];

export default function NewCheckinScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const checkinId = route.params?.checkinId;

  const [date] = useState(today());
  const [weight, setWeight] = useState('');
  const [feeling, setFeeling] = useState<FeelingLevel>(3);
  const [sleepHours, setSleepHours] = useState('7.5');
  const [sleepQuality, setSleepQuality] = useState<SleepQuality>(3);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [showMeasurements, setShowMeasurements] = useState(false);

  useEffect(() => {
    if (checkinId) {
      getCheckins().then(list => {
        const c = list.find(x => x.id === checkinId);
        if (c) {
          setWeight(c.weight ? String(c.weight) : '');
          setFeeling(c.feeling);
          setSleepHours(String(c.sleepHours));
          setSleepQuality(c.sleepQuality);
          setPhotoUri(c.photoUri);
          setNotes(c.notes || '');
          setMeasurements(c.measurements || {});
          if (c.measurements && Object.keys(c.measurements).length > 0) {
            setShowMeasurements(true);
          }
        }
      });
    }
  }, [checkinId]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorise l\'accès aux photos dans les réglages.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorise l\'accès à la caméra dans les réglages.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    const checkin: WeeklyCheckin = {
      id: checkinId || uid(),
      date,
      weight: weight ? parseFloat(weight) : undefined,
      feeling,
      sleepHours: parseFloat(sleepHours) || 7,
      sleepQuality,
      photoUri,
      notes: notes.trim() || undefined,
      measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
    };
    await saveCheckin(checkin);
    navigation.goBack();
  };

  const updateMeasurement = (key: keyof Measurements, value: string) => {
    const num = parseFloat(value);
    setMeasurements(prev => ({
      ...prev,
      [key]: isNaN(num) ? undefined : num,
    }));
  };

  const measureFields: { key: keyof Measurements; label: string }[] = [
    { key: 'chest', label: 'Poitrine (cm)' },
    { key: 'waist', label: 'Taille (cm)' },
    { key: 'hips', label: 'Hanches (cm)' },
    { key: 'leftArm', label: 'Bras gauche (cm)' },
    { key: 'rightArm', label: 'Bras droit (cm)' },
    { key: 'leftThigh', label: 'Cuisse gauche (cm)' },
    { key: 'rightThigh', label: 'Cuisse droite (cm)' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{checkinId ? 'Modifier le bilan' : 'Nouveau bilan'}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Sauver</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Weight */}
          <Section title="Poids" icon="scale-outline">
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="Ex: 75.5"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>
          </Section>

          {/* Feeling */}
          <Section title="Forme générale" icon="happy-outline">
            <View style={styles.emojiRow}>
              {FEELING_EMOJIS.map((emoji, i) => {
                const level = (i + 1) as FeelingLevel;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.emojiBtn, feeling === level && styles.emojiBtnActive]}
                    onPress={() => setFeeling(level)}
                  >
                    <Text style={styles.emojiChar}>{emoji}</Text>
                    <Text style={[styles.emojiLabel, feeling === level && { color: colors.primary }]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.feelingLabel}>{FEELING_LABELS[feeling]}</Text>
          </Section>

          {/* Sleep */}
          <Section title="Sommeil" icon="moon-outline">
            <View style={styles.sleepRow}>
              <View style={styles.sleepHoursRow}>
                <TextInput
                  style={styles.sleepInput}
                  value={sleepHours}
                  onChangeText={setSleepHours}
                  keyboardType="decimal-pad"
                  placeholder="7.5"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.sleepUnit}>heures</Text>
              </View>
            </View>
            <Text style={styles.sleepQualityTitle}>Qualité du sommeil</Text>
            <View style={styles.emojiRow}>
              {SLEEP_EMOJIS.map((emoji, i) => {
                const level = (i + 1) as SleepQuality;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.emojiBtn, sleepQuality === level && styles.emojiBtnActive]}
                    onPress={() => setSleepQuality(level)}
                  >
                    <Text style={styles.emojiChar}>{emoji}</Text>
                    <Text style={[styles.emojiLabel, sleepQuality === level && { color: colors.info }]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.feelingLabel}>{SLEEP_QUALITY_LABELS[sleepQuality]}</Text>
          </Section>

          {/* Photo */}
          <Section title="Photo" icon="camera-outline">
            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(undefined)}>
                  <Text style={styles.removePhotoText}>Supprimer la photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoRow}>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={24} color={colors.primary} />
                  <Text style={styles.photoBtnText}>Prendre une photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                  <Ionicons name="images-outline" size={24} color={colors.primary} />
                  <Text style={styles.photoBtnText}>Depuis la galerie</Text>
                </TouchableOpacity>
              </View>
            )}
          </Section>

          {/* Measurements */}
          <Section
            title="Mensurations"
            icon="body-outline"
            action={
              <TouchableOpacity onPress={() => setShowMeasurements(v => !v)}>
                <Ionicons name={showMeasurements ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
              </TouchableOpacity>
            }
          >
            {showMeasurements && (
              <View style={styles.measureGrid}>
                {measureFields.map(f => (
                  <View key={f.key} style={styles.measureField}>
                    <Text style={styles.measureLabel}>{f.label}</Text>
                    <TextInput
                      style={styles.measureInput}
                      value={measurements[f.key] !== undefined ? String(measurements[f.key]) : ''}
                      onChangeText={v => updateMeasurement(f.key, v)}
                      keyboardType="decimal-pad"
                      placeholder="—"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                ))}
              </View>
            )}
            {!showMeasurements && (
              <TouchableOpacity onPress={() => setShowMeasurements(true)} style={styles.expandHint}>
                <Text style={styles.expandHintText}>Touche pour saisir les mensurations</Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* Notes */}
          <Section title="Ressenti / Notes" icon="chatbubble-outline">
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Comment tu te sens cette semaine ? Motivé ? Fatigué ? Notes tes impressions..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Section>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children, action }: { title: string; icon: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={sectionStyles.title}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.h3, color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: borderRadius.round,
  },
  saveBtnText: { ...typography.bodyBold, color: colors.text },
  content: { padding: spacing.md },

  // Weight
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  weightInput: {
    flex: 1, backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center',
  },
  weightUnit: { ...typography.h3, color: colors.textSecondary },

  // Feeling / Sleep
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around' },
  emojiBtn: {
    alignItems: 'center', padding: spacing.sm,
    borderRadius: borderRadius.md, borderWidth: 2, borderColor: 'transparent',
    flex: 1, marginHorizontal: 2,
  },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  emojiChar: { fontSize: 28 },
  emojiLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  feelingLabel: { ...typography.label, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },

  // Sleep
  sleepRow: { marginBottom: spacing.sm },
  sleepHoursRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sleepInput: {
    flex: 1, backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center',
  },
  sleepUnit: { ...typography.h3, color: colors.textSecondary },
  sleepQualityTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },

  // Photo
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  photoBtn: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary,
  },
  photoBtnText: { ...typography.caption, color: colors.primary, textAlign: 'center' },
  photoPreview: { width: '100%', height: 240, borderRadius: borderRadius.md },
  removePhotoBtn: { marginTop: spacing.sm, alignItems: 'center' },
  removePhotoText: { ...typography.label, color: colors.error },

  // Measurements
  measureGrid: { gap: spacing.sm },
  measureField: {},
  measureLabel: { ...typography.label, color: colors.textSecondary, marginBottom: 4 },
  measureInput: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    ...typography.body, color: colors.text,
  },
  expandHint: { alignItems: 'center' },
  expandHintText: { ...typography.caption, color: colors.textMuted },

  // Notes
  notesInput: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    padding: spacing.md, ...typography.body, color: colors.text, minHeight: 100,
  },
});
