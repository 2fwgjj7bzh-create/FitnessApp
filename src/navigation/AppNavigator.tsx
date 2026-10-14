import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { RootTabParamList, WorkoutStackParamList, BodyStackParamList, AuthStackParamList } from '../types';
import { AuthProvider, useAuth } from '../lib/authContext';

import DashboardScreen from '../screens/DashboardScreen';
import WorkoutListScreen from '../screens/WorkoutListScreen';
import WorkoutSessionScreen from '../screens/WorkoutSessionScreen';
import CreateProgramScreen from '../screens/CreateProgramScreen';
import ExerciseHistoryScreen from '../screens/ExerciseHistoryScreen';
import WeeklyScheduleScreen from '../screens/WeeklyScheduleScreen';
import ExerciseGuideScreen from '../screens/ExerciseGuideScreen';
import StatsScreen from '../screens/StatsScreen';
import NutritionScreen from '../screens/NutritionScreen';
import BodyListScreen from '../screens/BodyListScreen';
import NewCheckinScreen from '../screens/NewCheckinScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CheckinCompareScreen from '../screens/CheckinCompareScreen';
import CheckinSettingsScreen from '../screens/CheckinSettingsScreen';
import { getCheckins } from '../storage';
import { rescheduleCheckinNotifications } from '../lib/checkin';
import EbookLibraryScreen from '../screens/EbookLibraryScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

// ─── Navigators ───────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<RootTabParamList>();
const WorkoutStack = createNativeStackNavigator<WorkoutStackParamList>();
const BodyStack = createNativeStackNavigator<BodyStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator();

function WorkoutNavigator() {
  return (
    <WorkoutStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkoutStack.Screen name="WorkoutList"     component={WorkoutListScreen} />
      <WorkoutStack.Screen name="WorkoutSession"  component={WorkoutSessionScreen} />
      <WorkoutStack.Screen name="CreateProgram"   component={CreateProgramScreen} />
      <WorkoutStack.Screen name="ExerciseHistory" component={ExerciseHistoryScreen} />
      <WorkoutStack.Screen name="WeeklySchedule"  component={WeeklyScheduleScreen} />
      <WorkoutStack.Screen name="ExerciseGuide"   component={ExerciseGuideScreen} />
    </WorkoutStack.Navigator>
  );
}

function BodyNavigator() {
  return (
    <BodyStack.Navigator screenOptions={{ headerShown: false }}>
      <BodyStack.Screen name="BodyList"   component={BodyListScreen} />
      <BodyStack.Screen name="NewCheckin" component={NewCheckinScreen} />
      <BodyStack.Screen name="CheckinCompare" component={CheckinCompareScreen} />
      <BodyStack.Screen name="CheckinSettings" component={CheckinSettingsScreen} />
    </BodyStack.Navigator>
  );
}

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Dashboard:    { active: 'home',        inactive: 'home-outline' },
  ProgramsTab:  { active: 'library',     inactive: 'library-outline' },
  WorkoutTab:   { active: 'barbell',     inactive: 'barbell-outline' },
  NutritionTab: { active: 'nutrition',   inactive: 'nutrition-outline' },
  ProgressTab:  { active: 'stats-chart', inactive: 'stats-chart-outline' },
  ProfileTab:   { active: 'person',      inactive: 'person-outline' },
};

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' as const, marginTop: 2, letterSpacing: -0.3 },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarIcon: ({ focused, color, size }) => {
          const icon = TAB_ICONS[route.name];
          const name = (focused ? icon?.active : icon?.inactive) as any;
          // Onglet central (Entraînement) mis en avant avec fond or
          if (route.name === 'WorkoutTab') {
            return (
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: focused ? colors.primary : colors.surface,
                borderWidth: focused ? 0 : 1,
                borderColor: colors.border,
                justifyContent: 'center', alignItems: 'center',
                marginTop: -8,
              }}>
                <Ionicons name={name} size={22} color={focused ? colors.onPrimary : colors.textMuted} />
              </View>
            );
          }
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"   component={DashboardScreen}    options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="ProgramsTab" component={EbookLibraryScreen} options={{ tabBarLabel: 'Ebooks' }} />
      <Tab.Screen name="WorkoutTab"  component={WorkoutNavigator}   options={{ tabBarLabel: 'Séance' }} />
      <Tab.Screen name="NutritionTab" component={NutritionScreen}   options={{ tabBarLabel: 'Nutrition' }} />
      <Tab.Screen name="ProgressTab" component={StatsScreen}        options={{ tabBarLabel: 'Progrès' }} />
      <Tab.Screen name="ProfileTab"  component={ProfileScreen}      options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AuthStack.Screen name="Welcome"      component={WelcomeScreen} />
      <AuthStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Root : aiguillage Auth vs App ───────────────────────────────────────────

// Bypass temporaire demandé pour tester sans compte Supabase — repasser à false pour réactiver l'auth
const BYPASS_AUTH = true;

function RootNavigator() {
  const { session, loading } = useAuth();

  // Notifications de bilan : on recharge les prochaines à chaque ouverture
  React.useEffect(() => { getCheckins().then(c => rescheduleCheckinNotifications(c)).catch(() => {}); }, []);

  if (BYPASS_AUTH) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <RootStack.Screen name="Main" component={MainTabNavigator} />
        <RootStack.Screen name="Bilan" component={BodyNavigator} options={{ animation: 'slide_from_right' }} />
      </RootStack.Navigator>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {session ? (
        <>
          <RootStack.Screen name="Main" component={MainTabNavigator} />
          <RootStack.Screen name="Bilan" component={BodyNavigator} options={{ animation: 'slide_from_right' }} />
        </>
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

// Compat export — ProfileSetupScreen importe AuthContext depuis ici
export const AuthContext = React.createContext<{ onSetupComplete: () => void }>({
  onSetupComplete: () => {},
});
