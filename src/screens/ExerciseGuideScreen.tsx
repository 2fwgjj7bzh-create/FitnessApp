/**
 * Bibliothèque des exercices : fiches (muscles, consignes, erreurs) + références scientifiques
 * vérifiées (PubMed). Ouverte avec { exerciseName } → une fiche ; sans paramètre → la liste.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { WorkoutStackParamList } from '../types';
import { EXERCISE_GUIDE } from '../data/exerciseGuide';
import { REFERENCES, GENERAL_EVIDENCE, Reference } from '../data/references';
import { EXERCISE_DATABASE, MUSCLE_GROUPS } from '../data/exerciseDatabase';
import BodyMap from '../components/BodyMap';
import { getVideoLinks, setVideoLink, openVideo, searchDemo } from '../lib/videos';

type Nav = NativeStackNavigationProp<WorkoutStackParamList, 'ExerciseGuide'>;
type Route = RouteProp<WorkoutStackParamList, 'ExerciseGuide'>;

const openRef = (r: Reference) => Linking.openURL(`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`).catch(() => {});

function RefLine({ id, index }: { id: string; index?: number }) {
  const r = REFERENCES[id];
  if (!r) return null;
  return (
    <TouchableOpacity onPress={() => openRef(r)} style={styles.refRow} activeOpacity={0.7}>
      <Text style={styles.refText}>
        {index !== undefined ? `[${index}] ` : ''}<Text style={styles.refAuthors}>{r.authors} ({r.year}).</Text> {r.title}. <Text style={styles.refJournal}>{r.journal}.</Text>
      </Text>
      <Text style={styles.refLink}>PMID {r.pmid}{r.doi ? ` · DOI ${r.doi}` : ''}  ↗</Text>
    </TouchableOpacity>
  );
}

function VideoCard({ name }: { name: string }) {
  const [url, setUrl] = useState<string | undefined>();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState('');
  useEffect(() => { getVideoLinks().then(v => { setUrl(v[name]); setDraft(v[name] ?? ''); }); }, [name]);
  return (
    <View style={styles.card}>
      <Text style={styles.label}>VIDÉO DE DÉMONSTRATION</Text>
      {url && !edit && (
        <TouchableOpacity style={styles.videoBtn} onPress={() => openVideo(url)}>
          <Ionicons name="play-circle" size={22} color={colors.onPrimary} />
          <Text style={styles.videoBtnText}>Voir ma vidéo</Text>
        </TouchableOpacity>
      )}
      {edit ? (
        <>
          <TextInput
            style={styles.search} value={draft} onChangeText={setDraft} autoCapitalize="none" autoCorrect={false}
            placeholder="Colle le lien (YouTube, Instagram, Drive…)" placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity style={styles.videoBtn} onPress={async () => { await setVideoLink(name, draft); setUrl(draft.trim() || undefined); setEdit(false); }}>
            <Text style={styles.videoBtnText}>Enregistrer le lien</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.videoRow}>
          <TouchableOpacity style={styles.videoGhost} onPress={() => setEdit(true)}>
            <Ionicons name="link-outline" size={16} color={colors.primaryLight} />
            <Text style={styles.videoGhostText}>{url ? 'Modifier ma vidéo' : 'Ajouter ma vidéo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.videoGhost} onPress={() => searchDemo(name)}>
            <Ionicons name="logo-youtube" size={16} color={colors.primaryLight} />
            <Text style={styles.videoGhostText}>Chercher une démo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Guide({ name }: { name: string }) {
  const g = EXERCISE_GUIDE[name];
  if (!g) return <><VideoCard name={name} /><Text style={styles.empty}>Pas encore de fiche pour cet exercice.</Text></>;
  const refIds = Array.from(new Set(g.evidence.flatMap(e => e.refs)));
  const num = (id: string) => refIds.indexOf(id) + 1;
  return (
    <>
      <VideoCard name={name} />
      <View style={styles.card}>
        <Text style={styles.label}>MUSCLES</Text>
        <Text style={styles.body}><Text style={styles.strong}>Principaux : </Text>{g.primary.join(', ')}</Text>
        {g.secondary.length > 0 && <Text style={styles.body}><Text style={styles.strong}>Secondaires : </Text>{g.secondary.join(', ')}</Text>}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>EXÉCUTION</Text>
        {g.cues.map((c, i) => <Text key={i} style={styles.bullet}>•  {c}</Text>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>ERREURS FRÉQUENTES</Text>
        {g.errors.map((c, i) => <Text key={i} style={styles.bullet}>✕  {c}</Text>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>CE QUE DIT LA RECHERCHE</Text>
        {g.evidence.map((e, i) => (
          <Text key={i} style={styles.bullet}>•  {e.text} <Text style={styles.cite}>{e.refs.map(r => `[${num(r)}]`).join('')}</Text></Text>
        ))}
        <View style={styles.sep} />
        {refIds.map(id => <RefLine key={id} id={id} index={num(id)} />)}
      </View>
    </>
  );
}

export default function ExerciseGuideScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const name = route.params?.exerciseName;
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('Tous');
  const [mode, setMode] = useState<'list' | 'body'>('list');

  const list = useMemo(() => {
    const names = Object.keys(EXERCISE_GUIDE);
    const groupOf = (n: string) => EXERCISE_DATABASE.find(e => e.name === n)?.muscleGroup ?? 'Autre';
    return names
      .filter(n => (group === 'Tous' || groupOf(n) === group) && n.toLowerCase().includes(search.toLowerCase()))
      .map(n => ({ name: n, group: groupOf(n), refs: new Set(EXERCISE_GUIDE[n].evidence.flatMap(e => e.refs)).size }));
  }, [search, group]);

  const groups = ['Tous', ...MUSCLE_GROUPS.filter(g => g !== 'Tous' && Object.keys(EXERCISE_GUIDE).some(n => EXERCISE_DATABASE.find(e => e.name === n)?.muscleGroup === g))];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{name ?? 'Bibliothèque'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {name ? <Guide name={name} /> : (
          <>
            <View style={styles.modeRow}>
              {(['list', 'body'] as const).map(m => (
                <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.chipActive]} onPress={() => setMode(m)}>
                  <Ionicons name={m === 'list' ? 'list' : 'body'} size={14} color={mode === m ? colors.onPrimary : colors.textSecondary} />
                  <Text style={[styles.chipText, mode === m && styles.chipTextActive]}>{m === 'list' ? 'Fiches' : 'Par muscle'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {mode === 'body' ? (
              <BodyMap
                actionLabel="Voir"
                onPressExercise={n => navigation.push('ExerciseGuide', { exerciseName: n })}
              />
            ) : (<>
            <View style={styles.card}>
              <Text style={styles.label}>PRINCIPES GÉNÉRAUX</Text>
              {GENERAL_EVIDENCE.map((e, i) => <Text key={i} style={styles.bullet}>•  {e.text}</Text>)}
              <View style={styles.sep} />
              {Array.from(new Set(GENERAL_EVIDENCE.flatMap(e => e.refs))).map(id => <RefLine key={id} id={id} />)}
            </View>

            <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Rechercher un exercice…" placeholderTextColor={colors.textMuted} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
              {groups.map(g => (
                <TouchableOpacity key={g} style={[styles.chip, group === g && styles.chipActive]} onPress={() => setGroup(g)}>
                  <Text style={[styles.chipText, group === g && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {list.map(item => (
              <TouchableOpacity key={item.name} style={styles.item} onPress={() => navigation.push('ExerciseGuide', { exerciseName: item.name })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemSub}>{item.group} · {item.refs} référence{item.refs > 1 ? 's' : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
            </>)}
            <Text style={styles.foot}>
              {Object.keys(EXERCISE_GUIDE).length} fiches · {Object.keys(REFERENCES).length} références vérifiées sur PubMed. Touche une référence pour l'ouvrir.
            </Text>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.h2, color: colors.text, flex: 1, textAlign: 'center' },
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.sm, gap: 6,
  },
  label: { ...typography.label, color: colors.primaryLight, marginBottom: 2 },
  body: { ...typography.body, color: colors.textSecondary },
  strong: { ...typography.bodyBold, color: colors.text },
  bullet: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  cite: { ...typography.caption, color: colors.primaryLight },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  refRow: { paddingVertical: 4 },
  refText: { ...typography.caption, color: colors.textSecondary },
  refAuthors: { ...typography.caption, color: colors.text },
  refJournal: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  refLink: { ...typography.tiny, color: colors.primaryLight, marginTop: 2 },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  videoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 12 },
  videoBtnText: { ...typography.bodyBold, color: colors.onPrimary },
  videoRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  videoGhost: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary + '66', borderRadius: borderRadius.md, paddingVertical: 10 },
  videoGhostText: { ...typography.caption, color: colors.primaryLight },
  modeRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 3, marginBottom: spacing.sm },
  modeBtn: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  search: {
    backgroundColor: colors.inputBg, borderRadius: borderRadius.md, padding: spacing.md,
    ...typography.body, color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
    borderColor: colors.border, marginRight: 6,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.onPrimary },
  item: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  itemName: { ...typography.bodyBold, color: colors.text },
  itemSub: { ...typography.caption, color: colors.textMuted },
  foot: { ...typography.tiny, color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
});
