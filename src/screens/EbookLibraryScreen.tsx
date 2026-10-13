import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';
import type { Tables } from '../lib/supabase';

type Ebook = Tables<'ebooks'>;
type EbookWithEntitlement = Ebook & { owned: boolean };

// ─── Données de demo (affichées si Supabase n'est pas encore configuré) ────────
const DEMO_EBOOKS: EbookWithEntitlement[] = [
  {
    id: 'demo-1',
    titre: 'Powerbuilding Alpha',
    type: 'powerbuilding',
    description: 'Force + hypertrophie. 16 semaines pour gagner en force ET en masse musculaire. Squat, Bench, Deadlift + accessoires.',
    prix_stripe_id: null,
    couverture_url: null,
    pdf_url: null,
    niveau_cible: 'intermédiaire',
    duree_semaines: 16,
    frequence_hebdo: 4,
    is_published: true,
    created_at: new Date().toISOString(),
    owned: true,
  },
  {
    id: 'demo-2',
    titre: 'Hypertrophie Pure Vol.1',
    type: 'bodybuilding',
    description: 'Programme de bodybuilding scientifique basé sur la surcharge progressive et le volume hebdomadaire optimal.',
    prix_stripe_id: 'price_demo',
    couverture_url: null,
    pdf_url: null,
    niveau_cible: 'tous',
    duree_semaines: 12,
    frequence_hebdo: 5,
    is_published: true,
    created_at: new Date().toISOString(),
    owned: false,
  },
  {
    id: 'demo-3',
    titre: 'Débutant Fondations',
    type: 'powerbuilding',
    description: 'Le programme parfait pour poser des bases solides. Technique, patrons moteurs fondamentaux et progression linéaire.',
    prix_stripe_id: 'price_demo2',
    couverture_url: null,
    pdf_url: null,
    niveau_cible: 'débutant',
    duree_semaines: 8,
    frequence_hebdo: 3,
    is_published: true,
    created_at: new Date().toISOString(),
    owned: false,
  },
];

