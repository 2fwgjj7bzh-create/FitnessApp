import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, PanResponder,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getNutritionDay, saveNutritionDay, getGoals, saveGoals } from '../storage';
import { uid } from '../utils/helpers';
import { NutritionDay, Food, MealType, UserGoals } from '../types';
import { FOOD_DB, FOOD_CATEGORIES, FoodEntry } from '../data/foodDatabase';

const MEAL_TYPES: MealType[] = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation'];
const MEAL_ICONS: Record<MealType, string> = {
  'Petit-déjeuner': '☀️', 'Déjeuner': '🌿', 'Dîner': '🌙', 'Collation': '⚡',
};

const DEFAULT_GOALS: UserGoals = {
  calorieGoal: 2000, proteinGoal: 160, carbsGoal: 200, fatGoal: 70,
  workoutsPerWeek: 4, bodyWeight: 80, proteinMult: 2.2, fatMult: 0.4,
};

function computeGoals(weight: number, kcal: number, pm: number, fm: number): UserGoals {
  const protein = Math.round(weight * pm);
  const fat = Math.round(weight * fm);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { ...DEFAULT_GOALS, bodyWeight: weight, calorieGoal: kcal, proteinGoal: protein, carbsGoal: carbs, fatGoal: fat, proteinMult: pm, fatMult: fm };
}

function sumMacros(foods: Food[]) {
  return foods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories * f.qty,
      protein: acc.protein + f.protein * f.qty,
      carbs: acc.carbs + f.carbs * f.qty,
      fat: acc.fat + f.fat * f.qty,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function shiftDate(date: string, delta: number): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}
function formatDateLabel(dateStr: string): string {
  if (dateStr === todayStr()) return "Aujourd'hui";
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── BMR Formulas ─────────────────────────────────────────────────────────────

const FORMULAS = [
  { id: 'mifflin', name: 'Mifflin-St Jeor', desc: 'Recommandée, la plus précise', requiresBf: false },
  { id: 'harris', name: 'Harris-Benedict', desc: 'Formule révisée classique', requiresBf: false },
  { id: 'katch', name: 'Katch-McArdle', desc: 'Utilise le % de masse grasse', requiresBf: true },
];

const ACTIVITY_LEVELS = [
  { label: 'Sédentaire', desc: 'Peu ou pas d\'exercice', mult: 1.2 },
  { label: 'Légèrement actif', desc: '1–3 séances/semaine', mult: 1.375 },
  { label: 'Modérément actif', desc: '3–5 séances/semaine', mult: 1.55 },
  { label: 'Très actif', desc: '6–7 séances/semaine', mult: 1.725 },
  { label: 'Athlète', desc: '2× par jour, sport intense', mult: 1.9 },
];

function calcBMR(formula: string, weight: number, height: number, age: number, sex: 'male' | 'female', bf: number): number {
  switch (formula) {
    case 'mifflin':
      return sex === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
    case 'harris':
      return sex === 'male'
        ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
        : 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
    case 'katch': {
      const lbm = weight * (1 - bf / 100);
      return 370 + 21.6 * lbm;
    }
    default: return 0;
  }
}

// ─── Custom Slider ────────────────────────────────────────────────────────────

const THUMB = 22;

interface SliderProps {
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void;
  color?: string;
  label?: string;
  formatValue?: (v: number) => string;
}

function CustomSlider({ min, max, step, value, onChange, color = colors.primary, label, formatValue }: SliderProps) {
  const trackRef = useRef<View>(null);
  const trackXRef = useRef(0);
  const trackWRef = useRef(300);
  const stateRef = useRef({ min, max, step, onChange });
  useEffect(() => { stateRef.current = { min, max, step, onChange }; }, [min, max, step, onChange]);

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const compute = (pageX: number) => {
    const { min, max, step, onChange } = stateRef.current;
    const ratio = Math.max(0, Math.min(1, (pageX - trackXRef.current) / trackWRef.current));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    onChange(parseFloat(Math.max(min, Math.min(max, stepped)).toFixed(4)));
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => compute(e.nativeEvent.pageX),
    onPanResponderMove: (e) => compute(e.nativeEvent.pageX),
  })).current;

  const displayed = formatValue ? formatValue(value) : String(parseFloat(value.toFixed(2)));

  return (
    <View style={slStyles.wrapper}>
      {label && (
        <View style={slStyles.labelRow}>
          <Text style={slStyles.label}>{label}</Text>
          <Text style={[slStyles.valueText, { color }]}>{displayed}</Text>
        </View>
      )}
      <View
        ref={trackRef}
        style={slStyles.track}
        onLayout={() => {
          trackRef.current?.measure((_x, _y, w, _h, px) => {
            trackXRef.current = px;
            trackWRef.current = w;
          });
        }}
        {...pan.panHandlers}
      >
        <View style={slStyles.trackBg} />
        <View style={[slStyles.trackFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        <View style={[slStyles.thumb, {
          left: `${pct * 100}%`,
          backgroundColor: color,
          transform: [{ translateX: -THUMB / 2 }],
        }]} />
      </View>
      <View style={slStyles.minMax}>
        <Text style={slStyles.minMaxText}>{formatValue ? formatValue(min) : min}</Text>
        <Text style={slStyles.minMaxText}>{formatValue ? formatValue(max) : max}</Text>
      </View>
    </View>
  );
}

const slStyles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { ...typography.label, color: colors.textSecondary },
  valueText: { ...typography.bodyBold, fontSize: 14 },
  track: {
    height: THUMB + 8,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    position: 'absolute', left: 0, right: 0,
    height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: (THUMB + 8) / 2 - 2.5,
  },
  trackFill: {
    position: 'absolute', left: 0,
    height: 5, borderRadius: 3,
    top: (THUMB + 8) / 2 - 2.5,
  },
  thumb: {
    position: 'absolute',
    width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    top: (THUMB + 8) / 2 - THUMB / 2,
    borderWidth: 3, borderColor: colors.background,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 5,
  },
  minMax: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  minMaxText: { ...typography.tiny, color: colors.textMuted },
});

