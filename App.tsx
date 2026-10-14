import 'react-native-url-polyfill/auto'; // requis par Supabase en React Native
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import AppNavigator from './src/navigation/AppNavigator';

interface ErrorState { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errStyles.container}>
          <Text style={errStyles.title}>Oups, quelque chose s'est mal passé</Text>
          <Text style={errStyles.msg}>{this.state.error?.message}</Text>
          <TouchableOpacity style={errStyles.btn} onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={errStyles.btnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: '#F2F2F2', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  msg: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: '#C8102E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
  });
  // Si les polices ne chargent pas (réseau…), on démarre quand même avec la police système.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: '#0A0A0A' }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ErrorBoundary>
        <AppNavigator />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
