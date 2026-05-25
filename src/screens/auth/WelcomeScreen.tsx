import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { AuthStackParamList } from '../../types';
import { saveProfile } from '../../storage';
import { AuthContext } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: Props) {
  const { onSetupComplete } = useContext(AuthContext);

  async function skipSetup() {
    await saveProfile({ firstName: '', isSetupComplete: true });
    onSetupComplete();
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Text style={styles.logoSymbol}>◆</Text>
          </View>
          <Text style={styles.appName}>FITNESS</Text>
          <Text style={styles.tagline}>
            Tracking minimal.{'\n'}Résultats maximaux.
          </Text>
        </View>

        <View style={styles.featureList}>
          <FeatureRow icon="●" text="Calcul automatique de tes macros" />
          <FeatureRow icon="●" text="Suivi nutrition & entraînements" />
          <FeatureRow icon="●" text="Bilan corporel hebdomadaire" />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('ProfileSetup')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>CRÉER MON PROFIL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={skipSetup}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>Continuer sans profil →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingTop: spacing.xxl * 1.5,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'flex-start',
  },
  logoMark: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoSymbol: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  appName: {
    ...typography.h1,
    color: colors.text,
    letterSpacing: 6,
    marginBottom: spacing.md,
  },
  tagline: {
    ...typography.h3,
    color: colors.textSecondary,
    fontWeight: '400',
    lineHeight: 28,
  },
  featureList: {
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureIcon: {
    fontSize: 8,
    color: colors.text,
  },
  featureText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  skipBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
