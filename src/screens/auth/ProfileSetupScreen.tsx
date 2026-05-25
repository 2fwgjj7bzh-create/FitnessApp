import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Gender, FitnessGoal, ActivityLevel, UserGoals } from '../../types';
import { saveProfile, saveGoals } from '../../storage';
import { calcGoalsFromProfile } from '../../utils/macroCalculator';
import { AuthContext } from '../../navigation/AppNavigator';

const TOTAL_STEPS = 7;

type FormData = {
  firstName: string;
  lastName: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  macroMode: 'auto' | 'manual';
  manualCalories: string;
  manualProtein: string;
  manualCarbs: string;
  manualFat: string;
};

const INITIAL: FormData = {
  firstName: '',
  lastName: '',
  age: 25,
  gender: 'male',
  heightCm: 175,
  weightKg: 75,
  goal: 'maintain',
  activityLevel: 'moderate',
  macroMode: 'auto',
  manualCalories: '',
  manualProtein: '',
  manualCarbs: '',
  manualFat: '',
};

const GOAL_LABELS: Record<FitnessGoal, { title: string; subtitle: string }> = {
  lose: { title: 'Perdre du poids', subtitle: 'Déficit de 500 kcal/jour' },
  maintain: { title: 'Me maintenir', subtitle: 'Équilibre calorique' },
  gain: { title: 'Prise de masse', subtitle: 'Surplus de 300 kcal/jour' },
};

const ACTIVITY_LABELS: Record<ActivityLevel, { title: string; subtitle: string }> = {
  sedentary: { title: 'Sédentaire', subtitle: 'Peu ou pas d\'exercice' },
  light: { title: 'Légèrement actif', subtitle: 'Sport 1–3 jours/semaine' },
  moderate: { title: 'Modérément actif', subtitle: 'Sport 3–5 jours/semaine' },
  active: { title: 'Très actif', subtitle: 'Sport 6–7 jours/semaine' },
  very_active: { title: 'Extrêmement actif', subtitle: 'Athlète, double entraînement' },
};

const STEP_TITLES: Record<number, { label: string; title: string }> = {
  1: { label: 'BIENVENUE', title: 'Comment tu t\'appelles ?' },
  2: { label: 'PROFIL', title: 'Ton genre et ton âge' },
  3: { label: 'MORPHOLOGIE', title: 'Taille et poids' },
  4: { label: 'OBJECTIF', title: 'Ton objectif principal' },
  5: { label: 'ACTIVITÉ', title: 'Ton niveau d\'activité' },
  6: { label: 'MACROS', title: 'Tes objectifs nutritionnels' },
  7: { label: 'RÉCAP', title: 'Tout est prêt !' },
};