// ─── Calorie Ring ─────────────────────────────────────────────────────────────

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const R = 52, stroke = 7;
  const circumference = 2 * Math.PI * R;
  const pct = Math.min(consumed / goal, 1);
  const over = consumed > goal;
  return (
    <Svg width={130} height={130}>
      <Circle cx={65} cy={65} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <Circle cx={65} cy={65} r={R} fill="none"
        stroke={over ? colors.error : colors.success} strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference - pct * circumference}
        strokeLinecap="round" transform="rotate(-90 65 65)"
      />
      <SvgText x={65} y={58} textAnchor="middle" fill={over ? colors.error : colors.text} fontSize={24} fontWeight="800">
        {Math.round(consumed)}
      </SvgText>
      <SvgText x={65} y={74} textAnchor="middle" fill={colors.textMuted} fontSize={11}>kcal</SvgText>
      <SvgText x={65} y={88} textAnchor="middle" fill={colors.textMuted} fontSize={10}>/ {goal}</SvgText>
    </Svg>
  );
}

// ─── Macro Bar ────────────────────────────────────────────────────────────────

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  const over = goal > 0 && value > goal;
  return (
    <View style={mbStyles.wrap}>
      <View style={mbStyles.row}>
        <Text style={mbStyles.label}>{label}</Text>
        <Text style={[mbStyles.val, over && { color: colors.error }]}>
          {Math.round(value)}<Text style={mbStyles.goal}>/{goal}g</Text>
        </Text>
      </View>
      <View style={mbStyles.bg}>
        <View style={[mbStyles.fill, { width: `${pct}%`, backgroundColor: over ? colors.error : color }]} />
      </View>
    </View>
  );
}
const mbStyles = StyleSheet.create({
  wrap: { marginBottom: 11 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  val: { fontSize: 13, fontWeight: '700', color: colors.text },
  goal: { color: colors.textMuted, fontWeight: '400' },
  bg: { height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ScreenTab = 'journal' | 'goals' | 'bmr';

export default function NutritionScreen() {
  const [date, setDate] = useState(todayStr());
  const [day, setDayState] = useState<NutritionDay | null>(null);
  const [goals, setGoals] = useState<UserGoals>(DEFAULT_GOALS);
  const [tab, setTab] = useState<ScreenTab>('journal');

  // Add food modal
  const [addModal, setAddModal] = useState<{ visible: boolean; mealId: string }>({ visible: false, mealId: '' });
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('Tout');
  const [selectedFood, setSelectedFood] = useState<FoodEntry | null>(null);
  const [qty, setQty] = useState(100);
  const [customMode, setCustomMode] = useState(false);
  const [custom, setCustom] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  // Goals sliders
  const [editWeight, setEditWeight] = useState('80');
  const [editCalories, setEditCalories] = useState('2000');
  const [editProteinMult, setEditProteinMult] = useState(2.2);
  const [editFatMult, setEditFatMult] = useState(0.4);

  // BMR state
  const [bmrAge, setBmrAge] = useState('25');
  const [bmrHeight, setBmrHeight] = useState('175');
  const [bmrSex, setBmrSex] = useState<'male' | 'female'>('male');
  const [bmrBf, setBmrBf] = useState('15');
  const [bmrFormula, setBmrFormula] = useState('mifflin');
  const [bmrActivity, setBmrActivity] = useState(1.55);
  const [bmrAdjust, setBmrAdjust] = useState(0); // -100 to +100 %

  const load = useCallback(async () => {
    const [d, g] = await Promise.all([getNutritionDay(date), getGoals()]);
    const loaded = { ...DEFAULT_GOALS, ...g } as UserGoals;
    setGoals(loaded);
    setEditWeight(String(loaded.bodyWeight ?? 80));
    setEditCalories(String(loaded.calorieGoal));
    setEditProteinMult(loaded.proteinMult ?? 2.2);
    setEditFatMult(loaded.fatMult ?? 0.4);
    if (d) {
      setDayState(d);
    } else {
      const newDay: NutritionDay = {
        id: uid(), date,
        meals: MEAL_TYPES.map(type => ({ id: uid(), type, foods: [], time: '' })),
        waterMl: 0,
      };
      setDayState(newDay);
    }
  }, [date]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const persistDay = async (updated: NutritionDay) => {
    setDayState(updated);
    await saveNutritionDay(updated);
  };

  const addFoodToMeal = async (entry: FoodEntry, amount: number) => {
    if (!day) return;
    const food: Food = {
      id: uid(), name: entry.name,
      calories: entry.calories, protein: entry.protein,
      carbs: entry.carbs, fat: entry.fat,
      qty: amount / 100, cat: entry.cat,
    };
    await persistDay({
      ...day,
      meals: day.meals.map(m => m.id === addModal.mealId ? { ...m, foods: [...m.foods, food] } : m),
    });
    closeModal();
  };

  const addCustomFood = async () => {
    if (!day || !custom.name) return;
    const food: Food = {
      id: uid(), name: custom.name,
      calories: parseFloat(custom.calories) || 0,
      protein: parseFloat(custom.protein) || 0,
      carbs: parseFloat(custom.carbs) || 0,
      fat: parseFloat(custom.fat) || 0,
      qty: 1,
    };
    await persistDay({
      ...day,
      meals: day.meals.map(m => m.id === addModal.mealId ? { ...m, foods: [...m.foods, food] } : m),
    });
    closeModal();
  };

  const removeFood = async (mealId: string, foodId: string) => {
    if (!day) return;
    await persistDay({
      ...day,
      meals: day.meals.map(m =>
        m.id === mealId ? { ...m, foods: m.foods.filter(f => f.id !== foodId) } : m
      ),
    });
  };

  const closeModal = () => {
    setAddModal({ visible: false, mealId: '' });
    setSearch(''); setSelectedFood(null); setQty(100);
    setCustomMode(false); setCustom({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  const updateWater = async (delta: number) => {
    if (!day) return;
    await persistDay({ ...day, waterMl: Math.max(0, (day.waterMl || 0) + delta) });
  };

  const applyGoals = async (w: number, kcal: number, pm: number, fm: number) => {
    const updated = computeGoals(w, kcal, pm, fm);
    setGoals(updated);
    await saveGoals(updated);
  };

  const applyBmrToGoals = async (finalKcal: number) => {
    const w = parseFloat(editWeight) || goals.bodyWeight;
    const updated = computeGoals(w, Math.round(finalKcal), editProteinMult, editFatMult);
    setGoals(updated);
    setEditCalories(String(Math.round(finalKcal)));
    await saveGoals(updated);
  };

  if (!day) return null;

  const allFoods = day.meals.flatMap(m => m.foods);
  const totals = sumMacros(allFoods);
  const filteredDB = FOOD_DB.filter(f =>
    (activeCat === 'Tout' || f.cat === activeCat) &&
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const TAB_LABELS: Record<ScreenTab, string> = {
    journal: 'Journal', goals: 'Objectifs', bmr: 'Métabolisme',
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition</Text>
        <View style={styles.tabRow}>
          {(['journal', 'goals', 'bmr'] as ScreenTab[]).map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{TAB_LABELS[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── JOURNAL ── */}
      {tab === 'journal' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date nav */}
          <View style={styles.dateNav}>
            <TouchableOpacity onPress={() => setDate(d => shiftDate(d, -1))} style={styles.dateArrow}>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.dateCenter}>
              <Text style={styles.dateLabel}>{formatDateLabel(date)}</Text>
              {date === todayStr() && <Text style={styles.todayBadge}>Aujourd'hui</Text>}
            </View>
            <TouchableOpacity onPress={() => setDate(d => shiftDate(d, 1))} style={styles.dateArrow} disabled={date === todayStr()}>
              <Ionicons name="chevron-forward" size={20} color={date === todayStr() ? colors.textMuted : colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <CalorieRing consumed={totals.calories} goal={goals.calorieGoal} />
            <View style={styles.macrosSide}>
              <Text style={styles.macrosDayLabel}>Macros du jour</Text>
              <MacroBar label="Protéines" value={totals.protein} goal={goals.proteinGoal} color="#a78bfa" />
              <MacroBar label="Glucides" value={totals.carbs} goal={goals.carbsGoal} color="#34d399" />
              <MacroBar label="Lipides" value={totals.fat} goal={goals.fatGoal} color="#fbbf24" />
            </View>
          </View>

          {/* Water */}
          <View style={styles.waterCard}>
            <Text style={styles.waterEmoji}>💧</Text>
            <Text style={styles.waterText}>
              {(day.waterMl || 0) >= 1000 ? `${((day.waterMl || 0) / 1000).toFixed(1)} L` : `${day.waterMl || 0} ml`}
            </Text>
            <View style={styles.waterBtns}>
              <TouchableOpacity style={styles.waterBtn} onPress={() => updateWater(-250)}>
                <Text style={styles.waterBtnText}>−250ml</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.waterBtn, { backgroundColor: '#64b5f615' }]} onPress={() => updateWater(250)}>
                <Text style={[styles.waterBtnText, { color: colors.info }]}>+250ml</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Meals */}
          {day.meals.map(meal => {
            const mealTotals = sumMacros(meal.foods);
            return (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealLeft}>
                    <Text style={styles.mealIcon}>{MEAL_ICONS[meal.type]}</Text>
                    <View>
                      <Text style={styles.mealTitle}>{meal.type}</Text>
                      {meal.foods.length > 0 && (
                        <Text style={styles.mealMacros}>
                          {Math.round(mealTotals.calories)} kcal · P:{Math.round(mealTotals.protein)}g · G:{Math.round(mealTotals.carbs)}g · L:{Math.round(mealTotals.fat)}g
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.mealAddBtn} onPress={() => setAddModal({ visible: true, mealId: meal.id })}>
                    <Ionicons name="add" size={20} color={colors.success} />
                  </TouchableOpacity>
                </View>
                {meal.foods.length === 0 ? (
                  <TouchableOpacity style={styles.emptyMeal} onPress={() => setAddModal({ visible: true, mealId: meal.id })}>
                    <Text style={styles.emptyMealText}>+ Ajouter un aliment</Text>
                  </TouchableOpacity>
                ) : (
                  meal.foods.map(food => (
                    <View key={food.id} style={styles.foodRow}>
                      <View style={styles.foodInfo}>
                        <Text style={styles.foodName}>
                          {food.name}<Text style={styles.foodQty}> ×{food.qty.toFixed(1)}</Text>
                        </Text>
                        <Text style={styles.foodMacros}>
                          {Math.round(food.calories * food.qty)} kcal · P:{Math.round(food.protein * food.qty)}g · G:{Math.round(food.carbs * food.qty)}g · L:{Math.round(food.fat * food.qty)}g
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFood(meal.id, food.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* ── OBJECTIFS ── */}
      {tab === 'goals' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={gStyles.card}>
            <Text style={gStyles.cardTitle}>Mes paramètres</Text>
            <View style={gStyles.inputRow}>
              <View style={gStyles.inputGroup}>
                <Text style={gStyles.inputLabel}>⚖️ Poids (kg)</Text>
                <TextInput
                  style={gStyles.input}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  keyboardType="decimal-pad"
                  placeholder="80"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={gStyles.inputGroup}>
                <Text style={gStyles.inputLabel}>🔥 Calories/jour</Text>
                <TextInput
                  style={[gStyles.input, { color: '#f59e0b' }]}
                  value={editCalories}
                  onChangeText={setEditCalories}
                  keyboardType="number-pad"
                  placeholder="2000"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Protein slider */}
          <View style={[gStyles.card, { borderColor: '#a78bfa30' }]}>
            <Text style={gStyles.cardTitle}>💪 Protéines</Text>
            <Text style={gStyles.formula}>
              {parseFloat(editWeight) || 80}kg × {editProteinMult.toFixed(1)} g/kg ={' '}
              <Text style={{ color: '#a78bfa', fontWeight: '700' }}>
                {Math.round((parseFloat(editWeight) || 80) * editProteinMult)}g
              </Text>
            </Text>
            <CustomSlider
              min={1.0} max={3.5} step={0.1}
              value={editProteinMult}
              onChange={setEditProteinMult}
              color="#a78bfa"
              label="Multiplicateur (g/kg de poids)"
              formatValue={v => `${v.toFixed(1)} g/kg`}
            />
          </View>

          {/* Fat slider */}
          <View style={[gStyles.card, { borderColor: '#fbbf2430' }]}>
            <Text style={gStyles.cardTitle}>🥑 Lipides</Text>
            <Text style={gStyles.formula}>
              {parseFloat(editWeight) || 80}kg × {editFatMult.toFixed(2)} g/kg ={' '}
              <Text style={{ color: '#fbbf24', fontWeight: '700' }}>
                {Math.round((parseFloat(editWeight) || 80) * editFatMult)}g
              </Text>
            </Text>
            <CustomSlider
              min={0.0} max={1.5} step={0.05}
              value={editFatMult}
              onChange={setEditFatMult}
              color="#fbbf24"
              label="Multiplicateur (g/kg de poids)"
              formatValue={v => `${v.toFixed(2)} g/kg`}
            />
          </View>

          {/* Carbs (derived) */}
          {(() => {
            const w = parseFloat(editWeight) || 80;
            const kcal = parseInt(editCalories) || 2000;
            const protKcal = Math.round(w * editProteinMult) * 4;
            const fatKcal = Math.round(w * editFatMult) * 9;
            const carbsKcal = Math.max(0, kcal - protKcal - fatKcal);
            const carbsG = Math.round(carbsKcal / 4);
            return (
              <View style={[gStyles.card, { borderColor: '#34d39930' }]}>
                <Text style={gStyles.cardTitle}>🌾 Glucides</Text>
                <Text style={gStyles.formula}>
                  Calories restantes après P + L :{' '}
                  <Text style={{ color: '#34d399', fontWeight: '700' }}>{carbsKcal} kcal</Text>
                </Text>
                <View style={gStyles.carbsBreakdown}>
                  <View style={gStyles.carbsRow}>
                    <Text style={gStyles.carbsItem}>🔥 Total</Text>
                    <Text style={[gStyles.carbsVal, { color: '#f59e0b' }]}>{kcal} kcal</Text>
                  </View>
                  <View style={gStyles.carbsRow}>
                    <Text style={gStyles.carbsItem}>💪 Protéines ({Math.round(w * editProteinMult)}g × 4)</Text>
                    <Text style={[gStyles.carbsVal, { color: '#a78bfa' }]}>− {protKcal} kcal</Text>
                  </View>
                  <View style={gStyles.carbsRow}>
                    <Text style={gStyles.carbsItem}>🥑 Lipides ({Math.round(w * editFatMult)}g × 9)</Text>
                    <Text style={[gStyles.carbsVal, { color: '#fbbf24' }]}>− {fatKcal} kcal</Text>
                  </View>
                  <View style={[gStyles.carbsRow, gStyles.carbsTotal]}>
                    <Text style={[gStyles.carbsItem, { color: '#34d399', fontWeight: '700' }]}>🌾 Glucides</Text>
                    <Text style={[gStyles.carbsVal, { color: '#34d399', fontWeight: '800', fontSize: 16 }]}>
                      {carbsG}g <Text style={{ fontSize: 12, fontWeight: '400', color: colors.textMuted }}>({carbsKcal} kcal)</Text>
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Preview */}
          {(() => {
            const p = computeGoals(parseFloat(editWeight) || 80, parseInt(editCalories) || 2000, editProteinMult, editFatMult);
            return (
              <View style={gStyles.previewCard}>
                <Text style={gStyles.previewTitle}>Récapitulatif journalier</Text>
                <View style={gStyles.previewRow}>
                  {[
                    { label: 'Calories', v: `${p.calorieGoal}`, unit: 'kcal', color: '#f59e0b' },
                    { label: 'Protéines', v: `${p.proteinGoal}`, unit: 'g', color: '#a78bfa' },
                    { label: 'Glucides', v: `${p.carbsGoal}`, unit: 'g', color: '#34d399' },
                    { label: 'Lipides', v: `${p.fatGoal}`, unit: 'g', color: '#fbbf24' },
                  ].map(item => (
                    <View key={item.label} style={gStyles.previewItem}>
                      <Text style={[gStyles.previewValue, { color: item.color }]}>{item.v}</Text>
                      <Text style={gStyles.previewUnit}>{item.unit}</Text>
                      <Text style={gStyles.previewLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          <TouchableOpacity
            style={gStyles.saveBtn}
            onPress={() => applyGoals(parseFloat(editWeight) || 80, parseInt(editCalories) || 2000, editProteinMult, editFatMult)}
          >
            <Ionicons name="checkmark" size={18} color={colors.text} />
            <Text style={gStyles.saveBtnText}>Sauvegarder</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── MÉTABOLISME ── */}
      {tab === 'bmr' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <BmrTab
            age={bmrAge} setAge={setBmrAge}
            height={bmrHeight} setHeight={setBmrHeight}
            sex={bmrSex} setSex={setBmrSex}
            weight={editWeight} setWeight={setEditWeight}
            bf={bmrBf} setBf={setBmrBf}
            formula={bmrFormula} setFormula={setBmrFormula}
            activity={bmrActivity} setActivity={setBmrActivity}
            adjust={bmrAdjust} setAdjust={setBmrAdjust}
            proteinMult={editProteinMult}
            fatMult={editFatMult}
            onApply={applyBmrToGoals}
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── MODAL AJOUT ALIMENT ── */}
      <Modal visible={addModal.visible} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={mStyles.overlay}>
            <View style={mStyles.sheet}>
              <View style={mStyles.handle} />
              <View style={mStyles.tabs}>
                {[{ id: false, label: 'Base aliments' }, { id: true, label: 'Personnalisé' }].map(({ id, label }) => (
                  <TouchableOpacity key={String(id)} style={[mStyles.tabBtn, customMode === id && mStyles.tabActive]}
                    onPress={() => { setCustomMode(id); setSelectedFood(null); }}>
                    <Text style={[mStyles.tabText, customMode === id && mStyles.tabActiveText]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!customMode ? (
                <>
                  <TextInput style={mStyles.searchInput} value={search} onChangeText={setSearch}
                    placeholder="Rechercher..." placeholderTextColor={colors.textMuted} autoFocus />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={mStyles.catScroll}>
                    {FOOD_CATEGORIES.map(cat => (
                      <TouchableOpacity key={cat} style={[mStyles.catChip, activeCat === cat && mStyles.catChipActive]} onPress={() => setActiveCat(cat)}>
                        <Text style={[mStyles.catChipText, activeCat === cat && mStyles.catChipTextActive]}>
                          {cat === 'Tout' ? 'Tout' : cat.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {selectedFood ? (
                    <View style={mStyles.qtyPanel}>
                      <Text style={mStyles.qtyName}>{selectedFood.name}</Text>
                      <Text style={mStyles.qtyBase}>
                        Base: {selectedFood.calories} kcal · P:{selectedFood.protein}g · G:{selectedFood.carbs}g · L:{selectedFood.fat}g
                      </Text>
                      <CustomSlider min={10} max={500} step={5} value={qty} onChange={setQty} color={colors.success}
                        label="Quantité (g / unité)" formatValue={v => `${v}g`} />
                      <Text style={mStyles.qtyPreview}>
                        → {Math.round(selectedFood.calories * qty / 100)} kcal · P:{Math.round(selectedFood.protein * qty / 100)}g · G:{Math.round(selectedFood.carbs * qty / 100)}g · L:{Math.round(selectedFood.fat * qty / 100)}g
                      </Text>
                      <View style={mStyles.qtyActions}>
                        <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setSelectedFood(null)}>
                          <Text style={mStyles.cancelText}>Retour</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={mStyles.addBtn} onPress={() => addFoodToMeal(selectedFood, qty)}>
                          <Text style={mStyles.addBtnText}>Ajouter</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <ScrollView style={mStyles.foodList} showsVerticalScrollIndicator={false}>
                      {filteredDB.slice(0, 60).map((item, i) => (
                        <TouchableOpacity key={i} style={mStyles.foodItem}
                          onPress={() => { setSelectedFood(item); setQty(100); }}>
                          <View style={{ flex: 1 }}>
                            <Text style={mStyles.foodItemName}>{item.name}</Text>
                            <Text style={mStyles.foodItemMacros}>
                              {item.calories} kcal · P:{item.protein}g · G:{item.carbs}g · L:{item.fat}g
                            </Text>
                          </View>
                          <Ionicons name="add-circle-outline" size={22} color={colors.success} />
                        </TouchableOpacity>
                      ))}
                      <View style={{ height: 20 }} />
                    </ScrollView>
                  )}
                </>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                  {(['name', 'calories', 'protein', 'carbs', 'fat'] as const).map(field => (
                    <View key={field} style={mStyles.customField}>
                      <Text style={mStyles.customLabel}>
                        {{ name: 'Nom', calories: 'Calories (kcal)', protein: 'Protéines (g)', carbs: 'Glucides (g)', fat: 'Lipides (g)' }[field]}
                      </Text>
                      <TextInput style={mStyles.customInput} value={custom[field]}
                        onChangeText={v => setCustom(p => ({ ...p, [field]: v }))}
                        keyboardType={field === 'name' ? 'default' : 'decimal-pad'}
                        placeholder={field === 'name' ? 'Nom de l\'aliment' : '0'}
                        placeholderTextColor={colors.textMuted} />
                    </View>
                  ))}
                  <TouchableOpacity style={[mStyles.addBtn, { marginTop: spacing.md }]} onPress={addCustomFood}>
                    <Text style={mStyles.addBtnText}>Ajouter</Text>
                  </TouchableOpacity>
                  <View style={{ height: 20 }} />
                </ScrollView>
              )}

              <TouchableOpacity style={mStyles.closeBtn} onPress={closeModal}>
                <Text style={mStyles.closeBtnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── BMR Tab ──────────────────────────────────────────────────────────────────

interface BmrTabProps {
  age: string; setAge: (v: string) => void;
  height: string; setHeight: (v: string) => void;
  sex: 'male' | 'female'; setSex: (v: 'male' | 'female') => void;
  weight: string; setWeight: (v: string) => void;
  bf: string; setBf: (v: string) => void;
  formula: string; setFormula: (v: string) => void;
  activity: number; setActivity: (v: number) => void;
  adjust: number; setAdjust: (v: number) => void;
  proteinMult: number;
  fatMult: number;
  onApply: (kcal: number) => void;
}

function BmrTab({ age, setAge, height, setHeight, sex, setSex, weight, setWeight, bf, setBf, formula, setFormula, activity, setActivity, adjust, setAdjust, proteinMult, fatMult, onApply }: BmrTabProps) {
  const w = parseFloat(weight) || 80;
  const h = parseFloat(height) || 175;
  const a = parseInt(age) || 25;
  const b = parseFloat(bf) || 15;

  const bmr = Math.round(calcBMR(formula, w, h, a, sex, b));
  const tdee = Math.round(bmr * activity);
  const adjusted = Math.round(tdee * (1 + adjust / 100));

  const protein = Math.round(w * proteinMult);
  const fat = Math.round(w * fatMult);
  const carbs = Math.max(0, Math.round((adjusted - protein * 4 - fat * 9) / 4));

  const adjustLabel = adjust === 0 ? 'Maintenance'
    : adjust < 0 ? `Déficit ${adjust}%` : `Surplus +${adjust}%`;
  const adjustColor = adjust === 0 ? colors.textSecondary
    : adjust < 0 ? '#f87171' : '#34d399';

  return (
    <>
      {/* Données physiques */}
      <View style={bmrStyles.card}>
        <Text style={bmrStyles.cardTitle}>📏 Données physiques</Text>

        {/* Sex */}
        <View style={bmrStyles.sexRow}>
          {(['male', 'female'] as const).map(s => (
            <TouchableOpacity key={s} style={[bmrStyles.sexBtn, sex === s && bmrStyles.sexBtnActive]} onPress={() => setSex(s)}>
              <Text style={[bmrStyles.sexText, sex === s && bmrStyles.sexTextActive]}>
                {s === 'male' ? '♂ Homme' : '♀ Femme'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={bmrStyles.inputRow}>
          <View style={bmrStyles.inputGroup}>
            <Text style={bmrStyles.inputLabel}>Âge</Text>
            <TextInput style={bmrStyles.input} value={age} onChangeText={setAge}
              keyboardType="number-pad" placeholder="25" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={bmrStyles.inputGroup}>
            <Text style={bmrStyles.inputLabel}>Taille (cm)</Text>
            <TextInput style={bmrStyles.input} value={height} onChangeText={setHeight}
              keyboardType="number-pad" placeholder="175" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={bmrStyles.inputGroup}>
            <Text style={bmrStyles.inputLabel}>Poids (kg)</Text>
            <TextInput style={bmrStyles.input} value={weight} onChangeText={setWeight}
              keyboardType="decimal-pad" placeholder="80" placeholderTextColor={colors.textMuted} />
          </View>
        </View>

        {formula === 'katch' && (
          <View style={bmrStyles.bfRow}>
            <Text style={bmrStyles.inputLabel}>% Masse grasse</Text>
            <TextInput style={[bmrStyles.input, { flex: 1 }]} value={bf} onChangeText={setBf}
              keyboardType="decimal-pad" placeholder="15" placeholderTextColor={colors.textMuted} />
            <Text style={bmrStyles.bfHint}> (LBM: {Math.round(w * (1 - b / 100))} kg)</Text>
          </View>
        )}
      </View>

      {/* Formule */}
      <View style={bmrStyles.card}>
        <Text style={bmrStyles.cardTitle}>🧮 Formule de calcul</Text>
        {FORMULAS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[bmrStyles.formulaBtn, formula === f.id && bmrStyles.formulaBtnActive]}
            onPress={() => setFormula(f.id)}
          >
            <View style={[bmrStyles.formulaRadio, formula === f.id && bmrStyles.formulaRadioActive]}>
              {formula === f.id && <View style={bmrStyles.formulaRadioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[bmrStyles.formulaName, formula === f.id && { color: colors.primary }]}>{f.name}</Text>
              <Text style={bmrStyles.formulaDesc}>{f.desc}{f.requiresBf ? ' ← plus précise si BF connu' : ''}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Activité */}
      <View style={bmrStyles.card}>
        <Text style={bmrStyles.cardTitle}>🏃 Niveau d'activité</Text>
        {ACTIVITY_LEVELS.map(al => (
          <TouchableOpacity
            key={al.mult}
            style={[bmrStyles.actBtn, activity === al.mult && bmrStyles.actBtnActive]}
            onPress={() => setActivity(al.mult)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[bmrStyles.actLabel, activity === al.mult && { color: colors.primary }]}>{al.label}</Text>
              <Text style={bmrStyles.actDesc}>{al.desc}</Text>
            </View>
            <Text style={[bmrStyles.actMult, activity === al.mult && { color: colors.primary }]}>×{al.mult}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Résultats intermédiaires */}
      <View style={bmrStyles.resultsCard}>
        <Text style={bmrStyles.cardTitle}>⚡ Résultats</Text>
        <View style={bmrStyles.resultRow}>
          <ResultBox label="MB (BMR)" value={`${bmr}`} unit="kcal" color={colors.textSecondary} />
          <ResultBox label="TDEE" value={`${tdee}`} unit="kcal" color={colors.primary} />
        </View>
      </View>

      {/* Ajustement déficit/surplus */}
      <View style={[bmrStyles.card, { borderColor: `${adjustColor}30` }]}>
        <View style={bmrStyles.adjustHeader}>
          <Text style={bmrStyles.cardTitle}>🎯 Ajustement calorique</Text>
          <Text style={[bmrStyles.adjustLabel, { color: adjustColor }]}>{adjustLabel}</Text>
        </View>
        <CustomSlider
          min={-50} max={50} step={5}
          value={adjust}
          onChange={setAdjust}
          color={adjust < 0 ? '#f87171' : adjust > 0 ? '#34d399' : colors.textSecondary}
          label="Déficit ← Maintenance → Surplus"
          formatValue={v => v === 0 ? '0% (maintenance)' : `${v > 0 ? '+' : ''}${v}%`}
        />
        <Text style={bmrStyles.adjustNote}>
          {adjust < 0
            ? `Déficit de ${Math.abs(adjust)}% → perte de poids`
            : adjust > 0
            ? `Surplus de ${adjust}% → prise de masse`
            : 'Maintenance — tu conserves ton poids actuel'}
        </Text>
      </View>

      {/* Résultat final */}
      <View style={bmrStyles.finalCard}>
        <Text style={bmrStyles.finalTitle}>Calories journalières finales</Text>
        <Text style={[bmrStyles.finalKcal, { color: adjustColor }]}>{adjusted} <Text style={bmrStyles.finalUnit}>kcal</Text></Text>

        <View style={bmrStyles.macroPreview}>
          {[
            { label: 'Protéines', value: protein, color: '#a78bfa' },
            { label: 'Glucides', value: carbs, color: '#34d399' },
            { label: 'Lipides', value: fat, color: '#fbbf24' },
          ].map(m => (
            <View key={m.label} style={bmrStyles.macroItem}>
              <Text style={[bmrStyles.macroVal, { color: m.color }]}>{m.value}g</Text>
              <Text style={bmrStyles.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
        <Text style={bmrStyles.macroNote}>Macros calculées depuis tes réglages Objectifs</Text>

        <TouchableOpacity style={bmrStyles.applyBtn} onPress={() => onApply(adjusted)}>
          <Ionicons name="checkmark-circle" size={20} color={colors.text} />
          <Text style={bmrStyles.applyBtnText}>Appliquer aux objectifs</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function ResultBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={bmrStyles.resultBox}>
      <Text style={bmrStyles.resultLabel}>{label}</Text>
      <Text style={[bmrStyles.resultValue, { color }]}>{value}</Text>
      <Text style={bmrStyles.resultUnit}>{unit}</Text>
    </View>
  );
}

const bmrStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  cardTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.md },
  sexRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  sexBtn: {
    flex: 1, paddingVertical: 10, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  sexBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  sexText: { ...typography.bodyBold, color: colors.textSecondary },
  sexTextActive: { color: colors.primary },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  inputGroup: { flex: 1 },
  inputLabel: { ...typography.tiny, color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 10,
    fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center',
  },
  bfRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  bfHint: { ...typography.caption, color: colors.textMuted },
  formulaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 12, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md, marginBottom: 6,
    borderWidth: 1, borderColor: 'transparent',
  },
  formulaBtnActive: { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}10` },
  formulaRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  formulaRadioActive: { borderColor: colors.primary },
  formulaRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  formulaName: { ...typography.bodyBold, color: colors.text },
  formulaDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  actBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md, marginBottom: 4,
    borderWidth: 1, borderColor: 'transparent',
  },
  actBtnActive: { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}10` },
  actLabel: { ...typography.label, color: colors.text },
  actDesc: { ...typography.tiny, color: colors.textSecondary, marginTop: 1 },
  actMult: { ...typography.bodyBold, color: colors.textMuted, fontSize: 13 },
  resultsCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder,
  },
  resultRow: { flexDirection: 'row', gap: spacing.sm },
  resultBox: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center',
  },
  resultLabel: { ...typography.tiny, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  resultValue: { fontSize: 24, fontWeight: '800' },
  resultUnit: { ...typography.caption, color: colors.textMuted },
  adjustHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  adjustLabel: { ...typography.bodyBold },
  adjustNote: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  finalCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', ...shadows.md,
  },
  finalTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  finalKcal: { fontSize: 48, fontWeight: '800', letterSpacing: -2 },
  finalUnit: { fontSize: 20, fontWeight: '400', color: colors.textSecondary },
  macroPreview: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg, marginBottom: spacing.sm },
  macroItem: { alignItems: 'center' },
  macroVal: { fontSize: 20, fontWeight: '700' },
  macroLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  macroNote: { ...typography.tiny, color: colors.textMuted, marginBottom: spacing.lg },
  applyBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.round,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  applyBtnText: { ...typography.bodyBold, color: '#FFFFFF', fontSize: 16 },
});

const gStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  cardTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  inputGroup: { flex: 1 },
  inputLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center',
  },
  formula: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  carbsBreakdown: {
    backgroundColor: 'rgba(52,211,153,0.05)', borderRadius: borderRadius.md,
    padding: spacing.sm, marginTop: spacing.xs,
  },
  carbsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  carbsItem: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  carbsVal: { ...typography.caption, color: colors.text, fontWeight: '600' },
  carbsTotal: {
    borderTopWidth: 1, borderTopColor: 'rgba(52,211,153,0.3)',
    marginTop: 4, paddingTop: 8,
  },
  previewCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder,
  },
  previewTitle: { ...typography.label, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  previewRow: { flexDirection: 'row', justifyContent: 'space-around' },
  previewItem: { alignItems: 'center' },
  previewValue: { fontSize: 22, fontWeight: '800' },
  previewUnit: { ...typography.tiny, color: colors.textMuted },
  previewLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.round, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  saveBtnText: { ...typography.bodyBold, color: '#FFFFFF' },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '88%',
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  tabs: { flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: borderRadius.md, padding: 3, marginBottom: spacing.md },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  tabText: { ...typography.label, color: colors.textSecondary },
  tabActiveText: { color: colors.text, fontWeight: '700' },
  searchInput: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    ...typography.body, color: colors.text, marginBottom: spacing.sm,
  },
  catScroll: { marginBottom: spacing.sm },
  catChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.card, borderRadius: borderRadius.round,
    borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { ...typography.caption, color: colors.textSecondary },
  catChipTextActive: { color: colors.text, fontWeight: '600' },
  foodList: { maxHeight: 320 },
  foodItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  foodItemName: { ...typography.label, color: colors.text },
  foodItemMacros: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  qtyPanel: { paddingTop: spacing.sm },
  qtyName: { ...typography.bodyBold, color: colors.text, marginBottom: 4 },
  qtyBase: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  qtyPreview: { ...typography.label, color: colors.success, textAlign: 'center', marginBottom: spacing.md },
  qtyActions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.round, padding: spacing.md, alignItems: 'center',
  },
  cancelText: { ...typography.bodyBold, color: colors.textSecondary },
  addBtn: {
    flex: 1, backgroundColor: colors.success, borderRadius: borderRadius.round, padding: spacing.md, alignItems: 'center',
  },
  addBtnText: { ...typography.bodyBold, color: '#0a0f1e' },
  customField: { marginBottom: spacing.sm },
  customLabel: { ...typography.label, color: colors.textSecondary, marginBottom: 4 },
  customInput: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    ...typography.body, color: colors.text,
  },
  closeBtn: {
    backgroundColor: colors.card, borderRadius: borderRadius.round, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  closeBtnText: { ...typography.bodyBold, color: colors.textSecondary },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  tabRow: {
    flexDirection: 'row', backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md, padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  tabText: { ...typography.label, color: colors.textSecondary, fontSize: 12 },
  tabTextActive: { color: colors.text, fontWeight: '700' },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder,
  },
  dateArrow: { padding: spacing.sm },
  dateCenter: { alignItems: 'center' },
  dateLabel: { ...typography.bodyBold, color: colors.text, textTransform: 'capitalize' },
  todayBadge: { ...typography.tiny, color: colors.success, fontWeight: '600', marginTop: 2 },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm,
  },
  macrosSide: { flex: 1 },
  macrosDayLabel: { ...typography.tiny, color: colors.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.md },
  waterCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder,
  },
  waterEmoji: { fontSize: 20 },
  waterText: { ...typography.bodyBold, color: colors.info, flex: 1 },
  waterBtns: { flexDirection: 'row', gap: spacing.sm },
  waterBtn: { paddingHorizontal: spacing.sm, paddingVertical: 5, backgroundColor: colors.surface, borderRadius: borderRadius.round },
  waterBtnText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  mealCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md,
  },
  mealLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mealIcon: { fontSize: 20 },
  mealTitle: { ...typography.bodyBold, color: colors.text },
  mealMacros: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  mealAddBtn: {
    width: 32, height: 32, borderRadius: 10,
    borderWidth: 1, borderColor: `${colors.success}50`, backgroundColor: `${colors.success}15`,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyMeal: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  emptyMealText: { ...typography.caption, color: colors.textMuted },
  foodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  foodInfo: { flex: 1 },
  foodName: { ...typography.label, color: colors.text },
  foodQty: { color: colors.textMuted, fontWeight: '400' },
  foodMacros: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
});
