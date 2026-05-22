import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { RootTabParamList, WorkoutStackParamList, BodyStackParamList } from '../types';

import DashboardScreen from '../screens/DashboardScreen';
import WorkoutListScreen from '../screens/WorkoutListScreen';
import WorkoutSessionScreen from '../screens/WorkoutSessionScreen';
import CreateProgramScreen from '../screens/CreateProgramScreen';
import ExerciseHistoryScreen from '../screens/ExerciseHistoryScreen';
import WeeklyScheduleScreen from '../screens/WeeklyScheduleScreen';
import NutritionScreen from '../screens/NutritionScreen';
import BodyListScreen from '../screens/BodyListScreen';
import NewCheckinScreen from '../screens/NewCheckinScreen';
import TimerScreen from '../screens/TimerScreen';
import StatsScreen from '../screens/StatsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const WorkoutStack = createNativeStackNavigator<WorkoutStackParamList>();
const BodyStack = createNativeStackNavigator<BodyStackParamList>();

function WorkoutNavigator() {
  return (
    <WorkoutStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkoutStack.Screen name="WorkoutList" component={WorkoutListScreen} />
      <WorkoutStack.Screen name="WorkoutSession" component={WorkoutSessionScreen} />
      <WorkoutStack.Screen name="CreateProgram" component={CreateProgramScreen} />
      <WorkoutStack.Screen name="ExerciseHistory" component={ExerciseHistoryScreen} />
      <WorkoutStack.Screen name="WeeklySchedule" component={WeeklyScheduleScreen} />
    </WorkoutStack.Navigator>
  );
}

function BodyNavigator() {
  return (
    <BodyStack.Navigator screenOptions={{ headerShown: false }}>
      <BodyStack.Screen name="BodyList" component={BodyListScreen} />
      <BodyStack.Screen name="NewCheckin" component={NewCheckinScreen} />
    </BodyStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
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
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 2,
          },
          tabBarIcon: ({ focused, color, size }) => {
            const icons: Record<string, { active: string; inactive: string }> = {
              Dashboard: { active: 'home', inactive: 'home-outline' },
              WorkoutTab: { active: 'barbell', inactive: 'barbell-outline' },
              NutritionTab: { active: 'nutrition', inactive: 'nutrition-outline' },
              BodyTab: { active: 'body', inactive: 'body-outline' },
              StatsTab: { active: 'stats-chart', inactive: 'stats-chart-outline' },
            };
            const icon = icons[route.name];
            const name = (focused ? icon?.active : icon?.inactive) as any;
            return <Ionicons name={name} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Accueil' }} />
        <Tab.Screen name="WorkoutTab" component={WorkoutNavigator} options={{ tabBarLabel: 'Workout' }} />
        <Tab.Screen name="NutritionTab" component={NutritionScreen} options={{ tabBarLabel: 'Nutrition' }} />
        <Tab.Screen name="BodyTab" component={BodyNavigator} options={{ tabBarLabel: 'Bilan' }} />
        <Tab.Screen name="StatsTab" component={StatsScreen} options={{ tabBarLabel: 'Stats' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
