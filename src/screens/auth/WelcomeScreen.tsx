import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { AuthStackParamList } from '../../types';
import { useAuth } from '../../lib/authContext';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

type Mode = 'landing' | 'login' | 'register';

export default function WelcomeScreen({ navigation }: Props) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) Alert.alert('Connexion échouée', error);
  }

  async function handleSignUp() {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Champs invalides', 'Mot de passe min. 6 caractères.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      Alert.alert('Inscription échouée', error);
    } else {
      // Compte créé → configurer le profil
      navigation.navigate('ProfileSetup');
    }
  }

  if (mode === 'landing') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          {/* Logo + titre */}
          <View style={styles.hero}>
            <Image source={require('../../../assets/logo-badge.png')} style={styles.logoImg} />
            <Text style={styles.appName}>IRONLOG</Text>
            <Text style={styles.tagline}>
              Programme. Exécute.{'\n'}Progresse.
            </Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <FeatureRow text="Programmes ebooks exécutables" />
            <FeatureRow text="Logging ultra-rapide entre les séries" />
            <FeatureRow text="Détection PR automatique" />
            <FeatureRow text="Progression & analytics avancés" />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setMode('register')}>
              <Text style={styles.primaryBtnText}>CRÉER UN COMPTE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('login')}>
              <Text style={styles.secondaryBtnText}>J'ai déjà un compte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <TouchableOpacity style={styles.backRow} onPress={() => setMode('landing')}>
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>

          <Text style={styles.formTitle}>
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>MOT DE PASSE</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'register' ? 'Min. 6 caractères' : '••••••••'}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPass}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: spacing.lg }, loading && { opacity: 0.7 }]}
            onPress={mode === 'login' ? handleSignIn : handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.onPrimary} />
              : <Text style={styles.primaryBtnText}>{mode === 'login' ? 'SE CONNECTER' : 'CRÉER MON COMPTE'}</Text>
            }
          </TouchableOpacity>

          {/* Switch mode */}
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            <Text style={styles.switchText}>
              {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà inscrit ? Se connecter'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureDot} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Landing
  content: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between', paddingTop: spacing.xxl * 1.2, paddingBottom: spacing.xxl },
  hero: { alignItems: 'flex-start' },
  logoMark: {
    width: 52, height: 52, backgroundColor: colors.primary,
    borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
  },
  logoImg: { width: 96, height: 96, borderRadius: 48, marginBottom: spacing.lg },
  logoSymbol: { color: colors.onPrimary, fontSize: 24, fontWeight: '900' as const },
  appName: { ...typography.h1, color: colors.text, letterSpacing: 8, marginBottom: spacing.md },
  tagline: { ...typography.h3, color: colors.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 30 },
  features: { gap: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  featureText: { ...typography.body, color: colors.textSecondary },
  actions: { gap: spacing.md },
  primaryBtn: {
    backgroundColor: colors.primary, height: 56,
    borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center',
  },
  primaryBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '800' as const, letterSpacing: 2 },
  secondaryBtn: {
    height: 56, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  secondaryBtnText: { ...typography.bodyBold, color: colors.text },

  // Form
  formContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  backText: { ...typography.body, color: colors.textSecondary },
  formTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.xl },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    height: 52, backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, ...typography.body, color: colors.text,
    borderWidth: 1, borderColor: colors.border, marginBottom: 0,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyeBtn: {
    width: 52, height: 52, backgroundColor: colors.inputBg, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  switchBtn: { marginTop: spacing.lg, alignItems: 'center', padding: spacing.sm },
  switchText: { ...typography.body, color: colors.textMuted },
});