export default function ProfileSetupScreen() {
  const { onSetupComplete } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function canProceed(): boolean {
    if (step === 1) return form.firstName.trim().length > 0;
    return true;
  }

  function calcAutoMacros(): UserGoals {
    return calcGoalsFromProfile({
      weightKg: form.weightKg,
      heightCm: form.heightCm,
      age: form.age,
      gender: form.gender,
      goal: form.goal,
      activityLevel: form.activityLevel,
    });
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      const macros = form.macroMode === 'auto'
        ? calcAutoMacros()
        : {
            calorieGoal: parseInt(form.manualCalories) || 2000,
            proteinGoal: parseInt(form.manualProtein) || 150,
            carbsGoal: parseInt(form.manualCarbs) || 200,
            fatGoal: parseInt(form.manualFat) || 70,
            workoutsPerWeek: 4,
            bodyWeight: form.weightKg,
            proteinMult: 2.0,
            fatMult: 0.4,
          };

      await saveProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        age: form.age,
        gender: form.gender,
        heightCm: form.heightCm,
        weightKg: form.weightKg,
        goal: form.goal,
        activityLevel: form.activityLevel,
        macroMode: form.macroMode,
        isSetupComplete: true,
      });
      await saveGoals(macros);
      onSetupComplete();
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      if (step === 6) {
        // Always ensure manual fields are populated before step 7
        const auto = calcAutoMacros();
        setForm(prev => ({
          ...prev,
          manualCalories: prev.manualCalories || String(auto.calorieGoal),
          manualProtein: prev.manualProtein || String(auto.proteinGoal),
          manualCarbs: prev.manualCarbs || String(auto.carbsGoal),
          manualFat: prev.manualFat || String(auto.fatGoal),
        }));
      }
      setStep(s => s + 1);
    } else {
      finish();
    }
  }

  const autoMacros = step >= 6 ? calcAutoMacros() : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.stepLabel}>{STEP_TITLES[step].label}</Text>
            <Text style={styles.stepTitle}>{STEP_TITLES[step].title}</Text>
            <Text style={styles.stepCounter}>{step} / {TOTAL_STEPS}</Text>
          </View>

          {/* Step content */}
          {step === 1 && <Step1 form={form} update={update} />}
          {step === 2 && <Step2 form={form} update={update} />}
          {step === 3 && <Step3 form={form} update={update} />}
          {step === 4 && <Step4 form={form} update={update} />}
          {step === 5 && <Step5 form={form} update={update} />}
          {step === 6 && autoMacros && <Step6 form={form} update={update} setForm={setForm} macros={autoMacros} />}
          {step === 7 && autoMacros && <Step7 form={form} macros={form.macroMode === 'auto' ? autoMacros : {
            calorieGoal: parseInt(form.manualCalories) || 0,
            proteinGoal: parseInt(form.manualProtein) || 0,
            carbsGoal: parseInt(form.manualCarbs) || 0,
            fatGoal: parseInt(form.manualFat) || 0,
            workoutsPerWeek: 4,
            bodyWeight: form.weightKg,
            proteinMult: 2,
            fatMult: 0.4,
          }} />}
        </ScrollView>

        {/* Footer navigation */}
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep(s => s - 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.backBtnText}>← Retour</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled, step === 1 && styles.nextBtnFull]}
            onPress={handleNext}
            disabled={!canProceed() || saving}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>
              {step === TOTAL_STEPS ? (saving ? 'Enregistrement…' : 'COMMENCER') : 'CONTINUER'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Step 1 : Nom ──────────────────────────────────────────────────────────────

function Step1({ form, update }: StepProps) {
  return (
    <View style={styles.stepBody}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>PRÉNOM *</Text>
        <TextInput
          style={styles.textInput}
          value={form.firstName}
          onChangeText={v => update('firstName', v)}
          placeholder="Ex. Sofiane"
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>NOM <Text style={styles.optional}>(optionnel)</Text></Text>
        <TextInput
          style={styles.textInput}
          value={form.lastName}
          onChangeText={v => update('lastName', v)}
          placeholder="Ex. Dupont"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

// ─── Step 2 : Genre & Âge ────────────────────────────────────────────────────

function Step2({ form, update }: StepProps) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.sectionTitle}>GENRE</Text>
      <View style={styles.row}>
        <OptionCard
          label="HOMME"
          selected={form.gender === 'male'}
          onPress={() => update('gender', 'male')}
          flex
        />
        <OptionCard
          label="FEMME"
          selected={form.gender === 'female'}
          onPress={() => update('gender', 'female')}
          flex
        />
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>ÂGE</Text>
      <NumericStepper
        value={form.age}
        onChange={v => update('age', v)}
        step={1}
        min={13}
        max={80}
        unit="ans"
      />
    </View>
  );
}

// ─── Step 3 : Morphologie ─────────────────────────────────────────────────────

function Step3({ form, update }: StepProps) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.sectionTitle}>TAILLE</Text>
      <NumericStepper
        value={form.heightCm}
        onChange={v => update('heightCm', v)}
        step={1}
        min={140}
        max={220}
        unit="cm"
      />

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>POIDS</Text>
      <NumericStepper
        value={form.weightKg}
        onChange={v => update('weightKg', v)}
        step={0.5}
        min={35}
        max={250}
        unit="kg"
      />
    </View>
  );
}

// ─── Step 4 : Objectif ────────────────────────────────────────────────────────

