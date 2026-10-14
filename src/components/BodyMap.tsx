/**
 * Mannequin anatomique (face / dos) : on touche une zone → muscles → exercices.
 * Dessin original, stylisé, aux couleurs de la charte.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import Svg, { Path, Ellipse, Rect, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { ZONES, ZoneId, MuscleDef, exercisesFor } from '../data/muscleMap';
import { EXERCISE_GUIDE } from '../data/exerciseGuide';

const SKIN = '#1C1C1C';
const MUSCLE = '#3A3A3A';
const STROKE = '#0A0A0A';
const ACTIVE = colors.primary;

type Shape =
  | { k: 'path'; d: string }
  | { k: 'ell'; cx: number; cy: number; rx: number; ry: number }
  | { k: 'rect'; x: number; y: number; w: number; h: number; r: number };

// Formes du côté gauche de l'image (droite du corps) — dupliquées en miroir.
const FRONT: { zone: ZoneId; shapes: Shape[]; center?: boolean }[] = [
  { zone: 'delts_front', shapes: [{ k: 'ell', cx: 60, cy: 84, rx: 12, ry: 12 }] },
  { zone: 'pecs', shapes: [{ k: 'path', d: 'M99,70 L74,74 Q65,84 70,101 Q84,112 99,108 Z' }] },
  { zone: 'biceps', shapes: [{ k: 'ell', cx: 50, cy: 117, rx: 8, ry: 18 }] },
  { zone: 'forearms', shapes: [{ k: 'ell', cx: 43, cy: 180, rx: 7, ry: 22 }] },
  { zone: 'abs', center: true, shapes: [{ k: 'rect', x: 88, y: 112, w: 24, h: 78, r: 6 }] },
  { zone: 'obliques', shapes: [{ k: 'path', d: 'M86,113 L75,113 Q70,150 77,188 L86,190 Z' }] },
  { zone: 'quads', shapes: [{ k: 'ell', cx: 81, cy: 250, rx: 13, ry: 38 }] },
  { zone: 'adductors', shapes: [{ k: 'path', d: 'M98,214 Q91,242 95,272 L99,272 L99,214 Z' }] },
  { zone: 'tibialis', shapes: [{ k: 'ell', cx: 78, cy: 336, rx: 6, ry: 28 }] },
];

const BACK: { zone: ZoneId; shapes: Shape[]; center?: boolean }[] = [
  { zone: 'traps', center: true, shapes: [{ k: 'path', d: 'M100,56 L79,73 L100,120 L121,73 Z' }] },
  { zone: 'delts_rear', shapes: [{ k: 'ell', cx: 60, cy: 84, rx: 12, ry: 12 }] },
  { zone: 'lats', shapes: [{ k: 'path', d: 'M97,104 L77,96 Q66,112 72,142 Q84,166 97,174 Z' }] },
  { zone: 'triceps', shapes: [{ k: 'ell', cx: 50, cy: 117, rx: 8, ry: 18 }] },
  { zone: 'forearms', shapes: [{ k: 'ell', cx: 43, cy: 180, rx: 7, ry: 22 }] },
  { zone: 'lowerback', center: true, shapes: [{ k: 'rect', x: 90, y: 150, w: 20, h: 44, r: 6 }] },
  { zone: 'glutes', shapes: [{ k: 'ell', cx: 86, cy: 214, rx: 14, ry: 16 }] },
  { zone: 'hamstrings', shapes: [{ k: 'ell', cx: 83, cy: 264, rx: 12, ry: 32 }] },
  { zone: 'calves', shapes: [{ k: 'ell', cx: 82, cy: 332, rx: 10, ry: 26 }] },
];

// Silhouette (côté gauche, dupliquée en miroir)
const SILHOUETTE_SIDE = [
  'M100,60 L78,64 Q52,70 48,92 L50,150 Q54,172 64,188 L66,206 L100,208 Z',                    // tronc
  'M52,76 Q38,84 39,112 L37,150 Q39,160 49,160 Q58,158 60,148 L62,100 Z',                       // bras
  'M38,156 L31,212 Q33,222 42,222 Q49,220 50,210 L56,158 Z',                                    // avant-bras
  'M66,200 Q58,242 67,292 Q76,300 88,298 Q98,292 99,252 L100,206 Z',                             // cuisse
  'M70,296 Q65,340 74,392 L90,392 Q97,340 94,296 Z',                                            // jambe
];

function ShapeEl({ s, fill, onPress }: { s: Shape; fill: string; onPress?: () => void }) {
  const common = { fill, stroke: STROKE, strokeWidth: 1.2, onPress } as any;
  if (s.k === 'path') return <Path d={s.d} {...common} />;
  if (s.k === 'ell') return <Ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />;
  return <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...common} />;
}

export default function BodyMap({ onPressExercise, actionLabel = 'Ajouter' }: { onPressExercise: (name: string) => void; actionLabel?: string }) {
  const { width } = useWindowDimensions();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [zone, setZone] = useState<ZoneId | null>(null);
  const [muscle, setMuscle] = useState<MuscleDef | null>(null);

  const layers = view === 'front' ? FRONT : BACK;
  const zoneDef = ZONES.find(z => z.id === zone);
  const svgW = Math.min(width - spacing.md * 4, 210);
  const exercises = useMemo(() => (muscle ? exercisesFor(muscle) : []), [muscle]);

  const pickZone = (z: ZoneId) => {
    setZone(z);
    const def = ZONES.find(x => x.id === z);
    setMuscle(def && def.muscles.length === 1 ? def.muscles[0] : null);
  };

  const mirrorT = 'translate(200,0) scale(-1,1)';
  const muscles = (mirror: boolean) => layers.filter(l => !l.center).map(l => l.shapes.map((s, i) => (
    <ShapeEl key={`${mirror ? 'm' : 'n'}-${l.zone}-${i}`} s={s} fill={zone === l.zone ? ACTIVE : MUSCLE} onPress={() => pickZone(l.zone)} />
  )));

  return (
    <View>
      <View style={styles.tabs}>
        {(['front', 'back'] as const).map(v => (
          <TouchableOpacity key={v} style={[styles.tab, view === v && styles.tabActive]} onPress={() => { setView(v); setZone(null); setMuscle(null); }}>
            <Text style={[styles.tabText, view === v && styles.tabTextActive]}>{v === 'front' ? 'Face' : 'Dos'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.svgWrap}>
        <Svg width={svgW} height={svgW * 2.05} viewBox="0 0 200 410">
          <Ellipse cx={100} cy={30} rx={17} ry={21} fill={SKIN} stroke={STROKE} />
          <Rect x={92} y={48} width={16} height={14} fill={SKIN} />
          {SILHOUETTE_SIDE.map((d, i) => <Path key={`s${i}`} d={d} fill={SKIN} stroke={STROKE} strokeWidth={1} />)}
          <G transform={mirrorT}>{SILHOUETTE_SIDE.map((d, i) => <Path key={`sm${i}`} d={d} fill={SKIN} stroke={STROKE} strokeWidth={1} />)}</G>
          {muscles(false)}
          <G transform={mirrorT}>{muscles(true)}</G>
          {layers.filter(l => l.center).map(l => l.shapes.map((s, i) => (
            <ShapeEl key={`c-${l.zone}-${i}`} s={s} fill={zone === l.zone ? ACTIVE : MUSCLE} onPress={() => pickZone(l.zone)} />
          )))}
          <Ellipse cx={82} cy={398} rx={12} ry={6} fill={SKIN} />
          <Ellipse cx={118} cy={398} rx={12} ry={6} fill={SKIN} />
        </Svg>
        {!zone && <Text style={styles.hint}>Touche une zone du corps</Text>}
      </View>

      {zoneDef && (
        <View style={styles.panel}>
          <Text style={styles.zoneTitle}>{zoneDef.label}</Text>
          {zoneDef.muscles.length > 1 && (
            <View style={styles.muscles}>
              {zoneDef.muscles.map(m => (
                <TouchableOpacity key={m.name} style={[styles.muscle, muscle?.name === m.name && styles.muscleActive]} onPress={() => setMuscle(m)}>
                  <Text style={[styles.muscleText, muscle?.name === m.name && styles.muscleTextActive]}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {muscle && (
            <>
              <Text style={styles.info}>{muscle.info}</Text>
              {exercises.map(e => (
                <TouchableOpacity key={e.name} style={styles.ex} onPress={() => onPressExercise(e.name)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{e.name}</Text>
                    <Text style={styles.exSub}>{e.equipment}{EXERCISE_GUIDE[e.name] ? ' · fiche + études' : ''}</Text>
                  </View>
                  <View style={styles.exBtn}>
                    <Text style={styles.exBtnText}>{actionLabel}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {exercises.length === 0 && <Text style={styles.info}>Aucun exercice dans la base pour ce muscle.</Text>}
            </>
          )}
          {!muscle && zoneDef.muscles.length > 1 && <Text style={styles.info}>Choisis un muscle pour voir les exercices.</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4, marginBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.bodyBold, color: colors.textSecondary },
  tabTextActive: { color: colors.onPrimary },
  svgWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  panel: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, marginTop: spacing.sm },
  zoneTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  muscles: { gap: 6, marginBottom: spacing.sm },
  muscle: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  muscleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  muscleText: { ...typography.body, color: colors.textSecondary },
  muscleTextActive: { color: colors.onPrimary },
  info: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  ex: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: spacing.sm },
  exName: { ...typography.bodyBold, color: colors.text },
  exSub: { ...typography.tiny, color: colors.textMuted },
  exBtn: { backgroundColor: colors.primaryMuted, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  exBtnText: { ...typography.caption, color: colors.primaryLight },
});
