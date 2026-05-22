import React, { Component, ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { seedDefaultPrograms } from './src/storage';

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
  container: { flex: 1, backgroundColor: '#0F0F13', justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  msg: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: '#7c6ff7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: '#fff', fontWeight: '700' },
});

export default function App() {
  useEffect(() => { seedDefaultPrograms(); }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0F0F13" />
      <ErrorBoundary>
        <AppNavigator />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
