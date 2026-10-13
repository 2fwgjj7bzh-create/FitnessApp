import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { useAuth } from '../lib/authContext';
import { exportBackup, pickBackup, restoreBackup, describeBackup } from '../lib/backup';
import { healthStatus, requestHealthAccess } from '../lib/health';
import { syncNeatFromHealth } from '../lib/neat';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert('Déconnexion', 'Tu vas être déconnecté.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: signOut },
    ]);
  }

  const email = user?.email ?? '—';
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const notify = (title: string, msg: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${msg}`); else Alert.alert(title, msg);
  };

  const hStatus = healthStatus();
  const healthLabel = hStatus === 'available' ? 'Disponible'
    : hStatus === 'expo-go' ? 'Indisponible dans Expo Go'
    : hStatus === 'not-ios' ? 'iPhone uniquement' : 'Indisponible';

  async function handleHealth() {
    if (hStatus !== 'available') {
      notify('Apple Santé', hStatus === 'expo-go'
        ? "Apple Santé ne fonctionne pas dans Expo Go. Il faut installer la version compilée de l'appli (EAS build). En attendant, saisis tes pas depuis l'accueil (carte NEAT)."
        : "Apple Santé n'est pas disponible sur cet appareil. Tu peux saisir tes pas depuis l'accueil (carte NEAT).");
      return;
    }
    const ok = await requestHealthAccess();
    const n = ok ? await syncNeatFromHealth(14).catch(() => 0) : 0;
    notify('Apple Santé', ok
      ? `${n} jour${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''}. Si rien n'apparaît, vérifie dans Santé › Partage › Apps que les pas et l'énergie active sont autorisés.`
      : "Accès refusé. Tu peux l'autoriser dans Réglages › Santé › Accès aux données.");
  }

  async function handleExport() {
    setBusy('export');
    try {
      const summary = await exportBackup();
      notify('Sauvegarde prête', `${summary}\n\nEnregistre le fichier dans Fichiers ou iCloud Drive pour le garder en sécurité.`);
    } catch (e: any) {
      notify('Export impossible', e?.message ?? String(e));
    } finally { setBusy(null); }
  }

  async function handleImport() {
    setBusy('import');
    try {
      const backup = await pickBackup();
      if (!backup) return;
      const go = async () => {
        await restoreBackup(backup);
        notify('Données restaurées', 'Change d\'onglet (ou relance l\'appli) pour voir tes données.');
      };
      const msg = `Sauvegarde du ${backup.exportedAt.slice(0, 10)} : ${describeBackup(backup)}.\n\nElle REMPLACE toutes les données actuelles de l'appli.`;
      if (Platform.OS === 'web') { if (window.confirm(msg)) await go(); }
      else Alert.alert('Restaurer cette sauvegarde ?', msg, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Restaurer', style: 'destructive', onPress: go },
      ]);
    } catch (e: any) {
      notify('Import impossible', e?.message ?? String(e));
    } finally { setBusy(null); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profil</Text>

        {/* Logo */}
        <View style={styles.avatarSection}>
          <Image source={require('../../assets/logo-badge.png')} style={styles.logo} />
          {user && <Text style={styles.email}>{email}</Text>}
        </View>

        {/* Section compte */}
        <Text style={styles.sectionLabel}>COMPTE</Text>
        <View style={styles.card}>
          {user ? (
            <>
              <SettingsRow icon="mail-outline" label="Email" value={email} />
              <View style={styles.divider} />
              <SettingsRow icon="shield-checkmark-outline" label="Statut" value="Connecté" valueColor={colors.success} />
            </>
          ) : (
            <SettingsRow icon="phone-portrait-outline" label="Mode" value="Local (données sur ce téléphone)" />
          )}
        </View>

        {/* Santé */}
        <Text style={styles.sectionLabel}>APPLE SANTÉ (NEAT)</Text>
        <View style={styles.card}>
          <SettingsRow icon="heart-outline" label="Connexion Santé" value={healthLabel}
            valueColor={hStatus === 'available' ? colors.success : undefined} onPress={handleHealth} />
        </View>

        {/* Données */}
        <Text style={styles.sectionLabel}>MES DONNÉES</Text>
        <View style={styles.card}>
          <SettingsRow icon="cloud-upload-outline" label="Exporter une sauvegarde" value={busy === 'export' ? '…' : 'JSON'} onPress={busy ? undefined : handleExport} />
          <View style={styles.divider} />
          <SettingsRow icon="cloud-download-outline" label="Restaurer une sauvegarde" value={busy === 'import' ? '…' : ''} onPress={busy ? undefined : handleImport} />
        </View>
        <Text style={styles.hint}>
          Tes données sont stockées sur ce téléphone. Exporte une sauvegarde régulièrement (Fichiers / iCloud Drive) : si l'appli est supprimée, c'est elle qui te permettra de tout récupérer.
        </Text>

        {/* Section app */}
        <Text style={styles.sectionLabel}>APPLICATION</Text>
        <View style={styles.card}>
          <SettingsRow icon="scale-outline" label="Unités" value="kg" />
          <View style={styles.divider} />
          <SettingsRow icon="language-outline" label="Langue" value="Français" />
        </View>

        {/* Déconnexion */}
        {user && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.signOutText}>Se déconnecter</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function SettingsRow({ icon, label, value, valueColor, onPress }: {
  icon: string; label: string; value: string; valueColor?: string; onPress?: () => void;
}) {
  const content = (
    <>
      <View style={rowStyles.iconWrap}>
        <Ionicons name={icon as any} size={18} color={colors.primaryLight} />
      </View>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, valueColor ? { color: valueColor } : {}]} numberOfLines={1}>{value}</Text>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </>
  );
  return onPress
    ? <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
    : <View style={rowStyles.row}>{content}</View>;
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: spacing.md, gap: spacing.md },
  iconWrap: { width: 32, height: 32, borderRadius: borderRadius.sm, backgroundColor: colors.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  label: { ...typography.body, color: colors.text, flex: 1 },
  value: { ...typography.caption, color: colors.textMuted, flexShrink: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingTop: spacing.lg },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.xl },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryMuted,
    borderWidth: 2, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  avatarLetter: { fontSize: 32, fontWeight: '700' as const, color: colors.primary },
  logo: { width: 96, height: 96, borderRadius: 48, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
  email: { ...typography.body, color: colors.textSecondary },
  sectionLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg },
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.cardBorder, ...shadows.sm, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.borderLight, marginLeft: spacing.md + 32 + spacing.md },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginTop: spacing.xl, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.error + '44', borderRadius: borderRadius.lg,
  },
  signOutText: { ...typography.bodyBold, color: colors.error },
});
