import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

// Import screens
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import VulnerabilityScreen from './src/screens/VulnerabilityScreen';
import NetworkTrafficScreen from './src/screens/NetworkTrafficScreen';
import AppMonitorScreen from './src/screens/AppMonitorScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SecurityReportScreen from './src/screens/SecurityReportScreen';
import AIChatScreen from './src/screens/AIChatScreen';

// Import components
import TabBarIcon from './src/components/TabBarIcon';
import { SecurityProvider } from './src/state/SecurityProvider';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'Vulnerabilities') {
            iconName = focused ? 'warning' : 'warning-outline';
          } else if (route.name === 'Network') {
            iconName = focused ? 'globe' : 'globe-outline';
          } else if (route.name === 'Apps') {
            iconName = focused ? 'apps' : 'apps-outline';
          } else if (route.name === 'AI Chat') {
            iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <TabBarIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#333',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#1a1a2e',
          borderBottomColor: '#333',
          borderBottomWidth: 1,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Security Dashboard' }}
      />
      <Tab.Screen 
        name="Vulnerabilities" 
        component={VulnerabilityScreen}
        options={{ title: 'Vulnerabilities' }}
      />
      <Tab.Screen 
        name="Network" 
        component={NetworkTrafficScreen}
        options={{ title: 'Network Traffic' }}
      />
      <Tab.Screen 
        name="Apps" 
        component={AppMonitorScreen}
        options={{ title: 'App Monitor' }}
      />
      <Tab.Screen 
        name="AI Chat" 
        component={AIChatScreen}
        options={{ title: 'AI Assistant' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SecurityProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Auth"
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#1a1a2e',
                  borderBottomColor: '#333',
                  borderBottomWidth: 1,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              <Stack.Screen 
                name="Auth" 
                component={AuthScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Main" 
                component={TabNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="SecurityReport" 
                component={SecurityReportScreen}
                options={{ title: 'Security Report' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <Toast />
        </SecurityProvider>
      </SafeAreaProvider>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
} 