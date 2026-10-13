import 'react-native-url-polyfill/auto'; // requis par Supabase en React Native
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
  btn: { backgroundColor: '#C9A84C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: '#0A0A0A', fontWeight: '700' },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0A0A0A" />
      <ErrorBoundary>
        <AppNavigator />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