function Step4({ form, update }: StepProps) {
  const goals: FitnessGoal[] = ['lose', 'maintain', 'gain'];
  return (
    <View style={styles.stepBody}>
      {goals.map(g => (
        <OptionCard
          key={g}
          label={GOAL_LABELS[g].title}
          description={GOAL_LABELS[g].subtitle}
          selected={form.goal === g}
          onPress={() => update('goal', g)}
        />
      ))}
    </View>
  );
}

// ─── Step 5 : Activité ────────────────────────────────────────────────────────

function Step5({ form, update }: StepProps) {
  const levels: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
  return (
    <View style={styles.stepBody}>
      {levels.map(l => (
        <OptionCard
          key={l}
          label={ACTIVITY_LABELS[l].title}
          description={ACTIVITY_LABELS[l].subtitle}
          selected={form.activityLevel === l}
          onPress={() => update('activityLevel', l)}
        />
      ))}
    </View>
  );
}

// ─── Step 6 : Macros ──────────────────────────────────────────────────────────

function Step6({
  form,
  update,
  setForm,
  macros,
}: StepProps & { setForm: React.Dispatch<React.SetStateAction<FormData>>; macros: UserGoals }) {
  function switchToManual() {
    setForm(prev => ({
      ...prev,
      macroMode: 'manual',
      manualCalories: prev.manualCalories || String(macros.calorieGoal),
      manualProtein: prev.manualProtein || String(macros.proteinGoal),
      manualCarbs: prev.manualCarbs || String(macros.carbsGoal),
      manualFat: prev.manualFat || String(macros.fatGoal),
    }));
  }

  return (
    <View style={styles.stepBody}>
      <Text style={styles.macroHint}>
        Basé sur ton profil, voici tes objectifs calculés automatiquement.
      </Text>

      <View style={styles.macroBanner}>
        <MacroRow label="Calories" value={macros.calorieGoal} unit="kcal" big />
        <View style={styles.macroGrid}>
          <MacroChip label="Protéines" value={macros.proteinGoal} unit="g" color="#1565C0" />
          <MacroChip label="Glucides" value={macros.carbsGoal} unit="g" color="#E65C00" />
          <MacroChip label="Lipides" value={macros.fatGoal} unit="g" color="#00875A" />
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>MODE</Text>
      <View style={styles.row}>
        <OptionCard
          label="AUTO"
          description="Recommandé"
          selected={form.macroMode === 'auto'}
          onPress={() => update('macroMode', 'auto')}
          flex
        />
        <OptionCard
          label="MANUEL"
          description="Personnaliser"
          selected={form.macroMode === 'manual'}
          onPress={switchToManual}
          flex
        />
      </View>

      {form.macroMode === 'manual' && (
        <View style={styles.manualGrid}>
          <ManualInput
            label="Calories"
            unit="kcal"
            value={form.manualCalories}
            onChange={v => update('manualCalories', v)}
          />
          <ManualInput
            label="Protéines"
            unit="g"
            value={form.manualProtein}
            onChange={v => update('manualProtein', v)}
          />
          <ManualInput
            label="Glucides"
            unit="g"
            value={form.manualCarbs}
            onChange={v => update('manualCarbs', v)}
          />
          <ManualInput
            label="Lipides"
            unit="g"
            value={form.manualFat}
            onChange={v => update('manualFat', v)}
          />
        </View>
      )}
    </View>
  );
}

// ─── Step 7 : Récapitulatif ───────────────────────────────────────────────────

