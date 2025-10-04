import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

// Import navigation
import RootNavigator from './navigation/RootNavigator';

// Import context
import { SecurityProvider } from '../state/SecurityProvider';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SecurityProvider>
          <RootNavigator />
          <Toast />
        </SecurityProvider>
      </SafeAreaProvider>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
} 