export default function EbookLibraryScreen() {
  const { user } = useAuth();
  const [ebooks, setEbooks] = useState<EbookWithEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'tous' | 'mes-programmes'>('tous');

  const load = useCallback(async () => {
    try {
      if (!user) {
        setEbooks(DEMO_EBOOKS);
        return;
      }

      // Récupère ebooks publiés + entitlements en parallèle
      const [ebooksRes, entitlementsRes] = await Promise.all([
        supabase.from('ebooks').select('*').eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('user_entitlements').select('ebook_id').eq('user_id', user.id),
      ]) as unknown as [
        { data: Ebook[] | null; error: { message: string } | null },
        { data: Array<{ ebook_id: string }> | null; error: unknown },
      ];

      if (ebooksRes.error || !ebooksRes.data?.length) {
        setEbooks(DEMO_EBOOKS);
        return;
      }

      const ownedIds = new Set((entitlementsRes.data ?? []).map(e => e.ebook_id));
      setEbooks(ebooksRes.data.map(e => ({ ...e, owned: ownedIds.has(e.id) })));
    } catch {
      setEbooks(DEMO_EBOOKS);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const owned = ebooks.filter(e => e.owned);
  const displayed = filter === 'mes-programmes' ? owned : ebooks;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Programmes</Text>
          <Text style={styles.subtitle}>{owned.length} débloqué{owned.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filterRow}>
        <FilterChip label="Tous" active={filter === 'tous'} onPress={() => setFilter('tous')} />
        <FilterChip label={`Mes programmes (${owned.length})`} active={filter === 'mes-programmes'} onPress={() => setFilter('mes-programmes')} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {displayed.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {filter === 'mes-programmes' ? 'Aucun programme débloqué' : 'Aucun programme disponible'}
            </Text>
            <Text style={styles.emptySub}>
              {filter === 'mes-programmes' ? 'Explore la bibliothèque et débloque ton premier programme.' : 'La bibliothèque sera bientôt disponible.'}
            </Text>
            {filter === 'mes-programmes' && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setFilter('tous')}>
                <Text style={styles.emptyBtnText}>Voir la bibliothèque</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayed.map(ebook => (
            <EbookCard key={ebook.id} ebook={ebook} />
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Ebook Card ───────────────────────────────────────────────────────────────

function EbookCard({ ebook }: { ebook: EbookWithEntitlement }) {
  const typeLabel = ebook.type === 'powerbuilding' ? 'POWERBUILDING' : 'BODYBUILDING';
  const typeColor = ebook.type === 'powerbuilding' ? colors.primaryLight : '#BDBDBD';

  return (
    <View style={[cardStyles.card, !ebook.owned && cardStyles.lockedCard]}>
      {/* Bandeau couleur + cover */}
      <View style={[cardStyles.coverBand, { backgroundColor: ebook.owned ? colors.primaryMuted : colors.locked }]}>
        {ebook.couverture_url ? (
          <Image source={{ uri: ebook.couverture_url }} style={cardStyles.coverImg} resizeMode="cover" />
        ) : (
          <View style={cardStyles.coverPlaceholder}>
            {ebook.owned
              ? <Ionicons name="barbell" size={36} color={colors.primary} />
              : <Ionicons name="lock-closed" size={32} color={colors.lockedText} />
            }
          </View>
        )}
        {/* Badge type */}
        <View style={[cardStyles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '55' }]}>
          <Text style={[cardStyles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
        </View>
      </View>

      {/* Contenu */}
      <View style={cardStyles.body}>
        <View style={cardStyles.titleRow}>
          <Text style={[cardStyles.title, !ebook.owned && cardStyles.lockedText]} numberOfLines={1}>
            {ebook.titre}
          </Text>
          {!ebook.owned && (
            <Ionicons name="lock-closed" size={14} color={colors.lockedText} style={{ marginLeft: 6 }} />
          )}
        </View>

        <Text style={cardStyles.description} numberOfLines={2}>{ebook.description}</Text>

        {/* Metadata */}
        <View style={cardStyles.metaRow}>
          {ebook.duree_semaines && (
            <MetaChip icon="calendar-outline" label={`${ebook.duree_semaines} sem.`} locked={!ebook.owned} />
          )}
          {ebook.frequence_hebdo && (
            <MetaChip icon="repeat-outline" label={`${ebook.frequence_hebdo}x/sem`} locked={!ebook.owned} />
          )}
          {ebook.niveau_cible && (
            <MetaChip icon="trending-up-outline" label={ebook.niveau_cible} locked={!ebook.owned} />
          )}
        </View>

        {/* CTA */}
        {ebook.owned ? (
          <View style={cardStyles.ownedActions}>
            <TouchableOpacity style={cardStyles.primaryAction}>
              <Ionicons name="play" size={16} color={colors.onPrimary} />
              <Text style={cardStyles.primaryActionText}>Démarrer le programme</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cardStyles.secondaryAction}>
              <Ionicons name="book-outline" size={16} color={colors.primary} />
              <Text style={cardStyles.secondaryActionText}>Lire l'ebook</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={cardStyles.unlockBtn}>
            <Ionicons name="lock-open-outline" size={16} color={colors.onPrimary} />
            <Text style={cardStyles.unlockBtnText}>Débloquer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function MetaChip({ icon, label, locked }: { icon: string; label: string; locked: boolean }) {
  return (
    <View style={[metaStyles.chip, locked && metaStyles.lockedChip]}>
      <Ionicons name={icon as any} size={11} color={locked ? colors.lockedText : colors.primary} />
      <Text style={[metaStyles.text, locked && metaStyles.lockedText]}>{label}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[filterStyles.chip, active && filterStyles.chipActive]}
      onPress={onPress}
    >
      <Text style={[filterStyles.text, active && filterStyles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const metaStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryMuted, borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  lockedChip: { backgroundColor: colors.locked },
  text: { ...typography.tiny, color: colors.primary },
  lockedText: { color: colors.lockedText },
});

const filterStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { ...typography.caption, color: colors.textSecondary },
  textActive: { color: colors.onPrimary, fontWeight: '700' as const },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.cardBorder,
    marginBottom: spacing.md, overflow: 'hidden', ...shadows.md,
  },
  lockedCard: { opacity: 0.85 },
  coverBand: { height: 120, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  coverImg: { width: '100%', height: '100%', position: 'absolute' },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  typeBadge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    borderRadius: borderRadius.round, borderWidth: 1,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  typeBadgeText: { ...typography.tiny, letterSpacing: 0.5 },
  body: { padding: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  title: { ...typography.h3, color: colors.text, flex: 1 },
  lockedText: { color: colors.textSecondary },
  description: { ...typography.caption, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  ownedActions: { flexDirection: 'row', gap: spacing.sm },
  primaryAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 12,
  },
  primaryActionText: { ...typography.bodyBold, color: colors.onPrimary, fontSize: 14 },
  secondaryAction: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md,
    paddingVertical: 12, paddingHorizontal: spacing.md,
  },
  secondaryActionText: { ...typography.bodyBold, color: colors.primary, fontSize: 14 },
  unlockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.locked, borderRadius: borderRadius.md, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  unlockBtnText: { ...typography.bodyBold, color: colors.text },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  content: { paddingHorizontal: spacing.md },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptySub: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
  emptyBtn: {
    marginTop: spacing.sm, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.round,
  },
  emptyBtnText: { ...typography.bodyBold, color: colors.onPrimary },
});