function Step7({ form, macros }: { form: FormData; macros: UserGoals }) {
  const goalLabel = GOAL_LABELS[form.goal].title;
  const activityLabel = ACTIVITY_LABELS[form.activityLevel].title;

  return (
    <View style={styles.stepBody}>
      <View style={styles.summaryCard}>
        <SummaryRow icon="●" label={form.firstName + (form.lastName ? ' ' + form.lastName : '')} />
        <SummaryRow icon="●" label={`${form.age} ans · ${form.gender === 'male' ? 'Homme' : 'Femme'}`} />
        <SummaryRow icon="●" label={`${form.heightCm} cm · ${form.weightKg} kg`} />
        <SummaryRow icon="●" label={goalLabel} />
        <SummaryRow icon="●" label={activityLabel} />
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>TES MACROS QUOTIDIENNES</Text>
      <View style={styles.macroBanner}>
        <MacroRow label="Calories" value={macros.calorieGoal} unit="kcal" big />
        <View style={styles.macroGrid}>
          <MacroChip label="Protéines" value={macros.proteinGoal} unit="g" color="#1565C0" />
          <MacroChip label="Glucides" value={macros.carbsGoal} unit="g" color="#E65C00" />
          <MacroChip label="Lipides" value={macros.fatGoal} unit="g" color="#00875A" />
        </View>
      </View>

      <Text style={styles.recapNote}>
        Tu pourras modifier ces valeurs à tout moment dans les réglages.
      </Text>
    </View>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

type StepProps = {
  form: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
};

function NumericStepper({
  value,
  onChange,
  step,
  min,
  max,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  unit: string;
}) {
  function dec() {
    const next = Math.round((value - step) * 10) / 10;
    if (next >= min) onChange(next);
  }
  function inc() {
    const next = Math.round((value + step) * 10) / 10;
    if (next <= max) onChange(next);
  }
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepperBtn} onPress={dec} activeOpacity={0.7}>
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValue}>
        {value}
        <Text style={styles.stepperUnit}> {unit}</Text>
      </Text>
      <TouchableOpacity style={styles.stepperBtn} onPress={inc} activeOpacity={0.7}>
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function OptionCard({
  label,
  description,
  selected,
  onPress,
  flex,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  flex?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && styles.optionCardSelected, flex && { flex: 1 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
      {description && (
        <Text style={[styles.optionDesc, selected && styles.optionDescSelected]}>{description}</Text>
      )}
    </TouchableOpacity>
  );
}

function MacroRow({ label, value, unit, big }: { label: string; value: number; unit: string; big?: boolean }) {
  return (
    <View style={styles.macroRow}>
      <Text style={big ? styles.macroLabelBig : styles.macroLabel}>{label}</Text>
      <Text style={big ? styles.macroValueBig : styles.macroValue}>
        {value}
        <Text style={big ? styles.macroUnitBig : styles.macroUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function MacroChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={[styles.macroChip, { borderColor: color + '30' }]}>
      <Text style={[styles.macroChipValue, { color }]}>{value}<Text style={styles.macroChipUnit}> {unit}</Text></Text>
      <Text style={styles.macroChipLabel}>{label}</Text>
    </View>
  );
}

function ManualInput({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.manualField}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <View style={styles.manualInputRow}>
        <TextInput
          style={styles.manualInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          selectTextOnFocus
          returnKeyType="done"
        />
        <Text style={styles.manualUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function SummaryRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  stepLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  stepTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepCounter: {
    ...typography.caption,
    color: colors.textMuted,
  },
  stepBody: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  optional: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'none',
    fontWeight: '400',
    letterSpacing: 0,
  },
  textInput: {
    height: 52,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '300',
    lineHeight: 28,
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  stepperUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  optionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionLabel: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  optionLabelSelected: {
    color: '#FFFFFF',
  },
  optionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionDescSelected: {
    color: '#FFFFFF99',
  },
  macroHint: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  macroBanner: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  macroLabelBig: {
    ...typography.bodyBold,
    color: colors.text,
  },
  macroValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  macroValueBig: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  macroUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  macroUnitBig: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroChip: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    padding: spacing.sm,
    alignItems: 'center',
  },
  macroChipValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  macroChipUnit: {
    fontSize: 11,
    fontWeight: '400',
  },
  macroChipLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 2,
  },
  manualGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  manualField: {
    width: '47%',
    gap: spacing.xs,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  manualInput: {
    flex: 1,
    height: 48,
    ...typography.bodyBold,
    color: colors.text,
  },
  manualUnit: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryIcon: {
    fontSize: 6,
    color: colors.textMuted,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.text,
  },
  recapNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: {
    height: 56,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  nextBtn: {
    flex: 1,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnFull: {
    flex: 1,
  },
  nextBtnDisabled: {
    backgroundColor: colors.border,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
